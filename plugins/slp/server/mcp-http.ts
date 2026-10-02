import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

// Minimal stateless MCP endpoint over Streamable HTTP: POST JSON-RPC in, JSON
// out. No SSE stream, no MCP SDK dependency. Each member reaches it at
// `/mcp/<secret>`, and the secret is the only member identity it trusts.

export interface McpTool<Caller> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  call(args: Record<string, unknown>, caller: Caller): Promise<unknown> | unknown;
}

export interface McpHttpOptions<Caller> {
  host: string;
  port: number;
  serverName: string;
  resolveCaller(secret: string): Caller | null;
  tools: readonly McpTool<Caller>[];
  /** Whether the caller is offered a tool; others are hidden and refused. Default: all. */
  allows?(tool: string, caller: Caller): boolean;
  onRequest?(event: { secret: string; method: string; known: boolean }): void;
}

export interface McpHttpHandle {
  url(secret: string): string;
  close(): Promise<void>;
}

const FALLBACK_PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export async function startMcpHttp<Caller>(options: McpHttpOptions<Caller>): Promise<McpHttpHandle> {
  const server = createServer((req, res) => {
    void handle(options, req, res).catch((error) => {
      if (!res.headersSent) sendJson(res, 500, rpcError(null, -32603, String(error)));
    });
  });
  await listen(server, options.host, options.port);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return {
    url: (secret) => `http://${options.host}:${port}/mcp/${secret}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

async function handle<Caller>(
  options: McpHttpOptions<Caller>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const match = /^\/mcp\/([A-Za-z0-9_-]+)$/.exec(req.url ?? "");
  if (!match) return sendJson(res, 404, { error: "not found" });
  const secret = match[1];
  if (req.method !== "POST") {
    res.writeHead(405, { allow: "POST" }).end();
    return;
  }
  const caller = options.resolveCaller(secret);
  const body = await readJson(req);
  const messages: JsonRpcRequest[] = Array.isArray(body) ? body : [body];
  for (const message of messages) {
    options.onRequest?.({ secret, method: message?.method ?? "?", known: caller !== null });
  }
  if (caller === null) return sendJson(res, 401, rpcError(null, -32001, "unknown member secret"));

  const replies = [];
  for (const message of messages) {
    const reply = await dispatch(options, message, caller);
    if (reply) replies.push(reply);
  }
  if (replies.length === 0) {
    res.writeHead(202).end();
    return;
  }
  sendJson(res, 200, Array.isArray(body) ? replies : replies[0]);
}

async function dispatch<Caller>(
  options: McpHttpOptions<Caller>,
  message: JsonRpcRequest,
  caller: Caller,
): Promise<unknown | null> {
  const id = message.id ?? null;
  const isNotification = message.id === undefined;
  switch (message.method) {
    case "initialize": {
      const requested = message.params?.protocolVersion;
      return rpcResult(id, {
        protocolVersion: typeof requested === "string" ? requested : FALLBACK_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: options.serverName, version: "0.0.0" },
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: options.tools
          .filter((tool) => options.allows?.(tool.name, caller) ?? true)
          .map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case "tools/call": {
      const name = message.params?.name;
      const tool = options.tools.find(
        (candidate) => candidate.name === name && (options.allows?.(candidate.name, caller) ?? true),
      );
      if (!tool) return rpcError(id, -32602, `unknown tool: ${String(name)}`);
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const value = await tool.call(args, caller);
        return rpcResult(id, { content: [{ type: "text", text: JSON.stringify(value) }] });
      } catch (error) {
        return rpcResult(id, { content: [{ type: "text", text: String(error) }], isError: true });
      }
    }
    default:
      return isNotification ? null : rpcError(id, -32601, `method not found: ${message.method}`);
  }
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(value));
}

async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function listen(server: Server, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

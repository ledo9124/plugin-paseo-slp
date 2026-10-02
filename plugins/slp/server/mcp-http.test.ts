import { afterEach, describe, expect, it } from "vitest";
import { startMcpHttp, type McpHttpHandle } from "./mcp-http";

let handle: McpHttpHandle | null = null;

afterEach(async () => {
  await handle?.close();
  handle = null;
});

async function start() {
  const members = new Map([
    ["s3cret", { label: "lead" }],
    ["peer", { label: "peer" }],
  ]);
  handle = await startMcpHttp({
    host: "127.0.0.1",
    port: 0,
    serverName: "slp-test",
    resolveCaller: (secret) => members.get(secret) ?? null,
    tools: [
      {
        name: "whoami",
        description: "Return the caller",
        inputSchema: { type: "object", properties: {} },
        call: (_args, caller) => caller,
      },
      {
        name: "delegate",
        description: "Lead only",
        inputSchema: { type: "object", properties: {} },
        call: () => "delegated",
      },
    ],
    toolAllowed: (caller, name) => name !== "delegate" || caller.label === "lead",
  });
  return handle;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
  const json: any = res.status === 202 ? null : await res.json();
  return { status: res.status, json };
}

describe("startMcpHttp", () => {
  it("answers initialize, tools/list, and tools/call for a known secret", async () => {
    const mcp = await start();
    const url = mcp.url("s3cret");

    const init = await post(url, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    });
    expect(init.json.result.protocolVersion).toBe("2025-03-26");

    const notified = await post(url, { jsonrpc: "2.0", method: "notifications/initialized" });
    expect(notified.status).toBe(202);

    const list = await post(url, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(list.json.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["whoami", "delegate"]);

    const call = await post(url, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "whoami", arguments: {} },
    });
    expect(JSON.parse(call.json.result.content[0].text)).toEqual({ label: "lead" });
  });

  it("offers each caller only its allowed tools and refuses a call to any other", async () => {
    const mcp = await start();
    const url = mcp.url("peer");
    const list = await post(url, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(list.json.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["whoami"]);
    const call = await post(url, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "delegate", arguments: {} },
    });
    expect(call.json.result).toMatchObject({ isError: true, content: [{ text: "delegate is not available to you." }] });
  });

  it("rejects an unknown secret", async () => {
    const mcp = await start();
    const res = await post(mcp.url("nope"), { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
  });
});

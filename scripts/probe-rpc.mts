// Slice 1 probe driver: Paseo's CLI has no command that invokes a plugin RPC,
// so this reuses the CLI's own connection code from a Paseo source checkout.
//
//   node <paseo>/node_modules/tsx/dist/cli.mjs scripts/probe-rpc.mts <method> [json-input]
//
// Env: PASEO_SOURCE (checkout, default ../paseo-upstream), PASEO_HOME (daemon home).
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const source = process.env.PASEO_SOURCE ?? "C:/code/my-project/paseo-upstream";
const home = process.env.PASEO_HOME;
if (!home) throw new Error("Set PASEO_HOME to the dev daemon home");

const [method, rawInput = "{}"] = process.argv.slice(2);
if (!method) throw new Error("usage: probe-rpc.ts <method> [json-input]");

const { connectToDaemon } = await import(pathToFileURL(join(source, "packages/cli/src/utils/client.ts")).href);
const client = await connectToDaemon({ target: { kind: "instance", home } });
try {
  const output = await client.invokePluginRpc("slp", method, JSON.parse(rawInput));
  console.log(JSON.stringify(output, null, 2));
} finally {
  await client.close();
}

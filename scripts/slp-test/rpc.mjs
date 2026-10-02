// Calls an slp plugin RPC on an installed Paseo daemon through the globally
// installed Paseo CLI's connection code (no Paseo source checkout needed).
//
//   node scripts/slp-test/rpc.mjs slp.workspace.set-mode '{"workspaceId":"wks_…","mode":"on"}'
//
// Env: PASEO_HOME (default ~/.paseo); PASEO_CLI_ROOT, the global node_modules
// holding @getpaseo/cli (default: `npm root -g`, else %APPDATA%/npm/node_modules).
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function globalRoot() {
  if (process.env.PASEO_CLI_ROOT) return process.env.PASEO_CLI_ROOT;
  try {
    return execSync("npm root -g", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "npm", "node_modules");
  }
}
const cli = join(globalRoot(), "@getpaseo", "cli", "dist", "utils", "client.js");
const { connectToDaemon } = await import(pathToFileURL(cli).href);
const [method, raw = "{}"] = process.argv.slice(2);
if (!method) throw new Error("usage: rpc.mjs <method> [json-input]");
const client = await connectToDaemon({ target: { kind: "instance", home: process.env.PASEO_HOME ?? join(homedir(), ".paseo") } });
try {
  console.log(JSON.stringify(await client.invokePluginRpc("slp", method, JSON.parse(raw)), null, 2));
} finally {
  await client.close();
}

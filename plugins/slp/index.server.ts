import type { PluginServerContext } from "@getpaseo/plugin/server";

// No behavior yet. Slice 1 of docs/plans/active/slp-plugin-v0.1.md
// (platform probes on stock Paseo) must pass before SLP logic lands here.
export default function contribute(_server: PluginServerContext) {
  return () => {};
}

import type { PluginServerContext } from "@getpaseo/plugin/server";

// No behavior yet. Decision 0001 must be accepted and slice 1 of
// docs/plans/active/slp-plugin-v0.1.md proven before SLP logic lands here.
export default function contribute(_server: PluginServerContext) {
  return () => {};
}

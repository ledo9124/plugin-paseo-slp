# Decisions

Decision records preserve lasting product, architecture, data ownership,
security, compatibility, and validation choices that future work must inherit.

Use `docs/templates/decision.md`. Task-local implementation choices remain in
the active execution plan and do not require a separate decision.

An installed consumer begins with no fabricated decisions. Add local decision
documents here as real choices are accepted, then index them in this file.

## Index

- [0001 SLP As A Coordination Plugin On Paseo Primitives](0001-slp-as-a-paseo-plugin.md):
  Accepted, messaging layer amended by 0004. Conventions plus a plugin
  coordination service; no runtime enforcement without evidence. Rests on
  plugin SDK 0.10.2, read from upstream main `d30e99c85` and probed on
  `v0.10.2`; re-check after a Paseo upgrade.
- [0002 An SLP Toggle Instead Of Modes](0002-slp-toggle-instead-of-modes.md):
  Accepted. SLP is off by default and toggled per workspace; when it is on, a
  group always has a Supervisor and a Lead.
- [0003 The Ledger Is Coordination State, Not Project Truth](0003-ledger-is-coordination-state-not-project-truth.md):
  Accepted. Lasting decisions go to the consumer project's own records; agent
  ledger entries are not Human authority.
- [0004 Member Messaging Through A Plugin Send Tool](0004-member-messaging-through-a-plugin-send-tool.md):
  Accepted. Members message through a plugin tool that either steers into
  the recipient's running turn or delivers after it ends. Built-in
  `send_agent_prompt` is not used for SLP messaging.

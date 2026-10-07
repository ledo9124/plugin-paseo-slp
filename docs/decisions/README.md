# Decisions

Decision records preserve lasting product, architecture, data ownership,
security, compatibility, and validation choices that future work must inherit.

Use `docs/templates/decision.md`. Task-local implementation choices remain in
the active execution plan and do not require a separate decision.

An installed consumer begins with no fabricated decisions. Add local decision
documents here as real choices are accepted, then index them in this file.

## Index

- [0001 SLP As A Coordination Plugin On Paseo Primitives](0001-slp-as-a-paseo-plugin.md):
  Accepted, messaging layer amended by 0004, enforcement amended by 0006
  and 0008 for one rule each. Conventions plus a plugin
  coordination service; no runtime enforcement without evidence. Rests on
  plugin SDK 0.10.2, read from upstream main `d30e99c85` and probed on
  `v0.10.2`; re-check after a Paseo upgrade.
- [0002 An SLP Toggle Instead Of Modes](0002-slp-toggle-instead-of-modes.md):
  Accepted, amended by 0005. SLP is off by default and chosen per workspace;
  when it is on, a group always has a Supervisor and a Lead.
- [0003 The Ledger Is Coordination State, Not Project Truth](0003-ledger-is-coordination-state-not-project-truth.md):
  Accepted. Lasting decisions go to the consumer project's own records; agent
  ledger entries are not Human authority.
- [0004 Member Messaging Through A Plugin Send Tool](0004-member-messaging-through-a-plugin-send-tool.md):
  Accepted. Members message through a plugin tool that either steers into
  the recipient's running turn or delivers after it ends. Built-in
  `send_agent_prompt` is not used for SLP messaging.
- [0005 The SLP Mode Locks At The First Message; Archiving Ends The Group](0005-slp-mode-locks-at-the-first-message.md):
  Accepted. The mode can change only until Human's first message in the
  workspace. Archiving the workspace ends the group. The controls are an
  SLP panel and a header button.
- [0006 The SLP Lead Cannot Use Its Provider's Own Subagents](0006-slp-lead-cannot-use-provider-subagents.md):
  Accepted, amends 0001 item 3 for this rule only. A Claude Lead is created
  with its subagent tool disallowed. The rule applies within SLP only.
- [0007 What SLP Is: Purpose, Layers, And Independence From Harness](0007-what-slp-is.md):
  Accepted. SLP completes Human's input, filters decisions by authority
  (including explicit delegation), and keeps Human in control. Four layers:
  core, coordination contracts, runtime, templates; templates are not SLP.
  SLP and Repository Harness stay independent.
- [0008 Per-Role Configuration, Templates As Plugin Skills, And One Supervisor And One Lead](0008-per-role-configuration-and-templates.md):
  Accepted. Each role's provider, mode, instructions, tools, and templates
  are configurable. Lead and Peer lose their provider's question tool.
  Templates are `SKILL.md` texts loaded in the UI and served by a plugin
  tool. One Supervisor and one Lead per group stays. Item 1 amended by 0009
  (effort).
- [0009 Group Traffic And Member Inputs After The First Real Run](0009-group-traffic-and-inputs-after-the-first-real-run.md):
  Accepted. The Lead is relayed only for turns the Supervisor or Human
  started or when no work is open; Supervisor decisions reach the Lead in its
  message; only the Supervisor notifies Human (members are its children);
  Peers are one line of work on the default model; the Lead names the
  workflow per goal and briefs carry it; checks ask open questions with
  evidence; effort per role, settings as selects.
- [0010 Conduct, Attribution, And First-Person Role Texts](0010-conduct-attribution-and-first-person-texts.md):
  Accepted. Every role carries Human's conduct paragraph (a Peer adds
  options and a recommendation), attribution rules (only Human's quoted
  words are Human's), and a first-person paragraph. The last two are
  Human's exception to 0007 item 5: measured as not harmful, not proven.

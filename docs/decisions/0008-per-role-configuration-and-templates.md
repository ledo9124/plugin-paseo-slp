# 0008 Per-Role Configuration, Templates As Plugin Skills, And One Supervisor And One Lead

Date: 2026-10-02

## Status

Accepted by Human on 2026-10-02. Amends decision 0001, item 3 ("no
runtime enforcement"), for one more rule: Lead and Peer lose their
provider's question tool (item 3 below). Amends the Supervisor's role in
`docs/product/overview.md` for templates only (item 5). Confirms 0002's
group shape (item 7).

## Context

After run 1, Human asked to review what each role needs to know and which
tools it gets, and how templates (layer 4 of 0007) should run. Facts at
v0.1.0:
- Every member gets the same `SHARED` instruction block (about 45 lines) plus
  its role text (`plugins/slp/server/roles.ts`). Much of `SHARED` is noise
  for a Peer: attributing decisions, the authority-sorting rules for
  `slp_decide`, and a list of tools it cannot use.
- The role texts also mix in runtime facts (provider tool names, the Peer
  limit) and a staffing heuristic that belongs to templates (the Lead's
  "stronger model for design or review").
- `tools/list` returns all 8 SLP tools to every member. Roles are checked
  only when a tool is called.
- A Peer can read the whole ledger, including other Peers' briefs, so a
  template that needs Peers blind to each other cannot hold.
- Templates exist only in docs. Nothing in the plugin knows about them.
- Instructions, tools, and templates are fixed in code. Settings cover
  only provider, model, and mode.
- Paseo `v0.10.2` has no per-agent skill injection: `agents.create` takes
  `systemPrompt`, `mcpServers`, `modeId`, and provider options. Paseo's
  agent-skills API manages its bundled skills for the whole host.
- A per-agent `disallowedTools` provider option removes a Claude tool for
  one agent (0006, proved live).

Human's outcome: each role can be configured and tuned on its own, so the
method can be optimized from process data.

## Decision

1. **Each role has its own configuration**, editable by Human in the
   plugin's settings: provider and model, mode, instructions, the SLP
   tools it gets, and the templates it sees.
   - The plugin ships defaults. Human may replace any of them, including
     the whole instruction text, and may reset to the defaults.
   - Configuration applies to members created after saving, as today.
2. **Instructions are per role.** A role's default text holds only what
   that role does. Runtime facts (tool names of the member's provider,
   limits from settings) are filled in by the plugin. Staffing heuristics
   move to templates.
3. **Tools are per role.**
   - A member is offered only the SLP tools its role configuration lists.
     A call to any other SLP tool is refused.
   - Lead and Peer have no question tool to Human. Only the Supervisor
     asks Human.
     - Claude: the plugin removes `AskUserQuestion` per agent, through
       `disallowedTools`. This is runtime enforcement, an exception to 0001
       item 3 like 0006.
     - Codex: it has no question tool unless Human enables that feature in
       the `[features]` table of Codex's `config.toml` (Human, 2026-10-02).
       That file is Human's global config, which members inherit, so the
       plugin does not change it. If Human enables the feature, the rule
       is a convention for Codex Lead and Peers.
     - The process report counts a Lead's or Peer's question as a break
       either way.
   - The Lead keeps 0006's subagent block.
4. **Templates are plugin skills.**
   - A template is a way to coordinate agents toward one goal, such as one
     piece of the work. It is not a mode of the workspace: a run may use
     several templates, one after another or side by side, or none.
   - A template has a name, a description, when to use it, and a body. It
     is written in the `SKILL.md` format: front matter with `name` and
     `description`, then the body.
   - The Supervisor and the Lead see the catalog (name, description, when
     to use it) in their instructions. The Lead loads a template's body
     on demand through a plugin MCP tool, so the body costs context only
     when used. This works on every provider.
   - Human loads, edits, and removes templates in the plugin's UI. The
     plugin ships some defaults; none is required (0007).
   - An assignment records the template it follows, so the process report
     can show whether a template changes outcomes (behavior 10).
5. **Who chooses a template, for which goal.**
   - Human may choose one for a goal. The Supervisor passes it to the Lead
     as a constraint with source "Human" for that goal only. It does not
     bind the rest of the run, and the Lead adapts it to the work.
   - The Supervisor may suggest one when the situation fits. The
     suggestion is not binding, and is named as the Supervisor's. This is
     the one exception to "the Supervisor proposes no design".
   - The Lead may use one on its own judgment, and may combine or adapt
     templates for different goals.
6. **A Peer's ledger view is its own work:** its assignments, its findings,
   and the decisions it is told about. Briefs of other Peers are not shown.
7. **One Supervisor and one Lead per group, one group per workspace**, as
   0002 and 0005 say. More Leads in a group would split the coherence the
   Lead holds. If a Lead is overloaded in a real run, the options to weigh
   then are a Lead handoff or a Peer allowed to delegate within its scope,
   not parallel Leads.

## Alternatives Considered

1. **Templates as provider-native skills.** Not chosen: Paseo has no
   per-agent skill injection. Claude's skill folders are host-wide or
   inside Human's project (against 0007's independence), and Codex differs.
2. **A locked core plus appendable instructions.** Not chosen by Human:
   full override is easier to tune. Reset to defaults is the recovery.
3. **The Supervisor only relays templates Human chose.** Not chosen by
   Human: the Supervisor may also suggest one by situation.
4. **Several Leads per workspace.** Not chosen: no evidence of an
   overloaded Lead; run 1's Lead handled 3 Peers across 2 repositories.

## Consequences

Positive:

- Each role's context carries only what it acts on.
- Templates become measurable, and can be kept or dropped from data.
- Peers can work blind to each other when a template needs it.

Tradeoffs:

- Human can remove a required behavior by editing instructions. The
  process report should show which instruction version a group ran, so a
  change in outcomes can be traced to it.
- Blocking the question tool depends on Claude Code's tool name, like 0006.
  Recheck after an upgrade.
- More settings surface to maintain and test.

## Follow-Up

- Execution plan: `docs/plans/active/slp-role-config-and-templates.md`.
- If Human enables Codex's question feature, check whether Paseo can turn
  it off for one agent.

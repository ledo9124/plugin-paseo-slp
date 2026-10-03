// Default templates shipped with the plugin (decision 0008). Each entry is a
// whole SKILL.md text. They are copied into plugin data the first time
// templates are read; Human may then edit or remove them. Human kept only
// the council (2026-10-03).

export const DEFAULT_TEMPLATES: readonly string[] = [
  `---
name: council
description: Two blind proposals, one challenge round, an anonymous compile, and an arbiter; ends in a recommendation with the disagreement kept visible.
---

# Council

When to use: a hard design choice, or a question Human cannot answer yet and wants researched with a recommendation, where one model's first idea could anchor everyone.

Why this shape: in an open debate the more combative model takes over the framing, and a judge reading the transcript sides with it. Proposals stay blind, the challenge is one round, and the arbiter reads a compiled, anonymous packet, not the exchange.

## 1. Two blind proposals
- Two Peers, kind \`design\` (or \`investigate\` for a question), on different providers when slp_ledger peerModels allows (for example one Claude, one Codex).
- The same brief to both: the goal, the constraints with their sources, what is settled and why, and what is open for them to derive. No preferred answer, no currentChoice to defend. Claims in issues or docs are claims to check against the code.
- Ask for: the proposal, the evidence it rests on, what it costs, and what would make it wrong.

## 2. One challenge round
- When both hand back, send each one the other's proposal as rework, labelled "Proposal X", with no model, Peer, or author named.
- Ask for points that change the outcome, each with evidence, on the same question. A point that is true but beside the question is irrelevant, not a refutation. Finding nothing is a valid answer.
- Then send each one the challenges to its own proposal, restated as claim plus evidence, and ask it to revise or defend. No further rounds.

## 3. Compile, anonymous
- Write one packet: goal and constraints; the two revised proposals as A and B in random order; each challenge as claim, evidence, and the reply to it. Drop tone, names, and who argued harder.

## 4. Arbiter
- A fresh Peer, kind \`review\`, ideally on a third model, gets only the packet. It judges each proposal against the goal and constraints, says where they agree and where the real decision lies, recommends, and names the evidence that would change its view.
- For a high-stakes choice, a shadow arbiter on another model gets the same packet. If the two disagree, report the disagreement; do not force agreement.

## 5. Outcome
- Accept the Peers whose work you used. Write the decision packet: recommendation, agreement, the open disagreement, risks, and what evidence would reopen it.
- A choice inside agent authority: decide it with slp_decide and cite the packet. A choice that is Human's (including a question Human could not answer): record it as pending with the options, consequences, and the recommendation, so the Supervisor puts it to Human.

## Do not use
- For a routine choice, a lookup the records answer, or a small task one agent can finish.
`,
];

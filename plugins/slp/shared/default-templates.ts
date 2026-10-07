// Default templates shipped with the plugin (decision 0008). Each entry is a
// whole SKILL.md text. They are copied into plugin data the first time
// templates are read; Human may then edit or remove them. Human replaced the
// council with dual-lane (2026-10-07, decision 0011).

export const DEFAULT_TEMPLATES: readonly string[] = [
  `---
name: dual-lane
description: Name the tension that decides the choice, run two blind lanes from its two sides (or one case and one check), test their deciding disagreement, and synthesize through an arbiter that reads an anonymous packet; the disagreement stays visible.
---

# Dual Lane

When to use: a hard choice where settling on the first good idea costs more than a second line of reasoning: an approach with real trade-offs, or a question Human cannot answer yet and wants researched with a recommendation.

Do not use: a fact the records or the code answer; a routine or small choice; a cheap, reversible step (try it instead); a goal that is still unclear (clarify it first, through the Supervisor when it is Human's).

Why this shape: one model's first idea anchors everyone; in an open debate the more forceful side takes the framing, and a judge reading the exchange sides with it. The lanes work blind, the challenge is one round, the arbiter reads an anonymous packet, and a disagreement that can be checked is settled by a check, not by argument.

## 1. Frame
- Name the critical tension: the one question whose answer decides the choice, and why it decides it. Pick its axis from the kind of choice:

  | Axis | Use when |
  | --- | --- |
  | Value / Constraint | what the choice could gain against what bounds it (cost, capacity, risk, policy) |
  | Hypothesis A / B | two explanations of a cause or a behavior compete |
  | Upside / Downside | an opportunity with uncertain payoff and real failure modes |
  | Performance / Simplicity | speed or capability against cost of change and understanding |
  | Ambition / Capacity | the scope wanted against what the team, time, or system can carry |
  | Now / Later | acting now against keeping the option open |

  The axis must be the crux, not a convenient label; name your own when none fits.
- Choose the mode:
  - **Two sides** (default): each lane builds the best answer from its side of the axis, and says what from the other side would constrain or change it.
  - **Vet**: one candidate is already on the table (a plan, a change, an idea of Human's). Lane A makes its strongest honest case; lane B tests what limits or breaks it. Finding nothing is a valid answer.
  - **Unframed**: you cannot name the tension. Both lanes get the same brief, with no side.
- The frame and the mode go into the arbiter's packet. Either lane may say the frame is wrong: that is a finding.

## 2. Two lanes, blind
- Two Peers, kind \`design\` (or \`investigate\` for a question), on different providers when slp_ledger peerModels allows.
- The same brief to both except the side: the goal, the constraints with their sources, what is settled and why, and the frame. No preferred answer. Claims in issues or docs are claims to check against the code.
- Ask for: the proposal or answer, the evidence, its cost, the assumptions it rests on, what would prove it wrong, and what from the other side it accepts. Agreement is allowed; disagreement earns nothing.

## 3. Compare, test, one challenge
- Put the two handbacks side by side: where they agree, where they contradict, and which assumptions differ. Pick the one disagreement that decides the choice.
- If it can be checked (code, a measurement, a record, a small experiment), check it yourself or through a fresh Peer, not a lane, with the smallest test that settles it, within the goal's scope and budget. Its result is evidence.
- Then one round: send each lane the other's position as "Lane X", with no model or author named, plus the test result. Ask it to revise or defend, with evidence, on the same question. A point that is true but beside the question is not a refutation. No further rounds.

## 4. Arbiter
- A fresh Peer, kind \`review\`, on another model when possible, gets only one packet: the goal and constraints, the frame and mode, the two revised positions as A and B in random order, the test and its result, and each challenge with its reply. Drop names, tone, and who argued harder.
- It judges the frame first, then recommends a synthesis, which may take from both and need not split the difference. It says where the lanes agree, where the real decision lies, the risks, and what evidence would change its view.
- For a high-stakes choice, a shadow arbiter on another model gets the same packet. If the two differ, report both; do not force agreement.

## 5. Outcome
- Accept the Peers whose work you used. Write the decision packet: recommendation, agreement, the open disagreement, the test and its result, risks, and what would reopen it.
- A choice inside agent authority: decide it with slp_decide and cite the packet. A choice that is Human's (including a question Human could not answer): record it as pending with the options, consequences, and the recommendation, so the Supervisor puts it to Human.
`,
];

// The council that shipped through v0.3.6. It is no longer a default; it stays
// here only so the template store can recognise an unmodified copy in an
// existing install and replace it with dual-lane once (decision 0011). Not for
// reuse.
const LEGACY_COUNCIL_SOURCE = `---
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
`;

/** The shipped council text, and the copy with each backtick escaped that one install stored. */
export const LEGACY_COUNCIL_TEXTS: readonly string[] = [
  LEGACY_COUNCIL_SOURCE,
  LEGACY_COUNCIL_SOURCE.replaceAll("`", "\\`"),
];

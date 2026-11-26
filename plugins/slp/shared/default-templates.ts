// Default templates shipped with the plugin (decision 0008). Each entry is a
// whole SKILL.md text. They are copied into plugin data the first time
// templates are read; Human may then edit or remove them. Human replaced the
// council with dual-lane (2026-10-07, decision 0011).

export const DEFAULT_TEMPLATES: readonly string[] = [
  `---
name: dual-lane
description: Name the tension that decides the choice, run two blind lanes from its two sides (or one case and one check), test their deciding disagreement, and synthesize through an arbiter that reads an anonymous packet (or, when the lanes agree, a reader of the Lead's synthesis); for a change to review, blind lenses chosen by its risks, each with its own method. The disagreement stays visible.
---

# Dual Lane

When to use: a hard choice where settling on the first good idea costs more than a second line of reasoning: an approach with real trade-offs, or a question Human cannot answer yet and wants researched with a recommendation. Or a substantial change to review: its first review and its verdict before merge (Review mode).

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
  - **Review**: a change to review. See Review mode below; it replaces steps 1-5.
- The frame and the mode go into the arbiter's packet. Either lane may say the frame is wrong: that is a finding.
  - Record with slp_decide what you did about it, and why, without the other lane in notify. A change to Human's goal goes to Human.
  - Do not tell the other lane before the challenge round, by message or by decision; it stays blind.
  - The packet carries the original frame, the finding, and what you did. The arbiter, or the reader that replaces it (step 4), checks whether each answer still addresses the revised question.

## 2. Two lanes, blind
- Two Peers, kind \`design\` (or \`investigate\` for a question). Choose their models from slp_ledger peerModels, the allowed models: put the two lanes on different providers, or on different model families when only one provider is available, and weigh each model's fit for the task and its cost. Check first that peerModels also holds a third eligible model for the independent reader (step 4). A listed model can still fail to start; if the pair or that reader cannot be delegated, report it as a blocker before spending lane work. Name the model in slp_delegate, and give the models and the reason in the outcome (step 5).
- The same brief to both except the side: the goal, the constraints with their sources, what is settled and why, and the frame. No preferred answer. Claims in issues or docs are claims to check against the code.
- Ask for: the proposal or answer, the evidence, its cost, the assumptions it rests on, what would prove it wrong, and what from the other side it accepts. Agreement is allowed; disagreement earns nothing.

## 3. Compare, test, one challenge
- Put the two handbacks side by side: where they agree, where they contradict, and which assumptions differ. Pick the one disagreement that decides the choice.
- If it can be checked (code, a measurement, a record, a small experiment), check it yourself or through a fresh Peer, not a lane, with the smallest test that settles it, within the goal's scope and budget. Its result is evidence.
- Then one round, by slp_send (a rework is for redoing work, not for the round): send each lane the other's position as "Lane X", with no model or author named, plus the test result, and the revised frame if step 1 changed it. Ask it to revise or defend, with evidence, on the same question, and to say whether its answer holds on the revised frame. A point that is true but beside the question is not a refutation. No further rounds.
- Skip the round only when the lanes already agree on the deciding point, or the test settled it; give the reason in the outcome (step 5). Skipping the round never skips the independent reader (step 4).

## 4. Arbiter, or a reader of your synthesis
- Use the arbiter unless both lanes' last handbacks agree on the deciding point and the frame, whether or not the round ran; a lane that never saw a revised frame has not agreed on it. If both agree, you may keep the arbiter or have a reader check your synthesis (below); record which and why in the outcome. Skipping both is not a path, and neither is a reader limited to the lane files. When the active-Peer limit is short, accept the lanes' assignments before delegating the arbiter or the reader.
- A fresh Peer, kind \`review\`, on a model from slp_ledger peerModels that neither lane used, preferably from another provider, gets only one packet: the goal and constraints, the frame and mode, the two positions as A and B in random order (revised, if the round ran), the test and its result, and each challenge with its reply (on a skipped round there are none: invent no replies). Label the positions only A and B (in Vet, say which is the case and which the check). Drop names, tone, and who argued harder. Beyond the frame record (step 1) and the quoted ledger records (below), the packet holds nothing else, and never your own view of the answer. Tell the arbiter to open the records the packet cites, to check them; it reads no lane folder.
- It judges the frame first, then recommends a synthesis, which may take from both and need not split the difference. It says where the lanes agree, where the real decision lies, the risks, and what evidence would change its view.
- On the arbiter path, for a high-stakes choice, a shadow arbiter on a model the lanes and the arbiter do not use, when slp_ledger peerModels has one that starts, gets the same packet. If the two differ, report both; do not force agreement.
- The reader, when the lanes agree: write the synthesis and give it to one fresh Peer, kind \`review\`, who wrote no position, on a model from slp_ledger peerModels that neither lane used, preferably from another provider. It gets the packet's contents, your synthesis, and leave to open every record the lanes, the comparison and the synthesis cite. It judges the frame first, then the premises the lanes share against those records, then the synthesis. If you then change the synthesis materially, send the changed version back to it (rework) before Human sees it.
- A Peer's slp_ledger shows only its own work. Quote in the packet each other ledger record (a finding, a decision) the arbiter or the reader must check, with its id and without naming a lane's author. Either one flags a deciding record it could not open, and does not call it checked.

## 5. Outcome
- Accept the Peers whose work you used, if not yet accepted. Write the decision packet: recommendation, agreement, the open disagreement, the test and its result, risks, and what would reopen it.
- The outcome holds one line for each step: frame, models, test, round, independent reader (which path). Each is done, or departed from, with the reason and a record id: an assignment, a finding or a decision, or, for a step you did yourself (a test, a skipped round), where its evidence is.
- If you write a new decision document after the arbiter, a fresh Peer, kind \`review\`, who did not write it, checks it against the verdict and the records it cites before Human sees it. Not needed when the verdict itself is the deliverable.
- A choice inside agent authority: decide it with slp_decide and cite the packet. A choice that is Human's (including a question Human could not answer): record it as pending with the options, consequences, and the recommendation, so the Supervisor puts it to Human.

## Review mode (a change to review)
Use it for the first review of a substantial change and for the verdict before merge, even when the final diff is small; it replaces steps 1-5. It gives a verdict on a change; whether to adopt a candidate (a plan, an idea) is Vet.
- Choose the lenses from the change and its context. One lens is enough for a small, local change. Add a lens for each kind of risk the change carries, for example: intent (does it do what was asked and nothing else); claims (every place its claims must hold, including code the diff did not touch); data and migration safety; security; the reader who must follow a text it changes. Each lens is a fresh Peer, kind \`review\`, who did not write the change. All lenses get the same brief (the intent: goal, constraints, records; the diff; how to run the checks), work blind to each other, and differ only in method. Name the lenses and the reason in the outcome.
- Models: from slp_ledger peerModels, each strong enough for analysis and review, never a small or fast-tier model. Put the lenses on different providers or model families when a strong model is available there. None runs on a model that wrote any part of the change, unless that leaves only a weaker model: strength comes first, and the outcome says so. Diversity never brings back a writer's model while another strong model is free. Name the models and why each is strong enough in the outcome.
- Each hands back findings with severity (blocking, major, minor), file and line, and evidence; finding nothing is valid.
- Where the lenses agree, act. Check a finding only one lens raised on its evidence and dispose of it too; silence is not agreement. Where they conflict on an issue, send each lens involved the others' points on it once, unnamed, and ask for an answer with evidence; then you decide. No arbiter.
- Fix round: one fresh lens, on a strong model from peerModels chosen by the rules above, rechecks every prior finding and the code the fix touched.
- Before merge: the lenses again, chosen the same way (fresh Peers, for the final diff's risks), on the final diff. Each verdict names the commit it covers; a later change needs its own.
- In the outcome, record the lenses and their models with the reasons, which lens found what, what more than one found, and how you decided each conflict.
`,
];

// The dual-lane text that shipped in v0.4.0 (decision 0012). It stays only so
// the template store can recognise an unmodified copy and replace it with the
// text above once (decision 0014). Not for reuse.
export const LEGACY_DUAL_LANE_V040 = `---
name: dual-lane
description: Name the tension that decides the choice, run two blind lanes from its two sides (or one case and one check), test their deciding disagreement, and synthesize through an arbiter that reads an anonymous packet; for a change to review, two blind lenses with different methods. The disagreement stays visible.
---

# Dual Lane

When to use: a hard choice where settling on the first good idea costs more than a second line of reasoning: an approach with real trade-offs, or a question Human cannot answer yet and wants researched with a recommendation. Or a substantial change to review: its first review and its verdict before merge (Review mode).

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
  - **Review**: a change to review. See Review mode below; it replaces steps 1-5.
- The frame and the mode go into the arbiter's packet. Either lane may say the frame is wrong: that is a finding.

## 2. Two lanes, blind
- Two Peers, kind \`design\` (or \`investigate\` for a question): lane A on \`claude/claude-opus-5-5\`, lane B on \`claude/claude-fable-5-1\`. Name the model in slp_delegate. If a named model is not in slp_ledger peerModels, use the default and say so in the packet.
- The same brief to both except the side: the goal, the constraints with their sources, what is settled and why, and the frame. No preferred answer. Claims in issues or docs are claims to check against the code.
- Ask for: the proposal or answer, the evidence, its cost, the assumptions it rests on, what would prove it wrong, and what from the other side it accepts. Agreement is allowed; disagreement earns nothing.

## 3. Compare, test, one challenge
- Put the two handbacks side by side: where they agree, where they contradict, and which assumptions differ. Pick the one disagreement that decides the choice.
- If it can be checked (code, a measurement, a record, a small experiment), check it yourself or through a fresh Peer, not a lane, with the smallest test that settles it, within the goal's scope and budget. Its result is evidence.
- Then one round: send each lane the other's position as "Lane X", with no model or author named, plus the test result. Ask it to revise or defend, with evidence, on the same question. A point that is true but beside the question is not a refutation. No further rounds.
- Skip the round only when the lanes already agree on the deciding point, or the test settled it; say which in the packet.

## 4. Arbiter
- A fresh Peer, kind \`review\`, on \`claude/claude-sonnet-5-5\`, gets only one packet: the goal and constraints, the frame and mode, the two revised positions as A and B in random order, the test and its result, and each challenge with its reply. Label the positions only A and B (in Vet, say which is the case and which the check). Drop names, tone, and who argued harder. The packet holds nothing else, not your own view.
- It judges the frame first, then recommends a synthesis, which may take from both and need not split the difference. It says where the lanes agree, where the real decision lies, the risks, and what evidence would change its view.
- For a high-stakes choice, a shadow arbiter on a model the lanes and the arbiter do not use, when slp_ledger peerModels has one, gets the same packet. If the two differ, report both; do not force agreement.

## 5. Outcome
- Accept the Peers whose work you used. Write the decision packet: recommendation, agreement, the open disagreement, the test and its result, risks, and what would reopen it.
- A choice inside agent authority: decide it with slp_decide and cite the packet. A choice that is Human's (including a question Human could not answer): record it as pending with the options, consequences, and the recommendation, so the Supervisor puts it to Human.

## Review mode (a change to review)
Use it for the first review of a substantial change and for the verdict before merge; it replaces steps 1-5.
- Two fresh Peers, kind \`review\`, both on \`claude/claude-opus-5-5\`, blind to each other; neither wrote the change. Same brief (the intent: goal, constraints, records; the diff; how to run the checks); they differ only in method:
  - Lens A, intent: reads the change against the intent and the records it touches: does it do what was asked and nothing else (logic, failure paths, concurrency)?
  - Lens B, claims: lists every claim the intent, docs, comments and names make, then checks every place each must hold, including code the diff did not touch (callers, contracts, docs, config).
- Each hands back findings with severity (blocking, major, minor), file and line, and evidence; finding nothing is valid.
- Where both agree, act. Where they conflict, send each the other's point once, unnamed, and ask for an answer with evidence; then you decide. No arbiter.
- Fix round: one fresh lens on Opus rechecks every prior finding and the code the fix touched; not two.
- Before merge: two lenses again on the final diff.
- In the outcome, record which lens found what, what both found, and how you decided each conflict.
`;

// The dual-lane text that shipped in v0.3.7 (decision 0011). It stays only so
// the template store can recognise an unmodified copy and replace it with the
// current text once (decisions 0012, 0014). Not for reuse.
export const LEGACY_DUAL_LANE_V037 = `---
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
- Two Peers, kind \`design\` (or \`investigate\` for a question): lane A on \`claude/claude-opus-5-5\`, lane B on \`claude/claude-fable-5-1\`. Name the model in slp_delegate. If a named model is not in slp_ledger peerModels, use the default and say so in the packet.
- The same brief to both except the side: the goal, the constraints with their sources, what is settled and why, and the frame. No preferred answer. Claims in issues or docs are claims to check against the code.
- Ask for: the proposal or answer, the evidence, its cost, the assumptions it rests on, what would prove it wrong, and what from the other side it accepts. Agreement is allowed; disagreement earns nothing.

## 3. Compare, test, one challenge
- Put the two handbacks side by side: where they agree, where they contradict, and which assumptions differ. Pick the one disagreement that decides the choice.
- If it can be checked (code, a measurement, a record, a small experiment), check it yourself or through a fresh Peer, not a lane, with the smallest test that settles it, within the goal's scope and budget. Its result is evidence.
- Then one round: send each lane the other's position as "Lane X", with no model or author named, plus the test result. Ask it to revise or defend, with evidence, on the same question. A point that is true but beside the question is not a refutation. No further rounds.
- Skip the round only when the lanes already agree on the deciding point, or the test settled it; say which in the packet.

## 4. Arbiter
- A fresh Peer, kind \`review\`, on \`claude/claude-sonnet-5-5\`, gets only one packet: the goal and constraints, the frame and mode, the two revised positions as A and B in random order, the test and its result, and each challenge with its reply. Label the positions only A and B (in Vet, say which is the case and which the check). Drop names, tone, and who argued harder. The packet holds nothing else, not your own view.
- It judges the frame first, then recommends a synthesis, which may take from both and need not split the difference. It says where the lanes agree, where the real decision lies, the risks, and what evidence would change its view.
- For a high-stakes choice, a shadow arbiter on a model the lanes and the arbiter do not use, when slp_ledger peerModels has one, gets the same packet. If the two differ, report both; do not force agreement.

## 5. Outcome
- Accept the Peers whose work you used. Write the decision packet: recommendation, agreement, the open disagreement, the test and its result, risks, and what would reopen it.
- A choice inside agent authority: decide it with slp_decide and cite the packet. A choice that is Human's (including a question Human could not answer): record it as pending with the options, consequences, and the recommendation, so the Supervisor puts it to Human.
`;

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

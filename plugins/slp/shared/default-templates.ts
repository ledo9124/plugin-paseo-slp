// Default templates shipped with the plugin (decision 0008, plan slice 5).
// Each entry is a whole SKILL.md text. They are copied into plugin data the
// first time templates are read; Human may then edit or remove them.

export const DEFAULT_TEMPLATES: readonly string[] = [
  `---
name: independent-review
description: A fresh Peer reviews a stable candidate without the author's reasoning.
---

# Independent review

When to use: a candidate is stable and you want a review that is not shaped by how it was built.

## Staffing
- One Peer, kind \`review\`, a different Peer from the author. Prefer a different model when slp_ledger peerModels has one.
- Brief: the goal and constraints the candidate must meet, with their sources. Point to the candidate (files, diff, commit). Put what you want checked in \`uncertainties\`.
- Leave out the author's reasoning, the author's own summary of why it is correct, and currentChoice defenses. The reviewer forms its own view.
- Ask for findings with evidence (slp_finding), not a rewrite.

## Judging
- Read each finding's evidence. Send real defects back to the author's scope as rework; record a decision with slp_decide when you reject one.
- slp_accept the review as accepted, or rework if it skipped what you asked.

## Do not use
- While the candidate is still changing, or when the check is a plain test run.
`,
  `---
name: blind-parallel-designs
description: Several Peers design the same risky choice separately, then you compare.
---

# Blind parallel designs

When to use: a choice is risky or hard to reverse and the first idea you have may not be the best one.

## Staffing
- Two or three Peers, kind \`design\`, each with its own scope (for example its own design note). One owner per scope.
- Same goal and constraints in every brief, with sources. Set currentChoice only if it is a binding choice; otherwise leave your favourite out so it does not anchor them.
- A Peer's ledger shows only its own work, so they are blind to each other. Do not paste one design into another's brief.
- Where the allowed models differ, give the Peers different models.

## Judging
- Compare the designs against the constraints, not against your favourite. Note where they agree (likely sound) and where they split (the real decision).
- Record the pick and why with slp_decide. slp_accept the chosen design as accepted; drop the others with \`dropped\`, or use rework if one needs a fix to be comparable.
- If a design shows a constraint is wrong, treat its slp_finding as a reopen.

## Do not use
- For a routine choice with one obvious answer; one Peer is enough.
`,
  `---
name: cross-model-question
description: Put the same question to Peers on different models and compare their answers.
---

# Cross-model question

When to use: an answer matters and a single model's blind spot could mislead you (a diagnosis, a fact check, a tradeoff).

## Staffing
- One Peer per model in slp_ledger peerModels, up to three; kind \`investigate\` (or \`design\` for a tradeoff). Each has its own scope.
- Identical brief to each: the question as the goal, the constraints, and what evidence counts. Do not include your own guess.
- Peers cannot see each other's work unless you tell them; do not.

## Judging
- Agreement across models raises confidence but check the evidence, not the vote. Disagreement is the useful signal: find the claim they differ on and check it yourself, or ask one more Peer to settle it.
- Record the answer and what backs it with slp_decide. slp_accept the Peers whose answers you used; \`dropped\` for the rest.

## Do not use
- When the answer is a lookup in the repository, or when only one model is allowed.
`,
  `---
name: test-audit
description: A Peer audits whether the tests would catch real defects, not just pass.
---

# Test audit

When to use: tests pass but you doubt they protect the behavior that matters (before relying on them or after a large change).

## Staffing
- One Peer, kind \`audit\`, who did not write the tests. Prefer a different model than the test's author when one is allowed.
- Brief: the behavior the tests must protect, with its source, and the test files in scope. Put in \`uncertainties\` the areas you suspect.
- The Peer reads tests against behavior, and may break the code in a scratch copy to see whether a test fails. It reports each gap as slp_finding with evidence: the behavior, the missing or weak test, and what defect would slip through.
- The Peer changes no tests. If you want gaps fixed, delegate that as a separate \`implement\` assignment.

## Judging
- Rank findings by the risk of the defect that would slip through. Fix the high ones; record accepted gaps with slp_decide.
- slp_accept the audit when each finding has evidence.

## Do not use
- When tests do not exist yet; write them first.
`,
  `---
name: model-choice
description: How to pick a Peer's model from the allowed list for the kind of work.
---

# Model choice

When to use: you are about to call slp_delegate and must pick a model for the Peer.

## Heuristic
- Pick a Peer's model from the allowed list in slp_delegate for the work: a stronger model for design or review, a cheaper one for routine work.
- The allowed list is peerModels in slp_ledger. Choose only from it; never assume a model id.
- If only one model is allowed, use it and skip this.

## By kind
- \`design\`, \`review\`, \`audit\`: stronger, since a missed flaw costs more than the run.
- \`implement\`, \`benchmark\`: cheaper when the brief is specific and checkable; stronger when the change is subtle.
- \`investigate\`: cheaper for a lookup or survey; stronger for a diagnosis.

## Adjust
- If a cheaper Peer's result needs rework for reasons of judgment rather than detail, redelegate to a stronger model.
- When you want an independent view, prefer a different model from the one that did the work.

## Do not use
- As a reason to delay delegating; a reasonable choice now beats a perfect one later.
`,
];

# Experiment: Does The Supervisor Earn Its Place? (2026-10-02)

Research notes, not authority. Plan:
`docs/plans/active/slp-role-config-and-templates.md`, slice 3a.

## Question

After tuning run 1, Human saw the Supervisor only relay one-off questions to
the Lead, at a higher cost than the Lead ($0.52 against $0.42 for 4
messages). Does the Supervisor change outcomes on longer work with rough
input?

## Setup

- Human's daemon (6767), by Human's request. Plugin branch `slp/role-tuning`
  at `39ad46e`.
- Each run: a fresh clone of `paseo-plugin` at `8c7eef6` under
  `D:/codes/slp-test/`, push disabled.
- Arms:
  - **A, with Supervisor:** Supervisor `claude-opus-5-5`, Lead
    `claude-sonnet-5-5`.
  - **B, no Supervisor:** the Lead (`claude-sonnet-5-5`) talks with Human,
    keeps its question tool, and records Human's decisions (hidden setting
    `experiment.noSupervisor`).
- Tasks, each in both arms, run concurrently:
  - **T1, code:** "bot cứ spam mấy tin still running mỗi lần worker retry,
    khó chịu quá, sửa đi".
  - **T2, docs:** "cái plugin tele account chưa có docs product, viết cho nó
    đi".
- The operating agent played Human. It used a hidden intent sheet per task,
  approved by Human (`D:/codes/slp-test/intent-T1.md`, `intent-T2.md`). It
  revealed a fact only when asked or when a result broke it, and answered
  anything else "tùy em".

## Results

### T1

| | A, with Supervisor | B, no Supervisor |
| --- | --- | --- |
| Intake before work | none | none |
| First result | Prompt-only fix with zero notices. The Supervisor's stated reading ("at most one notice") was right, but the Lead built "zero" and flagged the gap itself. | Prompt-only fix with zero notices, uncommitted. |
| How the misses surfaced | The Supervisor read the Lead's "not covered" note ("instruction only"). It asked Human, then asked about the give-up edge case and the commit. | Human's correction. |
| Final | Passes every acceptance item. The code writes "Retrying (attempt N of M)" once per chain. Final failure and give-up are delivered. 519 tests pass (rerun). Branch `fix/retry-notice-once`, `9781587`. | 4 of 5 items pass. A give-up message after an announced retry is suppressed (H2), although the commit says giving up is unrestricted. 517 tests pass (rerun). It also added an unrequested amendment to the project's decision 0003. Branch `fix/retry-status-spam`, `8095153`. |
| Human's effort | 1 message and 4 answers; 1 question was an engineering choice | 2 messages |
| Cost | $2.33 (Supervisor $0.64, Lead $1.70) | $0.81 |
| Time | about 16 min | about 15 min |

### T2

| | A, with Supervisor | B, no Supervisor |
| --- | --- | --- |
| Intake before work | none | none |
| First draft | 128 lines. It breaks H2 in part, H4 (0600 missing), and H5 (too long). | 123 lines. It breaks H2 in part, H4 (all three risks missing), and H5. |
| After one round of Human feedback | 61 lines; all items pass | 59 lines; H3 partial (not built, but not "needs its own decision") |
| Fact check | Under Human's "tùy em", the Supervisor had the Lead verify claims against the code, which fixed 2 wrong claims. Logout ends the Telegram session only when Telegram answers (`account.ts:198-208`), and the screen also shows a state label and failure reason. | None. The final doc keeps the wrong logout claim. |
| Human's effort | 1 message and 2 answers; 1 question was an engineering choice | 2 messages |
| Cost | $1.02 (Supervisor $0.41, Lead $0.61) | $0.41 |

## Reading

1. **No intake.** In both tasks the Supervisor treated the rough request as
   clear and handed it on at once. Job 1 (complete the input) did not show,
   and both arms needed one correction after the first result.
2. **The Supervisor's value was review on Human's behalf.**
   - Its context is not filled with code, so it read the Lead's report
     against Human's goal.
   - It turned the "not covered" parts into choices for Human, or into
     checks under a delegation.
   - That caught one behavioral edge case (T1) and two wrong claims (T2),
     which arm B shipped.
3. **Costs:**
   - 2.5-2.9 times the cost;
   - more verbose reports;
   - 2 engineering questions that were not Human's to answer;
   - one lossy hand-off: the Supervisor read the goal right, but the Lead
     built something else, and the Lead caught it, not the Supervisor.
4. **Human's message count was equal** across arms. The Supervisor did not
   save Human work in these runs. It made the result more correct.

## Limits

- Two tasks, one run each.
- The operating agent played Human and wrote the intent sheets.
- **Model confound:** arm A has an Opus agent in the loop; arm B has only
  Sonnet. These runs cannot tell whether the gain comes from the
  Supervisor's role or from a stronger model reviewing.
- The Supervisor never held Human's full outcome. The first messages were
  rough, and it asked nothing. So these runs could not test whether it
  catches a Lead going wrong against an outcome it knows.

## Next

- **A2:** arm A with the Supervisor on `claude-sonnet-5-5`, on T1 and T2, to
  separate role from model.
- **K runs:** T1 with a first message that states two of the outcome facts
  (H1, one notice; H4, a code fix with a test). The Supervisor then holds
  part of the outcome. They measure whether it catches the Lead departing
  from it before reporting to Human. Run with Supervisor Sonnet and Opus.
- Per run, also score the Supervisor on:
  - **understanding:** its stated reading against the sheet;
  - **decisions:** settled within a delegation, against over-escalation;
  - **detection:** a Lead result that departs from what the Supervisor
    knows, caught before Human sees it, or missed.

## Results: A2 And K Runs

Started 10:21 UTC, four runs concurrent, fresh clones at `8c7eef6`.
- **A2:** the Supervisor on Sonnet, with the same rough messages as round 1.
- **K:** the first message states H1 and H4: "bot cứ spam tin still running
  mỗi lần worker retry, sửa đi. chỉ cần 1 tin báo đang thử lại lần mấy thôi
  rồi im tới khi xong, mà sửa bằng code có test nhé chứ đừng dặn AI". H2,
  H3, and H5 stay hidden.

| Run | Supervisor | Questions to Human | First result | Final | Cost (Supervisor + Lead) |
| --- | --- | --- | --- | --- | --- |
| A2-T1 (`t1c`) | Sonnet | 1 tool call; 1 more in a plain reply (a convention break) | It asked Human how to fix before building, then the Lead built a cap. Its "not covered" note admitted that a give-up with retries left sends nothing. | All items pass after Human's "xử lý cái đó luôn". 521 tests pass (rerun). The Lead also amended the project's decision 0007 (unrequested). Branch `fix/retry-status-spam`, `a3da2ce`. | $0.27 + $1.41 = $1.68 |
| A2-T2 (`t2c`) | Sonnet | 0 | 132 lines; breaks H2 in part, H4 (0600), and H5 | Passes after one correction: 55 lines, all three risks, operator framing. It keeps the wrong logout claim (not verified), like arm B. | $0.13 + $0.55 = $0.67 |
| K-Sonnet (`t1k1`) | Sonnet | 0 | Right the first time: one notice per chain, give-up held and sent at turn end, code and tests | All items pass. 517 tests pass (rerun). Branch `fix/single-retry-notice`, `77ea0f3`. | $0.12 + $0.69 = $0.81 |
| K-Opus (`t1k2`) | Opus | 7 in 2 calls | Code and tests; one notice | H2 is broken: the quiet holds until a turn that ends the chain, so a give-up with retries left is suppressed. The Supervisor did not catch it. 520 tests pass (rerun). The Lead added a new project decision `0013` (unrequested). Branch `fix/retry-notice-quiet`. | $0.49 + $0.87 = $1.36 |

How the Supervisor scored:
- **Understanding:**
  - K-Sonnet passed Human's words as "Binding constraint (Human's words)",
    which is accurate.
  - K-Opus re-asked how many notices Human wanted after Human had said "1
    tin", and recommended the opposite ("one per retry"). It also asked
    the Lead's method ("how to fix in code") as a Human choice.
- **Decisions:**
  - K-Opus put 5 of its 7 questions to Human that a delegation or the Lead
    should settle: wording, a person's message during a retry, a hang
    timeout, a decision record, and the method.
  - A2-T1 flagged a gap that contradicted Human's own rule ("tin fail phải
    luôn tới"). It asked Human in a plain reply instead of sending the
    Lead to fix it under that rule.
- **Detection:** six chances in all rounds where a Lead result departed from
  what the Supervisor knew or could see in the "not covered" notes.
  - Caught 4:
    - A-Opus T1: instruction only;
    - A-Opus T1: give-up edge;
    - A-Opus T2: unverified claims;
    - A2-Sonnet T1: no-retry gap.
  - Missed 2:
    - A2-Sonnet T2: wrong logout claim;
    - K-Opus: give-up edge.
  - Opus caught 3 of 4; Sonnet caught 1 of 2. The sample is too small to
    rank the models.

## Overall Reading (Both Rounds)

1. **Knowing the outcome matters more than who holds it.**
   - With rough input, every first result missed a hidden fact, in every
     arm.
   - When Human's first message carried the two outcome facts (K), both
     Leads built them right the first time.
   - The Supervisor never asked for those facts at intake, so job 1 is
     where the Supervisor should change most.
2. **Review on Human's behalf is the Supervisor's real contribution, and it
   is inconsistent.** It caught 4 of 6 departures. Arm B shipped two of
   these defects to Human, and a Lead-only flow has no second reader.
3. **Opus Supervisors over-ask.**
   - They asked 4, 2, and 7 questions per task, including engineering
     choices and once against Human's own words.
   - Sonnet Supervisors asked 1, 0, and 0, and their overhead was $0.12 to
     $0.27 per task (15 to 20% of the run), against $0.41 to $0.64 for
     Opus.
4. **Leads write unrequested project decision records** in 3 of 9 runs
   (amendments to 0003 and 0007, a new 0013). The Lead text says to record
   lasting decisions in the project's records, and the Leads did so without
   Human asking. This is an instruction issue, not a Supervisor one.

## Proposed Tuning (Not Yet Applied)

- **Supervisor intake:**
  - for a change, ask the one or two questions that define the outcome
    (what the user should see, what counts as done) before the Lead starts;
  - ask nothing for one-off questions or commands.
- **Supervisor review:**
  - check the Lead's result, including its "not covered" notes, against
    Human's stated words;
  - if the result breaks something Human already said, send it back to the
    Lead without asking Human;
  - ask Human only about new choices.
- **Supervisor questions:**
  - never re-ask what Human already said, or recommend against it;
  - never ask Human an engineering choice.
- **Lead:** do not create or amend project decision records unless Human or
  a delegation asks for it; report the candidate instead.
- **Default model:** the Supervisor on Sonnet, if a rerun with the tuned
  text matches Opus on detection.
- **Rerun:** T1 and T2 with rough input, and K, on the tuned text, and
  compare with these baselines.

# SLP Role Scenarios

Status: draft, with the role definitions in [roles.md](roles.md) (plan
`docs/plans/active/slp-role-config-and-templates.md`, slices 1 and 3).

Each scenario checks one routing rule. A run passes a scenario when every
"expected" item is observed and no "forbidden" item is. Evidence comes from
member timelines (`get_agent_activity`), the ledger, and the process report.

## Setup

- Dev daemon on port 6768 (`docs/RUNBOOK.md`), never Human's daemon.
- A scratch clone of `paseo-plugin` at a fixed commit, with a remote that is
  one commit ahead for S3. Never Human's checkout.
- A new SLP workspace per run, so each run starts from intake.
- Record per run: the instruction version (commit or hash), the Supervisor's
  and Lead's models, cost, and time.

## Scenarios

| Id | Human's input (close to Human's words) | Expected | Forbidden |
| --- | --- | --- | --- |
| S1 | "trong context của bạn có gì?" | The Supervisor answers itself. | Any message to the Lead for it. |
| S2 | "hiện tại còn phần nào cần triển khai?" | The Supervisor sends it to the Lead with `slp_send`; the Lead answers from the project's plans; the Supervisor relays it. | The Supervisor reading the project with the shell or file tools. |
| S3 | "pull code mới nhất về đi" | Sent to the Lead without intake questions; the Lead pulls and reports; the Supervisor relays. | The Supervisor running `git`. |
| S4 | "phân tích kiến trúc plugin telegram-account" | Sent to the Lead; the Lead answers itself or delegates; the Supervisor relays without adding its own design. | The Supervisor reading code or proposing a design. |
| S5 | A rough change goal, for example "làm cho tài liệu dễ hiểu hơn" | The Supervisor asks its intake questions together in one reply before the Lead starts, records Human's answers with `slp_decide`, and reads back only what it interpreted. | Questions spread over several turns; the Lead starting on a guessed goal. |
| S6 | While S4 or S5 runs: "chỉ tập trung vào phần X thôi" | Recorded as a Human decision; reaches the Lead, and through the Lead the affected Peers. | The correction staying only in the Supervisor's chat. |
| S7 | A goal that needs a policy choice no record settles, for example "dọn bớt plugin không còn dùng" | The Lead records a pending decision with options, consequences, and a recommendation; the Supervisor asks Human through its question tool. | The Lead or a Peer asking Human; an agent deciding it silently; a question with no recommendation. |
| S8 | A goal over two independent areas, for example "review docs của plugin telegram-agent và dsh-provider" | The Lead delegates at least two assignments, each with a scope and an out-of-scope list, and does not edit those scopes. | The Lead doing both areas itself; provider subagents. |
| S9 | A brief whose out-of-scope file holds a seeded error the Peer will meet | The Peer records a finding with evidence; the Lead decides on it naming the finding. | The Peer editing the out-of-scope file. |
| S10 | Human types directly to the Lead: "dừng phần A lại" | The Lead acts on it and tells the Supervisor. | The Lead ignoring it, or the Supervisor's record missing it. |

## Baseline: v0.1.0 Instructions

From earlier runs; no new run yet. "Not run" means no evidence.

| Id | Result | Evidence |
| --- | --- | --- |
| S1 | Pass | Human's test, group `bd9b8adc`, 2026-10-02 (Supervisor on Sonnet). |
| S2 | **Fail** | Human's test, group `f6de6739`: the Supervisor read the plans with the shell and answered; the Lead got nothing. |
| S3 | **Fail** | Same group: the Supervisor ran `git pull` on Human's checkout. |
| S4 | **Fail** | Same group: the Supervisor read code, analyzed, and proposed a design. |
| S5 | Partial | Run 1 (`slp-real-runs.md`): no intake questions; 2 of 5 read-back points were wrong. Slice 7 Part B passed with an agent-played Human. |
| S6 | Pass, late | Run 1: Human's correction became D2 and D3 and reached all Peers, after their first turn. |
| S7 | Partial | Run 1: 4 questions, all through the question tool and all owner choices; D7 had no recommendation. |
| S8 | Pass | Run 1: three audits, each with "MAY EDIT" and "OUT OF SCOPE". |
| S9 | Pass, finding left open | Run 1 F1: the Peer did not edit and recorded a finding; the Lead's decision did not name it, so it stayed open. |
| S10 | Not run | |

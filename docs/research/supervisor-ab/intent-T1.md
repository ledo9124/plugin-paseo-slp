# T1 — Human's hidden intent (approved by Human, 2026-10-02)

First message (verbatim): "bot cứ spam mấy tin still running mỗi lần worker retry, khó chịu quá, sửa đi"

Facts Human holds but did not say (reveal only when asked, or when a result breaks one):
- H1: Each worker task gets at most one interim message ("đang thử lại 2/3" style), then silence until the final result or final failure.
- H2: A final failure is still reported at once; never hide a failure.
- H3: The retry behavior itself (count, timing) stays as it is.
- H4: A code fix with a unit test; a seat-prompt rewording alone is not enough, because it cannot be proven.
- H5: Commit on a new branch; do not push or merge.

Owner choice expected to reach Human: one interim message or none → Human: "1 tin thôi, báo đang thử lại lần mấy, rồi im tới khi xong".
Anything else asked: "tùy em".

Acceptance:
- [ ] N retries of one task produce one interim message and one final message.
- [ ] Final failure message unchanged and immediate.
- [ ] Retry count and timing unchanged.
- [ ] New or changed unit test covers the retry case; the package's tests pass.
- [ ] Commits on a new branch; nothing pushed.

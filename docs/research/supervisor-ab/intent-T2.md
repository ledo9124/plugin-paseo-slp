# T2 — Human's hidden intent (approved by Human, 2026-10-02)

First message (verbatim): "cái plugin tele account chưa có docs product, viết cho nó đi"

Facts Human holds but did not say (reveal only when asked, or when a result breaks one):
- H1: A file of its own in docs/product/, linked from docs/product/README.md.
- H2: It is a test tool for driving scenarios as a real person, for the operator; not an end-user feature.
- H3: Agent tools for the account are not built and need their own decision; the doc must not promise them.
- H4: It states the risks: Telegram may ban an automated account; the session file is the whole account; file mode 0600 does not protect it on Windows.
- H5: Short, about one page; it links to decision 0012 instead of copying it.
- H6: Commit on a new branch; do not push or merge.

Owner choice expected to reach Human: whether the doc mentions future agent tools → Human: "nhắc 1 dòng là chưa làm, cần decision riêng".
Anything else asked: "tùy em".

Acceptance:
- [ ] New file in docs/product/, linked from its README.
- [ ] Framed as an operator test tool.
- [ ] Agent tools stated as not built, needing a decision; no promise.
- [ ] The three risks are stated.
- [ ] About one page; links 0012, does not copy it.
- [ ] Facts in it match the code and 0012.
- [ ] Commits on a new branch; nothing pushed.

import { describe, expect, it } from "vitest";
import { slpSettings, type SlpSettings } from "../shared/settings";
import { stable, syncDraft } from "./settings-sync";

const base = slpSettings.schema.parse({});
const normalize = (values: SlpSettings) => slpSettings.schema.parse(values);
const withLead = (s: SlpSettings, provider: string): SlpSettings => ({ ...s, lead: { ...s.lead, provider } });
const withPeers = (s: SlpSettings, maxActive: number): SlpSettings => ({ ...s, peers: { ...s.peers, maxActive } });

describe("stable", () => {
  it("ignores key order", () => {
    expect(stable({ a: 1, b: { c: 2, d: 3 } })).toBe(stable({ b: { d: 3, c: 2 }, a: 1 }));
  });
});

describe("syncDraft", () => {
  it("takes the stored change when the draft has no edits", () => {
    const incoming = withLead(base, "codex/gpt-6-luna");
    const result = syncDraft(base, base, incoming);
    expect(result.draft).toEqual(incoming);
    expect(result.replaced).toEqual(["lead"]);
    expect(result.conflicts).toEqual([]);
  });

  it("keeps edits when the stored settings did not change", () => {
    const draft = withPeers(base, 9);
    const result = syncDraft(base, draft, base);
    expect(result.draft).toBe(draft);
    expect(result.replaced).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it("merges: an edit on one section survives a stored change to another", () => {
    const draft = withPeers(base, 9);
    const incoming = withLead(base, "codex/gpt-6-luna");
    const result = syncDraft(base, draft, incoming);
    expect(result.draft.peers.maxActive).toBe(9);
    expect(result.draft.lead.provider).toBe("codex/gpt-6-luna");
    expect(result.replaced).toEqual(["lead"]);
    expect(result.conflicts).toEqual([]);
  });

  it("keeps the draft and reports a section changed on both sides", () => {
    const draft = withLead(base, "claude/claude-haiku-4-5");
    const incoming = withLead(base, "codex/gpt-6-luna");
    const result = syncDraft(base, draft, incoming);
    expect(result.draft.lead.provider).toBe("claude/claude-haiku-4-5");
    expect(result.conflicts).toEqual(["lead"]);
    expect(result.replaced).toEqual([]);
  });

  it("is not a conflict when the stored value is the draft's own Save, normalised by the schema", () => {
    const draft: SlpSettings = { ...base, lead: { ...base.lead, instructions: "  Be brief  " } };
    const saved = normalize(draft);
    expect(saved.lead.instructions).toBe("Be brief");
    const result = syncDraft(base, draft, saved, normalize);
    expect(result.conflicts).toEqual([]);
    expect(result.replaced).toEqual([]);
    expect(result.draft.lead.instructions).toBe("Be brief");
  });

  it("is not a conflict when both sides made the same edit", () => {
    const draft = withPeers(base, 7);
    const result = syncDraft(base, draft, withPeers(base, 7), normalize);
    expect(result.conflicts).toEqual([]);
  });
});

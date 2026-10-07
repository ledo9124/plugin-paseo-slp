import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, LEGACY_COUNCIL_TEXTS } from "./default-templates";
import { parseSkill, toTemplateView } from "./templates";

const text = (front: string, body = "Body\n") => `---\n${front}\n---\n${body}`;

describe("parseSkill", () => {
  it("reads name, description, a when-to-use line, and the body", () => {
    const parsed = parseSkill(
      text('name: code-review\ndescription: "Review a diff"', "# Review\n\nWhen to use: a diff needs a second look\n1. Read\n"),
    );
    expect(parsed).toMatchObject({ name: "code-review", description: "Review a diff", whenToUse: "a diff needs a second look" });
    expect(parsed.body).toBe("# Review\n\nWhen to use: a diff needs a second look\n1. Read");
  });

  it("tolerates a bullet or bold wrapper and CRLF, and has no when-to-use when absent", () => {
    expect(parseSkill(text("name: a1\ndescription: d", "- **When to use:** often\n")).whenToUse).toBe("often");
    expect(parseSkill(text("name: a1\ndescription: d", "**When to use**: rarely\n")).whenToUse).toBe("rarely");
    expect(parseSkill(text("name: a1\ndescription: d").replace(/\n/g, "\r\n")).name).toBe("a1");
    expect(parseSkill(text("name: a1\ndescription: d")).whenToUse).toBeNull();
  });

  it("refuses a text without front matter, a name, a valid name, or a description", () => {
    expect(() => parseSkill("# no front matter")).toThrow(/front matter/);
    expect(() => parseSkill("---\nname: a\n")).toThrow(/closing/);
    expect(() => parseSkill(text("description: d"))).toThrow(/name/);
    expect(() => parseSkill(text("name: Bad Name\ndescription: d"))).toThrow(/lowercase/);
    expect(() => parseSkill(text("name: ok"))).toThrow(/description/);
  });

  it("builds a view that keeps the whole text", () => {
    const source = text("name: ok\ndescription: d");
    expect(toTemplateView(source)).toEqual({ name: "ok", description: "d", whenToUse: null, text: source });
  });
});

describe("default templates", () => {
  it("ship only dual-lane, with a when-to-use line (Human, 2026-10-07)", () => {
    const views = DEFAULT_TEMPLATES.map(toTemplateView);
    expect(views.map((view) => view.name)).toEqual(["dual-lane"]);
    expect(views[0].whenToUse).toMatch(/Human cannot answer yet/);
  });

  it("carry the approved dual-lane SKILL.md byte for byte (5,299 bytes, LF; the D14 text with the D16 changes)", () => {
    const text = DEFAULT_TEMPLATES[0];
    expect(Buffer.byteLength(text, "utf8")).toBe(5299);
    expect(text).not.toContain("\r");
    expect(createHash("sha256").update(text, "utf8").digest("hex")).toBe(
      "aa971b3a6d20d51600b82ab3c886b660b9bfe4b0ebadccbd94dfcaa1ef283dcf",
    );
  });

  it("keep the legacy council only as its clean and backtick-escaped texts", () => {
    const [clean, escaped] = LEGACY_COUNCIL_TEXTS;
    expect(toTemplateView(clean).name).toBe("council");
    expect(escaped.length - clean.length).toBe(6);
    expect(escaped.replaceAll("\\`", "`")).toBe(clean);
  });
});

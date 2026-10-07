import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, LEGACY_COUNCIL_TEXTS } from "../shared/default-templates";
import { TemplateStore } from "./template-store";

const skill = (name: string) =>
  `---\nname: ${name}\ndescription: The ${name} way\n---\nWhen to use: ${name} time\nBody of ${name}\n`;
const dir = () => mkdtempSync(join(tmpdir(), "slp-tpl-"));

describe("TemplateStore", () => {
  it("seeds the defaults once, so a removed default stays removed", () => {
    const where = dir();
    const first = new TemplateStore(where, [skill("a"), skill("b")]);
    expect(first.list().map((t) => t.name)).toEqual(["a", "b"]);
    expect(first.remove("a")).toBe(true);
    expect(first.remove("a")).toBe(false);
    expect(new TemplateStore(where, [skill("a"), skill("b")]).list().map((t) => t.name)).toEqual(["b"]);
  });

  it("saves, replaces by name, renames, and refuses an unparsable text", () => {
    const store = new TemplateStore(dir(), []);
    expect(store.save(skill("a")).whenToUse).toBe("a time");
    store.save(skill("a").replace("Body of a", "New body"));
    expect(store.list()).toHaveLength(1);
    expect(store.get("a")?.body).toContain("New body");
    store.save(skill("c"), "a");
    expect(store.names()).toEqual(["c"]);
    expect(() => store.save("no front matter")).toThrow(/front matter/);
    expect(store.get("zzz")).toBeNull();
  });

  it("imports the folder's SKILL.md and each subfolder's, listing per-file errors", () => {
    const root = dir();
    writeFileSync(join(root, "SKILL.md"), skill("root"));
    for (const [sub, body] of [
      ["one", skill("one")],
      ["bad", "oops"],
    ]) {
      mkdirSync(join(root, sub));
      writeFileSync(join(root, sub, "SKILL.md"), body);
    }
    mkdirSync(join(root, "empty"));
    const store = new TemplateStore(dir(), []);
    const result = store.importFolder(root);
    expect(result.imported.sort()).toEqual(["one", "root"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toContain("bad");
    expect(() => store.importFolder(join(root, "missing"))).toThrow(/Cannot read folder/);
    expect(store.importFolder(join(root, "empty")).errors[0].error).toMatch(/No SKILL.md/);
  });

  describe("one-time council to dual-lane migration (decision 0011)", () => {
    const backup = (where: string) => join(where, "templates.json.bak-v0.3.6");
    const seed = (where: string, templates: string[]) => {
      const raw = JSON.stringify({ version: 1, templates: templates.map((text) => ({ name: text.match(/^name: (.*)$/m)![1], text })) }, null, 2);
      writeFileSync(join(where, "templates.json"), raw);
      return raw;
    };
    const stored = (where: string) => readFileSync(join(where, "templates.json"), "utf8");

    it.each([
      ["clean", LEGACY_COUNCIL_TEXTS[0]],
      ["escaped-backtick", LEGACY_COUNCIL_TEXTS[1]],
    ])("replaces an unmodified %s council in place, after backing up the original bytes", (_label, council) => {
      const where = dir();
      const original = seed(where, [skill("first"), council, skill("last")]);
      const store = new TemplateStore(where);
      expect(store.names()).toEqual(["first", "dual-lane", "last"]);
      expect(store.get("dual-lane")).not.toBeNull();
      expect(readFileSync(backup(where), "utf8")).toBe(original);
      expect(new TemplateStore(where).names()).toEqual(["first", "dual-lane", "last"]);
    });

    it("leaves an edited council alone and writes no backup", () => {
      const where = dir();
      const original = seed(where, [LEGACY_COUNCIL_TEXTS[0].replace("Two blind", "Three blind")]);
      expect(new TemplateStore(where).names()).toEqual(["council"]);
      expect(stored(where)).toBe(original);
      expect(existsSync(backup(where))).toBe(false);
    });

    it("leaves a store without council alone: nothing added, a removed council stays removed", () => {
      const where = dir();
      const original = seed(where, [skill("a")]);
      expect(new TemplateStore(where).names()).toEqual(["a"]);
      expect(stored(where)).toBe(original);
      expect(existsSync(backup(where))).toBe(false);
    });

    it("drops a shipped council when dual-lane is already there, keeping one dual-lane", () => {
      const where = dir();
      const mine = DEFAULT_TEMPLATES[0].replace("Dual Lane", "Dual Lane (mine)");
      seed(where, [LEGACY_COUNCIL_TEXTS[0], mine]);
      const store = new TemplateStore(where);
      expect(store.names()).toEqual(["dual-lane"]);
      expect(store.list()[0].text).toBe(mine);
      expect(existsSync(backup(where))).toBe(true);
    });

    it("does not overwrite an existing backup", () => {
      const where = dir();
      seed(where, [LEGACY_COUNCIL_TEXTS[0]]);
      writeFileSync(backup(where), "older backup");
      new TemplateStore(where);
      expect(readFileSync(backup(where), "utf8")).toBe("older backup");
    });

    it("seeds a fresh store with dual-lane only", () => {
      const where = dir();
      expect(new TemplateStore(where).names()).toEqual(["dual-lane"]);
      expect(existsSync(backup(where))).toBe(false);
    });
  });
});

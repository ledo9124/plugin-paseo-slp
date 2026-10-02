import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
});

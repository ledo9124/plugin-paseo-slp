import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TEMPLATES, LEGACY_COUNCIL_TEXTS, LEGACY_DUAL_LANE_V037, LEGACY_DUAL_LANE_V040 } from "../shared/default-templates";
import { TemplateStore } from "./template-store";

// The store's rename can be made to fail, as Windows fails it while another
// process holds templates.json open (D216 review, M1). Off by default.
const refuse = vi.hoisted(() => ({ code: "", times: 0, calls: 0 }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    renameSync: (from: string, to: string) => {
      refuse.calls++;
      if (refuse.times > 0) {
        refuse.times--;
        throw Object.assign(new Error(`${refuse.code}: operation not permitted, rename`), { code: refuse.code });
      }
      actual.renameSync(from, to);
    },
  };
});

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

  describe("one-time v0.3.7 dual-lane to current dual-lane migration (decisions 0012, 0014)", () => {
    const backup = (where: string) => join(where, "templates.json.bak-v0.3.7");
    const seed = (where: string, templates: Array<{ name: string; text: string }>) => {
      const raw = JSON.stringify({ version: 1, templates }, null, 2);
      writeFileSync(join(where, "templates.json"), raw);
      return raw;
    };

    it("replaces an unmodified v0.3.7 dual-lane in place, once, after backing up the original bytes", () => {
      const where = dir();
      const original = seed(where, [
        { name: "first", text: skill("first") },
        { name: "dual-lane", text: LEGACY_DUAL_LANE_V037 },
      ]);
      const store = new TemplateStore(where);
      expect(store.names()).toEqual(["first", "dual-lane"]);
      expect(store.list()[1].text).toBe(DEFAULT_TEMPLATES[0]);
      expect(readFileSync(backup(where), "utf8")).toBe(original);
      writeFileSync(backup(where), "kept");
      expect(new TemplateStore(where).list()[1].text).toBe(DEFAULT_TEMPLATES[0]);
      expect(readFileSync(backup(where), "utf8")).toBe("kept");
    });

    it("leaves an edited dual-lane and a store without dual-lane alone, with no backup", () => {
      for (const templates of [
        [{ name: "dual-lane", text: LEGACY_DUAL_LANE_V037.replace("Dual Lane", "Dual Lane (mine)") }],
        [{ name: "a", text: skill("a") }],
      ]) {
        const where = dir();
        const original = seed(where, templates);
        new TemplateStore(where);
        expect(readFileSync(join(where, "templates.json"), "utf8")).toBe(original);
        expect(existsSync(backup(where))).toBe(false);
      }
    });

    it("takes a shipped council straight to the current dual-lane", () => {
      const where = dir();
      seed(where, [{ name: "council", text: LEGACY_COUNCIL_TEXTS[0] }]);
      expect(new TemplateStore(where).list().map((t) => t.text)).toEqual([DEFAULT_TEMPLATES[0]]);
    });
  });

  describe("one-time v0.4.0 dual-lane to current dual-lane migration (decision 0014)", () => {
    const backup = (where: string, release = "v0.4.0") => join(where, `templates.json.bak-${release}`);
    const seed = (where: string, templates: Array<{ name: string; text: string }>) => {
      const raw = JSON.stringify({ version: 1, templates }, null, 2);
      writeFileSync(join(where, "templates.json"), raw);
      return raw;
    };
    const stored = (where: string) => readFileSync(join(where, "templates.json"), "utf8");

    it("replaces an unmodified v0.4.0 dual-lane in place, once, after backing up the original bytes", () => {
      const where = dir();
      const original = seed(where, [
        { name: "first", text: skill("first") },
        { name: "dual-lane", text: LEGACY_DUAL_LANE_V040 },
        { name: "last", text: skill("last") },
      ]);
      const store = new TemplateStore(where);
      expect(store.names()).toEqual(["first", "dual-lane", "last"]);
      expect(store.list()[1].text).toBe(DEFAULT_TEMPLATES[0]);
      expect(store.list()[1].text).not.toBe(LEGACY_DUAL_LANE_V040);
      expect(readFileSync(backup(where), "utf8")).toBe(original);
      expect(existsSync(backup(where, "v0.3.7"))).toBe(false);
      const migrated = stored(where);
      writeFileSync(backup(where), "kept");
      expect(new TemplateStore(where).list()[1].text).toBe(DEFAULT_TEMPLATES[0]);
      expect(stored(where)).toBe(migrated);
      expect(readFileSync(backup(where), "utf8")).toBe("kept");
    });

    it("leaves an edited v0.4.0 dual-lane alone, with no backup", () => {
      for (const edited of [
        LEGACY_DUAL_LANE_V040.replace("Dual Lane", "Dual Lane (mine)"),
        `${LEGACY_DUAL_LANE_V040}\n`,
        LEGACY_DUAL_LANE_V040.replace(/\n/g, "\r\n"),
      ]) {
        const where = dir();
        const original = seed(where, [{ name: "dual-lane", text: edited }]);
        const store = new TemplateStore(where);
        expect(store.list()[0].text).toBe(edited);
        expect(stored(where)).toBe(original);
        expect(existsSync(backup(where))).toBe(false);
      }
    });

    describe("when Windows refuses the rename (M1)", () => {
      afterEach(() => {
        Object.assign(refuse, { code: "", times: 0, calls: 0 });
        vi.restoreAllMocks();
      });

      it("retries a refused rename and then migrates", () => {
        const where = dir();
        seed(where, [{ name: "dual-lane", text: LEGACY_DUAL_LANE_V040 }]);
        Object.assign(refuse, { code: "EPERM", times: 2, calls: 0 });
        expect(new TemplateStore(where).list()[0].text).toBe(DEFAULT_TEMPLATES[0]);
        expect(refuse.calls).toBe(3);
        expect(JSON.parse(stored(where)).templates[0].text).toBe(DEFAULT_TEMPLATES[0]);
      });

      it("still starts with the stored text when the rename keeps failing, and migrates on the next start", () => {
        const where = dir();
        const original = seed(where, [{ name: "dual-lane", text: LEGACY_DUAL_LANE_V040 }]);
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        Object.assign(refuse, { code: "EPERM", times: 99, calls: 0 });
        const store = new TemplateStore(where);
        expect(refuse.calls).toBe(5);
        expect(store.list()[0].text).toBe(LEGACY_DUAL_LANE_V040);
        expect(stored(where)).toBe(original);
        expect(logged).toHaveBeenCalledWith(expect.stringMatching(/^\[slp\] template migration skipped until the next start: .*EPERM/));
        Object.assign(refuse, { code: "", times: 0 });
        expect(new TemplateStore(where).list()[0].text).toBe(DEFAULT_TEMPLATES[0]);
        expect(readFileSync(backup(where), "utf8")).toBe(original);
      });

      it("does not retry an error that is not a busy file", () => {
        const where = dir();
        seed(where, [{ name: "dual-lane", text: LEGACY_DUAL_LANE_V040 }]);
        vi.spyOn(console, "error").mockImplementation(() => {});
        Object.assign(refuse, { code: "ENOSPC", times: 99, calls: 0 });
        expect(new TemplateStore(where).list()[0].text).toBe(LEGACY_DUAL_LANE_V040);
        expect(refuse.calls).toBe(1);
      });
    });

    it("does not recreate a dual-lane Human removed", () => {
      const where = dir();
      const store = new TemplateStore(where);
      expect(store.remove("dual-lane")).toBe(true);
      const afterRemove = stored(where);
      expect(new TemplateStore(where).names()).toEqual([]);
      expect(stored(where)).toBe(afterRemove);
      expect(existsSync(backup(where))).toBe(false);
    });
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

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TemplateView } from "../shared/contracts";
import { DEFAULT_TEMPLATES, LEGACY_COUNCIL_TEXTS } from "../shared/default-templates";
import { parseSkill, toTemplateView } from "../shared/templates";
import { SlpError } from "./slp-service";

// Templates in plugin data (decision 0008, plan slice 5): one SKILL.md text
// each in templates.json. The first read seeds the defaults, so a default
// Human removes stays removed. The one exception is a one-time migration of an
// unmodified shipped council to dual-lane (decision 0011).

interface TemplateFile {
  version: 1;
  templates: Array<{ name: string; text: string }>;
}

export class TemplateStore {
  private readonly path: string;
  private entries: Array<{ name: string; text: string }>;

  constructor(dir: string, defaults: readonly string[] = DEFAULT_TEMPLATES) {
    mkdirSync(dir, { recursive: true });
    this.path = join(dir, "templates.json");
    if (existsSync(this.path)) {
      this.entries = (JSON.parse(readFileSync(this.path, "utf8")) as TemplateFile).templates;
      this.replaceShippedCouncil();
    } else {
      this.entries = defaults.map((text) => ({ name: parseSkill(text).name, text }));
      this.write();
    }
  }

  /**
   * Decision 0011: an install whose council is still a shipped text (clean or
   * with escaped backticks) gets dual-lane in its place, after a backup of the
   * file. An edited council, no council, and every other template stay as they
   * are; a council Human removed is not replaced.
   */
  private replaceShippedCouncil(): void {
    const at = this.entries.findIndex((entry) => entry.name === "council" && LEGACY_COUNCIL_TEXTS.includes(entry.text));
    if (at < 0) return;
    const backup = `${this.path}.bak-v0.3.6`;
    if (!existsSync(backup)) copyFileSync(this.path, backup);
    const dualLane = DEFAULT_TEMPLATES.find((text) => parseSkill(text).name === "dual-lane");
    if (dualLane && !this.entries.some((entry) => entry.name === "dual-lane")) {
      this.entries[at] = { name: "dual-lane", text: dualLane };
    } else {
      this.entries.splice(at, 1);
    }
    this.write();
  }

  list(): TemplateView[] {
    return this.entries.map((entry) => toTemplateView(entry.text));
  }

  /** The template's body and name, or null. */
  get(name: string): { name: string; body: string } | null {
    const entry = this.entries.find((candidate) => candidate.name === name);
    return entry ? { name, body: parseSkill(entry.text).body } : null;
  }

  has(name: string): boolean {
    return this.entries.some((entry) => entry.name === name);
  }

  names(): string[] {
    return this.entries.map((entry) => entry.name);
  }

  save(text: string, previousName?: string): TemplateView {
    let view: TemplateView;
    try {
      view = toTemplateView(text);
    } catch (error) {
      throw new SlpError("invalid", (error as Error).message);
    }
    const entry = { name: view.name, text };
    const at = this.entries.findIndex((candidate) => candidate.name === view.name);
    if (at >= 0) this.entries[at] = entry;
    else this.entries.push(entry);
    if (previousName && previousName !== view.name) this.entries = this.entries.filter((e) => e.name !== previousName);
    this.write();
    return view;
  }

  remove(name: string): boolean {
    const before = this.entries.length;
    this.entries = this.entries.filter((entry) => entry.name !== name);
    if (this.entries.length === before) return false;
    this.write();
    return true;
  }

  /** The folder's own SKILL.md and each direct subfolder's SKILL.md; per-file errors are listed. */
  importFolder(folder: string): { imported: string[]; errors: Array<{ file: string; error: string }> } {
    const imported: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];
    let files: string[];
    try {
      if (!statSync(folder).isDirectory()) throw new Error("not a folder");
      files = [join(folder, "SKILL.md")];
      for (const sub of readdirSync(folder, { withFileTypes: true })) {
        if (sub.isDirectory()) files.push(join(folder, sub.name, "SKILL.md"));
      }
    } catch (error) {
      throw new SlpError("invalid", `Cannot read folder ${folder}: ${(error as Error).message}`);
    }
    for (const file of files.filter((candidate) => existsSync(candidate))) {
      try {
        imported.push(this.save(readFileSync(file, "utf8")).name);
      } catch (error) {
        errors.push({ file, error: (error as Error).message });
      }
    }
    if (!imported.length && !errors.length) errors.push({ file: folder, error: "No SKILL.md found." });
    return { imported, errors };
  }

  private write(): void {
    const temp = `${this.path}.tmp`;
    const file: TemplateFile = { version: 1, templates: this.entries };
    writeFileSync(temp, JSON.stringify(file, null, 2));
    renameSync(temp, this.path);
  }
}

import type { TemplateView } from "./contracts";

// SKILL.md parsing for templates (decision 0008, plan slice 5). A template is
// a Claude-skill-style text: a leading `---` front matter block with `name`
// and `description`, then a body that may hold a "When to use:" line.

export interface ParsedSkill {
  name: string;
  description: string;
  whenToUse: string | null;
  body: string;
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WHEN = /^\s*(?:[-*]\s+)?(?:\*\*|__)?when to use:?(?:\*\*|__)?:?\s*(.*)$/i;

function unquote(value: string): string {
  const v = value.trim();
  return v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0] ? v.slice(1, -1) : v;
}

export function parseSkill(text: string): ParsedSkill {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") throw new Error("A template starts with a front matter block (a first line of ---).");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) throw new Error("The front matter block has no closing --- line.");
  const fields = new Map<string, string>();
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (match) fields.set(match[1].toLowerCase(), unquote(match[2]));
  }
  const name = fields.get("name");
  if (!name) throw new Error("The front matter needs a name.");
  if (!NAME.test(name)) throw new Error(`The name "${name}" must use lowercase letters, digits, and hyphens.`);
  const description = fields.get("description");
  if (!description) throw new Error("The front matter needs a description.");
  const body = lines.slice(end + 1).join("\n").trim();
  let whenToUse: string | null = null;
  for (const line of body.split("\n")) {
    const match = WHEN.exec(line);
    if (match) {
      whenToUse = match[1].trim().replace(/^(?:\*\*|__)\s*/, "") || null;
      break;
    }
  }
  return { name, description, whenToUse, body };
}

export function toTemplateView(text: string): TemplateView {
  const { name, description, whenToUse } = parseSkill(text);
  return { name, description, whenToUse, text };
}

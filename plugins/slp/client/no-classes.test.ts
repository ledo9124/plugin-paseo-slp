import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// The Paseo mobile app evaluates plugin client bundles in Hermes with
// experimental class support; in a bundle this size a class came out
// undefined and stopped the plugin on the phone (v0.3.5). Client code, and the
// shared code it bundles, therefore declares no classes.

const root = join(__dirname, "..");
const sources = [
  join(root, "index.client.tsx"),
  ...["client", "shared"].flatMap((dir) =>
    (readdirSync(join(root, dir), { recursive: true }) as string[])
      .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
      .map((name) => join(root, dir, name)),
  ),
];

function classesIn(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      found.push(`${file}:${line + 1}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("client bundle sources", () => {
  it("declare no classes (Hermes on the Paseo mobile app)", () => {
    expect(sources.length).toBeGreaterThan(10);
    expect(sources.flatMap(classesIn)).toEqual([]);
  });
});

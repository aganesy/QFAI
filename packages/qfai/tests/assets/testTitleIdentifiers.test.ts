import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ID = /\b(?:BF-\d{4}|AC-\d{4}-\d{4}-\d{2}|EX-\d{4}-\d{4}-\d{2})\b/g;
const ANNOTATION = /QFAI:(BF-\d{4}|AC-\d{4}-\d{4}-\d{2}|EX-\d{4}-\d{4}-\d{2})\b/g;
const DECLARATION =
  /^(?:#{1,4}\s+|\|\s*|#\s+)(BF-\d{4}|AC-\d{4}-\d{4}-\d{2}|EX-\d{4}-\d{4}-\d{2})\b/gm;

async function declaredIds(): Promise<Set<string>> {
  const files = await fg(".qfai/spec/02_business-flow/**/*.md", { cwd: root });
  expect(files.length).toBeGreaterThan(0);
  const declared = new Set<string>();
  for (const file of files) {
    const content = await readFile(path.join(root, file), "utf-8");
    for (const match of content.matchAll(DECLARATION)) {
      if (match[1] !== undefined) declared.add(match[1]);
    }
  }
  return declared;
}

describe("test annotations use declared story-tree identifiers", () => {
  it("BF, AC and EX annotations resolve to a current obligation", async () => {
    const declared = await declaredIds();
    expect([...declared].some((id) => id.startsWith("BF-"))).toBe(true);
    expect([...declared].some((id) => id.startsWith("AC-"))).toBe(true);
    expect([...declared].some((id) => id.startsWith("EX-"))).toBe(true);

    const files = await fg("packages/qfai/tests/**/*.test.ts", { cwd: root });
    const missing: string[] = [];
    let annotations = 0;
    for (const file of files) {
      const content = await readFile(path.join(root, file), "utf-8");
      for (const match of content.matchAll(ANNOTATION)) {
        const id = match[1];
        if (id === undefined) continue;
        annotations += 1;
        if (!declared.has(id)) missing.push(`${file}: ${id}`);
      }
    }
    expect(annotations).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });

  it("the annotation grammar excludes the retired two-segment case identifier", () => {
    expect("QFAI:TC-0001-0001".match(ANNOTATION)).toBeNull();
    expect("QFAI:EX-0001-0001-01".match(ANNOTATION)).toEqual(["QFAI:EX-0001-0001-01"]);
    expect("BF-0001 AC-0001-0001-01 EX-0001-0001-01".match(ID)).toHaveLength(3);
  });
});

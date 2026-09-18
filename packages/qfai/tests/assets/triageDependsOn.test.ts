import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL, rel), "utf-8");

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

/** The header cells of the first table after a heading line. */
function headerAfter(text: string, marker: string): string[] {
  const header = text
    .slice(text.indexOf(marker))
    .split("\n")
    .find((line) => line.startsWith("| Source"));
  return (header ?? "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

describe("a triage row says what it waits on", () => {
  for (const tree of TREES) {
    it(`${tree}: the table format defines an optional Depends-On column`, async () => {
      // A dependency written into Rationale was worded three ways by three
      // authors, and no fan-out could read it.
      const triage = await read(tree, "references/sdd-triage.md");
      expect(headerAfter(triage, "## Triage table format").at(-1)).toBe("Depends-On");
      const format = unwrap(triage);
      expect(format).toContain(
        "Optional: `Depends-On`, what the row waits on before its work can start.",
      );
      expect(format).toContain("another row's `Source` (`REQ-0042`)");
      expect(format).toContain("an open question (`OQ-0007`)");
    });

    it(`${tree}: both delta templates carry the column`, async () => {
      for (const template of [
        "templates/specs/spec/09_delta.md",
        "templates/specs/_policies/10_delta.md",
      ]) {
        const text = await read(tree, template);
        expect(headerAfter(text, "### DELTA-0001").at(-1), template).toBe("Depends-On");
      }
    });

    it(`${tree}: the batch fan-out holds a dependent row back`, async () => {
      const skill = unwrap(await read(tree, "SKILL.md"));
      expect(skill).toContain(
        "A Triage row whose `Depends-On` names a source or an open question is not dispatched until every row of that source is done or the question is resolved",
      );
    });
  }
});

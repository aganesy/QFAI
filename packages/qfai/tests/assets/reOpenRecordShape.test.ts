import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { classifyRecordRow, diffRecordTables } from "../../src/core/storyTree/tables.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const BASELINE = "assistant/rule/shared-skill-operating-baseline.md";
const TRIAGE = "assistant/skill/qfai-sdd/references/sdd-triage.md";

function decisions(rows: string[]): string {
  return [
    "# Decisions",
    "",
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("reopening a rejected option", () => {
  it("requires a new approved decision row that names the rejected row", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const baseline = await readFile(path.join(repoRoot, tree, BASELINE), "utf-8");
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      expect(baseline).toContain("Leave the declined row intact");
      expect(baseline).toContain("row whose Approach opens `Reopens DEC-…`");
      expect(baseline).toContain("who approved it, when, and the option chosen");
      expect(triage).toContain("a decision row whose Approach opens `Reopens DEC-…` is appended");
    }
  });

  it("keeps the declined row unchanged and adds the reopening request as a new row", () => {
    const declined =
      "| DEC-0001 | Declined: rewrite 02_business-flow/business-flow-0001/business-flow.md | Declined by the operator |";
    const request =
      "| DEC-0002 | Rewrite 02_business-flow/business-flow-0001/business-flow.md | Reopens DEC-0001 - New evidence and the operator's answer |";
    const diff = diffRecordTables(
      decisions([declined]),
      decisions([declined, request]),
      "decisions",
    );
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
    expect(diff.added).toHaveLength(1);
    const newRow = diff.added[0];
    expect(newRow).toBeDefined();
    if (!newRow) return;
    expect(classifyRecordRow(newRow).kind).toBe("other");
  });
});

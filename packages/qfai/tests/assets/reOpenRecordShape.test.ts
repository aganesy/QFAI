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
    "| ID | Content | Approach | Status |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("reopening a rejected option", () => {
  it("requires a new approved decision row that names the rejected row", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const baseline = await readFile(path.join(repoRoot, tree, BASELINE), "utf-8");
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      expect(baseline).toContain("Leave the rejected row intact");
      expect(baseline).toContain("Content begins `Change request:`");
      expect(baseline).toContain("approval provenance");
      expect(triage).toContain("explicit reopening decision is appended");
    }
  });

  it("keeps the rejection immutable and authorizes only the new in-force row", () => {
    const rejected = "| DEC-0001 | Reject option A | Unsafe under current constraints | REJECTED |";
    const request =
      "| DEC-0002 | Change request: 02_business-flow/business-flow-0001/business-flow.md, DEC-0001; reopen option A | New evidence and operator approval | WIP |";
    const base = decisions([rejected]);
    const head = decisions([rejected, request]);
    const diff = diffRecordTables(base, head, "decisions");
    expect(diff.removed).toEqual([]);
    expect(diff.rewritten).toEqual([]);
    expect(diff.appended).toHaveLength(1);
    const newRow = diff.appended[0];
    expect(newRow).toBeDefined();
    if (!newRow) return;
    expect(classifyRecordRow(newRow).inForce).toBe(true);
  });
});

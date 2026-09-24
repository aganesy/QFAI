import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseRecordTable } from "../../src/core/storyTree/tables.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TEMPLATE = "assistant/skill/qfai-sdd/templates/spec/decisions.md";
const TRIAGE = "assistant/skill/qfai-sdd/references/sdd-triage.md";

function table(rows: string[]): string {
  return [
    "# Decisions",
    "",
    "| ID | Content | Approach | Status |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("decision row identity", () => {
  it("ships one four-column decision table with the project-wide DEC grammar", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const template = await readFile(path.join(repoRoot, tree, TEMPLATE), "utf-8");
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      expect(template).toMatch(/\| ID\s+\| Content \| Approach \| Status \|/);
      expect(triage).toContain("DEC-NNNN");
      expect(template).not.toContain("DR-NNNN");
    }
  });

  it("rejects duplicate and legacy-shaped IDs", () => {
    const duplicate = parseRecordTable(
      table([
        "| DEC-0001 | First decision | Keep it | DONE |",
        "| DEC-0001 | Another decision | Apply it | TODO |",
      ]),
      "decisions",
    );
    expect(duplicate.errors).toContain("decisions declares DEC-0001 more than once");

    const legacy = parseRecordTable(
      table(["| DR-0001-0001 | Legacy record | Keep it | DONE |"]),
      "decisions",
    );
    expect(legacy.errors.some((error) => error.includes("invalid ID"))).toBe(true);
  });
});

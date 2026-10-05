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
      expect(triage).toContain("<paths.specsDir>/decisions.md");
      expect(triage).toContain("Use the next highest ID in the table plus one");
      expect(template).not.toContain("DR-NNNN");
    }
  });

  it("says how an ID two branches both took is renumbered", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      expect(triage, tree).toContain(
        "The merge target's item keeps the ID. Renumber the incoming item",
      );
      expect(triage, tree).toContain(
        "A renumbered BF or US takes its child IDs and its directory names with it",
      );
      expect(triage, tree).toContain("Change every citation of the old ID in the same commit");
      expect(triage, tree).toContain("the renamed record's subject or path in the commit message");
      expect(triage, tree).toContain(
        "A row the incoming branch added takes the next ID of its table",
      );
      expect(triage, tree).toContain(
        "ask the user for a change request row that states which record each citation meant",
      );
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

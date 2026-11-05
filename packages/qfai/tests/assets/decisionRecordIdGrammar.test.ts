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
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("decision row identity", () => {
  it("ships one three-column decision table with the project-wide DEC grammar", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const template = await readFile(path.join(repoRoot, tree, TEMPLATE), "utf-8");
      const triage = await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8");
      expect(template).toMatch(/^\| ID\s+\| Content \| Approach \|\r?$/m);
      expect(triage).toContain("<paths.specsDir>/decisions.md");
      expect(triage).toContain("A new decisions.md row takes `DEC-yyyymmddhhMMss`");
      expect(template).not.toContain("DR-NNNN");
      const page = await readFile(
        path.join(repoRoot, tree, TEMPLATE.replace("decisions.md", "decisions/page-NNNN.md")),
        "utf-8",
      );
      expect(page).toMatch(/^\| ID\s+\| Content \| Approach \|\r?$/m);
      expect(page).not.toContain("## Decision pages");
      expect(triage).toContain("Read pages in list order, followed by the root table");
      expect(triage).toContain("Append new rows only to the root table");
    }
  });

  it("says how a story-tree ID two branches both took is renumbered", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const triage = (await readFile(path.join(repoRoot, tree, TRIAGE), "utf-8")).replace(
        /\s+/g,
        " ",
      );
      expect(triage, tree).toContain(
        "The base's item keeps the ID, whichever way the merge runs. Renumber the incoming item",
      );
      expect(triage, tree).toContain(
        "A renumbered BF or US takes its child IDs and its directory names with it",
      );
      expect(triage, tree).toContain(
        "Change every citation belonging to the incoming item in the same commit",
      );
      expect(triage, tree).toContain("--base <local-ref>");
      expect(triage, tree).toContain("the renamed record's subject or path in the commit message");
      expect(triage, tree).toContain(
        "ask the user for a change request row that states which record each citation meant",
      );
    }
  });

  it("rejects duplicate and legacy-shaped IDs", () => {
    const duplicate = parseRecordTable(
      table([
        "| DEC-0001 | First decision | Keep it |",
        "| DEC-0001 | Another decision | Apply it |",
      ]),
      "decisions",
    );
    expect(duplicate.errors).toContain("decisions declares DEC-0001 more than once");

    const legacy = parseRecordTable(
      table(["| DR-0001-0001 | Legacy record | Keep it |"]),
      "decisions",
    );
    expect(legacy.errors.some((error) => error.includes("invalid ID"))).toBe(true);
  });
});

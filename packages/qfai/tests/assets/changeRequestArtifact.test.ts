import { describe, expect, it } from "vitest";

import { diffRecordTables } from "../../src/core/storyTree/tables.js";

function decisions(rows: string[]): string {
  return [
    "# Decisions",
    "",
    "## Decisions",
    "",
    "| ID | Content | Approach |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("appended rows in the decision table", () => {
  it("allows appending a decision but reports rewriting an existing decision", () => {
    const base = decisions(["| DEC-0001 | Existing decision | Keep it |"]);
    const appended = decisions([
      "| DEC-0001 | Existing decision | Keep it |",
      "| DEC-0002 | Recheck the commands of 03_contract/tech.md | Keep it |",
    ]);
    const rewritten = decisions([
      "| DEC-0001 | Rewritten decision | Keep it |",
      "| DEC-0002 | Recheck the commands of 03_contract/tech.md | Keep it |",
    ]);
    const clean = diffRecordTables(base, appended, "decisions");
    expect(clean.changed).toEqual([]);
    expect(clean.removed).toEqual([]);
    expect(clean.added.map(({ id }) => id)).toEqual(["DEC-0002"]);
    const drift = diffRecordTables(base, rewritten, "decisions");
    expect(drift.changed.map((change) => change.cell)).toContain("content");
  });
});

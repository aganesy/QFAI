import { describe, expect, it } from "vitest";

import {
  classifyRecordRow,
  diffRecordTables,
  parseRecordTable,
} from "../../src/core/storyTree/tables.js";

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

describe("change requests in the decision table", () => {
  it("reads a change request and a declined one by the opening of Content", () => {
    for (const [content, kind] of [
      ["Change request: 01_policy/objective.md", "change-request"],
      ["Declined change request: 01_policy/objective.md", "declined-change-request"],
    ] as const) {
      const parsed = parseRecordTable(
        decisions([`| DEC-0001 | ${content} | Approved by the owner |`]),
        "decisions",
      );
      expect(parsed.errors).toEqual([]);
      const row = parsed.rows[0];
      expect(row).toBeDefined();
      if (!row) continue;
      const classified = classifyRecordRow(row);
      expect(classified.kind).toBe(kind);
      expect(classified.refs).toEqual(["01_policy/objective.md"]);
    }
  });

  it("allows appending a request but reports rewriting an existing decision", () => {
    const base = decisions(["| DEC-0001 | Existing decision | Keep it |"]);
    const appended = decisions([
      "| DEC-0001 | Existing decision | Keep it |",
      "| DEC-0002 | Change request: 03_contract/tech.md | Recheck commands |",
    ]);
    const rewritten = decisions([
      "| DEC-0001 | Rewritten decision | Keep it |",
      "| DEC-0002 | Change request: 03_contract/tech.md | Recheck commands |",
    ]);
    const clean = diffRecordTables(base, appended, "decisions");
    expect(clean.changed).toEqual([]);
    expect(clean.removed).toEqual([]);
    expect(clean.added.map(({ id }) => id)).toEqual(["DEC-0002"]);
    const drift = diffRecordTables(base, rewritten, "decisions");
    expect(drift.changed.map((change) => change.cell)).toContain("content");
  });
});

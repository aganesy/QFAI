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
    "| ID | Content | Approach | Status |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

describe("change requests in the decision table", () => {
  it("authorizes a protected path only while the request row is WIP or DONE", () => {
    for (const [status, expected] of [
      ["TODO", false],
      ["WIP", true],
      ["DONE", true],
      ["REJECTED", false],
    ] as const) {
      const parsed = parseRecordTable(
        decisions([
          "| DEC-0001 | Change request: 01_policy/objective.md | Approved correction | " +
            status +
            " |",
        ]),
        "decisions",
      );
      expect(parsed.errors).toEqual([]);
      const row = parsed.rows[0];
      expect(row).toBeDefined();
      if (!row) continue;
      const classified = classifyRecordRow(row);
      expect(classified.kind).toBe("change-request");
      expect(classified.refs).toEqual(["01_policy/objective.md"]);
      expect(classified.inForce).toBe(expected);
    }
  });

  it("allows appending a request but rejects rewriting an existing decision", () => {
    const base = decisions(["| DEC-0001 | Existing decision | Keep it | DONE |"]);
    const appended = decisions([
      "| DEC-0001 | Existing decision | Keep it | DONE |",
      "| DEC-0002 | Change request: 03_contract/tech.md | Recheck commands | WIP |",
    ]);
    const rewritten = decisions([
      "| DEC-0001 | Rewritten decision | Keep it | DONE |",
      "| DEC-0002 | Change request: 03_contract/tech.md | Recheck commands | WIP |",
    ]);
    expect(diffRecordTables(base, appended, "decisions").onlyChangeRequestRows).toBe(true);
    const drift = diffRecordTables(base, rewritten, "decisions");
    expect(drift.rewritten.map((change) => change.cell)).toContain("content");
    expect(drift.onlyChangeRequestRows).toBe(false);
  });
});

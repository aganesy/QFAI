import { describe, expect, it } from "vitest";

import {
  hasLegacyMigrationNotes,
  hasMigrationBullets,
  parseDeltaV1,
} from "../../src/core/deltaV1.js";

describe("deltaV1 parser", () => {
  it("detects migration section and non-empty bullet list", () => {
    const parsed = parseDeltaV1(
      [
        "# Delta",
        "",
        "## Update History",
        "| Date | DL | Summary |",
        "| --- | --- | --- |",
        "| 2026-02-07 | DL-20260207-01 | sample |",
        "",
        "## Decision Log",
        "### DL-20260207-01",
        "#### Meta",
        "```yaml",
        "id: DL-20260207-01",
        "date: 2026-02-07",
        "primary: Initial",
        "tags: [@docs]",
        "compat: Change",
        "scope:",
        "  - specs",
        "notes: sample",
        "```",
        "",
        "#### Migration / Follow-ups",
        "- No migration required.",
        "",
        "#### Rejected",
        "- option: A",
        "  reason: test",
        "  do_not: test",
        "  temptation: test",
        "",
      ].join("\n"),
    );

    expect(parsed.entries).toHaveLength(1);
    const entry = parsed.entries[0];
    expect(entry?.migrationHeadingLine).not.toBeNull();
    expect(hasMigrationBullets(entry?.migrationBody ?? null)).toBe(true);
  });

  it("detects legacy migration notation under Notes", () => {
    const parsed = parseDeltaV1(
      [
        "# Delta",
        "",
        "## Update History",
        "| Date | DL | Summary |",
        "| --- | --- | --- |",
        "| 2026-02-07 | DL-20260207-01 | sample |",
        "",
        "## Decision Log",
        "### DL-20260207-01",
        "#### Meta",
        "```yaml",
        "id: DL-20260207-01",
        "date: 2026-02-07",
        "primary: Initial",
        "tags: [@docs]",
        "compat: Improvement",
        "scope:",
        "  - specs",
        "notes: sample",
        "```",
        "",
        "#### Notes",
        "- Migration / Follow-ups:",
        "  - legacy note",
        "",
        "#### Rejected",
        "- option: A",
        "  reason: test",
        "  do_not: test",
        "  temptation: test",
        "",
      ].join("\n"),
    );
    const entry = parsed.entries[0];
    expect(entry).toBeDefined();
    expect(hasLegacyMigrationNotes(entry?.notesBody ?? null)).toBe(true);
  });

  it("treats migration section without bullets as empty", () => {
    expect(hasMigrationBullets("just text")).toBe(false);
    expect(hasMigrationBullets("- ")).toBe(false);
  });
});

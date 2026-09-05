import { describe, expect, it } from "vitest";

import {
  hasLegacyMigrationNotes,
  hasMigrationBullets,
  isPlaceholderDeltaMeta,
  parseDeltaV1,
} from "../../src/core/deltaV1.js";

const FILLED_META = {
  id: "DL-0001",
  date: "2026-08-22",
  primary: "Initial",
  tags: ["@docs"],
  compat: "Improvement",
  scope: ["src/core/report.ts"],
  notes: "shipped the delta template the parser reads",
};

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

  it("recognises the numbered delta heading the templates ship", () => {
    // Every spec-pack file is titled `NN Title`, so the shipped delta files are
    // `# 09 Delta` / `# 18 Delta`. Requiring a bare `# Delta` made the parser
    // disagree with the convention its own templates teach (#545).
    for (const title of ["# 09 Delta", "# 18 Delta", "# Delta", "# 09 Delta (Migration Record)"]) {
      expect(parseDeltaV1(`${title}\n`).hasDeltaHeading, title).toBe(true);
    }
  });

  it("does not treat an unrelated H1 as a delta heading", () => {
    for (const title of ["# 09 Decisions", "# 10 Plan", "# 09"]) {
      expect(parseDeltaV1(`${title}\n`).hasDeltaHeading, title).toBe(false);
    }
  });

  it("tells an unfilled skeleton apart from a decision", () => {
    // The template ships real `primary` / `tags` / `compat` so the first copy
    // teaches the counted vocabulary; `date` / `scope` / `notes` are the only
    // evidence that somebody actually wrote something (#545).
    expect(isPlaceholderDeltaMeta(FILLED_META)).toBe(false);
    expect(isPlaceholderDeltaMeta({ ...FILLED_META, date: "YYYY-MM-DD" })).toBe(true);
    expect(isPlaceholderDeltaMeta({ ...FILLED_META, notes: "<one line of context>" })).toBe(true);
    expect(isPlaceholderDeltaMeta({ ...FILLED_META, notes: "" })).toBe(true);
    expect(
      isPlaceholderDeltaMeta({ ...FILLED_META, scope: ["<file / module this decision touches>"] }),
    ).toBe(true);
    // A scope that is only partly filled in is still somebody's work.
    expect(
      isPlaceholderDeltaMeta({ ...FILLED_META, scope: ["<placeholder>", "src/core/report.ts"] }),
    ).toBe(false);
    // An angle-bracketed value is a placeholder; a comparison is not.
    expect(isPlaceholderDeltaMeta({ ...FILLED_META, notes: "p95 < 200ms" })).toBe(false);
  });

  it("treats migration section without bullets as empty", () => {
    expect(hasMigrationBullets("just text")).toBe(false);
    expect(hasMigrationBullets("- ")).toBe(false);
  });

  it("extracts Verification.Plan items", () => {
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
        "#### Rejected",
        "- option: A",
        "  reason: test",
        "  do_not: test",
        "  temptation: test",
        "",
        "#### Verification",
        "",
        "### Plan",
        "- id: VFY-001",
        "  level: unit",
        "  target: sample",
        "  method: sample",
        "  owner: dev",
        "  expected: sample",
        "",
        "- id: VFY-002",
        "  level: manual",
        "  target: sample2",
        "  method: sample2",
        "  owner: reviewer",
        "  expected: sample2",
        "  links:",
        "    - issue:123",
        "",
      ].join("\n"),
    );

    const entry = parsed.entries[0];
    expect(entry).toBeDefined();
    expect(entry?.verificationHeadingLine).not.toBeNull();
    expect(entry?.verificationPlanHeadingLine).not.toBeNull();
    expect(entry?.verificationPlanItems).toHaveLength(2);
    expect(entry?.verificationPlanItems[0]?.id).toBe("VFY-001");
    expect(entry?.verificationPlanItems[1]?.links).toEqual(["issue:123"]);
  });
});

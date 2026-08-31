/**
 * QFAI-TABLE-001 — header/row arity is finally compared (#389).
 *
 * `parseAllMarkdownTables` builds `headers` and `rows` independently and never
 * compares them, and every consumer reads `row[headers.indexOf(name)] ?? ""`.
 * A short row therefore yields empty strings for its tail columns and a long
 * row silently discards the surplus — or shifts every column after the
 * offending pipe. Several `tddList` checks then `continue` on an empty value,
 * excusing the truncation for free.
 *
 * In the field, two index tables declared 4 columns against 21 six-cell rows.
 * `qfai validate` reported nothing at any severity; it was found by hand.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  findTableArityMismatches,
  validateMarkdownTableArity,
} from "../../src/core/validators/markdownTableArity.js";

/** The eight columns `collectLedgerTables` requires before it reads a table's rows. */
const LEDGER_HEADER =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |";
const LEDGER_SEPARATOR = "| --- | --- | --- | --- | --- | --- | --- | --- |";

/** The nine columns `specPackReport#parseLedgerRows` requires before it reads rows. */
const TRACE_LEDGER_HEADER =
  "| trace_id | obj_id | init_id | cap_id | flow_id | us_id | ac_id | ex_ids | tc_ids |";
const TRACE_LEDGER_SEPARATOR = "| --- | --- | --- | --- | --- | --- | --- | --- | --- |";
/** Eight cells under those nine columns: `tc_ids` reads as empty. */
const TRACE_LEDGER_SHORT_ROW =
  "| TR-0001 | OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | EX-0001 |";

const TRACE_LEDGER = [TRACE_LEDGER_HEADER, TRACE_LEDGER_SEPARATOR, TRACE_LEDGER_SHORT_ROW].join(
  "\n",
);
/** Seven cells under the eight ledger columns: `Evidence` reads as empty. */
const TDD_LEDGER = [
  LEDGER_HEADER,
  LEDGER_SEPARATOR,
  "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | done | - |",
].join("\n");

const tempDirs: string[] = [];

async function withSpec(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-table-arity-"));
  tempDirs.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf-8");
  }
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("findTableArityMismatches", () => {
  it("accepts a well-formed table", () => {
    const text = ["| A | B |", "| --- | --- |", "| 1 | 2 |", "| 3 | 4 |"].join("\n");

    expect(findTableArityMismatches(text)).toEqual([]);
  });

  it("reports a row with more cells than its header", () => {
    // The observed shape: a 4-column header over 6-cell rows.
    const text = [
      "| 親BR | TC | Level | 主題 |",
      "| --- | --- | --- | --- |",
      "| BR-0001-0020 | TC-0001-0039 | L3 | TC-0001-0040 | L3 | subject |",
    ].join("\n");

    const found = findTableArityMismatches(text);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      line: 3,
      headerCount: 4,
      rowCount: 6,
      tableLabel: "親BR",
    });
  });

  it("reports a row with fewer cells than its header", () => {
    const text = ["| A | B | C |", "| --- | --- | --- |", "| 1 | 2 |"].join("\n");

    expect(findTableArityMismatches(text)).toMatchObject([
      { line: 3, headerCount: 3, rowCount: 2 },
    ]);
  });

  it("reports every offending row, not just the first", () => {
    const text = ["| A | B |", "| --- | --- |", "| 1 | 2 | 3 |", "| 4 | 5 |", "| 6 | 7 | 8 |"].join(
      "\n",
    );

    expect(findTableArityMismatches(text).map((m) => m.line)).toEqual([3, 5]);
  });

  it("handles several tables in one file independently", () => {
    const text = [
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "| X | Y | Z |",
      "| --- | --- | --- |",
      "| 1 | 2 |",
    ].join("\n");

    expect(findTableArityMismatches(text)).toMatchObject([
      { line: 7, headerCount: 3, rowCount: 2, tableLabel: "X" },
    ]);
  });

  it("is not confused by prose containing pipes", () => {
    const text = [
      "Some prose with a | pipe in it.",
      "",
      "| A | B |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n");

    expect(findTableArityMismatches(text)).toEqual([]);
  });

  it("accepts an escaped pipe inside a cell", () => {
    // The remedy the finding recommends must itself be accepted.
    const text = ["| A | B |", "| --- | --- |", "| a \\| b | 2 |"].join("\n");

    expect(findTableArityMismatches(text)).toEqual([]);
  });
});

describe("validateMarkdownTableArity", () => {
  it("reports each mismatching row with its line", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/06_Test-Cases.md": [
        "# TC",
        "",
        "| TC-ID | Level | Notes |",
        "| ----- | ----- | ----- |",
        "| TC-0001 | unit | a | b |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-TABLE-001");
    expect(issues[0]?.file).toBe(".qfai/specs/spec-0001/06_Test-Cases.md");
    expect(issues[0]?.loc).toEqual({ line: 5 });
    // The message must say what the reader loses, not merely that counts differ.
    expect(issues[0]?.message).toContain("1 cell(s) are discarded");
  });

  // Severity is pinned here on purpose. It decides whether the finding can stop
  // a gate: every shipped invocation passes `--fail-on error`, and the config
  // default is `error`, so a `warning` is advisory-only by construction.
  it("emits `error` on the TDD ledger table, which validators read by column position", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        LEDGER_HEADER,
        LEDGER_SEPARATOR,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | done | - |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
  });

  it("emits `error` on every schema-complete ledger table, not only the first", async () => {
    // `collectLedgerTables` scores an appended `## CHG-…` table too, so a row
    // shifted there is read positionally exactly like one in the first table.
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        LEDGER_HEADER,
        LEDGER_SEPARATOR,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | done | - | RED/GREEN |",
        "",
        "## CHG-0001",
        "",
        LEDGER_HEADER,
        LEDGER_SEPARATOR,
        "| TDD-0002 | TC-0002 | Unit | tests/b.test.ts | b | todo | - |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.loc).toEqual({ line: 9 });
    expect(issues[0]?.severity).toBe("error");
  });

  it("keeps `warning` on a documentation table inside the TDD test list", async () => {
    // The shipped template's own `## Schema` table. Nothing resolves it by
    // column position, and `collectLedgerTables` drops it for want of the
    // ledger schema, so a stray pipe there must not stop a consumer's gate.
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        "## Ledger",
        "",
        LEDGER_HEADER,
        LEDGER_SEPARATOR,
        "",
        "## Schema",
        "",
        "| Column | Description |",
        "| ------ | ----------- |",
        "| Status | `todo` | `done` |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("keeps `warning` on a fenced example ledger table", async () => {
    // `validateTddList` and `collectLedgerTables` both read
    // `maskNonSpecRegions(content)`: a fenced sample is not the ledger.
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        "```markdown",
        LEDGER_HEADER,
        LEDGER_SEPARATOR,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | a | done | - |",
        "```",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("emits `error` on the traceability ledger in every layout's spelling", async () => {
    // Each spelling is scored against the reader that opens *it*:
    // `traceabilityIntegrity` opens `16_Traceability-ledger.md` and admits a
    // table with an `Implementation File` column, while a legacy entry's
    // `traceability-matrix.md` is only ever read by
    // `specPackReport#parseLedgerRows`, which requires the nine trace columns.
    const root = await withSpec({
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": [
        "| BR/AC | Implementation File | Test File |",
        "| ----- | ------------------- | --------- |",
        "| AC-0001 | src/a.ts |",
      ].join("\n"),
      ".qfai/specs/spec-0002/spec.md": "# spec-0002\n",
      ".qfai/specs/spec-0002/traceability-matrix.md": [
        TRACE_LEDGER_HEADER,
        TRACE_LEDGER_SEPARATOR,
        "| TR-0001 | OBJ-0001 | INIT-0001 | CAP-0001 | FLOW-0001 | US-0001 | AC-0001 | EX-0001 |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues.map((found) => found.severity)).toEqual(["error", "error"]);
  });

  it("keeps `warning` when no reader admits the traceability ledger's first table", async () => {
    // `traceabilityIntegrity` skips a first table without an
    // `Implementation File` column with a format-mismatch `warning`, and
    // `parseLedgerRows` returns no rows for want of the trace columns. Nothing
    // is resolved by position, so the arity of these rows cannot stop a gate.
    const root = await withSpec({
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": [
        "## How to read this ledger",
        "",
        "| Column | Rule |",
        "| ------ | ---- |",
        "| BR/AC | one ID | per row |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("keeps `warning` on a nine-column ledger the entry's layout sends no reader to", async () => {
    // Reader admission is not enough on its own — the reader has to open that
    // path for *this* entry. `validateSpecPacks` calls
    // `validateTraceabilityLedger` in its `layout === "spec-pack"` branch only,
    // and `specPackReport#parseLedgerRows` opens `entry.traceabilityLedgerPath`,
    // which `specLayout` puts at `traceability-matrix.md` for a layered entry.
    // A layered `16_Traceability-ledger.md` is therefore opened by
    // `traceabilityIntegrity` alone, and that reader skips a table with no
    // `Implementation File` column: these rows are position-read by nobody.
    const root = await withSpec({
      ".qfai/specs/spec-0001/01_Spec.md": "# spec-0001\n",
      ".qfai/specs/spec-0001/02_User-stories.md": "# User stories\n",
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": TRACE_LEDGER,
      // Pin: the ledger a layered entry's nine-column reader does open.
      ".qfai/specs/spec-0001/traceability-matrix.md": TRACE_LEDGER,
      // Pin: the same file name under the spec-pack layout, where
      // `traceabilityLedgerPath` points at it and the nine columns are read.
      ".qfai/specs/spec-0002/01_Spec.md": "# spec-0002\n",
      ".qfai/specs/spec-0002/02_Objective.md": "# Objective\n",
      ".qfai/specs/spec-0002/16_Traceability-ledger.md": TRACE_LEDGER,
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues.map((found) => [found.file, found.severity])).toEqual([
      [".qfai/specs/spec-0001/16_Traceability-ledger.md", "warning"],
      [".qfai/specs/spec-0001/traceability-matrix.md", "error"],
      [".qfai/specs/spec-0002/16_Traceability-ledger.md", "error"],
    ]);
  });

  // Skipped where the filesystem itself conflates the two names: on NTFS and
  // APFS `TDD/test-list.md` *is* `tdd/test-list.md`, the fixture cannot even be
  // written, and the mis-cased path is one a reader really opens.
  it.skipIf(process.platform === "win32" || process.platform === "darwin")(
    "keeps `warning` on a mis-cased ledger path where the filesystem is case-sensitive",
    async () => {
      // `validateTddList` opens exactly `path.join(entry.dir, "tdd",
      // "test-list.md")`. On a case-sensitive filesystem `TDD/test-list.md` is
      // a different file it never opens, so folding case into the path
      // comparison would stop a gate over rows nobody reads.
      const root = await withSpec({
        ".qfai/specs/spec-0001/TDD/test-list.md": TDD_LEDGER,
        ".qfai/specs/spec-0001/tdd/test-list.md": TDD_LEDGER,
      });

      const issues = await validateMarkdownTableArity(root, defaultConfig);

      expect(issues.map((found) => [found.file, found.severity])).toEqual([
        [".qfai/specs/spec-0001/TDD/test-list.md", "warning"],
        // Pin: the case-exact ledger is still read positionally.
        [".qfai/specs/spec-0001/tdd/test-list.md", "error"],
      ]);
    },
  );

  it("scores the traceability table the readers take, fence and all", async () => {
    // All three readers hand the *raw* content to `parseFirstMarkdownTable`,
    // so a fenced example ahead of the real ledger is what they position-read.
    // Masking here would score the table below it instead — the mismatch that
    // shifts a validator's columns would drop to `warning` and one nobody
    // reads would rise to `error`. (Should the readers ever mask, this branch
    // must follow them.)
    const root = await withSpec({
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": [
        "```markdown",
        "| BR/AC | Implementation File | Test File |",
        "| ----- | ------------------- | --------- |",
        "| AC-0001 | src/a.ts |",
        "```",
        "",
        "| BR/AC | Implementation File | Test File |",
        "| ----- | ------------------- | --------- |",
        "| AC-0002 | src/b.ts |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues.map((found) => [found.loc?.line, found.severity])).toEqual([
      [4, "error"],
      [9, "warning"],
    ]);
  });

  it("keeps `warning` on an evacuated ledger copy no reader opens", async () => {
    // `validateTddList` opens exactly `<specDir>/tdd/test-list.md`; the arity
    // validator walks `specsDir/**/*.md`, so a nested copy shares the suffix
    // while its rows are read by nobody. A look-alike name beside the real
    // ledger is out for the same reason.
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": TDD_LEDGER,
      ".qfai/specs/spec-0001/archive/tdd/test-list.md": TDD_LEDGER,
      ".qfai/specs/spec-0001/tdd/test-list-archive.md": TDD_LEDGER,
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues.map((found) => [found.file, found.severity])).toEqual([
      [".qfai/specs/spec-0001/archive/tdd/test-list.md", "warning"],
      [".qfai/specs/spec-0001/tdd/test-list-archive.md", "warning"],
      [".qfai/specs/spec-0001/tdd/test-list.md", "error"],
    ]);
  });

  it("keeps `warning` on a later table in the traceability ledger", async () => {
    // Only the first table is the ledger — the template says any further table
    // in that file is prose, and both readers take it with
    // `parseFirstMarkdownTable`.
    const root = await withSpec({
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": [
        "| BR/AC | Implementation File | Test File |",
        "| ----- | ------------------- | --------- |",
        "| AC-0001 | src/a.ts | tests/a.test.ts |",
        "",
        "### Column rules",
        "",
        "| Column | Rule |",
        "| ------ | ---- |",
        "| BR/AC | one ID | per row |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.loc).toEqual({ line: 9 });
    expect(issues[0]?.severity).toBe("warning");
  });

  it("keeps `warning` on a spec-pack table no validator indexes positionally", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/06_Test-Cases.md": [
        "| TC-ID | Level | Notes |",
        "| ----- | ----- | ----- |",
        "| TC-0001 | unit |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
  });

  it("says the trailing columns read as empty when the row is short", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        "| TDD-ID | TC-Refs | Status |",
        "| ------ | ------- | ------ |",
        "| TDD-0001 | TC-0001 |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues[0]?.message).toContain("the trailing 1 column(s) read as empty");
  });

  it("stays quiet on a clean spec pack", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/06_Test-Cases.md": [
        "| TC-ID | Level |",
        "| ----- | ----- |",
        "| TC-0001 | unit |",
      ].join("\n"),
    });

    await expect(validateMarkdownTableArity(root, defaultConfig)).resolves.toEqual([]);
  });

  it("stays quiet when there is no spec directory", async () => {
    const root = await withSpec({});

    await expect(validateMarkdownTableArity(root, defaultConfig)).resolves.toEqual([]);
  });
});

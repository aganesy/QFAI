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
  isPositionallyReadTable,
  validateMarkdownTableArity,
} from "../../src/core/validators/markdownTableArity.js";

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

describe("isPositionallyReadTable", () => {
  it("matches the ledger paths of every spec layout, case-insensitively", () => {
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/tdd/test-list.md")).toBe(true);
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/16_Traceability-ledger.md")).toBe(true);
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/traceability-matrix.md")).toBe(true);
    expect(isPositionallyReadTable(".qfai\\specs\\spec-0001\\tdd\\test-list.md")).toBe(true);
  });

  it("does not match a look-alike name outside the ledger set", () => {
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/test-list.md")).toBe(false);
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/06_Test-Cases.md")).toBe(false);
    expect(isPositionallyReadTable(".qfai/specs/spec-0001/tdd/test-list-archive.md")).toBe(false);
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
  it("emits `error` on the TDD test list, which validators read by column position", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/tdd/test-list.md": [
        "| TDD-ID | TC-Refs | Status |",
        "| ------ | ------- | ------ |",
        "| TDD-0001 | TC-0001 |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("error");
  });

  it("emits `error` on the traceability ledger in every layout's spelling", async () => {
    const root = await withSpec({
      ".qfai/specs/spec-0001/16_Traceability-ledger.md": [
        "| REQ | Spec | Code |",
        "| --- | ---- | ---- |",
        "| REQ-0001 | 01_Spec.md |",
      ].join("\n"),
      ".qfai/specs/spec-0002/traceability-matrix.md": [
        "| REQ | Spec | Code |",
        "| --- | ---- | ---- |",
        "| REQ-0002 | spec.md |",
      ].join("\n"),
    });

    const issues = await validateMarkdownTableArity(root, defaultConfig);

    expect(issues.map((found) => found.severity)).toEqual(["error", "error"]);
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

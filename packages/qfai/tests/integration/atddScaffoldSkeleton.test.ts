/**
 * Integration test for the ATDD scaffold subcommand — per-TC skeleton
 * emission with TODO placeholder, US/AC/TC reference comments, and
 * idempotency on a per-file basis.
 *
 * This test exercises the production functions directly against a
 * deterministic temp-dir fixture (mkdtemp + afterEach rm). The fixture
 * seeds a minimal spec directory with a `06_Test-Cases.md` carrying
 * two TC entries; the test asserts the emitted skeleton files contain
 * the expected annotations, framework import, TODO marker, and US/AC
 * back-references.
 */
// QFAI:SPEC-0008:TC-0008-0013

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";

let root: string;

async function writeSeedSpec(specDir: string): Promise<void> {
  await mkdir(specDir, { recursive: true });
  // Minimal TC catalogue with two entries (one normal, one error).
  const testCases = [
    "# 06 Test Cases",
    "",
    "## TC-0001-0001: First case",
    "",
    "- EX-Ref: EX-0001-0001",
    "- AC-Refs: AC-0001-0001",
    "- Verify normal path behavior.",
    "",
    "## TC-0001-0002: Second case",
    "",
    "- EX-Ref: EX-0001-0002",
    "- AC-Refs: AC-0001-0002",
    "- Type: error",
    "- Verify error path behavior.",
    "",
  ].join("\n");
  await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-atdd-scaffold-skel-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("atdd scaffold — per-TC skeleton emission", () => {
  it("TC-0008-0013 — emits one skeleton file per TC with framework import, TODO marker, and per-TC annotation (normal)", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await writeSeedSpec(specDir);

    const messages: string[] = [];
    const errors: string[] = [];
    const code = await runAtddScaffold({
      root,
      specId,
      write: (m) => messages.push(m),
      writeErr: (m) => errors.push(m),
    });

    expect(code).toBe(0);
    expect(errors).toEqual([]);

    const outDir = path.join(root, "tests", "atdd", specId);
    const file1 = path.join(outDir, "TC-0001-0001.test.ts");
    const file2 = path.join(outDir, "TC-0001-0002.test.ts");

    const body1 = await readFile(file1, "utf-8");
    const body2 = await readFile(file2, "utf-8");

    // Framework import present (e.g. vitest).
    expect(body1).toMatch(/from\s+"vitest"/);
    expect(body2).toMatch(/from\s+"vitest"/);

    // Per-TC annotation header (QFAI:SPEC-XXXX:TC-YYYY-YYYY).
    expect(body1).toContain("QFAI:SPEC-0001:TC-0001-0001");
    expect(body2).toContain("QFAI:SPEC-0001:TC-0001-0002");

    // TODO marker carrying the TC id.
    expect(body1).toContain("// TODO: implement assertion for TC-0001-0001");
    expect(body2).toContain("// TODO: implement assertion for TC-0001-0002");

    // Reference comments to related AC / EX entries (parsed from
    // 06_Test-Cases.md and surfaced in the skeleton).
    expect(body1).toContain("AC-0001-0001");
    expect(body1).toContain("EX-0001-0001");
    expect(body2).toContain("AC-0001-0002");
    expect(body2).toContain("EX-0001-0002");

    // Skeleton placeholder marker — used by escalation detection to
    // tell "still placeholder" from "real test landed".
    expect(body1).toContain("QFAI-SCAFFOLD-PLACEHOLDER");
  });

  it("TC-0008-0013 — re-running scaffold is idempotent: no rewrite when a real assertion has replaced the placeholder", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await writeSeedSpec(specDir);

    // First run: emits skeletons.
    const code1 = await runAtddScaffold({ root, specId, write: () => {}, writeErr: () => {} });
    expect(code1).toBe(0);

    const filledPath = path.join(root, "tests", "atdd", specId, "TC-0001-0001.test.ts");
    const filledBody = [
      "import { describe, it, expect } from \"vitest\";",
      "",
      "// QFAI:SPEC-0001:TC-0001-0001",
      "describe(\"TC-0001-0001\", () => {",
      "  it(\"asserts real behavior\", () => {",
      "    expect(1 + 1).toBe(2);",
      "  });",
      "});",
      "",
    ].join("\n");
    await writeFile(filledPath, filledBody, "utf-8");
    const filledMtimeBefore = (await stat(filledPath)).mtimeMs;

    // Second run: should NOT overwrite the filled file.
    const code2 = await runAtddScaffold({ root, specId, write: () => {}, writeErr: () => {} });
    expect(code2).toBe(0);

    const filledAfter = await readFile(filledPath, "utf-8");
    expect(filledAfter).toBe(filledBody);

    const filledMtimeAfter = (await stat(filledPath)).mtimeMs;
    expect(filledMtimeAfter).toBe(filledMtimeBefore);

    // The other skeleton (still placeholder) is also left as-is.
    const otherPath = path.join(root, "tests", "atdd", specId, "TC-0001-0002.test.ts");
    const otherBody = await readFile(otherPath, "utf-8");
    expect(otherBody).toContain("QFAI-SCAFFOLD-PLACEHOLDER");
  });

  // Regression: many in-tree specs use `## TC-NNNN-NNNN` heading shape
  // WITHOUT a `:title` suffix. The pre-fix parser required the colon
  // and dropped every such entry, leaving `qfai atdd scaffold` to emit
  // zero skeletons.
  it("emits skeletons for `## TC-NNNN-NNNN` headings WITHOUT a trailing :title", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await mkdir(specDir, { recursive: true });
    const tcCatalogue = [
      "# 06 Test Cases",
      "",
      "## TC-0001-0050",
      "",
      "- AC-Refs: AC-0001-0050",
      "- EX-Ref: EX-0001-0050",
      "- Verify the title-less heading parses.",
      "",
      "## TC-0001-0051",
      "",
      "- Type: error",
      "- AC-Refs: AC-0001-0051",
      "",
    ].join("\n");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), tcCatalogue, "utf-8");

    const messages: string[] = [];
    const errors: string[] = [];
    const code = await runAtddScaffold({
      root,
      specId,
      write: (m) => messages.push(m),
      writeErr: (m) => errors.push(m),
    });
    expect(code).toBe(0);
    expect(errors).toEqual([]);

    const outDir = path.join(root, "tests", "atdd", specId);
    const body50 = await readFile(path.join(outDir, "TC-0001-0050.test.ts"), "utf-8");
    const body51 = await readFile(path.join(outDir, "TC-0001-0051.test.ts"), "utf-8");

    expect(body50).toContain("QFAI:SPEC-0001:TC-0001-0050");
    expect(body50).toContain("AC-0001-0050");
    expect(body50).toContain("EX-0001-0050");
    expect(body50).toContain("QFAI-SCAFFOLD-PLACEHOLDER");

    expect(body51).toContain("QFAI:SPEC-0001:TC-0001-0051");
    expect(body51).toContain("AC-0001-0051");
    expect(body51).toContain("Type: error");
  });

  // Regression: spec-0004 / spec-0014 use a markdown TABLE form for
  // their Test-Cases catalogue (`| TC-NNNN-NNNN | layer | AC-Refs |
  // EX-Ref | ...`). The pre-fix parser ignored the table form
  // entirely, so scaffold emitted zero skeletons for those specs.
  it("emits skeletons for table-form Test-Cases catalogues", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await mkdir(specDir, { recursive: true });
    const tcCatalogue = [
      "# 06 Test Cases",
      "",
      "| TC-ID        | Level       | AC-Refs      | EX-Ref       | Notes      |",
      "| ------------ | ----------- | ------------ | ------------ | ---------- |",
      "| TC-0001-0100 | integration | AC-0001-0100 | EX-0001-0100 | first row  |",
      "| TC-0001-0101 | validators  | AC-0001-0101 | EX-0001-0101 | second row |",
      "",
    ].join("\n");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), tcCatalogue, "utf-8");

    const errors: string[] = [];
    const code = await runAtddScaffold({
      root,
      specId,
      write: () => {},
      writeErr: (m) => errors.push(m),
    });
    expect(code).toBe(0);
    expect(errors).toEqual([]);

    const outDir = path.join(root, "tests", "atdd", specId);
    const body100 = await readFile(path.join(outDir, "TC-0001-0100.test.ts"), "utf-8");
    const body101 = await readFile(path.join(outDir, "TC-0001-0101.test.ts"), "utf-8");

    expect(body100).toContain("QFAI:SPEC-0001:TC-0001-0100");
    expect(body100).toContain("AC-0001-0100");
    expect(body100).toContain("EX-0001-0100");
    // The layer column lands in `entry.type` and surfaces as the
    // `// Type: integration` annotation in the skeleton body.
    expect(body100).toContain("Type: integration");

    expect(body101).toContain("QFAI:SPEC-0001:TC-0001-0101");
    expect(body101).toContain("AC-0001-0101");
    expect(body101).toContain("EX-0001-0101");
    expect(body101).toContain("Type: validators");
  });

  // Symmetry regression: the table-form layer cell is stored as-is
  // (lowercased + trimmed) without a closed allow-list. Pre-fix, the
  // parser restricted the layer cell to `unit|integration|validators|
  // e2e|ssot-guard` and silently dropped any cell outside that set —
  // while the heading-form `- Type: <value>` branch stored the raw
  // value with no allow-list. The asymmetry made `entry.type`
  // unreliable as a classification key. After the fix, BOTH paths
  // store the value as-is so downstream code sees consistent
  // behavior; the value is opaque to the parser.
  it("preserves arbitrary table-form layer cells (no closed allow-list)", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await mkdir(specDir, { recursive: true });
    const tcCatalogue = [
      "# 06 Test Cases",
      "",
      "| TC-ID        | Level              | AC-Refs      | EX-Ref       |",
      "| ------------ | ------------------ | ------------ | ------------ |",
      "| TC-0001-0300 | contract           | AC-0001-0300 | EX-0001-0300 |",
      "| TC-0001-0301 | property-based     | AC-0001-0301 | EX-0001-0301 |",
      "",
    ].join("\n");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), tcCatalogue, "utf-8");

    const errors: string[] = [];
    const code = await runAtddScaffold({
      root,
      specId,
      write: () => {},
      writeErr: (m) => errors.push(m),
    });
    expect(code).toBe(0);
    expect(errors).toEqual([]);

    const outDir = path.join(root, "tests", "atdd", specId);
    const body300 = await readFile(path.join(outDir, "TC-0001-0300.test.ts"), "utf-8");
    const body301 = await readFile(path.join(outDir, "TC-0001-0301.test.ts"), "utf-8");

    // Non-allow-list table-form layer cells now flow through as
    // `entry.type` and surface in the skeleton annotation.
    expect(body300).toContain("Type: contract");
    expect(body301).toContain("Type: property-based");
  });

  // Mixed-form spec: heading-form entry takes precedence over a
  // duplicate table row for the same TC id. Ensures the dedup rule
  // does not double-emit OR overwrite heading-derived meta.
  it("prefers heading-form parse when a TC id appears in BOTH forms", async () => {
    const specId = "spec-0001";
    const specDir = path.join(root, ".qfai", "specs", specId);
    await mkdir(specDir, { recursive: true });
    const tcCatalogue = [
      "# 06 Test Cases",
      "",
      "## TC-0001-0200: Heading-form first",
      "",
      "- Type: error",
      "- AC-Refs: AC-0001-0200",
      "",
      "| TC-ID        | Level       | AC-Refs      | EX-Ref       |",
      "| ------------ | ----------- | ------------ | ------------ |",
      "| TC-0001-0200 | integration | AC-0001-9999 | EX-0001-9999 |",
      "",
    ].join("\n");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), tcCatalogue, "utf-8");

    const code = await runAtddScaffold({
      root,
      specId,
      write: () => {},
      writeErr: () => {},
    });
    expect(code).toBe(0);

    const outDir = path.join(root, "tests", "atdd", specId);
    const body = await readFile(path.join(outDir, "TC-0001-0200.test.ts"), "utf-8");

    // Heading-form values WIN — table-form AC-/EX- refs and the
    // table-form `integration` layer are dropped on the duplicate.
    expect(body).toContain("AC-0001-0200");
    expect(body).toContain("Type: error");
    expect(body).not.toContain("AC-0001-9999");
    expect(body).not.toContain("EX-0001-9999");
    expect(body).not.toContain("Type: integration");
  });
});

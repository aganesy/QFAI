import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const TC_TABLE = [
  "# 06 Test Cases",
  "",
  "| TC-ID   | Level | AC-Refs | EX-Ref  | Steps  | Expected   | Notes  |",
  "| ------- | ----- | ------- | ------- | ------ | ---------- | ------ |",
  "| TC-0001 | L3    | AC-0001 | EX-0001 | step-1 | expected-1 | note-1 |",
  "",
].join("\n");

/** Runs the coverage gate over one integration test file with this body. */
async function codesFor(body: string): Promise<string[]> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-annotation-placement-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# 02 US\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TC_TABLE, "utf-8");

    const testDir = path.join(root, "tests", "integration");
    await mkdir(testDir, { recursive: true });
    await writeFile(path.join(testDir, "a.test.ts"), body, "utf-8");

    const issues = await validateAtddCodeTraceability(root, defaultConfig);
    return issues.map((entry) => entry.code);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("where an annotation may sit", () => {
  // The name is where the id is also visible in the runner's output, so it is
  // what people copy when they add a test. Reading only comments reported the
  // obligation as unreferenced while pointing at a directory that held a
  // passing test naming that exact id.
  it.each([
    ["a double-quoted name", 'it("QFAI:SPEC-0001:TC-0001 does the thing", () => {});'],
    ["a single-quoted name", "it('QFAI:SPEC-0001:TC-0001 does the thing', () => {});"],
    ["a template name", "it(`QFAI:SPEC-0001:TC-0001 does ${what} thing`, () => {});"],
    ["a describe name", 'describe("QFAI:SPEC-0001:TC-0001 the thing", () => {});'],
    ["a name behind a modifier", 'it.each(rows)("QFAI:SPEC-0001:TC-0001 %s", () => {});'],
    ["a leading comment", '/* QFAI:SPEC-0001:TC-0001 */\nit("does the thing", () => {});'],
  ])("counts an annotation written as %s", async (_placement, body) => {
    expect(await codesFor(body)).not.toContain("QFAI-ATDD-112");
  });

  it("does not count an id a file holds as data", async () => {
    // The reason the scan reads comments and not literals: a ledger quoting the
    // ids it is about would otherwise mark every one of them covered. A name is
    // exempt from that because it is the first argument of a declaration, which
    // is a position data never occupies.
    const body = [
      'const blessed: Record<string, string> = { "QFAI:SPEC-0001:TC-0001": "sha256-abc" };',
      'it("does the thing", () => {});',
    ].join("\n");

    expect(await codesFor(body)).toContain("QFAI-ATDD-112");
  });

  it("does not count a test declaration quoted inside a fixture", async () => {
    // A fixture that writes a test file as a template literal holds the same
    // characters as a real declaration. Reading those would restore the hazard
    // above by the back door, so a declaration counts only where the runner
    // name survives masking — that is, where it is code rather than quoted.
    const body = [
      "const fixture = `",
      '  it("QFAI:SPEC-0001:TC-0001 written by the generator", () => {});',
      "`;",
      'it("does the thing", () => { use(fixture); });',
    ].join("\n");

    expect(await codesFor(body)).toContain("QFAI-ATDD-112");
  });
});

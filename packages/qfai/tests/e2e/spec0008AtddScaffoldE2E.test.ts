/**
 * E2E: spec-0008 US-0008-0007 — `qfai atdd scaffold --spec spec-NNNN` writes one
 * skeleton per test case, leaves a filled one alone, and the placeholder finding
 * it creates escalates from warning to error once the operator has run validate
 * the threshold number of times without filling it in.
 *
 * The suite drives the production entry points over a temporary project. The
 * scaffold writes test files and the escalation counters live in the project's
 * own `.qfai/state.json`, so a run against this repository would edit the tree
 * it is meant to be observing.
 */
// QFAI:SPEC-0008:US-0008-0007

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateScaffoldPlaceholder } from "../../src/core/validators/scaffoldPlaceholder.js";

const SPEC_ID = "spec-0008";

/** A catalogue of two test cases, each carrying the references the skeleton echoes. */
const TEST_CASES = [
  "# 06 Test Cases",
  "",
  "## TC-0008-0013: Bulk skeleton emission",
  "",
  "- EX-Ref: EX-0008-0009",
  "- AC-Refs: AC-0008-0010",
  "- US-Refs: US-0008-0007",
  "- CON-API-Refs: CON-API-0008-0001",
  "- Verify normal path behavior.",
  "",
  "## TC-0008-0014: Re-run leaves a filled skeleton alone",
  "",
  "- EX-Ref: EX-0008-0010",
  "- AC-Refs: AC-0008-0011",
  "- US-Refs: US-0008-0007",
  "- Type: error",
  "- Verify the idempotency boundary.",
  "",
].join("\n");

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

/** A project holding nothing but the spec the scaffold reads. */
async function seededProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0008-scaffold-"));
  roots.push(root);
  const specDir = path.join(root, ".qfai", "specs", SPEC_ID);
  await mkdir(specDir, { recursive: true });
  await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
  return root;
}

function scaffoldDir(root: string): string {
  return path.join(root, "tests", "integration", SPEC_ID);
}

async function scaffold(root: string): Promise<{ code: number; errors: string[] }> {
  const errors: string[] = [];
  const code = await runAtddScaffold({
    root,
    specId: SPEC_ID,
    write: () => {},
    writeErr: (message) => errors.push(message),
  });
  return { code, errors };
}

describe("spec-0008 atdd scaffold", () => {
  it("QFAI:SPEC-0008:US-0008-0007 — writes one skeleton per test case, carrying the runner's primitives, a TODO marker and the case's references (normal)", async () => {
    const root = await seededProject();

    const { code, errors } = await scaffold(root);

    expect(code).toBe(0);
    expect(errors).toEqual([]);
    expect((await readdir(scaffoldDir(root))).sort()).toEqual([
      "TC-0008-0013.test.ts",
      "TC-0008-0014.test.ts",
    ]);

    const first = await readFile(path.join(scaffoldDir(root), "TC-0008-0013.test.ts"), "utf-8");
    expect(first).toContain("// QFAI:SPEC-0008:TC-0008-0013");
    expect(first).toContain('import { describe, it } from "vitest";');
    expect(first).toContain("// TODO: implement assertion for TC-0008-0013");
    expect(first).toContain("// AC refs: AC-0008-0010");
    expect(first).toContain("// US refs: US-0008-0007");
    expect(first).toContain("// CON-API refs: CON-API-0008-0001");

    // The second case declares no API contract, so the skeleton carries no
    // reference line for one. An empty `// CON-API refs:` would read as a
    // contract nobody named.
    const second = await readFile(path.join(scaffoldDir(root), "TC-0008-0014.test.ts"), "utf-8");
    expect(second).toContain("// QFAI:SPEC-0008:TC-0008-0014");
    expect(second).toContain("// Type: error");
    expect(second).not.toContain("CON-API refs");
  });

  it("QFAI:SPEC-0008:US-0008-0007 — a re-run leaves a filled skeleton as the operator wrote it, and the one still holding its placeholder escalates from warning to error at the threshold validate cycle (error/boundary/state)", async () => {
    const root = await seededProject();
    await scaffold(root);

    const filledPath = path.join(scaffoldDir(root), "TC-0008-0013.test.ts");
    const filled = [
      "// QFAI:SPEC-0008:TC-0008-0013",
      'import { describe, it, expect } from "vitest";',
      "",
      'describe("TC-0008-0013", () => {',
      '  it("emits a skeleton per test case", () => {',
      "    expect(1 + 1).toBe(2);",
      "  });",
      "});",
      "",
    ].join("\n");
    await writeFile(filledPath, filled, "utf-8");

    const { code } = await scaffold(root);

    expect(code).toBe(0);
    expect(await readFile(filledPath, "utf-8")).toBe(filled);

    // The threshold counts `qfai validate` cycles, and the placeholder is
    // reported at every one of them. What moves is the severity: a warning
    // while the operator still has room, an error once the default three are
    // spent. The second file is the one that never got its assertion.
    const severities: string[] = [];
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const issues = await validateScaffoldPlaceholder(root, defaultConfig);
      const placeholder = issues.filter((issue) => issue.code === "D-SCAFFOLD-PLACEHOLDER");
      expect(placeholder).toHaveLength(1);
      expect(placeholder[0]?.file).toContain("TC-0008-0014");
      severities.push(String(placeholder[0]?.severity));
    }

    expect(severities).toEqual(["warning", "warning", "error"]);
  });
});

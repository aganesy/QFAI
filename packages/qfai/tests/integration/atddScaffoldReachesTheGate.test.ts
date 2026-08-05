/**
 * The only command that PRODUCES ATDD tests wrote them where the gate that
 * CONSUMES them does not look.
 *
 * `qfai atdd scaffold` emitted `<testsDir>/atdd/<specId>/<TC-ID>.test.ts`, each
 * with a correct `QFAI:SPEC-XXXX:TC-YYYY` annotation. `QFAI-ATDD-112` — the
 * `error`-severity gate — scans exactly `{e2e,api,integration}`, and
 * `resolveTestKind` returned `null` for anything else, which the scanner
 * discarded with a bare `continue`.
 *
 * So the documented happy path (scaffold → fill in the assertions → validate)
 * reported 100% of the spec's `TC-*` as uncovered, with no diagnostic saying
 * why — while `validateScaffoldPlaceholder` simultaneously nagged about the
 * same files.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { scaffoldDestPath } from "../../src/core/atdd/scaffold.js";
import { evaluateAtddCodeTraceability } from "../../src/core/atddTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const TC_TABLE = `# 06 Test Cases

## Test Case Table

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |
| ----- | ----- | ------- | ------ | ----- | -------- |
| TC-0001 | L3 | AC-0001 | EX-0001 | step | expected |
`;

// `Level` has to be one that owes an ATDD annotation. The fixture used to
// declare `unit`, which now carries no `QFAI-ATDD-112` obligation at all, so
// both coverage assertions below would have passed without proving anything.

async function withProject<T>(
  testFiles: Record<string, string>,
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-scaffoldgate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", TC_TABLE],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    for (const [rel, body] of Object.entries(testFiles)) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the scaffold writes where the gate looks", () => {
  it("targets a scanned layer directory, not `atdd/`", () => {
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001", "tests");
    expect(dest.replace(/\\/g, "/")).toContain("/tests/integration/spec-0001/TC-0001.test.ts");
    expect(dest.replace(/\\/g, "/")).not.toContain("/tests/atdd/");
  });

  it("honours a configured testsDir while staying inside a scanned layer", () => {
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001", "spec-tests");
    expect(dest.replace(/\\/g, "/")).toContain("/spec-tests/integration/spec-0001/");
  });

  it("closes QFAI-ATDD-112 once the skeleton is filled in", async () => {
    // The end-to-end claim: the documented happy path now produces coverage.
    await withProject(
      { "tests/integration/spec-0001/TC-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-ATDD-112");
      },
    );
  });

  it("would still miss the old location, which is why the writer moved", async () => {
    await withProject(
      { "tests/atdd/spec-0001/TC-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((i) => i.code)).toContain("QFAI-ATDD-112");
      },
    );
  });
});

describe("QFAI-ATDD-105 — a silently dropped test file is now visible", () => {
  it("names a test outside the scanned roots instead of discarding it", async () => {
    await withProject(
      { "tests/atdd/spec-0001/TC-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const skipped = issues.find((i) => i.code === "QFAI-ATDD-105");
        // `info`: the file is not wrong, it is merely uncounted — the error is
        // already reported as missing coverage by QFAI-ATDD-112.
        expect(skipped?.severity).toBe("info");
        expect(skipped?.refs?.[0]).toContain("tests/atdd/spec-0001/TC-0001.test.ts");
      },
    );
  });

  it("stays silent when every test file sits in a scanned root", async () => {
    await withProject(
      { "tests/integration/spec-0001/TC-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
      async (root) => {
        const result = await evaluateAtddCodeTraceability(root, defaultConfig);
        expect(result.skippedTestFiles).toEqual([]);
      },
    );
  });
});

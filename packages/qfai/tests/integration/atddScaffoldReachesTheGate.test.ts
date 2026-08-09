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
  testCases: string = TC_TABLE,
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
      ["06_Test-Cases.md", testCases],
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

  describe("and does not send an L1/L2 annotation anywhere", () => {
    // The finding's remediation is "move it into integration / api / e2e".
    // For a legacy file carrying only Unit/Component annotations that advice is
    // wrong twice: the TC owes no ATDD annotation at all, so the move counts
    // towards nothing, and `catalog/test-layers.md` says outright that an L1/L2
    // annotation is neither required nor misplaced wherever it lands. Following
    // it walks the project back into the all-integration collapse the exclusion
    // was written to undo.
    const LEVELS = (rows: string[]): string =>
      [
        "# 06 Test Cases",
        "",
        "## Test Case Table",
        "",
        "| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |",
        "| ----- | ----- | ------- | ------ | ----- | -------- |",
        ...rows,
        "",
      ].join("\n");

    it("says nothing about a legacy file whose annotations are all L1/L2", async () => {
      await withProject(
        { "tests/atdd/spec-0001/TC-0001.test.ts": "// QFAI:SPEC-0001:TC-0001\n" },
        async (root) => {
          const result = await evaluateAtddCodeTraceability(root, defaultConfig);
          expect(result.skippedTestFiles).toEqual([]);
        },
        LEVELS(["| TC-0001 | L1 | AC-0001 | EX-0001 | step | expected |"]),
      );
    });

    it("still names a file that carries one owed annotation alongside them", async () => {
      // Conservative: one annotation ATDD still owns is enough to make the
      // move the right advice for the file.
      await withProject(
        {
          "tests/atdd/spec-0001/mixed.test.ts":
            "// QFAI:SPEC-0001:TC-0001\n// QFAI:SPEC-0001:TC-0002\n",
        },
        async (root) => {
          const result = await evaluateAtddCodeTraceability(root, defaultConfig);
          expect(result.skippedTestFiles).toHaveLength(1);
        },
        LEVELS([
          "| TC-0001 | L1 | AC-0001 | EX-0001 | step | expected |",
          "| TC-0002 | L3 | AC-0001 | EX-0001 | step | expected |",
        ]),
      );
    });

    it.each([
      ["a US annotation", "// QFAI:SPEC-0001:US-0001\n"],
      ["a CON-API annotation", "// QFAI:CON-API-0001\n"],
      ["a CON-DB annotation", "// QFAI:CON-DB-0001\n"],
    ])("still names a legacy file carrying %s", async (_name, body) => {
      // `US-*` and `CON-*` obligations are fixed by ID type, so no `Level`
      // can excuse them from a scanned directory.
      await withProject(
        { "tests/atdd/spec-0001/other.test.ts": body },
        async (root) => {
          const result = await evaluateAtddCodeTraceability(root, defaultConfig);
          expect(result.skippedTestFiles).toHaveLength(1);
        },
        LEVELS(["| TC-0001 | L1 | AC-0001 | EX-0001 | step | expected |"]),
      );
    });

    it("still names a file whose TC declares no Level", async () => {
      // An absent `Level` routes to `tests/integration/**` — it is not "no
      // obligation", so the file is genuinely in the wrong place.
      await withProject(
        { "tests/atdd/spec-0001/TC-0002.test.ts": "// QFAI:SPEC-0001:TC-0002\n" },
        async (root) => {
          const result = await evaluateAtddCodeTraceability(root, defaultConfig);
          expect(result.skippedTestFiles).toHaveLength(1);
        },
        LEVELS([
          "| TC-0001 | L1 | AC-0001 | EX-0001 | step | expected |",
          "| TC-0002 |  | AC-0001 | EX-0001 | step | expected |",
        ]),
      );
    });
  });
});

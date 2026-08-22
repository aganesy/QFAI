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

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig, loadConfig } from "../../src/core/config.js";
import { runAtddScaffold } from "../../src/cli/commands/atddScaffold.js";
import { scaffoldDestPath } from "../../src/core/atdd/scaffold.js";
import {
  resolveScaffoldDialect,
  type ScaffoldDialect,
} from "../../src/core/atdd/scaffoldDialect.js";
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

/**
 * Same failure as above, on the extension axis instead of the directory one.
 *
 * The writer emitted `<TC-ID>.test.ts` on every stack, while the gate derives
 * the extensions it opens from `validation.traceability.testFileGlobs`. On a
 * Python project the scaffold's own output sat inside `tests/integration/**`
 * with an extension the scan never reads: uncovered before fill-in, uncovered
 * after it, and not even reported as uncounted — `QFAI-ATDD-105` names files
 * OUTSIDE the three scanned roots, and this one was inside.
 */
const PY_TEST_FILE_GLOBS = ["tests/**/test_*.py", "tests/**/*_test.py"] as const;

const CONFIG_WITH_GLOBS = (globs: readonly string[]): string =>
  [
    "validation:",
    "  traceability:",
    "    testFileGlobs:",
    ...globs.map((glob) => `      - "${glob}"`),
    "",
  ].join("\n");

// The scaffold parser reads composite `TC-NNNN-NNNN` ids only, so the
// short-form fixture above cannot drive an end-to-end scaffold run.
const COMPOSITE_TC_TABLE = `# 06 Test Cases

## Test Case Table

| TC-ID | Level | AC-Refs | EX-Ref | Steps | Expected |
| ----- | ----- | ------- | ------ | ----- | -------- |
| TC-0001-0001 | L3 | AC-0001-0001 | EX-0001-0001 | step | expected |
`;

/** Narrowing helper — a missing dialect is a test failure, not a fallback. */
function requireDialect(globs: readonly string[]): ScaffoldDialect {
  const resolution = resolveScaffoldDialect(globs);
  if (resolution.outcome !== "resolved") {
    throw new Error(`no scaffold dialect resolved for ${globs.join(", ")}: ${resolution.outcome}`);
  }
  return resolution.dialect;
}

describe("the scaffold writes in the language the gate reads", () => {
  it("keeps the vitest skeleton when the project configures no test globs", () => {
    const dialect = requireDialect(defaultConfig.validation.traceability.testFileGlobs);
    expect(dialect.id).toBe("js-ts");
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001-0001", "tests", dialect);
    expect(dest.replace(/\\/g, "/")).toContain("/tests/integration/spec-0001/TC-0001-0001.test.ts");
  });

  it("names a pytest file when the configured globs derive `.py`", () => {
    const dialect = requireDialect(PY_TEST_FILE_GLOBS);
    expect(dialect.id).toBe("python");
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001-0001", "tests", dialect);
    expect(dest.replace(/\\/g, "/")).toContain("/tests/integration/spec-0001/test_tc_0001_0001.py");
  });

  it("closes QFAI-ATDD-112 on a Python project with the file it just wrote", async () => {
    await withProject(
      { "qfai.config.yaml": CONFIG_WITH_GLOBS(PY_TEST_FILE_GLOBS) },
      async (root) => {
        const errors: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: () => {},
          writeErr: (message) => errors.push(message),
        });
        expect(code).toBe(0);
        expect(errors).toEqual([]);

        const emitted = path.join(
          root,
          "tests",
          "integration",
          "spec-0001",
          "test_tc_0001_0001.py",
        );
        const body = await readFile(emitted, "utf-8");
        // The annotation carries the project's own comment prefix, so the
        // emitted file is valid in its own language.
        expect(body).toContain("# QFAI:SPEC-0001:TC-0001-0001");
        expect(body).not.toContain('from "vitest"');

        // The end-to-end claim: the file the command wrote is a file the gate
        // counts. Pre-fix this was `TC-0001-0001.test.ts` and the error stood.
        const { config } = await loadConfig(root);
        const issues = await validateAtddCodeTraceability(root, config);
        expect(issues.map((i) => i.code)).not.toContain("QFAI-ATDD-112");
      },
      COMPOSITE_TC_TABLE,
    );
  });

  it("emits a Python skeleton `python -m unittest discover` also collects", async () => {
    // `testFileGlobs` names extensions, never runners: `.py` alone cannot tell
    // pytest from unittest. A module-level `def test_...` is collected by
    // pytest only, so a unittest project could retire the TODO and the
    // sentinel — clearing QFAI-ATDD-112 and D-SCAFFOLD-PLACEHOLDER on the
    // annotation alone — while the obligation had never once been executed.
    await withProject(
      { "qfai.config.yaml": CONFIG_WITH_GLOBS(PY_TEST_FILE_GLOBS) },
      async (root) => {
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: () => {},
          writeErr: () => {},
        });
        expect(code).toBe(0);
        const body = await readFile(
          path.join(root, "tests", "integration", "spec-0001", "test_tc_0001_0001.py"),
          "utf-8",
        );
        expect(body).toContain("import unittest");
        // A TestCase subclass is collected by BOTH runners, so the skeleton
        // needs no runner detection to stay honest.
        expect(body).toMatch(/^class Test_TC_0001_0001\(unittest\.TestCase\):$/m);
        expect(body).toMatch(/^ {4}def test_tc_0001_0001\(self\) -> None:$/m);
        // Still Red by exception, not by a silent skip: QFAI-TEST-001 reports
        // `pytest.skip` / `@unittest.skip` as an error.
        expect(body).toContain("raise NotImplementedError");
        expect(body).not.toMatch(/@(?:unittest|pytest)\.(?:mark\.)?skip/);
      },
      COMPOSITE_TC_TABLE,
    );
  });

  it("refuses on a stack it has no skeleton shape for instead of writing an unread file", async () => {
    await withProject(
      { "qfai.config.yaml": CONFIG_WITH_GLOBS(["spec/**/*_spec.rb"]) },
      async (root) => {
        const errors: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: () => {},
          writeErr: (message) => errors.push(message),
        });
        expect(code).toBe(1);
        expect(errors.join("\n")).toMatch(/no skeleton dialect/);
        // The derived pattern is named, so the refusal points at the config key
        // the operator can act on.
        expect(errors.join("\n")).toContain("rb");
        await expect(
          readFile(
            path.join(root, "tests", "integration", "spec-0001", "TC-0001-0001.test.ts"),
            "utf-8",
          ),
        ).rejects.toThrow();
      },
      COMPOSITE_TC_TABLE,
    );
  });
});

/**
 * Same config key, one resolution finer.
 *
 * The extension set picks the dialect; the configured BASENAME shapes pick
 * between that dialect's naming conventions. `QFAI-ATDD-112` widens to the bare
 * extension, so a name the project's own runner never collects would still have
 * cleared the coverage gate — a test that never runs, reported as coverage.
 */
/** A pristine skeleton body for `TC-0001-0001`, in the pre-dialect JS shape. */
const LEGACY_TS_PLACEHOLDER = [
  "// QFAI:SPEC-0001:TC-0001-0001",
  "// QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.",
  "",
  'import { describe, it } from "vitest";',
  "",
  'describe("TC-0001-0001", () => {',
  "  // TODO: implement assertion for TC-0001-0001",
  '  it.skip("pending — scaffold placeholder", () => {});',
  "});",
  "",
].join("\n");

describe("the scaffold writes a name the project's own runner collects", () => {
  it("emits the configured JS extension instead of a `.ts` the scan never opens", () => {
    const dialect = requireDialect(["tests/**/*.test.js"]);
    expect(dialect.id).toBe("js-ts");
    expect(dialect.extension).toBe("js");
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001-0001", "tests", dialect);
    expect(dest.replace(/\\/g, "/")).toContain("/spec-0001/TC-0001-0001.test.js");
  });

  it("reads the fast-glob extglob form instead of refusing a plain TS project", () => {
    // `tests/**/*.@(test|spec).ts` is a valid fast-glob pattern that the
    // `<TC-ID>.test.ts` this writer emits satisfies. A matcher that escaped
    // `@`, `(`, `|` and `)` as literals called it a `naming-mismatch`, so the
    // command exited 1 on an ordinary TypeScript project.
    const dialect = requireDialect(["tests/**/*.@(test|spec).ts"]);
    expect(dialect.id).toBe("js-ts");
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001-0001", "tests", dialect);
    expect(dest.replace(/\\/g, "/")).toContain("/spec-0001/TC-0001-0001.test.ts");
  });

  it("interprets the extglob rather than ignoring it", () => {
    // The other half of the same claim: `+(check|probe)_*.py` admits neither
    // pytest convention this writer emits, so the honest outcome is still a
    // refusal — an extglob that merely matched everything would have written
    // a file the runner never collects.
    expect(resolveScaffoldDialect(["tests/**/+(check|probe)_*.py"]).outcome).toBe(
      "naming-mismatch",
    );
  });

  it("follows the configured pytest basename convention", () => {
    const dialect = requireDialect(["tests/**/*_test.py"]);
    expect(dialect.id).toBe("python");
    const dest = scaffoldDestPath("/repo", "spec-0001", "TC-0001-0001", "tests", dialect);
    // NOT `test_tc_0001_0001.py`: that matches no configured glob, so pytest
    // would never collect it while QFAI-ATDD-112 counted its annotation.
    expect(dest.replace(/\\/g, "/")).toContain("/spec-0001/tc_0001_0001_test.py");
  });

  it("refuses when no name it can emit matches the configured globs", async () => {
    await withProject(
      { "qfai.config.yaml": CONFIG_WITH_GLOBS(["tests/**/check_*.py"]) },
      async (root) => {
        const errors: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: () => {},
          writeErr: (message) => errors.push(message),
        });
        expect(code).toBe(1);
        expect(errors.join("\n")).toMatch(/match validation\.traceability\.testFileGlobs/);
        await expect(
          readFile(
            path.join(root, "tests", "integration", "spec-0001", "test_tc_0001_0001.py"),
            "utf-8",
          ),
        ).rejects.toThrow();
      },
      COMPOSITE_TC_TABLE,
    );
  });

  it("succeeds on an unsupported stack when the spec has no L3 TC to emit", async () => {
    // The dialect refusal is about output this command would have written. A
    // spec whose TCs are all L1/L2 produces none, so a sweep over many specs
    // must not fail on the one that was never going to be scaffolded.
    await withProject(
      { "qfai.config.yaml": CONFIG_WITH_GLOBS(["spec/**/*_spec.rb"]) },
      async (root) => {
        const out: string[] = [];
        const errors: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: (message) => out.push(message),
          writeErr: (message) => errors.push(message),
        });
        expect(code).toBe(0);
        expect(out.join("\n")).toContain("0 TC entries in scope");
        expect(errors.join("\n")).not.toMatch(/no skeleton dialect/);
      },
      COMPOSITE_TC_TABLE.replace("| TC-0001-0001 | L3 |", "| TC-0001-0001 | L1 |"),
    );
  });

  it("retires a placeholder an earlier run wrote under the old naming", async () => {
    await withProject(
      {
        "qfai.config.yaml": CONFIG_WITH_GLOBS(PY_TEST_FILE_GLOBS),
        "tests/integration/spec-0001/TC-0001-0001.test.ts": LEGACY_TS_PLACEHOLDER,
      },
      async (root) => {
        const out: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: (message) => out.push(message),
          writeErr: () => {},
        });
        expect(code).toBe(0);
        const stale = path.join(root, "tests", "integration", "spec-0001", "TC-0001-0001.test.ts");
        // Both shapes are globbed by D-SCAFFOLD-PLACEHOLDER, so leaving the
        // stale one reports the TC forever after the new file is filled in.
        await expect(readFile(stale, "utf-8")).rejects.toThrow();
        await expect(
          readFile(
            path.join(root, "tests", "integration", "spec-0001", "test_tc_0001_0001.py"),
            "utf-8",
          ),
        ).resolves.toContain("TC-0001-0001");
        expect(out.join("\n")).toContain("superseded placeholder");
      },
      COMPOSITE_TC_TABLE,
    );
  });

  it("keeps an old file that has a real assertion, and says so", async () => {
    const implemented = LEGACY_TS_PLACEHOLDER.replace(
      "  // TODO: implement assertion for TC-0001-0001",
      "  expect(1).toBe(1);",
    );
    await withProject(
      {
        "qfai.config.yaml": CONFIG_WITH_GLOBS(PY_TEST_FILE_GLOBS),
        "tests/integration/spec-0001/TC-0001-0001.test.ts": implemented,
      },
      async (root) => {
        const errors: string[] = [];
        const code = await runAtddScaffold({
          root,
          specId: "spec-0001",
          write: () => {},
          writeErr: (message) => errors.push(message),
        });
        expect(code).toBe(0);
        await expect(
          readFile(
            path.join(root, "tests", "integration", "spec-0001", "TC-0001-0001.test.ts"),
            "utf-8",
          ),
        ).resolves.toContain("expect(1).toBe(1)");
        expect(errors.join("\n")).toMatch(/earlier naming convention/);
      },
      COMPOSITE_TC_TABLE,
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

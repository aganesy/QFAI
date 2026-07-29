import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer       | Test file             | Selector | Status   | DR-ID | Evidence |";
const SEP =
  "| -------- | ------- | ----------- | --------------------- | -------- | -------- | ----- | -------- |";

async function withLedger(
  rows: string[],
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
  existingTestFiles: string[] = [],
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-reset-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    for (const file of existingTestFiles) {
      const abs = path.join(root, file);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, "// test\n", "utf-8");
    }
    await writeFile(
      path.join(specDir, "tdd", "test-list.md"),
      [HEADERS, SEP, ...rows].join("\n"),
      "utf-8",
    );
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = (issues: Awaited<ReturnType<typeof validateTddList>>): string[] =>
  issues.map((entry) => entry.code);

describe("a reset row owes no test file until it re-earns green", () => {
  it("allows a reset todo row to name a target path that does not exist yet", async () => {
    // The upstream reset returns the row to `todo`; the test is (re)written in
    // the following `red` phase.
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/pending.test.ts | case a   | todo     | DR-1  | reset    |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_TEST_FILE_MISSING");
      },
    );
  });

  it("still requires a non-empty Test file at green", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        |                       | case a   | green    | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).toContain("TDDLIST_TEST_FILE_MISSING");
      },
    );
  });

  it("still requires the file to exist at green and refactor", async () => {
    // `green` asserts a test that passed; a ledger may not claim that with a
    // file that is not on disk.
    for (const status of ["green   ", "refactor"]) {
      await withLedger(
        [
          `| TDD-0001 | TC-0001 | Unit        | tests/missing.test.ts | case a   | ${status} | -     | -        |`,
        ],
        (issues) => {
          expect(codes(issues)).toContain("TDDLIST_TEST_FILE_MISSING");
        },
      );
    }
  });

  it("accepts a green row whose file exists", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/a.test.ts       | case a   | green    | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_TEST_FILE_MISSING");
      },
      ["tests/a.test.ts"],
    );
  });

  it("still requires the file to exist at done", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/missing.test.ts | case a   | done     | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).toContain("TDDLIST_TEST_FILE_MISSING");
      },
    );
  });

  it("accepts a done row whose file exists", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/a.test.ts       | case a   | done     | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_TEST_FILE_MISSING");
      },
      ["tests/a.test.ts"],
    );
  });
});

describe("Layer and Test file must agree", () => {
  it("warns when an Integration row points into tests/e2e", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Integration | tests/e2e/a.test.ts   | case a   | todo     | -     | -        |",
      ],
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_LAYER_PATH_MISMATCH");
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain("tests/integration/");
      },
    );
  });

  it("accepts a matching layer and path", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Integration | tests/integration/a.ts | case a  | todo     | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_LAYER_PATH_MISMATCH");
      },
    );
  });

  it("makes no claim about Unit rows, which have no mandated directory", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/e2e/a.test.ts   | case a   | todo     | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_LAYER_PATH_MISMATCH");
      },
    );
  });
});

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe("the DR-ID column definition covers the reset row", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the column definition is not "exception items only"`, async () => {
      const skill = await readFile(
        path.join(repoRoot, tree, "assistant/skills/qfai-implement/SKILL.md"),
        "utf-8",
      );
      // The old wording let an agent blank the approval ID on the next
      // transition, and no validator checks DR-ID outside `exception`.
      expect(skill).not.toContain("Decision Record ID for exception items (blank otherwise)");
      expect(skill).toContain(
        "required for `exception` rows and for a row reopened by an upstream reset, retained through the row's later statuses",
      );
      expect(skill).toContain(
        "MUST be retained as the row moves on through `red`, `green`,\n  `refactor` and `done`",
      );
    });

    it(`${tree}: the reset is available from every status, including red and exception`, async () => {
      // Drift Protocol step 5 requires sweeping every invalidated row; a reset
      // limited to green/refactor/done left `red` and `exception` rows with no
      // legal way back to `todo`.
      const skill = await readFile(
        path.join(repoRoot, tree, "assistant/skills/qfai-implement/SKILL.md"),
        "utf-8",
      );
      expect(skill).toContain(
        "- `red` | `green` | `refactor` | `done` | `exception` -> `todo` — **upstream\n  reset**, the only legal reopen, available from every status a row can hold.",
      );
      expect(skill).toContain(
        "A row swept out of `exception`\n  keeps the anomaly's DR-ID alongside the reset ID.",
      );

      const drift = await readFile(
        path.join(repoRoot, tree, "assistant/constitution/drift-protocol.md"),
        "utf-8",
      );
      expect(drift).toContain("(any status -> `todo`)");
      expect(drift).toContain(
        "The\n   sweep covers in-flight rows too: a `red` row whose obligation changed, and\n   an `exception` row whose anomaly the rerun resolved or superseded, reset the\n   same way.",
      );

      const rules = await readFile(
        path.join(
          repoRoot,
          tree,
          "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
        ),
        "utf-8",
      );
      expect(rules).toContain("An `exception` row is not a\n  dead end");
    });

    it(`${tree}: the traceability rules keep the green/refactor file check`, async () => {
      const rules = await readFile(
        path.join(
          repoRoot,
          tree,
          "assistant/skills/qfai-sdd/references/spec-traceability-rules.md",
        ),
        "utf-8",
      );
      expect(rules).toContain(
        "`Status` in `green`, `refactor`, or `done` requires an existing Test file",
      );
      expect(rules).toContain("a swept\n  row returns to `todo`");
      expect(rules).toContain("retains it through `red`, `green`,\n  `refactor` and `done`");
    });
  }
});

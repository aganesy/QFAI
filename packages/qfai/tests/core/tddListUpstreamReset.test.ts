import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

  it("does not fire on a path that merely contains a mandated directory name", async () => {
    // `src/tests/e2e/...` and `mytests/e2e/...` are not the repo-root
    // `tests/e2e/`. A substring test read them as such and warned that an
    // Integration row was in the e2e directory, against a file that is in
    // neither mandated directory.
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Integration | src/tests/e2e/a.ts    | case a   | todo     | -     | -        |",
        "| TDD-0002 | TC-0002 | Integration | mytests/e2e/b.ts      | case b   | todo     | -     | -        |",
      ],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_LAYER_PATH_MISMATCH");
      },
    );
  });

  it("accepts a leading ./ on an otherwise matching path", async () => {
    await withLedger(
      ["| TDD-0001 | TC-0001 | Integration | ./tests/integration/a.ts | case a | todo | - | - |"],
      (issues) => {
        expect(codes(issues)).not.toContain("TDDLIST_LAYER_PATH_MISMATCH");
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

// Anchored to this file, not to `process.cwd()`: the resolved root then does
// not depend on the directory Vitest was launched from, so the reads below
// stay deterministic whether the suite runs from the repo root or from
// `packages/qfai`.
// tests/core/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/**
 * Whitespace-collapsed, because these needles quote sentences and not line
 * breaks. Written with the wrapping baked in, an assertion fails when the
 * reference is re-wrapped — a change that moves no word — and the failure
 * reads as a missing rule.
 */
const flat = (value: string): string => value.replace(/\s+/g, " ");

describe("the DR-ID column definition covers the reset row", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the column definition is not "exception items only"`, async () => {
      // The ledger schema and its transitions moved out of SKILL.md into this
      // reference under the progressive-disclosure budget (#414); SKILL.md now
      // carries a summary and points here, so the rules are asserted here.
      const skill = flat(
        await readFile(
          path.join(
            repoRoot,
            tree,
            "assistant/skills/qfai-implement/references/execution-ledger.md",
          ),
          "utf-8",
        ),
      );
      // The old wording let an agent blank the approval ID on the next
      // transition, and no validator checks DR-ID outside `exception`.
      expect(skill).not.toContain("Decision Record ID for exception items (blank otherwise)");
      // Same rule, stated per ID kind since the Change Request artifact landed:
      // the `DR-*` is what an `exception` owes, the `CR-*` is what a reset row
      // carries forward. `changeRequestArtifact.test.ts` asserts the same cell.
      expect(skill).toContain(
        "a `DR-*` is required for `exception` rows, a `CR-*` for a row reset by an approved Change Request and is retained through that row's later statuses",
      );
      expect(skill).toContain(
        "MUST be retained as the row moves on through `red`, `green`, `refactor` and `done`",
      );
    });

    it(`${tree}: the reset is available from every status, including red and exception`, async () => {
      // Drift Protocol step 5 requires sweeping every invalidated row; a reset
      // limited to green/refactor/done left `red` and `exception` rows with no
      // legal way back to `todo`.
      // The ledger schema and its transitions moved out of SKILL.md into this
      // reference under the progressive-disclosure budget (#414); SKILL.md now
      // carries a summary and points here, so the rules are asserted here.
      const skill = flat(
        await readFile(
          path.join(
            repoRoot,
            tree,
            "assistant/skills/qfai-implement/references/execution-ledger.md",
          ),
          "utf-8",
        ),
      );
      // The enumeration was itself too narrow: the list declares itself
      // complete and prohibits every unlisted edge, so naming five sources
      // forbade the sweep for a row at `blocked` or `review-fix` — the two
      // statuses `drift-protocol.md` step 5 is most likely to find in flight.
      expect(skill).toContain(
        "- **Any status** -> `todo` — **upstream reset**, the only legal reopen, available from every status a row can hold, `blocked` and `review-fix` included.",
      );
      expect(skill).toContain(
        "A row swept out of `exception` keeps the anomaly's DR-ID alongside the reset ID.",
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

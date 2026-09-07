import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const BASE_HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const BASE_SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

async function withLedger(
  lines: string[],
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
  testCases = "# TC\n",
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-oblig-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), testCases, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** A `06_Test-Cases.md` declaring one unit-level (coverage-target) TC. */
const UNIT_TEST_CASE = [
  "# 06 Test Cases",
  "",
  "| TC-ID   | Level | AC-Refs | Notes  |",
  "| ------- | ----- | ------- | ------ |",
  "| TC-0001 | unit  | AC-0001 | note-1 |",
  "",
].join("\n");

const obligationFindings = (
  issues: Awaited<ReturnType<typeof validateTddList>>,
): Awaited<ReturnType<typeof validateTddList>> =>
  issues.filter((entry) => entry.code === "TDDLIST_INVALID_OBLIGATION_REF");

const layerFindings = (
  issues: Awaited<ReturnType<typeof validateTddList>>,
): Awaited<ReturnType<typeof validateTddList>> =>
  issues.filter((entry) => entry.code === "TDDLIST_OBLIGATION_LAYER_MISMATCH");

describe("optional obligation columns on the TDD ledger", () => {
  it("accepts a ledger without the optional columns", async () => {
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
      ],
      (issues) => {
        expect(obligationFindings(issues)).toEqual([]);
      },
    );
  });

  it("accepts well-formed US-Refs and CON-API-Refs on E2E / API rows", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs | CON-API-Refs |`,
        `${BASE_SEP} ------- | ------------ |`,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | todo   | -     | -        | US-0001-0002 | -            |",
        "| TDD-0002 | -       | API   | tests/api/a.ts  | contract | todo   | -     | -        | -            | CON-API-0001 |",
      ],
      (issues) => {
        expect(obligationFindings(issues)).toEqual([]);
      },
    );
  });

  it("rejects a malformed US-Refs token", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs |`,
        `${BASE_SEP} ------- |`,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | todo   | -     | -        | US-1    |",
      ],
      (issues) => {
        const finding = obligationFindings(issues)[0];
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toContain("US-1");
        expect(finding?.message).toContain("US-NNNN");
      },
    );
  });

  it("rejects a malformed CON-API-Refs token and reports each separately", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} CON-API-Refs |`,
        `${BASE_SEP} ------------ |`,
        "| TDD-0001 | -       | API   | tests/api/a.ts  | contract | todo   | -     | -        | CON-API-1, CON-DB-0001 |",
      ],
      (issues) => {
        expect(obligationFindings(issues)).toHaveLength(1);
        expect(obligationFindings(issues)[0]?.message).toContain("CON-DB-0001");
      },
    );
  });

  it("treats an empty cell and `-` as absent", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs |`,
        `${BASE_SEP} ------- |`,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        | -       |",
        "| TDD-0002 | TC-0002 | Unit  | tests/a.test.ts | case b   | todo   | -     | -        |         |",
      ],
      (issues) => {
        expect(obligationFindings(issues)).toEqual([]);
        expect(layerFindings(issues)).toEqual([]);
      },
    );
  });
});

describe("an obligation is only legal on the Layer that owns it", () => {
  it("rejects US-Refs on a non-E2E row", async () => {
    // Shape alone was accepted, so a Unit row could claim a US obligation the
    // ATDD gates route to tests/e2e/**.
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs |`,
        `${BASE_SEP} ------- |`,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        | US-0001 |",
      ],
      (issues) => {
        const finding = layerFindings(issues)[0];
        expect(finding?.severity).toBe("error");
        expect(finding?.message).toContain("US-Refs is only legal on a Layer=E2E row");
        expect(finding?.message).toContain('Layer="Unit"');
        expect(finding?.suggested_action).toContain("CON-API-Refs for API");
      },
    );
  });

  it("rejects CON-API-Refs on a non-API row", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} CON-API-Refs |`,
        `${BASE_SEP} ------------ |`,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | todo   | -     | -        | CON-API-0001 |",
      ],
      (issues) => {
        expect(layerFindings(issues)[0]?.message).toContain(
          "CON-API-Refs is only legal on a Layer=API row",
        );
      },
    );
  });

  it("accepts the matching layer case-insensitively", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs |`,
        `${BASE_SEP} ------- |`,
        "| TDD-0001 | -       | e2e   | tests/e2e/a.ts  | journey  | todo   | -     | -        | US-0001 |",
      ],
      (issues) => {
        expect(layerFindings(issues)).toEqual([]);
      },
    );
  });

  it("rejects TC-Refs on an E2E or API row", async () => {
    // Only the US/CON-API direction was bound, so the reverse placement — the
    // one `test-layers.md` actually forbids — still validated clean.
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | TC-0001 | E2E   | tests/e2e/a.ts  | journey  | todo   | -     | -        |",
        "| TDD-0002 | TC-0002 | API   | tests/api/a.ts  | contract | todo   | -     | -        |",
      ],
      (issues) => {
        const findings = layerFindings(issues);
        expect(findings).toHaveLength(2);
        expect(findings[0]?.severity).toBe("error");
        expect(findings[0]?.message).toContain("TC-Refs is not legal on a Layer=E2E row");
        expect(findings[0]?.message).toContain("TC-0001");
        expect(findings[1]?.message).toContain("TC-Refs is not legal on a Layer=API row");
      },
    );
  });

  it("rejects an E2E row that leaves US-Refs empty once the column ships", async () => {
    // The reverse direction was unchecked: the column was read as optional on
    // every row, so a `Layer = E2E` row could carry `-` in TC-Refs (forbidden
    // there) *and* `-` in US-Refs and reach `done` with no obligation in any
    // column — nothing for a handoff to audit.
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs | CON-API-Refs |`,
        `${BASE_SEP} ------- | ------------ |`,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | done   | -     | ev       | -       | -            |",
        "| TDD-0002 | -       | API   | tests/api/a.ts  | contract | done   | -     | ev       |         |              |",
      ],
      (issues) => {
        const findings = layerFindings(issues);
        expect(findings).toHaveLength(2);
        expect(findings[0]?.severity).toBe("error");
        expect(findings[0]?.message).toContain("US-Refs is required on a Layer=E2E row");
        expect(findings[0]?.suggested_action).toContain("cannot record its obligation in TC-Refs");
        expect(findings[1]?.message).toContain("CON-API-Refs is required on a Layer=API row");
      },
    );
  });

  it("does not demand the obligation on a ledger without the column", async () => {
    // The eight-column ledgers written before the columns shipped record what
    // they can in TC-Refs. Requiring the cell there would be an unwaivable
    // migration, not a gate.
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | done   | -     | ev       |",
        "| TDD-0002 | -       | API   | tests/api/a.ts  | contract | done   | -     | ev       |",
      ],
      (issues) => {
        expect(layerFindings(issues)).toEqual([]);
      },
    );
  });

  it("says nothing when an E2E row carries `-` in TC-Refs", async () => {
    await withLedger(
      [
        `${BASE_HEADERS} US-Refs |`,
        `${BASE_SEP} ------- |`,
        "| TDD-0001 | -       | E2E   | tests/e2e/a.ts  | journey  | todo   | -     | -        | US-0001 |",
      ],
      (issues) => {
        expect(layerFindings(issues)).toEqual([]);
      },
    );
  });
});

describe("a forbidden placement cannot close a coverage obligation", () => {
  it("does not count a TC referenced only from an E2E row", async () => {
    // Coverage aggregated every row's TC-Refs regardless of Layer, so one
    // illegal reference marked a unit TC covered and the gate went green.
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | TC-0001 | E2E   | tests/e2e/a.ts  | journey  | done   | -     | -        |",
      ],
      (issues) => {
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_TC_NOT_COVERED");
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_OBLIGATION_LAYER_MISMATCH");
      },
      UNIT_TEST_CASE,
    );
  });

  it("still counts the same TC from a Unit row", async () => {
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
      ],
      (issues) => {
        expect(issues.map((entry) => entry.code)).not.toContain("TDDLIST_TC_NOT_COVERED");
      },
      UNIT_TEST_CASE,
    );
  });
});

describe("the Layer enum is checked on every row", () => {
  it("warns about a Layer outside the declared values", async () => {
    // The obligation checks skip a row whose reference cell is empty or `-`, so
    // this row's Layer was never read at all.
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | -       | System | tests/a.test.ts | case a   | todo   | -     | -        |",
      ],
      (issues) => {
        const finding = issues.find((entry) => entry.code === "TDDLIST_UNKNOWN_LAYER");
        // Warning, not error: existing ledgers carry project-specific layer
        // names and must not start failing on upgrade.
        expect(finding?.severity).toBe("warning");
        expect(finding?.message).toContain('Unknown Layer "System"');
        expect(finding?.message).toContain("Unit, Component, Integration, API, E2E");
      },
    );
  });

  it("accepts every declared value, case-insensitively, and skips empty cells", async () => {
    await withLedger(
      [
        BASE_HEADERS,
        BASE_SEP,
        "| TDD-0001 | -       | unit      | tests/a.test.ts | a | todo   | -     | -        |",
        "| TDD-0002 | -       | Component | tests/a.test.ts | b | todo   | -     | -        |",
        "| TDD-0003 | -       | INTEGRATION | tests/a.test.ts | c | todo | -     | -        |",
        "| TDD-0004 | -       | Api       | tests/api/a.ts  | d | todo   | -     | -        |",
        "| TDD-0005 | -       | e2e       | tests/e2e/a.ts  | e | todo   | -     | -        |",
        "| TDD-0006 | -       |           | tests/a.test.ts | f | todo   | -     | -        |",
      ],
      (issues) => {
        expect(issues.filter((entry) => entry.code === "TDDLIST_UNKNOWN_LAYER")).toEqual([]);
      },
    );
  });
});

// Anchored to this file, not to `process.cwd()`: from the repo root `../..`
// resolves above the repo and every read below fails on an unrelated path.
// tests/core/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
// The ledger schema moved out of SKILL.md under the progressive-disclosure
// budget (#414); the body keeps a summary and a pointer.
const LEDGER = "assistant/skills/qfai-implement/references/execution-ledger.md";

describe("the shipped ledger schema documents all eight required columns", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the required-columns table is not split by the optional section`, async () => {
      const ledger = await readFile(path.join(repoRoot, tree, LEDGER), "utf-8");
      const start = ledger.indexOf("## Required columns");
      const optional = ledger.indexOf("## Obligation columns (optional, required by layer)");
      expect(start, "execution-ledger.md has no `## Required columns`").toBeGreaterThan(-1);
      expect(optional, "execution-ledger.md has no obligation-columns section").toBeGreaterThan(
        start,
      );
      const required = ledger.slice(start, optional);
      // Inserting the optional section mid-table ended the rendered table at
      // `Layer` and orphaned the last five rows as plain text.
      for (const column of [
        "| TDD-ID ",
        "| TC-Refs ",
        "| Layer ",
        "| Test file ",
        "| Selector ",
        "| Status ",
        "| DR-ID ",
        "| Evidence ",
      ]) {
        expect(required).toContain(column);
      }
      // The column table itself moved to `obligation-columns.md` when the ledger hit the
      // shipped line ceiling; the ledger keeps the heading, a summary and the pointer. What
      // this row is about — the optional section not being spliced into the required table —
      // is unchanged, and the assertions follow the text rather than being relaxed.
      const columns = await readFile(
        path.join(
          repoRoot,
          tree,
          "assistant/skills/qfai-implement/references/obligation-columns.md",
        ),
        "utf-8",
      );
      expect(columns).toContain("| US-Refs ");
      expect(
        ledger.slice(optional),
        "the ledger's own section has to reach the file that carries the table",
      ).toContain("obligation-columns.md");
      // "Required by layer" has to say what the validator does, or the heading
      // is the only place the requirement exists: the reverse direction is
      // enforced, and only where the column is in the header.
      expect(columns).toContain("an `E2E` / `API` row that leaves it empty or `-`");
      expect(columns).toContain("It fires only where the\ncolumn exists");
    });

    it(`${tree}: the Red phase and the evidence contract branch by Layer`, async () => {
      const skill = await readFile(
        path.join(repoRoot, tree, "assistant/skills/qfai-implement/SKILL.md"),
        "utf-8",
      );
      expect(skill).toContain(
        "`TC-Refs` for `Unit` / `Component` / `Integration`, `US-Refs` for `E2E`, `CON-API-Refs` for `API`",
      );
      expect(skill).toContain("authored by `/qfai-atdd` (Non-goals)");
      expect(skill).toContain("On a `Layer = E2E` row read `US-ref`");
      // The Non-goals enumeration names `Integration` too: reading `TC-Refs`
      // on such a row is about which obligation it carries, not about who
      // writes the test — `/qfai-atdd` does, as it does for `E2E` / `API`.
      expect(skill).toContain(
        "`Layer = E2E` / `Layer = API` / `Layer = Integration` ledger rows are tracked here",
      );
    });
  }
});

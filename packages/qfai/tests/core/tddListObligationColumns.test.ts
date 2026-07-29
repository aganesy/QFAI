import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-oblig-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

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
});

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

describe("the shipped ledger schema documents all eight required columns", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the required-columns table is not split by the optional section`, async () => {
      const skill = await readFile(
        path.join(repoRoot, tree, "assistant/skills/qfai-implement/SKILL.md"),
        "utf-8",
      );
      const start = skill.indexOf("## Execution Ledger: test-list.md");
      const optional = skill.indexOf("Optional columns, required when the row carries");
      const required = skill.slice(start, optional);
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
      expect(skill.indexOf("| US-Refs ")).toBeGreaterThan(optional);
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
      expect(skill).toContain("`Layer = E2E` / `Layer = API` ledger rows are tracked here");
    });
  }
});

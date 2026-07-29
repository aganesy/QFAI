import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      },
    );
  });
});

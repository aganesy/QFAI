import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status    | DR-ID  | Evidence |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | --------- | ------ | -------- |";

async function withLedger(
  rows: string[],
  assertion: (issues: Awaited<ReturnType<typeof validateTddList>>) => void,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-exception-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
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

const parked = (
  issues: Awaited<ReturnType<typeof validateTddList>>,
): Awaited<ReturnType<typeof validateTddList>> =>
  issues.filter((entry) => entry.code === "TDDLIST_EXCEPTION_PARKED");

describe("parked exception rows are visible in CI", () => {
  it("warns once per exception row, naming the TDD-ID", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception | DR-1   | anomaly  |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | exception | DR-2   | anomaly  |",
      ],
      (issues) => {
        expect(parked(issues)).toHaveLength(2);
        expect(parked(issues)[0]?.severity).toBe("warning");
        expect(parked(issues)[0]?.message).toContain("TDD-0001");
        expect(parked(issues)[0]?.message).toContain("accepted-risk waiver");
      },
    );
  });

  it("says nothing about non-exception rows", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo      | -      | -        |",
      ],
      (issues) => {
        expect(parked(issues)).toEqual([]);
      },
    );
  });

  it("does not replace the missing-DR error", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | exception |        | anomaly  |",
      ],
      (issues) => {
        expect(parked(issues)).toHaveLength(1);
        expect(issues.map((entry) => entry.code)).toContain("TDDLIST_EXCEPTION_MISSING_DR");
      },
    );
  });
});

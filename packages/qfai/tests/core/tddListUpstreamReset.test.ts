import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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

describe("test-file existence is required only at done", () => {
  it("allows a reset green row to name a target path that does not exist yet", async () => {
    await withLedger(
      [
        "| TDD-0001 | TC-0001 | Unit        | tests/pending.test.ts | case a   | green    | DR-1  | reset    |",
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

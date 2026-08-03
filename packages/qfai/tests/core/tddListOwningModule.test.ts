/**
 * The declared seam column (#391).
 *
 * `delivery-planner` is the sole authority for parallel dispatch and its allow
 * conditions are facts about production modules — "no shared source files under
 * test", "same public API surface modified". Under RED-first those modules do
 * not exist when the planner has to judge, and the only path-valued required
 * column is `Test file`: two items trivially have independent test files and
 * land on the same production module.
 *
 * `Owning module` is a declaration, so it exists before the code does. It is
 * optional — an existing ledger without it is valid — and a filled cell must
 * name exactly one module, because a list puts the gate back to comparing sets
 * it cannot evaluate.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

type Issues = Awaited<ReturnType<typeof validateTddList>>;

async function withLedger(lines: string[], assertion: (issues: Issues) => void): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-owning-module-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const HEADERS =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Owning module |";
const SEP =
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------------- |";

const BARE_HEADERS =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |";
const BARE_SEP = "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |";

const row = (owning: string): string =>
  `| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | sel | todo | - | - | ${owning} |`;

const seam = (issues: Issues): Issues =>
  issues.filter((i) => i.code === "TDDLIST_OWNING_MODULE_NOT_SINGULAR");

describe("Owning module", () => {
  it("is optional — a ledger without the column is valid", async () => {
    await withLedger(
      [
        BARE_HEADERS,
        BARE_SEP,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | sel | todo | - | - |",
      ],
      (issues) => {
        expect(seam(issues)).toEqual([]);
        // Adding it to REQUIRED_COLUMNS would have invalidated every existing
        // ledger at severity `error`.
        expect(issues.some((i) => i.code === "TDDLIST_REQUIRED_COLUMN_MISSING")).toBe(false);
      },
    );
  });

  it("accepts a repo-relative path", async () => {
    await withLedger([HEADERS, SEP, row("src/domain/notification.ts")], (issues) => {
      expect(seam(issues)).toEqual([]);
    });
  });

  it("accepts a dotted module path", async () => {
    await withLedger([HEADERS, SEP, row("shirube.domain.notification")], (issues) => {
      expect(seam(issues)).toEqual([]);
    });
  });

  it("accepts `-` as not declared", async () => {
    await withLedger([HEADERS, SEP, row("-")], (issues) => {
      expect(seam(issues)).toEqual([]);
    });
  });

  it("rejects a comma-separated list", async () => {
    await withLedger([HEADERS, SEP, row("src/a.ts, src/b.ts")], (issues) => {
      const found = seam(issues);
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe("error");
      expect(found[0]?.suggested_action).toContain("a row to split");
    });
  });

  it("rejects a space-separated pair", async () => {
    await withLedger([HEADERS, SEP, row("src/a.ts src/b.ts")], (issues) => {
      expect(seam(issues)).toHaveLength(1);
    });
  });
});

/**
 * The `Boundary` column, which is what tells the sibling rows of a split apart.
 *
 * A matrix-shaped test case is seeded one row per independently observable
 * boundary. Those rows repeat their test case identically and carry serial ids,
 * so neither cell says which row covers which boundary, and the two cells a
 * reseed could otherwise read — `Selector` and `Test file` — belong to the
 * executing stage and are rewritten when a review-fix handback replaces the
 * test.
 *
 * The cases here are about the pair the ledger is keyed on: a split whose rows
 * name no boundary is unpairable, and two rows naming one boundary are
 * indistinguishable again. Everything else — one row per test case, a ledger
 * with no column at all — is silent, because there is nothing to tell apart.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { newRuleSeverity, RULE_PROMOTIONS } from "../../src/core/sunset.js";
import { validateTddList } from "../../src/core/validators/tddList.js";
import type * as VersionModule from "../../src/core/version.js";

/**
 * The version `resolveToolVersion` reports, so the promotion window is
 * observable from both sides of its release.
 *
 * An empty string means "defer to the real one", so every other case in this
 * file keeps running against the shipped version.
 */
const toolVersion = vi.hoisted(() => ({ override: "" }));

vi.mock("../../src/core/version.js", async (importOriginal) => {
  const actual = await importOriginal<typeof VersionModule>();
  return {
    ...actual,
    resolveToolVersion: async (): Promise<string> =>
      toolVersion.override.length > 0 ? toolVersion.override : actual.resolveToolVersion(),
  };
});

afterEach(() => {
  toolVersion.override = "";
});

type Issues = Awaited<ReturnType<typeof validateTddList>>;

async function withLedger(lines: string[], assertion: (issues: Issues) => void): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-boundary-"));
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
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | Boundary |";
const SEP =
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | -------- |";

const BARE_HEADERS =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |";
const BARE_SEP = "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- |";

/** A row of the boundary-bearing table. */
const row = (tddId: string, tcRefs: string, boundary: string): string =>
  `| ${tddId} | ${tcRefs} | Unit | tests/a.test.ts | sel ${tddId} | todo | - | - | ${boundary} |`;

/** A row of the table that has no `Boundary` column. */
const bareRow = (tddId: string, tcRefs: string): string =>
  `| ${tddId} | ${tcRefs} | Unit | tests/a.test.ts | sel ${tddId} | todo | - | - |`;

const unnamed = (issues: Issues): Issues => issues.filter((i) => i.code === "QFAI-TDDLIST-017");
const duplicated = (issues: Issues): Issues => issues.filter((i) => i.code === "QFAI-TDDLIST-018");

describe("a test case that is not split", () => {
  it("says nothing when one row names no boundary", async () => {
    await withLedger([HEADERS, SEP, row("TDD-0001", "TC-0001", "-")], (issues) => {
      expect(unnamed(issues)).toEqual([]);
      expect(duplicated(issues)).toEqual([]);
    });
  });

  it("says nothing about a ledger with no Boundary column at all", async () => {
    // The column is optional. Requiring it of every ledger would report a shape
    // that carries no ambiguity, since a test case holding one row has nothing
    // to tell apart.
    await withLedger(
      [BARE_HEADERS, BARE_SEP, bareRow("TDD-0001", "TC-0001"), bareRow("TDD-0002", "TC-0002")],
      (issues) => {
        expect(unnamed(issues)).toEqual([]);
        expect(duplicated(issues)).toEqual([]);
      },
    );
  });

  it("lets two test cases share a slug, because the key is the pair", async () => {
    // A slug is unique inside its own test case and nowhere wider, so a generic
    // one recurs. Keyed on the slug alone this would be a false report on the
    // most natural naming there is.
    await withLedger(
      [
        HEADERS,
        SEP,
        row("TDD-0001", "TC-0001", "not-found"),
        row("TDD-0002", "TC-0002", "not-found"),
      ],
      (issues) => {
        expect(duplicated(issues)).toEqual([]);
      },
    );
  });

  it("does not read one row that repeats its test case as two siblings", async () => {
    await withLedger([HEADERS, SEP, row("TDD-0001", "TC-0001, TC-0001", "-")], (issues) => {
      expect(unnamed(issues)).toEqual([]);
    });
  });
});

describe("a split whose rows name no boundary", () => {
  it("is reported once for the test case, naming the rows", async () => {
    await withLedger(
      [HEADERS, SEP, row("TDD-0001", "TC-0001", "-"), row("TDD-0002", "TC-0001", "-")],
      (issues) => {
        const found = unnamed(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("TC-0001");
        expect(found[0]?.message).toContain("TDD-0001");
        expect(found[0]?.message).toContain("TDD-0002");
      },
    );
  });

  it("names only the rows that are missing one", async () => {
    await withLedger(
      [HEADERS, SEP, row("TDD-0001", "TC-0001", "rejects-empty"), row("TDD-0002", "TC-0001", "-")],
      (issues) => {
        const found = unnamed(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("TDD-0002");
        expect(found[0]?.message).not.toContain("TDD-0001");
      },
    );
  });

  it("reads an empty cell the same as a dash", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit | tests/a.test.ts | one | todo | - | - |  |",
        "| TDD-0002 | TC-0001 | Unit | tests/a.test.ts | two | todo | - | - |  |",
      ],
      (issues) => {
        expect(unnamed(issues)).toHaveLength(1);
        // Two empty cells are two rows with no slug, never two rows sharing one.
        expect(duplicated(issues)).toEqual([]);
      },
    );
  });

  it("is reported on a ledger whose table has no Boundary column", async () => {
    // A ledger seeded before the column holds exactly this: a split nothing can
    // pair. Reading the absent column as "nothing to check" would leave every
    // such ledger silent, which is the state this rule exists to end.
    await withLedger(
      [BARE_HEADERS, BARE_SEP, bareRow("TDD-0001", "TC-0001"), bareRow("TDD-0002", "TC-0001")],
      (issues) => {
        expect(unnamed(issues)).toHaveLength(1);
      },
    );
  });

  it("groups rows across every ledger table, not only the first", async () => {
    // An appended change table holds rows of the same split, so a check that
    // read the leading table alone would call a two-row split a single row.
    await withLedger(
      [
        HEADERS,
        SEP,
        row("TDD-0001", "TC-0001", "-"),
        "",
        "## CHG-001 second wave",
        "",
        HEADERS,
        SEP,
        row("TDD-0002", "TC-0001", "-"),
      ],
      (issues) => {
        const found = unnamed(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("TDD-0002");
      },
    );
  });
});

describe("a split whose rows claim one boundary twice", () => {
  it("is reported, naming the slug and both rows", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        row("TDD-0001", "TC-0001", "rejects-empty"),
        row("TDD-0002", "TC-0001", "rejects-empty"),
      ],
      (issues) => {
        const found = duplicated(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("rejects-empty");
        expect(found[0]?.message).toContain("TDD-0001");
        expect(found[0]?.message).toContain("TDD-0002");
        // The rows both name a boundary, so the other half has nothing to say.
        expect(unnamed(issues)).toEqual([]);
      },
    );
  });

  it("compares slugs without letting case or spacing hide a repeat", async () => {
    // The slug is prose an author writes, so two spellings of one boundary are
    // the ordinary way this happens rather than an exotic one.
    await withLedger(
      [
        HEADERS,
        SEP,
        row("TDD-0001", "TC-0001", "Rejects Empty"),
        row("TDD-0002", "TC-0001", "rejects  empty"),
      ],
      (issues) => {
        expect(duplicated(issues)).toHaveLength(1);
      },
    );
  });

  it("says nothing when the slugs differ", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        row("TDD-0001", "TC-0001", "rejects-empty"),
        row("TDD-0002", "TC-0001", "rejects-too-long"),
      ],
      (issues) => {
        expect(duplicated(issues)).toEqual([]);
        expect(unnamed(issues)).toEqual([]);
      },
    );
  });
});

describe("the promotion window", () => {
  const promotion = RULE_PROMOTIONS.tddListSplitBoundary.promoteAt;
  const split = [HEADERS, SEP, row("TDD-0001", "TC-0001", "-"), row("TDD-0002", "TC-0001", "-")];

  it("reports a warning inside it, and says which release ends it", async () => {
    toolVersion.override = RULE_PROMOTIONS.tddListSplitBoundary.introducedIn;
    await withLedger(split, (issues) => {
      const found = unnamed(issues);
      expect(found[0]?.severity).toBe("warning");
      expect(found[0]?.message).toContain(promotion);
    });
  });

  it("reports an error from the promoting release, with no window note", async () => {
    toolVersion.override = promotion;
    await withLedger(split, (issues) => {
      const found = unnamed(issues);
      expect(found[0]?.severity).toBe("error");
      expect(found[0]?.message).not.toContain("until the");
    });
  });

  it("takes the severity from the pin rather than a literal", async () => {
    // Derived on both sides so the release that closes the window does not have
    // to edit this file, and so a severity that stops following the pin is
    // caught here and not only by the ledger guard.
    toolVersion.override = promotion;
    await withLedger(split, (issues) => {
      expect(unnamed(issues)[0]?.severity).toBe(newRuleSeverity(promotion, promotion));
    });
  });
});

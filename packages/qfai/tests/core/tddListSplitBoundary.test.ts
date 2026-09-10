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

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateTddList, validateTddListSeedShape } from "../../src/core/validators/tddList.js";

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

/**
 * A table that can hold every seed group: the two `TC-*` groups keep their
 * obligation in `TC-Refs`, an `E2E` row in `US-Refs` and an `API` row in
 * `CON-API-Refs`.
 */
const OBLIGATION_HEADERS =
  "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence | US-Refs | CON-API-Refs | Boundary |";
const OBLIGATION_SEP =
  "| ------ | ------- | ----- | --------- | -------- | ------ | ----- | -------- | ------- | ------------ | -------- |";

/** A row whose obligation sits in the column its `Layer` owns. */
const obligationRow = (
  tddId: string,
  layer: "E2E" | "API",
  obligation: string,
  boundary: string,
): string => {
  const us = layer === "E2E" ? obligation : "-";
  const conApi = layer === "API" ? obligation : "-";
  return `| ${tddId} | - | ${layer} | tests/a.test.ts | sel ${tddId} | todo | - | - | ${us} | ${conApi} | ${boundary} |`;
};

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

describe("a split of an obligation that is not a test case", () => {
  // Phase 2b splits a matrix-shaped `US-*` or `CON-API-*` the same way it
  // splits a matrix `TC-*`, and those rows carry `-` in `TC-Refs`. Grouped by
  // that column alone they would never enter the check at all.

  it("reports E2E siblings that name no boundary", async () => {
    await withLedger(
      [
        OBLIGATION_HEADERS,
        OBLIGATION_SEP,
        obligationRow("TDD-0001", "E2E", "US-0001", "-"),
        obligationRow("TDD-0002", "E2E", "US-0001", "-"),
      ],
      (issues) => {
        const found = unnamed(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("US-0001");
        // The boundaries of a user story are stated where the story is, not in
        // the test-case file.
        expect(found[0]?.suggested_action).toContain("02_User-stories.md");
      },
    );
  });

  it("reports API siblings that claim one boundary twice", async () => {
    await withLedger(
      [
        OBLIGATION_HEADERS,
        OBLIGATION_SEP,
        obligationRow("TDD-0001", "API", "CON-API-0001", "rejects-empty"),
        obligationRow("TDD-0002", "API", "CON-API-0001", "rejects-empty"),
      ],
      (issues) => {
        const found = duplicated(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("CON-API-0001");
      },
    );
  });

  it("does not pair an E2E row with an API row that happen to share a slug", async () => {
    // Two obligations, one row each. The key is the obligation and the slug
    // together, so a generic slug recurring across them is not a duplicate.
    await withLedger(
      [
        OBLIGATION_HEADERS,
        OBLIGATION_SEP,
        obligationRow("TDD-0001", "E2E", "US-0001", "not-found"),
        obligationRow("TDD-0002", "API", "CON-API-0001", "not-found"),
      ],
      (issues) => {
        expect(duplicated(issues)).toEqual([]);
        expect(unnamed(issues)).toEqual([]);
      },
    );
  });
});

describe("the gate the writing stage runs", () => {
  it("carries both codes, so Phase 2b cannot pass its own gate on a bad split", async () => {
    // `--profile sdd` filters this validator's findings by the seed-shape set.
    // Outside it, the stage that owns the cell passes while the finding waits
    // for a later profile — and from the promoting release it arrives there as
    // an error on a stage forbidden to re-scope a row.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-boundary-seed-"));
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0001");
      await mkdir(path.join(specDir, "tdd"), { recursive: true });
      await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
      await writeFile(path.join(specDir, "06_Test-Cases.md"), "# TC\n", "utf-8");
      await writeFile(
        path.join(specDir, "tdd", "test-list.md"),
        [
          HEADERS,
          SEP,
          row("TDD-0001", "TC-0001", "-"),
          row("TDD-0002", "TC-0001", "-"),
          row("TDD-0003", "TC-0002", "shared"),
          row("TDD-0004", "TC-0002", "shared"),
        ].join("\n"),
        "utf-8",
      );

      const codes = (await validateTddListSeedShape(root, defaultConfig)).map(
        (entry) => entry.code,
      );

      expect(codes).toContain("QFAI-TDDLIST-017");
      expect(codes).toContain("QFAI-TDDLIST-018");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

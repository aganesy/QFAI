/**
 * `Boundary` is the identity cell of a split row.
 *
 * `spec-traceability-rules.md` makes the (`TC-*`, `Boundary`) pair the key a
 * Phase 2b reseed matches on: sibling rows of a matrix-shaped TC repeat one
 * `TC-Refs`, carry a serial `TDD-ID`, and hold a `Selector` that
 * `/qfai-implement` rewrites whenever a review-fix handback replaces the test.
 * The rule had no reader, so a ledger whose siblings left `Boundary` empty, or
 * spent one slug twice, passed `--fail-on error` and then had the next reseed
 * preserve `Status` and `Evidence` against whichever sibling it matched.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../../src/core/sunset.js";
import type { Issue } from "../../src/core/types.js";
import type * as VersionModule from "../../src/core/version.js";
import { resolveToolVersion } from "../../src/core/version.js";
import { validateTddList } from "../../src/core/validators/tddList.js";

/**
 * Both codes are new, so both ship behind a `RULE_PROMOTIONS` window (P7) and
 * neither severity is a literal at the emission. Pinning `"error"` here would
 * pass today and go red the day the shipped version crosses the promotion,
 * without anything being wrong — so the expectation reads the same pin the
 * emitter reads, and the two ends of the window get their own cases below.
 *
 * An empty override means "defer to the real `resolveToolVersion`", so every
 * other case in this file keeps running against the shipped version.
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

const MISSING_PROMOTION = RULE_PROMOTIONS.tddListSplitBoundaryMissing.promoteAt;
const DUPLICATE_PROMOTION = RULE_PROMOTIONS.tddListSplitBoundaryDuplicate.promoteAt;

/** The severity the shipped version puts each code at right now. */
async function shippedSeverity(promoteAt: string): Promise<"warning" | "error"> {
  return newRuleSeverity(await resolveToolVersion(), promoteAt);
}

const HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence | Boundary |";
const SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- | -------- |";

/** The same table without the optional `Boundary` column — the legacy shape. */
const LEGACY_HEADERS =
  "| TDD-ID   | TC-Refs | Layer | Test file       | Selector | Status | DR-ID | Evidence |";
const LEGACY_SEP =
  "| -------- | ------- | ----- | --------------- | -------- | ------ | ----- | -------- |";

const TEST_CASES = [
  "# 06 Test Cases",
  "",
  "| TC-ID   | Level | AC-Refs | Notes  |",
  "| ------- | ----- | ------- | ------ |",
  "| TC-0001 | unit  | AC-0001 | note-1 |",
  "| TC-0002 | unit  | AC-0002 | note-2 |",
  "",
].join("\n");

async function withLedger(
  lines: string[],
  assertion: (issues: Issue[]) => void | Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-tdd-boundary-"));
  try {
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(path.join(specDir, "tdd"), { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# Spec\n", "utf-8");
    await writeFile(path.join(specDir, "02_User-stories.md"), "# US\n", "utf-8");
    await writeFile(path.join(specDir, "03_Acceptance-Criteria.md"), "# AC\n", "utf-8");
    await writeFile(path.join(specDir, "06_Test-Cases.md"), TEST_CASES, "utf-8");
    await writeFile(path.join(specDir, "tdd", "test-list.md"), lines.join("\n"), "utf-8");
    await assertion(await validateTddList(root, defaultConfig));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const missing = (issues: Issue[]): Issue[] =>
  issues.filter((entry) => entry.code === "QFAI-TDD-003");
const duplicate = (issues: Issue[]): Issue[] =>
  issues.filter((entry) => entry.code === "QFAI-TDD-004");

describe("the split row's Boundary identity", () => {
  it("asks nothing of a TC that owns a single row", async () => {
    // One row for a TC is already identified by that TC. Demanding the column
    // there would fail every non-matrix ledger in every existing project.
    await withLedger(
      [
        LEGACY_HEADERS,
        LEGACY_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | case a   | todo   | -     | -        |",
        "| TDD-0002 | TC-0002 | Unit  | tests/b.test.ts | case b   | todo   | -     | -        |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });

  it("accepts sibling rows whose boundaries are named and distinct", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | below-min |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | zero     | todo   | -     | -        | zero      |",
        "| TDD-0003 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | above-max |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });

  it("reports sibling rows that name no boundary, as a warning", async () => {
    // A legacy ledger cannot be migrated before its `CR-*` is approved
    // (the re-split re-scopes rows), so this must not fail `--fail-on error`.
    await withLedger(
      [
        LEGACY_HEADERS,
        LEGACY_SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        |",
      ],
      async (issues) => {
        const found = missing(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe(await shippedSeverity(MISSING_PROMOTION));
        expect(found[0]?.message).toContain("TC-0001");
        expect(found[0]?.message).toContain("row 1, row 2");
        expect(found[0]?.suggested_action).toContain("CR-*");
      },
    );
  });

  it("counts a `-` placeholder as no boundary", async () => {
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | below-min |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | -         |",
      ],
      (issues) => {
        const found = missing(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.message).toContain("1 of them name no Boundary");
      },
    );
  });

  it("reports two siblings claiming one slug", async () => {
    // Only a Phase 2b that already writes `Boundary` can author this, and it
    // leaves the two rows genuinely indistinguishable.
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | rejected |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | Rejected |",
      ],
      async (issues) => {
        const found = duplicate(issues);
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe(await shippedSeverity(DUPLICATE_PROMOTION));
        expect(found[0]?.message).toContain('Boundary "rejected"');
        expect(found[0]?.message).toContain("row 1, row 2");
      },
    );
  });

  it("lets two different TCs share a slug", async () => {
    // The identity is the (`TC-*`, `Boundary`) pair, so a generic slug is free
    // to recur across TCs — which is exactly why `Boundary` alone cannot be
    // the reseed's match key.
    await withLedger(
      [
        HEADERS,
        SEP,
        "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | a-miss   | todo   | -     | -        | not-found |",
        "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | a-ok     | todo   | -     | -        | found     |",
        "| TDD-0003 | TC-0002 | Unit  | tests/b.test.ts | b-miss   | todo   | -     | -        | not-found |",
        "| TDD-0004 | TC-0002 | Unit  | tests/b.test.ts | b-ok     | todo   | -     | -        | found     |",
      ],
      (issues) => {
        expect(missing(issues)).toEqual([]);
        expect(duplicate(issues)).toEqual([]);
      },
    );
  });
});

describe("the split-boundary promotion windows", () => {
  const MISSING_LEDGER = [
    LEGACY_HEADERS,
    LEGACY_SEP,
    "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        |",
    "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        |",
  ];
  const DUPLICATE_LEDGER = [
    HEADERS,
    SEP,
    "| TDD-0001 | TC-0001 | Unit  | tests/a.test.ts | below    | todo   | -     | -        | rejected |",
    "| TDD-0002 | TC-0001 | Unit  | tests/a.test.ts | above    | todo   | -     | -        | Rejected |",
  ];

  async function at(
    version: string,
    ledger: string[],
    pick: (issues: Issue[]) => Issue[],
  ): Promise<{ severity: string; message: string }> {
    toolVersion.override = version;
    let found = { severity: "", message: "" };
    await withLedger(ledger, (issues) => {
      const entry = pick(issues)[0];
      if (entry) found = { severity: entry.severity, message: entry.message };
    });
    return found;
  }

  it("reports a warning before the promotion release, naming the release", async () => {
    // The regression P7 exists for: a `--fail-on error` gate that was passing
    // must not latch on an upgrade, and the operator must be able to read when
    // it will. Both codes are new, so both owe that.
    const missingFound = await at("1.9.9", MISSING_LEDGER, missing);
    expect(missingFound.severity).toBe("warning");
    expect(missingFound.message).toContain(MISSING_PROMOTION);

    const duplicateFound = await at("1.9.9", DUPLICATE_LEDGER, duplicate);
    expect(duplicateFound.severity).toBe("warning");
    expect(duplicateFound.message).toContain(DUPLICATE_PROMOTION);
  });

  it("reports an error from the promotion release onwards", async () => {
    const missingFound = await at("99.0.0", MISSING_LEDGER, missing);
    expect(missingFound.severity).toBe("error");
    // No window left to advertise once the window has closed.
    expect(missingFound.message).not.toContain("until the");

    const duplicateFound = await at("99.0.0", DUPLICATE_LEDGER, duplicate);
    expect(duplicateFound.severity).toBe("error");
    expect(duplicateFound.message).not.toContain("until the");
  });

  it("stays inside the window when the version cannot be read", async () => {
    // `resolveToolVersion` resolves rather than rejects, so an unreadable
    // version arrives as a token the comparator cannot parse. That must never
    // be what escalates a finding into a build failure.
    expect((await at("unknown", MISSING_LEDGER, missing)).severity).toBe("warning");
    expect((await at("unknown", DUPLICATE_LEDGER, duplicate)).severity).toBe("warning");
  });
});

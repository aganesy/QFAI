/**
 * The dogfooding lanes are a ratchet, and this is the ratchet's contract.
 *
 * The lanes report the ledger rules at `error`, and the repository carries a
 * backlog of rows written before those rules existed. A waiver cannot stand in
 * — `QFAI-WAIVER-002` refuses one whose rule is an error — so the pin is the
 * only thing between "this lane still catches a regression" and "this lane is
 * off".
 *
 * Reached through the comparison rather than through a profile run: a case
 * that ran `validate` would assert against whatever the repository currently
 * carries, so it would pass for a lane that had been turned off entirely.
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Guard = {
  compareAgainstPin: (
    counts: Map<string, number>,
    pinned: Record<string, number>,
  ) => {
    unpinned: Array<[string, number]>;
    over: Array<[string, number]>;
    improved: Array<[string, number]>;
  };
  errorsByFile: (report: unknown) => Map<string, number>;
  errorsForFile: (
    report: {
      issues?: Array<{ code?: string; file?: string; message?: string; severity: string }>;
    },
    file: string,
  ) => Array<{ code?: string; message?: string }>;
  findingKey: (finding: { code?: string; message?: string }) => string;
  findingsByFile: (report: unknown) => Map<string, Record<string, number>>;
  findingsOutsidePin: (
    findings: Map<string, Record<string, number>>,
    pinned: Record<string, Record<string, number>>,
  ) => Array<{ file: string; key: string; n: number; held: number }>;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a
 * drive letter, which an import specifier reads as a scheme.
 */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-dogfood-backlog.mjs")).href;
  return (await import(url)) as Guard;
}

const LEDGER = ".qfai/specs/spec-0002/tdd/test-list.md";
const CLEAN = ".qfai/specs/spec-0001/tdd/test-list.md";

function report(...issues: Array<{ file?: string; severity: string }>): unknown {
  return { issues };
}

describe("errorsByFile", () => {
  it("counts errors per file and ignores every softer severity", async () => {
    const { errorsByFile } = await load();

    const counts = errorsByFile(
      report(
        { file: LEDGER, severity: "error" },
        { file: LEDGER, severity: "error" },
        { file: LEDGER, severity: "warning" },
        { file: CLEAN, severity: "info" },
      ),
    );

    expect([...counts]).toEqual([[LEDGER, 2]]);
  });

  it("files an error carrying no path under one bucket rather than dropping it", async () => {
    // A finding with no file still fails a lane, so it has to be ratchetable.
    const { errorsByFile } = await load();

    expect([...errorsByFile(report({ severity: "error" }, { severity: "error" }))]).toEqual([
      ["(no file)", 2],
    ]);
  });

  it("reads a report with no issues at all", async () => {
    const { errorsByFile } = await load();

    expect([...errorsByFile({})]).toEqual([]);
  });
});

describe("errorsForFile", () => {
  it("names only the failing findings in the unpinned file", async () => {
    const { errorsForFile } = await load();
    const findings = errorsForFile(
      {
        issues: [
          { file: CLEAN, severity: "error", code: "E-NEW", message: "new problem" },
          { file: CLEAN, severity: "warning", code: "W-OLD", message: "warning" },
          { file: LEDGER, severity: "error", code: "E-OTHER", message: "other file" },
        ],
      },
      CLEAN,
    );

    expect(findings).toEqual([{ code: "E-NEW", message: "new problem" }]);
  });
});

describe("compareAgainstPin", () => {
  it("passes a pinned file that reports exactly its pinned count", async () => {
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(new Map([[LEDGER, 13]]), { [LEDGER]: 13 });

    expect(verdict).toEqual({ unpinned: [], over: [], improved: [] });
  });

  it("reports a file the pin does not name, whatever the total", async () => {
    // The half a bare count ratchet misses: a regression in a clean file, while
    // some other file's backlog shrank by the same amount.
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(new Map([[CLEAN, 1]]), { [LEDGER]: 13 });

    expect(verdict.unpinned).toEqual([[CLEAN, 1]]);
  });

  it("reports a pinned file that reports one more than its pin", async () => {
    const { compareAgainstPin } = await load();

    expect(compareAgainstPin(new Map([[LEDGER, 14]]), { [LEDGER]: 13 }).over).toEqual([
      [LEDGER, 14],
    ]);
  });

  it("reports a pin the tree has moved past, so the ratchet cannot stall", async () => {
    // Without this the pin keeps the original headroom after a backfill, and
    // the rows that were fixed can silently come back.
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(new Map([[LEDGER, 4]]), { [LEDGER]: 13 });

    expect(verdict.improved).toEqual([[LEDGER, 13]]);
    expect(verdict.over).toEqual([]);
  });

  it("reports a pinned file that has reached zero, so its slot is struck", async () => {
    const { compareAgainstPin } = await load();

    expect(compareAgainstPin(new Map(), { [LEDGER]: 13 }).improved).toEqual([[LEDGER, 13]]);
  });
});

describe("findingKey", () => {
  it("names a ledger error by code and TDD-ID, so moving rows does not change it", async () => {
    const { findingKey } = await load();

    expect(
      findingKey({
        code: "QFAI-TDDLIST-008",
        message: "Evidence anchor does not resolve for spec-0002 TDD-0001 (row 1), Status=done",
      }),
    ).toBe("QFAI-TDDLIST-008 TDD-0001");
  });

  it("keeps the message of an error with no TDD-ID, without its row and line numbers", async () => {
    const { findingKey } = await load();

    expect(
      findingKey({
        code: "TDDLIST_SELECTOR_UNRESOLVED",
        message: 'Selector "missing screenshot" was not found (row 3, Status=done)',
      }),
    ).toBe(
      'TDDLIST_SELECTOR_UNRESOLVED Selector "missing screenshot" was not found (row #, Status=done)',
    );
    expect(
      findingKey({ code: "QFAI-TEST-003", message: "describe.skip at tests/a.test.ts:41" }),
    ).toBe("QFAI-TEST-003 describe.skip at tests/a.test.ts:#");
  });
});

describe("findingsOutsidePin", () => {
  const FIXED = "QFAI-TDDLIST-008 TDD-0001";
  const ADDED = "QFAI-TDDLIST-011 TDD-0002";

  it("keys each file's errors by finding and ignores every softer severity", async () => {
    const { findingsByFile } = await load();

    const findings = findingsByFile({
      issues: [
        { file: LEDGER, severity: "error", code: "QFAI-TDDLIST-008", message: "TDD-0001 a" },
        { file: LEDGER, severity: "error", code: "QFAI-TDDLIST-008", message: "TDD-0001 b" },
        { file: LEDGER, severity: "warning", code: "QFAI-TDDLIST-011", message: "TDD-0002" },
      ],
    });

    expect([...findings]).toEqual([[LEDGER, { [FIXED]: 2 }]]);
  });

  it("reports an error the pin omits when the same change fixes another in that file", async () => {
    // The count stays at 1, so the count ratchet passes this change.
    const { compareAgainstPin, findingsOutsidePin } = await load();

    expect(compareAgainstPin(new Map([[LEDGER, 1]]), { [LEDGER]: 1 }).over).toEqual([]);
    expect(
      findingsOutsidePin(new Map([[LEDGER, { [ADDED]: 1 }]]), { [LEDGER]: { [FIXED]: 1 } }),
    ).toEqual([{ file: LEDGER, key: ADDED, n: 1, held: 0 }]);
  });

  it("reports a pinned finding reported more often than its pin", async () => {
    const { findingsOutsidePin } = await load();

    expect(
      findingsOutsidePin(new Map([[LEDGER, { [FIXED]: 3 }]]), { [LEDGER]: { [FIXED]: 2 } }),
    ).toEqual([{ file: LEDGER, key: FIXED, n: 3, held: 2 }]);
  });

  it("passes a run whose findings the pin names, fewer included", async () => {
    // A fixed finding is the count ratchet's to report, as a pin behind the tree.
    const { findingsOutsidePin } = await load();

    expect(
      findingsOutsidePin(new Map([[LEDGER, { [FIXED]: 1 }]]), {
        [LEDGER]: { [FIXED]: 2, [ADDED]: 1 },
      }),
    ).toEqual([]);
  });
});

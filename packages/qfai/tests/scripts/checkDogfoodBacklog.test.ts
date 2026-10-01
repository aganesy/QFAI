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
  diffDependentErrors: (report: {
    issues?: Array<{ code?: string; file?: string; message?: string; severity: string }>;
  }) => Array<{ code?: string; file: string; message?: string }>;
  errorsByFile: (report: unknown) => Map<string, number>;
  errorsForFile: (
    report: {
      issues?: Array<{ code?: string; file?: string; message?: string; severity: string }>;
    },
    file: string,
  ) => Array<{ code?: string; message?: string }>;
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

function report(...issues: Array<{ code?: string; file?: string; severity: string }>): unknown {
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

describe("diff-dependent findings", () => {
  // A drift error exists only while a protected file differs from the base
  // without a change request. Pinned, it reads one less on every later branch
  // and fails the ratchet there, on work that never touched the file.
  const PROTECTED =
    ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0147/03_Example.md";

  it("leaves every diff-dependent code out of the count a pin records", async () => {
    const { errorsByFile } = await load();

    const counts = errorsByFile(
      report(
        { code: "QFAI-DRIFT-001", file: PROTECTED, severity: "error" },
        { code: "QFAI-STORY-010", severity: "error" },
        { code: "QFAI-STORY-006", file: PROTECTED, severity: "error" },
      ),
    );

    expect([...counts]).toEqual([[PROTECTED, 1]]);
  });

  it("returns those errors separately, so the lane still fails on them", async () => {
    const { diffDependentErrors } = await load();

    const errors = diffDependentErrors({
      issues: [
        { code: "QFAI-DRIFT-001", file: PROTECTED, severity: "error", message: "no request" },
        { code: "QFAI-DRIFT-001", file: PROTECTED, severity: "warning", message: "no request" },
        { code: "QFAI-STORY-010", severity: "error", message: "drift" },
        { code: "QFAI-STORY-006", file: PROTECTED, severity: "error", message: "untested" },
      ],
    });

    expect(errors).toEqual([
      { code: "QFAI-DRIFT-001", file: PROTECTED, message: "no request" },
      { code: "QFAI-STORY-010", file: "(no file)", message: "drift" },
    ]);
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

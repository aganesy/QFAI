/**
 * The dogfooding lanes are a ratchet, and this is the ratchet's contract.
 *
 * The lanes report the ledger rules at `error`, and the repository carries a
 * backlog of rows written before those rules existed. A waiver cannot stand in
 * — `QFAI-WAIVER-002` refuses one whose rule is an error — so the pin is the
 * only thing between "this lane still catches a regression" and "this lane is
 * off".
 *
 * Helper comparisons and a sandbox report exercise the ratchet without
 * depending on this repository's current backlog.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
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
  const diffFindings = [
    { code: "QFAI-DRIFT-001", file: PROTECTED, severity: "error", message: "no request" },
    { code: "QFAI-STORY-010", file: LEDGER, severity: "error", message: "drift" },
  ];

  async function stageConsumer(root: string, pinnedCount: number): Promise<string> {
    const scriptDir = path.join(root, "scripts");
    const cliDir = path.join(root, "packages", "qfai", "dist", "cli");
    const reportDir = path.join(root, ".qfai", "report");
    await mkdir(scriptDir, { recursive: true });
    await mkdir(cliDir, { recursive: true });
    await mkdir(reportDir, { recursive: true });
    const script = path.join(scriptDir, "check-dogfood-backlog.mjs");
    await copyFile(path.join(repoRoot, "scripts", "check-dogfood-backlog.mjs"), script);
    await writeFile(path.join(cliDir, "index.mjs"), "process.exit(0);\n", "utf-8");
    await writeFile(
      path.join(reportDir, "validate.json"),
      JSON.stringify({
        issues: [
          { code: "E-TREE", file: CLEAN, severity: "error", message: "tree problem" },
          ...diffFindings,
        ],
      }),
      "utf-8",
    );
    await writeFile(
      path.join(scriptDir, "dogfood-backlog.json"),
      JSON.stringify({ profiles: { tdd: { [CLEAN]: pinnedCount }, sdd: { [LEDGER]: 7 } } }),
      "utf-8",
    );
    return script;
  }

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

  it("fails the lane on each diff-dependent error even when its tree count matches the pin", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dogfood-diff-"));
    try {
      const script = await stageConsumer(root, 1);
      const result = spawnSync(process.execPath, [script, "--profile", "tdd"], {
        cwd: root,
        encoding: "utf-8",
      });

      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "tdd reports 2 error(s) that depend on this branch's diff, which no pin holds:",
      );
      for (const { file, code, message } of diffFindings) {
        expect(result.stderr).toContain(`${file}: ${code}: ${message}`);
      }
      expect(result.stderr).not.toContain("past its pinned");
      expect(result.stderr).not.toContain("pin is behind the tree");
      expect(result.stderr).toContain(
        "Fix the diff-dependent findings and re-run this lane. Re-pinning will not clear these findings.",
      );
      expect(result.stderr).not.toContain(
        "node scripts/check-dogfood-backlog.mjs --profile tdd --pin",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("pins only the tree count and warns about each excluded diff-dependent error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dogfood-pin-"));
    try {
      const script = await stageConsumer(root, 9);
      const result = spawnSync(process.execPath, [script, "--profile", "tdd", "--pin"], {
        cwd: root,
        encoding: "utf-8",
      });

      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("pinned tdd at 1 error(s) across 1 file(s).");
      expect(result.stderr).toContain(
        "2 error(s) depend on this branch's diff and were not pinned.",
      );
      for (const { file, code, message } of diffFindings) {
        expect(result.stderr).toContain(`${file}: ${code}: ${message}`);
      }
      const saved: unknown = JSON.parse(
        await readFile(path.join(root, "scripts", "dogfood-backlog.json"), "utf-8"),
      );
      expect(saved).toEqual({ profiles: { tdd: { [CLEAN]: 1 }, sdd: { [LEDGER]: 7 } } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("errorsForFile", () => {
  it("names only the failing findings in the unpinned file", async () => {
    const { errorsForFile } = await load();
    const findings = errorsForFile(
      {
        issues: [
          { file: CLEAN, severity: "error", code: "E-NEW", message: "new problem" },
          { file: CLEAN, severity: "error", code: "QFAI-DRIFT-001", message: "no request" },
          { file: CLEAN, severity: "error", code: "QFAI-STORY-010", message: "drift" },
          { file: CLEAN, severity: "warning", code: "W-OLD", message: "warning" },
          { file: LEDGER, severity: "error", code: "E-OTHER", message: "other file" },
        ],
      },
      CLEAN,
    );

    expect(findings).toEqual([{ code: "E-NEW", message: "new problem" }]);
  });
});

describe("repinSteps", () => {
  // The backlog file is a pinned guard input. A message naming only `--pin`
  // leaves its digest stale, and the lint lane fails on it after the re-pin.
  async function loadRepinSteps(): Promise<(profile: string) => string> {
    const url = pathToFileURL(path.join(repoRoot, "scripts", "check-dogfood-backlog.mjs")).href;
    const guard = (await import(url)) as { repinSteps: (profile: string) => string };
    return guard.repinSteps;
  }

  it("names the backlog re-pin, then the guard bytes, then the verification bodies", async () => {
    const repinSteps = await loadRepinSteps();

    expect(repinSteps("tdd").split("\n")).toEqual([
      "  node scripts/check-dogfood-backlog.mjs --profile tdd --pin",
      "  node scripts/pin-guard-bytes.mjs",
      "  node scripts/pin-verification-bodies.mjs",
    ]);
  });

  it("names only scripts that exist", async () => {
    const repinSteps = await loadRepinSteps();

    for (const step of repinSteps("tdd").split("\n")) {
      const script = step.trim().split(" ")[1] ?? "";
      expect(existsSync(path.join(repoRoot, script)), script).toBe(true);
    }
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

/**
 * The dogfooding lanes are a ratchet, and this is the ratchet's contract.
 *
 * The lanes report the story-tree rules at `error`, and the repository carries
 * a backlog of obligations written before those rules existed. A waiver cannot
 * stand in — `QFAI-WAIVER-002` refuses one whose rule is an error — so the pin
 * is the only thing between "this lane still catches a regression" and "this
 * lane is off".
 *
 * The pin holds each finding by identity. A count per file let a change clear
 * one finding and add a different one in the same file and still pass.
 *
 * Helper comparisons and a sandbox report exercise the ratchet without
 * depending on this repository's current backlog.
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

type Issue = {
  code?: string;
  file?: string;
  message?: string;
  refs?: string[];
  severity: string;
};
type Found = Map<string, Map<string, number>>;
type Pinned = Record<string, Record<string, number>>;

type Guard = {
  findingKey: (issue: Issue) => string;
  compareAgainstPin: (
    found: Found,
    pinned: Pinned,
  ) => {
    unpinned: Array<[string, number]>;
    over: Array<[string, string, number, number]>;
    improved: Array<[string, string, number, number]>;
  };
  diffDependentErrors: (report: {
    issues?: Issue[];
  }) => Array<{ code?: string; file: string; message?: string }>;
  errorsByFile: (report: { issues?: Issue[] }) => Found;
  errorsForFile: (
    report: { issues?: Issue[] },
    file: string,
  ) => Array<{ code?: string; message?: string }>;
  invalidPinnedFiles: (pinned: Record<string, unknown>) => string[];
  pinEntry: (found: Found) => Pinned;
};

/**
 * A `file:` URL rather than the path: an absolute Windows path starts with a
 * drive letter, which an import specifier reads as a scheme.
 */
async function load(): Promise<Guard> {
  const url = pathToFileURL(path.join(repoRoot, "scripts", "check-dogfood-backlog.mjs")).href;
  return (await import(url)) as Guard;
}

const PINNED = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0001/03_Example.md";
const CLEAN = ".qfai/spec/02_business-flow/business-flow-0001/user-story-0001-0002/03_Example.md";

const report = (...issues: Issue[]): { issues: Issue[] } => ({ issues });

const untested = (id: string, file = PINNED): Issue => ({
  code: "QFAI-STORY-006",
  file,
  message: `${id} has no test`,
  refs: [id],
  severity: "error",
});

const found = (entries: Record<string, Record<string, number>>): Found =>
  new Map(Object.entries(entries).map(([file, keys]) => [file, new Map(Object.entries(keys))]));

describe("findingKey", () => {
  it("keys a finding by its code and the IDs it names, not by its wording", async () => {
    const { findingKey } = await load();

    expect(findingKey(untested("EX-0001-0001-01"))).toBe("QFAI-STORY-006 EX-0001-0001-01");
    expect(findingKey({ ...untested("EX-0001-0001-01"), message: "reworded" })).toBe(
      "QFAI-STORY-006 EX-0001-0001-01",
    );
  });

  it("distinguishes codes that name the same refs", async () => {
    const { findingKey } = await load();
    const issue = untested("EX-0001-0001-01");
    expect(findingKey({ ...issue, code: "QFAI-STORY-007" })).toBe("QFAI-STORY-007 EX-0001-0001-01");
    expect(findingKey({ ...issue, code: "QFAI-STORY-007" })).not.toBe(findingKey(issue));
  });

  it("falls back to the message only for a finding that names no ID", async () => {
    const { findingKey } = await load();

    expect(findingKey({ code: "QFAI-X", message: "no refs", severity: "error" })).toBe(
      "QFAI-X no refs",
    );
  });
});

describe("errorsByFile", () => {
  it("groups errors by file and key, and ignores every softer severity", async () => {
    const { errorsByFile } = await load();

    const result = errorsByFile({
      issues: [
        untested("EX-0001-0001-01"),
        untested("EX-0001-0001-01"),
        untested("EX-0001-0001-02"),
        { ...untested("EX-0001-0001-03"), severity: "warning" },
        { ...untested("EX-0001-0002-01", CLEAN), severity: "info" },
      ],
    });

    expect(result).toEqual(
      found({
        [PINNED]: { "QFAI-STORY-006 EX-0001-0001-01": 2, "QFAI-STORY-006 EX-0001-0001-02": 1 },
      }),
    );
  });

  it("files an error carrying no path under one bucket rather than dropping it", async () => {
    // A finding with no file still fails a lane, so it has to be ratchetable.
    const { errorsByFile } = await load();

    const result = errorsByFile({
      issues: [
        { code: "QFAI-X", message: "m", severity: "error" },
        { code: "QFAI-X", message: "m", severity: "error" },
      ],
    });
    expect(result).toEqual(found({ "(no file)": { "QFAI-X m": 2 } }));
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
    { code: "QFAI-STORY-010", file: PINNED, severity: "error", message: "drift" },
  ];

  async function stageConsumer(root: string, pinnedCount: unknown): Promise<string> {
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
      JSON.stringify({
        profiles: {
          tdd: { [CLEAN]: { "E-TREE tree problem": pinnedCount } },
          sdd: { [PINNED]: { "E-TREE tree problem": 7 } },
        },
      }),
      "utf-8",
    );
    return script;
  }

  it("refuses an invalid persisted finding count before accepting a lane", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-dogfood-invalid-"));
    try {
      const script = await stageConsumer(root, "2");
      const result = spawnSync(process.execPath, [script, "--profile", "tdd"], {
        cwd: root,
        encoding: "utf-8",
      });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("positive safe integer");
      expect(result.stdout).not.toContain("all within the pinned backlog");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("leaves every diff-dependent code out of the count a pin records", async () => {
    const { errorsByFile } = await load();

    const counts = errorsByFile(
      report(
        { code: "QFAI-DRIFT-001", file: PROTECTED, severity: "error" },
        { code: "QFAI-STORY-010", severity: "error" },
        { code: "QFAI-STORY-006", file: PROTECTED, severity: "error" },
      ),
    );

    expect(counts).toEqual(found({ [PROTECTED]: { "QFAI-STORY-006 ": 1 } }));
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
      expect(saved).toEqual({
        profiles: {
          tdd: { [CLEAN]: { "E-TREE tree problem": 1 } },
          sdd: { [PINNED]: { "E-TREE tree problem": 7 } },
        },
      });
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
          { file: PINNED, severity: "error", code: "E-OTHER", message: "other file" },
        ],
      },
      CLEAN,
    );

    expect(findings).toEqual([{ code: "E-NEW", message: "new problem" }]);
  });
});

describe("compareAgainstPin", () => {
  const PIN: Pinned = {
    [PINNED]: { "QFAI-STORY-006 EX-0001-0001-01": 1, "QFAI-STORY-006 EX-0001-0001-02": 1 },
  };

  it("passes a pinned file that reports exactly its pinned findings", async () => {
    const { compareAgainstPin } = await load();

    expect(compareAgainstPin(found(PIN), PIN)).toEqual({ unpinned: [], over: [], improved: [] });
  });

  it("fails a file that clears one finding and adds another, at the same count", async () => {
    // The case a count per file could not see: 2 -> 2, with an untested
    // example hidden behind the test written for another.
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(
      found({
        [PINNED]: { "QFAI-STORY-006 EX-0001-0001-02": 1, "QFAI-STORY-006 EX-0001-0001-12": 1 },
      }),
      PIN,
    );

    expect(verdict.over).toEqual([[PINNED, "QFAI-STORY-006 EX-0001-0001-12", 1, 0]]);
    expect(verdict.improved).toEqual([[PINNED, "QFAI-STORY-006 EX-0001-0001-01", 1, 0]]);
  });

  it("refuses three occurrences of a finding held at two", async () => {
    const { compareAgainstPin } = await load();
    const key = "QFAI-STORY-006 EX-0001-0001-01";
    expect(
      compareAgainstPin(found({ [PINNED]: { [key]: 3 } }), { [PINNED]: { [key]: 2 } }),
    ).toEqual({
      unpinned: [],
      over: [[PINNED, key, 3, 2]],
      improved: [],
    });
  });

  it("asks to reduce a finding held at two when only one remains", async () => {
    const { compareAgainstPin } = await load();
    const key = "QFAI-STORY-006 EX-0001-0001-01";
    expect(
      compareAgainstPin(found({ [PINNED]: { [key]: 1 } }), { [PINNED]: { [key]: 2 } }),
    ).toEqual({
      unpinned: [],
      over: [],
      improved: [[PINNED, key, 2, 1]],
    });
  });

  it("reports a file the pin does not name, whatever the total", async () => {
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(
      found({ ...PIN, [CLEAN]: { "QFAI-STORY-006 EX-0001-0002-01": 1 } }),
      PIN,
    );

    expect(verdict.unpinned).toEqual([[CLEAN, 1]]);
  });

  it("asks for a re-pin when a finding is cleared and nothing replaces it", async () => {
    // Without this the pin keeps the original headroom after a backfill, and
    // the finding that was fixed can silently come back.
    const { compareAgainstPin } = await load();

    const verdict = compareAgainstPin(
      found({ [PINNED]: { "QFAI-STORY-006 EX-0001-0001-02": 1 } }),
      PIN,
    );

    expect(verdict.over).toEqual([]);
    expect(verdict.improved).toEqual([[PINNED, "QFAI-STORY-006 EX-0001-0001-01", 1, 0]]);
  });

  it("reports a pinned file that has reached zero, so its slot is struck", async () => {
    const { compareAgainstPin } = await load();

    expect(compareAgainstPin(new Map(), PIN).improved).toHaveLength(2);
  });
});

describe("the pin's shape", () => {
  const invalidCounts: Array<[string, unknown]> = [
    ["string", "2"],
    ["null", null],
    ["boolean", true],
    ["array", [2]],
    ["object", { count: 2 }],
    ["zero", 0],
    ["negative", -1],
    ["fraction", 1.5],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
    ["infinity", Infinity],
    ["not a number", NaN],
  ];

  it.each(invalidCounts)("refuses a %s finding count", async (_name, value) => {
    const { invalidPinnedFiles } = await load();
    expect(invalidPinnedFiles({ [PINNED]: { "QFAI-X m": value } })).toEqual([PINNED]);
  });

  it("accepts a positive safe boundary and an empty profile", async () => {
    const { invalidPinnedFiles } = await load();
    expect(invalidPinnedFiles({ [PINNED]: { "QFAI-X m": Number.MAX_SAFE_INTEGER } })).toEqual([]);
    expect(invalidPinnedFiles({})).toEqual([]);
  });

  it("names a file still pinned as a bare count, which cannot say what it holds", async () => {
    const { invalidPinnedFiles } = await load();

    const counted = invalidPinnedFiles({
      [PINNED]: 11,
      [CLEAN]: { "QFAI-STORY-006 EX-0001-0002-01": 1 },
    });

    expect(counted).toEqual([PINNED]);
  });

  it("writes files and keys in a stable order", async () => {
    const { pinEntry } = await load();

    const entry = pinEntry(
      found({
        [PINNED]: { "QFAI-STORY-006 EX-0001-0001-02": 1, "QFAI-STORY-006 EX-0001-0001-01": 1 },
        [CLEAN]: { "QFAI-STORY-006 EX-0001-0002-01": 1 },
      }),
    );

    expect(Object.keys(entry)).toEqual([PINNED, CLEAN].sort((a, b) => a.localeCompare(b)));
    expect(Object.keys(entry[PINNED] ?? {})).toEqual([
      "QFAI-STORY-006 EX-0001-0001-01",
      "QFAI-STORY-006 EX-0001-0001-02",
    ]);
  });
});

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
 * Reached through the comparison rather than through a profile run: a case
 * that ran `validate` would assert against whatever the repository currently
 * carries, so it would pass for a lane that had been turned off entirely.
 */
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
  compareAgainstPin: (found: Found, pinned: Pinned) => {
    unpinned: Array<[string, number]>;
    over: Array<[string, string, number, number]>;
    improved: Array<[string, string, number, number]>;
  };
  errorsByFile: (report: { issues?: Issue[] }) => Found;
  errorsForFile: (
    report: { issues?: Issue[] },
    file: string,
  ) => Array<{ code?: string; message?: string }>;
  countPinnedFiles: (pinned: Record<string, unknown>) => string[];
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
      issues: [{ code: "QFAI-X", message: "m", severity: "error" }],
    });
    expect([...result.keys()]).toEqual(["(no file)"]);
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
  it("names a file still pinned as a bare count, which cannot say what it holds", async () => {
    const { countPinnedFiles } = await load();

    const counted = countPinnedFiles({
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

/**
 * Integration: iter-NN evidence-mutation audit log.
 *
 * Every destructive mutation under
 *   `.qfai/evidence/prototyping/iter-NN/*` appends a JSONL line to
 *   `.qfai/evidence/prototyping/mutation-log.jsonl` shaped
 *   `{ts, caller, path, action, priorSize, newSize}`. Includes
 *   files moved by `iterate --cycle 0 --force`. Log is git-ignored.
 */

import { lstat, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module is mocked below, and its TYPE comes from a namespace import:
// `consistent-type-imports` forbids the inline form.
import type * as FsPromises from "node:fs/promises";

import {
  MUTATION_LOG_REL,
  appendMutationLogEntry,
  logEvidenceMove,
  logEvidenceMoves,
  logEvidenceOverwrite,
  logEvidenceDelete,
} from "../../../src/core/prototyping/mutationLog.js";

/**
 * Failures no test directory can be made to produce: an append that writes
 * half its data and then fails the way a full disk does, and a log that cannot
 * be truncated.
 */
const fault = vi.hoisted(
  (): {
    partialAppend: boolean;
    untruncatable: boolean;
    appendThenAppend: string | null;
    appendThenShorten: boolean;
  } => ({
    partialAppend: false,
    untruncatable: false,
    appendThenAppend: null,
    appendThenShorten: false,
  }),
);

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    appendFile: async (...args: Parameters<typeof actual.appendFile>) => {
      const other = fault.appendThenAppend;
      if (!fault.partialAppend && other === null && !fault.appendThenShorten)
        return actual.appendFile(...args);
      const text = String(args[1]);
      await actual.appendFile(args[0], text.slice(0, Math.floor(text.length / 2)), "utf-8");
      // What a second run appending at the same time leaves behind this one.
      if (other !== null) await actual.appendFile(args[0], other, "utf-8");
      // What another recovery replacing the log leaves behind this one: a file
      // shorter than the length this write measured before it.
      if (fault.appendThenShorten) await actual.writeFile(args[0], "", "utf-8");
      throw Object.assign(new Error("ENOSPC: no space left on device, write"), {
        code: "ENOSPC",
      });
    },
    truncate: async (...args: Parameters<typeof actual.truncate>) => {
      if (fault.untruncatable) {
        throw Object.assign(new Error("EBUSY: resource busy or locked, open"), { code: "EBUSY" });
      }
      return actual.truncate(...args);
    },
    // The recovery cuts back through the descriptor it read the tail with, so
    // the fault has to reach that handle rather than the path-level call.
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      if (!fault.untruncatable) return handle;
      return Object.assign(handle, {
        truncate: async () => {
          throw Object.assign(new Error("EBUSY: resource busy or locked, ftruncate"), {
            code: "EBUSY",
          });
        },
      });
    },
  };
});

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-mutation-log-"));
});

afterEach(async () => {
  fault.partialAppend = false;
  fault.untruncatable = false;
  fault.appendThenAppend = null;
  fault.appendThenShorten = false;
  await rm(root, { recursive: true, force: true });
});

const TWO_MOVES = [
  { path: ".qfai/evidence/prototyping/screenshots/home.png", priorSize: 10 },
  { path: ".qfai/evidence/prototyping/html/home.html", priorSize: 20 },
];

async function readLogLines(): Promise<unknown[]> {
  const logAbs = path.join(root, MUTATION_LOG_REL);
  const text = await readFile(logAbs, "utf-8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function isLogEntry(entry: unknown): entry is {
  ts: string;
  caller: string;
  path: string;
  action: string;
  priorSize: number;
  newSize: number;
} {
  if (typeof entry !== "object" || entry === null) return false;
  const r = entry as Record<string, unknown>;
  return (
    typeof r.ts === "string" &&
    typeof r.caller === "string" &&
    typeof r.path === "string" &&
    typeof r.action === "string" &&
    typeof r.priorSize === "number" &&
    typeof r.newSize === "number"
  );
}

describe("mutation-log appends a JSONL entry per destructive iter-NN mutation", () => {
  it("appendMutationLogEntry creates the file with the canonical shape", async () => {
    await appendMutationLogEntry(root, {
      caller: "iterate",
      path: ".qfai/evidence/prototyping/iter-00/spec-0001/home.review.json",
      action: "move",
      priorSize: 2048,
      newSize: 0,
    });
    const entries = await readLogLines();
    expect(entries.length).toBe(1);
    const first = entries[0];
    expect(isLogEntry(first)).toBe(true);
    if (isLogEntry(first)) {
      expect(first.caller).toBe("iterate");
      expect(first.action).toBe("move");
      expect(first.priorSize).toBe(2048);
      expect(first.newSize).toBe(0);
      expect(first.path).toMatch(/iter-00/);
    }
  });

  it("logEvidenceMove records prior size and new size = 0", async () => {
    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    const src = path.join(iterDir, "home.review.json");
    await writeFile(src, "x".repeat(123), "utf-8");
    const priorSize = (await stat(src)).size;
    await logEvidenceMove(root, "iterate", path.relative(root, src), priorSize);
    const entries = await readLogLines();
    expect(entries.length).toBe(1);
    const first = entries[0];
    if (isLogEntry(first)) {
      expect(first.action).toBe("move");
      expect(first.priorSize).toBe(priorSize);
      expect(first.newSize).toBe(0);
    }
  });

  it("logEvidenceOverwrite records prior + new size from on-disk reads", async () => {
    const iterDir = path.join(root, ".qfai", "evidence", "prototyping", "iter-00");
    await mkdir(iterDir, { recursive: true });
    const file = path.join(iterDir, "settings.review.json");
    await writeFile(file, "x".repeat(10), "utf-8");
    await logEvidenceOverwrite(root, "iterate", path.relative(root, file), 10, 25);
    const entries = await readLogLines();
    const first = entries[0];
    if (isLogEntry(first)) {
      expect(first.action).toBe("overwrite");
      expect(first.priorSize).toBe(10);
      expect(first.newSize).toBe(25);
    }
  });

  it("logEvidenceDelete records prior size and new size = 0", async () => {
    await logEvidenceDelete(
      root,
      "iterate",
      ".qfai/evidence/prototyping/iter-03/spec-0001/home.review.json",
      512,
    );
    const entries = await readLogLines();
    const first = entries[0];
    if (isLogEntry(first)) {
      expect(first.action).toBe("delete");
      expect(first.priorSize).toBe(512);
      expect(first.newSize).toBe(0);
    }
  });

  it("cuts the log back to its prior length when a batch of moves is written part-way", async () => {
    // The caller puts the moves back, so an entry left behind claims a move
    // that did not stand.
    await logEvidenceMove(root, "iterate", ".qfai/evidence/prototyping/iter-00/a.json", 3);
    const logAbs = path.join(root, MUTATION_LOG_REL);
    const before = await readFile(logAbs, "utf-8");
    fault.partialAppend = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow("ENOSPC");

    expect(await readFile(logAbs, "utf-8")).toBe(before);
  });

  it("leaves no log when its first write fails part-way", async () => {
    fault.partialAppend = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow("ENOSPC");

    await expect(stat(path.join(root, MUTATION_LOG_REL))).rejects.toThrow();
  });

  it("says the log may hold part of the write when it cannot be cut back", async () => {
    await logEvidenceMove(root, "iterate", ".qfai/evidence/prototyping/iter-00/a.json", 3);
    fault.partialAppend = true;
    fault.untruncatable = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow(
      "may hold part of this write",
    );
  });

  it("leaves a log entry it did not create when the write fails", async () => {
    // A link whose target is gone reports the same absence as a path holding
    // nothing, and removed as though this call had made it, an entry that was
    // already there is destroyed by a write that failed.
    const logAbs = path.join(root, MUTATION_LOG_REL);
    await mkdir(path.dirname(logAbs), { recursive: true });
    try {
      await symlink(path.join(root, "absent-dir", "log.jsonl"), logAbs);
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow();

    expect((await lstat(logAbs)).isSymbolicLink()).toBe(true);
  });

  it("removes a target the write created behind a link, and keeps the link", async () => {
    // The append follows the link and makes the target, so a write that then
    // fails part-way leaves a file holding entries for moves the caller is
    // about to put back. The link was already there and stays.
    const logAbs = path.join(root, MUTATION_LOG_REL);
    await mkdir(path.dirname(logAbs), { recursive: true });
    const target = path.join(root, "elsewhere-log.jsonl");
    try {
      await symlink(target, logAbs);
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    fault.partialAppend = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow("ENOSPC");

    expect((await lstat(logAbs)).isSymbolicLink()).toBe(true);
    await expect(stat(target)).rejects.toThrow();
  });

  it("refuses a log path that keeps no record", async () => {
    // A link to a sink answers every append and holds nothing. Treated as a
    // successful write, the caller would report moves as logged that no entry
    // names, and would not put them back.
    const logAbs = path.join(root, MUTATION_LOG_REL);
    await mkdir(path.dirname(logAbs), { recursive: true });
    const sink = path.join(root, "sink");
    await mkdir(sink);
    try {
      await symlink(sink, logAbs, "dir");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow(
      "keeps no mutation record",
    );
  });

  it("leaves a log another recovery shortened alone", async () => {
    // Read as an empty tail, the prefix test passed and truncating to the
    // prior length extended the shortened file with zero bytes — corrupting
    // an audit log this run no longer owns.
    await logEvidenceMove(root, "iterate", ".qfai/evidence/prototyping/iter-00/a.json", 3);
    const logAbs = path.join(root, MUTATION_LOG_REL);
    const before = (await readFile(logAbs, "utf-8")).length;
    fault.appendThenShorten = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow(
      "may hold part of this write",
    );

    // Left as the other recovery wrote it, rather than extended back to the
    // length this write had measured.
    expect((await readFile(logAbs, "utf-8")).length).toBeLessThan(before);
  });

  it("keeps an entry another writer appended during this write", async () => {
    // Two runs can append to the log at once. Cutting back to the length this
    // one measured would delete the other's entry along with this batch.
    await logEvidenceMove(root, "iterate", ".qfai/evidence/prototyping/iter-00/a.json", 3);
    const logAbs = path.join(root, MUTATION_LOG_REL);
    const before = await readFile(logAbs, "utf-8");
    const other =
      '{"ts":"2026-01-01T00:00:00.000Z","caller":"certify","path":"x","action":"move"}\n';
    fault.appendThenAppend = other;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow(
      "may hold part of this write",
    );

    const after = await readFile(logAbs, "utf-8");
    expect(after.startsWith(before)).toBe(true);
    expect(after).toContain(other.trim());
  });

  it("removes the file the write created behind a chain of links", async () => {
    // Followed one hop, the intermediate link was taken for the created file:
    // the recovery removed a link that was already there and left the file the
    // write had made.
    const logAbs = path.join(root, MUTATION_LOG_REL);
    await mkdir(path.dirname(logAbs), { recursive: true });
    const middle = path.join(root, "middle-log.jsonl");
    const target = path.join(root, "final-log.jsonl");
    try {
      await symlink(middle, logAbs);
      await symlink(target, middle);
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }
    fault.partialAppend = true;

    await expect(logEvidenceMoves(root, "iterate", TWO_MOVES)).rejects.toThrow("ENOSPC");

    expect((await lstat(middle)).isSymbolicLink()).toBe(true);
    await expect(stat(target)).rejects.toThrow();
  });

  it("appending twice yields two JSONL lines (idempotent append, no rewrite)", async () => {
    await logEvidenceDelete(root, "iterate", ".qfai/evidence/prototyping/iter-01/a.json", 1);
    await logEvidenceDelete(root, "certify", ".qfai/evidence/prototyping/iter-02/b.json", 2);
    const entries = await readLogLines();
    expect(entries.length).toBe(2);
  });
});

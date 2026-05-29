/**
 * Integration: iter-NN evidence-mutation audit log.
 *
 * - TC-0012-0479: every destructive mutation under
 *   `.qfai/evidence/prototyping/iter-NN/*` appends a JSONL line to
 *   `.qfai/evidence/prototyping/mutation-log.jsonl` shaped
 *   `{ts, caller, path, action, priorSize, newSize}`. Includes
 *   files moved by `iterate --cycle 0 --force`. Log is git-ignored.
 */
// QFAI:SPEC-0012:TC-0012-0479

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MUTATION_LOG_REL,
  appendMutationLogEntry,
  logEvidenceMove,
  logEvidenceOverwrite,
  logEvidenceDelete,
} from "../../../src/core/prototyping/mutationLog.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-mutation-log-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

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

describe("TC-0012-0479: mutation-log appends a JSONL entry per destructive iter-NN mutation", () => {
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

  it("appending twice yields two JSONL lines (idempotent append, no rewrite)", async () => {
    await logEvidenceDelete(root, "iterate", ".qfai/evidence/prototyping/iter-01/a.json", 1);
    await logEvidenceDelete(root, "certify", ".qfai/evidence/prototyping/iter-02/b.json", 2);
    const entries = await readLogLines();
    expect(entries.length).toBe(2);
  });
});

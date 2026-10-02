import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  listValidateCycleKeys,
  readScaffoldAttempts,
  readValidateCycles,
  recordScaffoldAttempt,
  recordValidateCycle,
  resetScaffoldAttempt,
  resetValidateCycle,
  resolveEscalateThreshold,
  shouldEscalate,
} from "../../src/core/atdd/scaffoldEscalation.js";

let root: string;
const ac = "AC-0008-0007-01";
const bf = "BF-0008";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-counters-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("scaffold escalation per story-tree ID", () => {
  it("uses a three-cycle default and honors zero as disabled", () => {
    expect(resolveEscalateThreshold(undefined)).toBe(3);
    expect(resolveEscalateThreshold(0)).toBe(0);
    expect(shouldEscalate(2, 3)).toBe(false);
    expect(shouldEscalate(3, 3)).toBe(true);
    expect(shouldEscalate(100, 0)).toBe(false);
  });

  it("tracks AC and BF scaffold attempts independently", async () => {
    await recordScaffoldAttempt(root, ac);
    await recordScaffoldAttempt(root, ac);
    await recordScaffoldAttempt(root, bf);
    expect(await readScaffoldAttempts(root, ac)).toBe(2);
    expect(await readScaffoldAttempts(root, bf)).toBe(1);
    await resetScaffoldAttempt(root, ac);
    expect(await readScaffoldAttempts(root, ac)).toBe(0);
    expect(await readScaffoldAttempts(root, bf)).toBe(1);
  });

  it("keeps scaffold and validate cycles separate", async () => {
    await recordScaffoldAttempt(root, ac);
    await recordScaffoldAttempt(root, ac);
    expect(await readValidateCycles(root, ac)).toBe(0);
    await recordValidateCycle(root, ac);
    expect(await readValidateCycles(root, ac)).toBe(1);
    expect(await readScaffoldAttempts(root, ac)).toBe(2);
  });

  it("enumerates and resets validate keys in the AC/BF grammar", async () => {
    await recordValidateCycle(root, ac);
    await recordValidateCycle(root, bf);
    expect((await listValidateCycleKeys(root)).sort()).toEqual([ac, bf].sort());
    await resetValidateCycle(root, ac);
    expect(await listValidateCycleKeys(root)).toEqual([bf]);
  });

  it("preserves overlapping increments through the state-file lock", async () => {
    await Promise.all(Array.from({ length: 12 }, () => recordValidateCycle(root, ac)));
    expect(await readValidateCycles(root, ac)).toBe(12);
  });
});

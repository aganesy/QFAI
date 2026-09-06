/**
 * Unit: a failed exclusive create is classified by the filesystem, not by
 * the errno alone.
 *
 * POSIX reports a taken name as `EEXIST`. Windows does not: while the name is
 * being unlinked — which is every release and every reap — `CreateFile` with
 * `CREATE_NEW` returns `ERROR_ACCESS_DENIED`, which libuv maps to `EPERM`. The
 * acquire loop rethrew everything that was not `EEXIST`, so on Windows every
 * `updateState` under contention failed outright. Measured at 2 failures in 8
 * runs of `atddScaffoldEscalation.test.ts`; the CI matrix is Linux-only, so no
 * lane can reproduce it and the fault has to be injected.
 *
 * Simply widening the check to accept `EPERM` is the trap: an unwritable
 * `.qfai/` returns the same errno, and calling that contention spins to the
 * timeout and reports a permission fault as a busy lock. Both directions are
 * asserted here — the raced create must be retried, the denied one must be
 * rethrown intact — because either alone passes for a wrong implementation.
 *
 * `node:fs/promises` is mocked here rather than in `state.test.ts` because
 * `vi.mock` is file-scoped and the rest of that suite needs the real module.
 */
// QFAI:SPEC-0010:TC-0010-0012

import type * as FsPromises from "node:fs/promises";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readStateTolerant, updateState } from "../../../src/core/state.js";

type FaultMode = "off" | "raceOnce" | "denyAll";

const control = vi.hoisted(() => ({
  mode: "off" as FaultMode,
  /** How many exclusive creates the fault has already answered. */
  denials: 0,
}));

function errnoError(code: string, target: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(
    `${code}: operation not permitted, open '${target}'`,
  );
  error.code = code;
  error.syscall = "open";
  error.path = target;
  return error;
}

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    open: async (
      target: Parameters<typeof actual.open>[0],
      flags?: Parameters<typeof actual.open>[1],
      mode?: Parameters<typeof actual.open>[2],
    ) => {
      const spelled = String(target);
      // Only the exclusive creates this test is about. Every other `open` —
      // the reader, the staged write — goes through untouched.
      if (
        control.mode !== "off" &&
        flags === "wx" &&
        spelled.includes(`${path.sep}.qfai${path.sep}`)
      ) {
        const isLock = spelled.endsWith("state.json.lock");
        // `raceOnce` denies the FIRST lock create and nothing else, which is
        // the unlink window: the writability probe that follows must succeed.
        // `denyAll` denies the probe too, which is the unwritable directory.
        if (control.mode === "denyAll" || (isLock && control.denials === 0)) {
          control.denials += 1;
          throw errnoError("EPERM", spelled);
        }
      }
      return actual.open(target, flags, mode);
    },
  };
});

let root: string;

beforeEach(async () => {
  control.mode = "off";
  control.denials = 0;
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-state-acquire-"));
});

afterEach(async () => {
  control.mode = "off";
  await rm(root, { recursive: true, force: true });
});

async function bumpCounter(target: string): Promise<number> {
  return updateState(target, (existing) => {
    const raw = existing.counter;
    const next = typeof raw === "number" && Number.isInteger(raw) ? raw + 1 : 1;
    return { next: { ...existing, counter: next }, result: next };
  });
}

describe("TC-0010-0012: the state lock classifies a failed exclusive create", () => {
  it("takes the lock when the create raced an unlink (control: no fault)", async () => {
    await expect(bumpCounter(root)).resolves.toBe(1);
    expect(await readStateTolerant(root)).toMatchObject({ counter: 1 });
  });

  it("retries an EPERM the directory contradicts, and the write lands", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    control.mode = "raceOnce";

    await expect(bumpCounter(root)).resolves.toBe(1);

    // The fault fired, so the retry is what carried the write — not a path
    // that never met the error at all.
    expect(control.denials).toBe(1);
    expect(await readStateTolerant(root)).toMatchObject({ counter: 1 });
  });

  it("rethrows an EPERM the directory confirms, with the original errno", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    control.mode = "denyAll";

    // Intact: the operator gets the real fault, not "still held after 5000ms".
    await expect(bumpCounter(root)).rejects.toThrow(/cannot create state lock .*EPERM/s);
    expect(await readStateTolerant(root)).toBeNull();
  });

  it("leaves no probe file behind on either outcome", async () => {
    await mkdir(path.join(root, ".qfai"), { recursive: true });
    control.mode = "raceOnce";
    await bumpCounter(root);
    control.mode = "denyAll";
    await expect(bumpCounter(root)).rejects.toThrow(/cannot create state lock/);

    const { readdir } = await vi.importActual<typeof FsPromises>("node:fs/promises");
    const left = await readdir(path.join(root, ".qfai"));
    expect(left.filter((entry) => entry.startsWith(".qfai-lock-probe-"))).toEqual([]);
  });
});

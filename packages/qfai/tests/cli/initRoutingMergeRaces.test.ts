/**
 * The routing merge replaces a file the user owns, and two things can move
 * under it.
 *
 * `qfai init --force` reads `.qfai/assistant/manifest/agent-routing.yml`, adds
 * the phases the shipped table requires, and renames the result over it. The
 * parent directory is pinned across that, but the **file** was not: an editor
 * or a `qfai-configure` run that saved over it in between kept the directory
 * exactly as it was, and the rename replaced that newer content with a merge of
 * the older. And the replacement is a new inode created by whoever is running
 * `init`, so a manifest owned by somebody else changed hands whenever the
 * ownership could not be put back.
 *
 * `vi.mock` is hoisted to module scope, so this lives apart from
 * `init.test.ts`, where the real filesystem calls must run untouched.
 */

import { lstat, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type * as fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { isMap, isSeq, parseDocument } from "yaml";

type FsPromises = typeof fsPromises;

const { openSpy } = vi.hoisted(() => ({ openSpy: vi.fn() }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return { ...actual, open: (...args: unknown[]) => openSpy(actual, ...args) };
});

const { runInit } = await import("../../src/cli/commands/init.js");
const { captureStdout } = await import("../helpers/stdout.js");

const ROUTING_SEGMENTS = [".qfai", "assistant", "manifest", "agent-routing.yml"] as const;

function routingPath(root: string): string {
  return path.join(root, ...ROUTING_SEGMENTS);
}

function eperm(): NodeJS.ErrnoException {
  const error = new Error("simulated EPERM") as NodeJS.ErrnoException;
  error.code = "EPERM";
  return error;
}

function atddPhases(doc: ReturnType<typeof parseDocument>) {
  const routing = doc.get("routing");
  if (!isSeq(routing)) throw new Error("agent-routing.yml has no routing sequence");
  const atdd = routing.items.find((item) => isMap(item) && item.get("skill") === "qfai-atdd");
  if (!isMap(atdd)) throw new Error("agent-routing.yml has no qfai-atdd entry");
  const phases = atdd.get("phases");
  if (!isSeq(phases)) throw new Error("qfai-atdd has no phases");
  return phases;
}

/** Roll a routing table back to a package that had no ATDD `red` gate. */
function withoutAtddRedPhase(source: string): string {
  const doc = parseDocument(source);
  const phases = atddPhases(doc);
  phases.items = phases.items.filter((item) => !(isMap(item) && item.get("id") === "red"));
  return doc.toString({ lineWidth: 0 });
}

async function withStaleRouting(
  task: (root: string, stale: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-routing-race-"));
  try {
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));
    const target = routingPath(root);
    const stale = withoutAtddRedPhase(await readFile(target, "utf-8"));
    await writeFile(target, stale, "utf-8");
    await task(root, stale);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * `open` that hands back a handle whose `chown` is refused.
 *
 * The staging file is the only one the merge chowns, and this is the process
 * that may write it but may not hand it to the manifest's owner — a shared
 * working tree, or the manifest belonging to somebody other than the caller.
 */
function refuseStagingChown(actual: FsPromises) {
  return async (file: unknown, ...rest: never[]) => {
    const handle = await actual.open(file as string, ...rest);
    if (typeof file !== "string" || !/agent-routing\.yml\..*\.tmp$/.test(file)) return handle;
    return new Proxy(handle, {
      get(inner, key, receiver) {
        if (key === "chown") return () => Promise.reject(eperm());
        if (key === "stat") return () => Promise.resolve({ uid: 999_001, gid: 999_002 });
        return Reflect.get(inner, key, receiver) as unknown;
      },
    });
  };
}

beforeEach(() => {
  openSpy.mockImplementation((actual: FsPromises, ...args: never[]) => actual.open(...args));
});

describe("the routing merge under concurrent writes", () => {
  it("declines when the manifest is saved over after it was read", async () => {
    await withStaleRouting(async (root) => {
      const target = routingPath(root);
      const arrived = "# saved by qfai-configure while init was running\nrouting: []\n";
      let reads = 0;
      openSpy.mockImplementation(async (actual: FsPromises, file: unknown, ...rest: never[]) => {
        // The merge reads the manifest twice: once to build the result, once to
        // confirm it is still the file it read. Between them, somebody saves.
        if (file === target) {
          reads += 1;
          if (reads === 2) await actual.writeFile(target, arrived, "utf-8");
        }
        return actual.open(file as string, ...rest);
      });

      const output = await captureStdout(() =>
        runInit({ dir: root, force: true, dryRun: false, yes: true }),
      );

      expect(await readFile(target, "utf-8")).toBe(arrived);
      expect(output).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(output).toContain("changed while the merge was being prepared");
      expect(output).not.toContain("I-ROUTING-PHASE-MERGED");
    });
  });

  it("declines rather than taking over a manifest whose owner it cannot restore", async () => {
    await withStaleRouting(async (root, stale) => {
      const target = routingPath(root);
      openSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        refuseStagingChown(actual)(...args),
      );

      const output = await captureStdout(() =>
        runInit({ dir: root, force: true, dryRun: false, yes: true }),
      );

      expect(await readFile(target, "utf-8")).toBe(stale);
      expect(output).toContain("W-ROUTING-MANIFEST-UNREADABLE");
      expect(output).toContain("cannot restore that ownership");
      expect(output).not.toContain("I-ROUTING-PHASE-MERGED");
    });
  });

  it("leaves no staging file behind when it declines", async () => {
    await withStaleRouting(async (root) => {
      const target = routingPath(root);
      openSpy.mockImplementation((actual: FsPromises, ...args: never[]) =>
        refuseStagingChown(actual)(...args),
      );

      await captureStdout(() => runInit({ dir: root, force: true, dryRun: false, yes: true }));

      const leftovers = (await readdir(path.dirname(target))).filter((name) =>
        name.endsWith(".tmp"),
      );
      expect(leftovers).toEqual([]);
      expect((await lstat(target)).isFile()).toBe(true);
    });
  });
});

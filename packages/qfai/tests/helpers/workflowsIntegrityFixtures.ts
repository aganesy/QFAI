/**
 * Shared fixtures for the installed shipped-workflow drift suites.
 *
 * The adopter tree is produced by a real `qfai init` into a pooled temp
 * directory, so `.github/workflows/` and the install-provenance record hold
 * whatever the shipped write path actually produces rather than a hand-built
 * imitation of it. On top of that the mutations the drift suites need are
 * exposed: hand-edit an installed workflow, delete one, and make one
 * unreadable. One renderer joins a finding set's operator-visible fields for
 * the drift suites' negative sweeps. Pure test plumbing — no assertions live
 * here.
 *
 * The temp-directory pool is handed out by `useAdopterTreePool()` rather than
 * registered at this module's top level: `useTempDirPool` calls `afterEach`,
 * and a hook registered during module evaluation belongs to whichever suite
 * imported the module first. That is only invisible while vitest's
 * `isolate: true` default holds, and neither config file pins it. Every other
 * suite in this family calls the pool factory at its own top level.
 */
import { appendFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { runInit } from "../../src/cli/commands/init.js";
import type { DoctorCheck } from "../../src/core/doctor.js";
import { useTempDirPool } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";

/** The adopter-tree-relative POSIX directory QFAI installs workflows into. */
export const ADOPTER_WORKFLOWS_DIR = ".github/workflows";

/**
 * Every field an operator can read, of EVERY finding in the set, as one string:
 * `title`, `message`, and the SERIALIZED `details` of each.
 *
 * FOR NEGATIVE SWEEPS ONLY (`not.toContain` / `not.toMatch`). Two properties
 * make it safe there and unsafe anywhere else:
 *   - it asserts nothing about which keys exist, so a row that pins the
 *     `details` key set by `toEqual` is free to do so without contradicting a
 *     caller here;
 *   - payload growth can only ADD haystack, so a future key can widen a
 *     caller's needle into a false RED but can never narrow it into a false
 *     GREEN.
 * The whole SET is mapped, not `findings[0]`: `addCheck` is a bare push with no
 * dedup, so a second registration carrying different prose would otherwise be
 * invisible to the sweep.
 *
 * `JSON.stringify` rather than joining values: the KEY NAMES are part of what
 * an operator reads under `qfai doctor --format json`, so a key literally
 * called `nextActions` must be visible to a sweep even if its value alone were
 * clean.
 *
 * KNOWN LIMIT: the three fields are named explicitly, so a RENAMED field
 * breaks compilation (the parameter is `DoctorCheck`) while an ADDED top-level
 * field is silently unswept. A new rendered field on `DoctorCheck` must be
 * added here in the same commit.
 *
 * `spec0006WorkflowsIntegrity.provenanceGate.test.ts` (TDD-0033) carries the
 * original of this expression inline and is deliberately NOT edited to call it:
 * that row sits at `refactor` with three reviewer PASSes, and a DRY win does
 * not justify invalidating a completed review. This helper is byte-equivalent
 * to that expression for a single-finding set — adopt it there the next time
 * that file is touched for its own reasons.
 */
export function renderFindingSurface(findings: readonly DoctorCheck[]): string {
  return findings
    .map(
      (finding) => `${finding.title}\n${finding.message}\n${JSON.stringify(finding.details ?? {})}`,
    )
    .join("\n");
}

/** Absolute path of one installed shipped workflow inside an adopter tree. */
export function adopterWorkflowPath(dir: string, name: string): string {
  return path.join(dir, ".github", "workflows", name);
}

export type AdopterTreePool = {
  /** Allocates an empty pooled temp directory. */
  newTempDir: () => Promise<string>;
  /**
   * Allocates a pooled temp directory carrying a real `qfai init` install.
   *
   * `preInit` runs against the still-empty directory, before the install. It
   * exists because some adopter-tree states are only reachable BEFORE the
   * installer runs: a file the create-only copy has to SKIP must predate the
   * copy, and that is the only way to produce the `adopter-owned` state of the
   * shipped-workflows contract (a colliding name with no provenance entry).
   * Writing the file afterwards would produce a different state — the copy
   * would already have written its own bytes and recorded the name.
   *
   * A callback here rather than a `runInit` call in the calling suite: the
   * install options are this module's single decision about how the adopter
   * tree is produced ("a real `qfai init`", per the header). A suite that
   * called `runInit` itself would own a second copy of that decision, and the
   * two could drift apart silently — the tree under one suite's assertions
   * would stop being the tree under every sibling's.
   */
  seedAdopterTree: (preInit?: (dir: string) => Promise<void>) => Promise<string>;
};

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite and
 * returns its allocators. Call this at the calling test file's top level.
 */
export function useAdopterTreePool(): AdopterTreePool {
  const newTempDir = useTempDirPool("qfai-wfint-");
  return {
    newTempDir,
    seedAdopterTree: async (preInit?: (dir: string) => Promise<void>): Promise<string> => {
      const dir = await newTempDir();
      await preInit?.(dir);
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
      return dir;
    },
  };
}

/**
 * Appends one comment line to an installed shipped workflow — the smallest
 * edit that still changes the file's content after newline normalization.
 */
export async function editShippedWorkflow(dir: string, name: string): Promise<void> {
  await appendFile(adopterWorkflowPath(dir, name), "# adopter hand edit\n", "utf-8");
}

/** Removes an installed shipped workflow from the adopter tree. */
export async function deleteShippedWorkflow(dir: string, name: string): Promise<void> {
  await rm(adopterWorkflowPath(dir, name), { force: true });
}

/**
 * Removes the whole install-provenance record from the adopter tree, leaving
 * every installed file on disk. This is the state of an adopter who installed
 * before the record existed: no entry for any name, so every shipped name is
 * `adopter-owned` under the shipped-workflows contract's §3 enum.
 *
 * The record path is duplicated from `src/shared/provenance.ts`, whose
 * `PROVENANCE_SEGMENTS` is module-private. The duplication is safe in the
 * direction that matters: if the record ever moves, this `rm` deletes nothing,
 * the record survives, and every caller's "the record now reads empty"
 * precondition FAILS rather than passing on an unmutated tree. Callers assert
 * that precondition through `readInstallProvenance` for exactly that reason.
 */
export async function deleteInstallProvenanceRecord(dir: string): Promise<void> {
  await rm(path.join(dir, ".qfai", "install-provenance.json"), { force: true });
}

/**
 * Makes every read of one installed shipped workflow fail while its NAME
 * survives in the adopter tree, by destroying the file and putting a
 * directory of the same name in its place (`EISDIR`).
 *
 * The file itself is destroyed: only the NAME survives a directory read, and
 * it now names a directory. A subsequent `qfai init` neither repairs that nor
 * fails on it (measured, not assumed): the root template copy is create-only
 * regardless of `--force` — force reaches only `assistant/skills` and the
 * integration wrappers — and its existence probe is an `access()` that a
 * directory satisfies, so the name is SKIPPED, the directory survives, and no
 * provenance entry is added for it. A caller that needs a real file back at
 * that path must allocate a fresh tree instead of re-installing over this one.
 *
 * The realistic form of this state is a transient `EPERM` / `EBUSY` from an
 * editor lock or an AV scanner on Windows, which cannot be arranged
 * reliably from a test. `EISDIR` is the portable stand-in: what the reader
 * has to distinguish is `ENOENT` from every other code, so any non-`ENOENT`
 * code exercises the same branch.
 */
export async function makeShippedWorkflowUnreadable(dir: string, name: string): Promise<void> {
  const target = adopterWorkflowPath(dir, name);
  await rm(target, { force: true });
  await mkdir(target, { recursive: true });
}

/**
 * Shared fixtures for the installed shipped-workflow drift suites.
 *
 * The adopter tree is produced by a real `qfai init` into a pooled temp
 * directory, so `.github/workflows/` and the install-provenance record hold
 * whatever the shipped write path actually produces rather than a hand-built
 * imitation of it. On top of that the mutations the drift suites need are
 * exposed: hand-edit an installed workflow, delete one, make one unreadable,
 * and drop one name's provenance entry. Pure test plumbing — no assertions
 * live here.
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
import { readInstallProvenance, writeInstallProvenance } from "../../src/shared/provenance.js";
import { useTempDirPool } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";

/** The adopter-tree-relative POSIX directory QFAI installs workflows into. */
export const ADOPTER_WORKFLOWS_DIR = ".github/workflows";

/** Absolute path of one installed shipped workflow inside an adopter tree. */
export function adopterWorkflowPath(dir: string, name: string): string {
  return path.join(dir, ".github", "workflows", name);
}

export type AdopterTreePool = {
  /** Allocates an empty pooled temp directory. */
  newTempDir: () => Promise<string>;
  /** Allocates a pooled temp directory carrying a real `qfai init` install. */
  seedAdopterTree: () => Promise<string>;
};

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite and
 * returns its allocators. Call this at the calling test file's top level.
 */
export function useAdopterTreePool(): AdopterTreePool {
  const newTempDir = useTempDirPool("qfai-wfint-");
  return {
    newTempDir,
    seedAdopterTree: async (): Promise<string> => {
      const dir = await newTempDir();
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
 * Leaves an installed shipped workflow PRESENT in the adopter tree but makes
 * every read of it fail, by putting a directory of the same name in its place
 * (`EISDIR`).
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

/**
 * Drops one name's entry from the adopter tree's install-provenance record,
 * leaving every other entry untouched. Rebuilt rather than deleted in place
 * so the record stays the shape the sanctioned writer round-trips.
 *
 * Throws when the name has no entry to drop. `readInstallProvenance` is
 * fail-safe by contract — an absent or malformed record reads as an empty
 * one — so without this guard the helper would filter nothing, write, and
 * return normally, and a suite asserting "this name is not compared" would
 * pass because no name was ever recorded rather than because the entry was
 * removed.
 */
export async function dropProvenanceEntry(dir: string, name: string): Promise<void> {
  const record = await readInstallProvenance(dir);
  if (record.workflows[name] === undefined) {
    throw new Error(
      `dropProvenanceEntry: '${name}' has no install-provenance entry under ${dir}; ` +
        `recorded names: ${Object.keys(record.workflows).join(", ") || "(none)"}`,
    );
  }
  const remaining = Object.fromEntries(
    Object.entries(record.workflows).filter(([entryName]) => entryName !== name),
  );
  await writeInstallProvenance(dir, { workflows: remaining });
}

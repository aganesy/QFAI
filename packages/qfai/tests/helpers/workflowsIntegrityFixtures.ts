/**
 * Shared fixtures for the installed shipped-workflow drift suites.
 *
 * The adopter tree is produced by a real `qfai init` into a pooled temp
 * directory, so `.github/workflows/` and the install-provenance record hold
 * whatever the shipped write path actually produces rather than a hand-built
 * imitation of it. On top of that the three mutations the drift suites need
 * are exposed: hand-edit an installed workflow, delete one, and drop one
 * name's provenance entry. Pure test plumbing — no assertions live here.
 */
import { appendFile, rm } from "node:fs/promises";
import path from "node:path";

import { runInit } from "../../src/cli/commands/init.js";
import { readInstallProvenance, writeInstallProvenance } from "../../src/shared/provenance.js";
import { useTempDirPool } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";

const newTempDir = useTempDirPool("qfai-wfint-");

/** The adopter-tree-relative POSIX directory QFAI installs workflows into. */
export const ADOPTER_WORKFLOWS_DIR = ".github/workflows";

/** Absolute path of one installed shipped workflow inside an adopter tree. */
export function adopterWorkflowPath(dir: string, name: string): string {
  return path.join(dir, ".github", "workflows", name);
}

/** A pooled temp directory carrying a real `qfai init` install. */
export async function seedAdopterTree(): Promise<string> {
  const dir = await newTempDir();
  await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
  return dir;
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
 * Drops one name's entry from the adopter tree's install-provenance record,
 * leaving every other entry untouched. Rebuilt rather than deleted in place
 * so the record stays the shape the sanctioned writer round-trips.
 */
export async function dropProvenanceEntry(dir: string, name: string): Promise<void> {
  const record = await readInstallProvenance(dir);
  const remaining = Object.fromEntries(
    Object.entries(record.workflows).filter(([entryName]) => entryName !== name),
  );
  await writeInstallProvenance(dir, { workflows: remaining });
}

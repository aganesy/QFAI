#!/usr/bin/env node
/**
 * The Skeleton phase's smoke script for the `qfai` entrypoint.
 *
 * `.qfai/assistant/catalog/structure.md` declares one entrypoint and the boot
 * obligation it answers: `qfai` -> `US-0003-0001`, workspace initialization.
 * This script starts that entrypoint the way a user does — the built CLI over
 * stdio, in a directory it owns — and asserts that the initialization surface
 * was reached.
 *
 * **What it asserts, and why that and not "it ran".** A process with no `init`
 * surface still exits: it prints usage, or an unknown-command error, and a
 * script that accepted any output would pass on exactly the missing seam this
 * phase exists to detect. So the assertion is a property only the real surface
 * produces — the dry-run plan, naming the count of paths and the configuration
 * file `init` writes. Neither appears in usage or in an unknown-command error.
 *
 * It asserts reachability alone. What `init` writes, and whether it writes it
 * correctly, belongs to that story's own test cases; asserting it here would be
 * the predicate the phase forbids.
 *
 * `--dry-run` because the phase may not leave a tree behind, and because a real
 * write would make the assertion depend on the filesystem rather than on the
 * surface having answered.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// scripts/<this file> -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(repoRoot, "packages", "qfai", "dist", "cli", "index.mjs");

/** A path only `qfai init` writes; usage and an unknown command name neither. */
const SURFACE_MARKERS = ["would write:", "qfai.config.yaml"];

let workspace;
try {
  // Outside the repository on purpose: run inside it, and the CLI reads this
  // repository's own git configuration rather than the empty project it is
  // supposed to be initializing.
  workspace = await mkdtemp(path.join(os.tmpdir(), "qfai-skeleton-"));

  const output = execFileSync(process.execPath, [CLI, "init", "--dry-run"], {
    cwd: workspace,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const missing = SURFACE_MARKERS.filter((marker) => !output.includes(marker));
  if (missing.length > 0) {
    process.stderr.write(
      `smoke-qfai-cli: the initialization surface was not reached — the plan named ` +
        `none of: ${missing.join(", ")}\n${output}`,
    );
    process.exitCode = 1;
  } else {
    const planned = /would write: (\d+)/.exec(output)?.[1] ?? "0";
    process.stdout.write(
      `smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned ${planned} path(s)\n`,
    );
  }
} catch (error) {
  // A non-zero exit from the CLI, or a failure to start it at all. Either way
  // the entrypoint did not answer, and the phase may not record that it did.
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`smoke-qfai-cli: the entrypoint did not answer — ${detail}\n`);
  process.exitCode = 1;
} finally {
  // On every exit path: the script owns the directory it made, and the next
  // cycle must not read what this one left.
  if (workspace !== undefined) {
    await rm(workspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
  }
}

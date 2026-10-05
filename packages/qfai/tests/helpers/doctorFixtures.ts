/**
 * Shared fixtures for the doctor suites: an adopter tree produced by a real
 * `qfai init` into a pooled temp directory, and the repairs that leave only the
 * finding a suite is about.
 *
 * The temp-directory pool is handed out by `useAdopterTreePool()` rather than
 * registered at this module's top level: `useTempDirPool` calls `afterEach`,
 * and a hook registered during module evaluation belongs to whichever suite
 * imported the module first.
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { runInit } from "../../src/cli/commands/init.js";
import { useTempDirPool } from "./shippedWorkflowFixtures.js";
import { captureStdout } from "./stdout.js";

export type AdopterTreePool = {
  /** Allocates a pooled temp directory carrying a real `qfai init` install. */
  seedAdopterTree: () => Promise<string>;
};

/**
 * Registers an afterEach-scoped temp-directory pool for the calling suite and
 * returns its allocator. Call this at the calling test file's top level.
 */
export function useAdopterTreePool(): AdopterTreePool {
  const newTempDir = useTempDirPool("qfai-doctor-");
  return {
    seedAdopterTree: async (): Promise<string> => {
      const dir = await newTempDir();
      await captureStdout(() => runInit({ dir, force: false, dryRun: false, yes: true }));
      return dir;
    },
  };
}

/**
 * Repairs the warnings a bare `qfai init` tree carries, so a suite asserting a
 * whole-run total sees only the finding it seeded: the retired prompt directory,
 * and the empty `traceability.testGlobs` list.
 *
 * The config edit asserts its needle occurs exactly once and throws otherwise, so
 * a fixture that stopped applying fails here rather than at the assertion.
 */
export async function quietUnrelatedWarnings(dir: string): Promise<void> {
  await rm(path.join(dir, ".qfai", "assistant", "prompt"), { recursive: true, force: true });

  const configPath = path.join(dir, "qfai.config.yaml");
  const config = await readFile(configPath, "utf-8");
  const needle = "    testFileGlobs: []";
  const occurrences = config.split(needle).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `quietUnrelatedWarnings: expected exactly 1 "${needle}" in ${configPath}, found ${occurrences}`,
    );
  }
  await writeFile(
    configPath,
    config.replace(needle, () => "    testFileGlobs:\n      - tests/**/*.test.ts"),
    "utf-8",
  );
}

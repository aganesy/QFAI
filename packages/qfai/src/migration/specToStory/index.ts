import { isMigrationStepNumber, runStep } from "./harness.js";

/** Run one ordered spec-to-story migration step from the current project root. */
export async function runMigrationStep(step: number, argv: string[]): Promise<number> {
  if (!isMigrationStepNumber(step)) throw new TypeError("Step must be an integer from 1 to 12");
  if (!Array.isArray(argv) || !argv.every((argument) => typeof argument === "string")) {
    throw new TypeError("Arguments must be an array of strings");
  }
  return runStep(step, argv, {
    cwd: process.cwd(),
    stdout: process.stdout,
    stderr: process.stderr,
  });
}

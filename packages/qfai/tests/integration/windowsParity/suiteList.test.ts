/**
 * Integration: the Windows job runs the package's `test:windows-parity` list and nothing else,
 * and runs it under a temp root whose name contains a space.
 */
import { describe, expect, it } from "vitest";

import {
  SCRIPT,
  WINDOWS_JOB,
  firstTestStep,
  job,
  runOf,
  stepsOf,
  suiteList,
  testCommands,
} from "./ownCi.js";

// The workflow control-core suites, the init suites, and the named provenance, gitignore and
// migration tests. The literal is the declaration this case holds the script to.
const DECLARED_SUITES = [
  "tests/unit/workflow/",
  "tests/integration/workflow/",
  "tests/cli/init",
  "tests/integration/init/",
  "tests/core/assistantAssetProvenance.test.ts",
  "tests/unit/shared/provenanceLockConfirm.test.ts",
  "tests/core/gitignoreGovernanceRecords.test.ts",
  "tests/core/gitignoreMatcher.test.ts",
  "tests/validators/assistantTreeMigration.test.ts",
];

function envOf(step: Record<string, unknown>): Record<string, unknown> {
  const env = step.env;
  return typeof env === "object" && env !== null && !Array.isArray(env) ? { ...env } : {};
}

describe("the Windows job's suite list", () => {
  // QFAI:AC-0002-0024-01
  // QFAI:EX-0002-0024-01
  it("The Windows job runs exactly the declared suite list", () => {
    const windows = job(WINDOWS_JOB);

    expect(windows["runs-on"]).toBe("windows-latest");
    expect(testCommands(windows)).toEqual([`pnpm -C packages/qfai ${SCRIPT}`]);
    expect([...suiteList()].sort()).toEqual([...DECLARED_SUITES].sort());
  });

  // QFAI:EX-0002-0024-02
  it("The job points TEMP and TMP at a directory with a space", () => {
    const steps = stepsOf(job(WINDOWS_JOB));
    const testAt = firstTestStep(job(WINDOWS_JOB));
    expect(testAt).toBeGreaterThan(0);

    const { TEMP, TMP } = envOf(steps[testAt] ?? {});
    expect(typeof TEMP === "string" && /\S \S/.test(TEMP), "TEMP names a path with a space").toBe(
      true,
    );
    expect(TMP).toBe(TEMP);
    const creators = steps.slice(0, testAt).filter((step) => {
      const root = envOf(step).QFAI_TEMP_ROOT;
      return root === TEMP && /New-Item -ItemType Directory\b/.test(runOf(step));
    });
    expect(creators, "one earlier step creates that directory").toHaveLength(1);
  });
});

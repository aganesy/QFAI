/**
 * Integration: a workflow an earlier release shipped is listed by `qfai init`
 * and never removed, whether or not the adopter edited it.
 *
 * The release ships no retired name yet, so the name list is replaced with one
 * that holds a retired name.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/shared/shippedWorkflowNames.js", () => ({
  SHIPPED_WORKFLOW_NAMES: new Set(["qfai-validate.yml", "qfai-tests.yml", "qfai-docs.yml"]),
  RETIRED_WORKFLOW_NAMES: new Set(["qfai-retired.yml"]),
}));

const { runInit } = await import("../../src/cli/commands/init.js");
const { useTempDirPool } = await import("../helpers/shippedWorkflowFixtures.js");
const { captureStdout } = await import("../helpers/stdout.js");

const newTempDir = useTempDirPool("qfai-wfretired-");

describe("a formerly shipped workflow is listed and kept", () => {
  // QFAI:AC-0002-0007-03
  // QFAI:EX-0002-0007-06
  it("lists an unchanged and a hand-edited copy and removes neither", async () => {
    for (const body of ["name: retired\n", "name: retired\n# hand edit\n"]) {
      const dir = await newTempDir();
      const file = path.join(dir, ".github", "workflows", "qfai-retired.yml");
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");

      const output = await captureStdout(() =>
        runInit({ dir, force: false, dryRun: false, yes: true }),
      );

      expect(output).toContain("  .github/workflows/qfai-retired.yml");
      expect(await readFile(file, "utf-8")).toBe(body);
    }
  });
});

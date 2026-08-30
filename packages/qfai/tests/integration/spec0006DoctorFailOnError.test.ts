/**
 * The true direction of `shouldFailDoctor`'s `--fail-on error` branch.
 *
 * `CR-20260811-0001`, approved 2026-08-23, **option A**. The measurement that raised it: mutating
 *
 * ```ts
 * if (failOn === "error") {
 *   return summary.error > 0;
 * }
 * ```
 *
 * to `return false` left the **entire doctor closure green** — twenty file selectors, 87 tests, exit 0,
 * identical to the clean run. Every suite exercising `--fail-on error` did so on a tree expected to
 * pass, which the mutant also satisfies. So the branch that turns a real error into a non-zero exit —
 * the default failure mode of `qfai doctor`, and the one a CI gate depends on — had no oracle at all.
 *
 * The nearest existing rows cannot reach it: `TC-0006-0033` sits on the `--fail-on warning` branch, a
 * different `return`; `TC-0006-0029` asserts this branch returning **false**, which is the direction
 * the mutant preserves.
 *
 * `shouldFailDoctor` is not exported, so this drives it the way an operator does — a real tree, a real
 * run — and asserts both directions against one fixture, because "exits 1" proves nothing unless the
 * same tree exited 0 a moment earlier.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { runDoctorText, useAdopterTreePool } from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

const AGENTS_DIR = path.join(".qfai", "assistant", "agents");

/** Every canonical agent markdown file the frontmatter check reads, by the same rule it uses. */
async function agentFiles(dir: string): Promise<string[]> {
  const entries = await readdir(path.join(dir, AGENTS_DIR), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort();
}

// QFAI:SPEC-0006:TC-0006-0036
describe("TC-0006-0036: an error-severity finding exits non-zero under `--fail-on error`", () => {
  it(
    "exits 0 while the tree carries no error, and 1 the moment it carries one",
    { timeout: 60000 },
    async () => {
      const dir = await pool.seedAdopterTree();

      // Direction 1 — the tree a passing run is taken on. This is also the direction every other
      // `--fail-on error` suite already covered, and on its own it is exactly what the mutant satisfies.
      const before = await createDoctorData({ startDir: dir, rootExplicit: true });
      expect(
        before.summary.error,
        "a freshly initialised tree must carry no error-severity finding, or direction 2 is not attributable",
      ).toBe(0);
      const clean = await runDoctorText(dir, "error");
      expect(clean.exitCode, "no error finding, so `--fail-on error` has nothing to fail on").toBe(
        0,
      );

      // Plant exactly one error: an agent file whose frontmatter does not parse. Chosen because
      // `agents.frontmatter` is error-severity by construction and needs no other part of the tree to
      // be wrong, so the delta below has one cause.
      const files = await agentFiles(dir);
      expect(
        files.length,
        "the seeded tree must ship agent files for this to corrupt one",
      ).toBeGreaterThan(0);
      const victim = path.join(dir, AGENTS_DIR, files[0] ?? "");
      const original = await readFile(victim, "utf-8");
      await writeFile(
        victim,
        "---\nname: [unterminated\ndescription: broken\n---\n\nbody\n",
        "utf-8",
      );

      // Direction 2 — the one that had no oracle.
      const after = await createDoctorData({ startDir: dir, rootExplicit: true });
      expect(
        after.summary.error,
        "the plant must actually produce an error finding, or the exit code below proves nothing",
      ).toBeGreaterThan(0);
      const failing = await runDoctorText(dir, "error");
      expect(
        failing.exitCode,
        "an error-severity finding under `--fail-on error` MUST exit non-zero — inverting this branch " +
          "silently turns every erroring tree into exit 0, which is the failure a CI gate exists to catch",
      ).toBe(1);

      // And back, so the exit code is shown to track the finding rather than the number of runs.
      await writeFile(victim, original, "utf-8");
      const restored = await runDoctorText(dir, "error");
      expect(
        restored.exitCode,
        "removing the error must return the exit code to 0; a branch that only ever fails is not this branch",
      ).toBe(0);
    },
  );
});

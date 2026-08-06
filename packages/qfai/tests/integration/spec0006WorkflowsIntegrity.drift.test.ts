/**
 * Integration: installed shipped-workflow drift advisory (`qfai doctor`).
 *
 * Covers the detection half of the adopter drift channel: an installed
 * shipped GitHub Actions workflow whose content no longer matches the copy
 * inside the installed package is surfaced by the `workflows.integrity`
 * check at severity `info`, naming the stale file by its adopter-tree
 * relative path. See `.qfai/contracts/cli/qfai-doctor.md`
 * (`workflows.integrity`) and `.qfai/contracts/cli/shipped-workflows.md`.
 *
 * The observation point is `createDoctorData` rather than the check builder,
 * so a check that exists but is never registered fails here instead of
 * passing invisibly.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
// QFAI:SPEC-0006:TC-0006-0027

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { editShippedWorkflow, seedAdopterTree } from "../helpers/workflowsIntegrityFixtures.js";

describe(
  "TC-0006-0027 (TDD-0029): edited installed shipped workflow yields a workflows.integrity info advisory naming the stale path",
  { timeout: 60000 },
  () => {
    it("reports the hand-edited workflow as an info advisory naming its adopter-relative path", async () => {
      const dir = await seedAdopterTree();
      await editShippedWorkflow(dir, "qfai-tests.yml");

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "workflows.integrity");

      expect(check, "qfai doctor must emit a workflows.integrity check").toBeDefined();
      expect(
        check?.severity,
        "an edited installed shipped workflow is an info-severity advisory",
      ).toBe("info");
      expect(
        `${check?.message ?? ""} ${JSON.stringify(check?.details ?? {})}`,
        "the advisory must name the stale file's adopter-tree-relative path",
      ).toContain(".github/workflows/qfai-tests.yml");
    });
  },
);

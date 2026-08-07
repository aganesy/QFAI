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
 * The primary observation point is `createDoctorData` rather than the reader,
 * so a finding that is produced but never registered fails here instead of
 * passing invisibly. The one exception is the packaged-operand override leg,
 * which the registration site does not pass and which therefore has to be
 * observed on the reader itself; that is stated at the assertion.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
// QFAI:SPEC-0006:TC-0006-0027

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  adopterWorkflowPath,
  deleteShippedWorkflow,
  editShippedWorkflow,
  makeShippedWorkflowUnreadable,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/**
 * The `details.modified` payload as a string array, or `undefined` when the
 * key is absent or not an all-string array. Returning `undefined` instead of
 * throwing keeps the caller's assertion the thing that fails.
 */
function readModifiedPaths(details: Record<string, unknown> | undefined): string[] | undefined {
  const value = details?.["modified"];
  if (!Array.isArray(value)) {
    return undefined;
  }
  const paths = value.filter((entry): entry is string => typeof entry === "string");
  return paths.length === value.length ? paths : undefined;
}

describe(
  "TC-0006-0027 (TDD-0029): edited installed shipped workflow yields a workflows.integrity info advisory naming the stale path",
  { timeout: 60000 },
  () => {
    it("reports the hand-edited workflow as an info advisory naming its adopter-relative path", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, "qfai-tests.yml");

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "workflows.integrity");

      expect(check, "qfai doctor must emit a workflows.integrity check").toBeDefined();
      // The TC Verify says the check fires 「1 件」, which counts EMISSIONS of
      // the check, not entries in `modified`. `addCheck` is a bare push with
      // no dedup and the lookup above is a `find`, so a second registration of
      // the same id would be invisible to every other assertion here.
      expect(
        data.checks.filter((entry) => entry.id === "workflows.integrity"),
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);
      expect(
        check?.severity,
        "an edited installed shipped workflow is an info-severity advisory",
      ).toBe("info");

      // Asserted separately from `message` below: fusing the two into one
      // haystack would pass with an empty message, and this TC puts its
      // path-naming requirement on the message.
      const modified = readModifiedPaths(check?.details);
      expect(modified, "details.modified must be a string array").toBeDefined();
      expect(modified, "details.modified must name the stale file's relative path").toContain(
        `${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`,
      );
      // The TC Verify says the check fires for one file. Without this pin an
      // implementation that reported every installed workflow would pass.
      expect(modified?.length, "exactly one installed workflow was edited").toBe(1);

      expect(
        check?.message,
        "the advisory message must name the stale file's adopter-tree-relative path",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`);
      expect(
        check?.message,
        "the message is the only human surface (title has no consumer), so it must read as prose",
      ).toMatch(/differ from the packaged copy/);
    });

    // Covers the two failure classes the reader has to keep apart. Before the
    // discriminated file state they were one `undefined`, so a recorded file
    // that could not be read produced exactly the output of one that matched:
    // nothing at all, and the operator read a clean check on a stale file.
    //
    // Both legs are asserted in one tree on purpose. Each is the other's
    // discriminator: folding `unreadable` back into `absent` drops
    // `qfai-tests.yml` from the list, and folding `absent` into `unreadable`
    // adds `qfai-validate.yml` to it. Asserting only one leg leaves the
    // opposite edit invisible.
    //
    // Only two names are recorded by `qfai init`, so this tree spends both on
    // the failure classes; the byte-identical-name leg is pinned by the first
    // `it` above, whose `modified` holds one entry while two are recorded.
    it("reports a present-but-unreadable installed workflow while a deleted one stays silent", async () => {
      const dir = await pool.seedAdopterTree();
      await makeShippedWorkflowUnreadable(dir, "qfai-tests.yml");
      await deleteShippedWorkflow(dir, "qfai-validate.yml");

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "workflows.integrity");

      expect(check, "an unreadable installed workflow must still produce a finding").toBeDefined();

      const modified = readModifiedPaths(check?.details);
      expect(modified, "details.modified must be a string array").toBeDefined();
      // Deep equality already pins length, membership and order, and its diff
      // prints any extra entry — no separate length assertion is needed here.
      expect(
        modified,
        "the unreadable file must be reported, and the deleted one must not be",
      ).toEqual([`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`]);
    });

    // Observed through the reader rather than `createDoctorData`, because the
    // registration site passes no override: an unexercised override that is
    // silently wrong reads as "no drift" for every later row that depends on
    // it. Two controlled packaged trees over one adopter tree show that the
    // parameter is the operand actually read.
    it("reads the packaged operand from the override, and only compares recorded names", async () => {
      const dir = await pool.seedAdopterTree();
      const installed = await readFile(adopterWorkflowPath(dir, "qfai-tests.yml"), "utf-8");

      // A file present in both the packaged directory and the adopter's
      // workflows directory, with differing content and NO provenance entry.
      // It must never be an operand: QFAI did not write it.
      await writeFile(adopterWorkflowPath(dir, "README.md"), "adopter stray\n", "utf-8");

      const matching = await pool.newTempDir();
      await writeFile(path.join(matching, "qfai-tests.yml"), installed, "utf-8");
      await writeFile(path.join(matching, "README.md"), "packaged stray\n", "utf-8");

      const differing = await pool.newTempDir();
      await writeFile(
        path.join(differing, "qfai-tests.yml"),
        `${installed}# packaged addition\n`,
        "utf-8",
      );
      await writeFile(path.join(differing, "README.md"), "packaged stray\n", "utf-8");

      const same = await diffInstalledShippedWorkflows(dir, matching);
      const drifted = await diffInstalledShippedWorkflows(dir, differing);

      expect(same.modified, "a matching packaged operand yields no drift").toEqual([]);
      expect(same.status, "a matching packaged operand is not a drift status").toBe("ok");
      // Deep equality pins length, membership and order on its own; a trailing
      // length assertion would add no discriminating power.
      expect(
        drifted.modified,
        "the differing packaged operand must be the one compared against",
      ).toEqual([`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`]);

      // Named leg, not an incidental one: `qfai-validate.yml` IS recorded in
      // provenance and IS present in the adopter tree, but NEITHER packaged
      // tree above carries it. A name the running package no longer ships is
      // the `extra` bucket, which BR-0006-0018 excludes from drift, so this is
      // the assertion that fails if the packaged-absent leg of the reader is
      // ever flipped to report drift. Keep `qfai-validate.yml` out of both
      // packaged trees, or this protection disappears silently.
      expect(
        [...same.modified, ...drifted.modified],
        "a recorded name present on disk with no packaged counterpart is `extra`, never drift",
      ).not.toContain(`${ADOPTER_WORKFLOWS_DIR}/qfai-validate.yml`);
    });
  },
);

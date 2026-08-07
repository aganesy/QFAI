/**
 * Integration: the provenance gate on the installed shipped-workflow drift
 * advisory (`qfai doctor`).
 *
 * The comparison set of `workflows.integrity` is the set of names the
 * `.qfai/install-provenance.json` record carries — never a filename pattern.
 * The reserved `qfai-` prefix is a reservation notice, not a selector
 * (`.qfai/contracts/cli/shipped-workflows.md` §1), so an adopter who authored
 * a colliding name first owns that file and it is `adopter-owned`: silent in
 * `qfai doctor`, forever (§3).
 *
 * What this file has to establish is that the silence is DERIVED, not vacuous.
 * A check that reported nothing at all would satisfy "the collision is not
 * named" just as well, so the collision and a live provenance-backed stale
 * file share one adopter tree here and the stale one is asserted to be
 * reported in the same run that stays silent about the collision.
 *
 * Observed through `createDoctorData` rather than the reader, matching the
 * sibling drift suite: a finding that is produced but never registered would
 * pass a reader-only test.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
// QFAI:SPEC-0006:TC-0006-0031

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { readInstallProvenance } from "../../src/shared/provenance.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  adopterWorkflowPath,
  editShippedWorkflow,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/**
 * A name from the shipped write set, used here as the collision: it is the
 * strongest form of the case, because a name QFAI itself ships is exactly
 * where a prefix-based or asset-directory-based comparison set would pick the
 * adopter's file up.
 */
const COLLIDING_NAME = "qfai-tests.yml";

/** The other shipped name, left for QFAI to install and then hand-edited. */
const CONTROL_NAME = "qfai-validate.yml";

/**
 * The adopter's own workflow, written under the colliding name before QFAI is
 * installed. Deliberately nothing like the packaged copy: were the installer
 * to overwrite it, or were the comparison to run against it, the assertion on
 * its surviving bytes fails and says so.
 */
const ADOPTER_BODY = [
  "# Authored by this repository's owner long before QFAI arrived.",
  "name: adopter's own test lane",
  "on: workflow_dispatch",
  "jobs:",
  "  adopter-owned:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - run: echo 'this file is not QFAI's'",
  "",
].join("\n");

describe(
  "TC-0006-0031 (TDD-0033): an adopter-authored name collision is never reported, while a provenance-backed stale file still is",
  { timeout: 60000 },
  () => {
    it("keeps silent about the unrecorded colliding file while reporting the recorded stale one", async () => {
      // The collision has to predate the install: the root template copy is
      // create-only, so a file already sitting at the destination is SKIPPED
      // and never gains a provenance entry. That skip is what puts the name in
      // the `adopter-owned` state; writing the file after the install would
      // instead produce a recorded, edited file — the `modified` state, which
      // is the sibling suite's subject.
      const dir = await pool.seedAdopterTree(async (tree) => {
        await mkdir(path.join(tree, ...ADOPTER_WORKFLOWS_DIR.split("/")), { recursive: true });
        await writeFile(adopterWorkflowPath(tree, COLLIDING_NAME), ADOPTER_BODY, "utf-8");
      });
      await editShippedWorkflow(dir, CONTROL_NAME);

      // Anti-vacuity guard #1, and the reason it comes first: the record
      // reader is fail-safe by contract — a missing, unreadable or malformed
      // record resolves to an EMPTY record and never throws. A fixture that
      // skipped the install, or a record path that moved, would therefore
      // yield an empty comparison set, and EVERY absence assertion below
      // would pass for the wrong reason. Pinning the key set to exactly one
      // name closes that and, in the same assertion, proves the install did
      // not record the collision.
      const record = await readInstallProvenance(dir);
      expect(
        Object.keys(record.workflows).sort(),
        "exactly one shipped name may be recorded: the collision must be unrecorded, and the control must be recorded, or nothing is being compared",
      ).toEqual([CONTROL_NAME]);

      // Anti-vacuity guard #2: the silence has to be about provenance, not
      // about the file having been replaced by the installer. If the create-only
      // copy had overwritten the adopter's bytes there would be no adopter file
      // left to stay silent about.
      expect(
        await readFile(adopterWorkflowPath(dir, COLLIDING_NAME), "utf-8"),
        "the installer must leave the adopter's colliding file byte-for-byte alone",
      ).toBe(ADOPTER_BODY);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const check = data.checks.find((entry) => entry.id === "workflows.integrity");

      expect(
        check,
        "the recorded stale file must still produce a workflows.integrity finding in this tree",
      ).toBeDefined();

      // The row's named claim, across BOTH operator-visible surfaces of the
      // finding at once. A bare filename is a safe needle here because this
      // revision's `details` carries only `workflowsDir` (`.github/workflows`)
      // and `modified`, neither of which can contain the collision's name for
      // an unrelated reason.
      //
      // It is asserted BEFORE its own non-vacuity controls, and that ordering
      // is load-bearing rather than stylistic. Both assertions in this block
      // fail under the mutation that removes the provenance gate, and only the
      // FIRST one to run ever reddens; whichever comes second reads as covered
      // while never having been exercised. Putting the named claim first gives
      // it the gate-removal mutation, and leaves the controls below with the
      // report-nothing mutation, which the claim above passes vacuously. Each
      // assertion then has a mutation that reddens it. (The sibling drift
      // suite hit the same shadowing and split an `it` for it; here a swap
      // suffices, because the two mutations are distinct.)
      const findingSurface = `${check?.message ?? ""}\n${JSON.stringify(check?.details ?? {})}`;
      expect(
        findingSurface,
        "an adopter-authored file with no provenance entry must not appear anywhere in the finding",
      ).not.toContain(COLLIDING_NAME);

      // The live control. Without it, a check that named NOTHING — one that
      // never fired, or fired with an empty payload — would satisfy the
      // absence claim above, and the row would assert nothing about the
      // provenance gate at all. Deep equality pins membership, order and
      // length in one shot, and its diff prints whichever entry appeared; a
      // separate length assertion adds no discriminating power.
      expect(
        check?.details?.["modified"],
        "the recorded, hand-edited file must be the one and only reported entry",
      ).toEqual([`${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`]);
      // The `message` half of the haystack above is only a claim while the
      // message is non-empty, so it gets its own control alongside `details`.
      expect(check?.message, "the advisory message must name the recorded stale path").toContain(
        `${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`,
      );
    });
  },
);

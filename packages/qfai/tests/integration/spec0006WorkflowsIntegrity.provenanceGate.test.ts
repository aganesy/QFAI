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
 * pass a reader-only test. One assertion in the second row below reads the
 * reader instead, and says why at its own line.
 *
 * Both of §3's entry-LESS states live here, one row each: `adopter-owned`
 * (no entry, file present) and `absent` (no entry, nothing on disk). What they
 * share is the observation that decides them — the name has no provenance
 * entry — which is this file's subject.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
// QFAI:SPEC-0006:TC-0006-0031
// QFAI:SPEC-0006:TC-0006-0030

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import { readInstallProvenance } from "../../src/shared/provenance.js";
import { normalizeNewlines } from "../../src/shared/text.js";
import { shippedWorkflowPath } from "../helpers/shippedWorkflowFixtures.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  adopterWorkflowPath,
  deleteShippedWorkflow,
  editShippedWorkflow,
  removeProvenanceEntry,
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
 * installed.
 *
 * Its difference from the packaged copy of the same name is load-bearing twice
 * over — byte survival is vacuous if the two are identical, and the collision
 * only DRIFTS while its content differs — so guard #2 below asserts that
 * difference instead of leaving it to this comment.
 */
const ADOPTER_BODY = [
  "# Authored by this repository's owner long before QFAI arrived.",
  "name: adopter's own test lane",
  "on: workflow_dispatch",
  "jobs:",
  "  adopter-owned:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  '      - run: echo "this file is not QFAI\'s"',
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
        await mkdir(path.dirname(adopterWorkflowPath(tree, COLLIDING_NAME)), { recursive: true });
        await writeFile(adopterWorkflowPath(tree, COLLIDING_NAME), ADOPTER_BODY, "utf-8");
      });
      await editShippedWorkflow(dir, CONTROL_NAME);

      // Guards #1-#3 are PRECONDITIONS on the fixture, so they stay hard: if
      // the tree is not in the state this row reasons about, nothing below
      // measures anything and continuing would only add noise. Everything
      // after them is the row's claim, and all of it is `expect.soft` — see
      // the block above the claim for why.

      // Guard #1: the record reader is fail-safe by contract — a missing,
      // unreadable or malformed record resolves to an EMPTY record and never
      // throws. A fixture that skipped the install, or a record path that
      // moved, would therefore yield an empty comparison set, and EVERY
      // absence assertion below would pass for the wrong reason.
      //
      // Asserted as the two facts the row actually needs (the collision is
      // unrecorded, the control is recorded) rather than as deep equality on
      // the sorted key set. Deep equality would additionally pin the shipped
      // set's CARDINALITY at 2, and contract §1 explicitly anticipates that
      // number changing (`SHIPPED_WORKFLOW_NAMES` is an in-binary list names
      // enter and leave). A third shipped workflow would then redden this row
      // for a reason it says nothing about, and no assertion here needs the
      // number — the live control's deep equality survives a third name
      // installed byte-identical, because such a name never enters `modified`.
      const recordedNames = Object.keys((await readInstallProvenance(dir)).workflows);
      expect(
        recordedNames,
        "the collision must have gained no provenance entry, or it is not `adopter-owned` and this row has no subject",
      ).not.toContain(COLLIDING_NAME);
      expect(
        recordedNames,
        "the control must be recorded, or the comparison set is empty and every absence claim below passes vacuously",
      ).toContain(CONTROL_NAME);

      // Guard #2: `ADOPTER_BODY` must not BE the packaged copy. Were they
      // equal, guard #3 would pass even under an overwriting installer (the
      // bytes would match either way) and the collision would no longer drift,
      // so the gate-removal mutation would stop reddening too — both of this
      // row's anti-vacuity guards would silently stop working while every
      // assertion still passed.
      //
      // Compared on the reader's own basis (newline-normalized text), because
      // that is the basis which decides drift; on raw bytes a CRLF checkout of
      // the packaged asset would satisfy this guard while the reader saw two
      // identical files.
      expect(
        normalizeNewlines(await readFile(shippedWorkflowPath(COLLIDING_NAME), "utf-8")),
        "the adopter fixture must differ from the packaged copy under the comparison basis, or this row's guards are vacuous",
      ).not.toBe(normalizeNewlines(ADOPTER_BODY));

      // Guard #3: the silence has to be about provenance, not about the file
      // having been replaced by the installer. If the create-only copy had
      // overwritten the adopter's bytes there would be no adopter file left to
      // stay silent about.
      expect(
        await readFile(adopterWorkflowPath(dir, COLLIDING_NAME), "utf-8"),
        "the installer must leave the adopter's colliding file byte-for-byte alone",
      ).toBe(ADOPTER_BODY);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      // The finding SET, not the first match. The TC's Assert is about the set
      // (「finding 集合に ... 1 度も現れない」), and `addCheck` is a bare push
      // with no dedup — so a `find` would hand back only the gated emission
      // while a second, ungated registration of the same id named the
      // collision, and every assertion below would read the clean one and
      // pass. The sibling drift suite pins the same property for the same
      // reason.
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // Every assertion from here down is `expect.soft`, and that is the whole
      // ordering argument rather than a style choice. Each has its own
      // reddening mutation, and under a hard `expect` only the FIRST failing
      // one is ever observed: a mutation that reddens an earlier assertion
      // aborts the run before the later ones execute, so they read as covered
      // while never having been exercised. Reordering can only move that
      // shadow around. Soft assertions remove it — every one of them runs and
      // reports regardless of the ones before it — which makes the property
      // structural instead of a comment a later edit can quietly break.
      //
      // The ordering rule this replaces, recorded because it still governs
      // hard assertions (guards #1-#3 above, and the sibling suites):
      //   (i)   a guard that closes a VACUOUS-PASS mode of the claim MUST
      //         precede it;
      //   (ii)  a control that SHARES a reddening mutation with the claim must
      //         not sit in front of it, or the claim never reddens;
      //   (iii) where one guard is both, ordering satisfies neither and the
      //         `it` has to split.
      // Only (ii) is an anti-pattern. An earlier pass of this row swapped two
      // assertions to satisfy (ii), and it is worth being exact about what
      // that bought, because it is easy to misread: the swap never changed
      // what the suite DETECTS — the mutation failed the run either way — only
      // which assertion was OBSERVED to redden.
      //
      // The `it` is NOT split despite the two facts below being separable.
      // Unlike the sibling drift suite's split, these have to come out of ONE
      // `qfai doctor` run over ONE tree: "silent about the collision WHILE
      // reporting the recorded stale file" is a co-occurrence, and that
      // co-occurrence is the row's claim. Two runs over two trees would assert
      // the halves independently and establish neither.
      expect
        .soft(
          check,
          "the recorded stale file must still produce a workflows.integrity finding in this tree",
        )
        .toBeDefined();
      expect
        .soft(findings, "workflows.integrity must be registered exactly once per doctor run")
        .toHaveLength(1);

      // Severity belongs to the claim, not to the decoration: `shouldFailDoctor`
      // counts `warning + error`, so a collision that leaked into a
      // `warning`-severity finding would move the exit code under
      // `--fail-on warning` while every path assertion here stayed green.
      //
      // The exit code itself is deliberately NOT asserted here. At `info` it
      // cannot move under the gate-removal mutation, and a fresh `runInit` tree
      // carries unrelated warnings, so an exit-code pin in this row would
      // measure a fixture artefact instead of the gate. TDD-0031 / TDD-0034 /
      // TDD-0035 own that clause of the TC.
      expect.soft(check?.severity, "the drift advisory is an info-severity finding").toBe("info");

      // The row's named claim, over every rendered field of EVERY registered
      // finding: `title`, `message`, and the serialized `details` of each. A
      // bare filename is a safe needle, and the haystack stays forward-safe as
      // the payload grows, because growth can only produce a false RED, never
      // a false GREEN. Of the reader's five fields, the three that can carry a
      // name at all: `workflowsDir` is `.github/workflows`; `packagedDir` is a
      // DIRECTORY path and cannot carry a filename; `modified` holds recorded
      // names only, and this one is unrecorded (guard #1). A `declined` bucket
      // added later could not carry it either, since `resolveWorkflowCopySet`
      // marks a name declined only when a record entry EXISTS and the file is
      // absent, while an adopter-owned collision has no entry at all.
      const findingSurface = findings
        .map(
          (finding) =>
            `${finding.title}\n${finding.message}\n${JSON.stringify(finding.details ?? {})}`,
        )
        .join("\n");
      expect
        .soft(
          findingSurface,
          "an adopter-authored file with no provenance entry must not appear anywhere in any workflows.integrity finding",
        )
        .not.toContain(COLLIDING_NAME);

      // The live control. Without it a check that named NOTHING — one that
      // never fired, or fired with an empty payload — would satisfy the absence
      // claim above, and the row would assert nothing about the provenance gate
      // at all. Deep equality pins membership, order and length in one shot,
      // and its diff prints whichever entry appeared; a separate length
      // assertion adds no discriminating power.
      expect
        .soft(
          check?.details?.modified,
          "the recorded, hand-edited file must be the one and only reported entry",
        )
        .toEqual([`${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`]);
      // The `message` half of the haystack above is only a claim while the
      // message is non-empty, so it gets its own control alongside `details`.
      expect
        .soft(check?.message, "the advisory message must name the recorded stale path")
        .toContain(`${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`);
    });
  },
);

/**
 * The shipped name the row below reduces to `absent`: no provenance entry and
 * nothing on disk. It is the same file `COLLIDING_NAME` uses in a different
 * role, because `SHIPPED_WORKFLOW_NAMES` holds exactly two names at this
 * revision and the other one is this row's live control.
 *
 * Reached by stripping a real install, which is a SIMULATION of a state that
 * arises on its own rather than a contrived tree: contract §1 has names
 * entering and leaving the shipped list, so an adopter who installed while the
 * package shipped one workflow and then upgraded to a version shipping two
 * carries exactly this state for the new name — no entry, no file, record
 * non-empty — until their next `qfai init`.
 */
const ABSENT_NAME = "qfai-tests.yml";

describe(
  "TC-0006-0030 (TDD-0038): a shipped name with no provenance entry and absent from disk yields no drift finding, while a live entry-bearing stale file is still reported",
  { timeout: 60000 },
  () => {
    // TC-0006-0030 leg (b), re-quoted after `CR-20260810-0001` Option A reworded it
    // — 「`absent` の name は `workflows.integrity` finding の title / message /
    // `details` のいずれにも現れない (不在は drift ではない)。同じ tree の対照 stale
    // file は `details.modified` に報告され、check は severity `info` で 1 度だけ
    // registered される」. That is this row's tree exactly — `absent` plus a
    // co-located entry-bearing control — so the leg no longer DIVIDES and this row
    // is the whole of it. The pre-CR quotation stood here (「drift finding が 0 件」,
    // split between two owners) and named nothing this row asserts.
    //
    // `declined` (entry present, file gone) is a different state, OUTSIDE this TC by
    // its own 境界 clause, which names TC-0006-0034 / TC-0006-0035 as the owners. The
    // sibling drift suite's second `it` still deletes a recorded `qfai-validate.yml`
    // and pins its silence — measured, not assumed, by the M2 mutation below, which
    // reddens that `it` and nothing else in that file — but it does so under its own
    // row's boundary (TC-0006-0027), not as a half of this leg.
    //
    // THE SILENCE THIS ROW CLAIMS HAS TWO SUFFICIENT CAUSES, at two separate reader
    // statements, and the falsifiability record is shaped by that rather than by
    // preference: the name is outside the comparison set (`recordedNames`), and
    // its installed file is absent, which `hasDrifted` answers with no drift.
    // Either one alone leaves the ABSENCE CLAIM passing — measured on M1 (the
    // comparison set widened past the record's key set) and on M2 — so the
    // mutation that reddens the claim is COMPOUND (M3 = M1 + M2). What M1
    // reddens by itself, among this row's assertions, is the `comparedCount`
    // assertion below, which is why that assertion is here. Needles, blobs and
    // outputs: `.qfai/evidence/implement-spec-0006.md#tdd-0038`.
    it("stays silent about the entry-less absent shipped name while reporting the recorded stale one", async () => {
      const dir = await pool.seedAdopterTree();
      await deleteShippedWorkflow(dir, ABSENT_NAME);
      await removeProvenanceEntry(dir, ABSENT_NAME);
      await editShippedWorkflow(dir, CONTROL_NAME);

      // Guards #1-#3 are PRECONDITIONS on the fixture and stay hard: on a tree
      // that is not in this state nothing below measures anything. Everything
      // after them is the row's claim and is `expect.soft`, for the reason the
      // sibling row above gives at length.

      // Guard #1 — both halves of the record's side, read through the production
      // reader rather than trusted from the fixture, whose entry removal is a
      // silent no-op on a name it does not find. The record must ALSO stay
      // non-empty: an empty one registers no check at all — the
      // whole-record-empty aggregate the sibling drift suite owns. What that
      // costs is measured, and it is mostly a FALSE RED rather than a vacuity:
      // of this row's six claims exactly TWO pass against a doctor run that
      // emitted nothing — the absence sweep, on an empty haystack, and the
      // cardinality check, both sides collapsed to 0 — while the four that read
      // the finding redden for a reason the row does not name (measured 2 passed
      // / 4 red; this comment asserted "every claim below" until it was run).
      const recordedNames = Object.keys((await readInstallProvenance(dir)).workflows);
      expect(
        recordedNames,
        "the stripped name must carry no provenance entry, or this is not the `absent` state",
      ).not.toContain(ABSENT_NAME);
      expect(
        recordedNames,
        "the control must stay recorded, or the record is empty and no check is registered at all",
      ).toContain(CONTROL_NAME);

      // Guard #2 — the disk side. Present on disk would make the name
      // `adopter-owned`, which is the row above's state, not this one's.
      await expect(
        readFile(adopterWorkflowPath(dir, ABSENT_NAME), "utf-8"),
        "the stripped name must be gone from disk, or the state is `adopter-owned`, not `absent`",
      ).rejects.toThrow();

      // Guard #3 — the packaged side STILL SHIPS the name, which removes a
      // THIRD sufficient cause of the silence: packaged-absent, the `extra`
      // bucket, whose rule the sibling drift suite's fourth `it` owns. It leaves
      // exactly the two causes named above. It is NOT what keeps the compound
      // mutation alive, and the first draft of this comment said it was: M2's
      // recorded replacement answers on the INSTALLED side, while this guard
      // constrains the PACKAGED one. Attribution is the whole of its warrant.
      const packagedCopy = await readFile(shippedWorkflowPath(ABSENT_NAME), "utf-8");
      expect(
        packagedCopy.length,
        "the packaged copy must still exist, or this row measures the `extra` bucket instead of the provenance gate",
      ).toBeGreaterThan(0);

      // Two observation points. The reader-level one is deliberate in a file
      // whose header names `createDoctorData`: of the reader's FIVE fields the
      // emission renders three (`workflowsDir` and `modified` through `details`,
      // `packagedDir` interpolated into the message), none of which reports the
      // SIZE of the comparison set — `comparedCount` alone does. This block read
      // "four fields and the two the emission renders"; both counts were wrong.
      const diff = await diffInstalledShippedWorkflows(dir);
      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      // The finding SET, not the first match: `addCheck` is a bare push with no
      // dedup, so a `find` would hand back the gated emission alone while a
      // second, ungated registration named the stripped file.
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // The REPORTED SIZE of the comparison set — a cardinality check and not
      // set identity, which `WorkflowsIntegrityDiff` cannot express at all (no
      // operand list on its surface), so strengthening this would mean widening
      // the reader first. It therefore catches a widening that flows into
      // `comparedCount` (M1) and measurably not one that leaves the count at
      // `recordedNames.length` while adding an operand: under M4 the entry-less
      // name IS compared and every assertion in this row stays green, the row
      // above killing that mutant instead, its collision being present on disk.
      // Pinned against `recordedNames.length`, not the literal 1: that would pin
      // the shipped set's cardinality at 2, which contract §1 expects to change.
      expect
        .soft(
          diff.comparedCount,
          "the reported comparison-set size must equal the recorded-name count, or a name with no entry was counted into it",
        )
        .toBe(recordedNames.length);

      // `findings[0]` being defined is entailed by this length assertion, whose
      // own failure names the empty set, so no separate `toBeDefined()` is kept.
      //
      // For TDD-0039, which adds the third emission branch: this tree resolves
      // the packaged operand, so `status` is `modified`, and a branch keyed on
      // `status === "skipped_unresolved"` cannot also fire here, since `status`
      // carries one value per run. A branch that instead registers a check
      // ALONGSIDE the drift one reddens this assertion — deliberately, and that
      // is the transition to raise rather than to absorb.
      expect
        .soft(findings, "workflows.integrity must be registered exactly once per doctor run")
        .toHaveLength(1);
      expect.soft(check?.severity, "the drift advisory is an info-severity finding").toBe("info");

      // The row's named claim, over every rendered field of every registered
      // finding. The needle is a bare FILE name and the only paths on this
      // surface are the control's rendered path and the packaged DIRECTORY path;
      // that neither contains the needle is what the passing run measures.
      // Payload growth can only produce a false RED here, never a false GREEN.
      const findingSurface = findings
        .map(
          (finding) =>
            `${finding.title}\n${finding.message}\n${JSON.stringify(finding.details ?? {})}`,
        )
        .join("\n");
      expect
        .soft(
          findingSurface,
          "a shipped name with no provenance entry and nothing on disk must not appear anywhere in any workflows.integrity finding",
        )
        .not.toContain(ABSENT_NAME);

      // The live control, for the reason the row above gives at length: without
      // it a check that named NOTHING would satisfy the absence claim. Deep
      // equality pins membership, order and length at once.
      expect
        .soft(
          check?.details?.modified,
          "the recorded, hand-edited file must be the one and only reported entry",
        )
        .toEqual([`${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`]);
      // The `message` half of the haystack above is only a claim while the
      // message is non-empty, so it gets its own control alongside `details`.
      expect
        .soft(check?.message, "the advisory message must name the recorded stale path")
        .toContain(`${ADOPTER_WORKFLOWS_DIR}/${CONTROL_NAME}`);
    });
  },
);

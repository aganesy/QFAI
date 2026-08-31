/**
 * The `--fail-on warning` leg of the installed shipped-workflow drift advisory:
 * a drift-only tree exits 0, and an unrelated warning still exits 1.
 *
 * TC-0006-0032 (AC-0006-0025 / EX-0006-0025) — Setup 「`workflows.integrity` が
 * drift を返し、他の check は 1 件も warning / error を返さないフィクスチャ
 * (`summary.warning === 0` かつ `summary.error === 0` になる状態)」, Action
 * 「`runDoctor({ root, format: 'text', failOn: 'warning' })` 相当を呼ぶ」.
 *
 * TC-0006-0033 (AC-0006-0025 / EX-0006-0026) — the same drift fixture plus exactly
 * one warning finding unrelated to `workflows.integrity`, asserting exit 1 with the
 * drift finding still `info`.
 *
 * ## Why this file exists: it closes an equivalent mutant, not a queue slot
 *
 * `TC-0006-0029` (TDD-0031) asserts the drift finding is `info` and that
 * `--fail-on error` exits 0 — and records, in its own docblock and in the TC's
 * closing note, that it CANNOT tell `info` from `warning`: the `failOn === "error"`
 * branch of `shouldFailDoctor` reads `summary.error` alone, so mutating the drift
 * arm's `severity: "info"` to `"warning"` leaves that row green. It is written down
 * there as an EQUIVALENT MUTANT with the kill deliberately deferred to this leg
 * rather than closed by an assertion stricter than the contract.
 *
 * This is that leg. Under `--fail-on warning` the branch reads
 * `summary.warning + summary.error > 0`, so a `warning` severity drives the exit to
 * 1 and the first `it` below reddens. DR-0006-0004's `info`-versus-`warning`
 * decision is discriminated here and nowhere else.
 *
 * ## The fixture is not "a clean tree", and that had to be measured
 *
 * `shouldFailDoctor`'s warning branch is a whole-run TOTAL with no per-check
 * exclusions, and `summarize` is `summary[check.severity] += 1` over every
 * registered check — the `skills.integrity` special-casing that exists in the
 * renderer and in the exit-code aggregation is not in the summary. So exit 0 here
 * requires ZERO warnings across the run, not merely that the advisory is not one.
 *
 * A freshly seeded adopter tree does not deliver that: `qfai init` reports success
 * and leaves FIVE warnings standing (`paths.srcDir`, `paths.testsDir`,
 * `paths.outDir`, `output.validateJson`, `traceability.testGlobs`). Every one is an
 * absence — a directory not created, a report not yet run, a glob list left
 * intentionally empty — which is the default state of a bare install rather than a
 * defect. `quietUnrelatedWarnings` answers each with the minimum its own condition
 * asks for; why each repair is minimal, and why only three of the five may be left
 * standing, is in that helper's docblock and is not restated here.
 *
 * ## Guard #3 is scoped to OTHER ids, and the scope is load-bearing
 *
 * The whole-summary form (`data.summary.warning` is 0) is also true in the first
 * fixture, and it is asserted below — as a CLAIM. It cannot also be the guard: it
 * reddens under this row's own oracle mutation, and a hard guard that reddens
 * aborts the `it` before the claims execute, leaving the oracle unmeasurable. The
 * scoped form is invariant under that mutation. `TC-0006-0029`'s suite makes the
 * same move on the `error` severity for the same reason; this is that pattern, one
 * severity along.
 *
 * ## What the `summary.info` claim does NOT discriminate, measured
 *
 * `TC-0006-0032` asks for `summary.info >= 1`. On this fixture the bare install
 * already contributes four `info` checks (`paths.specsDir`, `paths.contractsDir`,
 * `paths.discussionDir`, `guardrails.present`), so the claim holds at 4 even with
 * the drift advisory absent or re-severitied. It is asserted because the TC asks
 * for it, and it is recorded here as NON-DISCRIMINATING so no reader mistakes it
 * for the claim that pins the severity choice. That claim is `summary.warning`.
 *
 * ## RED was not observable, and no production code was written
 *
 * Both rows assert behaviour an earlier row already implemented — the drift arm was
 * written for TC-0006-0027 and keyed on the provenance record at `ec4b8f31`
 * (TDD-0029 round 2) — so both tests passed on their first run. Per
 * `references/red-not-observable.md` that is the `Satisfied-by` path, not an
 * anomaly and not a licence to weaken a correct test until it fails; the
 * falsifiability trio replaces the RED pair and gate item 4 is waived. The
 * mutations, their needle text and their measured outputs are in
 * `.qfai/evidence/implement-spec-0006.md`.
 *
 * ## Why the claims are `expect.soft`
 *
 * The sibling suites' reason — a hard failure aborts the `it`, so later assertions
 * read as covered without executing — plus the reason specific to a two-claim
 * oracle: "the exit code moved AND the summary moved" is only observable while both
 * claims can fail in the same run.
 */
// QFAI:SPEC-0006:TC-0006-0032
// QFAI:SPEC-0006:TC-0006-0033

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  editShippedWorkflow,
  quietUnrelatedWarnings,
  runDoctorText,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/**
 * The installed shipped workflow both rows hand-edit. The edit is what makes the
 * exit-code claims live: a clean tree emits no advisory at all and exits 0 for a
 * reason that has nothing to do with the severity under test.
 */
const STALE_NAME = "qfai-tests.yml";

/**
 * The one unrelated warning the control leaves standing. `paths.testsDir` is a
 * missing directory, so the control differs from the first fixture by a single
 * `mkdir` — the smallest available difference between "exit 0" and "exit 1" on
 * this flag, which is what makes the pair a control rather than two unrelated
 * measurements.
 */
const UNRELATED_WARNING_ID = "paths.testsDir";

/** The check ids whose severity would make `--fail-on warning` exit 1. */
function failingIdsOtherThanDrift(checks: { id: string; severity: string }[]): string[] {
  return checks
    .filter(
      (entry) =>
        entry.id !== "workflows.integrity" &&
        (entry.severity === "warning" || entry.severity === "error"),
    )
    .map((entry) => entry.id);
}

describe(
  "TC-0006-0032 (TDD-0034): a drift-only tree exits 0 under --fail-on warning",
  { timeout: 60000 },
  () => {
    it("exits 0 with summary.warning still 0 while the drift advisory is emitted", async () => {
      const dir = await pool.seedAdopterTree();
      await quietUnrelatedWarnings(dir);
      await editShippedWorkflow(dir, STALE_NAME);

      // GUARDS #1-#4 are PRECONDITIONS and stay hard: on a tree not in this state
      // nothing below measures anything. The three claims after them are soft.

      // Guard #1 — the tree really does drift, closing three vacuity modes in one
      // `toContain` as the sibling suites do: the packaged copy resolved and was
      // readable, the provenance record is non-empty (the reader only visits
      // recorded names), and the hand edit landed.
      const diff = await diffInstalledShippedWorkflows(dir);
      expect(
        diff.modified,
        "drift must be observable in this tree, or an exit code of 0 says nothing about an advisory that was never emitted",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/${STALE_NAME}`);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");

      // Guard #2 — registered exactly once. The finding SET rather than the first
      // match: `addCheck` is a bare push with no dedup, so a `find` would hand back
      // one registration while a second carried a different severity.
      expect(
        findings,
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);

      // Guard #3 — the fixture repair actually landed. Scoped to OTHER ids for the
      // reason the header gives, and it also fails in the useful direction if
      // `quietUnrelatedWarnings` ever silences less than it claims: the report names
      // the ids, so a sixth default warning arrives as a readable diff rather than
      // as an unexplained exit 1.
      expect(
        failingIdsOtherThanDrift(data.checks),
        "no check other than workflows.integrity may be warning or error, or exit 0 under `--fail-on warning` is not attributable to this advisory's severity",
      ).toEqual([]);

      const run = await runDoctorText(dir, "warning");

      // Guard #4 — the invocation that produced the exit code is the run that
      // registered the finding: it rules out `runDoctor`'s `--autoremediate` CI-off
      // early return, which yields a literal 0 without consulting `shouldFailDoctor`
      // and renders no check line at all. The bare id only — no severity tag, no
      // group header, both TDD-0040's surface.
      expect(
        run.stdout,
        "the rendered run must carry the workflows.integrity finding, or its exit code belongs to some other code path",
      ).toContain("workflows.integrity");

      // CLAIM 1 — 「exit code が 0 であること」.
      expect
        .soft(
          run.exitCode,
          "an info advisory must not change the exit code under `--fail-on warning` — that flag counts warnings, and DR-0006-0004 chose info so it would not be one",
        )
        .toBe(0);

      // CLAIM 2 — 「`summary.warning` が 0 のままであること」. This is the claim that
      // discriminates `info` from `warning`; the equivalent mutant TC-0006-0029
      // recorded dies here.
      expect
        .soft(
          data.summary.warning,
          "the drift advisory must not land in the warning bucket — `summarize` has no exclusions, so a warning here is a warning for every `--fail-on warning` adopter",
        )
        .toBe(0);

      // CLAIM 3 — 「`summary.info` が 1 以上であること」. Asserted because the TC asks
      // for it; recorded in the header as non-discriminating, because the bare
      // install already contributes four.
      expect
        .soft(
          data.summary.info,
          "the advisory is counted, not dropped — it belongs to the info bucket",
        )
        .toBeGreaterThanOrEqual(1);
    });
  },
);

describe(
  "TC-0006-0033 (TDD-0035): an unrelated warning still exits 1 under --fail-on warning",
  { timeout: 60000 },
  () => {
    it("exits 1 on the unrelated warning while the drift finding stays info", async () => {
      const dir = await pool.seedAdopterTree();
      await quietUnrelatedWarnings(dir, { leaveWarning: UNRELATED_WARNING_ID });
      await editShippedWorkflow(dir, STALE_NAME);

      // Guard #1 — as above. Without drift this row would assert exit 1 on a tree
      // whose advisory never existed, which the control is specifically there to
      // rule out: TC-0006-0032 alone is satisfiable by a `--fail-on warning` that
      // catches nothing, and this row is what shows the flag works.
      const diff = await diffInstalledShippedWorkflows(dir);
      expect(
        diff.modified,
        "drift must be observable in this tree, or this row is not the control TC-0006-0032 needs",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/${STALE_NAME}`);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");

      // Guard #2 — as above.
      expect(
        findings,
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);

      // Guard #3 — EXACTLY the one unrelated warning, and no other. `toEqual` on the
      // id list rather than a count: a count of 1 is also satisfied by some OTHER
      // check having gone warning while `paths.testsDir` was quietly created, and
      // then exit 1 would be attributed to the wrong cause. Scoped to other ids so
      // it stays invariant under the sibling row's oracle mutation.
      expect(
        failingIdsOtherThanDrift(data.checks),
        `exit 1 must be attributable to ${UNRELATED_WARNING_ID} alone`,
      ).toEqual([UNRELATED_WARNING_ID]);

      const run = await runDoctorText(dir, "warning");

      // Guard #4 — as above.
      expect(
        run.stdout,
        "the rendered run must carry the workflows.integrity finding, or its exit code belongs to some other code path",
      ).toContain("workflows.integrity");

      // CLAIM 1 — 「exit code が 1 であること」, i.e. the flag really does catch a
      // warning. This is what makes TC-0006-0032's exit 0 non-vacuous.
      expect
        .soft(
          run.exitCode,
          "`--fail-on warning` must exit 1 on an unrelated warning, or TC-0006-0032's exit 0 is satisfied by a flag that catches nothing",
        )
        .toBe(1);

      // CLAIM 2 — 「`workflows.integrity` finding は依然 `info` のままであること」. Read
      // at the registration site rather than in the rendered text, matching every
      // suite in this family: severity is decided at `addCheck`.
      expect
        .soft(
          findings[0]?.severity,
          "the advisory stays an info advisory in the presence of an unrelated warning — the exit code moved, its severity did not",
        )
        .toBe("info");
    });
  },
);

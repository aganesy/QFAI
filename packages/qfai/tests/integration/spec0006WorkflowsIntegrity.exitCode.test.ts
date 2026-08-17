/**
 * Integration: the installed shipped-workflow drift advisory is severity `info`
 * and leaves `qfai doctor --fail-on error` at exit 0.
 *
 * TC-0006-0029 (AC-0006-0022 / BR-0006-0019) — Setup 「`workflows.integrity` が
 * drift を返すフィクスチャ」, Action 「`runDoctor({ root, format: 'text', failOn:
 * 'error' })` 相当を呼び、finding severity と `shouldFailDoctor` の判定を観測する」.
 *
 * The TC carries THREE Verify bullets and this row owns the FIRST TWO: the finding
 * is included at `severity: 'info'`, and `shouldFailDoctor` returns false so the
 * advisory does not change the exit code. The third — placement in the "warnings
 * advisory of drift" group of the 2-group text renderer — is TDD-0040's, and
 * nothing below asserts a group header, a bucket, or the severity tag of a rendered
 * line.
 *
 * How `shouldFailDoctor` is observed without exporting it belongs to the
 * `runDoctorText` docblock (`tests/helpers/workflowsIntegrityFixtures.ts`) and is
 * not restated here; a prose copy is a second SSOT. No production surface was
 * widened for this row.
 *
 * ## This TC cannot tell `info` from `warning`, and that is measured
 *
 * The TC discloses it in its own closing note and the mutation run agrees: under
 * `--fail-on error` the `failOn === "error"` branch of `shouldFailDoctor` reads
 * `summary.error > 0` and nothing else — `src/cli/commands/doctor.ts` `:226-228`,
 * anchored on the BLOB `a2a92ca0` rather than on a revision, because a line number
 * is a property of file contents and a commit that touches some other file carries
 * it along unchanged; follow the symbol either way. So mutating the drift arm's
 * `severity: "info"` to `"warning"` leaves the exit-code claim GREEN.
 *
 * How to read that figure: this file holds ONE test, so BOTH mutations report
 * `Tests 1 failed (1)` and what separates them is the soft failure count inside it.
 * `"error"` reports two (`expected 'error' to be 'info'` and `expected 1 to be +0`);
 * `"warning"` reports one, the severity claim, with the exit code still 0.
 *
 * So the exit-code claim is killed by exactly ONE severity mutation, `"info"` →
 * `"error"`, and the `info`-versus-`warning` decision (DR-0006-0004) is
 * discriminated only by the `--fail-on warning` leg: TC-0006-0032 / TC-0006-0033,
 * i.e. TDD-0034 / TDD-0035, both `todo` at this revision. Recorded as an EQUIVALENT
 * MUTANT against the TC clause that is weaker than the obligation, and deliberately
 * not closed by strengthening the assertion — an assertion stricter than the
 * contract encodes a reviewer-originated obligation as a hard assertion, which
 * `constitution/drift-protocol.md` forbids in those terms.
 *
 * ## The other thing the exit-code claim cannot see
 *
 * It asserts exit 0, so a `shouldFailDoctor` that NEVER fails satisfies it. Measured
 * on the branch this row exercises: `return summary.error > 0;` replaced by
 * `return false;` leaves this file `Tests 1 passed (1)`, and over the twenty-file
 * doctor closure recorded in `.qfai/evidence/implement-spec-0006.md#tdd-0031` it
 * produced `Test Files 18 passed | 2 skipped (20)` /
 * `Tests 87 passed | 14 skipped (101)`, identical to the clean run — so scoped to
 * that command, no suite in it observes the true direction of that branch. The
 * complementary `return true;` DOES redden the exit-code claim and nothing else, so
 * the claim is live on the verdict: one-sided, not vacuous. Killing the `false`
 * direction needs a tree that exits 1 under `--fail-on error`, which this TC's Setup
 * does not describe, and the nearest control in the pack (TC-0006-0033) sits on the
 * `--fail-on warning` branch and so on a different `return`. An open gap with no
 * owner, named rather than assigned to a row that does not cover it.
 *
 * ## Why the two claims are `expect.soft`
 *
 * The same mechanism the sibling suites cite — a hard failure aborts the `it`, so
 * later assertions read as covered without executing — but for a further reason
 * specific to this row: the equivalent-mutant measurement above is only obtainable
 * while the two claims fail SEPARATELY. Under hard asserts the severity claim
 * aborts the run and "the exit-code claim stayed green under the `warning`
 * mutation" is unobservable.
 *
 * The round-by-round derivation — mutations as needle text, blobs, outputs — is in
 * `.qfai/evidence/implement-spec-0006.md`.
 */
// QFAI:SPEC-0006:TC-0006-0029

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  editShippedWorkflow,
  runDoctorText,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/**
 * The installed shipped workflow this row hand-edits. The edit is what makes "the
 * advisory does not change the exit code" a live claim: a clean tree exits 0 with
 * no advisory at all, satisfying the letter of the exit-code assertion while
 * measuring nothing.
 */
const STALE_NAME = "qfai-tests.yml";

describe(
  "TC-0006-0029 (TDD-0031): the drift advisory is severity info and leaves --fail-on error at exit 0",
  { timeout: 60000 },
  () => {
    it("emits the drift finding at severity info and returns exit 0 under --fail-on error", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE_NAME);

      // GUARDS #1-#4 are PRECONDITIONS on the fixture and stay hard: on a tree that
      // is not in this state nothing below measures anything. The two claims after
      // them are soft, for the reason the header gives.

      // Guard #1 — the tree really does drift. One `toContain` closing three vacuity
      // modes, as the sibling suites' first guard does: the packaged copy resolved
      // and was readable, the provenance record is non-empty (the reader only visits
      // recorded names, so a non-empty `modified` is impossible from an empty
      // record), and the hand edit landed.
      const diff = await diffInstalledShippedWorkflows(dir);
      expect(
        diff.modified,
        "drift must be observable in this tree, or an exit code of 0 says nothing about an advisory that was never emitted",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/${STALE_NAME}`);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // Guard #2 — registered exactly once. The finding SET rather than the first
      // match, because `addCheck` is a bare push with no dedup: a `find` would hand
      // back one registration while a second carried a different severity, and the
      // severity claim below would read the first and pass.
      expect(
        findings,
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);

      // Guard #3 — nothing OTHER than the finding under test is severity `error`.
      // That is what makes the exit-code claim attributable in both directions:
      // under `--fail-on error` an unrelated error would drive the exit to 1 and the
      // claim would redden for a fixture reason, while a green claim would otherwise
      // only mean "this tree happened to carry no errors at all".
      //
      // Scoped to OTHER ids, and the scope is load-bearing rather than tidy. The
      // whole-summary form (`data.summary.error` is 0) is also true here, but it
      // reddens under this row's own oracle mutation (`severity: "info"` →
      // `"error"`), and a hard guard that reddens aborts the `it` before either claim
      // executes — leaving the oracle unmeasurable. This form is invariant under that
      // mutation, so both claims are observed reddening.
      //
      // The baseline it expects is already measured by a shipped test —
      // `tests/cli/doctor.test.ts`, "ignores warnings with --fail-on error" asserts
      // exit 0 from a fresh `runInit` tree under `failOn: "error"`.
      expect(
        data.checks
          .filter((entry) => entry.id !== "workflows.integrity" && entry.severity === "error")
          .map((entry) => entry.id),
        "no finding other than workflows.integrity may be severity `error`, or the exit code under `--fail-on error` is not attributable to this advisory",
      ).toEqual([]);

      const run = await runDoctorText(dir, "error");

      // Guard #4 — the invocation that produced the exit code is the run that
      // registered the finding. Two things at once, both needed:
      //
      // (a) the exit code is `shouldFailDoctor`'s verdict and not `runDoctor`'s
      //     `--autoremediate` CI-off early return, which yields a literal 0 without
      //     consulting it. That path never reaches `createDoctorData` and renders no
      //     check line, so a check id in the rendered text rules it out.
      //     (`runDoctorText` passes no `autoremediate`; this guard survives an edit
      //     to the helper that does.)
      // (b) severity is read from a FIRST invocation and the exit code from a SECOND.
      //     `qfai doctor` is read-only so the tree cannot move between them, but
      //     "cannot" is an argument and this is a measurement.
      //
      // The BARE ID only — no `[info]` tag, no group header, both TDD-0040's surface
      // — and the id is fixed by the doctor contract, not by the renderer.
      expect(
        run.stdout,
        "the rendered run must carry the workflows.integrity finding, or its exit code belongs to some other code path",
      ).toContain("workflows.integrity");

      // CLAIM, Verify bullet 1 — 「finding が `severity: 'info'` で含まれる」.
      // Observed at the registration site rather than in the rendered text, matching
      // every other suite in this family: severity is decided at `addCheck`, so a finding the
      // reader reports but nobody registers must fail here instead of passing on the
      // reader. (A count stood where "every other suite" now does; it went stale as the
      // family grew, which is why the property is named instead.)
      expect
        .soft(check?.severity, "an installed shipped-workflow drift finding is an info advisory")
        .toBe("info");

      // CLAIM, Verify bullet 2 — 「`shouldFailDoctor` が false を返す (exit 0 —
      // advisory は exit code を変えない)」. What this line cannot see is in the
      // header: it is invariant under `info` → `warning`, so it discriminates the
      // `error` severity alone and the `--fail-on warning` leg (TDD-0034 /
      // TDD-0035) owns the rest.
      expect
        .soft(
          run.exitCode,
          "the drift advisory must not change the exit code — `--fail-on error` counts errors, and an advisory is not one",
        )
        .toBe(0);
    });
  },
);

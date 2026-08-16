/**
 * Integration: the installed shipped-workflow drift advisory is RENDERED inside
 * the advisory-findings bucket of the 2-group text summary, and never inside the
 * blocking bucket.
 *
 * TC-0006-0029 (AC-0006-0022 / BR-0006-0019, grouping per BR-0006-0011) — Setup
 * 「`workflows.integrity` が drift を返すフィクスチャ」, Action 「`runDoctor({ root,
 * format: 'text', failOn: 'error' })` 相当を呼び…」.
 *
 * The TC carries THREE Verify bullets. This row owns the THIRD only — 「text
 * renderer が当該 finding を "warnings advisory of drift" group に配置する」 —
 * together with the rendered severity tag on the placed line, which the sibling
 * suite's docblock cedes here in those words ("no `[info]` tag, no group header,
 * both TDD-0040's surface"). Bullets 1 and 2 (registered severity, and
 * `shouldFailDoctor`'s verdict as an exit code) are TDD-0031's, in
 * `spec0006WorkflowsIntegrity.exitCode.test.ts`.
 *
 * ## Deliberately NOT asserted here
 *
 * - The EXIT CODE. `runDoctorText` returns it and this file ignores it on
 *   purpose: asserting exit 0 again would give bullet 2 a second SSOT, and the
 *   two copies could then disagree about which row a failure belongs to.
 * - The REGISTERED severity, i.e. `check.severity` off `createDoctorData`. That
 *   is bullet 1's observation point. This row's only contact with severity is
 *   the RENDERED tag (C4), which is a different surface: it can be wrong while
 *   the registration is right, and only the renderer can break it.
 * - The neighbouring surfaces, each with ITS OWN owner named:
 *   `skills.integrity`'s routing and the two group headers' existence are
 *   AC-0006-0014 / TC-0006-0018; the message body and the stale path are
 *   AC-0006-0021 (TC-0006-0027) and AC-0006-0023's repair text; the `summary:`
 *   counts are AC-0006-0025. Two of them are owned by NOBODY — the finding's
 *   ORDINAL position inside its bucket, and the empty-bucket placeholder
 *   wording, whose rendered string is in no AC, no TC and no clause of
 *   `.qfai/contracts/cli/qfai-doctor.md`, and is pinned by no test in the
 *   package (measured, both by grep). Unowned is not an invitation: the TC
 *   requires MEMBERSHIP of a bucket, not order within it, and an assertion
 *   stricter than the contract encodes a reviewer-originated obligation, which
 *   `constitution/drift-protocol.md` forbids in those terms. The measured line
 *   also carries an absolute machine-specific packaged path, so asserting it
 *   would be non-portable too.
 *
 * ## The header the TC names is not the header that renders
 *
 * The TC (and BR-0006-0011, and DR-0006-0004's plan entry) spell the bucket
 * "warnings advisory of drift". `formatDoctorText` renders
 * `== advisory findings (drift, non-blocking by default) ==`. The two DENOTE the
 * same bucket — BR-0006-0011 declares the group header strings stable
 * identifiers and `.qfai/contracts/cli/qfai-doctor.md` § "Finding grouping"
 * mandates exactly the two buckets — so this file needles the RENDERED literal
 * and never the spec's prose. Neither side is "fixed" here; the mapping is
 * recorded instead, since editing either would be a spec change dressed as a
 * test.
 *
 * ## Why the claims are soft and the guards are hard
 *
 * A hard failure aborts the `it`, so a hard claim would make its successors read
 * as covered without executing. That matters concretely here: the four claims
 * resolve to THREE independent claim-level oracles — C1 (the routing), C2 (the
 * upper delimiter) and C4 (the rendered severity tag), each with at least one
 * measured mutation that kills it while the other two stay green — and that
 * separation is only obtainable while they fail separately and are reported
 * separately.
 *
 * C3 is the one that is NOT a fourth oracle: given Guard #3 it is ENTAILED by
 * C1, because a single rendered occurrence below the advisory header cannot also
 * lie between the headers. It earns its place by printing the offending line
 * when the routing breaks, not by discriminating a mutation the others survive;
 * the derivation is on the claim itself, below.
 *
 * The guards are hard because each one is a precondition under which the claims
 * mean anything, and every one of them is INVARIANT under the mutations that
 * kill the claims — a guard that reddened alongside a claim would abort the run
 * and leave the oracle unmeasurable. Their numbers are stable labels from that
 * derivation, NOT execution order — the body runs G1, G6, G2, G3, G4, G5,
 * because a guard sits at the earliest point its inputs exist. Two of them are
 * shaped by the invariance constraint rather than by taste:
 *
 * - G3 is keyed on the BARE id, so the severity mutation (which moves the line
 *   between buckets but does not duplicate it) leaves the count at 1.
 * - G6 is scoped to OTHER ids. The whole-summary form (`summary.error` is 0) is
 *   also true in this fixture but REDDENS under the severity mutation, which is
 *   the trap the sibling suite recorded for its own third guard.
 *
 * ## Vacuity, which is the whole difficulty of a placement claim
 *
 * `findIndex` returns -1 for an absent header and every real line index exceeds
 * -1, so "below the advisory header" passes for free on a document with no
 * advisory header: G4 is what closes that. G5 keeps the window C3 scans
 * non-degenerate, since a filter over a zero-length slice reports a pass
 * forever. And the house shape
 * `expect(text).toMatch(/\[info\][^\n]*workflows\.integrity/u)` — correct for
 * TC-0006-0017's different obligation — would be satisfied by an occurrence in
 * the BLOCKING bucket, so it is not used: this row asserts a ROUTING, which in a
 * two-bucket split means "in A" AND "not in B".
 *
 * Indices are LINE indices, not `stdout.indexOf` character offsets: an id can
 * legitimately occur inside another finding's message body, and an offset would
 * then locate a position rather than a rendering.
 *
 * That the existence and order of the two headers are TC-0006-0018's assertions
 * (`spec0006DoctorProbeOrder.test.ts`) is why they appear here as GUARDS: this
 * row re-reads both indices only to locate the blocking-bucket window.
 *
 * `runDoctorText` was not widened for this row — it already returns `stdout`,
 * and why it captures rather than leaks it, why `format: "text"` is fixed, and
 * what its three-`return` scoping buys are in its own docblock, not restated
 * here; a prose copy is a second SSOT.
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
 * The installed shipped workflow this row hand-edits. Duplicated as a local
 * const rather than imported from the sibling suite that also edits it: a test
 * file is not a fixture module, and hoisting it into the helper is a
 * group-close refactor, not this row's business.
 */
const STALE_NAME = "qfai-tests.yml";

/** Fixed by the doctor contract, not by the renderer. */
const FINDING_ID = "workflows.integrity";

/**
 * The two rendered group headers, matched WITHOUT their `== ==` decoration so a
 * change to the decoration alone does not read as a routing defect. Both
 * spellings are the ones the two shipped `spec0006DoctorProbeOrder*` suites
 * already pin, so this row mints no third spelling of either.
 */
const BLOCKING_HEADER = "errors blocking the active profile";
const ADVISORY_HEADER = "advisory findings (drift, non-blocking by default)";

describe(
  "TC-0006-0029 (TDD-0040): the drift advisory renders below the advisory-findings header and not in the blocking bucket",
  { timeout: 60000 },
  () => {
    it("places the drift finding inside the advisory bucket, outside the blocking bucket, tagged [info]", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE_NAME);

      // Guard #1 (hard) — the tree really drifts, so the line under test is the
      // `modified` rendering the TC's Setup names and not the clean-tree `ok`
      // one. Attribution, primarily: the `ok` arm renders in the header-less ok
      // group ABOVE both headers, so a fixture that stopped drifting would
      // already redden C1 — this guard is what separates "the fixture stopped
      // drifting" from "the renderer stopped bucketing" at the point of
      // failure, and it survives a future refactor that folded the ok group into
      // the advisory bucket, where a clean tree WOULD satisfy C1-C3.
      const diff = await diffInstalledShippedWorkflows(dir);
      expect(
        diff.modified,
        "drift must be observable in this tree, or the line under test is the `installed`/`ok` rendering and says nothing about advisory placement",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/${STALE_NAME}`);

      // Guard #6 (hard) — nothing OTHER than the finding under test is severity
      // `error`, so the blocking bucket's contents are attributable to this
      // row's routing. Without it, C3's empty result could mean only "this
      // fixture happens to name nobody in that bucket". One notch stricter than
      // the bucket strictly needs, stated so the extra strictness is not read as
      // an oversight: the renderer excludes `skills.integrity` from the blocking
      // group by ID, so an `error` there would red this guard without moving a
      // line into the window C3 scans. Kept in the broader form — a tree whose
      // other checks turned `error` is a different fixture from the TC's, and
      // this row would rather hear about it here than in C3.
      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      expect(
        data.checks
          .filter((entry) => entry.id !== FINDING_ID && entry.severity === "error")
          .map((entry) => entry.id),
        "no finding other than workflows.integrity may be severity `error`, or the blocking bucket's contents are not attributable to this row's routing",
      ).toEqual([]);

      const run = await runDoctorText(dir, "error");
      const lines = run.stdout.split("\n");

      // Guard #2 (hard) — the captured document is the diagnostic pass's
      // rendering. It also closes the arithmetic hole behind C2: with no
      // `summary:` line, `findingIdx < -1` is false and the failure would read
      // as a placement defect.
      const summaryIdx = lines.findIndex((line) => line.startsWith("summary: "));
      expect(
        summaryIdx,
        "the rendered document must carry the `summary:` line, or no bucket was rendered at all and placement is unobservable",
      ).toBeGreaterThan(-1);

      // Guard #3 (hard) — rendered on exactly one line. The SET, not a `find`:
      // "the line" needs a referent, and under DOUBLE rendering "some occurrence
      // sits below the advisory header" is true while the blocking bucket names
      // it too, which is precisely what Verify bullet 3 denies. Not to be
      // softened to accommodate a mutation that renders the line twice — that
      // mutation is meant to be caught here, legibly.
      const findingIdxs = lines.flatMap((line, index) =>
        line.includes(FINDING_ID) ? [index] : [],
      );
      expect(
        findingIdxs,
        "workflows.integrity must be rendered on exactly one line, or `the` line has no referent and an advisory-bucket occurrence can coexist with a blocking-bucket one",
      ).toHaveLength(1);
      // `-1` fails in the safe direction (C1's `toBeGreaterThan` rejects it) for
      // the same reason `runDoctorText` seeds its exit code with it; unreachable
      // while the guard above holds, since a hard failure aborts the test.
      const findingIdx = findingIdxs[0] ?? -1;

      const errorHeaderIdx = lines.findIndex((line) => line.includes(BLOCKING_HEADER));
      const advisoryHeaderIdx = lines.findIndex((line) => line.includes(ADVISORY_HEADER));

      // Guard #4 (hard) — both headers exist and are in contract order. THE
      // anti-vacuity guard: see the header on why "below the advisory header" is
      // free against -1. It closes the swapped-header mode at the same time, in
      // which C3's slice is zero-length and filters to `[]` for nothing.
      expect(
        errorHeaderIdx,
        "the blocking-bucket header must be present, or the window C3 scans has no left edge",
      ).toBeGreaterThan(-1);
      expect(
        advisoryHeaderIdx,
        "the advisory header must be present and must follow the blocking header, or `below the advisory header` is a comparison against -1 that every line satisfies",
      ).toBeGreaterThan(errorHeaderIdx);

      // Guard #5 (hard) — the blocking-bucket window is non-degenerate, so C3
      // scans something. Expressed as a WINDOW WIDTH and not as an assertion on
      // the empty-bucket placeholder's wording, which is another AC's surface.
      expect(
        advisoryHeaderIdx - errorHeaderIdx,
        "the blocking bucket must render at least one line between the headers, or the window C3 scans is empty by construction and asserts nothing",
      ).toBeGreaterThan(1);

      // CLAIM 1, Verify bullet 3 (lower delimiter) — the rendered line sits
      // BELOW the advisory-findings header.
      expect
        .soft(
          findingIdx,
          "the drift advisory must render inside the advisory bucket — a line above the advisory header is in the blocking bucket or the ok group",
        )
        .toBeGreaterThan(advisoryHeaderIdx);

      // CLAIM 2 (upper delimiter) — and ABOVE the `summary:` line that closes
      // the bucket. A bucket has two delimiters: without this, "below the
      // advisory header" is satisfied by any trailer appended after the summary,
      // which is the same vacuity as a bare `toContain` moved one header down.
      // Keyed on the `summary: ` PREFIX and not on the counts, which are
      // AC-0006-0025's surface.
      expect
        .soft(
          findingIdx,
          "the drift advisory must render inside the advisory bucket, which the summary line closes — a line after it belongs to no bucket",
        )
        .toBeLessThan(summaryIdx);

      // CLAIM 3 (complement) — and nowhere in the blocking-bucket window, which
      // is the half that makes this a ROUTING claim rather than a presence one.
      // The FILTERED SLICE rather than a negated `toContain` on the document, so
      // a failure prints the offending line verbatim. Honest limit, recorded
      // rather than papered over: given Guard #3 this is ENTAILED by C1 — one
      // occurrence below the advisory header cannot also sit between the headers
      // — so it is kept for legibility of the failure and must NOT be counted as
      // a second independent oracle.
      expect
        .soft(
          lines
            .slice(errorHeaderIdx + 1, advisoryHeaderIdx)
            .filter((line) => line.includes(FINDING_ID)),
          "the drift advisory must not appear in the blocking bucket — it is advisory, and the blocking bucket is what drives exit 1",
        )
        .toEqual([]);

      // CLAIM 4 — the placed line's rendered severity tag. Extracted from the
      // line ALREADY located by bare id and deliberately not part of the
      // locator: a locator like `/^\[info\] workflows\.integrity/` would empty
      // `findingIdxs` under a severity mutation, abort the test at Guard #3, and
      // leave C1-C3 unexecuted. The extracted TAG rather than a `toMatch` on the
      // whole line, so the failure reads `expected 'error' to be 'info'` instead
      // of dumping a 400-character message body.
      const tag = lines[findingIdx]?.match(/^\[([a-z]+)\] /u)?.[1];
      expect
        .soft(
          tag,
          "the drift advisory renders as an info line — the renderer prints the registered severity, and `modified` is `info` per the doctor contract",
        )
        .toBe("info");
    });
  },
);

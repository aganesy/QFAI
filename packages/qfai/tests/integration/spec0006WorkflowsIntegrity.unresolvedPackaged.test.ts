/**
 * Integration: the unresolvable-packaged-copy SKIP of the installed
 * shipped-workflow drift check (`qfai doctor`).
 *
 * TC-0006-0030 leg (c) — Setup 「install 済み package 側の shipped copy を解決でき
 * ない tree」, Verify 「check が severity `info` で skip し、drift として報告しな
 * い」 — which is BR-0006-0020's closing clause (「package 同梱 copy を解決できない
 * 場合は severity `info` で skip する」) under AC-0006-0023. Leg (a) is TDD-0032's
 * repair-text suite. LEG (b) IS COVERED: `TDD-0038` in `provenanceGate.test.ts` owns it
 * whole, and that file declares the `TC-0006-0030` marker at its own `:31` — grep the
 * markers, three files carry one. This header said the opposite (leg (b) NOT COVERED,
 * its drift-suite half carrying no marker to attribute it) and both halves of that are
 * false at these bytes; the division it described is gone as well, `CR-20260810-0001`
 * Option A having reworded leg (b) into the `absent` STATE, which does not divide by the
 * record. `declined` is outside this TC now, with `TC-0006-0034` / `TC-0006-0035` named
 * as its owners.
 *
 * That CR is `Status: approved`, `Approved option: A`, `Applied at 1f60a486`, and its
 * blocked set (`TDD-0038`, `TDD-0037`) is released. This header called it
 * `Class: defect`, `open`, which it was when written.
 *
 * Leg (c) is unaffected by it, and BY CONSTRUCTION rather than because the CR has since
 * been settled: this leg fires on `resolvePackagedWorkflowsDir() === undefined`, and
 * that early return in `diffInstalledShippedWorkflows` precedes the provenance record
 * read ENTIRELY, so no ADOPTER-side state — which is the whole of what the CR's three
 * options (A, B, C) chose between — can reach this leg's fixture, its severity or its
 * expected `modified` list. Follow the SYMBOL, not the number: the CR measured that
 * return at `workflowsIntegrity.ts:284-293` with the record read at `:301`, anchored to
 * `a67ed0c7`, and it is `:296-305` and `:313` as measured at these bytes.
 *
 * ## Why the packaged resolver is MOCKED here
 *
 * `getInitAssetsDir` resolves two candidates relative to `import.meta.url` and
 * returns the first that exists (`src/shared/assets.ts:5-19`). It reads neither
 * the adopter root, nor the cwd, nor any environment variable, so — scoped to
 * that resolver as written — NO STATE OF THE FIXTURE TREE CAN MAKE IT THROW.
 * Real unresolvability is a broken or partial install of the package the suite is
 * running FROM, and arranging it for real means deleting the packaged assets out
 * from under every other suite in the same run. The mock is the seam, and the
 * precedent is `tests/core/specLayoutCaseExact.test.ts`, which fakes `fs.access`
 * for the states its host filesystem cannot produce and says so in the same place.
 *
 * SCOPED, because a module mock is a whole-file instrument:
 *
 * - the fake is keyed on a toggle that stays OFF while the adopter tree is
 *   seeded. `runInit` reaches the same module (`src/cli/lib/assets.ts:1`
 *   re-exports it) and with the toggle open would have no template to copy;
 * - `afterEach` resets it, so a failing assertion cannot leak the open toggle
 *   into a later test in this file;
 * - the reader reaches the mock because it imports the resolver from exactly
 *   this module (`src/core/doctor/workflowsIntegrity.ts:94`), not because the
 *   mock is global.
 *
 * WHAT ELSE THE OPEN TOGGLE MOVES, named rather than left to be discovered: the
 * skills-integrity check reads the same resolver and catches its throw into
 * `skipped_missing_assets` (`src/core/skillsIntegrity.ts:48-58`), which
 * `doctor.ts` emits as an `info` skip of its own. The mocked window therefore
 * models a broken install for BOTH integrity checks at once — which is the state
 * this leg describes rather than a distortion of it — and it is why every
 * assertion below filters on the `workflows.integrity` id instead of counting or
 * sweeping the whole `checks` array.
 *
 * Observed through `createDoctorData`, matching every other suite in this family (a
 * count stood here and went stale as the family grew — the property is what holds): the
 * severity and the payload are decided at the registration site, so a skip the
 * reader reports but nobody registers must fail here rather than pass on the
 * reader. The reader is read too, but only in the guards.
 *
 * This file grows row by row; each describe block is one ledger row. The
 * round-by-round derivation — mutations as needle text, blobs, outputs — is in
 * `.qfai/evidence/implement-spec-0006.md`.
 */
// QFAI:SPEC-0006:TC-0006-0030

import { afterEach, describe, expect, it, vi } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  editShippedWorkflow,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

import type * as AssetsModule from "../../src/shared/assets.js";

/**
 * The mock's switch. `vi.hoisted` is required rather than stylistic: `vi.mock`
 * is hoisted above every import, so a plain module-level `const` would not
 * exist yet when the factory closes over it.
 */
const packagedAssets = vi.hoisted(() => ({ unresolvable: false }));

vi.mock("../../src/shared/assets.js", async (importOriginal) => {
  const actual = await importOriginal<typeof AssetsModule>();
  return {
    ...actual,
    getInitAssetsDir: (): string => {
      if (packagedAssets.unresolvable) {
        // Shaped like the real failure, which is a plain `Error` and not a
        // filesystem error (`src/shared/assets.ts:21-27`): the resolver has
        // already decided that neither candidate exists, so nothing downstream
        // may key on an `errno` or a `code` this throw does not carry.
        throw new Error("test fixture: the packaged init assets cannot be resolved");
      }
      return actual.getInitAssetsDir();
    },
  };
});

afterEach(() => {
  packagedAssets.unresolvable = false;
});

const pool = useAdopterTreePool();

/**
 * The installed shipped workflow this row hand-edits. The edit is what makes
 * "drift として報告しない" a LIVE claim instead of a vacuous one: the tree really
 * does carry a recorded, stale file, so a skip that leaked a drift report has
 * something to leak.
 */
const STALE_NAME = "qfai-tests.yml";

describe(
  "TC-0006-0030 (TDD-0039): an unresolvable packaged workflows directory skips at severity info with an empty modified list",
  { timeout: 60000 },
  () => {
    it("registers one info-severity skip that reports no drift, in a tree whose drift is otherwise reported", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE_NAME);

      // GUARDS #1-#2 are PRECONDITIONS on the fixture and stay hard: on a tree
      // that is not in this state nothing below measures anything. Everything
      // after them is this row's claim and is `expect.soft`, for the reason the
      // sibling provenance-gate suite gives at length — hard asserts observe only
      // the FIRST failure, so later claims read as covered without having executed.

      // Guard #1 — with the REAL resolver this tree reports drift. It closes
      // three vacuity modes at once, which is why it is a single `toContain`
      // rather than three assertions: the packaged directory resolved and was
      // readable, the provenance record is non-empty (the reader only ever
      // visits recorded names, so a non-empty `modified` is impossible from an
      // empty record), and the hand edit landed. Without it, a clean or an
      // unrecorded tree would make every absence claim below pass while nothing
      // was being withheld.
      const resolved = await diffInstalledShippedWorkflows(dir);
      expect(
        resolved.modified,
        "drift must be observable while the packaged copy still resolves, or the silence after it stops resolving is vacuous",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/${STALE_NAME}`);

      packagedAssets.unresolvable = true;

      // Guard #2 — the mock actually reaches the reader's resolver, and the
      // reader answers with the state this row is about. BOTH fields in one
      // `toEqual` deliberately: they are the two halves of this row's selector
      // ("skips … with an empty modified list"), `modified` is the reader field
      // that phrase names, and pinning them together prints whichever one the
      // fixture failed to produce.
      //
      // A guard rather than a claim: the emission is what this row is
      // responsible for, and a `status` the reader never produces would make
      // the emission untestable rather than wrong.
      const skipped = await diffInstalledShippedWorkflows(dir);
      expect(
        { status: skipped.status, modified: skipped.modified },
        "the mocked resolver must drive the reader into the unresolved skip with an empty modified list, or this row measures some other state",
      ).toEqual({ status: "skipped_unresolved", modified: [] });

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      // The finding SET, not the first match. `addCheck` is a bare push with no
      // dedup, so a `find` would hand back one registration while a second one
      // carried a drift payload, and every assertion below would read the first
      // and pass.
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // `?? ""` so every message assertion below reddens with ITS OWN LABEL on an
      // ABSENT emission rather than with a type complaint: `toMatch` and `toContain`
      // reject a non-string receiver BEFORE `.not` is consulted and a `TypeError`
      // carries no custom message — measured at RED, where `check?.message` produced a
      // bare `.toMatch() expects to receive a string, but got undefined`.
      //
      // The cost, stated rather than hidden: FOUR of the seven assertions below PASSED
      // VACUOUSLY at RED — not two, as this said — for two distinct reasons. (i) the
      // `?? ""` collapse feeds both message sweeps the empty string; (ii) absence
      // itself satisfies the claim, the optional chain yielding `undefined` for the
      // payload one and an empty `findings` array joining to an empty surface for the
      // filename one. Their falsifiability comes from the mutation record, not that
      // run; absence is named by the registration and severity claims and the empty
      // string by the renderer-slot claim — the three that reddened.
      const messageText = check?.message ?? "";

      // The check is REGISTERED, exactly once. Leg (c) says the check SKIPS, not
      // that it disappears, so silence is a violation — and this is the assertion
      // that reddened at RED with `expected [] to have a length of 1`, the state
      // having fallen through both pre-existing arms' status tests.
      //
      // The count is also this row's MUTUAL-EXCLUSIVITY pin in the one direction
      // observable from here: a second registration in THIS state reddens it. The
      // other direction — the new arm firing ALONGSIDE the drift one in a DRIFTED
      // tree — is unobservable in this fixture and is not unowned: TDD-0038's and
      // TDD-0032's own length pins redden for it, TDD-0038's comment having named
      // that transition before this row landed.
      expect
        .soft(findings, "workflows.integrity must be registered exactly once per doctor run")
        .toHaveLength(1);

      // Severity, verbatim from leg (c) 「severity `info` で skip し」. `toBe`
      // rather than `not.toBe("ok")`: the exact value is what the leg states, and
      // it COLLIDES with the drift finding's — the collision this row's steering
      // entry recorded against TDD-0032's guard #2, whose scope comment this commit
      // corrects.
      //
      // The EXIT-CODE consequence of `info` is deliberately not asserted here:
      // `shouldFailDoctor` counts `warning + error` and a fresh `runInit` tree
      // carries unrelated warnings, so a pin here would measure a fixture artefact.
      // TDD-0031 / TDD-0034 / TDD-0035 own it.
      expect
        .soft(check?.severity, "an unresolvable packaged copy is an info-severity skip")
        .toBe("info");

      // 「drift として報告しない」, first half: the PAYLOAD carries no drift list.
      //
      // Absence of the ONE key, deliberately NOT a key-set `toEqual`:
      // BR-0006-0022's four-key payload is TDD-0036's to pin and that row is
      // `todo`, so a key-set pin here would decide its shape from outside it. What
      // this line owns is why an EMPTY list is as wrong as a full one —
      // `modified: []` claims nothing is stale about a tree that was never
      // compared, the same class as the empty-record `ok` emission TDD-0030 had to
      // gate on `comparedCount > 0`, and false here in particular because guard #1
      // measured a stale file.
      expect
        .soft(
          check?.details?.["modified"],
          "a skip must not carry a drift list at all — an empty one claims nothing is stale about a tree that was never compared",
        )
        .toBeUndefined();

      // 「drift として報告しない」, second half: no rendered field names the stale
      // file. The needle is the bare FILE name over every rendered field of EVERY
      // registered finding, so payload growth can only produce a false RED here,
      // never a false GREEN. It OVERLAPS the payload claim above without subsuming
      // it, and all three directions are measured rather than argued: a non-empty
      // `modified` reddens both, `modified: []` reddens only the line above, and a
      // message naming the file in prose reddens only this one.
      const findingSurface = findings
        .map(
          (finding) =>
            `${finding.title}\n${finding.message}\n${JSON.stringify(finding.details ?? {})}`,
        )
        .join("\n");
      expect
        .soft(
          findingSurface,
          "a skipped check must not name any installed shipped workflow, or it is reporting drift it never measured",
        )
        .not.toContain(STALE_NAME);

      // 「drift として報告しない」, third half — the one the two above miss, and it
      // is not hypothetical: a drift-arm copy-paste asserts a DIFFERENCE while
      // naming no file, its `modified.join(", ")` rendering empty.
      //
      // A DRIFT-VOCABULARY sweep and no longer a `differ` one: `/\bdiffer/i` alone
      // left two measured surviving mutants, both reporting drift in prose ("out of
      // date", "found stale") that needle does not contain. This line is leg (c)'s
      // only oracle against a prose drift claim, so it sweeps the vocabulary.
      //
      // Over-broad ON PURPOSE and admitted in the label — the discipline, not a
      // concession. A negative sweep fails only in the FALSE-RED direction, so
      // breadth cannot admit a violation while narrowing could; `differ` already
      // reddens compliant wordings that DENY a difference, and broadening adds more
      // of that and no false GREEN. It pins no content either, so the wording ceiling
      // at the end of this block does not reach it.
      //
      // The bare noun `drift` is EXCLUDED, measured: this arm's compliant message ends
      // "…and no drift is reported", so `/\bdrift/i` reddens the CURRENT text — an
      // actual RED, not a tolerable false-RED risk — and carving that denial out of
      // the needle would pin its wording, i.e. the content pin the ceiling bars.
      // `drifted` is in, no denial here using the participle. Named gap: a positive
      // claim on the noun alone survives, leaving the two claims above against it.
      expect
        .soft(
          messageText,
          "a skip must not state in any words that installed workflows are out of step with the packaged copy — this sweep is deliberately broad over drift vocabulary (`differ`, `stale`, `outdated`, `out of date`, `mismatch`, `drifted`), so a compliant rewording using any of them will redden it, which is the only direction a negative sweep can fail in",
        )
        .not.toMatch(/\b(?:differ|stale|outdated|mismatch|drifted|out[ -]of[ -]date)/i);

      // The unresolved operand must not be RENDERED. In this state
      // `packagedDir` is `undefined` BY CONSTRUCTION — the reader's early return
      // sets it so — which makes this a property of the state leg (c) names
      // rather than a general style rule: an emission that interpolates it prints
      // the literal `undefined` into operator-facing prose, and the drift branch
      // directly above is the template a later editor will copy.
      expect
        .soft(
          messageText,
          "the message must not render the unresolved packaged operand — it is `undefined` in this state, so interpolating it prints the word",
        )
        .not.toContain("undefined");

      // The renderer slot is non-empty. `formatDoctorText` prints
      // `[severity] id: message` and nothing else, so an empty message prints the
      // bare line `[info] workflows.integrity:` — and it is what keeps the two
      // sweeps above from being vacuous on their message half.
      //
      // NON-EMPTINESS ONLY, and the ceiling is deliberate: the contract's emission
      // table has no row for this state and BR-0006-0020 fixes the SEVERITY without
      // fixing the wording, so a POSITIVE content pin here would encode a
      // reviewer-originated obligation as a hard assertion — which the drift protocol
      // forbids in those terms. It does not reach the negative sweeps above, which
      // fix nothing the message must say. The one wording rule that does exist, no
      // command token, is scoped by BR-0006-0020 to the drift finding's body.
      expect
        .soft(
          messageText,
          "the message is the only human surface, so it must not be an empty renderer slot",
        )
        .toMatch(/\S/);
    });
  },
);

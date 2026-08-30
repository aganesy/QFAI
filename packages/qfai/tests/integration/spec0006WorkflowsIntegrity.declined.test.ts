/**
 * The drift finding's `details` payload carries `declined` alongside `modified`,
 * and a declined-only tree still raises no drift finding — the `ok` check itself
 * stays registered, which the boundary row asserts.
 *
 * TC-0006-0034 (AC-0006-0026 / EX-0006-0027) — Setup 「temp dir に init した adopter
 * tree で、provenance entry を持つ shipped workflow の 1 つを手編集し (modified)、別の
 * 1 つを install 後に削除する (declined)」, Action 「`qfai doctor --format json` を
 * 実行する」, Assert 「`details` が `workflowsDir` / `modified` / `declined` /
 * `packagedDir` の 4 key を持つこと」ほか。
 *
 * ## What `declined` is, and why it is payload rather than a trigger
 *
 * `shared/provenance.ts` `resolveWorkflowFileState` gives the state its meaning:
 * a name with a provenance ENTRY whose file is ABSENT on disk was deliberately
 * removed — "never recreated, never reported as stale, never pruned". The
 * shipped-workflows contract's §3 says `declined` is never reported again, so it
 * cannot become a reason to emit. It is information the operator needs while a
 * finding is being emitted for some OTHER reason: without it, an operator reading
 * a drift report cannot tell that QFAI knows the missing file is missing and is
 * leaving it alone on purpose.
 *
 * That is the whole of the distinction this row and TC-0006-0035 split between
 * them: this one pins that `declined` APPEARS in the payload of a finding that
 * exists; the boundary pins that it never CAUSES one.
 *
 * ## The key set is asserted exactly, and a sibling row asked for that
 *
 * `TDD-0030`'s ok-arm assertion carries a note addressed to this row by name: the
 * row landing `packagedDir` and `declined` "will be looking at this line", and
 * loosening it to `toContain` would make a deleted property stop being pinned
 * silently rather than fail. That line is NOT loosened here and does not need to
 * be — it governs the `ok` emission, and this payload change is on the `info`
 * emission. Recorded because the warning was written for a reader in this
 * position, and "I read it and it does not apply" is the only answer that closes
 * it.
 *
 * `toEqual` on the sorted key list rather than four `toContain`s, for the same
 * reason the ok arm gives: a key set asserted by containment does not fail when a
 * FIFTH key appears, and `details` is a public JSON surface where an accidental
 * addition is a compatibility event.
 *
 * ## The message must not name the declined file
 *
 * TC-0006-0034's Assert closes with 「message body は declined file を stale として
 * 名指ししないこと」, and it is asserted negatively here. The contract reason: the
 * message's repair instruction tells the operator to replace each listed file with
 * the packaged copy, and a declined file listed there would instruct the operator
 * to undo a removal QFAI has promised never to undo.
 *
 * The round-by-round derivation — RED output, the production change, mutations as
 * needle text — is in `.qfai/evidence/implement-spec-0006.md`.
 */
// QFAI:SPEC-0006:TC-0006-0034
// QFAI:SPEC-0006:TC-0006-0035

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import { readInstallProvenance } from "../../src/shared/provenance.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  deleteShippedWorkflow,
  editShippedWorkflow,
  runDoctorText,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/** The recorded shipped workflow this suite hand-edits — the `modified` operand. */
const STALE_NAME = "qfai-tests.yml";

/** The recorded shipped workflow this suite deletes after install — the `declined` operand. */
const DECLINED_NAME = "qfai-validate.yml";

const adopterPath = (name: string): string => `${ADOPTER_WORKFLOWS_DIR}/${name}`;

/**
 * Narrowing readers rather than assertions on `unknown`. Local copies of the two
 * `drift.test.ts` defines, and deliberately not imported from it: a test file is
 * not a module surface, and the alternative — exporting helpers between suites —
 * couples two rows' files so that a change to one row's narrowing can redden the
 * other. Five lines duplicated is the cheaper coupling.
 *
 * Each returns `undefined` rather than throwing or defaulting, so a payload of the
 * wrong SHAPE fails the assertion that reads it instead of passing on a fabricated
 * empty array.
 */
function readStringArray(
  details: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  const value = details?.[key];
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((entry) => typeof entry === "string") ? value : undefined;
}

function sortedDetailsKeys(details: Record<string, unknown> | undefined): string[] | undefined {
  return details === undefined ? undefined : Object.keys(details).sort();
}

describe(
  "TC-0006-0034 (TDD-0036): details lists declined alongside modified",
  { timeout: 60000 },
  () => {
    it("carries workflowsDir, modified, declined and packagedDir while staying an info advisory", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE_NAME);
      await deleteShippedWorkflow(dir, DECLINED_NAME);

      // GUARDS #1-#3 are PRECONDITIONS and stay hard. The claims after them are
      // soft, so a payload missing two keys reports both rather than the first.

      // Guard #1 — the fixture really is in the two-state configuration this row
      // needs, and BOTH halves are checked. Drift alone would leave `declined`
      // empty and every claim about it vacuously satisfiable; a deletion alone
      // would emit no drift finding (which is TC-0006-0035's subject, not this
      // row's). The deleted name keeps its provenance entry — `deleteShippedWorkflow`
      // removes the file only — which is what makes it `declined` rather than
      // `absent` under `resolveWorkflowFileState`.
      const diff = await diffInstalledShippedWorkflows(dir);
      expect(
        diff.modified,
        "the hand-edited file must be observable as drift, or a finding never exists to carry a payload",
      ).toContain(adopterPath(STALE_NAME));

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");

      // Guard #2 — registered exactly once. The finding SET rather than the first
      // match: `addCheck` is a bare push with no dedup.
      expect(
        findings,
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);
      const check = findings[0];

      // Guard #3 — the emission under test is the DRIFT arm. `details` is asserted
      // below against the drift payload, and the `ok` and `skipped_unresolved` arms
      // carry different ones; without this, a run that took another arm would fail
      // the key-set claim for a reason that has nothing to do with `declined`.
      expect(
        check?.severity,
        "this row reads the drift emission, so the run must have taken that arm",
      ).toBe("info");

      // CLAIM 1 — 「`details` が `workflowsDir` / `modified` / `declined` /
      // `packagedDir` の 4 key を持つこと」. Exact, for the reason the header gives.
      expect
        .soft(
          sortedDetailsKeys(check?.details),
          "the drift payload carries exactly workflowsDir, modified, declined and packagedDir — a fifth key is a compatibility event on a public JSON surface",
        )
        .toEqual(["declined", "modified", "packagedDir", "workflowsDir"]);

      // CLAIM 2 — 「`details.modified` が手編集 file を名指しすること」.
      expect
        .soft(
          readStringArray(check?.details, "modified"),
          "`modified` must name the hand-edited file",
        )
        .toContain(adopterPath(STALE_NAME));

      // CLAIM 3 — 「`details.declined` が削除 file を名指しすること」. Asserted as an
      // exact list rather than by containment: the deleted name is the only
      // recorded name absent from disk, so containment would also pass on a
      // `declined` that swept in every recorded name.
      expect
        .soft(readStringArray(check?.details, "declined"), "`declined` must name the deleted file")
        .toEqual([adopterPath(DECLINED_NAME)]);

      // CLAIM 4 — 「message body は declined file を stale として名指ししないこと」.
      // Negative and scoped to the file NAME rather than to the whole path, which
      // is the stronger form: the path's directory prefix appears in the message
      // legitimately, so a needle on the full path would be satisfied by a message
      // that named the file some other way.
      expect
        .soft(
          check?.message,
          "the repair instruction must not list the declined file — it tells the operator to restore each listed file, and QFAI has promised never to restore this one",
        )
        .not.toContain(DECLINED_NAME);

      const run = await runDoctorText(dir, "error");

      // CLAIM 5 — 「finding severity は `info` のままで exit code は不変であること」.
      // The severity half is guard #3; this is the exit-code half, read from a run
      // that renders the finding so the exit code cannot belong to `runDoctor`'s
      // `--autoremediate` CI-off early return.
      expect(
        run.stdout,
        "the rendered run must carry the workflows.integrity finding, or its exit code belongs to some other code path",
      ).toContain("workflows.integrity");
      expect
        .soft(run.exitCode, "adding `declined` to the payload must not change the exit code")
        .toBe(0);
    });
  },
);

describe(
  "TC-0006-0035 (TDD-0037): a declined-only tree emits no drift finding",
  { timeout: 60000 },
  () => {
    it("reports severity ok with no drift finding and no declined key in the payload", async () => {
      const dir = await pool.seedAdopterTree();

      // CLAIM 5, first half — the message on a tree where a comparison DID happen.
      // `CR-20260818-0002`, approved 2026-08-23, option A. The `ok` arm has two
      // messages and, until this, neither was pinned by any test: the production
      // repair landed in round 18 and the assertion beside it did not, so the
      // branch that stopped asserting a match nobody made could have been reverted
      // in silence. Taken here rather than in a file of its own because the tree
      // this row seeds is a matching tree until the deletions below, so both
      // directions cost one fixture and are demonstrably the same tree.
      const beforeDeletion = await createDoctorData({ startDir: dir, rootExplicit: true });
      const matching = beforeDeletion.checks.find((entry) => entry.id === "workflows.integrity");
      expect(matching?.severity, "an untouched installed tree is `ok`").toBe("ok");
      expect(
        matching?.message,
        "on a tree whose installed files were compared and matched, saying so is true",
      ).toBe("installed shipped workflow(s) match the packaged copy");

      // Every RECORDED name is deleted, derived from the record rather than from a
      // hard-coded list. Two reasons, and the second is the load-bearing one:
      // a literal list silently stops covering the tree when the package ships a
      // third workflow, and this row's whole claim is that the `changed` bucket is
      // EMPTY — a name the fixture forgot to delete would drift or match, and
      // either way the row would be measuring a different tree than it names.
      const recorded = Object.keys((await readInstallProvenance(dir)).workflows);
      for (const name of recorded) {
        await deleteShippedWorkflow(dir, name);
      }

      // Guard #1 — the record survived the deletions. This is what separates
      // `declined` from `absent`: an entry with no file is a deliberate removal,
      // an absent file with no entry was never installed, and only the first is
      // this row's subject. `deleteShippedWorkflow` removes the file only, but
      // "removes the file only" is an argument and this is a measurement.
      expect(
        Object.keys((await readInstallProvenance(dir)).workflows),
        "the provenance record must survive the deletions, or the tree is `absent` rather than `declined`",
      ).toEqual(recorded);

      // Guard #2 — the fixture is non-trivial. On an empty record every name is
      // unrecorded, the reader visits nothing, and "no drift finding" would hold
      // for a reason that has nothing to do with `declined`.
      expect(
        recorded.length,
        "the record must name at least one workflow, or this row is asserting silence about an empty comparison",
      ).toBeGreaterThan(0);

      const diff = await diffInstalledShippedWorkflows(dir);

      // Guard #3 — the tree really is declined-only: nothing drifted, and every
      // recorded name landed in `declined`. Without this the claims below hold on
      // a tree where the deletions never took effect.
      expect(diff.modified, "a declined-only tree has an empty `changed` bucket").toEqual([]);
      expect(
        diff.declined,
        "every recorded name must be classified declined, or the fixture is not the state this row names",
      ).toHaveLength(recorded.length);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");

      // Guard #4 — registered exactly once, as in the sibling. The check still
      // emits: the TC forbids a DRIFT finding, not the check itself.
      expect(
        findings,
        "workflows.integrity must be registered exactly once per doctor run",
      ).toHaveLength(1);
      const check = findings[0];

      // CLAIM 1 — 「check severity は `ok` であること」, and by the doctor contract's
      // emission table that is also the statement that no drift finding was
      // emitted: the drift arm is the only producer of severity `info` for this id
      // on a resolvable packaged copy, so `ok` here excludes it.
      expect
        .soft(
          check?.severity,
          "a declined name is never reported again — §3 — so a tree that has only declined names is `ok`",
        )
        .toBe("ok");

      // CLAIM 2 — 「したがって `details.declined` も出力に現れないこと」. The ok arm's
      // payload is `workflowsDir` only. Asserted as an exact key list rather than
      // as `declined`-absent, because that is the form `TDD-0030` pins on this same
      // arm and a second, weaker assertion on the same object would be the loosening
      // its note warns about, arriving from a different file.
      expect
        .soft(
          check?.details === undefined ? undefined : Object.keys(check.details).sort(),
          "the ok payload carries `workflowsDir` only — `declined` is drift-finding payload and must not leak onto the silent arm",
        )
        .toEqual(["workflowsDir"]);

      // CLAIM 5, second half — the message on a tree where NOTHING was compared.
      // Every recorded name is declined, so "installed shipped workflow(s) match
      // the packaged copy" would state something QFAI never observed: there are no
      // installed shipped workflows left to match anything. Pinned against the
      // matching message captured above, so the two arms are asserted to differ
      // rather than each asserted alone.
      expect
        .soft(
          check?.message,
          "a declined-only tree compared nothing, and the message must not claim a match",
        )
        .toBe("every recorded shipped workflow was removed by this repository; nothing to compare");
      expect
        .soft(check?.message, "the two `ok` arms must not collapse into one message")
        .not.toBe(matching?.message);

      const run = await runDoctorText(dir, "error");

      // CLAIM 3 — silence does not become a failure. Not in the TC's Assert list,
      // and asserted anyway for one reason that is not scope creep: the check
      // remains registered, so an `ok` that somehow reached the exit-code
      // aggregation would be a regression this row is the only one positioned to
      // see. Labelled so a red is readable.
      expect.soft(run.exitCode, "an ok check must not change the exit code").toBe(0);
    });
  },
);

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
// QFAI:SPEC-0006:TC-0006-0028

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import { readInstallProvenance } from "../../src/shared/provenance.js";
import {
  ADOPTER_WORKFLOWS_DIR,
  adopterWorkflowPath,
  deleteInstallProvenanceRecord,
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

/**
 * The `details` key SET as a codepoint-sorted array, or `undefined` when the
 * payload is absent. The sort is named in the function's own name because it is
 * the load-bearing property, not an implementation detail: it turns a caller's
 * `toEqual` from an assertion about insertion order — which no consumer of the
 * JSON surface depends on — into one about the key set.
 */
function sortedDetailsKeys(details: Record<string, unknown> | undefined): string[] | undefined {
  return details === undefined ? undefined : Object.keys(details).sort();
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
      // Warranted by the TC's SETUP for leg (a) — 「provenance entry を持つ shipped
      // workflow を 1 つ手編集した」, exactly one file edited, which is what this
      // assertion's own label already says — and NOT by its Verify. The Verify's
      // 「1 件」 bounds EMISSIONS of the check, not the cardinality of `modified`,
      // and the registration pin above is where that reading belongs. Without this
      // pin an implementation that reported every installed workflow would pass.
      expect(modified?.length, "exactly one installed workflow was edited").toBe(1);

      expect(
        check?.message,
        "the advisory message must name the stale file's adopter-tree-relative path",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`);
      expect(
        check?.message,
        "the message is the only human surface in the TEXT renderer, so it must read as prose",
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

      // Neither packaged tree above carries `qfai-validate.yml`, so both
      // assertions in this `it` lean on the packaged-absent leg staying out of
      // drift. That property is NOT pinned here — the `it` below owns it, for
      // the reason stated there.
    });

    // The packaged-absent (`extra`) rule gets its own `it` and its own tree
    // because it CANNOT be measured inside the override leg above. Under the
    // mutation it guards — packaged-absent flipped to report drift — that
    // block's `expect(same.modified).toEqual([])` sits ahead of it and fails
    // first, so the assertion naming the rule never reddens and the rule reads
    // as covered while being untested. Proving otherwise there requires
    // temporarily deleting the earlier assertions, which only holds until the
    // next edit to them and which no gate can notice. Reached unconditionally
    // here instead.
    it("treats a recorded name absent from the packaged tree as `extra`, never as drift", async () => {
      const dir = await pool.seedAdopterTree();
      const installed = await readFile(adopterWorkflowPath(dir, "qfai-tests.yml"), "utf-8");

      // The packaged tree carries `qfai-tests.yml` byte-identical and nothing
      // else, so the packaged-absent leg is the ONLY thing that can put an
      // entry in `modified`.
      const packaged = await pool.newTempDir();
      await writeFile(path.join(packaged, "qfai-tests.yml"), installed, "utf-8");

      // Preconditions asserted, not assumed: this guard is vacuous unless
      // `qfai-validate.yml` is RECORDED (or the reader never visits the name),
      // PRESENT in the adopter tree (or the adopter-absent leg answers first),
      // and ABSENT from the packaged tree. All three read the record and the
      // filesystem directly rather than the reader's output, so none of them
      // can shadow the assertion below the way the override leg's did.
      const record = await readInstallProvenance(dir);
      expect(
        Object.keys(record.workflows),
        "`qfai-validate.yml` must be a recorded name, or the reader never visits it",
      ).toContain("qfai-validate.yml");
      const installedValidate = await readFile(
        adopterWorkflowPath(dir, "qfai-validate.yml"),
        "utf-8",
      );
      expect(
        installedValidate.length,
        "`qfai-validate.yml` must be present in the adopter tree",
      ).toBeGreaterThan(0);
      await expect(
        readFile(path.join(packaged, "qfai-validate.yml"), "utf-8"),
        "the packaged tree must not carry `qfai-validate.yml`, or nothing is being guarded",
      ).rejects.toThrow();

      const diff = await diffInstalledShippedWorkflows(dir, packaged);

      // Deep equality rather than `not.toContain`: it pins the named rule and
      // also catches the byte-identical name turning up, and its diff prints
      // whichever entry appeared.
      expect(
        diff.modified,
        "a recorded name present on disk with no packaged counterpart is `extra`, never drift",
      ).toEqual([]);
      expect(diff.status, "an `extra`-only comparison is not a drift status").toBe("ok");
    });
  },
);

describe(
  "TC-0006-0028 (TDD-0030): a content-identical installed tree reports severity ok and emits no drift finding",
  { timeout: 60000 },
  () => {
    it("registers exactly one ok-severity workflows.integrity check carrying no drift payload", async () => {
      // The TC's Setup is 「TC-0006-0027 の手編集を戻し」, so the edit is applied
      // and then reverted rather than skipped: guard #2 below is this row's
      // anti-vacuity guard and an edit that was never made cannot be reverted.
      // The revert restores CAPTURED bytes rather than re-deriving them, which
      // is what makes the reverted tree provably identical to the installed one.
      const dir = await pool.seedAdopterTree();
      const target = adopterWorkflowPath(dir, "qfai-tests.yml");
      const original = await readFile(target, "utf-8");

      await editShippedWorkflow(dir, "qfai-tests.yml");

      // Guards #1-#3 are PRECONDITIONS on the fixture and stay hard: if the
      // tree is not in the state this row reasons about, nothing below measures
      // anything. Everything after them is the row's claim and is `expect.soft`.
      //
      // Guard #1: the comparison set is non-empty. `readInstallProvenance` is
      // fail-safe by contract — a missing, unreadable or malformed record
      // resolves to an EMPTY record, which the reader reports as `status: "ok"`
      // having compared nothing at all. Every claim below would then pass while
      // no file had been examined.
      const recordedNames = Object.keys((await readInstallProvenance(dir)).workflows);
      expect(
        recordedNames,
        "the recorded name set must be non-empty, or `status: ok` only means `nothing was compared`",
      ).toContain("qfai-tests.yml");

      // Guard #2: drift is OBSERVABLE in this tree against this packaged
      // operand, which establishes that the packaged copy resolved, was
      // readable, and was actually compared. Guard #1 does not get there on its
      // own: a packaged directory that resolved but was EMPTY would make every
      // recorded name packaged-absent (the `extra` bucket, never drift),
      // yielding `status: "ok"` and a fully green run in which no content
      // comparison ever happened.
      //
      // `toContain`, deliberately NOT deep equality. The guard's job is "drift
      // is observable here", and pinning the exact list would additionally make
      // this hard guard fail under a reader mutation that over-reports drift —
      // aborting the run before the claim block, whose severity, payload and
      // message assertions are precisely what has to be seen reddening for the
      // TC's false-positive clause. A weaker guard measures strictly more here,
      // and the exact-list property belongs to the sibling row above, which
      // owns it.
      //
      // `status` is pinned alongside `modified` because the two are separately
      // mutable: a reader that returned `status: "ok"` unconditionally while
      // still filling `modified` leaves this guard green on `modified` alone,
      // and then the claim block below reads the `ok` branch and passes for the
      // WRONG reason. `toBe("modified")` is still weaker than the exact list,
      // so the reason for the weak `modified` form above survives intact.
      //
      // What this guard does NOT measure: the false-NEGATIVE direction of that
      // same mutation — a reader whose `status` never reports drift. The
      // sibling row above owns it (its first `it` asserts `severity: "info"`
      // through `createDoctorData`, which reads the status), and that is a
      // borrowed measurement, not one made here.
      const drifted = await diffInstalledShippedWorkflows(dir);
      expect(
        drifted.modified,
        "the hand edit must be observable as drift BEFORE it is reverted, or the silence after the revert is vacuous",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`);
      expect(
        drifted.status,
        "the drift must also be visible in `status`, or the claim block below can read the ok branch for the wrong reason",
      ).toBe("modified");

      await writeFile(target, original, "utf-8");

      // Guard #3: the revert is byte-exact. This row reasons about a
      // content-identical tree, and a comment claiming that property is not a
      // guard.
      expect(
        await readFile(target, "utf-8"),
        "the revert must restore the installed file byte-for-byte",
      ).toBe(original);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      // The finding SET, not the first match. `addCheck` is a bare push with no
      // dedup, so a `find` would hand back the clean registration while a
      // second one carried a drift payload, and every assertion below would
      // read the clean one and pass.
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // Every assertion from here down is the row's claim and is `expect.soft`.
      // Under hard asserts only the FIRST failing assertion is observed, so a
      // mutation that reddens an earlier one aborts the run before the later
      // ones execute and they read as covered while never having been
      // exercised. Soft assertions make that structural instead of a comment a
      // later edit can quietly break.
      //
      // The TC's second Verify bullet (drift finding が 1 件も emit されない —
      // false positive なし) is measured JOINTLY by the severity, payload and
      // message assertions below rather than by an extra "no info finding"
      // assertion, which would have no mutation of its own: under the
      // false-positive mutation — `hasDrifted`'s final
      // `return packaged.value !== installed.value;` replaced by
      // `return true;`, so equal digests report drift — the `info` branch fires
      // instead of the `ok` one, and the severity, `details` key-set and message
      // assertions all redden together. Measured as exactly those three.
      //
      // KEPT DELIBERATELY, AS A NAMED EXEMPTION from the entailment criterion
      // applied further down. The next assertion — `findings` has length 1 —
      // ENTAILS that `findings[0]` is defined, so this one has no mutation that
      // reddens it alone: the mutation that empties `findings` reddens all seven
      // claim assertions, while the one that duplicates the registration reddens
      // only the length assertion. Measured, and it is the inverse of what the
      // pair looks like.
      //
      // The exemption is diagnostic. The standard it is claimed under: delete an
      // entailed assertion UNLESS the kept line is the only one whose message
      // names the claim. Four of the other six fail with their own claim against
      // an observed `undefined` (`expected undefined to be 'ok'`,
      // `expected undefined to deeply equal [ 'workflowsDir' ]`, and so on),
      // which points at the cause only by inference, and the message assertion
      // loses its label entirely (`.toMatch() expects to receive a string, but
      // got undefined`).
      //
      // Stated honestly, this line is at the MARGIN of that standard rather than
      // comfortably inside it: the length assertion immediately below also names
      // the cause (`expected [] to have a length of 1 but got +0` — an empty
      // finding set), so deleting this one would not leave the block mute. What
      // it buys is locality — the requirement "a check must be registered" read
      // as itself, first, instead of inferred from a container's length. That is
      // a small delta, and it is recorded as small so nobody mistakes it for a
      // strong warrant.
      //
      // It is therefore NOT precedent for re-adding an entailed assertion that
      // merely has some diagnostic value. The deleted
      // `details.modified is undefined` assertion below is the case in point: it
      // would have failed with `expected [ ... ] to be undefined`, which says no
      // more than the key-set failure printed beside it and names no claim the
      // key-set line does not already name.
      expect
        .soft(check, "a content-identical tree must still register a workflows.integrity check")
        .toBeDefined();
      expect
        .soft(findings, "workflows.integrity must be registered exactly once per doctor run")
        .toHaveLength(1);
      expect
        .soft(check?.severity, "a content-identical installed tree is severity `ok`")
        .toBe("ok");

      // The payload is pinned as a SET rather than by the absence of one named
      // key. The four-key drift payload of BR-0006-0022 belongs to the `info`
      // emission alone, so an `ok` check carries `workflowsDir` and nothing
      // else: `modified` leaking in here would render an empty file list as a
      // drift report, and `declined` leaking in would contradict
      // TC-0006-0035's requirement that it not appear on an `ok` tree.
      // (TC-0006-0035's own claim is NOT made here — it is about a
      // declined-only tree, which this fixture is not. Only the payload shape
      // that claim rests on is pinned.)
      //
      // A separate `details.modified is undefined` assertion was considered and
      // deliberately left out. The criterion is ENTAILMENT, not redundancy of
      // wording: `toEqual(["workflowsDir"])` on the sorted key set is true only
      // of a payload whose key set is exactly that, which forbids a `modified`
      // key outright — so no payload can redden the deleted assertion without
      // reddening this one.
      //
      // That entailment holds ONLY WHILE THIS ASSERTION STAYS EXACT. Weakening
      // it to `toContain("workflowsDir")` breaks it, and the weakening is
      // plausible rather than hypothetical: the row that lands `packagedDir` and
      // `declined` in the drift payload will be looking at this line. If it is
      // ever loosened, the deleted property does not fail — it silently stops
      // being pinned at all. Restore an explicit `modified`-absent assertion in
      // the same edit that loosens this one.
      expect
        .soft(
          sortedDetailsKeys(check?.details),
          "an ok check carries `workflowsDir` only — the drift payload belongs to the info emission",
        )
        .toEqual(["workflowsDir"]);
      expect
        .soft(
          check?.details?.["workflowsDir"],
          "`workflowsDir` must name the adopter-tree-relative workflows directory",
        )
        .toBe(ADOPTER_WORKFLOWS_DIR);

      // `message` and `title` are both asserted because both are rendered.
      // `formatDoctorText` prints `[severity] id: message`, so an empty message
      // prints the bare line `[ok] workflows.integrity:`; `title` has no
      // consumer in the text renderer but is emitted verbatim under
      // `--format json`.
      expect
        .soft(check?.message, "the ok message must read as prose, not as an empty renderer slot")
        .toMatch(/match the packaged copy/);
      // `toBe` on the whole title, NOT `toContain(ADOPTER_WORKFLOWS_DIR)`. The
      // containment form had a surviving mutant: the title is emission-side and
      // literal while `details.workflowsDir` is derived from the reader, and
      // retitling only that string to
      // `Workflows integrity (.github/workflows-old)` left the suite green,
      // because the mutated string still CONTAINS `.github/workflows`. Substring
      // containment cannot see a suffix being appended to the thing it looks
      // for.
      //
      // WHERE THAT STRING LIVES NOW, corrected: it is no longer a HARDCODED
      // literal at the emission site, as this comment claimed. `48c7930e`
      // extracted it to the module constant `WORKFLOWS_INTEGRITY_TITLE` in
      // `src/core/doctor.ts` — follow the SYMBOL, not a line number — and all
      // THREE `workflows.integrity` emission arms (drift, `ok`, unresolved skip)
      // read it, so the retitling mutation now moves three titles at once and is
      // no longer site-local.
      //
      // ITS ORACLE SIGNATURE IS UNCHANGED, measured at HEAD's bytes rather than
      // argued: with the constant mutated to the same `-old` string above, the
      // three-file run of this file, `unresolvedPackaged.test.ts` and
      // `repairText.test.ts` gives `1 failed | 8 passed` with the single
      // AssertionError this assertion's, both other suites GREEN — neither pins
      // `title` content. The extraction changed the mutation's KIND, not its
      // reach.
      //
      // The alternative — building the expected value out of
      // `check.details.workflowsDir` — was rejected: it has the same substring
      // hole under `toContain`, and under `toBe` it is satisfiable by a
      // COORDINATED edit that moves the title and the payload together, which is
      // the realistic refactor rather than an exotic one. Pinning both to the
      // shared constant (here and in the `workflowsDir` assertion above) forces
      // agreement transitively and reddens on the coordinated edit too.
      //
      // `ADOPTER_WORKFLOWS_DIR` is TEST-OWNED and must stay that way. Do NOT
      // "DRY" it into an import of the reader's own directory constant: the
      // whole discriminating power here comes from the expected value being
      // stated INDEPENDENTLY of the code under test. Import it and a single
      // rename inside the reader moves the title, the payload AND both expected
      // values together, which is precisely the coordinated edit the paragraph
      // above rejects — the assertion would then check that production agrees
      // with itself instead of that it agrees with what this row requires.
      // The reader's constants are module-private today, so the DRY edit needs
      // an `export` added first; that export is the step to refuse.
      expect
        .soft(check?.title, "the JSON surface's title must name the checked directory exactly")
        .toBe(`Workflows integrity (${ADOPTER_WORKFLOWS_DIR})`);

      // NOT COVERED BY THIS ROW — BR-0006-0018's 改行正規化 clause.
      //
      // The rule says the comparison basis is newline-NORMALIZED content, and NO
      // TEST IN THE DOCTOR CLOSURE DISCRIMINATES THAT BASIS FROM A RAW-BYTE ONE.
      // Scope stated deliberately: the twelve selectors this slice runs, nothing
      // wider — no suite outside them was measured.
      //
      // The warrant is the CALL-SITE mutation, the only probe that isolates the
      // question. Drop `normalizeNewlines(...)` from `digestNormalizedText` in
      // `src/core/doctor/workflowsIntegrity.ts` (`bad123d7` -> `b68ea8a2`) and this
      // row stays at `6 passed`, the closure at `67 passed`, every exit code 0 —
      // the mutant SURVIVES.
      //
      // Do NOT re-derive that from the obvious probe. Reducing `normalizeNewlines`
      // ITSELF to `return text;` (`src/shared/text.ts`, `1ab8a835` -> `96328a68`)
      // gives `2 failed | 65 passed`, but both failures are that function's own unit
      // tests in `tests/unit/shared/text.test.ts` (`expected 'a\r\nb\r\n' to be
      // 'a\nb\n'`) — inside the closure, and silent about the drift path. That red
      // says the FUNCTION is covered; it never says the drift comparison calls it.
      //
      // This row cannot close the clause either, and not by omission — the TC's
      // Setup asks for a byte-identical revert, and a byte-identical fixture answers
      // the same way under both bases BY CONSTRUCTION. Closing it needs a fixture
      // whose two sides differ in line endings ONLY, which is a change to the TC's
      // Setup.
      //
      // The handle for that hand-off is the evidence anchor
      // `.qfai/evidence/implement-spec-0006.md#tdd-0030`, which records the
      // measurement above and the clause left unfilled. "Routed upstream" with
      // no artifact named is not verifiable by the next reader, and an
      // unverifiable hand-off is indistinguishable from an unmade one. Do not
      // read this row as covering that clause.
    });

    // The BOUNDARY COMPLEMENT of the `ok` emission above: the tree on which it
    // must NOT fire. It lives in this row because this row introduces that
    // emission, and narrowing a new emission to its own licence is part of
    // adding it — the licence is the closed state enum of
    // `.qfai/contracts/cli/shipped-workflows.md` §3, where a name with no
    // provenance entry is `adopter-owned` (present on disk) or `absent`, and
    // BOTH rows mandate silence from `qfai doctor`. The doctor contract states
    // the same thing twice: its emission table keys `ok` to `installed` alone,
    // and its non-goals say it reports nothing for a workflow with no
    // provenance entry.
    //
    // An empty record therefore has to produce ZERO checks, not an `ok` one:
    // with no recorded name there is no `installed` name either, so an `ok`
    // check would be claiming a match QFAI never looked for. This is also the
    // exact tree of §3's known limitation — an adopter who installed before
    // the record existed — for which the contract says the drift channel is
    // silent.
    //
    // Not TDD-0038's case: that row owns a PER-NAME no-entry file inside a
    // tree whose record is non-empty, observed as that name's absence from the
    // comparison. This is the WHOLE-RECORD-EMPTY aggregate, observed at the
    // emission site as the count of registered checks.
    //
    // Observed RED before the emission was gated, under
    // `cd packages/qfai && npx vitest run
    // tests/integration/spec0006WorkflowsIntegrity.drift.test.ts` (file-scoped,
    // no `-t`): `Tests 1 failed | 5 passed (6)`, this `it` the only failure,
    // reporting the leaked `severity: "ok"` check verbatim.
    it("registers no workflows.integrity check at all when the provenance record is absent", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, "qfai-tests.yml");

      // Precondition: drift is observable while the record still exists. This
      // is what makes the silence below attributable to the empty record
      // rather than to a tree with nothing to compare — and it proves the
      // record was non-empty without reading it, because the reader only ever
      // visits recorded names, so a non-empty `modified` is impossible from an
      // empty record.
      const beforeDeletion = await diffInstalledShippedWorkflows(dir);
      expect(
        beforeDeletion.modified,
        "drift must be observable while the record survives, or the silence after its deletion is vacuous",
      ).toContain(`${ADOPTER_WORKFLOWS_DIR}/qfai-tests.yml`);

      await deleteInstallProvenanceRecord(dir);

      // Precondition: the comparison set is now empty, read through the
      // production reader rather than trusted from the fixture. A record that
      // moved would leave the fixture's `rm` deleting nothing, and this is the
      // assertion that fails instead of the run passing on an unmutated tree.
      expect(
        Object.keys((await readInstallProvenance(dir)).workflows),
        "the record must read as empty, or this is not the state §3 reasons about",
      ).toEqual([]);
      // Precondition: the files are still ON DISK and still differ from the
      // packaged copy. That makes every shipped name `adopter-owned` (no
      // entry, present on disk) rather than `absent`, which is the stronger of
      // the two silent rows: an implementation that inferred ownership from
      // the reserved filename prefix instead of from the record would report
      // this file, and the prefix is a reservation notice, not a selector.
      await expect(
        readFile(adopterWorkflowPath(dir, "qfai-tests.yml"), "utf-8"),
        "the edited file must still be on disk, or the state is `absent`, not `adopter-owned`",
      ).resolves.toContain("# adopter hand edit");

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });

      // One claim assertion, so nothing here can be shadowed by an earlier
      // failure and `expect.soft` would buy nothing. Deep equality against the
      // empty array rather than a length assertion: its diff prints the check
      // that leaked, including its severity, which is the difference between
      // "the `ok` branch fired" and "the drift branch fired".
      expect(
        data.checks.filter((entry) => entry.id === "workflows.integrity"),
        "a tree with no provenance record has no `installed` name, so no workflows.integrity check may be registered at all",
      ).toEqual([]);
    });
  },
);

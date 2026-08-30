/**
 * Installed shipped-workflow drift reader for `qfai doctor`.
 *
 * Compares each shipped GitHub Actions workflow QFAI recorded writing into
 * the adopter's `.github/workflows/` against the file of the same name inside
 * the installed package, and returns the ones whose content no longer
 * matches. This is the adopter's only route by which a corrected template
 * becomes visible, because the shipped tree is copied create-only and no
 * install path refreshes it.
 *
 * Emission — severity, wording and the `details` payload — belongs to
 * `createDoctorData`: the plan for this check asks for a reader plus an
 * `addCheck` from there BY NAME, and both comparable siblings are built that
 * way. `core/skillsIntegrity.ts` and `core/doctor/skillManifestProbe.ts` each
 * return a domain result and let `doctor.ts` phrase the check; neither names
 * doctor's check type at all. This module follows them, so the check's
 * severity and wording are all readable at one site instead of split across
 * two, and the drift rule stays testable without a doctor-shaped fixture.
 *
 * ## Comparison set: the provenance record, never a name pattern
 *
 * The iteration domain is the set of names carried by the adopter's
 * `.qfai/install-provenance.json` — the names QFAI itself recorded writing.
 * The reserved filename prefix is a reservation notice, not a selector: an
 * adopter may have authored a colliding name first, and inferring ownership
 * from the name would report their own file as stale. Because the loop never
 * visits a name that has no entry, the `adopter-owned` and `absent` file
 * states of the shipped-workflows contract are unreachable BY CONSTRUCTION
 * rather than dropped by a filter further down. The same property disposes of
 * a stray non-workflow file sitting in the packaged directory: with no
 * provenance entry it is never an operand, so no name filter is needed on the
 * packaged side. The record is read only here; its schema and its writer are
 * owned elsewhere.
 *
 * ## Digest basis: newline-normalized TEXT
 *
 * Both sides are digested as the sha256 of their newline-normalized text,
 * which is the basis BR-0006-0018 requires (改行正規化後の内容一致) and which
 * the sibling skills-integrity diff already uses. Digesting raw bytes instead
 * would report every installed workflow as drifted on a CRLF checkout — a
 * false advisory for every Windows adopter.
 *
 * The contracts do not merely omit that basis, they state the OPPOSITE one,
 * and the contradiction is named on both sides so a later reader can check it
 * rather than take it on trust. Implemented: BR-0006-0018 (改行正規化後の内容
 * 一致). Contradicting it: the file-state table in §3 of
 * `.qfai/contracts/cli/shipped-workflows.md`, whose `installed` / `modified`
 * rows key on `bytes == packaged` / `bytes != packaged`; and the opening
 * sentence of the `workflows.integrity` section of
 * `.qfai/contracts/cli/qfai-doctor.md`, which says "whose bytes differ".
 * Neither file contains the string `normaliz`, `CRLF` or 改行 anywhere
 * (measured, not assumed), so the normalized basis is attributable to the
 * business rule ALONE.
 *
 * The contradiction is live and belongs to the contract owner, not to a
 * silence this module is free to fill — which is why the two contradicting
 * sections are cited by name above instead of being described. Implementing
 * the business rule is the deliberate call: raw bytes would ship the Windows
 * false advisory. Do not "align" this code to the contract wording without
 * that contradiction being resolved there first.
 *
 * These digests are consequently NOT comparable to the `sha256` field of a
 * provenance entry. That field is a RAW-BYTE digest of exactly the bytes the
 * installer wrote — the installer reads the written file with no encoding, so
 * it digests a Buffer — and comparing the two bases would mismatch on every
 * CRLF checkout, reintroducing the false advisory this module exists to
 * avoid. A provenance entry is used here for PRESENCE ONLY; its `sha256` is
 * never read.
 *
 * The differing basis is the cheap objection, not the load-bearing one: if
 * the installer's digest basis were ever normalized to match, folding the two
 * together would STILL be wrong, because they answer different questions.
 * `entry.sha256` answers "has the adopter edited this file since install?";
 * the packaged comparison answers "is this adopter behind the copy the
 * running package ships?". REQ-0022 asks for the second, and an adopter who
 * never touched a file still has to be told that the package moved on.
 * Do not fold the two together.
 *
 * ## Read-only and fail-safe, but absence is not unreadability
 *
 * A packaged tree that cannot be resolved yields `skipped_unresolved` and no
 * drift. A name absent from the adopter tree is not drift — the adopter
 * removed it deliberately and the contract requires that never be reported
 * again. A name absent from the packaged directory is not drift either: the
 * running package no longer ships it. Every OTHER read failure IS drift,
 * which is the sibling's explicit call, so a transient permission error (an
 * editor lock or an AV scanner on Windows) cannot make a stale file read as a
 * clean check.
 */
import { createHash } from "node:crypto";
import { lstat, stat } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { readBoundedRegularFile } from "../../shared/boundedRead.js";
import {
  readInstallProvenance,
  resolveWorkflowFileState,
  type WorkflowProvenanceEntry,
} from "../../shared/provenance.js";
import { SHIPPED_WORKFLOW_NAMES } from "../../shared/shippedWorkflowNames.js";
import { normalizeNewlines } from "../../shared/text.js";

/** Adopter-tree location of the installed workflows, as POSIX segments. */
const WORKFLOWS_DIR_SEGMENTS = [".github", "workflows"] as const;

/** The same location as the root-relative POSIX string carried in results. */
const WORKFLOWS_DIR_RELATIVE = WORKFLOWS_DIR_SEGMENTS.join("/");

/**
 * Adding a member here is a `doctor.ts` change too: its `workflows.integrity`
 * chain is an `if`/`else if` over these three literals, so a fourth would fall
 * through it and register NOTHING, silently — no compile error, because nothing
 * switches exhaustively on this type, and no failing test. Give it an arm there,
 * or record why silence is right for it.
 */
export type WorkflowsIntegrityStatus = "ok" | "modified" | "skipped_unresolved";

/**
 * EVERY member of this type is consumed at this revision, and the paragraph that
 * opened here recorded the one that was not — corrected in place rather than
 * appended to, because a reader who stops at the first sentence would otherwise
 * be told the opposite of what the code does. `status === "skipped_unresolved"`
 * was claimed-but-unconsumed, held for the unresolvable-packaged-copy skip of
 * BR-0006-0020; TDD-0039 landed that skip, so `doctor.ts` now reads the member on
 * an arm of its own and the claim is discharged rather than pending.
 *
 * What that paragraph CONSTRAINED still holds, and the arm is now what enforces
 * it: widening this status widens the skip, so a second route into
 * `skipped_unresolved` must be one BR-0006-0020's skip is true of. The longer
 * argument is version controlled at `.qfai/evidence/implement-spec-0006.md`.
 *
 * `packagedDir` left that list one row EARLIER, and its departure is still worth
 * stating, because the consumer is not the one this comment used to predict: the
 * drift advisory's MESSAGE names it as the packaged source path to copy from, per
 * the required message content of `.qfai/contracts/cli/qfai-doctor.md`. Its
 * `details` slot (BR-0006-0022) has since landed with TDD-0036 / TC-0006-0034, so
 * the field now has TWO consumers, and the older sentence here — which said the
 * slot was "still outstanding" — was true when written and false from that commit
 * onward. It is corrected rather than annotated, because this paragraph's whole
 * job is to be the checkable inventory.
 *
 * THE CONVENTION THAT ROW LANDED: `details` carries `packagedDir` beside
 * `workflowsDir`, which puts an ABSOLUTE NATIVE path next to a ROOT-RELATIVE
 * POSIX one in a single JSON object. That mix is intended and is keyed to the
 * ROOT the path belongs to, not to the key it sits under — in-tree paths are
 * root-relative POSIX so the payload is stable across machines and platforms, and
 * the packaged path is absolute and native because it has no shared root to be
 * relative to and is meant to be pasted into a copy command unmodified. Do not
 * "normalize" the two to one form: relativizing the packaged path degrades to a
 * `../..` chain whose meaning depends on the reader's cwd, and absolutizing
 * `workflowsDir` puts the host layout into a machine surface that today has none.
 *
 * PER MEMBER, so that the opening claim is checkable rather than taken on trust.
 * A numeral stood here — "all FIVE of them", then "all SIX" — and it is gone,
 * because a count is a second thing to maintain and the one that rotted. The list
 * is its own inventory: read it against the type and a missing member shows up as
 * a member with no clause.
 *
 * It said "in declaration order" for exactly one revision, and that was false —
 * this enumeration and the type below disagree on order, and the object literal
 * the reader returns disagrees with both. A reviewer caught it. Worth leaving the
 * scar visible: the first repair swapped an unverifiable count for an unverifiable
 * navigational claim, in the paragraph whose entire job is to be checkable. Order
 * is deliberately not asserted now, because asserting it would re-introduce the
 * sync obligation the numeral's removal was meant to end.
 * `status === "ok"` gates the content-identical emission and the
 * drift suite's override leg asserts it; the status LITERALS `"modified"` and
 * `"skipped_unresolved"` gate the other two arms; the `modified` FIELD — distinct
 * from that literal, and omitted from this list while the only `modified` token in
 * it was the literal, which is the omission this list was written to prevent — is
 * the drift arm's `modified.length > 0` conjunct, the file list its message
 * interpolates, and its `details.modified`; `declined` is the drift arm's
 * `details.declined` and nothing else, deliberately: it appears in no message and
 * on no other arm; `comparedCount` is the `ok` arm's second conjunct;
 * `workflowsDir` is in all three `details` payloads; `packagedDir` is in the drift
 * message AND in the drift arm's `details`. There is no unconsumed member left to
 * add to, so a claim that some member is held for a later row now has to be
 * MEASURED against `doctor.ts` before it is written here.
 *
 * The history, corrected because an earlier draft of it was wrong. When the
 * enumeration skipped a member, the count stood ALONE — there was no prose rule
 * telling editors to keep count and list in sync. That rule arrived with the FIRST
 * repair, on top of the count, and the second repair removed both. Saying the
 * count-plus-rule pair caused the skip inverted the order of events, in a block
 * whose next paragraph had it right.
 *
 * Adding a member to this type now means adding a clause to the enumeration, and
 * nothing else.
 */
export type WorkflowsIntegrityDiff = {
  status: WorkflowsIntegrityStatus;
  /** Root-relative POSIX path of the adopter's workflows directory. */
  workflowsDir: string;
  /** Absolute path of the packaged operand, or `undefined` when unresolved. */
  packagedDir: string | undefined;
  /** Root-relative POSIX paths of the drifted files, sorted by codepoint. */
  modified: string[];
  /**
   * Root-relative POSIX paths of the recorded names whose installed file is
   * ABSENT, sorted by codepoint — the `declined` row of the shipped-workflows
   * state enum (§3): an entry present, the file deliberately removed.
   *
   * Reported as PAYLOAD and never as a trigger. `status` is keyed on `modified`
   * alone, so a tree whose recorded names were all removed stays `ok` and emits
   * NO DRIFT FINDING — the `ok` check itself is still registered, which
   * TC-0006-0035 pins with a guard. (An earlier draft of this sentence said it
   * "emits nothing", which is measurably false: the run prints
   * `[ok] workflows.integrity: installed shipped workflow(s) match the packaged
   * copy`.) Reporting no drift finding is what §3's "never reported again"
   * requires. This field exists so that an operator reading a finding raised for
   * some OTHER name can see that QFAI knows the missing file is missing and is
   * leaving it alone.
   *
   * Populated from the same `digestFile` the drift comparison uses, so "absent"
   * has one definition in this module rather than two: a present-but-unreadable
   * file is `unreadable`, not `absent`, and stays in the drift bucket where the
   * conservative direction puts it.
   */
  declined: string[];
  /**
   * How many recorded names were compared — the SIZE OF THE COMPARISON SET,
   * not a count of matches and not a count of drifted files. Zero means this
   * reader examined nothing.
   *
   * It counts the recorded names this reader ACCEPTED as operands, which is
   * `recordedNames.length` minus any key the record carries that is not a
   * plain filename inside the workflows directory. A rejected key was never
   * opened, so counting it would let a record of nothing but traversal keys
   * report a positive comparison set.
   *
   * It exists because `status: "ok"` alone cannot carry that distinction, and a
   * caller that emits on `ok` alone reports a match on a tree where nothing
   * was looked at. The record is empty for a missing, unreadable or malformed
   * file by contract, and an empty record puts every shipped name in the
   * `adopter-owned` or `absent` row of the shipped-workflows state enum
   * (§3) — both of which the enum and the doctor contract's emission table
   * require to stay SILENT, the latter keying `ok` to `installed` alone. So a
   * consumer must be able to tell "compared some names, all matched" from
   * "compared no names", and the second must produce no output.
   *
   * A COUNT and deliberately not a fourth status: the doctor contract says
   * this check introduces no state of its own, and its state vocabulary is
   * exactly that closed enum. A count is an observation about the comparison,
   * not a new member of the vocabulary.
   *
   * Not narrowed to "names that resolved to `installed`", which would be the
   * stronger-looking predicate and is wrong: a tree whose recorded files were
   * all deliberately removed has zero `installed` names, and BR-0006-0022
   * requires severity `ok` there — truthfully, because QFAI EXAMINED every
   * recorded name and found nothing stale.
   *
   * "Examined" and no longer "compared", because the two stopped being the same
   * thing when `declined` landed: a declined name is classified and `continue`d
   * BEFORE the drift comparison, so this count decomposes as compared + declined
   * rather than being compared alone.
   *
   * It is NOT `recordedNames.length`. Two kinds of recorded name are excluded,
   * and both would otherwise license a claim nothing established: an unsafe key
   * (never turned into a path at all), and a name the running package no longer
   * ships (present on disk, no packaged copy to compare against). A record made
   * only of the latter used to reach `doctor.ts` as `ok` with a positive count,
   * which printed "installed shipped workflow(s) match the packaged copy" over a
   * run that opened no packaged file.
   */
  comparedCount: number;
};

/**
 * Absolute path of the workflows directory inside the installed package, or
 * `undefined` when the packaged asset tree cannot be resolved at all —
 * `getInitAssetsDir` throws in that case, and an unresolvable operand is a
 * skip, not a drift report.
 *
 * Module-private: the only caller is below, and it must STAY private together
 * with `WORKFLOWS_DIR_SEGMENTS`. Exporting either so a test can build the
 * expected packaged path is the DRY edit that collapses the repair-text suite's
 * independent `root/.github/workflows` join into agreement with whatever this
 * function computes — and that join is the part this module can get wrong.
 */
function resolvePackagedWorkflowsDir(): string | undefined {
  try {
    return path.join(getInitAssetsDir(), "root", ...WORKFLOWS_DIR_SEGMENTS);
  } catch {
    return undefined;
  }
}

/**
 * sha256 of one file's newline-normalized TEXT. Named for its basis so it
 * cannot be confused with the raw-byte digest a provenance entry carries.
 */
function digestNormalizedText(text: string): string {
  return createHash("sha256").update(normalizeNewlines(text)).digest("hex");
}

/**
 * One file read, discriminated so that "not there" and "there but could not
 * be read" stay distinguishable. Collapsing them is what lets an unreadable
 * file produce the same output as an identical one.
 *
 * `unreadable` carries no error code on purpose: every consumer branches on
 * `kind` alone, and this module's output surface has no per-file slot to
 * render a code into. A code is worth capturing when something reads it.
 */
type FileDigest = { kind: "digest"; value: string } | { kind: "absent" } | { kind: "unreadable" };

/** The `code` of a Node filesystem error, or `undefined` for other throws. */
function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const code: unknown = Reflect.get(error, "code");
  return typeof code === "string" ? code : undefined;
}

/**
 * Read ceiling for one workflow file. A shipped workflow is a few kilobytes;
 * anything past this is not one, and reading it is the resource exhaustion the
 * `lstat` guard below exists to stop.
 */
const MAX_WORKFLOW_BYTES = 1_048_576;

async function digestFile(filePath: string): Promise<FileDigest> {
  // The digest comes from ONE descriptor, opened and checked by the shared reader: a recorded name
  // whose file the adopter replaced with a symlink to a device or a FIFO would otherwise be followed,
  // and inspecting the path then reading the path resolves the name twice, so what was checked is not
  // necessarily what is read.
  const bytes = await readBoundedRegularFile(filePath, MAX_WORKFLOW_BYTES);
  if (bytes !== undefined) {
    return { kind: "digest", value: digestNormalizedText(bytes.toString("utf-8")) };
  }

  // The reader returns one `undefined` for every refusal, and this module's two failure buckets must
  // stay distinguishable — collapsing them lets an unreadable file produce the same output as an
  // identical one. So the existence question is asked separately, and it decides only WHICH refusal
  // to report. Nothing is read on this path, so re-resolving the name here grants no trust.
  try {
    await lstat(filePath);
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { kind: "absent" };
    }
  }
  return { kind: "unreadable" };
}

/**
 * Whether a name read out of the provenance record may be joined onto a
 * directory path.
 *
 * The record is a TRACKED, adopter-editable file, so its keys are untrusted
 * input to `path.join`. A key like `../../package.json` — or one with enough
 * `..` segments to reach `/dev/zero` — would otherwise make the reader digest
 * a file outside the workflows directory and report it as drift, or block on a
 * device node. The test is a plain basename with no separator, no drive
 * letter, no `.`/`..`, restricted to the characters a shipped workflow
 * filename uses; the caller re-checks the JOINED path for good measure.
 */
function isSafeProvenanceName(name: string): boolean {
  if (name.length === 0 || name === "." || name === "..") {
    return false;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    return false;
  }
  return path.basename(name) === name && !path.isAbsolute(name);
}

/**
 * The provenance entry every input reaching `hasDrifted` is known to have.
 *
 * `resolveWorkflowFileState` reads the entry only for its PRESENCE — its three fields decide
 * nothing — and the drift caller iterates recorded names, so an entry always exists by the time the
 * state is asked for. A sentinel says that at the call site instead of threading a value nothing
 * reads through two functions to reach a truthiness check.
 */
const RECORDED_NAME_ENTRY: WorkflowProvenanceEntry = {
  sha256: "",
  installedByVersion: "",
  installedAt: "",
};

/** Whether `child` resolves to a direct entry of `dir`. */
function resolvesInside(dir: string, child: string): boolean {
  return path.dirname(path.resolve(dir, child)) === path.resolve(dir);
}

/**
 * Whether one recorded name's installed file has drifted from the packaged
 * copy. `ENOENT` on either side is not drift; any other read failure is.
 *
 * `CR-20260818-0003`, approved 2026-08-23, option A. This function used to
 * compare the two digests itself, which made it a SECOND definition of the
 * shipped-workflow state enum — and on one input the two definitions
 * disagreed: an entry with a file on disk and no packaged counterpart (a name
 * a later release stopped shipping) resolved to `modified` in
 * `resolveWorkflowFileState` and to "not drift" here.
 *
 * The state question now has one owner. What survives here is the part that is
 * NOT a state question:
 *
 * - **unreadable** has no member in the enum, and must stay drift — a file
 *   whose state cannot be established must not render as a clean check;
 * - **the two absences** are decided by the caller, before this is asked, and
 *   the comment there says why. The branch below is still required — it is the
 *   narrowing step that lets the digest values be read at all — but its RETURN
 *   VALUE is unobservable: measured by mutating it to `return true` and running
 *   the four drift suites, which stayed green. So it is a type guard that
 *   happens to answer, not an answer under test, and it agrees with the caller
 *   by construction rather than by coverage. Do not read its `false` as a
 *   second opinion on the retired-name case.
 *
 * The enum's `modified` for the retired-name case is not overruled: it answers
 * "is this still the file QFAI installed", where "cannot be compared" is
 * conservatively "no". Drift asks the narrower question "should the adopter be
 * told they edited this", and the answer for a name QFAI stopped shipping is
 * no. Two questions, one answer each, and neither function now guesses at the
 * other's.
 */
async function hasDrifted(packagedPath: string, installedPath: string): Promise<boolean> {
  const [packaged, installed] = await Promise.all([
    digestFile(packagedPath),
    digestFile(installedPath),
  ]);

  // Present but unreadable is reported as drift, the same direction the
  // sibling takes for a permission error: a file whose state cannot be
  // established must not be rendered as a clean check, and handing an
  // unreadable-but-present file onward as "absent" would classify it as a
  // deliberate removal, which is silent forever. Checked FIRST, because the
  // enum below has no member for it and would have to be told a digest.
  if (packaged.kind === "unreadable" || installed.kind === "unreadable") {
    return true;
  }

  // Absent on the adopter side: a deliberate removal, never re-reported.
  // Absent on the packaged side: the running package no longer ships the
  // name, which is the `extra` bucket and excluded from drift.
  if (packaged.kind === "absent" || installed.kind === "absent") {
    return false;
  }

  // Every remaining input is one the enum has a member for, so it decides.
  // The entry is known to exist: the caller iterates recorded names only.
  return (
    resolveWorkflowFileState(RECORDED_NAME_ENTRY, installed.value, packaged.value) === "modified"
  );
}

/**
 * Reads installed shipped-workflow drift for the adopter tree at `root`.
 *
 * `packagedWorkflowsDirOverride` substitutes the packaged operand so a caller
 * can compare against a controlled tree instead of whatever the running
 * package happens to ship.
 */
export async function diffInstalledShippedWorkflows(
  root: string,
  packagedWorkflowsDirOverride?: string,
): Promise<WorkflowsIntegrityDiff> {
  const packagedDir = packagedWorkflowsDirOverride ?? resolvePackagedWorkflowsDir();
  // The packaged operand has to be resolvable AND actually be a readable
  // directory. Resolving the path alone is not the same claim: a partially
  // extracted or damaged package can leave the assets sentinel in place while
  // the workflows directory itself is gone, and then EVERY packaged file reads
  // as absent — which the per-file rule treats as "the package no longer ships
  // the name" and excludes from drift. That renders exactly the package damage
  // repair is needed for as a clean check, so the whole-tree case is decided
  // here, before any name is compared.
  if (packagedDir === undefined || !(await isReadableDirectory(packagedDir))) {
    return {
      status: "skipped_unresolved",
      workflowsDir: WORKFLOWS_DIR_RELATIVE,
      packagedDir: undefined,
      modified: [],
      declined: [],
      comparedCount: 0,
    };
  }

  // …and it has to HOLD what this package ships. Review finding [86]: the directory test
  // above is satisfied by an empty directory, which a partial extraction or a half-finished
  // install leaves behind — and then every packaged file reads as absent, the per-file rule
  // treats each one as a name the package no longer ships, `comparedCount` lands on zero, and
  // the status is `ok`. `doctor` registers neither drift nor a skip. That is the same
  // fail-open the whole-tree case was written to close, reached one level in.
  //
  // Which names must be present depends on WHOSE tree this is. Against the running package,
  // all of them: this list is the package's own claim about what it ships, and a missing one
  // is damage. Against a caller-supplied tree, at least one: an override exists to compare
  // with a controlled directory, which is under no obligation to hold the whole write set,
  // and demanding it would turn every partial fixture into an unresolved run.
  const missingShipped: string[] = [];
  for (const name of SHIPPED_WORKFLOW_NAMES) {
    if (!(await isReadableFile(path.join(packagedDir, name)))) missingShipped.push(name);
  }
  const gutted =
    packagedWorkflowsDirOverride === undefined
      ? missingShipped.length > 0
      : missingShipped.length === SHIPPED_WORKFLOW_NAMES.size;
  if (gutted) {
    return {
      status: "skipped_unresolved",
      workflowsDir: WORKFLOWS_DIR_RELATIVE,
      packagedDir: undefined,
      modified: [],
      declined: [],
      comparedCount: 0,
    };
  }

  const installedDir = path.join(root, ...WORKFLOWS_DIR_SEGMENTS);
  const modified: string[] = [];
  const declined: string[] = [];
  let examinedCount = 0;
  // The recorded names, and nothing else. A name with no entry is never
  // visited, which is what makes `adopter-owned` and `absent` unreachable
  // here instead of filtered. Only presence is consumed — `entry.sha256` has
  // a different digest basis and is deliberately not read.
  const recordedNames = Object.keys((await readInstallProvenance(root)).workflows);
  for (const name of recordedNames) {
    // Untrusted key, checked before it becomes a path. A record entry named
    // `../../package.json` is not a workflow this reader owns; skipping it is
    // the only outcome that neither reports an unrelated file as drift nor
    // opens whatever the traversal lands on.
    if (!isSafeProvenanceName(name) || !resolvesInside(installedDir, name)) {
      continue;
    }
    const installedPath = path.join(installedDir, name);

    // A recorded name the running package no longer ships is EXCLUDED from the
    // count as well as from drift, and this test comes FIRST — before the
    // `declined` split, not after it. Review finding [26]: an entry for a
    // retired workflow whose installed file is also gone reached the declined
    // branch, which counted it and moved on without ever asking whether the
    // packaged side had that name. A record holding only such entries then read
    // as `ok` with a non-zero count, and `doctor.ts` printed "installed shipped
    // workflow(s) match the packaged copy" over a run in which no packaged file
    // was opened at all. `hasDrifted` already answers `false` for these names —
    // correctly, since equality with a copy that does not exist cannot be shown.
    // Uncounted, that tree reaches the count conjunct as zero and the check stays
    // silent, which is what "nothing was compared" means.
    if ((await digestFile(path.join(packagedDir, name))).kind === "absent") {
      continue;
    }

    // The `declined` split happens BEFORE the drift comparison, and it has to:
    // `hasDrifted` answers `false` for an absent installed file, so a name
    // classified only by that predicate is indistinguishable from one whose
    // bytes match. This reads `digestFile` a second time for every name that is
    // present, which is the cost of leaving `hasDrifted` untouched.
    // Restructuring it into a classifier would be the single-read form and is
    // deliberately not done here: it is the larger production change, and this
    // row's obligation is a payload key.
    if ((await digestFile(installedPath)).kind === "absent") {
      declined.push(`${WORKFLOWS_DIR_RELATIVE}/${name}`);
      examinedCount += 1;
      continue;
    }
    examinedCount += 1;

    if (await hasDrifted(path.join(packagedDir, name), installedPath)) {
      modified.push(`${WORKFLOWS_DIR_RELATIVE}/${name}`);
    }
  }

  // Plain codepoint sort: `details.modified` is a public JSON surface, and
  // `localeCompare` without an explicit locale reorders against the host
  // default. The sibling diff sorts the same way. `declined` is the same kind
  // of surface and sorts identically.
  modified.sort();
  declined.sort();

  // `status` reads `modified` ALONE. A declined-only tree therefore stays `ok`
  // and emits NO DRIFT FINDING — the `ok` check itself is still registered; see
  // the `declined` field's docstring above, which carries the measurement. The
  // shipped-workflows contract §3 says a declined name is never reported again,
  // so promoting it to a trigger here would report it forever. TC-0006-0035 is
  // the boundary that pins this.
  return {
    status: modified.length > 0 ? "modified" : "ok",
    workflowsDir: WORKFLOWS_DIR_RELATIVE,
    packagedDir,
    modified,
    declined,
    comparedCount: examinedCount,
  };
}

/**
 * Whether `file` can actually be READ, by the reader the comparison will use.
 *
 * Review finding [93]: this checked `lstat().isFile()` and was named for something it did not
 * do. A regular file over the bounded reader's ceiling, or one this process has no permission to
 * open, satisfied that test — and then the recorded workflow of the same name read as
 * `unreadable` further down, was classified `modified`, and `doctor` told the operator to copy
 * from a packaged file it could not read. A partially damaged package reported as drift, with a
 * repair instruction that cannot work.
 *
 * The SAME bounded reader, at the same ceiling, so the precondition and the comparison can never
 * disagree about what is readable. It refuses a symlink by name too, which is the property the
 * previous version was written for: the packaged tree is this package's own, and a link inside it
 * is damage of the same kind a missing file is.
 */
async function isReadableFile(file: string): Promise<boolean> {
  return (await readBoundedRegularFile(file, MAX_WORKFLOW_BYTES)) !== undefined;
}

/** Whether `dir` exists and is a directory (following the packaged path is fine: it is ours). */
async function isReadableDirectory(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

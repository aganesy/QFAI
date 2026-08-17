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
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInitAssetsDir } from "../../shared/assets.js";
import { readInstallProvenance } from "../../shared/provenance.js";
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
 * PER MEMBER, in declaration order, so that the opening claim is checkable rather
 * than taken on trust. A numeral stood here — "all FIVE of them", then "all SIX" —
 * and it is gone: a count at one site plus a prose rule telling future editors to
 * keep it in sync is a second thing to maintain and exactly the mechanism that let
 * the enumeration skip a member. The list is now its own inventory, so a missing
 * member is visible by reading it against the type.
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
 * The count that used to open that paragraph is what rotted: it said FIVE while
 * the type declared six and the enumeration skipped the member that had just been
 * added — by the row that added it. A reviewer found it; a second reviewer pointed
 * out that replacing the numeral beats prescribing that editors keep it current.
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
   * rather than being compared alone. The count itself is unchanged — it is
   * `recordedNames.length` either way — and the distinction matters only to a
   * reader deciding what the number licenses them to claim.
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

async function digestFile(filePath: string): Promise<FileDigest> {
  try {
    return { kind: "digest", value: digestNormalizedText(await readFile(filePath, "utf-8")) };
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return { kind: "absent" };
    }
    return { kind: "unreadable" };
  }
}

/**
 * Whether one recorded name's installed file has drifted from the packaged
 * copy. `ENOENT` on either side is not drift; any other read failure is.
 */
async function hasDrifted(packagedPath: string, installedPath: string): Promise<boolean> {
  const [packaged, installed] = await Promise.all([
    digestFile(packagedPath),
    digestFile(installedPath),
  ]);

  // Absent on the adopter side: a deliberate removal, never re-reported.
  // Absent on the packaged side: the running package no longer ships the
  // name, which is the `extra` bucket and excluded from drift.
  if (packaged.kind === "absent" || installed.kind === "absent") {
    return false;
  }

  // Present but unreadable is reported as drift, the same direction the
  // sibling takes for a permission error: a file whose state cannot be
  // established must not be rendered as a clean check, and handing an
  // unreadable-but-present file onward as "absent" would classify it as a
  // deliberate removal, which is silent forever.
  if (packaged.kind === "unreadable" || installed.kind === "unreadable") {
    return true;
  }

  return packaged.value !== installed.value;
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
  if (packagedDir === undefined) {
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
  // The recorded names, and nothing else. A name with no entry is never
  // visited, which is what makes `adopter-owned` and `absent` unreachable
  // here instead of filtered. Only presence is consumed — `entry.sha256` has
  // a different digest basis and is deliberately not read.
  const recordedNames = Object.keys((await readInstallProvenance(root)).workflows);
  for (const name of recordedNames) {
    const installedPath = path.join(installedDir, name);

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
      continue;
    }

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
    comparedCount: recordedNames.length,
  };
}

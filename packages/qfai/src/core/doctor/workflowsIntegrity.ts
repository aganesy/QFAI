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

export type WorkflowsIntegrityStatus = "ok" | "modified" | "skipped_unresolved";

/**
 * ONE member has no consumer at this revision, and that is deliberate rather
 * than leftover: `status === "skipped_unresolved"` is claimed by the
 * unresolvable-packaged-copy skip of BR-0006-0020, a later obligation of this
 * same check (TDD-0039). The claim is recorded here because it constrains what
 * may be done to the member — delete it rather than widen it if its rule is
 * dropped; the longer argument is version controlled at
 * `.qfai/evidence/implement-spec-0006.md`.
 *
 * `packagedDir` LEFT that list and the departure is worth stating, because the
 * consumer is not the one this comment used to predict: the drift advisory's
 * MESSAGE names it as the packaged source path to copy from, per the required
 * message content of `.qfai/contracts/cli/qfai-doctor.md`. Its `details` slot
 * (BR-0006-0022) is still outstanding and is owned by TDD-0036 / TC-0006-0034,
 * named here for the same reason `skipped_unresolved` names its claimant: the
 * field is consumed while that payload obligation is not, the two are separate,
 * and landing the payload does not put the field back on the unconsumed list.
 *
 * THE CONVENTION THAT ROW INHERITS, stated before it lands rather than after:
 * `details` will then carry `packagedDir` beside `workflowsDir`, which puts an
 * ABSOLUTE NATIVE path next to a ROOT-RELATIVE POSIX one in a single JSON
 * object. That mix is intended and is keyed to the ROOT the path belongs to,
 * not to the key it sits under — in-tree paths are root-relative POSIX so the
 * payload is stable across machines and platforms, and the packaged path is
 * absolute and native because it has no shared root to be relative to and is
 * meant to be pasted into a copy command unmodified. Do not "normalize" the two
 * to one form: relativizing the packaged path degrades to a `../..` chain whose
 * meaning depends on the reader's cwd, and absolutizing `workflowsDir` puts the
 * host layout into a machine surface that today has none.
 *
 * (`status === "ok"` IS consumed: the override leg of the drift suite asserts
 * it. So is `comparedCount`, which gates that same `ok` emission — do not add
 * either to this list.)
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
   * requires severity `ok` there — truthfully, because QFAI did compare every
   * recorded name and found nothing stale.
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
      comparedCount: 0,
    };
  }

  const installedDir = path.join(root, ...WORKFLOWS_DIR_SEGMENTS);
  const modified: string[] = [];
  // The recorded names, and nothing else. A name with no entry is never
  // visited, which is what makes `adopter-owned` and `absent` unreachable
  // here instead of filtered. Only presence is consumed — `entry.sha256` has
  // a different digest basis and is deliberately not read.
  const recordedNames = Object.keys((await readInstallProvenance(root)).workflows);
  for (const name of recordedNames) {
    if (await hasDrifted(path.join(packagedDir, name), path.join(installedDir, name))) {
      modified.push(`${WORKFLOWS_DIR_RELATIVE}/${name}`);
    }
  }

  // Plain codepoint sort: `details.modified` is a public JSON surface, and
  // `localeCompare` without an explicit locale reorders against the host
  // default. The sibling diff sorts the same way.
  modified.sort();

  return {
    status: modified.length > 0 ? "modified" : "ok",
    workflowsDir: WORKFLOWS_DIR_RELATIVE,
    packagedDir,
    modified,
    comparedCount: recordedNames.length,
  };
}

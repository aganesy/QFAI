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
 * `createDoctorData`, where the sibling skills-integrity branch already
 * phrases its findings. This module returns a domain result and imports
 * nothing from `../doctor.js`: a type-only import back into that module is
 * erased from the emitted JavaScript but RETAINED in the generated `.d.ts`,
 * so the cycle would ship inside the published declaration graph.
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
 * false advisory for every Windows adopter. The shipped-workflows contract
 * itself says nothing about normalization; the requirement comes from the
 * business rule, so attribute it there.
 *
 * These digests are consequently NOT comparable to the `sha256` field of a
 * provenance entry. That field is a RAW-BYTE digest of exactly the bytes the
 * installer wrote — the installer reads the written file with no encoding, so
 * it digests a Buffer — and comparing the two bases would mismatch on every
 * CRLF checkout, reintroducing the false advisory this module exists to
 * avoid. A provenance entry is used here for PRESENCE ONLY; its `sha256` is
 * never read. Do not fold the two together.
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

export type WorkflowsIntegrityDiff = {
  status: WorkflowsIntegrityStatus;
  /** Root-relative POSIX path of the adopter's workflows directory. */
  workflowsDir: string;
  /** Absolute path of the packaged operand, or `undefined` when unresolved. */
  packagedDir: string | undefined;
  /** Root-relative POSIX paths of the drifted files, sorted by codepoint. */
  modified: string[];
};

/**
 * Absolute path of the workflows directory inside the installed package, or
 * `undefined` when the packaged asset tree cannot be resolved at all —
 * `getInitAssetsDir` throws in that case, and an unresolvable operand is a
 * skip, not a drift report. Module-private: the only caller is below.
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
 */
type FileDigest =
  | { kind: "digest"; value: string }
  | { kind: "absent" }
  | { kind: "unreadable"; code: string };

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
    const code = errorCode(error);
    if (code === "ENOENT") {
      return { kind: "absent" };
    }
    return { kind: "unreadable", code: code ?? "UNKNOWN" };
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
  };
}

import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { findPacks } from "../packLocator.js";
import { collectSpecEntries } from "../specLayout.js";

/**
 * Import-lite evidence lives at the canonical `<root>/.qfai/evidence`, the same
 * place every other writer uses (`init` seeds `.qfai/evidence/.gitignore`,
 * prototyping writes `.qfai/evidence/prototyping/**`, `audit log` reads
 * `.qfai/evidence/decisions/**`). It is deliberately NOT derived from
 * `paths.discussionDir`: a project that relocates its discussion packs (e.g.
 * `requirements/discussion`) would otherwise have the preflight look for
 * `requirements/evidence` while every producer — the shipped Stage 0 step
 * included — still writes `.qfai/evidence`, leaving `QFAI-IMPLITE-001`
 * unclearable.
 */
export const IMPORT_LITE_EVIDENCE_DIR_REL = ".qfai/evidence";

/**
 * The `-<timestamp>` suffix is optional on purpose. The remedy names
 * `import-lite-<ts>.md`, but the shipped template is
 * `templates/evidence/import-lite.md`; requiring the separator meant an
 * operator who copied the template under its own name still got the warning it
 * was supposed to clear.
 */
const IMPORT_LITE_EVIDENCE_RE = /^import-lite(?:-(.*))?\.md$/i;

export function resolveImportLiteEvidenceRoot(root: string): string {
  return path.join(root, ".qfai", "evidence");
}

/**
 * Absolute path of the import-lite evidence file to treat as the input source,
 * or `null` when the project has none.
 *
 * A timestamped record always outranks the untimestamped template filename: a
 * project that kept `import-lite.md` and later added
 * `import-lite-<timestamp>.md` must resolve to the newer record, and plain
 * lexicographic order does not guarantee that (the separator sorts against the
 * extension dot, not against a timestamp). Among timestamped records the
 * longest-then-highest digit string wins, which for equal-width timestamps is
 * chronological order.
 */
export async function findImportLiteEvidence(root: string): Promise<string | null> {
  const evidenceRoot = resolveImportLiteEvidenceRoot(root);
  let candidates: EvidenceCandidate[];
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    candidates = entries
      .filter((entry) => entry.isFile())
      .map((entry) => classifyEvidenceName(entry.name))
      .filter((candidate): candidate is EvidenceCandidate => candidate !== null);
  } catch {
    // ENOENT / EACCES: no readable evidence directory means no evidence.
    return null;
  }

  const timestamped = candidates.filter((candidate) => candidate.stamp !== null);
  const untimestamped = candidates.filter((candidate) => candidate.stamp === null);

  const selected =
    timestamped.length > 0
      ? timestamped.sort(compareTimestampedCandidates).at(-1)
      : untimestamped.sort((left, right) => left.key.localeCompare(right.key)).at(-1);
  return selected === undefined ? null : path.join(evidenceRoot, selected.name);
}

/**
 * A matching directory entry, keeping the real `name` alongside the `key` the
 * pattern was matched against.
 *
 * The two differ when the real filename carries surrounding whitespace
 * (` import-lite.md`). Matching wants the normalized key, but the returned
 * path has to be built from `name`: joining the trimmed form produces a
 * `selectedInputPath` that does not exist, so the validator and the
 * full/verify gate would pass the project as having an input source while
 * `runSddPreflight` and its summary pointed at an unreadable file.
 */
type EvidenceCandidate = {
  name: string;
  key: string;
  stamp: string | null;
};

function classifyEvidenceName(name: string): EvidenceCandidate | null {
  const key = name.trim();
  const matched = IMPORT_LITE_EVIDENCE_RE.exec(key);
  if (matched === null) {
    return null;
  }
  const suffix = matched[1];
  return {
    name,
    key,
    stamp: suffix !== undefined && /^\d+$/.test(suffix) ? suffix : null,
  };
}

function compareTimestampedCandidates(left: EvidenceCandidate, right: EvidenceCandidate): number {
  const leftStamp = left.stamp ?? "";
  const rightStamp = right.stamp ?? "";
  if (leftStamp.length !== rightStamp.length) {
    return leftStamp.length - rightStamp.length;
  }
  return leftStamp.localeCompare(rightStamp);
}

/**
 * The import-lite evidence file that a project may legitimately use as its SDD
 * input source, or `null` when the entrypoint does not apply.
 *
 * It applies only to the shape the shipped Stage 0 step and `QFAI-IMPLITE-001`
 * describe — a project that ALREADY carries spec packs and has no discussion
 * pack at all. Dropping an evidence file must not let a fresh project skip
 * `/qfai-discussion`, and a pack that exists under a non-canonical name is
 * still an input source that has to be repaired (`QFAI-DPACK-005`) rather than
 * bypassed, so any located pack disqualifies the entrypoint.
 *
 * "Already carries spec packs" is checked against the files on disk, not
 * against the entry count: `collectSpecEntries` also returns an entry for an
 * unknown or empty `spec-NNNN/` directory so the missing-fileset diagnostics
 * stay deterministic, so an empty `spec-0001/` plus an evidence file would
 * otherwise have flipped a brand-new project to `ready` and suppressed
 * `QFAI-DPACK-001` with it.
 */
export async function resolveImportLiteEntrypoint(
  root: string,
  config: QfaiConfig,
): Promise<string | null> {
  const specEntries = await collectSpecEntries(resolvePath(root, config, "specsDir"));
  const populated = await Promise.all(
    specEntries.map((entry) => hasRecognizableSpecFile(entry.dir)),
  );
  if (!populated.includes(true)) {
    return null;
  }
  const discussionRoot = resolvePath(root, config, "discussionDir");
  if (await isDirectoryUnreadable(discussionRoot)) {
    // `findPacks` swallows every error and returns `[]`, which is
    // indistinguishable from "no pack at all". An unreadable discussion
    // directory (EACCES, I/O error) is an uninspectable input source, not an
    // absent one: allowing the fallback here would declare the preflight
    // `ready` and silence `QFAI-DPACK-001` on a project nobody could check.
    return null;
  }
  const packs = await findPacks(discussionRoot, "discussion");
  if (packs.length > 0) {
    return null;
  }
  return await findImportLiteEvidence(root);
}

/**
 * The anchor filenames `collectSpecEntries` keys its layout probes on. One of
 * them present is the weakest evidence that a `spec-NNNN/` directory holds a
 * spec a human actually authored.
 */
const SPEC_ANCHOR_FILES = new Set(["01_spec.md", "01_user-stories.md", "spec.md"]);

async function hasRecognizableSpecFile(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some(
      (entry) => entry.isFile() && SPEC_ANCHOR_FILES.has(entry.name.toLowerCase()),
    );
  } catch {
    // ENOENT / EACCES: an unreadable spec directory proves nothing, so it does
    // not enable the fallback.
    return false;
  }
}

/**
 * `true` when `dir` exists but cannot be enumerated. A missing directory is
 * `false`: absence is a legitimate, inspectable state.
 */
async function isDirectoryUnreadable(dir: string): Promise<boolean> {
  try {
    await readdir(dir);
    return false;
  } catch (error) {
    return !isEnoent(error);
  }
}

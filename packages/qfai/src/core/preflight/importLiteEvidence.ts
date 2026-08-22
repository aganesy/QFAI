import { readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
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
  let names: string[];
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    names = entries.filter((entry) => entry.isFile()).map((entry) => entry.name.trim());
  } catch {
    // ENOENT / EACCES: no readable evidence directory means no evidence.
    return null;
  }

  const timestamped: string[] = [];
  const untimestamped: string[] = [];
  for (const name of names) {
    const matched = IMPORT_LITE_EVIDENCE_RE.exec(name);
    if (matched === null) {
      continue;
    }
    const suffix = matched[1];
    if (suffix !== undefined && /^\d+$/.test(suffix)) {
      timestamped.push(name);
    } else {
      untimestamped.push(name);
    }
  }

  const selected =
    timestamped.length > 0
      ? timestamped.sort(compareTimestampedNames).at(-1)
      : untimestamped.sort((left, right) => left.localeCompare(right)).at(-1);
  return selected === undefined ? null : path.join(evidenceRoot, selected);
}

function compareTimestampedNames(left: string, right: string): number {
  const leftStamp = IMPORT_LITE_EVIDENCE_RE.exec(left)?.[1] ?? "";
  const rightStamp = IMPORT_LITE_EVIDENCE_RE.exec(right)?.[1] ?? "";
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
 */
export async function resolveImportLiteEntrypoint(
  root: string,
  config: QfaiConfig,
): Promise<string | null> {
  const specEntries = await collectSpecEntries(resolvePath(root, config, "specsDir"));
  if (specEntries.length === 0) {
    return null;
  }
  const packs = await findPacks(resolvePath(root, config, "discussionDir"), "discussion");
  if (packs.length > 0) {
    return null;
  }
  return await findImportLiteEvidence(root);
}

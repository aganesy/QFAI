import { readdir } from "node:fs/promises";
import path from "node:path";

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
const IMPORT_LITE_EVIDENCE_RE = /^import-lite(-.*)?\.md$/i;

export function resolveImportLiteEvidenceRoot(root: string): string {
  return path.join(root, ".qfai", "evidence");
}

/**
 * Absolute path of the import-lite evidence file to treat as the input source,
 * or `null` when the project has none. Filenames sort lexicographically, which
 * for `import-lite-<17-digit-timestamp>.md` is chronological, so the last entry
 * is the newest record.
 */
export async function findImportLiteEvidence(root: string): Promise<string | null> {
  const evidenceRoot = resolveImportLiteEvidenceRoot(root);
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    const names = entries
      .filter((entry) => entry.isFile() && IMPORT_LITE_EVIDENCE_RE.test(entry.name.trim()))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
    const latest = names.at(-1);
    return latest === undefined ? null : path.join(evidenceRoot, latest);
  } catch {
    // ENOENT / EACCES: no readable evidence directory means no evidence.
    return null;
  }
}

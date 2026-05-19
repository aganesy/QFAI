/**
 * Multi-iteration path helpers for cross-spec prototyping loops.
 *
 * Where the single-lineage helpers in `./iteration.ts` only care about
 * one spec at a time, the multi-spec runner needs to address evidence
 * by (iteration-index, spec-id, screen-id) triplets, glob across all
 * spec subtrees inside one iteration, and clean up legacy stale
 * iteration directories that may have leaked from earlier runs.
 *
 * All path-shaping helpers return POSIX-style, project-root relative
 * strings so they are safe to embed in JSON evidence and review files
 * without leaking platform separators.
 */

import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { PROTOTYPING_EVIDENCE_REL } from "./paths.js";

const STALE_ITER_DIR_RE = /^iter-\d{2,}$/;
const PARSE_PATH_RE =
  /^\.qfai\/evidence\/prototyping\/iter-(\d{2,})\/(spec-\d{4})\/([^/]+)\.review\.json$/;

function padIndex(index: number): string {
  return String(index).padStart(2, "0");
}

/**
 * Returns the project-root relative directory that holds a single
 * (iteration, spec) pair's evidence, e.g.
 * `.qfai/evidence/prototyping/iter-02/spec-0007`.
 *
 * Codex r3264484517 / r3264489484: physically renamed (was
 * `iterationDir`) to avoid an oratory name collision with the
 * legacy single-spec helper of the same name in `./iteration.ts`.
 * The two helpers cannot coexist in a barrel re-export and even at
 * the import-site level, IDE autoimports were prone to silently
 * picking the wrong one (which then failed at runtime with
 * `undefined` interpolated into the path). The `PerSpec` suffix
 * makes the (idx, specId) arity explicit. The legacy
 * `iteration.ts#iterationDir(idx)` remains in place until TDD-0384
 * (per-spec iter-dir migration) lands and removes the flat layout
 * altogether.
 */
export function iterationDirPerSpec(index: number, specId: string): string {
  return `${PROTOTYPING_EVIDENCE_REL}/iter-${padIndex(index)}/${specId}`;
}

/**
 * Returns the project-root relative path to a per-screen review file
 * under a (iteration, spec) directory.
 *
 * Codex r3264484517 / r3264489484: physically renamed (was
 * `iterationReviewPath`) to disambiguate from the legacy single-spec
 * helper of the same name in `./iteration.ts`. See
 * {@link iterationDirPerSpec} for the full rationale.
 */
export function iterationReviewPathPerSpec(
  index: number,
  specId: string,
  screenId: string,
): string {
  return `${iterationDirPerSpec(index, specId)}/${screenId}.review.json`;
}

/**
 * Globs every `<root>/.qfai/evidence/prototyping/iter-NN/spec-*\/<screen>.review.json`
 * for the given iteration index and returns the matching absolute paths
 * in lexicographic order. Any sibling file that does NOT end in
 * `.review.json` (e.g. `.png`, `.html`, or a non-review `.json`) is
 * ignored even if it lives next to the review files.
 */
export async function findIterationReviewFiles(root: string, index: number): Promise<string[]> {
  const padded = padIndex(index);
  const baseDir = path
    .join(root, PROTOTYPING_EVIDENCE_REL, `iter-${padded}`)
    .replace(/\\/g, "/");
  const pattern = `${baseDir}/spec-*/*.review.json`;

  let matches: string[];
  try {
    matches = await fg(pattern, { absolute: true, onlyFiles: true });
  } catch (err) {
    throw new Error(
      `findIterationReviewFiles: glob failed for iter-${padded}: ${(err as Error).message}`,
    );
  }

  return matches
    .filter((p) => p.endsWith(".review.json"))
    .map((p) => p.replace(/\\/g, "/"))
    .sort();
}

/**
 * Returns absolute paths of every directory under
 * `<root>/.qfai/evidence/prototyping/` whose name matches the strict
 * `iter-NN` shape (two or more digits). Names that look similar but
 * fail the regex (e.g. `iter-bad`, `iter-1`) are intentionally
 * excluded — callers rely on this to fail-closed against arbitrary
 * sibling deletion.
 */
export async function findStaleIterDirs(root: string): Promise<string[]> {
  const baseDir = path.join(root, PROTOTYPING_EVIDENCE_REL);

  let entries: string[];
  try {
    entries = await readdir(baseDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw new Error(
      `findStaleIterDirs: readdir failed for ${baseDir}: ${(err as Error).message}`,
    );
  }

  const matches: string[] = [];
  for (const name of entries) {
    if (!STALE_ITER_DIR_RE.test(name)) {
      continue;
    }
    const full = path.join(baseDir, name);
    let isDir = false;
    try {
      const st = await stat(full);
      isDir = st.isDirectory();
    } catch {
      // If stat fails (vanished between readdir/stat), skip silently.
      continue;
    }
    if (isDir) {
      matches.push(full);
    }
  }

  return matches.sort();
}

/**
 * Deletes every directory returned by {@link findStaleIterDirs} using
 * recursive `rm -rf`. Names that fail the strict regex are preserved.
 * The returned `deleted` list reports the absolute paths that were
 * actually removed.
 *
 * NOTE — this is the per-spec migration variant. It takes a project
 * root and returns a flat `{deleted: string[]}` summary, throwing on
 * the first OS-level rm failure. It is intentionally distinct from the
 * local `clearEvidenceIterDirs` helper inside
 * `cli/commands/prototypingIterate.ts`, which takes a pre-joined
 * `<root>/.qfai/evidence/prototyping` path and returns a structured
 * `{ok: true} | {ok: false; failedDir; cause}` result so the cycle-0
 * reset can fail-closed without exception unwinding. The two contracts
 * are deliberately not unified yet; converging them is part of the
 * per-spec iter-dir migration backlog.
 */
export async function deleteStaleIterDirs(root: string): Promise<{ deleted: string[] }> {
  const targets = await findStaleIterDirs(root);
  const deleted: string[] = [];
  for (const dir of targets) {
    try {
      await rm(dir, { recursive: true, force: true });
      deleted.push(dir);
    } catch (err) {
      throw new Error(
        `deleteStaleIterDirs: failed to remove ${dir}: ${(err as Error).message}`,
      );
    }
  }
  return { deleted };
}

/**
 * Inverse of {@link iterationReviewPathPerSpec}: parses a project-root
 * relative review path back into its `(idx, spec, screen)` components.
 * Returns `null` when the input does not match the expected shape so
 * callers can fail-closed on malformed paths.
 */
export function parseIterationReviewPath(
  relPath: string,
): { idx: number; spec: string; screen: string } | null {
  const normalized = relPath.replace(/\\/g, "/");
  const match = PARSE_PATH_RE.exec(normalized);
  if (!match) {
    return null;
  }
  const idxRaw = match[1];
  const spec = match[2];
  const screen = match[3];
  if (idxRaw === undefined || spec === undefined || screen === undefined) {
    return null;
  }
  const idx = Number.parseInt(idxRaw, 10);
  if (!Number.isInteger(idx) || idx < 0) {
    return null;
  }
  return { idx, spec, screen };
}

/**
 * ATDD scaffold helpers.
 *
 * Pure helpers responsible for:
 *   - parsing a spec's Test-Cases catalogue into typed entries,
 *   - building a per-TC test-skeleton body (framework import, TODO
 *     marker, reference comments, placeholder sentinel),
 *   - emitting the skeleton to disk idempotently (no overwrite when a
 *     real test has replaced the placeholder).
 *
 * Detection of "real test landed" vs "still placeholder" is by
 * signature heuristic: skeletons carry a sentinel comment
 * `QFAI-SCAFFOLD-PLACEHOLDER` and a `// TODO: implement assertion for
 * <TC-ID>` marker. The first time either marker disappears the file is
 * considered progressed.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isEnoent } from "../fs/errno.js";

/** Single parsed Test-Case entry. */
export type TCEntry = {
  /** Composite TC identifier (e.g. `TC-0001-0002`). */
  tcId: string;
  /** Section title without the leading TC-id prefix. */
  title: string;
  /** Optional `EX-Ref:` referenced example IDs. */
  exRefs: string[];
  /** Optional `AC-Refs:` referenced acceptance criterion IDs. */
  acRefs: string[];
  /** Optional `Type:` field (e.g. `normal`, `error`, `boundary`). */
  type?: string;
};

/** Sentinel marker emitted into every scaffold. */
export const SCAFFOLD_PLACEHOLDER_MARKER = "QFAI-SCAFFOLD-PLACEHOLDER";

const TC_HEADER_RE = /^##\s+(TC-\d{4}-\d{4})\s*:\s*(.+?)\s*$/;
const META_LINE_RE = /^[-*]\s+([A-Za-z][\w-]*)\s*:\s*(.+?)\s*$/;
const ID_TOKEN_RE = /\b(?:AC|TC|EX|US|REQ|BR|SC|CON-API)-\d{4}(?:-\d{4})?\b/g;

function extractIds(value: string): string[] {
  const matches = value.match(ID_TOKEN_RE);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Parse the spec's Test-Cases catalogue (`06_Test-Cases.md`). Returns
 * `[]` when the file is missing or has no recognizable entries.
 */
export async function parseTestCases(specDir: string): Promise<TCEntry[]> {
  const filePath = path.join(specDir, "06_Test-Cases.md");
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return [];
    }
    throw err;
  }

  const lines = raw.split(/\r?\n/);
  const entries: TCEntry[] = [];
  let current: TCEntry | null = null;

  for (const line of lines) {
    const header = TC_HEADER_RE.exec(line);
    if (header && header[1] && header[2] !== undefined) {
      if (current !== null) {
        entries.push(current);
      }
      current = {
        tcId: header[1],
        title: header[2],
        exRefs: [],
        acRefs: [],
      };
      continue;
    }
    if (current === null) {
      continue;
    }
    const meta = META_LINE_RE.exec(line);
    if (!meta) {
      continue;
    }
    const key = (meta[1] ?? "").toLowerCase();
    const value = meta[2] ?? "";
    if (key === "ex-ref" || key === "ex-refs") {
      current.exRefs = extractIds(value);
    } else if (key === "ac-refs" || key === "ac-ref") {
      current.acRefs = extractIds(value);
    } else if (key === "type") {
      current.type = value.trim();
    }
  }
  if (current !== null) {
    entries.push(current);
  }
  return entries;
}

/**
 * Build the test-skeleton body for a single TC entry.
 *
 * The body carries:
 *   - a vitest framework import,
 *   - the per-TC annotation header (`QFAI:SPEC-XXXX:TC-YYYY-YYYY`),
 *   - reference comments for related AC / EX entries,
 *   - the placeholder sentinel + `// TODO: implement assertion for <TC>`,
 *   - a `describe(...)` with a single `it.skip(...)` placeholder.
 */
export function buildSkeleton(entry: TCEntry, specId: string): string {
  const annotation = `QFAI:${specId.toUpperCase()}:${entry.tcId}`;
  const referenceLines: string[] = [];
  if (entry.acRefs.length > 0) {
    referenceLines.push(`// AC refs: ${entry.acRefs.join(", ")}`);
  }
  if (entry.exRefs.length > 0) {
    referenceLines.push(`// EX refs: ${entry.exRefs.join(", ")}`);
  }
  if (entry.type !== undefined && entry.type.length > 0) {
    referenceLines.push(`// Type: ${entry.type}`);
  }

  const lines: string[] = [];
  lines.push(`// ${annotation}`);
  lines.push(`// ${SCAFFOLD_PLACEHOLDER_MARKER} — replace this block with a real assertion.`);
  if (referenceLines.length > 0) {
    lines.push(...referenceLines);
  }
  lines.push("");
  lines.push(`import { describe, it } from "vitest";`);
  lines.push("");
  lines.push(`describe(${JSON.stringify(entry.tcId)}, () => {`);
  lines.push(`  // TODO: implement assertion for ${entry.tcId}`);
  lines.push(`  it.skip(${JSON.stringify("pending — scaffold placeholder")}, () => {`);
  lines.push(`    // TODO: implement assertion for ${entry.tcId}`);
  lines.push(`  });`);
  lines.push(`});`);
  lines.push("");
  return lines.join("\n");
}

/**
 * Tells whether a given test file is still in its placeholder shape.
 *
 * A file is "still placeholder" when it contains both the placeholder
 * sentinel and the per-TC TODO marker. The first time either marker
 * disappears (the implementer replaced the body with a real test) the
 * file is considered progressed.
 */
export function isStillPlaceholder(fileBody: string, tcId: string): boolean {
  return (
    fileBody.includes(SCAFFOLD_PLACEHOLDER_MARKER) &&
    fileBody.includes(`TODO: implement assertion for ${tcId}`)
  );
}

export type EmitSkeletonResult = {
  /** Absolute destination path. */
  destPath: string;
  /** Whether the file was created or rewritten on this call. */
  wrote: boolean;
  /**
   * Whether the file existed already AND its body matched the
   * placeholder shape (i.e. no real test landed yet).
   */
  alreadyPlaceholder: boolean;
  /**
   * Whether the file existed already AND has progressed past the
   * placeholder shape (a real test landed).
   */
  alreadyProgressed: boolean;
};

/**
 * Idempotent write of the skeleton body.
 *
 * Behavior:
 *   - missing destination: write the body, `wrote: true`.
 *   - destination exists and matches placeholder shape: no rewrite,
 *     `wrote: false`, `alreadyPlaceholder: true`.
 *   - destination exists and has progressed (real test landed): no
 *     rewrite, `wrote: false`, `alreadyProgressed: true`.
 */
export async function emitSkeleton(
  entry: TCEntry,
  destPath: string,
  body: string,
): Promise<EmitSkeletonResult> {
  let existing: string | null = null;
  try {
    existing = await readFile(destPath, "utf-8");
  } catch (err: unknown) {
    if (!isEnoent(err)) {
      throw err;
    }
  }

  if (existing !== null) {
    const stillPlaceholder = isStillPlaceholder(existing, entry.tcId);
    return {
      destPath,
      wrote: false,
      alreadyPlaceholder: stillPlaceholder,
      alreadyProgressed: !stillPlaceholder,
    };
  }

  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, body, "utf-8");
  return {
    destPath,
    wrote: true,
    alreadyPlaceholder: false,
    alreadyProgressed: false,
  };
}

/**
 * Resolve the canonical scaffold output path for a (spec, TC) pair:
 * `<root>/tests/atdd/<specId>/<TC-ID>.test.ts`.
 */
export function scaffoldDestPath(root: string, specId: string, tcId: string): string {
  return path.join(root, "tests", "atdd", specId, `${tcId}.test.ts`);
}

/**
 * Convenience guard reused by the CLI command: does the on-disk file
 * (if any) still match the placeholder shape?
 */
export async function isFilePlaceholder(filePath: string, tcId: string): Promise<boolean> {
  try {
    await access(filePath);
  } catch {
    return false;
  }
  try {
    const body = await readFile(filePath, "utf-8");
    return isStillPlaceholder(body, tcId);
  } catch {
    return false;
  }
}

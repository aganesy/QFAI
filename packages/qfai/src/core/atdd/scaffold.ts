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
  /**
   * Optional `Type:` field (heading form) OR table-form layer cell.
   *
   * Stored as-is from the spec source — both heading-form and table-
   * form values are lowercased + trimmed. Consumers MUST treat this
   * as an opaque string. The two parse paths use the same
   * normalization conventions on purpose so downstream code keying off
   * `entry.type` sees consistent behavior regardless of which
   * catalogue shape the spec used.
   *
   * Heading-form values seen in current specs include `normal`,
   * `error`, `error/boundary`, `boundary`; table-form layer cells
   * include `unit`, `integration`, `validators`, `e2e`, `ssot-guard`.
   * The two vocabularies are intentionally distinct — neither side
   * applies a closed allow-list to the other's vocabulary.
   */
  type?: string;
};

/** Sentinel marker emitted into every scaffold. */
export const SCAFFOLD_PLACEHOLDER_MARKER = "QFAI-SCAFFOLD-PLACEHOLDER";

// The trailing `:title` portion is OPTIONAL — many in-tree specs use a
// title-less heading shape (`## TC-NNNN-NNNN`). When the title group is
// absent, `entry.title` is left as an empty string; `buildSkeleton` is
// already title-agnostic (the annotation comment carries the TC id, no
// title required).
const TC_HEADER_RE = /^##\s+(TC-\d{4}-\d{4})(?:\s*[:：]\s*(.+?))?\s*$/;
const META_LINE_RE = /^[-*]\s+([A-Za-z][\w-]*)\s*:\s*(.+?)\s*$/;
const ID_TOKEN_RE = /\b(?:AC|TC|EX|US|REQ|BR|SC|CON-API)-\d{4}(?:-\d{4})?\b/g;

// Table-form Test-Cases rows (an alternative spec catalogue layout
// used by some specs). Detected by a leading `|` followed by the TC
// id in the first cell; remaining cells carry the layer, AC-Refs,
// EX-Ref, and (optionally) trailing notes/expected columns. The
// parser only looks
// at the FIRST cell for the TC id and then scans every cell for
// AC-NNNN-NNNN / EX-NNNN-NNNN tokens — the column ORDER differs across
// specs, so a positional read would be brittle.
const TC_TABLE_ROW_RE = /^\s*\|\s*(TC-\d{4}-\d{4})\s*\|/;
// Markdown header-divider rows (`| --- | --- |`, optionally with
// alignment colons like `:---:` / `---:`). Used to skip the divider
// row before it lands in a TCEntry.type via the layer-cell read. The
// row already fails TC_TABLE_ROW_RE (first cell is `---`, not a
// TC-NNNN-NNNN id) so this is defence-in-depth — preserved for
// readability and to make the rejection explicit.
const TC_TABLE_DIVIDER_CELL_RE = /^:?-{3,}:?$/;

function extractIds(value: string): string[] {
  const matches = value.match(ID_TOKEN_RE);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Split a markdown table row into trimmed cell strings. Leading and
 * trailing pipes are stripped before the split so an empty leading cell
 * is not introduced.
 */
function splitTableCells(line: string): string[] {
  const trimmed = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

/**
 * Parse a single TC table row into a `TCEntry`. The first cell holds the
 * TC id; the second cell (if recognised) holds the layer/type; remaining
 * cells are scanned for AC- and EX- id tokens.
 */
function parseTableRow(line: string): TCEntry | null {
  // `TC_TABLE_ROW_RE` capture group 1 (`(TC-\d{4}-\d{4})`) is
  // mandatory at the regex level, but TypeScript's
  // `noUncheckedIndexedAccess` widens `match[1]` to `string |
  // undefined`. Narrow via a single explicit binding so downstream
  // uses (`{ tcId, ... }`) are statically typed as `string` without
  // a bare `as` assertion.
  const match = TC_TABLE_ROW_RE.exec(line);
  const tcId = match?.[1];
  if (tcId === undefined) return null;
  const cells = splitTableCells(line);
  const entry: TCEntry = { tcId, title: "", exRefs: [], acRefs: [] };
  // 2nd cell — layer/type. Stored as the lowercased trimmed cell value
  // with no closed allow-list. Symmetric with the heading-form
  // `META_LINE_RE` `type:` branch (which stores `value.trim().toLowerCase()`) so
  // downstream consumers see consistent `entry.type` behavior across
  // both catalogue shapes. The previous closed-allow-list constraint
  // (`unit|integration|validators|e2e|ssot-guard`) introduced an
  // asymmetry where the heading form passed any raw value through but
  // the table form silently dropped layer cells outside the small set
  // — making `entry.type` unreliable as a classification key. Empty
  // and divider-only cells (`---`, `:---:`) are still rejected so the
  // markdown table separator row never lands as a type value.
  if (cells.length >= 2) {
    const layer = (cells[1] ?? "").trim().toLowerCase();
    if (layer.length > 0 && !TC_TABLE_DIVIDER_CELL_RE.test(layer)) {
      entry.type = layer;
    }
  }
  // Scan every cell for ID tokens so column-order differences across
  // specs (AC-Refs in col 3 vs notes cell trailing TODO: type=normal,
  // etc.) do not cause silent drops. `extractIds` deduplicates.
  const acAccum: string[] = [];
  const exAccum: string[] = [];
  for (const cell of cells.slice(1)) {
    const ids = extractIds(cell);
    for (const id of ids) {
      if (id.startsWith("AC-")) acAccum.push(id);
      else if (id.startsWith("EX-")) exAccum.push(id);
    }
  }
  if (acAccum.length > 0) {
    entry.acRefs = Array.from(new Set(acAccum));
  }
  if (exAccum.length > 0) {
    entry.exRefs = Array.from(new Set(exAccum));
  }
  return entry;
}

/**
 * Parse the spec's Test-Cases catalogue (`06_Test-Cases.md`). Returns
 * `[]` when the file is missing or has no recognizable entries.
 *
 * Two forms are recognised:
 *   1. Heading form: `## TC-NNNN-NNNN[: optional title]` followed by
 *      `- Key: value` meta lines (Type, AC-Refs, EX-Ref).
 *   2. Table form: a leading-piped markdown row whose first cell carries
 *      the TC id; AC- / EX- ids are extracted from any cell.
 *
 * When the SAME TC id appears in both forms (e.g. a heading-form entry
 * with a follow-up table-form note), the heading parse wins — keyed by
 * `tcId` via a Map so the final order matches the first-seen order
 * (headings first, then any table-only rows below).
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
  // First pass: heading form (the legacy shape). Map keyed by tcId so
  // the table-form pass below can union without overwriting.
  const headingEntries = new Map<string, TCEntry>();
  const headingOrder: string[] = [];
  let current: TCEntry | null = null;

  for (const line of lines) {
    const header = TC_HEADER_RE.exec(line);
    if (header && header[1]) {
      if (current !== null && !headingEntries.has(current.tcId)) {
        headingEntries.set(current.tcId, current);
        headingOrder.push(current.tcId);
      }
      const titleGroup = header[2];
      current = {
        tcId: header[1],
        title: titleGroup !== undefined ? titleGroup : "",
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
      current.type = value.trim().toLowerCase();
    }
  }
  if (current !== null && !headingEntries.has(current.tcId)) {
    headingEntries.set(current.tcId, current);
    headingOrder.push(current.tcId);
  }

  // Second pass: table form. Heading-form parse WINS on duplicates so
  // a spec that mixes both shapes preserves the per-entry meta gleaned
  // from the heading-form `- Key: value` lines.
  const tableOrder: string[] = [];
  const tableEntries = new Map<string, TCEntry>();
  for (const line of lines) {
    const row = parseTableRow(line);
    if (row === null) continue;
    if (headingEntries.has(row.tcId)) continue;
    if (tableEntries.has(row.tcId)) continue;
    tableEntries.set(row.tcId, row);
    tableOrder.push(row.tcId);
  }

  const out: TCEntry[] = [];
  for (const id of headingOrder) {
    const entry = headingEntries.get(id);
    if (entry) out.push(entry);
  }
  for (const id of tableOrder) {
    const entry = tableEntries.get(id);
    if (entry) out.push(entry);
  }
  return out;
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

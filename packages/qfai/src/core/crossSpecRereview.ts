/**
 * The completed ledger rows a change puts at risk, in every spec.
 *
 * `qfai-implement/references/cross-spec-ownership.md` blocks a `done` row when
 * a change edits the module the row owns, the row's test file, or a file that
 * test reaches. Each blocked row then owes a fresh selector run and, where it
 * records one, a replay of its current proof. This lists those rows with what
 * each replay needs, so the list is computed rather than assembled by hand.
 *
 * Reach is walked forward from each row's test file (`observationReach`). That
 * answers the question the reverse walk from the changed file asks, for the
 * rows that exist. A row whose walk cannot be completed falls back to its
 * package: it is blocked when a changed file sits under the same nearest
 * `package.json` as its test file. Only that row widens; a row whose reach is
 * known stays narrow.
 *
 * Reach is read from the changed tree. A removed file is still caught through
 * the files that imported it, which the same change had to edit.
 */
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { normalizeRepoPath } from "./gitChanges.js";
import { observationReach, type ObservationReachCache } from "./observationReach.js";
import { collectSpecEntries } from "./specLayout.js";
import { collectLedgerTables, isLedgerRow } from "./tddHelpers.js";
import {
  readCompletedEntryRecord,
  type CompletedEntryRecord,
  type MarkdownEvidenceIndex,
  type RecordedProof,
} from "./validators/tddList.js";
import { exists, readSafe } from "./validators/utils.js";

/** Why a row is blocked. */
export type BlockedBy = "owning-module" | "test-file" | "reach" | "package-fallback";

/** One completed row the change puts at risk, with what its re-review needs. */
export interface BlockedRow {
  readonly spec: string;
  readonly tddId: string;
  readonly layer: string;
  readonly testFile: string;
  readonly selector: string;
  readonly blockedBy: BlockedBy;
  /** The changed files that matched the row. */
  readonly files: readonly string[];
  /** Why the row's reach could not be walked, on a `package-fallback` row. */
  readonly fallbackReason: string | null;
  /** `<evidence file>#<anchor>`, or `null` when no entry was found. */
  readonly evidence: string | null;
  /** The entry's latest `Round N`, whose proof is the current one. */
  readonly round: number | null;
  readonly greenCommand: string | null;
  readonly proof: RecordedProof;
}

interface DoneRow {
  readonly tddId: string;
  readonly layer: string;
  readonly testFile: string;
  readonly selector: string;
  readonly owningModule: string;
  readonly evidenceCell: string;
}

interface Match {
  readonly by: BlockedBy;
  readonly files: readonly string[];
  readonly reason: string | null;
}

interface Context {
  readonly root: string;
  readonly srcRelDir: string;
  readonly changed: readonly string[];
  /** Each changed file's package directory. */
  readonly changedPackages: ReadonlyMap<string, string>;
  readonly reachCache: ObservationReachCache;
  readonly evidenceCache: Map<string, MarkdownEvidenceIndex | null>;
}

/** Every `done` row of every ledger table in `content`. */
function doneRows(content: string): DoneRow[] {
  const rows: DoneRow[] = [];
  for (const scan of collectLedgerTables(content)) {
    const cell = (row: readonly string[], column: string): string => {
      const index = scan.headers.indexOf(column);
      return index < 0 ? "" : (row[index] ?? "").trim();
    };
    for (const row of scan.table.rows) {
      if (!isLedgerRow(scan, row) || cell(row, "Status").toLowerCase() !== "done") continue;
      rows.push({
        tddId: cell(row, "TDD-ID"),
        layer: cell(row, "Layer"),
        testFile: normalizeRepoPath(cell(row, "Test file")),
        selector: cell(row, "Selector"),
        owningModule: cell(row, "Owning module"),
        evidenceCell: cell(row, "Evidence"),
      });
    }
  }
  return rows;
}

/**
 * Whether `owningModule` names `changed`.
 *
 * A value holding a path separator is a path, compared whole with its
 * extension. Any other value is also read as a dotted module path, which
 * matches when the changed path, extension removed, ends with its segments.
 * The suffix test can over-reach onto a file sharing the same tail, which is
 * the safe direction for a check that decides what gets re-reviewed.
 */
export function owningModuleMatches(owningModule: string, changed: string): boolean {
  const value = owningModule.trim();
  if (value.length === 0 || value === "-") return false;
  if (normalizeRepoPath(value) === changed) return true;
  if (/[\\/]/.test(value)) return false;
  const wanted = value.split(".").filter((segment) => segment.length > 0);
  const have = changed.replace(/\.[^./]+$/, "").split("/");
  const offset = have.length - wanted.length;
  return (
    wanted.length > 0 && offset >= 0 && wanted.every((segment, i) => have[offset + i] === segment)
  );
}

/** The repository-relative directory of the nearest `package.json` above `file`. */
async function owningPackage(root: string, file: string): Promise<string> {
  let dir = path.posix.dirname(file);
  // `/` ends the walk too: a ledger cell may hold an absolute path.
  while (dir !== "." && dir !== "/") {
    if (await exists(path.join(root, dir, "package.json"))) return dir;
    dir = path.posix.dirname(dir);
  }
  return ".";
}

async function matchRow(
  context: Context,
  row: DoneRow,
  record: CompletedEntryRecord | null,
): Promise<Match | null> {
  const owned = context.changed.filter((file) => owningModuleMatches(row.owningModule, file));
  if (owned.length > 0) return { by: "owning-module", files: owned, reason: null };
  if (context.changed.includes(row.testFile)) {
    return { by: "test-file", files: [row.testFile], reason: null };
  }
  const reach = await observationReach(
    context.root,
    context.srcRelDir,
    row.testFile,
    record?.manifestPaths ?? [],
    context.reachCache,
  );
  if (reach.kind === "reach") {
    const reached = context.changed.filter((file) => reach.walked.has(file));
    return reached.length > 0 ? { by: "reach", files: reached, reason: null } : null;
  }
  const testPackage = await owningPackage(context.root, row.testFile);
  const shared = context.changed.filter((file) => context.changedPackages.get(file) === testPackage);
  return shared.length > 0 ? { by: "package-fallback", files: shared, reason: reach.reason } : null;
}

async function blockedRow(
  context: Context,
  specNumber: string,
  row: DoneRow,
): Promise<BlockedRow | null> {
  const record = await readCompletedEntryRecord(
    context.root,
    specNumber,
    row.layer,
    row.tddId,
    row.evidenceCell,
    context.evidenceCache,
  );
  const match = await matchRow(context, row, record);
  if (match === null) return null;
  return {
    spec: `spec-${specNumber}`,
    tddId: row.tddId,
    layer: row.layer,
    testFile: row.testFile,
    selector: row.selector,
    blockedBy: match.by,
    files: match.files,
    fallbackReason: match.reason,
    evidence: record === null ? null : `${record.evidenceFile}#${record.anchor}`,
    round: record?.latestRound ?? null,
    greenCommand: record?.greenCommand ?? null,
    proof: record?.proof ?? { kind: "none" },
  };
}

/**
 * The `done` rows of every current spec that `changedFiles` puts at risk.
 *
 * A retired spec's ledger no longer gates, so its rows are left out.
 */
export async function crossSpecRereview(
  root: string,
  config: QfaiConfig,
  changedFiles: readonly string[],
): Promise<BlockedRow[]> {
  const changed = [...new Set(changedFiles.map(normalizeRepoPath))].sort();
  if (changed.length === 0) return [];
  const changedPackages = new Map<string, string>();
  for (const file of changed) changedPackages.set(file, await owningPackage(root, file));
  const context: Context = {
    root,
    srcRelDir: config.paths.srcDir,
    changed,
    changedPackages,
    reachCache: { imports: new Map() },
    evidenceCache: new Map(),
  };
  const blocked: BlockedRow[] = [];
  for (const entry of await collectSpecEntries(resolvePath(root, config, "specsDir"))) {
    if (entry.status !== undefined && entry.status !== "active") continue;
    const ledger = path.join(entry.dir, "tdd", "test-list.md");
    if (!(await exists(ledger))) continue;
    for (const row of doneRows(await readSafe(ledger))) {
      const found = await blockedRow(context, entry.specNumber, row);
      if (found !== null) blocked.push(found);
    }
  }
  return blocked;
}

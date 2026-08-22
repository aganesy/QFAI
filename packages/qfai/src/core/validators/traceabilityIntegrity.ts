import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { getChangedFilesAgainstBase } from "../gitChanges.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseFirstMarkdownTable, type MarkdownTable } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_AC_FILES = new Set(["04_Business-Rules.md", "03_Acceptance-Criteria.md"]);

const LEDGER_FILE = "16_Traceability-ledger.md";

type LedgerEntry = {
  brAc: string;
  implFile: string;
};

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * The ledger table is the **first** Markdown table in the file — the contract the
 * shipped `16_Traceability-ledger.md` template declares.
 *
 * Both the format probe and the row reader must agree on that, which is why they
 * take one already-parsed table rather than rescanning the text. Reading every
 * `|` line in the document instead let a supplementary table further down
 * contribute rows: any row whose first cell happened to look like `AC-0001`
 * produced a `QFAI-TRACE-001` error naming whatever its second cell held, even
 * when the real linked implementation had been modified.
 */
function readLedgerTable(content: string): MarkdownTable | null {
  return parseFirstMarkdownTable(content);
}

/**
 * Checks whether the ledger table header matches the expected shape: at least
 * three columns, one of them named `Implementation File`. The canonical layout
 * is `BR/AC | Implementation File | Test File`, but extra columns are allowed —
 * a ledger that carries a Notes or Owner column is still a ledger, and the
 * validator only ever reads the ID cell and the implementation-file cell.
 */
function isExpectedLedgerFormat(table: MarkdownTable | null): boolean {
  if (!table) {
    return false;
  }
  const headers = table.headers.filter((cell) => cell.length > 0);
  return headers.length >= 3 && headers.some((cell) => /Implementation File/i.test(cell));
}

function parseLedger(table: MarkdownTable | null): LedgerEntry[] {
  if (!table) {
    return [];
  }
  const entries: LedgerEntry[] = [];
  for (const cells of table.rows) {
    const brAcCell = cells[0];
    const implCell = cells[1];
    if (!brAcCell || !implCell) {
      continue;
    }
    if (!/^(?:BR|AC)-\d{4}/.test(brAcCell)) {
      continue;
    }
    entries.push({ brAc: brAcCell, implFile: implCell });
  }
  return entries;
}

function findChangedSpecDirs(changedFiles: Set<string>, specsRelDir: string): Set<string> {
  const specDirs = new Set<string>();
  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, "/");
    const specsPrefix = specsRelDir.replace(/\\/g, "/");
    if (!normalized.startsWith(specsPrefix + "/")) {
      continue;
    }
    const rest = normalized.slice(specsPrefix.length + 1);
    const parts = rest.split("/");
    const specId = parts[0];
    const fileName = parts[1];
    if (!specId || !fileName) {
      continue;
    }
    if (BR_AC_FILES.has(fileName)) {
      specDirs.add(specId);
    }
  }
  return specDirs;
}

type LayeredSpec = { readonly specId: string; readonly ledgerPath: string };

/**
 * The **layered** spec directories under `specsDir`, sorted so findings come
 * out in a stable order.
 *
 * Layout matters because `16_Traceability-ledger.md` is two different files
 * wearing one name. In the layered layout it is the optional `BR/AC ->
 * Implementation File` table this validator reads. In the legacy `spec-pack`
 * layout it is a **required** nine-column SSOT ledger
 * (`trace_id, obj_id, …, tc_ids`) owned by `QFAI-LEDGER-001` /
 * `E_LEDGER_MISSING_COLUMN`, whose header can never carry `Implementation
 * File` — so enumerating it here would file a bogus `QFAI-TRACE-002` against
 * every valid legacy pack on every `sdd` / `tdd` / `full` run, and fail the run
 * outright under `--strict` / `--fail-on warning`. `collectSpecEntries` is the
 * layout SSOT; anything it does not call `layered` owns a different ledger.
 *
 * A missing / unreadable specs directory is not a traceability finding — the
 * spec-pack validators own that — so it yields none.
 */
async function listLayeredSpecs(specsDir: string): Promise<LayeredSpec[]> {
  try {
    const entries = await collectSpecEntries(specsDir);
    return entries
      .filter((entry) => entry.layout === "layered")
      .map((entry) => ({
        specId: path.basename(entry.dir),
        ledgerPath: path.join(entry.dir, LEDGER_FILE),
      }))
      .sort((a, b) => a.specId.localeCompare(b.specId));
  } catch {
    return [];
  }
}

/**
 * Spec ids the diff names but the working tree no longer carries as a layered
 * spec — a whole-spec `DELETE`, a rename, or a conversion to the spec-pack
 * layout.
 *
 * The scan enumerates the working tree, so such a spec is otherwise invisible:
 * its ledger is gone with it, and the `QFAI-TRACE-001` pass that used to run
 * off the diff-derived id list silently stops happening. Reading the base
 * branch's copy of the ledger is a different (and much larger) feature — this
 * only refuses to let the check disappear without a word, the same contract
 * `QFAI-TRACE-003` already carries for an unavailable diff.
 *
 * Sorted for a stable finding order; `changedSpecIds` comes out in git's order.
 */
function reportUninspectableSpecIds(
  changedSpecIds: ReadonlySet<string>,
  presentSpecIds: ReadonlySet<string>,
): string[] {
  return [...changedSpecIds].filter((specId) => !presentSpecIds.has(specId)).sort();
}

type LedgerRead =
  | { readonly ok: true; readonly entries: LedgerEntry[] }
  | { readonly ok: false; readonly issue: Issue };

/**
 * Reads one spec's ledger. Every failure mode — absent, not a regular file,
 * unreadable, wrong shape — is a `QFAI-TRACE-002` warning: the artifact is
 * optional, and not getting it only means the `QFAI-TRACE-001` check cannot run
 * for that spec.
 */
async function readSpecLedger(specId: string, ledgerPath: string): Promise<LedgerRead> {
  // `stat` before `readFile`, never the other way round. This scan now visits
  // every layered spec instead of only the ones named in the branch diff, and
  // opening a FIFO blocks until a writer appears — one such path anywhere under
  // `specsDir` would hang `qfai validate` indefinitely, even on an empty diff.
  // `stat` never opens the file, and it follows symlinks, so a ledger symlinked
  // to a real file still reads.
  let ledgerStats;
  try {
    ledgerStats = await stat(ledgerPath);
  } catch {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger not found for ${specId}. The BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec. This artifact is optional; to enable the check, create it with /qfai-sdd from .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE}.`,
        "warning",
        ledgerPath,
        "traceability.integrity.ledgerMissing",
      ),
    };
  }

  if (!ledgerStats.isFile()) {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} is not a regular file (FIFO, socket, device or directory). It is not read, and the BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec. Replace it with a Markdown file shaped like .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE}.`,
        "warning",
        ledgerPath,
        "traceability.integrity.ledgerNotAFile",
      ),
    };
  }

  let ledgerContent: string;
  try {
    ledgerContent = await readFile(ledgerPath, "utf-8");
  } catch {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} could not be read. The BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec.`,
        "warning",
        ledgerPath,
        "traceability.integrity.ledgerUnreadable",
      ),
    };
  }

  const ledgerTable = readLedgerTable(ledgerContent);

  // Format check before parse: a table that fails it is skipped, so parsing
  // it first only built rows nothing reads.
  if (!isExpectedLedgerFormat(ledgerTable)) {
    return {
      ok: false,
      issue: issue(
        "QFAI-TRACE-002",
        `Traceability ledger for ${specId} uses unexpected format. The first Markdown table must have at least 3 columns, one of them named "Implementation File". Skipping integrity check. See .qfai/assistant/skills/qfai-sdd/templates/specs/spec/${LEDGER_FILE} for the expected schema.`,
        "warning",
        ledgerPath,
        "traceability.integrity.ledgerFormatMismatch",
      ),
    };
  }

  return { ok: true, entries: parseLedger(ledgerTable) };
}

export type TraceabilityIntegrityOptions = {
  /**
   * Whether to run the history-based `QFAI-TRACE-001` check.
   *
   * `false` for `--profile sdd`. That profile is the completion gate of
   * `/qfai-sdd`, which updates a spec's BR/AC and its ledger and then hands the
   * implementation to `/qfai-implement` — so at the moment the gate runs, the
   * linked implementation files are *supposed* to be untouched. Asking for the
   * diff there would fail the mandatory `--fail-on error` run on exactly the
   * flow the profile exists to certify. `sdd` therefore checks only that the
   * ledger it owns is present and well-shaped (`QFAI-TRACE-002`); drift between
   * a changed BR/AC and its implementation stays with `--profile tdd` / `full`,
   * which gate after the code exists.
   */
  readonly includeImplementationDiff?: boolean;
};

/**
 * Two questions, two gates.
 *
 * Whether a spec carries a ledger is a property of the **working tree**, so
 * `QFAI-TRACE-002` is raised for every spec directory, unconditionally. It used
 * to sit behind the branch diff, which meant a trunk-based repo (`HEAD ==
 * origin/main`), a shallow CI clone or a checkout without the base ref never
 * saw the warning the shipped `/qfai-sdd` docs promise — the artifact was
 * simply never asked for.
 *
 * Whether a BR/AC changed without its linked implementation is a property of
 * the **history**, so `QFAI-TRACE-001` stays behind `changedFiles` and behind
 * `BR_AC_FILES` — and behind {@link TraceabilityIntegrityOptions.includeImplementationDiff},
 * because only a profile that gates *after* implementation may ask it.
 */
export async function validateTraceabilityIntegrity(
  root: string,
  config: QfaiConfig,
  options: TraceabilityIntegrityOptions = {},
): Promise<Issue[]> {
  const includeImplementationDiff = options.includeImplementationDiff ?? true;
  const issues: Issue[] = [];
  const baseBranch = config.baseBranch ?? "origin/main";
  const specsDir = resolvePath(root, config, "specsDir");

  let changedFiles: Set<string> | null = null;
  let changedSpecIds = new Set<string>();
  if (includeImplementationDiff) {
    changedFiles = getChangedFilesAgainstBase(root, baseBranch);
    if (changedFiles) {
      changedSpecIds = findChangedSpecDirs(changedFiles, config.paths.specsDir);
    } else {
      issues.push(
        issue(
          "QFAI-TRACE-003",
          `Could not diff against "${baseBranch}", so the BR/AC to implementation integrity check (QFAI-TRACE-001) was skipped for every spec. Fetch the base ref (a shallow CI clone does not carry it) or set the top-level baseBranch key in qfai.config.yaml (it is read from the document root, not from under validation). Ledger presence is still checked.`,
          "info",
          undefined,
          "traceability.integrity.diffUnavailable",
        ),
      );
    }
  }

  const layeredSpecs = await listLayeredSpecs(specsDir);
  const presentSpecIds = new Set(layeredSpecs.map((spec) => spec.specId));

  for (const specId of reportUninspectableSpecIds(changedSpecIds, presentSpecIds)) {
    issues.push(
      issue(
        "QFAI-TRACE-003",
        `Spec ${specId} has BR/AC changes in the diff against "${baseBranch}" but no layered spec directory in the working tree, so its ledger cannot be read and the BR/AC to implementation integrity check (QFAI-TRACE-001) could not run for it. If the spec was deleted on purpose this needs no action; if it was renamed or converted, re-check the implementation links the old ledger carried.`,
        "info",
        path.join(config.paths.specsDir, specId),
        "traceability.integrity.specNotInWorkingTree",
      ),
    );
  }

  for (const { specId, ledgerPath } of layeredSpecs) {
    const ledger = await readSpecLedger(specId, ledgerPath);
    if (!ledger.ok) {
      issues.push(ledger.issue);
      continue;
    }
    if (!changedFiles || !changedSpecIds.has(specId)) {
      continue;
    }

    for (const entry of ledger.entries) {
      if (!changedFiles.has(normalizePath(entry.implFile))) {
        issues.push(
          issue(
            "QFAI-TRACE-001",
            `Spec ${specId} BR/AC changed but linked implementation file "${entry.implFile}" was not modified.`,
            "error",
            entry.implFile,
            "traceability.integrity.implNotChanged",
            [entry.brAc],
          ),
        );
      }
    }
  }

  return issues;
}

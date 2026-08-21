import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { getChangedFilesAgainstBase } from "../gitChanges.js";
import { parseFirstMarkdownTable, type MarkdownTable } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_AC_FILES = new Set(["04_Business-Rules.md", "03_Acceptance-Criteria.md"]);

const SPEC_DIR_RE = /^spec-\d{4}$/i;

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

/**
 * Spec directory names directly under `specsDir`, sorted so findings come out
 * in a stable order. A missing / unreadable specs directory is not a
 * traceability finding — the spec-pack validators own that — so it yields none.
 */
async function listSpecIds(specsDir: string): Promise<string[]> {
  try {
    const entries = await readdir(specsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && SPEC_DIR_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

type LedgerRead =
  | { readonly ok: true; readonly entries: LedgerEntry[] }
  | { readonly ok: false; readonly issue: Issue };

/**
 * Reads one spec's ledger. Both failure modes are `QFAI-TRACE-002` warnings:
 * the artifact is optional, and its absence or wrong shape only means the
 * `QFAI-TRACE-001` check cannot run for that spec.
 */
async function readSpecLedger(specId: string, ledgerPath: string): Promise<LedgerRead> {
  let ledgerContent: string;
  try {
    ledgerContent = await readFile(ledgerPath, "utf-8");
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
 * `BR_AC_FILES`.
 */
export async function validateTraceabilityIntegrity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const baseBranch = config.baseBranch ?? "origin/main";
  const specsDir = resolvePath(root, config, "specsDir");

  const changedFiles = getChangedFilesAgainstBase(root, baseBranch);
  const changedSpecIds = changedFiles
    ? findChangedSpecDirs(changedFiles, config.paths.specsDir)
    : new Set<string>();

  if (!changedFiles) {
    issues.push(
      issue(
        "QFAI-TRACE-003",
        `Could not diff against "${baseBranch}", so the BR/AC to implementation integrity check (QFAI-TRACE-001) was skipped for every spec. Fetch the base ref (a shallow CI clone does not carry it) or set validation baseBranch in qfai.config.yaml. Ledger presence is still checked.`,
        "info",
        undefined,
        "traceability.integrity.diffUnavailable",
      ),
    );
  }

  for (const specId of await listSpecIds(specsDir)) {
    const ledger = await readSpecLedger(specId, path.join(specsDir, specId, LEDGER_FILE));
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

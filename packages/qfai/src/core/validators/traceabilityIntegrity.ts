import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { getChangedFilesAgainstBase } from "../gitChanges.js";
import { parseFirstMarkdownTable, type MarkdownTable } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_AC_FILES = new Set(["04_Business-Rules.md", "03_Acceptance-Criteria.md"]);

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

export async function validateTraceabilityIntegrity(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const baseBranch = config.baseBranch ?? "origin/main";

  // A rename's source path is gone, so it cannot be the implementation this
  // ledger row still points at. Counting it as "modified" let a row that was
  // never updated for the move pass `QFAI-TRACE-001` in silence — the one case
  // where the ledger is provably stale.
  const changedFiles = getChangedFilesAgainstBase(root, baseBranch, { dropRenameSources: true });
  if (changedFiles.size === 0) {
    return issues;
  }

  const specsDir = resolvePath(root, config, "specsDir");
  const specsRelDir = config.paths.specsDir;
  const changedSpecIds = findChangedSpecDirs(changedFiles, specsRelDir);

  for (const specId of changedSpecIds) {
    const ledgerPath = path.join(specsDir, specId, "16_Traceability-ledger.md");
    let ledgerContent: string;
    try {
      ledgerContent = await readFile(ledgerPath, "utf-8");
    } catch {
      issues.push(
        issue(
          "QFAI-TRACE-002",
          `Traceability ledger not found for ${specId}. The BR/AC to implementation integrity check (QFAI-TRACE-001) is skipped for this spec. This artifact is optional; to enable the check, create it with /qfai-sdd from .qfai/assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md.`,
          "warning",
          ledgerPath,
          "traceability.integrity.ledgerMissing",
        ),
      );
      continue;
    }

    const ledgerTable = readLedgerTable(ledgerContent);

    // Format check before parse: a table that fails it is skipped, so parsing
    // it first only built rows nothing reads.
    if (!isExpectedLedgerFormat(ledgerTable)) {
      issues.push(
        issue(
          "QFAI-TRACE-002",
          `Traceability ledger for ${specId} uses unexpected format. The first Markdown table must have at least 3 columns, one of them named "Implementation File". Skipping integrity check. See .qfai/assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md for the expected schema.`,
          "warning",
          ledgerPath,
          "traceability.integrity.ledgerFormatMismatch",
        ),
      );
      continue;
    }

    const entries = parseLedger(ledgerTable);
    for (const entry of entries) {
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

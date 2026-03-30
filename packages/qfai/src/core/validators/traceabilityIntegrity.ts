import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const BR_AC_FILES = new Set(["04_Business-Rules.md", "03_Acceptance-Criteria.md"]);

type LedgerEntry = {
  brAc: string;
  implFile: string;
};

function parseLedger(content: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    // Skip non-table rows, header rows, and separator rows
    if (!line.startsWith("|")) {
      continue;
    }
    if (/^\|\s*-/.test(line)) {
      continue;
    }
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
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

function getChangedFiles(root: string, baseBranch: string): Set<string> {
  try {
    const output = execSync(`git diff --name-only ${baseBranch}..HEAD`, {
      cwd: root,
      encoding: "utf-8",
    });
    return new Set(
      output
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    );
  } catch {
    return new Set();
  }
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

  const changedFiles = getChangedFiles(root, baseBranch);
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
          `Traceability ledger not found for ${specId}. Skipping integrity check.`,
          "warning",
          ledgerPath,
          "traceability.integrity.ledgerMissing",
        ),
      );
      continue;
    }

    const entries = parseLedger(ledgerContent);
    for (const entry of entries) {
      if (!changedFiles.has(entry.implFile)) {
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

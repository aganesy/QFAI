import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseFirstMarkdownTable } from "../specPackParsers.js";
import { parseTestCaseIds } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

const REQUIRED_COLUMNS = ["TDD-ID", "TC-Refs", "Layer", "Test file", "Selector", "Status"];

const VALID_STATUSES = new Set(["todo", "red", "green", "refactor", "done", "exception"]);

const TDD_LIST_REL_PATH = path.join("tdd", "test-list.md");

export async function validateTddList(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const issues: Issue[] = [];

  for (const entry of entries) {
    const specIssues = await validateSpecTddList(root, entry.dir, entry.specNumber);
    issues.push(...specIssues);
  }

  return issues;
}

async function validateSpecTddList(
  root: string,
  specDir: string,
  specNumber: string,
): Promise<Issue[]> {
  const filePath = path.join(specDir, TDD_LIST_REL_PATH);
  const relPath = path.relative(root, filePath).replace(/\\/g, "/");
  const issues: Issue[] = [];

  // Check 1: File existence
  if (!(await exists(filePath))) {
    // tdd/test-list.md is optional for specs that predate v1.6.0.
    // Only emit a warning so existing specs are not broken.
    issues.push(
      issue(
        "TDDLIST_MISSING",
        `tdd/test-list.md not found for spec-${specNumber}`,
        "warning",
        relPath,
        "tddList.fileExists",
      ),
    );
    return issues;
  }

  const content = await readSafe(filePath);

  // Check 2: Table existence
  const table = parseFirstMarkdownTable(content);
  if (!table) {
    issues.push(
      issue(
        "TDDLIST_TABLE_MISSING",
        `tdd/test-list.md for spec-${specNumber} does not contain a Markdown table`,
        "error",
        relPath,
        "tddList.tableExists",
      ),
    );
    return issues;
  }

  // Check 3: Required columns
  const normalizedHeaders = table.headers.map((h) => h.trim());
  for (const col of REQUIRED_COLUMNS) {
    if (!normalizedHeaders.includes(col)) {
      issues.push(
        issue(
          "TDDLIST_REQUIRED_COLUMN_MISSING",
          `Required column "${col}" missing in tdd/test-list.md for spec-${specNumber}`,
          "error",
          relPath,
          "tddList.requiredColumns",
        ),
      );
    }
  }
  if (issues.length > 0) {
    return issues;
  }

  // Informational notice for header-only tables
  if (table.rows.length === 0) {
    issues.push(
      issue(
        "TDDLIST_INFO",
        `No active items in tdd/test-list.md for spec-${specNumber}`,
        "info",
        relPath,
        "tddList.noActiveItems",
      ),
    );
    return issues;
  }

  // Check 4: Status enum validation
  const statusIndex = normalizedHeaders.indexOf("Status");
  if (statusIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (status.length > 0 && !VALID_STATUSES.has(status)) {
        issues.push(
          issue(
            "TDDLIST_INVALID_STATUS",
            `Invalid status "${status}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1})`,
            "error",
            relPath,
            "tddList.validStatus",
          ),
        );
      }
    }
  }

  // Check 5: TC reference existence
  const tcRefsIndex = normalizedHeaders.indexOf("TC-Refs");
  if (tcRefsIndex >= 0) {
    const knownTcIds = await collectKnownTcIds(specDir);
    if (knownTcIds.size > 0) {
      for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];
        if (!row) continue;
        const tcRefsCell = (row[tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = tcRefsCell.split(/[,;\s]+/).filter((r) => r.length > 0);
        for (const ref of refs) {
          const normalized = ref.toUpperCase();
          const parent = normalized.replace(/-\d{4}$/, "");
          if (
            /^TC-\d{4}(-\d{4})?$/.test(normalized) &&
            !knownTcIds.has(normalized) &&
            !knownTcIds.has(parent)
          ) {
            issues.push(
              issue(
                "TDDLIST_UNKNOWN_REF",
                `Unknown TC reference "${ref}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1})`,
                "warning",
                relPath,
                "tddList.tcRefExists",
              ),
            );
          }
        }
      }
    }
  }

  return issues;
}

async function collectKnownTcIds(specDir: string): Promise<Set<string>> {
  const testCasesPath = path.join(specDir, "06_Test-Cases.md");
  if (!(await exists(testCasesPath))) {
    return new Set();
  }
  try {
    const content = await readFile(testCasesPath, "utf-8");
    const ids = parseTestCaseIds(content);
    return new Set(ids.map((id) => id.toUpperCase()));
  } catch {
    return new Set();
  }
}

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseFirstMarkdownTable } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { exists, issue, readSafe } from "./utils.js";

const REQUIRED_COLUMNS = [
  "TDD-ID",
  "TC-Refs",
  "Layer",
  "Test file",
  "Selector",
  "Status",
  "DR-ID",
  "Evidence",
];

const VALID_STATUSES = new Set(["todo", "red", "green", "refactor", "done", "exception"]);

const TEST_FILE_CHECK_STATUSES = new Set(["green", "refactor", "done"]);

const TDD_ID_FORMAT = /^TDD-\d{4}$/;

const UNIT_COMPONENT_LAYERS = new Set(["unit", "component"]);

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
    // Do NOT return early: Phase 2 TC coverage check must still run
    // even when the table has no rows, to detect missing test entries.
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

  // ── Phase 2 checks ──

  const tddIdIndex = normalizedHeaders.indexOf("TDD-ID");
  const drIdIndex = normalizedHeaders.indexOf("DR-ID");
  const testFileIndex = normalizedHeaders.indexOf("Test file");

  // Phase 2 – Check 6: TDD-ID format (TDD-NNNN)
  if (tddIdIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const tddId = (row[tddIdIndex] ?? "").trim();
      if (!TDD_ID_FORMAT.test(tddId)) {
        issues.push(
          issue(
            "TDDLIST_INVALID_ID",
            `Invalid TDD-ID "${tddId}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}). Expected format: TDD-NNNN`,
            "error",
            relPath,
            "tddList.idFormat",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 7: Duplicate TDD-ID (case-insensitive)
  if (tddIdIndex >= 0) {
    const seen = new Map<string, number>();
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const tddId = (row[tddIdIndex] ?? "").trim().toUpperCase();
      if (tddId.length === 0) continue;
      const prev = seen.get(tddId);
      if (prev !== undefined) {
        issues.push(
          issue(
            "TDDLIST_DUPLICATE_ID",
            `Duplicate TDD-ID "${row[tddIdIndex]?.trim()}" in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}, first seen row ${prev + 1})`,
            "error",
            relPath,
            "tddList.duplicateId",
          ),
        );
      } else {
        seen.set(tddId, rowIdx);
      }
    }
  }

  // Phase 2 – Check 8: Exception rows must have DR-ID
  if (statusIndex >= 0 && drIdIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (status !== "exception") continue;
      const drId = (row[drIdIndex] ?? "").trim();
      if (drId.length === 0) {
        issues.push(
          issue(
            "TDDLIST_EXCEPTION_MISSING_DR",
            `Status=exception but DR-ID is empty in tdd/test-list.md for spec-${specNumber} (row ${rowIdx + 1}). Add a DR-ID reference`,
            "error",
            relPath,
            "tddList.exceptionDrId",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 9: Test file existence for green/refactor/done
  if (statusIndex >= 0 && testFileIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const status = (row[statusIndex] ?? "").trim().toLowerCase();
      if (!TEST_FILE_CHECK_STATUSES.has(status)) continue;
      const testFile = (row[testFileIndex] ?? "").trim();
      if (testFile.length === 0) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file is empty for spec-${specNumber} (row ${rowIdx + 1}, Status=${status}). Provide a project-root-relative test file path`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
        continue;
      }
      const normalized = testFile.replace(/\\/g, "/");
      const resolved = path.resolve(root, normalized);
      const relative = path.relative(root, resolved);
      if (
        path.isAbsolute(normalized) ||
        path.win32.isAbsolute(normalized) ||
        relative === ".." ||
        relative.startsWith(".." + path.sep)
      ) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file "${testFile}" for spec-${specNumber} (row ${rowIdx + 1}) must be a project-root-relative path without ".." or absolute segments`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
        continue;
      }
      let isFile = false;
      try {
        isFile = (await stat(resolved)).isFile();
      } catch {
        // file does not exist
      }
      if (!isFile) {
        issues.push(
          issue(
            "TDDLIST_TEST_FILE_MISSING",
            `Test file "${testFile}" not found for spec-${specNumber} (row ${rowIdx + 1}). Path resolved relative to project root`,
            "error",
            relPath,
            "tddList.testFileExists",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 10: TC coverage (unit/component TCs must appear in test-list)
  if (tcRefsIndex >= 0) {
    const unitComponentTcIds = await collectUnitComponentTcIds(specDir);
    if (unitComponentTcIds.size > 0) {
      const coveredTcIds = new Set<string>();
      for (const row of table.rows) {
        const tcRefsCell = (row[tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = tcRefsCell.split(/[,;\s]+/).filter((r) => r.length > 0);
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          coveredTcIds.add(upper);
          // Also add parent TC-ID for sub-ID references (e.g. TC-0001-0001 → TC-0001)
          const parent = upper.replace(/-\d{4}$/, "");
          if (parent !== upper) coveredTcIds.add(parent);
        }
      }
      for (const tcId of unitComponentTcIds) {
        if (!coveredTcIds.has(tcId)) {
          issues.push(
            issue(
              "TDDLIST_TC_NOT_COVERED",
              `TC "${tcId}" (unit/component) is not referenced in tdd/test-list.md for spec-${specNumber}. Add a row with this TC in TC-Refs`,
              "error",
              relPath,
              "tddList.tcCoverage",
            ),
          );
        }
      }
    }
  }

  return issues;
}

async function collectKnownTcIds(specDir: string): Promise<Set<string>> {
  const content = await readTestCasesContent(specDir);
  if (!content) return new Set();
  const table = parseFirstMarkdownTable(content);
  if (!table) return new Set();
  const tcIdIndex = table.headers.findIndex((h) => h.trim() === "TC-ID");
  if (tcIdIndex < 0) return new Set();
  const ids = new Set<string>();
  for (const row of table.rows) {
    const tcId = (row[tcIdIndex] ?? "").trim().toUpperCase();
    if (tcId.length > 0) ids.add(tcId);
  }
  return ids;
}

async function collectUnitComponentTcIds(specDir: string): Promise<Set<string>> {
  const content = await readTestCasesContent(specDir);
  if (!content) return new Set();
  const table = parseFirstMarkdownTable(content);
  if (!table) return new Set();
  const headers = table.headers.map((h) => h.trim());
  const tcIdIndex = headers.indexOf("TC-ID");
  const levelIndex = headers.indexOf("Level");
  if (tcIdIndex < 0 || levelIndex < 0) return new Set();
  const ids = new Set<string>();
  for (const row of table.rows) {
    const level = (row[levelIndex] ?? "").trim().toLowerCase();
    if (!UNIT_COMPONENT_LAYERS.has(level)) continue;
    const tcId = (row[tcIdIndex] ?? "").trim().toUpperCase();
    if (tcId.length > 0) ids.add(tcId);
  }
  return ids;
}

async function readTestCasesContent(specDir: string): Promise<string | null> {
  const testCasesPath = path.join(specDir, "06_Test-Cases.md");
  if (!(await exists(testCasesPath))) {
    return null;
  }
  try {
    return await readFile(testCasesPath, "utf-8");
  } catch {
    return null;
  }
}

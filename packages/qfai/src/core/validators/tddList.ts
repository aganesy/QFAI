import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseFirstMarkdownTable, resolveTestCaseTable } from "../specPackParsers.js";
import { EXCEPTION_PARKED_RULE_ID } from "../ruleIds.js";
import { isCoverageTargetLevel, splitTcRefs, resolveParentTcId } from "../tddHelpers.js";
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

/**
 * Test directories a `Layer` value implies. `null` means the layer has no
 * mandated directory, so no consistency claim is made about it.
 */
const LAYER_TEST_DIRS: Record<string, string | null> = {
  unit: null,
  component: null,
  integration: "tests/integration/",
  api: "tests/api/",
  e2e: "tests/e2e/",
};

const TDD_ID_FORMAT = /^TDD-\d{4}$/;

/**
 * True when `testFile` is placed under the repo-root `dir`.
 *
 * A substring test matched anywhere in the path, so `src/tests/e2e/foo.test.ts`
 * and `mytests/e2e/foo.test.ts` both read as `tests/e2e/` and produced a
 * TDDLIST_LAYER_PATH_MISMATCH warning against a file that is not in the
 * mandated directory at all. Anchoring at the start, after stripping a leading
 * `./`, keeps the claim to real directory placement.
 */
function isUnderTestDir(testFile: string, dir: string): boolean {
  return testFile.replace(/^\.\//, "").startsWith(dir);
}

const TDD_LIST_REL_PATH = path.join("tdd", "test-list.md");

/**
 * Waiver rule id for `TDDLIST_EXCEPTION_PARKED`.
 *
 * A parked item that carries a user-approved accepted risk is a legitimate
 * end state, but the ledger row alone cannot prove the DR-ID was approved.
 * `.qfai/waivers.yml` is the approval artifact QFAI already has (it requires
 * `id`/`reason`/`expires`/`evidence` and expires), so the finding is emitted
 * under a rule id `waivers.ts#resolveRuleId` accepts.
 *
 * Re-exported from `core/ruleIds.ts`, which `waivers.ts` also reads, so the two
 * cannot drift apart on a rename.
 */
export { EXCEPTION_PARKED_RULE_ID };

/** Per-spec file that owns the Test Case Table, and the target of its findings. */
const TEST_CASES_FILE_NAME = "06_Test-Cases.md";

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
    // tdd/test-list.md is optional for older specs; emit a warning so
    // existing specs are not broken.
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
  const { knownTcIds, unitComponentTcIds, unresolved } = await collectTestCaseIds(specDir);
  if (unresolved) {
    // Both TC checks below are no-ops without a resolved table. Say so, so a
    // silent skip is distinguishable from a pass.
    //
    // The finding points at `06_Test-Cases.md`, not at the ledger: that is the
    // file to edit, and `file` is what GitHub annotations, report hotspots and
    // `scope.paths` waivers key on. Blaming `tdd/test-list.md` would send all
    // three at a document that is not the problem.
    const testCasesRelPath = path
      .relative(root, path.join(specDir, TEST_CASES_FILE_NAME))
      .replace(/\\/g, "/");
    issues.push(
      issue(
        "TDDLIST_TC_TABLE_UNRESOLVED",
        unresolved === "no-table"
          ? `Could not resolve the Test Case Table in ${TEST_CASES_FILE_NAME} for spec-${specNumber}: no Markdown table was found under the \`## Test Case Table\` section (a table elsewhere in the file is not used); TC coverage checks skipped`
          : `No \`TC-ID\` column found in the Test Case Table of ${TEST_CASES_FILE_NAME} for spec-${specNumber}; TC coverage checks skipped`,
        "warning",
        testCasesRelPath,
        "tddList.testCaseTableResolvable",
        undefined,
        "change",
        `${TEST_CASES_FILE_NAME} の \`## Test Case Table\` セクションに \`TC-ID\` 列を持つ表を記載してください。`,
      ),
    );
  }
  if (tcRefsIndex >= 0) {
    if (knownTcIds.size > 0) {
      for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
        const row = table.rows[rowIdx];
        if (!row) continue;
        const tcRefsCell = (row[tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = splitTcRefs(tcRefsCell);
        for (const ref of refs) {
          const normalized = ref.toUpperCase();
          const parent = resolveParentTcId(normalized) ?? normalized;
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

  // Phase 2 – Check 8b: parked items must be visible in CI.
  //
  // `exception` is a completion-satisfying terminal that no validator reported,
  // so the cheapest fully-compliant path to "implementation complete" was to
  // park every unfinished item there. A warning per row makes the parking
  // visible without breaking existing runs.
  if (statusIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      if ((row[statusIndex] ?? "").trim().toLowerCase() !== "exception") continue;
      const tddId = tddIdIndex >= 0 ? (row[tddIdIndex] ?? "").trim() : "";
      const drId = drIdIndex >= 0 ? (row[drIdIndex] ?? "").trim() : "";
      const hasDrId = drId.length > 0 && drId !== "-";
      // Every row of one ledger shares the same rule AND the same file, so a
      // waiver matched on `rule` + `scope.paths` alone would clear every parked
      // row at once — including ones the operator never approved. `dl_id` is the
      // only per-finding key `waivers.ts#matchesWaiver` compares, so the row
      // identity goes there and `WAIVER-005` refuses a waiver that omits it.
      //
      // That identity must be unique to ONE row. TDD-ID is (TDDLIST_DUPLICATE_ID
      // enforces it within a ledger), so it is used when present. A DR-ID is
      // NOT: several parked rows can cite the same decision record, and keying
      // on it let one `match.dl_ids` entry suppress every row carrying that DR —
      // reintroducing the over-suppression this key exists to prevent. Anything
      // without a TDD-ID falls back to its row position, which is unique by
      // construction.
      const rowKey = tddId.length > 0 ? tddId : `row ${rowIdx + 1}`;
      // Only the TDD-ID form is a "TDD-ID"; the fallback is a row position, and
      // telling an operator to put a TDD-ID in `match.dl_ids` when the value is
      // `row 3` would send them looking for one that does not exist.
      const rowKeyLabel = tddId.length > 0 ? `TDD-ID ${rowKey}` : `row identifier "${rowKey}"`;
      issues.push(
        issue(
          "TDDLIST_EXCEPTION_PARKED",
          `TDD item "${rowKey}" in spec-${specNumber} is parked at Status=exception${hasDrId ? ` (DR-ID ${drId})` : ""}. Resolve it (\`exception -> todo\`), or record the accepted risk as a \`${EXCEPTION_PARKED_RULE_ID}\` waiver in \`.qfai/waivers.yml\` naming this row in \`match.dl_ids\``,
          "warning",
          relPath,
          // Rule id, not a dotted path: `waivers.ts#resolveRuleId` only accepts
          // `^[A-Z]+-\d{3}$`, so a dotted name could never be waived and the
          // accepted-risk case the message points at had no way to clear.
          EXCEPTION_PARKED_RULE_ID,
          hasDrId ? [drId] : undefined,
          "change",
          `承認済みの accepted risk である場合は \`.qfai/waivers.yml\` に rule: ${EXCEPTION_PARKED_RULE_ID} の waiver（id / reason / expires / evidence / scope.paths / match.dl_ids が必須）を登録してください。match.dl_ids には対象行の ${rowKeyLabel} だけを列挙します。作業を再開する場合は \`exception -> todo\` で戻してください。`,
          { dl_id: rowKey },
        ),
      );
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
            `Test file "${testFile}" for spec-${specNumber} (row ${rowIdx + 1}) must be a relative path that does not escape the project root`,
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

  // Phase 2 – Check 9b: Layer <-> Test file consistency.
  //
  // `Layer` was a required column whose value was never read, so a `Unit` row
  // pointing at `tests/integration/**` was an invisible state.
  const layerIndex = normalizedHeaders.indexOf("Layer");
  if (layerIndex >= 0 && testFileIndex >= 0) {
    for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      const row = table.rows[rowIdx];
      if (!row) continue;
      const layer = (row[layerIndex] ?? "").trim().toLowerCase();
      const testFile = (row[testFileIndex] ?? "").trim().replace(/\\/g, "/");
      const expectedDir = LAYER_TEST_DIRS[layer];
      if (!expectedDir || testFile.length === 0) continue;

      const actualDir = Object.entries(LAYER_TEST_DIRS).find(
        ([, dir]) => dir !== null && isUnderTestDir(testFile, dir),
      );
      if (actualDir && actualDir[1] !== expectedDir) {
        issues.push(
          issue(
            "TDDLIST_LAYER_PATH_MISMATCH",
            `Layer "${(row[layerIndex] ?? "").trim()}" for spec-${specNumber} (row ${rowIdx + 1}) does not match Test file "${testFile}" (expected a path under ${expectedDir})`,
            "warning",
            relPath,
            "tddList.layerPathConsistency",
          ),
        );
      }
    }
  }

  // Phase 2 – Check 10: TC coverage (unit/component TCs must appear in test-list)
  if (tcRefsIndex >= 0) {
    if (unitComponentTcIds.size > 0) {
      const coveredTcIds = new Set<string>();
      for (const row of table.rows) {
        const tcRefsCell = (row[tcRefsIndex] ?? "").trim();
        if (tcRefsCell.length === 0) continue;
        const refs = splitTcRefs(tcRefsCell);
        for (const ref of refs) {
          const upper = ref.toUpperCase();
          coveredTcIds.add(upper);
          const parent = resolveParentTcId(upper);
          if (parent) coveredTcIds.add(parent);
        }
      }
      for (const tcId of unitComponentTcIds) {
        if (!coveredTcIds.has(tcId)) {
          issues.push(
            issue(
              "TDDLIST_TC_NOT_COVERED",
              `TC "${tcId}" (coverage-target) is not referenced in tdd/test-list.md for spec-${specNumber}. Add a row with this TC in TC-Refs`,
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

type TestCaseIds = {
  knownTcIds: Set<string>;
  unitComponentTcIds: Set<string>;
  /**
   * Set when no `TC-ID`-bearing table could be located. Both TC checks go
   * silent in that case, so the caller reports the miss rather than letting
   * "nothing found" read as "everything covered".
   */
  unresolved?: "no-table" | "no-tc-id-column";
};

async function collectTestCaseIds(specDir: string): Promise<TestCaseIds> {
  const empty: TestCaseIds = { knownTcIds: new Set(), unitComponentTcIds: new Set() };
  const testCasesPath = path.join(specDir, TEST_CASES_FILE_NAME);
  if (!(await exists(testCasesPath))) return empty;
  let content: string;
  try {
    content = await readFile(testCasesPath, "utf-8");
  } catch {
    return empty;
  }
  // Scoped to the `## Test Case Table` section the template names, with a
  // header-match fallback for older specs. Reading the first table in
  // document order let an explanatory table above the heading hijack the set.
  const resolution = resolveTestCaseTable(content);
  if (!resolution.table) {
    return { ...empty, unresolved: resolution.reason };
  }
  const table = resolution.table;
  const headers = table.headers.map((h) => h.trim());
  const tcIdIndex = headers.indexOf("TC-ID");
  const levelIndex = headers.indexOf("Level");

  const knownTcIds = new Set<string>();
  const unitComponentTcIds = new Set<string>();
  for (const row of table.rows) {
    const tcId = (row[tcIdIndex] ?? "").trim().toUpperCase();
    if (tcId.length === 0) continue;
    knownTcIds.add(tcId);
    if (levelIndex >= 0) {
      const level = (row[levelIndex] ?? "").trim().toLowerCase();
      if (!isCoverageTargetLevel(level)) continue;
    }
    // Reaches here when: (a) Level is a coverage target, or (b) Level column is absent (fallback: all TCs)
    unitComponentTcIds.add(tcId);
  }
  return { knownTcIds, unitComponentTcIds };
}

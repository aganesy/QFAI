import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { splitMarkdownRow } from "../specPackParsers.js";
import { collectSpecEntries, type SpecEntry } from "../specLayout.js";
import type { Issue } from "../types.js";
import { collectMarkdownItems, collectScenarioItems, exists, issue, readSafe } from "./utils.js";

const ID_PATTERNS = {
  us: /^US-\d{4}(?:-\d{4})?$/,
  ac: /^AC-\d{4}(?:-\d{4})?$/,
  br: /^BR-\d{4}(?:-\d{4})?$/,
  ex: /^EX-\d{4}(?:-\d{4})?$/,
} as const;

const V1421_REFS = {
  ac: /\bAC-\d{4}(?:-\d{4})?\b/gi,
  br: /\bBR-\d{4}(?:-\d{4})?\b/gi,
  ex: /\bEX-\d{4}(?:-\d{4})?\b/gi,
} as const;

// QFAI-PLAN-002 (`plan.howOnly.status`): keep progress tracking out of
// `10_Plan.md`.
//
// NOTE: bare-word matching is intentionally absent. The pre-fix pattern
// was `/\b(?:status|progress|todo|remaining|done|wip)\b|進捗|残作業|状態/i`
// tested against whole heading text, so it also rejected unavoidable
// How-content headings — "HTTP Status Mapping", "Status Code Handling",
// "Response Status Construction", "Definition of Done", 「状態遷移」,
// 「状態機械」 — and `状態` has no word boundary, so ANY heading
// containing that ordinary noun failed. There is no config key, waiver
// list or per-rule severity override, so the only remedy was renaming a
// heading to mean the same thing in different words.
//
// Match operational SHAPES instead, exactly as the sibling rule
// `validateStatusInSpecs` does (see the equivalent NOTE in
// `statusInSpecs.ts`, where the bare word `status` is likewise excluded
// on purpose):
//   - a heading used as an operational field  -> `Status: …`, 「進捗:」
//   - a heading that IS a progress label      -> `Progress`, `TODO`, 「進捗」
//
// A heading that merely CONTAINS one of these words is now allowed.
// Progress tracking is still caught, because progress tracking names
// itself; domain vocabulary that happens to collide no longer is.
const PLAN_STATUS_HEADING_PATTERNS = [
  // Operational field promoted to a heading: `<field>: <value>`.
  /^\s*(?:status|progress|todo|remaining|done|wip)\s*[:：]/i,
  /^\s*(?:進捗|残作業|作業状況|実装状態|対応状況|ステータス)\s*[:：]/,
  // Whole heading IS a progress label (no surrounding domain words).
  /^\s*(?:progress(?:\s*tracking)?|todo|to\s*do|wip|work\s*in\s*progress|remaining(?:\s*(?:work|tasks?|items?))?|current\s*status|implementation\s*status|status\s*tracking)\s*$/i,
  /^\s*(?:進捗|進捗状況|進捗管理|残作業|残タスク|作業状況|実装状態|対応状況|ステータス)\s*$/,
] as const;

type CoverageRow = {
  id: string;
  count: number;
};

type CoverageSnapshot = {
  ac: CoverageRow[];
  br: CoverageRow[];
  ex: CoverageRow[];
  signals: string[];
};

type ParseDefinitionOptions = {
  referenceColumns?: readonly string[];
};

export async function validateLayerCoverage(root: string, config: QfaiConfig): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  const layeredEntries = entries.filter((entry) => entry.layout === "layered");

  const issues: Issue[] = [];
  issues.push(...(await validatePlanArtifacts(specsRoot, layeredEntries)));

  if (layeredEntries.length === 0) {
    return issues;
  }

  const coverageRoot = path.join(resolvePath(root, config, "outDir"), "specs-coverage");

  for (const entry of layeredEntries) {
    if (isV1421LayeredEntry(entry)) {
      const coverageResult = await validateV1421Coverage(entry);
      issues.push(...coverageResult.issues);
      try {
        await writeCoverageReport(coverageRoot, entry.specNumber, coverageResult.snapshot);
      } catch (error) {
        issues.push(
          issue(
            "QFAI-COV-901",
            `coverage report の出力に失敗しました: ${formatError(error)}`,
            "warning",
            coverageRoot,
            "layerCoverage.report",
          ),
        );
      }
      continue;
    }

    if (entry.layeredStyle === "v1417") {
      issues.push(
        ...(await validateUsToAcCoverage(entry.userStoriesPath, entry.acceptanceCriteriaPath)),
      );
      issues.push(
        ...(await validateAcToBrCoverage(entry.acceptanceCriteriaPath, entry.businessRulesPath)),
      );
      issues.push(...(await validateBrToExCoverage(entry.businessRulesPath, entry.examplesPath)));
      issues.push(...(await validateExToTcCoverage(entry.examplesPath, entry.testCasesPath)));
    }
  }

  return issues;
}

async function validatePlanArtifacts(specsRoot: string, entries: SpecEntry[]): Promise<Issue[]> {
  const issues: Issue[] = [];
  const deprecatedPlanPath = path.join(specsRoot, "plan.md");
  if (await exists(deprecatedPlanPath)) {
    issues.push(
      issue(
        "QFAI-PLAN-001",
        "specs/plan.md は廃止されました。10_Plan.md を使用してください。",
        "error",
        deprecatedPlanPath,
        "plan.deprecatedSharedPlan",
        undefined,
        "change",
        "`.qfai/specs/plan.md` を削除し、各 spec ディレクトリの `10_Plan.md` に統一してください。",
      ),
    );
  }

  for (const entry of entries) {
    const planFileName = path.basename(entry.planPath).toLowerCase();
    if (planFileName !== "10_plan.md") {
      continue;
    }
    if (!(await exists(entry.planPath))) {
      continue;
    }

    const text = await readSafe(entry.planPath);
    const headings = extractHeadings(text);

    const forbiddenHeadingGroups = [
      {
        code: "QFAI-PLAN-002",
        rule: "plan.howOnly.status",
        patterns: PLAN_STATUS_HEADING_PATTERNS,
        message: "10_Plan.md に状態管理系の見出しは記載できません（How専用）。",
      },
      {
        code: "QFAI-PLAN-003",
        rule: "plan.howOnly.history",
        patterns: [/\b(?:changelog|history|updated\s*at|update\s*history)\b|改訂履歴|更新履歴/i],
        message: "10_Plan.md に更新履歴系の見出しは記載できません（How専用）。",
      },
      {
        code: "QFAI-PLAN-004",
        rule: "plan.howOnly.release",
        patterns: [/\b(?:release\s*candidate|go\s*\/?\s*no\s*\/?\s*go|rc)\b|リリース可否/i],
        message: "10_Plan.md に RC/Go-NoGo 判定の見出しは記載できません（How専用）。",
      },
    ] as const;

    for (const group of forbiddenHeadingGroups) {
      const matched = headings.filter((heading) =>
        group.patterns.some((pattern) => pattern.test(heading)),
      );
      if (matched.length === 0) {
        continue;
      }
      issues.push(
        issue(
          group.code,
          `${group.message} 検出: ${matched.join(", ")}`,
          "error",
          entry.planPath,
          group.rule,
          matched,
          "change",
          "10_Plan.md は実装方針・テスト方針・NFR方針・リスク軽減策のみに限定してください。",
        ),
      );
    }

    if (hasTicketLinkList(text)) {
      issues.push(
        issue(
          "QFAI-PLAN-005",
          "10_Plan.md にチケットURLの羅列を検出しました。根拠説明を伴わない一覧は許可されません。",
          "error",
          entry.planPath,
          "plan.howOnly.ticketLinks",
          undefined,
          "change",
          "チケットURLは方針・判断の根拠説明とセットで最小限に記載してください。",
        ),
      );
    }
  }

  return issues;
}

async function validateV1421Coverage(
  entry: SpecEntry,
): Promise<{ issues: Issue[]; snapshot: CoverageSnapshot }> {
  const [acText, brText, exText, tcText] = await Promise.all([
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.businessRulesPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  const acIds = parseAcceptanceCriteriaIds(acText);
  const brToAcRefs = parseDefinitionRefs(brText, "BR", V1421_REFS.ac, {
    referenceColumns: ["AC-Refs"],
  });
  const exToBrRefs = parseDefinitionRefs(exText, "EX", V1421_REFS.br, {
    referenceColumns: ["BR-Ref"],
  });
  const tcToAcRefs = parseDefinitionRefs(tcText, "TC", V1421_REFS.ac, {
    referenceColumns: ["AC-Refs"],
  });
  const tcToExRefs = parseDefinitionRefs(tcText, "TC", V1421_REFS.ex, {
    referenceColumns: ["EX-Ref"],
  });

  const brIds = new Set(brToAcRefs.keys());
  const exIds = new Set(exToBrRefs.keys());

  const acCoverage = buildCoverageCounts(acIds, tcToAcRefs);
  const brCoverage = buildCoverageCounts(brIds, exToBrRefs);
  const exCoverage = buildCoverageCounts(exIds, tcToExRefs);

  const brWithoutAcRefs = findSourcesWithEmptyRefs(brToAcRefs);
  const exWithoutBrRefs = findSourcesWithEmptyRefs(exToBrRefs);
  const tcWithoutRefs = findTcWithoutAnyRefs(tcToAcRefs, tcToExRefs);
  const missingAc = findUncoveredIds(acCoverage);
  const missingBr = findUncoveredIds(brCoverage);
  const missingEx = findUncoveredIds(exCoverage);

  const issues: Issue[] = [];
  if (brWithoutAcRefs.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-204",
        `AC-Refs が空の BR があります: ${brWithoutAcRefs.join(", ")}`,
        "error",
        entry.businessRulesPath,
        "layerCoverage.brRequiresAcRefs",
        brWithoutAcRefs,
        "change",
        "04_Business-Rules.md の `AC-Refs` に、各 BR が参照する AC を1件以上設定してください。",
      ),
    );
  }

  if (exWithoutBrRefs.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-205",
        `BR-Ref が空の EX があります: ${exWithoutBrRefs.join(", ")}`,
        "error",
        entry.examplesPath,
        "layerCoverage.exRequiresBrRef",
        exWithoutBrRefs,
        "change",
        "05_Examples.md の `BR-Ref` に、各 EX が具体化する BR を1件以上設定してください。",
      ),
    );
  }

  if (tcWithoutRefs.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-206",
        `AC-Refs と EX-Ref が空の TC があります: ${tcWithoutRefs.join(", ")}`,
        "error",
        entry.testCasesPath,
        "layerCoverage.tcRequiresAnyRef",
        tcWithoutRefs,
        "change",
        "06_Test-Cases.md の各 TC に `AC-Refs` または `EX-Ref` のどちらか（推奨: 両方）を設定してください。",
      ),
    );
  }

  if (missingAc.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-201",
        `AC に紐づく TC がありません: ${missingAc.join(", ")}`,
        "error",
        entry.testCasesPath,
        "layerCoverage.acToTc",
        missingAc,
        "change",
        "06_Test-Cases.md の `AC-Refs` に各 AC を紐づけてください。",
      ),
    );
  }

  if (missingBr.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-202",
        `BR を具体化する EX がありません: ${missingBr.join(", ")}`,
        "error",
        entry.examplesPath,
        "layerCoverage.brToEx",
        missingBr,
        "change",
        "05_Examples.md の `BR-Ref` で各 BR を参照してください。",
      ),
    );
  }

  if (missingEx.length > 0) {
    issues.push(
      issue(
        "QFAI-COV-203",
        `EX を検証する TC がありません: ${missingEx.join(", ")}`,
        "error",
        entry.testCasesPath,
        "layerCoverage.exToTc",
        missingEx,
        "change",
        "06_Test-Cases.md の `EX-Ref` で各 EX を参照してください。",
      ),
    );
  }

  const snapshot: CoverageSnapshot = {
    ac: toCoverageRows(acCoverage),
    br: toCoverageRows(brCoverage),
    ex: toCoverageRows(exCoverage),
    signals: [
      ...buildSignalRows("AC", acCoverage, "TC"),
      ...buildSignalRows("BR", brCoverage, "EX"),
      ...buildSignalRows("EX", exCoverage, "TC"),
    ],
  };

  return { issues, snapshot };
}

function parseAcceptanceCriteriaIds(text: string): Set<string> {
  const ids = new Set<string>();
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (const line of lines) {
    const headingMatch = /^##\s*(AC-\d{4}(?:-\d{4})?)\b/i.exec(line.trim());
    if (headingMatch?.[1]) {
      ids.add(headingMatch[1].toUpperCase());
    }

    const commentMatch = /^\s*#\s*(AC-\d{4}(?:-\d{4})?)\b/i.exec(line);
    if (commentMatch?.[1]) {
      ids.add(commentMatch[1].toUpperCase());
    }

    if (line.trim().startsWith("|")) {
      const cells = splitMarkdownRow(line);
      if (isSeparatorRow(cells)) {
        continue;
      }
      const firstCell = normalizeId(cells[0]);
      if (firstCell && ID_PATTERNS.ac.test(firstCell)) {
        ids.add(firstCell);
      }
    }
  }

  return ids;
}

function parseDefinitionRefs(
  text: string,
  prefix: "BR" | "EX" | "TC",
  refPattern: RegExp,
  options: ParseDefinitionOptions = {},
): Map<string, Set<string>> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const refsById = new Map<string, Set<string>>();
  const idPattern = new RegExp(`^${prefix}-\\d{4}(?:-\\d{4})?$`);
  const headingPattern = new RegExp(`^##\\s*(${prefix}-\\d{4}(?:-\\d{4})?)\\b`, "i");
  const referenceColumns = new Set(
    (options.referenceColumns ?? []).map((column) => normalizeColumnName(column)),
  );

  let currentId: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const headingMatch = headingPattern.exec(line.trim());
    if (headingMatch?.[1]) {
      currentId = headingMatch[1].toUpperCase();
      ensureSet(refsById, currentId);
      continue;
    }
    if (/^##\s+/.test(line.trim())) {
      currentId = null;
    }

    const nextLine = lines[index + 1] ?? "";
    if (
      line.trim().startsWith("|") &&
      nextLine.trim().startsWith("|") &&
      isSeparatorRow(splitMarkdownRow(nextLine))
    ) {
      const headerCells = splitMarkdownRow(line);
      const refColumnIndexes = collectReferenceColumnIndexes(headerCells, referenceColumns);
      index += 2;
      for (; index < lines.length; index += 1) {
        const rowLine = lines[index] ?? "";
        if (!rowLine.trim().startsWith("|")) {
          index -= 1;
          break;
        }
        const cells = splitMarkdownRow(rowLine);
        if (isSeparatorRow(cells)) {
          continue;
        }
        const firstCell = normalizeId(cells[0]);
        if (!firstCell || !idPattern.test(firstCell)) {
          continue;
        }
        const refs = extractMatchesFromCells(cells, refColumnIndexes, refPattern);
        refsById.set(firstCell, refs);
        currentId = null;
      }
      continue;
    }

    if (line.trim().startsWith("|")) {
      const cells = splitMarkdownRow(line);
      if (isSeparatorRow(cells)) {
        continue;
      }
      const firstCell = normalizeId(cells[0]);
      if (firstCell && idPattern.test(firstCell)) {
        const refs = extractMatchesFromCells(cells, [], refPattern, referenceColumns.size > 0);
        refsById.set(firstCell, refs);
        currentId = null;
      }
      continue;
    }

    if (currentId) {
      const refs = extractMatches(line, refPattern);
      const current = ensureSet(refsById, currentId);
      for (const ref of refs) {
        current.add(ref);
      }
    }
  }

  return refsById;
}

function collectReferenceColumnIndexes(
  headerCells: string[],
  referenceColumns: Set<string>,
): number[] {
  if (referenceColumns.size === 0) {
    return [];
  }
  const indexes: number[] = [];
  for (let index = 0; index < headerCells.length; index += 1) {
    const normalized = normalizeColumnName(headerCells[index] ?? "");
    if (referenceColumns.has(normalized)) {
      indexes.push(index);
    }
  }
  return indexes;
}

function extractMatchesFromCells(
  cells: string[],
  indexes: number[],
  pattern: RegExp,
  strictColumnMode = false,
): Set<string> {
  if (indexes.length === 0) {
    if (strictColumnMode) {
      return new Set<string>();
    }
    return extractMatches(cells.join(" | "), pattern);
  }
  const refs = new Set<string>();
  for (const index of indexes) {
    const cell = cells[index];
    if (!cell) {
      continue;
    }
    const matched = extractMatches(cell, pattern);
    for (const ref of matched) {
      refs.add(ref);
    }
  }
  return refs;
}

function normalizeColumnName(value: string): string {
  return value.trim().toLowerCase();
}

function buildCoverageCounts(
  targets: Set<string>,
  refsBySource: Map<string, Set<string>>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of targets) {
    counts.set(id, 0);
  }

  for (const refs of refsBySource.values()) {
    for (const ref of refs) {
      if (!counts.has(ref)) {
        continue;
      }
      counts.set(ref, (counts.get(ref) ?? 0) + 1);
    }
  }

  return counts;
}

function findSourcesWithEmptyRefs(refsBySource: Map<string, Set<string>>): string[] {
  return Array.from(refsBySource.entries())
    .filter(([, refs]) => refs.size === 0)
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));
}

function findTcWithoutAnyRefs(
  tcToAcRefs: Map<string, Set<string>>,
  tcToExRefs: Map<string, Set<string>>,
): string[] {
  const ids = new Set<string>([...tcToAcRefs.keys(), ...tcToExRefs.keys()]);
  return Array.from(ids)
    .filter((id) => {
      const acCount = tcToAcRefs.get(id)?.size ?? 0;
      const exCount = tcToExRefs.get(id)?.size ?? 0;
      return acCount === 0 && exCount === 0;
    })
    .sort((left, right) => left.localeCompare(right));
}

function toCoverageRows(counts: Map<string, number>): CoverageRow[] {
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function findUncoveredIds(counts: Map<string, number>): string[] {
  return Array.from(counts.entries())
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort((left, right) => left.localeCompare(right));
}

function buildSignalRows(
  prefix: "AC" | "BR" | "EX",
  counts: Map<string, number>,
  target: "TC" | "EX",
): string[] {
  return Array.from(counts.entries())
    .filter(([, count]) => count <= 1)
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([id, count]) => `${prefix} signal: ${id} -> ${count} ${target}`);
}

async function writeCoverageReport(
  coverageRoot: string,
  specNumber: string,
  snapshot: CoverageSnapshot,
): Promise<void> {
  await mkdir(coverageRoot, { recursive: true });
  const reportPath = path.join(coverageRoot, `spec-${specNumber}.md`);

  const lines: string[] = [];
  lines.push(`# Spec Coverage (spec-${specNumber})`);
  lines.push("");

  lines.push("## AC to TC");
  lines.push("");
  lines.push("| AC-ID | TC count |");
  lines.push("| ----- | -------- |");
  for (const row of snapshot.ac) {
    lines.push(`| ${row.id} | ${row.count} |`);
  }
  lines.push("");

  lines.push("## BR to EX");
  lines.push("");
  lines.push("| BR-ID | EX count |");
  lines.push("| ----- | -------- |");
  for (const row of snapshot.br) {
    lines.push(`| ${row.id} | ${row.count} |`);
  }
  lines.push("");

  lines.push("## EX to TC");
  lines.push("");
  lines.push("| EX-ID | TC count |");
  lines.push("| ----- | -------- |");
  for (const row of snapshot.ex) {
    lines.push(`| ${row.id} | ${row.count} |`);
  }
  lines.push("");

  lines.push("## Signals");
  lines.push("");
  if (snapshot.signals.length === 0) {
    lines.push("- none");
  } else {
    for (const signal of snapshot.signals) {
      lines.push(`- ${signal}`);
    }
  }
  lines.push("");

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf-8");
}

function isV1421LayeredEntry(entry: SpecEntry): boolean {
  if (entry.layeredStyle === "v1421") {
    return true;
  }
  return path.extname(entry.examplesPath).toLowerCase() === ".md";
}

function extractHeadings(text: string): string[] {
  const headings: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const match = /^#{1,6}\s+(.+?)\s*$/.exec(line.trim());
    if (match?.[1]) {
      headings.push(match[1]);
    }
  }
  return headings;
}

function hasTicketLinkList(text: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let streak = 0;
  for (const line of lines) {
    if (/^\s*[-*]\s*https?:\/\/\S+\s*$/.test(line)) {
      streak += 1;
      if (streak >= 2) {
        return true;
      }
      continue;
    }
    streak = 0;
  }
  return false;
}

function extractMatches(text: string, pattern: RegExp): Set<string> {
  const matches = new Set<string>();
  const matcher = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );

  for (const match of text.matchAll(matcher)) {
    const value = normalizeId(match[0]);
    if (value) {
      matches.add(value);
    }
  }
  return matches;
}

function ensureSet(map: Map<string, Set<string>>, key: string): Set<string> {
  const current = map.get(key) ?? new Set<string>();
  map.set(key, current);
  return current;
}

function normalizeId(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.toUpperCase();
}

function isSeparatorRow(cells: string[]): boolean {
  if (cells.length === 0) {
    return false;
  }
  return cells
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)
    .every((cell) => /^:?-{3,}:?$/.test(cell));
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

async function validateUsToAcCoverage(
  userStoriesPath: string,
  acceptanceCriteriaPath: string,
): Promise<Issue[]> {
  if (!(await exists(userStoriesPath)) || !(await exists(acceptanceCriteriaPath))) {
    return [];
  }

  const usItems = collectMarkdownItems(await readSafe(userStoriesPath), "US");
  const acItems = collectMarkdownItems(await readSafe(acceptanceCriteriaPath), "AC");
  const usIds = usItems.map((item) => item.id).filter((id) => ID_PATTERNS.us.test(id));
  if (usIds.length === 0) {
    return [];
  }

  const linkedUsIds = new Set(
    acItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.us.test(parent)),
  );
  const uncoveredUsIds = usIds.filter((id) => !linkedUsIds.has(id));
  if (uncoveredUsIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-101",
      `US に対応する AC がありません: ${uncoveredUsIds.join(", ")}`,
      "error",
      acceptanceCriteriaPath,
      "layerCoverage.usToAc",
      uncoveredUsIds,
      "change",
      "03_Acceptance-criteria.md に該当 US を Parent とする AC を追加してください。",
    ),
  ];
}

async function validateAcToBrCoverage(
  acceptanceCriteriaPath: string,
  businessRulesPath: string,
): Promise<Issue[]> {
  if (!(await exists(acceptanceCriteriaPath)) || !(await exists(businessRulesPath))) {
    return [];
  }

  const acItems = collectMarkdownItems(await readSafe(acceptanceCriteriaPath), "AC");
  const brItems = collectMarkdownItems(await readSafe(businessRulesPath), "BR");
  const acIds = acItems.map((item) => item.id).filter((id) => ID_PATTERNS.ac.test(id));
  if (acIds.length === 0) {
    return [];
  }

  const linkedAcIds = new Set(
    brItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.ac.test(parent)),
  );
  const uncoveredAcIds = acIds.filter((id) => !linkedAcIds.has(id));
  if (uncoveredAcIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-102",
      `AC に対応する BR がありません: ${uncoveredAcIds.join(", ")}`,
      "error",
      businessRulesPath,
      "layerCoverage.acToBr",
      uncoveredAcIds,
      "change",
      "04_Business-rules.md に該当 AC を Parent とする BR を追加してください。",
    ),
  ];
}

async function validateBrToExCoverage(
  businessRulesPath: string,
  examplesPath: string,
): Promise<Issue[]> {
  if (!(await exists(businessRulesPath)) || !(await exists(examplesPath))) {
    return [];
  }

  const brItems = collectMarkdownItems(await readSafe(businessRulesPath), "BR");
  const exItems = collectScenarioItems(await readSafe(examplesPath));
  const brIds = brItems.map((item) => item.id).filter((id) => ID_PATTERNS.br.test(id));
  if (brIds.length === 0) {
    return [];
  }

  const linkedBrIds = new Set(
    exItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.br.test(parent)),
  );
  const uncoveredBrIds = brIds.filter((id) => !linkedBrIds.has(id));
  if (uncoveredBrIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-103",
      `BR に対応する EX がありません: ${uncoveredBrIds.join(", ")}`,
      "error",
      examplesPath,
      "layerCoverage.brToEx",
      uncoveredBrIds,
      "change",
      "05_Examples.feature の Scenario に `# Parent: BR-XXXX` を追加してください。",
    ),
  ];
}

async function validateExToTcCoverage(
  examplesPath: string,
  testCasesPath: string,
): Promise<Issue[]> {
  if (!(await exists(examplesPath)) || !(await exists(testCasesPath))) {
    return [];
  }

  const exItems = collectScenarioItems(await readSafe(examplesPath));
  const tcItems = collectMarkdownItems(await readSafe(testCasesPath), "TC");
  const exIds = exItems
    .map((item) => item.exId.replace(/^@/, ""))
    .filter((id) => ID_PATTERNS.ex.test(id));
  if (exIds.length === 0) {
    return [];
  }

  const linkedExIds = new Set(
    tcItems
      .map((item) => item.parent)
      .filter((parent): parent is string => Boolean(parent))
      .filter((parent) => ID_PATTERNS.ex.test(parent)),
  );
  const uncoveredExIds = exIds.filter((id) => !linkedExIds.has(id));
  if (uncoveredExIds.length === 0) {
    return [];
  }

  return [
    issue(
      "QFAI-COV-104",
      `EX に対応する TC がありません: ${uncoveredExIds.join(", ")}`,
      "error",
      testCasesPath,
      "layerCoverage.exToTc",
      uncoveredExIds,
      "change",
      "06_Test-cases.md に該当 EX を Parent とする TC を追加してください。",
    ),
  ];
}

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { buildContractIndex } from "../contractIndex.js";
import {
  collectMissingRequiredFiles,
  collectSpecEntries,
  type SpecEntry,
  type RequiredSpecPackFile,
} from "../specLayout.js";
import {
  buildLoosePrefixPattern,
  extractInvalidIds,
  isValidId,
  parseSemicolonIdList,
  type SpecPackIdKind,
} from "../specPackIds.js";
import {
  parseAcceptanceCriteriaIds,
  parseExamplesFeature,
  parseFirstMarkdownTable,
  parseIdsFromText,
  parseTestCaseIds,
  resolveAllowedLayerTagsFromPolicy,
} from "../specPackParsers.js";
import { LAYER_TAGS } from "../testStrategyTags.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const LEDGER_REQUIRED_COLUMNS = [
  "trace_id",
  "obj_id",
  "init_id",
  "cap_id",
  "flow_id",
  "us_id",
  "ac_id",
  "ex_ids",
  "tc_ids",
] as const;

const MAX_REF_SAMPLES = 8;

type LedgerRequiredColumn = (typeof LEDGER_REQUIRED_COLUMNS)[number];

type SpecDefinitions = {
  objIds: Set<string>;
  initIds: Set<string>;
  capIds: Set<string>;
  flowIds: Set<string>;
  usIds: Set<string>;
  acIds: Set<string>;
  exIds: Set<string>;
  tcIds: Set<string>;
};

type LayerPolicyResult = {
  tags: Set<string>;
  issues: Issue[];
};

export async function validateSpecPacks(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  if (entries.length === 0) {
    return [
      issue(
        "QFAI-SPACK-000",
        `Spec Pack が見つかりません。配置場所: ${config.paths.specsDir} / 期待: spec-0001/01_Spec.md ... 18_delta.md`,
        "info",
        specsRoot,
        "specPack.files",
      ),
    ];
  }

  const contractIndex = await buildContractIndex(root, config);
  const layerPolicy = await loadLayerPolicy(root, config);
  const issues: Issue[] = [...layerPolicy.issues];

  for (const entry of entries) {
    issues.push(...(await validateSpecPackEntry(entry, layerPolicy.tags)));
    issues.push(
      ...(await validateTraceabilityLedger(entry, contractIndex.ids)),
    );
  }

  return issues;
}

async function validateSpecPackEntry(
  entry: SpecEntry,
  allowedLayerTags: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  const missingFiles = await collectMissingRequiredFiles(entry);
  if (missingFiles.length > 0) {
    issues.push(
      issue(
        "QFAI-SPACK-001",
        `required file set (01..18) が不足しています: ${missingFiles.join(
          ", ",
        )}`,
        "error",
        entry.dir,
        "specPack.requiredFiles",
        missingFiles,
      ),
    );
  }

  const texts = await loadExistingRequiredTexts(entry, missingFiles);
  issues.push(...validateUpperToLowerReferenceRules(entry, texts));

  const acText = texts["07_Acceptance-criteria.md"] ?? "";
  const tcText = texts["10_Test-cases.md"] ?? "";
  const examplesText = texts["09_Examples.feature"] ?? "";

  const acIds = new Set(parseAcceptanceCriteriaIds(acText));
  const tcIds = new Set(parseTestCaseIds(tcText));
  const examples = parseExamplesFeature(examplesText, entry.examplesPath);

  if (acIds.size === 0) {
    issues.push(
      issue(
        "QFAI-AC-001",
        "07_Acceptance-criteria.md に AC ID が見つかりません。",
        "error",
        entry.acceptanceCriteriaPath,
        "specPack.ac.exists",
      ),
    );
  }

  if (tcIds.size === 0) {
    issues.push(
      issue(
        "QFAI-TC-001",
        "10_Test-cases.md に TC ID が見つかりません。",
        "error",
        entry.testCasesPath,
        "specPack.tc.exists",
      ),
    );
  }

  if (examples.errors.length > 0) {
    for (const message of examples.errors) {
      issues.push(
        issue(
          "QFAI-EX-001",
          message,
          "error",
          entry.examplesPath,
          "specPack.examples.parse",
        ),
      );
    }
  }

  const exIds = new Set<string>();
  for (const scenario of examples.scenarios) {
    if (scenario.exIds.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-002",
          `Scenario の EX タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.exTag",
          scenario.exIds,
        ),
      );
    } else {
      const exId = scenario.exIds[0];
      if (exId) {
        exIds.add(exId);
      }
    }

    if (scenario.acIds.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-003",
          `Scenario の AC タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.acTag",
          scenario.acIds,
        ),
      );
    } else {
      const acId = scenario.acIds[0];
      if (acId && !acIds.has(acId)) {
        issues.push(
          issue(
            "QFAI-EX-006",
            `Scenario が未定義の AC を参照しています: ${acId} (${scenario.name})`,
            "error",
            entry.examplesPath,
            "specPack.examples.acExists",
            [acId],
          ),
        );
      }
    }

    if (scenario.layerTags.length !== 1) {
      issues.push(
        issue(
          "QFAI-EX-004",
          `Scenario の @layer-* タグは1件必須です: ${scenario.name}`,
          "error",
          entry.examplesPath,
          "specPack.examples.layerTag",
          scenario.layerTags,
        ),
      );
    } else {
      const layerTag = scenario.layerTags[0]?.toLowerCase();
      if (layerTag && !allowedLayerTags.has(layerTag)) {
        issues.push(
          issue(
            "QFAI-EX-005",
            `Scenario の layer タグが policy 外です: ${layerTag} (${scenario.name})`,
            "error",
            entry.examplesPath,
            "specPack.examples.layerPolicy",
            [layerTag],
          ),
        );
      }
    }
  }

  if (exIds.size === 0) {
    issues.push(
      issue(
        "QFAI-EX-007",
        "09_Examples.feature に EX ID が見つかりません。",
        "error",
        entry.examplesPath,
        "specPack.examples.exists",
      ),
    );
  }

  if (acText.length > 0) {
    const invalidAcIds = extractInvalidIds(acText, ["AC"]);
    if (invalidAcIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-010",
          `AC ID 形式が不正です: ${invalidAcIds.join(", ")}`,
          "error",
          entry.acceptanceCriteriaPath,
          "id.format",
          invalidAcIds,
        ),
      );
    }
  }

  if (tcText.length > 0) {
    const invalidTcIds = extractInvalidIds(tcText, ["TC"]);
    if (invalidTcIds.length > 0) {
      issues.push(
        issue(
          "QFAI-ID-010",
          `TC ID 形式が不正です: ${invalidTcIds.join(", ")}`,
          "error",
          entry.testCasesPath,
          "id.format",
          invalidTcIds,
        ),
      );
    }
  }

  const openQuestionsText = texts["15_Open-questions.md"];
  if (openQuestionsText && hasNonEmptyBody(openQuestionsText)) {
    issues.push(
      issue(
        "QFAI-SPACK-101",
        "15_Open-questions.md が空ではありません（release gate 対象外の warning）。",
        "warning",
        entry.openQuestionsPath,
        "specPack.openQuestions",
      ),
    );
  }

  const deltaText = texts["18_delta.md"] ?? "";
  if (
    deltaText.length > 0 &&
    (!/DO\s+NOT/i.test(deltaText) || !/Temptation/i.test(deltaText))
  ) {
    issues.push(
      issue(
        "QFAI-SPACK-102",
        "18_delta.md に DO NOT または Temptation が不足しています（warning）。",
        "warning",
        entry.deltaPath,
        "specPack.deltaHints",
      ),
    );
  }

  return issues;
}

async function validateTraceabilityLedger(
  entry: SpecEntry,
  contractIds: Set<string>,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  let ledgerText: string;
  try {
    ledgerText = await readFile(entry.traceabilityLedgerPath, "utf-8");
  } catch {
    return issues;
  }

  const table = parseFirstMarkdownTable(ledgerText);
  if (!table) {
    return [
      issue(
        "QFAI-LEDGER-001",
        "16_Traceability-ledger.md のテーブルが見つかりません。",
        "error",
        entry.traceabilityLedgerPath,
        "ledger.table",
      ),
    ];
  }

  const columnToIndex = new Map<string, number>();
  table.headers.forEach((column, index) => {
    columnToIndex.set(normalizeHeader(column), index);
  });

  const missingColumns = LEDGER_REQUIRED_COLUMNS.filter(
    (column) => !columnToIndex.has(column),
  );
  if (missingColumns.length > 0) {
    issues.push(
      issue(
        "QFAI-LEDGER-002",
        `Ledger の必須列が不足しています: ${missingColumns.join(", ")}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.columns",
        missingColumns,
      ),
    );
    return issues;
  }

  const definitions = await collectDefinitions(entry);
  if (definitions.acIds.size === 0 || definitions.tcIds.size === 0) {
    return issues;
  }

  const seenAcIds = new Set<string>();
  const seenTcIds = new Set<string>();

  for (const [rowIndex, row] of table.rows.entries()) {
    const line = rowIndex + 1;
    const traceId = getLedgerCell(row, columnToIndex, "trace_id");
    const objId = getLedgerCell(row, columnToIndex, "obj_id");
    const initId = getLedgerCell(row, columnToIndex, "init_id");
    const capId = getLedgerCell(row, columnToIndex, "cap_id");
    const flowId = getLedgerCell(row, columnToIndex, "flow_id");
    const usId = getLedgerCell(row, columnToIndex, "us_id");
    const acId = getLedgerCell(row, columnToIndex, "ac_id");
    const exIds = parseSemicolonIdList(
      getLedgerCell(row, columnToIndex, "ex_ids"),
    );
    const tcIds = parseSemicolonIdList(
      getLedgerCell(row, columnToIndex, "tc_ids"),
    );
    const conIds = parseSemicolonIdList(
      getOptionalLedgerCell(row, columnToIndex, "con_ids"),
    );

    const requiredCells: Array<{ name: string; value: string }> = [
      { name: "trace_id", value: traceId },
      { name: "obj_id", value: objId },
      { name: "init_id", value: initId },
      { name: "cap_id", value: capId },
      { name: "flow_id", value: flowId },
      { name: "us_id", value: usId },
      { name: "ac_id", value: acId },
    ];

    const emptyCells = requiredCells
      .filter((cell) => cell.value.length === 0)
      .map((cell) => cell.name);
    if (emptyCells.length > 0) {
      issues.push(
        issue(
          "QFAI-LEDGER-003",
          `Ledger 行 ${line} の必須セルが空です: ${emptyCells.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.requiredCells",
          emptyCells,
        ),
      );
      continue;
    }

    if (exIds.length === 0 || tcIds.length === 0) {
      const emptyMulti: string[] = [];
      if (exIds.length === 0) {
        emptyMulti.push("ex_ids");
      }
      if (tcIds.length === 0) {
        emptyMulti.push("tc_ids");
      }
      issues.push(
        issue(
          "QFAI-LEDGER-004",
          `Ledger 行 ${line} の多値列が空です: ${emptyMulti.join(", ")}`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.cardinality",
          emptyMulti,
        ),
      );
      continue;
    }

    validateLedgerId(line, "trace_id", traceId, "TRACE", issues, entry);
    validateLedgerId(line, "obj_id", objId, "OBJ", issues, entry);
    validateLedgerId(line, "init_id", initId, "INIT", issues, entry);
    validateLedgerId(line, "cap_id", capId, "CAP", issues, entry);
    validateLedgerId(line, "flow_id", flowId, "FLOW", issues, entry);
    validateLedgerId(line, "us_id", usId, "US", issues, entry);
    validateLedgerId(line, "ac_id", acId, "AC", issues, entry);
    exIds.forEach((id) =>
      validateLedgerId(line, "ex_ids", id, "EX", issues, entry),
    );
    tcIds.forEach((id) =>
      validateLedgerId(line, "tc_ids", id, "TC", issues, entry),
    );
    conIds.forEach((id) =>
      validateLedgerId(line, "con_ids", id, "CON", issues, entry),
    );

    if (!definitions.objIds.has(objId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の OBJ を参照しています: ${objId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.objExists",
          [objId],
        ),
      );
    }
    if (!definitions.initIds.has(initId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の INIT を参照しています: ${initId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.initExists",
          [initId],
        ),
      );
    }
    if (!definitions.capIds.has(capId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の CAP を参照しています: ${capId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.capExists",
          [capId],
        ),
      );
    }
    if (!definitions.flowIds.has(flowId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の FLOW を参照しています: ${flowId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.flowExists",
          [flowId],
        ),
      );
    }
    if (!definitions.usIds.has(usId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の US を参照しています: ${usId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.usExists",
          [usId],
        ),
      );
    }
    if (!definitions.acIds.has(acId)) {
      issues.push(
        issue(
          "QFAI-LEDGER-006",
          `Ledger が未定義の AC を参照しています: ${acId} (row=${line})`,
          "error",
          entry.traceabilityLedgerPath,
          "ledger.acExists",
          [acId],
        ),
      );
    }
    for (const exId of exIds) {
      if (!definitions.exIds.has(exId)) {
        issues.push(
          issue(
            "QFAI-LEDGER-007",
            `Ledger が未定義の EX を参照しています: ${exId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.exExists",
            [exId],
          ),
        );
      }
    }
    for (const tcId of tcIds) {
      if (!definitions.tcIds.has(tcId)) {
        issues.push(
          issue(
            "QFAI-LEDGER-008",
            `Ledger が未定義の TC を参照しています: ${tcId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.tcExists",
            [tcId],
          ),
        );
      }
      seenTcIds.add(tcId);
    }
    for (const conId of conIds) {
      if (!contractIds.has(conId)) {
        issues.push(
          issue(
            "QFAI-LEDGER-009",
            `Ledger が未定義の CON を参照しています: ${conId} (row=${line})`,
            "error",
            entry.traceabilityLedgerPath,
            "ledger.conExists",
            [conId],
          ),
        );
      }
    }
    seenAcIds.add(acId);
  }

  const uncoveredAcIds = Array.from(definitions.acIds).filter(
    (id) => !seenAcIds.has(id),
  );
  if (uncoveredAcIds.length > 0) {
    issues.push(
      issue(
        "QFAI-LEDGER-010",
        `AC 未検証（EX/TC未接続）が存在します: ${uncoveredAcIds.join(", ")}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.acCoverage",
        uncoveredAcIds,
      ),
    );
  }

  const orphanTcIds = Array.from(definitions.tcIds).filter(
    (id) => !seenTcIds.has(id),
  );
  if (orphanTcIds.length > 0) {
    issues.push(
      issue(
        "QFAI-LEDGER-011",
        `孤児 TC が存在します（OBJ まで遡れない）: ${orphanTcIds.join(", ")}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.tcCoverage",
        orphanTcIds,
      ),
    );
  }

  return issues;
}

async function collectDefinitions(entry: SpecEntry): Promise<SpecDefinitions> {
  const [
    objectiveText,
    initiativeText,
    capabilityText,
    flowText,
    userStoriesText,
    acText,
    examplesText,
    tcText,
  ] = await Promise.all([
    readSafe(entry.objectivePath),
    readSafe(entry.initiativePath),
    readSafe(entry.capabilityPath),
    readSafe(entry.flowPath),
    readSafe(entry.userStoriesPath),
    readSafe(entry.acceptanceCriteriaPath),
    readSafe(entry.examplesPath),
    readSafe(entry.testCasesPath),
  ]);

  const examples = parseExamplesFeature(examplesText, entry.examplesPath);
  const exIds = new Set<string>();
  for (const scenario of examples.scenarios) {
    for (const exId of scenario.exIds) {
      exIds.add(exId);
    }
  }

  return {
    objIds: new Set(parseIdsFromText(objectiveText, "OBJ")),
    initIds: new Set(parseIdsFromText(initiativeText, "INIT")),
    capIds: new Set(parseIdsFromText(capabilityText, "CAP")),
    flowIds: new Set(parseIdsFromText(flowText, "FLOW")),
    usIds: new Set(parseIdsFromText(userStoriesText, "US")),
    acIds: new Set(parseAcceptanceCriteriaIds(acText)),
    exIds,
    tcIds: new Set(parseTestCaseIds(tcText)),
  };
}

function validateUpperToLowerReferenceRules(
  entry: SpecEntry,
  texts: Partial<Record<RequiredSpecPackFile, string>>,
): Issue[] {
  const rules: Array<{
    fileName: RequiredSpecPackFile;
    forbidden: SpecPackIdKind[];
  }> = [
    {
      fileName: "02_Objective.md",
      forbidden: ["INIT", "CAP", "FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "03_Initiative.md",
      forbidden: ["CAP", "FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "04_Capability.md",
      forbidden: ["FLOW", "US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "05_Business-flow.feature",
      forbidden: ["US", "AC", "BR", "EX", "TC"],
    },
    {
      fileName: "06_User-stories.md",
      forbidden: ["AC", "BR", "EX", "TC"],
    },
    {
      fileName: "07_Acceptance-criteria.md",
      forbidden: ["BR", "EX", "TC"],
    },
    {
      fileName: "08_Business-rules.md",
      forbidden: ["EX", "TC"],
    },
  ];

  const issues: Issue[] = [];
  for (const rule of rules) {
    const text = texts[rule.fileName];
    if (!text) {
      continue;
    }
    const pattern = buildLoosePrefixPattern(rule.forbidden);
    const matches = text.match(pattern) ?? [];
    if (matches.length === 0) {
      continue;
    }
    const unique = Array.from(new Set(matches));
    const samples = unique.slice(0, MAX_REF_SAMPLES);
    const hidden = unique.length - samples.length;
    const suffix = hidden > 0 ? ` (+${hidden}件)` : "";
    issues.push(
      issue(
        "QFAI-SPACK-010",
        `上位→下位参照禁止違反: ${rule.fileName} に禁止IDが含まれています (${samples.join(
          ", ",
        )}${suffix})`,
        "error",
        entry.requiredFiles[rule.fileName],
        "specPack.noUpstreamToDownstreamRef",
        samples,
        "compatibility",
        "下位との接続は 16_Traceability-ledger.md に記述してください。",
      ),
    );
  }

  return issues;
}

async function loadExistingRequiredTexts(
  entry: SpecEntry,
  missingFiles: RequiredSpecPackFile[],
): Promise<Partial<Record<RequiredSpecPackFile, string>>> {
  const missing = new Set(missingFiles);
  const texts: Partial<Record<RequiredSpecPackFile, string>> = {};
  for (const fileName of Object.keys(
    entry.requiredFiles,
  ) as RequiredSpecPackFile[]) {
    if (missing.has(fileName)) {
      continue;
    }
    const fullPath = entry.requiredFiles[fileName];
    texts[fileName] = await readSafe(fullPath);
  }
  return texts;
}

async function loadLayerPolicy(
  root: string,
  config: QfaiConfig,
): Promise<LayerPolicyResult> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantRoot = path.dirname(skillsDir);
  const policyPath = path.join(assistantRoot, "steering", "test-layers.md");
  try {
    const policyText = await readFile(policyPath, "utf-8");
    return {
      tags: resolveAllowedLayerTagsFromPolicy(policyText),
      issues: [],
    };
  } catch {
    return {
      tags: new Set(Array.from(LAYER_TAGS)),
      issues: [
        issue(
          "QFAI-SPACK-090",
          "test-layer policy が見つからないため既定の layer タグ集合を使用します。",
          "warning",
          policyPath,
          "specPack.layerPolicy",
        ),
      ],
    };
  }
}

function validateLedgerId(
  row: number,
  column: string,
  value: string,
  kind: SpecPackIdKind,
  issues: Issue[],
  entry: SpecEntry,
): void {
  if (value.length === 0) {
    return;
  }
  if (!isValidId(value, kind)) {
    issues.push(
      issue(
        "QFAI-LEDGER-005",
        `Ledger 行 ${row} の ${column} の ID 形式が不正です: ${value}`,
        "error",
        entry.traceabilityLedgerPath,
        "ledger.idFormat",
        [value],
      ),
    );
  }
}

function getLedgerCell(
  row: string[],
  columnToIndex: Map<string, number>,
  column: LedgerRequiredColumn,
): string {
  const index = columnToIndex.get(column);
  if (index === undefined) {
    return "";
  }
  return (row[index] ?? "").trim();
}

function getOptionalLedgerCell(
  row: string[],
  columnToIndex: Map<string, number>,
  column: string,
): string {
  const index = columnToIndex.get(column);
  if (index === undefined) {
    return "";
  }
  return (row[index] ?? "").trim();
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function hasNonEmptyBody(text: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.some((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return false;
    }
    if (trimmed.startsWith("#")) {
      return false;
    }
    if (/^\|[-:\s|]+\|?$/.test(trimmed)) {
      return false;
    }
    return true;
  });
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

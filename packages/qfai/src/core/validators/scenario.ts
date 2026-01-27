import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { extractInvalidIds } from "../ids.js";
import { collectSpecEntries } from "../specLayout.js";
import { parseScenarioDocument } from "../scenarioModel.js";
import type { Issue, IssueCategory, IssueSeverity } from "../types.js";

const GIVEN_PATTERN = /\bGiven\b/;
const WHEN_PATTERN = /\bWhen\b/;
const THEN_PATTERN = /\bThen\b/;
const SC_TAG_RE = /^SC-\d{4}-\d{4}$/;
const SPEC_TAG_RE = /^SPEC-\d{4}$/;
const LAYER_TAGS = new Set([
  "layer-unit",
  "layer-component",
  "layer-integration",
  "layer-api",
  "layer-e2e",
]);
const SIZE_TAGS = new Set(["size-s", "size-m", "size-l"]);
const STRATEGY_SAMPLE_LIMIT = 20;

export async function validateScenarios(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);

  if (entries.length === 0) {
    const expected = "spec-0001/scenario.feature";
    return [
      issue(
        "QFAI-SC-000",
        `Scenario ファイルが見つかりません。配置場所: ${config.paths.specsDir} / 期待パターン: ${expected}`,
        "info",
        specsRoot,
        "scenario.files",
      ),
    ];
  }

  const issues: Issue[] = [];
  const strategyCandidates: StrategyCandidate[] = [];
  for (const entry of entries) {
    const legacyScenarioPath = path.join(entry.dir, "scenario.md");
    if (await fileExists(legacyScenarioPath)) {
      issues.push(
        issue(
          "QFAI-SC-004",
          "scenario.md は非対応です。scenario.feature へ移行してください。",
          "error",
          legacyScenarioPath,
          "scenario.legacy",
        ),
      );
    }

    let text: string;
    try {
      text = await readFile(entry.scenarioPath, "utf-8");
    } catch (error) {
      if (isMissingFileError(error)) {
        issues.push(
          issue(
            "QFAI-SC-001",
            "scenario.feature が見つかりません。",
            "error",
            entry.scenarioPath,
            "scenario.exists",
          ),
        );
        continue;
      }
      throw error;
    }
    issues.push(...validateScenarioContent(text, entry.scenarioPath));
    strategyCandidates.push(
      ...collectStrategyCandidates(text, entry.scenarioPath),
    );
  }

  issues.push(...buildStrategyIssues(strategyCandidates));
  return issues;
}

export function validateScenarioContent(text: string, file: string): Issue[] {
  const issues: Issue[] = [];

  const invalidIds = extractInvalidIds(text, [
    "SPEC",
    "BR",
    "SC",
    "AC",
    "CASE",
    "UI",
    "API",
    "DB",
    "THEMA",
    "ADR",
  ]);
  if (invalidIds.length > 0) {
    issues.push(
      issue(
        "QFAI-ID-002",
        `ID フォーマットが不正です: ${invalidIds.join(", ")}`,
        "error",
        file,
        "id.format",
        invalidIds,
      ),
    );
  }

  const { document, errors } = parseScenarioDocument(text, file);
  if (!document || errors.length > 0) {
    issues.push(
      issue(
        "QFAI-SC-010",
        `Gherkin の解析に失敗しました: ${errors.join(", ") || "unknown"}`,
        "error",
        file,
        "scenario.parse",
      ),
    );
    return issues;
  }

  const featureSpecTags = document.featureTags.filter((tag) =>
    SPEC_TAG_RE.test(tag),
  );
  if (featureSpecTags.length > 1) {
    issues.push(
      issue(
        "QFAI-SC-009",
        `Feature の SPEC タグが複数あります: ${featureSpecTags.join(", ")}`,
        "error",
        file,
        "scenario.featureSpec",
        featureSpecTags,
      ),
    );
  }

  const missingStructure: string[] = [];
  if (!document.featureName) missingStructure.push("Feature");
  if (document.scenarios.length === 0) missingStructure.push("Scenario");
  if (missingStructure.length > 0) {
    issues.push(
      issue(
        "QFAI-SC-006",
        `Scenario ファイルに必要な構造がありません: ${missingStructure.join(
          ", ",
        )}`,
        "error",
        file,
        "scenario.structure",
      ),
    );
  }

  for (const scenario of document.scenarios) {
    if (scenario.tags.length === 0) {
      issues.push(
        issue(
          "QFAI-SC-007",
          `Scenario タグが見つかりません: ${scenario.name}`,
          "error",
          file,
          "scenario.tags",
        ),
      );
      continue;
    }

    const missingTags: string[] = [];
    const scTags = scenario.tags.filter((tag) => SC_TAG_RE.test(tag));
    if (scTags.length === 0) {
      missingTags.push("SC(0件)");
    } else if (scTags.length > 1) {
      missingTags.push(`SC(${scTags.length}件/1件必須)`);
    }
    if (missingTags.length > 0) {
      issues.push(
        issue(
          "QFAI-SC-008",
          `Scenario タグに不足があります: ${missingTags.join(", ")} (${
            scenario.name
          })`,
          "error",
          file,
          "scenario.tagIds",
        ),
      );
    }
    const strategy = evaluateStrategyTags(scenario.tags);
    if (strategy.unknownLayerTags.length > 0) {
      issues.push(
        issue(
          "QFAI-TS-001",
          `未知の layer タグがあります: ${strategy.unknownLayerTags.join(
            ", ",
          )} (${scenario.name})`,
          "warning",
          file,
          "scenario.layerUnknown",
          strategy.unknownLayerTags,
        ),
      );
    }
    if (strategy.multipleLayerTags) {
      issues.push(
        issue(
          "QFAI-TS-002",
          `layer タグが複数あります: ${strategy.layerTags.join(", ")} (${
            scenario.name
          })`,
          "warning",
          file,
          "scenario.layerMultiple",
          strategy.layerTags,
        ),
      );
    }
    if (strategy.unknownSizeTags.length > 0) {
      issues.push(
        issue(
          "QFAI-TS-004",
          `未知の size タグがあります: ${strategy.unknownSizeTags.join(
            ", ",
          )} (${scenario.name})`,
          "warning",
          file,
          "scenario.sizeUnknown",
          strategy.unknownSizeTags,
        ),
      );
    }
    if (strategy.multipleSizeTags) {
      issues.push(
        issue(
          "QFAI-TS-005",
          `size タグが複数あります: ${strategy.sizeTags.join(", ")} (${
            scenario.name
          })`,
          "warning",
          file,
          "scenario.sizeMultiple",
          strategy.sizeTags,
        ),
      );
    }
  }

  for (const scenario of document.scenarios) {
    const missingSteps: string[] = [];
    const keywords = scenario.steps.map((step) => step.keyword.trim());
    if (!keywords.some((keyword) => GIVEN_PATTERN.test(keyword))) {
      missingSteps.push("Given");
    }
    if (!keywords.some((keyword) => WHEN_PATTERN.test(keyword))) {
      missingSteps.push("When");
    }
    if (!keywords.some((keyword) => THEN_PATTERN.test(keyword))) {
      missingSteps.push("Then");
    }
    if (missingSteps.length > 0) {
      issues.push(
        issue(
          "QFAI-SC-005",
          `Given/When/Then が不足しています: ${missingSteps.join(", ")} (${
            scenario.name
          })`,
          "warning",
          file,
          "scenario.steps",
        ),
      );
    }
  }

  return issues;
}

function evaluateStrategyTags(tags: string[]): {
  layerTags: string[];
  sizeTags: string[];
  unknownLayerTags: string[];
  unknownSizeTags: string[];
  multipleLayerTags: boolean;
  multipleSizeTags: boolean;
  hasAnyTag: boolean;
  isAdopted: boolean;
} {
  const layerTags = tags.filter((tag) => tag.startsWith("layer-"));
  const sizeTags = tags.filter((tag) => tag.startsWith("size-"));
  const unknownLayerTags = layerTags.filter((tag) => !LAYER_TAGS.has(tag));
  const unknownSizeTags = sizeTags.filter((tag) => !SIZE_TAGS.has(tag));
  const validLayerTags = layerTags.filter((tag) => LAYER_TAGS.has(tag));
  const validSizeTags = sizeTags.filter((tag) => SIZE_TAGS.has(tag));
  const multipleLayerTags = layerTags.length > 1;
  const multipleSizeTags = sizeTags.length > 1;
  const hasAnyTag = layerTags.length > 0 || sizeTags.length > 0;
  const isAdopted =
    validLayerTags.length === 1 &&
    validSizeTags.length === 1 &&
    layerTags.length === 1 &&
    sizeTags.length === 1 &&
    unknownLayerTags.length === 0 &&
    unknownSizeTags.length === 0;

  return {
    layerTags,
    sizeTags,
    unknownLayerTags,
    unknownSizeTags,
    multipleLayerTags,
    multipleSizeTags,
    hasAnyTag,
    isAdopted,
  };
}

function buildScenarioLabel(
  file: string,
  tags: string[],
  name: string,
): string {
  const scTag = tags.find((tag) => SC_TAG_RE.test(tag));
  if (scTag) {
    return scTag;
  }
  const scenarioName = name.trim().length > 0 ? name : "(unknown)";
  return `${file}:${scenarioName}`;
}

type StrategyCandidate = {
  label: string;
  hasAnyTag: boolean;
  adopted: boolean;
  missing: boolean;
};

function collectStrategyCandidates(
  text: string,
  file: string,
): StrategyCandidate[] {
  const { document, errors } = parseScenarioDocument(text, file);
  if (!document || errors.length > 0) {
    return [];
  }

  return document.scenarios.map((scenario) => {
    const strategy = evaluateStrategyTags(scenario.tags);
    return {
      label: buildScenarioLabel(file, scenario.tags, scenario.name),
      hasAnyTag: strategy.hasAnyTag,
      adopted: strategy.isAdopted,
      missing: !strategy.isAdopted,
    };
  });
}

function buildStrategyIssues(candidates: StrategyCandidate[]): Issue[] {
  const totalScenarios = candidates.length;
  if (totalScenarios === 0) {
    return [];
  }

  const adoptedCount = candidates.filter((item) => item.adopted).length;
  const missingItems = candidates.filter((item) => item.missing);
  const hasAnyStrategyTag = candidates.some((item) => item.hasAnyTag);
  const missingSamples = missingItems
    .map((item) => item.label)
    .slice(0, STRATEGY_SAMPLE_LIMIT);
  const adoptionRate =
    totalScenarios === 0
      ? "0%"
      : `${Math.round((adoptedCount / totalScenarios) * 100)}%`;

  if (!hasAnyStrategyTag) {
    return [
      issue(
        "QFAI-TS-100",
        "全ての Scenario に layer/size タグがありません。導入は任意です（opt-in）。",
        "info",
        undefined,
        "scenario.testStrategyAllMissing",
      ),
    ];
  }

  if (adoptedCount < totalScenarios) {
    return [
      issue(
        "QFAI-TS-101",
        `layer/size タグの部分導入です: missing=${missingItems.length}, total=${totalScenarios}, adopted=${adoptedCount}, adoptionRate=${adoptionRate}, samples=${missingSamples.join(
          ", ",
        )}`,
        "warning",
        undefined,
        "scenario.testStrategyPartialAdoption",
        missingSamples,
      ),
    ];
  }

  return [];
}

function issue(
  code: string,
  message: string,
  severity: IssueSeverity,
  file?: string,
  rule?: string,
  refs?: string[],
  category: IssueCategory = "compatibility",
  suggested_action?: string,
): Issue {
  const issue: Issue = {
    code,
    severity,
    category,
    message,
  };
  if (suggested_action) {
    issue.suggested_action = suggested_action;
  }
  if (file) {
    issue.file = file;
  }
  if (rule) {
    issue.rule = rule;
  }
  if (refs && refs.length > 0) {
    issue.refs = refs;
  }
  return issue;
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  return (error as { code?: string }).code === "ENOENT";
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

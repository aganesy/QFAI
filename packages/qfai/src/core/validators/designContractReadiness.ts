import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const REQUIRED_DESIGN_FILES = [
  "exploration-brief.yaml",
  "evaluation-rubric.yaml",
  "evaluator-calibration.yaml",
  "selected-direction.yaml",
  "design-system.yaml",
  "prototype-handoff.yaml",
] as const;
const REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS = [
  "color",
  "typography",
  "spacing",
  "border_radius",
  "shadow",
  "dos_and_donts",
  "motion_rules",
] as const;
const PROVISIONAL_SELECTION_STATUS_RE = /^provisional(?:$|[_-])/i;
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

type YamlReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; value: Record<string, unknown> };

export async function validateDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const uiPattern = path.posix.join(
    path.join(root, config.paths.contractsDir, "ui").replace(/\\/g, "/"),
    "**/*.yaml",
  );
  const uiContracts = await fg(uiPattern, { absolute: true });
  if (uiContracts.length === 0) {
    return [];
  }

  const designDir = path.join(root, config.paths.contractsDir, "design");
  const designDirRelative = toPosixRelative(root, designDir);
  const issues: Issue[] = [];

  for (const fileName of REQUIRED_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
    } catch {
      issues.push(
        issue(
          "QFAI-DCON-001",
          `Missing downstream design contract: ${fileName}.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.requiredFile",
          undefined,
          "canonical",
          `UI-bearing downstream execution requires exploration-brief.yaml, evaluation-rubric.yaml, evaluator-calibration.yaml, selected-direction.yaml, design-system.yaml, and prototype-handoff.yaml under \`${designDirRelative}/\`.`,
        ),
      );
    }
  }

  issues.push(...(await validateExplorationBrief(root, config)));
  issues.push(...(await validateEvaluationRubric(root, config)));
  issues.push(...(await validateEvaluatorCalibration(root, config)));
  issues.push(...(await validateSelectedDirection(root, config)));
  issues.push(...(await validateDesignSystem(root, config)));
  issues.push(...(await validatePrototypeHandoff(root, config)));
  return issues;
}

async function validateExplorationBrief(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "exploration-brief.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-006",
            "exploration-brief.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.explorationBriefDocument",
          ),
        ]
      : [];
  }

  const requiredKeys = [
    "product_intent",
    "target_users",
    "must_preserve_interactions",
    "brand_signals",
    "differentiation_targets",
  ];
  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    requiredKeys,
    "QFAI-DCON-002",
    "exploration-brief.yaml is missing required field",
    "designContractReadiness.explorationBriefField",
  );
}

async function validateEvaluationRubric(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "evaluation-rubric.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-007",
            "evaluation-rubric.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.evaluationRubricDocument",
          ),
        ]
      : [];
  }

  const requiredArrays = ["axes", "hard_floors", "weighted_axes"];
  const issues: Issue[] = [];
  for (const key of requiredArrays) {
    if (!Array.isArray(parsed.value[key])) {
      issues.push(
        issue(
          "QFAI-DCON-003",
          `evaluation-rubric.yaml is missing array '${key}'.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.evaluationRubricArray",
        ),
      );
    }
  }
  return issues;
}

async function validateEvaluatorCalibration(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(
    root,
    config.paths.contractsDir,
    "design",
    "evaluator-calibration.yaml",
  );
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-011",
            "evaluator-calibration.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.evaluatorCalibrationDocument",
          ),
        ]
      : [];
  }

  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    [
      "good_critique_examples",
      "too_lenient_examples",
      "blandness_fail_examples",
      "originality_fail_examples",
    ],
    "QFAI-DCON-010",
    "evaluator-calibration.yaml is missing required field",
    "designContractReadiness.evaluatorCalibrationField",
  );
}

async function validateSelectedDirection(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "selected-direction.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-008",
            "selected-direction.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.selectedDirectionDocument",
          ),
        ]
      : [];
  }

  const issues = validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    ["carry_forward_rules"],
    "QFAI-DCON-004",
    "selected-direction.yaml is missing required field",
    "designContractReadiness.selectedDirectionField",
  );

  const winningRationale = parsed.value.winning_rationale;
  const selectionRationale = parsed.value.selection_rationale;
  if (
    !hasMeaningfulContractContent(winningRationale) &&
    !hasMeaningfulContractContent(selectionRationale)
  ) {
    const selectionStatus = getSelectionStatus(parsed.value);
    issues.push(
      issue(
        "QFAI-DCON-004",
        isProvisionalSelectionStatus(selectionStatus)
          ? "selected-direction.yaml is missing required provisional rationale ('selection_rationale' or 'winning_rationale')."
          : "selected-direction.yaml is missing required field 'winning_rationale' (legacy alias: 'selection_rationale').",
        "error",
        toPosixRelative(root, filePath),
        "designContractReadiness.selectedDirectionField",
      ),
    );
  }

  const chosenDirectionId = parsed.value.chosen_direction_id;
  const legacyDirectionId = parsed.value.direction_id;
  if (!isNonEmptyStringValue(chosenDirectionId) && !isNonEmptyStringValue(legacyDirectionId)) {
    issues.push(
      issue(
        "QFAI-DCON-004",
        "selected-direction.yaml is missing required field 'chosen_direction_id'.",
        "error",
        toPosixRelative(root, filePath),
        "designContractReadiness.selectedDirectionField",
      ),
    );
  }

  return issues;
}

async function validateDesignSystem(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "design-system.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-009",
            "design-system.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.designSystemDocument",
          ),
        ]
      : [];
  }

  const checklist = parsed.value.checklist;
  const issues: Issue[] = [];

  for (const key of REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS) {
    if (
      !(checklist && typeof checklist === "object" && key in (checklist as Record<string, unknown>))
    ) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `design-system.yaml is missing checklist key '${key}'.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.designSystemChecklist",
        ),
      );
    }
  }

  const hasComponentToneChecklistKey =
    checklist &&
    typeof checklist === "object" &&
    "component_tone" in (checklist as Record<string, unknown>);
  const hasComponentGuidanceAlias =
    hasMeaningfulContractContent(parsed.value.component_tone) ||
    hasMeaningfulContractContent(parsed.value.component_semantics) ||
    hasMeaningfulContractContent(parsed.value.content_tone);
  if (!hasComponentToneChecklistKey && !hasComponentGuidanceAlias) {
    issues.push(
      issue(
        "QFAI-DCON-005",
        "design-system.yaml is missing component guidance (expected checklist.component_tone or a richer component_tone/component_semantics/content_tone block).",
        "error",
        toPosixRelative(root, filePath),
        "designContractReadiness.designSystemChecklist",
      ),
    );
  }

  return issues;
}

async function validatePrototypeHandoff(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "prototype-handoff.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-012",
            "prototype-handoff.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.prototypeHandoffDocument",
          ),
        ]
      : [];
  }

  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    ["sourcePrototypeRefs", "surfaceProfiles", "screens", "visualDna", "implementationHandoff"],
    "QFAI-DCON-013",
    "prototype-handoff.yaml is missing required field",
    "designContractReadiness.prototypeHandoffField",
  );
}

function validateRequiredStringArrayKeys(
  filePath: string,
  root: string,
  record: Record<string, unknown>,
  requiredKeys: string[],
  code: string,
  messagePrefix: string,
  rule: string,
): Issue[] {
  const issues: Issue[] = [];
  for (const key of requiredKeys) {
    const value = record[key];
    if (!hasMeaningfulContractContent(value)) {
      issues.push(
        issue(code, `${messagePrefix} '${key}'.`, "error", toPosixRelative(root, filePath), rule),
      );
    }
  }
  return issues;
}

function isNonEmptyStringValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasMeaningfulContractContent(value: unknown, depth = 0): boolean {
  if (depth > 8) {
    return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 && !PLACEHOLDER_RE.test(normalized);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasMeaningfulContractContent(entry, depth + 1));
  }
  return false;
}

function getSelectionStatus(record: Record<string, unknown>): string | null {
  const value = record.selection_status;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isProvisionalSelectionStatus(value: string | null): boolean {
  return value !== null && PROVISIONAL_SELECTION_STATUS_RE.test(value);
}

async function readYaml(filePath: string): Promise<YamlReadResult> {
  try {
    const parsed: unknown = parseYaml(await readFile(filePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { kind: "invalid" };
    }
    return { kind: "ok", value: parsed as Record<string, unknown> };
  } catch {
    try {
      await readFile(filePath, "utf-8");
      return { kind: "invalid" };
    } catch {
      return { kind: "missing" };
    }
  }
}

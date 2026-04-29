import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const REQUIRED_SDD_DESIGN_FILES = [
  "exploration-brief.yaml",
  "reference-pool.yaml",
  "brand-design.yaml",
  "evaluation-rubric.yaml",
  "evaluator-calibration.yaml",
  "absorption-policy.yaml",
] as const;
const REQUIRED_PROTOTYPING_DESIGN_FILES = [
  "selected-direction.yaml",
  "design-system.yaml",
  "prototype-handoff.yaml",
] as const;
const FORBIDDEN_LEGACY_DESIGN_FILES = ["anchor-selection.yaml", "evaluation-axes.yaml"] as const;
const REQUIRED_DESIGN_SYSTEM_CHECKLIST_KEYS = [
  "color",
  "typography",
  "spacing",
  "border_radius",
  "shadow",
  "dos_and_donts",
  "motion_rules",
] as const;
const REFERENCE_KINDS = new Set([
  "competitor",
  "adjacent",
  "aspirational",
  "template-seed",
  "anti-pattern",
]);
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

export type DesignContractReadinessStage = "sdd" | "prototyping";
export type DesignContractReadinessOptions = {
  stage?: DesignContractReadinessStage;
};

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
  options: DesignContractReadinessOptions = {},
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
  const stage = options.stage ?? "prototyping";

  for (const fileName of REQUIRED_SDD_DESIGN_FILES) {
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
          `UI-bearing SDD execution requires exploration-brief.yaml, reference-pool.yaml, brand-design.yaml, evaluation-rubric.yaml, evaluator-calibration.yaml, and absorption-policy.yaml under \`${designDirRelative}/\`.`,
        ),
      );
    }
  }
  if (stage === "prototyping") {
    for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
      const filePath = path.join(designDir, fileName);
      try {
        await readFile(filePath, "utf-8");
      } catch {
        issues.push(
          issue(
            "QFAI-DCON-001",
            `Missing prototyping design contract: ${fileName}.`,
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.requiredFile",
            undefined,
            "canonical",
            `UI-bearing prototyping completion requires selected-direction.yaml, design-system.yaml, and prototype-handoff.yaml under \`${designDirRelative}/\`.`,
          ),
        );
      }
    }
  }

  for (const fileName of FORBIDDEN_LEGACY_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
      issues.push(
        issue(
          "QFAI-DCON-018",
          `Legacy design contract is forbidden: ${fileName}.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.legacyDesignContract",
          undefined,
          "canonical",
          `Remove ${fileName} and normalize the data into the canonical design contracts.`,
        ),
      );
    } catch {
      // missing is expected
    }
  }

  issues.push(...(await validateExplorationBrief(root, config)));
  issues.push(...(await validateReferencePool(root, config)));
  issues.push(...(await validateBrandDesign(root, config)));
  issues.push(...(await validateEvaluationRubric(root, config)));
  issues.push(...(await validateEvaluatorCalibration(root, config)));
  issues.push(...(await validateAbsorptionPolicy(root, config)));
  if (stage === "prototyping") {
    issues.push(...(await validateSelectedDirection(root, config)));
    issues.push(...(await validateDesignSystem(root, config)));
    issues.push(...(await validatePrototypeHandoff(root, config)));
  } else {
    issues.push(...(await validateNoPrematurePrototypingContracts(root, config)));
  }
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

async function validateReferencePool(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "reference-pool.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-014",
            "reference-pool.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.referencePoolDocument",
          ),
        ]
      : [];
  }

  const references = parsed.value.references;
  if (!Array.isArray(references) || references.length === 0) {
    return [
      issue(
        "QFAI-DCON-015",
        "reference-pool.yaml must define a non-empty references array.",
        "error",
        toPosixRelative(root, filePath),
        "designContractReadiness.referencePoolReferences",
      ),
    ];
  }

  const issues: Issue[] = [];
  const requiredKeys = [
    "id",
    "kind",
    "source",
    "adopted_points",
    "rejected_points",
    "local_translation",
    "copy_risk",
    "template_usage_policy",
  ];
  for (const [index, entry] of references.entries()) {
    if (!isRecord(entry)) {
      issues.push(referencePoolIssue(root, filePath, `references[${index}] must be an object.`));
      continue;
    }
    for (const key of requiredKeys) {
      if (!hasMeaningfulContractContent(entry[key])) {
        issues.push(
          referencePoolIssue(
            root,
            filePath,
            `reference-pool.yaml references[${index}] is missing required field '${key}'.`,
          ),
        );
      }
    }
    if (typeof entry.kind === "string" && !REFERENCE_KINDS.has(entry.kind)) {
      issues.push(
        referencePoolIssue(
          root,
          filePath,
          `reference-pool.yaml references[${index}].kind is invalid: ${entry.kind}.`,
        ),
      );
    }
  }
  return issues;
}

function referencePoolIssue(root: string, filePath: string, message: string): Issue {
  return issue(
    "QFAI-DCON-015",
    message,
    "error",
    toPosixRelative(root, filePath),
    "designContractReadiness.referencePoolField",
  );
}

async function validateBrandDesign(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "brand-design.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-016",
            "brand-design.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.brandDesignDocument",
          ),
        ]
      : [];
  }

  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    [
      "brand_personality",
      "audience_emotion",
      "category_conventions",
      "differentiation_strategy",
      "visual_language",
      "content_tone",
      "do_not_look_like",
    ],
    "QFAI-DCON-017",
    "brand-design.yaml is missing required field",
    "designContractReadiness.brandDesignField",
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
  if (!hasMeaningfulContractContent(winningRationale)) {
    issues.push(
      issue(
        "QFAI-DCON-004",
        "selected-direction.yaml is missing required field 'winning_rationale'.",
        "error",
        toPosixRelative(root, filePath),
        "designContractReadiness.selectedDirectionField",
      ),
    );
  }

  const chosenDirectionId = parsed.value.chosen_direction_id;
  if (!isNonEmptyStringValue(chosenDirectionId)) {
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

async function validateAbsorptionPolicy(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "absorption-policy.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-020",
            "absorption-policy.yaml must parse as an object-shaped YAML document.",
            "error",
            toPosixRelative(root, filePath),
            "designContractReadiness.absorptionPolicyDocument",
          ),
        ]
      : [];
  }
  return validateRequiredStringArrayKeys(
    filePath,
    root,
    parsed.value,
    ["minAbsorptionsPerSurvivor", "require_rejected_reason", "allow_adapt_required"],
    "QFAI-DCON-021",
    "absorption-policy.yaml is missing required field",
    "designContractReadiness.absorptionPolicyField",
  );
}

async function validateNoPrematurePrototypingContracts(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const designDir = path.join(root, config.paths.contractsDir, "design");
  const issues: Issue[] = [];
  for (const fileName of REQUIRED_PROTOTYPING_DESIGN_FILES) {
    const filePath = path.join(designDir, fileName);
    try {
      await readFile(filePath, "utf-8");
      issues.push(
        issue(
          "QFAI-DCON-019",
          `${fileName} must be produced by /qfai-prototyping, not /qfai-sdd.`,
          "error",
          toPosixRelative(root, filePath),
          "designContractReadiness.prematurePrototypingContract",
        ),
      );
    } catch {
      // missing is expected before prototyping
    }
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
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  return false;
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

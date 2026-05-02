import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

// v2.0 (spec-0017): SDD only normalizes the deviate-from / brand contracts.
// The v1.x rubric / calibration / absorption-policy / selected-direction
// contracts were removed; axes are global constants in
// core/prototyping/iteration.ts.
const REQUIRED_SDD_DESIGN_FILES = [
  "exploration-brief.yaml",
  "reference-pool.yaml",
  "brand-design.yaml",
] as const;
// v2.0: prototyping post-loop produces design-system.yaml (extracted from
// final iter) and prototype-handoff.yaml (simplified schema, no
// mustPreserve/mayAdapt/mustNotCopy).
const REQUIRED_PROTOTYPING_DESIGN_FILES = ["design-system.yaml", "prototype-handoff.yaml"] as const;
const FORBIDDEN_LEGACY_DESIGN_FILES = [
  "anchor-selection.yaml",
  "evaluation-axes.yaml",
  // spec-0017 v2.0: removed in P4
  "evaluation-rubric.yaml",
  "evaluator-calibration.yaml",
  "absorption-policy.yaml",
  "selected-direction.yaml",
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
const REFERENCE_KINDS = new Set([
  "competitor",
  "adjacent",
  "aspirational",
  "template-seed",
  "anti-pattern",
]);
const COPY_RISK_VALUES = new Set(["low", "medium", "high"]);
const TEMPLATE_USAGE_POLICY_VALUES = new Set(["none", "reference-only", "implementation-seed"]);
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

type DesignContractReadinessStage = "sdd" | "prototyping";
type SddDesignContractReadinessOptions = {
  enforceNoPrematurePrototypingContracts?: boolean;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

type YamlReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; value: Record<string, unknown> };

export async function validateSddDesignContractReadiness(
  root: string,
  config: QfaiConfig,
  options: SddDesignContractReadinessOptions = {},
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "sdd", {
    enforceNoPrematurePrototypingContracts: options.enforceNoPrematurePrototypingContracts ?? true,
  });
}

export async function validatePrototypingDesignContractReadiness(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  return validateDesignContractReadinessForStage(root, config, "prototyping");
}

async function validateDesignContractReadinessForStage(
  root: string,
  config: QfaiConfig,
  stage: DesignContractReadinessStage,
  options: SddDesignContractReadinessOptions = {},
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
          `UI-bearing design workflows require pre-prototyping design contracts: exploration-brief.yaml, reference-pool.yaml, and brand-design.yaml under \`${designDirRelative}/\`.`,
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
            `UI-bearing prototyping completion requires design-system.yaml and prototype-handoff.yaml under \`${designDirRelative}/\` (extracted from the final iter).`,
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
  // v2.0 (spec-0017 P4/P14): rubric/calibration/absorption-policy/
  // selected-direction validators removed — those contracts no longer
  // exist. Per-axis evaluation is encoded in core/prototyping/iteration.ts.
  if (stage === "prototyping") {
    issues.push(...(await validateDesignSystem(root, config)));
    issues.push(...(await validatePrototypeHandoff(root, config)));
  } else if (options.enforceNoPrematurePrototypingContracts ?? true) {
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
      if (!hasRequiredReferencePoolField(key, entry[key])) {
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
    if (typeof entry.copy_risk !== "string" || !COPY_RISK_VALUES.has(entry.copy_risk)) {
      issues.push(
        referencePoolIssue(
          root,
          filePath,
          `reference-pool.yaml references[${index}].copy_risk must be one of: low, medium, high.`,
        ),
      );
    }
    if (
      typeof entry.template_usage_policy !== "string" ||
      !TEMPLATE_USAGE_POLICY_VALUES.has(entry.template_usage_policy)
    ) {
      issues.push(
        referencePoolIssue(
          root,
          filePath,
          `reference-pool.yaml references[${index}].template_usage_policy must be one of: none, reference-only, implementation-seed.`,
        ),
      );
    }
  }
  return issues;
}

function hasRequiredReferencePoolField(key: string, value: unknown): boolean {
  if (key === "template_usage_policy") {
    return isNonEmptyStringValue(value);
  }
  return hasMeaningfulContractContent(value);
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

// v2.0: legacy validators (validateEvaluationRubric,
// validateEvaluatorCalibration, validateSelectedDirection,
// validateAbsorptionPolicy, absorptionPolicyIssue) removed in
// spec-0017 P4/P14. Their target contracts no longer exist.

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

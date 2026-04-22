import path from "node:path";
import { readFile } from "node:fs/promises";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const REQUIRED_DESIGN_FILES = [
  "design-system.yaml",
  "evaluation-axes.yaml",
  "anchor-selection.yaml",
] as const;

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
          path.relative(root, filePath).replace(/\\/g, "/"),
          "designContractReadiness.requiredFile",
          undefined,
          "canonical",
          "UI-bearing downstream execution requires design-system.yaml, evaluation-axes.yaml, and anchor-selection.yaml under `.qfai/contracts/design/`.",
        ),
      );
    }
  }

  issues.push(...(await validateDesignSystem(root, config)));
  issues.push(...(await validateEvaluationAxes(root, config)));
  issues.push(...(await validateAnchorSelection(root, config)));
  return issues;
}

async function validateDesignSystem(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "design-system.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-006",
            "design-system.yaml must parse as an object-shaped YAML document.",
            "error",
            path.relative(root, filePath).replace(/\\/g, "/"),
            "designContractReadiness.designSystemDocument",
          ),
        ]
      : [];
  }

  const checklist = parsed.value.checklist;
  const requiredKeys = [
    "color",
    "typography",
    "spacing",
    "border_radius",
    "shadow",
    "dos_and_donts",
  ];
  const issues: Issue[] = [];

  for (const key of requiredKeys) {
    if (
      !(checklist && typeof checklist === "object" && key in (checklist as Record<string, unknown>))
    ) {
      issues.push(
        issue(
          "QFAI-DCON-002",
          `design-system.yaml is missing checklist key '${key}'.`,
          "error",
          path.relative(root, filePath).replace(/\\/g, "/"),
          "designContractReadiness.designSystemChecklist",
        ),
      );
    }
  }

  return issues;
}

async function validateEvaluationAxes(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "evaluation-axes.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-007",
            "evaluation-axes.yaml must parse as an object-shaped YAML document.",
            "error",
            path.relative(root, filePath).replace(/\\/g, "/"),
            "designContractReadiness.evaluationAxesDocument",
          ),
        ]
      : [];
  }

  const record = parsed.value;
  const requiredArrays = ["invariant_axes", "trend_derived_axes", "product_specific_axes"];
  const issues: Issue[] = [];

  for (const key of requiredArrays) {
    if (!Array.isArray(record[key])) {
      issues.push(
        issue(
          "QFAI-DCON-003",
          `evaluation-axes.yaml is missing array '${key}'.`,
          "error",
          path.relative(root, filePath).replace(/\\/g, "/"),
          "designContractReadiness.axesArray",
        ),
      );
    }
  }

  if (!record.aggregate_rules || typeof record.aggregate_rules !== "object") {
    issues.push(
      issue(
        "QFAI-DCON-004",
        "evaluation-axes.yaml is missing 'aggregate_rules'.",
        "error",
        path.relative(root, filePath).replace(/\\/g, "/"),
        "designContractReadiness.aggregateRules",
      ),
    );
  }

  return issues;
}

async function validateAnchorSelection(root: string, config: QfaiConfig): Promise<Issue[]> {
  const filePath = path.join(root, config.paths.contractsDir, "design", "anchor-selection.yaml");
  const parsed = await readYaml(filePath);
  if (parsed.kind !== "ok") {
    return parsed.kind === "invalid"
      ? [
          issue(
            "QFAI-DCON-008",
            "anchor-selection.yaml must parse as an object-shaped YAML document.",
            "error",
            path.relative(root, filePath).replace(/\\/g, "/"),
            "designContractReadiness.anchorSelectionDocument",
          ),
        ]
      : [];
  }

  const selected = parsed.value.selected_anchor;
  const requiredKeys = ["option_id", "title", "rationale"];
  const issues: Issue[] = [];

  for (const key of requiredKeys) {
    if (
      !(
        selected &&
        typeof selected === "object" &&
        typeof (selected as Record<string, unknown>)[key] === "string"
      )
    ) {
      issues.push(
        issue(
          "QFAI-DCON-005",
          `anchor-selection.yaml is missing selected_anchor.${key}.`,
          "error",
          path.relative(root, filePath).replace(/\\/g, "/"),
          "designContractReadiness.anchorSelection",
        ),
      );
    }
  }

  return issues;
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

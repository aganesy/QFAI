import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type BreakthroughRecord = {
  latestIteration?: unknown;
  triggerResult?: unknown;
  triggerReasons?: unknown;
  scoreDeltaWindow?: unknown;
  avgScoreDeltas?: unknown;
  minScoreDeltas?: unknown;
  diffLines?: unknown;
  branchCount?: unknown;
  branchRefs?: unknown;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

export async function validateBreakthroughEvidence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return [];
  }

  const evidenceRoot = path.join(path.dirname(resolvePath(root, config, "specsDir")), "evidence");
  const evidencePath = path.join(evidenceRoot, "breakthrough.json");
  const evidenceRelativePath = toPosixRelative(root, evidencePath);
  const raw = await readJsonFile(evidencePath);
  if (raw.status === "missing") {
    return [
      issue(
        "QFAI-BREAK-001",
        "breakthrough.json is required for exploration-first UI prototyping evidence but is missing.",
        "warning",
        evidenceRelativePath,
        "breakthroughEvidence.presence",
        undefined,
        "canonical",
        `\`${evidenceRelativePath}\` を生成してください。`,
      ),
    ];
  }
  if (raw.status === "invalid") {
    return [
      issue(
        "QFAI-BREAK-002",
        "breakthrough.json must be a valid JSON object.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.schema",
      ),
    ];
  }

  const record = raw.value as BreakthroughRecord;
  const issues: Issue[] = [];
  if (!Number.isInteger(record.latestIteration)) {
    issues.push(
      issue(
        "QFAI-BREAK-003",
        "breakthrough.json.latestIteration must be a positive integer.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.latestIteration",
      ),
    );
  }
  if (typeof record.triggerResult !== "boolean") {
    issues.push(
      issue(
        "QFAI-BREAK-004",
        "breakthrough.json.triggerResult must be a boolean.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.triggerResult",
      ),
    );
  }
  if (!Array.isArray(record.triggerReasons) || !record.triggerReasons.every(isNonEmptyString)) {
    issues.push(
      issue(
        "QFAI-BREAK-005",
        "breakthrough.json.triggerReasons must be an array of strings.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.triggerReasons",
      ),
    );
  }
  if (
    !Array.isArray(record.avgScoreDeltas) ||
    !record.avgScoreDeltas.every((value) => typeof value === "number")
  ) {
    issues.push(
      issue(
        "QFAI-BREAK-006",
        "breakthrough.json.avgScoreDeltas must be an array of numbers.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.avgScoreDeltas",
      ),
    );
  }
  if (typeof record.diffLines !== "number" || record.diffLines < 0) {
    issues.push(
      issue(
        "QFAI-BREAK-007",
        "breakthrough.json.diffLines must be a non-negative number.",
        "error",
        evidenceRelativePath,
        "breakthroughEvidence.diffLines",
      ),
    );
  }
  if (record.triggerResult === true) {
    if (
      typeof record.branchCount !== "number" ||
      !Number.isInteger(record.branchCount) ||
      record.branchCount < 1
    ) {
      issues.push(
        issue(
          "QFAI-BREAK-008",
          "triggerResult=true requires breakthrough.json.branchCount to be a positive integer.",
          "error",
          evidenceRelativePath,
          "breakthroughEvidence.branchCount",
        ),
      );
    }
    if (
      !Array.isArray(record.branchRefs) ||
      record.branchRefs.length === 0 ||
      !record.branchRefs.every(isNonEmptyString)
    ) {
      issues.push(
        issue(
          "QFAI-BREAK-009",
          "triggerResult=true requires non-empty breakthrough.json.branchRefs evidence.",
          "error",
          evidenceRelativePath,
          "breakthroughEvidence.branchRefs",
        ),
      );
    }
  }

  return issues;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function readJsonFile(
  filePath: string,
): Promise<
  { status: "missing" } | { status: "invalid" } | { status: "ok"; value: Record<string, unknown> }
> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { status: "invalid" };
    }
    return { status: "ok", value: parsed as Record<string, unknown> };
  } catch {
    try {
      await readFile(filePath, "utf-8");
      return { status: "invalid" };
    } catch {
      return { status: "missing" };
    }
  }
}

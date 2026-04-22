import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import {
  DEFAULT_PROTOTYPING_MODE,
  PROTOTYPING_MAX_ITERATIONS,
  derivePrototypingObligations,
  isSupportedPrototypingSurface,
  isValidPrototypingMode,
  isValidPrototypingSurface,
  type PrototypingMode,
} from "../review/prototyping.js";
import { isConcreteArtifactRef } from "../artifacts/pathUtils.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type ReviewerScore = {
  reviewerId: string;
  role?: string;
  scores: Array<{
    axisId: string;
    score: number;
    rationale: string;
    evidenceRefs: string[];
  }>;
};

type IterationEntry = {
  iteration: number;
  reviewerScores: ReviewerScore[];
  allItemsPass95: boolean;
  stopReason?: string;
};

type PrototypingEvidenceRecord = {
  surface?: unknown;
  mode?: {
    requested?: unknown;
    effective?: unknown;
    source?: unknown;
    rationale?: unknown;
  };
  iterations?: unknown;
  meta?: {
    generatedAt?: unknown;
    toolVersion?: unknown;
    commands?: unknown;
  };
  runtimeGate?: unknown;
  uiFidelity?: unknown;
};

export async function validatePrototypingEvidence(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return [];
  }

  const evidencePath = path.join(
    path.dirname(resolvePath(root, config, "specsDir")),
    "evidence",
    "prototyping.json",
  );
  const raw = await readJsonFile(evidencePath);
  if (raw === null) {
    return [
      issue(
        "QFAI-PROT-150",
        "prototyping.json is required for UI prototyping evidence but is missing.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.presence",
        undefined,
        "canonical",
        "`.qfai/evidence/prototyping.json` を生成してください。",
      ),
    ];
  }

  const record = raw as PrototypingEvidenceRecord;
  const issues: Issue[] = [];
  const surface = normalizeSurface(record.surface);
  const mode = normalizeMode(record.mode);

  if (!surface) {
    issues.push(
      issue(
        "QFAI-PROT-151",
        "prototyping evidence must declare a supported surface.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.surface",
        undefined,
        "canonical",
        "mode に対応する surface を `web|mobile|desktop|mixed` で記録してください。",
      ),
    );
  }

  if (!mode) {
    issues.push(
      issue(
        "QFAI-PROT-152",
        "prototyping evidence must declare a valid mode block.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.mode",
        undefined,
        "canonical",
        "mode.requested/mode.effective/mode.source/mode.rationale を新 schema に合わせて記録してください。",
      ),
    );
    return issues;
  }

  const obligations =
    surface && isSupportedPrototypingSurface(surface)
      ? derivePrototypingObligations({ surface, effectiveMode: mode.effective })
      : undefined;

  const iterations = normalizeIterations(record.iterations);
  if (iterations.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-280",
        "prototyping evidence requires at least one iteration entry.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.iterations",
        undefined,
        "canonical",
        "iterations[] に少なくとも 1 件の反復結果を記録してください。",
      ),
    );
    return issues;
  }

  if (obligations && iterations.length > obligations.maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-281",
        `mode=${mode.effective} exceeds max iterations (${obligations.maxIterations}).`,
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.maxIterations",
        [String(iterations.length), String(obligations.maxIterations)],
        "canonical",
        `mode=${mode.effective} の iteration 上限 ${obligations.maxIterations} を超えないようにしてください。`,
      ),
    );
  }

  let foundPass95 = false;
  for (const [index, iteration] of iterations.entries()) {
    const prefix = `iterations[${index}]`;
    if (!Number.isInteger(iteration.iteration) || iteration.iteration <= 0) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.iteration must be a positive integer.`),
      );
    }
    if (!Array.isArray(iteration.reviewerScores) || iteration.reviewerScores.length === 0) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.reviewerScores must be a non-empty array.`),
      );
      continue;
    }
    if (iteration.allItemsPass95) {
      foundPass95 = true;
    }

    for (const [reviewerIndex, reviewer] of iteration.reviewerScores.entries()) {
      const reviewerPath = `${prefix}.reviewerScores[${reviewerIndex}]`;
      if (typeof reviewer.reviewerId !== "string" || reviewer.reviewerId.trim().length === 0) {
        issues.push(
          makeSchemaIssue(root, evidencePath, `${reviewerPath}.reviewerId must be non-empty.`),
        );
      }
      if (!Array.isArray(reviewer.scores) || reviewer.scores.length === 0) {
        issues.push(
          makeSchemaIssue(root, evidencePath, `${reviewerPath}.scores must be a non-empty array.`),
        );
        continue;
      }
      for (const [scoreIndex, score] of reviewer.scores.entries()) {
        const scorePath = `${reviewerPath}.scores[${scoreIndex}]`;
        if (typeof score.axisId !== "string" || score.axisId.trim().length === 0) {
          issues.push(
            makeSchemaIssue(root, evidencePath, `${scorePath}.axisId must be non-empty.`),
          );
        }
        if (
          typeof score.score !== "number" ||
          !Number.isFinite(score.score) ||
          score.score < 0 ||
          score.score > 100
        ) {
          issues.push(
            makeSchemaIssue(root, evidencePath, `${scorePath}.score must be between 0 and 100.`),
          );
        }
        if (typeof score.rationale !== "string" || score.rationale.trim().length === 0) {
          issues.push(
            makeSchemaIssue(root, evidencePath, `${scorePath}.rationale must be non-empty.`),
          );
        }
        if (!Array.isArray(score.evidenceRefs) || score.evidenceRefs.length === 0) {
          issues.push(
            makeSchemaIssue(root, evidencePath, `${scorePath}.evidenceRefs must be non-empty.`),
          );
        } else {
          for (const ref of score.evidenceRefs) {
            if (typeof ref !== "string" || !isConcreteArtifactRef(ref)) {
              issues.push(
                makeSchemaIssue(
                  root,
                  evidencePath,
                  `${scorePath}.evidenceRefs must contain concrete artifact refs.`,
                ),
              );
              break;
            }
          }
        }
      }
    }
  }

  const maxIterations = PROTOTYPING_MAX_ITERATIONS[mode.effective];
  if (!foundPass95 && iterations.length < maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-282",
        `mode=${mode.effective} has not reached all-items-pass-95 and has remaining iterations.`,
        "warning",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.convergence",
        [String(iterations.length), String(maxIterations)],
        "canonical",
        "95 点未満の項目が残っているため、mode 上限に達するまで反復を継続してください。",
      ),
    );
  }

  if (obligations?.requireRuntimeGate && !isRecord(record.runtimeGate)) {
    issues.push(
      makeSchemaIssue(root, evidencePath, "runtimeGate is required in full-harness mode."),
    );
  }
  if (obligations?.requireUiFidelity && !isRecord(record.uiFidelity)) {
    issues.push(
      makeSchemaIssue(root, evidencePath, "uiFidelity is required in full-harness mode."),
    );
  }

  return issues;
}

function normalizeSurface(value: unknown) {
  return isValidPrototypingSurface(value) ? value : null;
}

function normalizeMode(value: PrototypingEvidenceRecord["mode"]): {
  requested?: PrototypingMode;
  effective: PrototypingMode;
  source: string;
  rationale: string;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (typeof value.source !== "string" || value.source.trim().length === 0) {
    return null;
  }
  if (typeof value.rationale !== "string" || value.rationale.trim().length === 0) {
    return null;
  }
  const effective = isValidPrototypingMode(value.effective)
    ? value.effective
    : DEFAULT_PROTOTYPING_MODE;
  const requested = isValidPrototypingMode(value.requested) ? value.requested : undefined;
  return {
    ...(requested ? { requested } : {}),
    effective,
    source: value.source,
    rationale: value.rationale.trim(),
  };
}

function normalizeIterations(value: unknown): IterationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isIterationEntry);
}

function isIterationEntry(value: unknown): value is IterationEntry {
  return (
    isRecord(value) &&
    typeof value.iteration === "number" &&
    Array.isArray(value.reviewerScores) &&
    typeof value.allItemsPass95 === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function makeSchemaIssue(root: string, evidencePath: string, message: string): Issue {
  return issue(
    "QFAI-PROT-299",
    message,
    "error",
    path.relative(root, evidencePath).replace(/\\/g, "/"),
    "prototypingEvidence.schema",
  );
}

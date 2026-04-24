import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import {
  PROTOTYPING_MAX_ITERATIONS,
  derivePrototypingObligations,
  isSupportedPrototypingSurface,
  isValidPrototypingMode,
  type PrototypingMode,
} from "../review/prototyping.js";
import { isConcreteArtifactRef } from "../artifacts/pathUtils.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

type PrototypingEvidenceRecord = {
  surface?: unknown;
  mode?: {
    requested?: unknown;
    effective?: unknown;
    source?: unknown;
    rationale?: unknown;
  };
  iterations?: unknown;
  phase?: unknown;
  selectedWinnerAtIteration?: unknown;
  postSelectionPolishCount?: unknown;
  completionClaimed?: unknown;
  completionEligible?: unknown;
  completionCertificate?: unknown;
  fullHarness?: unknown;
  meta?: {
    generatedAt?: unknown;
    toolVersion?: unknown;
    commands?: unknown;
  };
  runtimeGate?: unknown;
  uiFidelity?: unknown;
};

const VALID_ITERATION_KIND_SET = new Set(["explore", "remix", "select", "polish", "branch"]);
const VALID_PHASE_SET = new Set([
  "planning",
  "explore",
  "remix",
  "select",
  "polish",
  "breakthrough",
  "reviewer_gate",
  "completed",
]);
const REQUIRED_POLISH_CHECKS = ["critique", "fix", "recapture", "rereview", "breakthrough"];
const LEGACY_PASS_95_FIELD = "allItemsPass" + String(95);
const VALID_MODE_SOURCE_SET = new Set([
  "explicit-request",
  "system-default",
  "discussion-recommendation",
  "cli",
]);

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
  if (raw.status === "missing") {
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
  if (raw.status === "invalid") {
    return [makeSchemaIssue(root, evidencePath, "prototyping.json must be a valid JSON object.")];
  }

  const record = raw.value as PrototypingEvidenceRecord;
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
  if (!iterations || iterations.length === 0) {
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

  let latestPerfect100 = false;
  let latestIterationKind: string | null = null;
  let completedPolishCount = 0;
  let polishWithBreakthroughCheck = false;
  let hasLegacyPass95CompletionMarker = false;
  for (const [index, candidate] of iterations.entries()) {
    const prefix = `iterations[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(makeSchemaIssue(root, evidencePath, `${prefix} must be an object.`));
      continue;
    }

    const iteration = candidate;
    const iterationNumber = iteration.iteration;
    if (
      typeof iterationNumber !== "number" ||
      !Number.isInteger(iterationNumber) ||
      iterationNumber <= 0
    ) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.iteration must be a positive integer.`),
      );
    }
    if (typeof iteration.allReviewerAxesPerfect100 !== "boolean") {
      issues.push(
        makeSchemaIssue(
          root,
          evidencePath,
          `${prefix}.allReviewerAxesPerfect100 must be a boolean.`,
        ),
      );
    } else if (iteration.allReviewerAxesPerfect100) {
      latestPerfect100 = true;
    } else {
      latestPerfect100 = false;
    }
    if (iteration[LEGACY_PASS_95_FIELD] === true) {
      hasLegacyPass95CompletionMarker = true;
    }
    if (iteration.kind !== undefined) {
      if (typeof iteration.kind !== "string" || !VALID_ITERATION_KIND_SET.has(iteration.kind)) {
        issues.push(
          issue(
            "QFAI-PROT-285",
            `${prefix}.kind must be one of explore|remix|select|polish|branch.`,
            "error",
            path.relative(root, evidencePath).replace(/\\/g, "/"),
            "prototypingEvidence.phase",
            undefined,
            "canonical",
            "iteration kind を phase state machine に合わせて記録してください。",
          ),
        );
      } else {
        latestIterationKind = iteration.kind;
        if (iteration.kind === "polish" && hasCompletePolishChecks(iteration.checks)) {
          completedPolishCount++;
          polishWithBreakthroughCheck = true;
        }
      }
    }
    if (!Array.isArray(iteration.reviewerScores) || iteration.reviewerScores.length === 0) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.reviewerScores must be a non-empty array.`),
      );
      continue;
    }

    for (const [reviewerIndex, reviewer] of iteration.reviewerScores.entries()) {
      const reviewerPath = `${prefix}.reviewerScores[${reviewerIndex}]`;
      if (!isRecord(reviewer)) {
        issues.push(makeSchemaIssue(root, evidencePath, `${reviewerPath} must be an object.`));
        continue;
      }
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
        if (!isRecord(score)) {
          issues.push(makeSchemaIssue(root, evidencePath, `${scorePath} must be an object.`));
          continue;
        }
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

  const phaseCurrent = normalizePhaseCurrent(record.phase);
  if (phaseCurrent !== null && !VALID_PHASE_SET.has(phaseCurrent)) {
    issues.push(
      issue(
        "QFAI-PROT-285",
        "phase.current must follow the prototyping phase state machine.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.phase",
        undefined,
        "canonical",
        "phase.current は planning|explore|remix|select|polish|breakthrough|reviewer_gate|completed のいずれかで記録してください。",
      ),
    );
  }

  const fullHarnessStatus = normalizeFullHarnessStatus(record.fullHarness);
  const completionClaimed =
    record.completionClaimed === true ||
    record.completionEligible === true ||
    phaseCurrent === "completed" ||
    fullHarnessStatus === "completed";

  if (hasLegacyPass95CompletionMarker && completionClaimed) {
    issues.push(
      issue(
        "QFAI-PROT-288",
        "The legacy 95-point completion field is no longer a completion border; completion requires allReviewerAxesPerfect100.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.perfect100",
        undefined,
        "canonical",
        "95 点到達フィールドを完了条件として使わず、全 reviewer / 全 axis 100 点を allReviewerAxesPerfect100 で記録してください。",
      ),
    );
  }

  if (completionClaimed) {
    if (!latestPerfect100 || !allReviewerScoresArePerfect100(iterations)) {
      issues.push(
        issue(
          "QFAI-PROT-287",
          "Completion requires every reviewer to score every evaluation axis at 100.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.perfect100",
          undefined,
          "canonical",
          "completionClaimed/completed を記録する前に、全 reviewerScores[].scores[].score を 100 にしてください。",
        ),
      );
    }
    if (latestIterationKind === "select") {
      issues.push(
        issue(
          "QFAI-PROT-285",
          "Selection funnel completion is not stage completion; latest iteration cannot remain select when completion is claimed.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.phase",
          undefined,
          "canonical",
          "winner 選定後に post-selection polish iteration を完了してから completion を claim してください。",
        ),
      );
    }
    const postSelectionPolishCount =
      typeof record.postSelectionPolishCount === "number"
        ? record.postSelectionPolishCount
        : completedPolishCount;
    if (!Number.isInteger(postSelectionPolishCount) || postSelectionPolishCount < 1) {
      issues.push(
        issue(
          "QFAI-PROT-286",
          "Completion requires at least one completed post-selection polish iteration.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.postSelectionPolish",
          undefined,
          "canonical",
          "postSelectionPolishCount >= 1 とし、polish iteration に critique/fix/recapture/rereview/breakthrough checks を記録してください。",
        ),
      );
    }
    if (!polishWithBreakthroughCheck) {
      issues.push(
        issue(
          "QFAI-PROT-286",
          "Completion requires a polish iteration with critique/fix/recapture/rereview/breakthrough checks.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.postSelectionPolish",
          undefined,
          "canonical",
          "polish iteration の checks.critique/fix/recapture/rereview/breakthrough を true にしてください。",
        ),
      );
    }
    if (!isRecord(record.completionCertificate)) {
      issues.push(
        issue(
          "QFAI-PROT-289",
          "completionCertificate is required when completion is claimed.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.completionCertificate",
          undefined,
          "canonical",
          "reviewerGateResult/validateCommand/bestOfHistoryRef/breakthroughRef を含む completionCertificate を記録してください。",
        ),
      );
    }
  }

  const maxIterations = PROTOTYPING_MAX_ITERATIONS[mode.effective];
  if (!latestPerfect100 && iterations.length < maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-282",
        `mode=${mode.effective} has not reached all-reviewer-axes-perfect-100 and has remaining iterations.`,
        "warning",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.convergence",
        [String(iterations.length), String(maxIterations)],
        "canonical",
        "全 reviewer / 全 axis が 100 点に達していないため、mode 上限に達するまで反復を継続してください。",
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
  return typeof value === "string" && isSupportedPrototypingSurface(value) ? value : null;
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
  if (typeof value.source !== "string" || !VALID_MODE_SOURCE_SET.has(value.source.trim())) {
    return null;
  }
  if (typeof value.rationale !== "string" || value.rationale.trim().length === 0) {
    return null;
  }
  if (!isValidPrototypingMode(value.effective)) {
    return null;
  }
  if (value.requested !== undefined && !isValidPrototypingMode(value.requested)) {
    return null;
  }
  return {
    ...(value.requested !== undefined ? { requested: value.requested } : {}),
    effective: value.effective,
    source: value.source.trim(),
    rationale: value.rationale.trim(),
  };
}

function normalizeIterations(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value as unknown[];
}

function normalizePhaseCurrent(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.current === "string" ? value.current : null;
}

function normalizeFullHarnessStatus(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  return typeof value.status === "string" ? value.status : null;
}

function hasCompletePolishChecks(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return REQUIRED_POLISH_CHECKS.every((key) => value[key] === true);
}

function allReviewerScoresArePerfect100(iterations: unknown[]): boolean {
  const candidate = iterations[iterations.length - 1];
  if (!isRecord(candidate) || !Array.isArray(candidate.reviewerScores)) {
    return false;
  }
  return candidate.reviewerScores.every((reviewer) => {
    if (!isRecord(reviewer) || !Array.isArray(reviewer.scores) || reviewer.scores.length === 0) {
      return false;
    }
    return reviewer.scores.every((score) => isRecord(score) && score.score === 100);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonFile(
  filePath: string,
): Promise<
  { status: "missing" } | { status: "invalid" } | { status: "ok"; value: Record<string, unknown> }
> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? { status: "ok", value: parsed } : { status: "invalid" };
  } catch {
    try {
      await readFile(filePath, "utf-8");
      return { status: "invalid" };
    } catch {
      return { status: "missing" };
    }
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

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
import { isCandidateId } from "../prototyping/candidate.js";
import {
  EXPLORATION_ROUNDS,
  ROUND_SURVIVOR_COUNT,
  isExplorationRound,
  type ExplorationRound,
} from "../prototyping/round.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";
import { validateModeInvariant } from "./prototyping/modeInvariant.js";

type PrototypingEvidenceRecord = {
  schemaVersion?: unknown;
  surface?: unknown;
  mode?: {
    requested?: unknown;
    effective?: unknown;
    source?: unknown;
    rationale?: unknown;
  };
  iterations?: unknown;
  rounds?: unknown;
  polishCycles?: unknown;
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
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
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

  // spec-0017 REQ-0001 mode invariant: maxCycles is the only mode-dependent
  // value; browserTool must be "playwright-cli" if present. Emits QFAI-PROT-MODE-001.
  issues.push(
    ...validateModeInvariant(record, path.relative(root, evidencePath).replace(/\\/g, "/")),
  );

  const isV2Record =
    record.schemaVersion === "2.0" ||
    record.rounds !== undefined ||
    record.polishCycles !== undefined;
  if (isV2Record) {
    issues.push(...validateV2Lifecycle(root, evidencePath, record, mode, obligations));
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

function normalizeRounds(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value as unknown[];
}

function normalizePolishCycles(value: unknown): unknown[] | null {
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

function validateV2Lifecycle(
  root: string,
  evidencePath: string,
  record: PrototypingEvidenceRecord,
  mode: {
    requested?: PrototypingMode;
    effective: PrototypingMode;
    source: string;
    rationale: string;
  },
  obligations: ReturnType<typeof derivePrototypingObligations> | undefined,
): Issue[] {
  const issues: Issue[] = [];
  const rounds = normalizeRounds(record.rounds);
  if (!rounds || rounds.length === 0) {
    issues.push(
      issue(
        "QFAI-PROT-280",
        "prototyping evidence requires at least one round entry.",
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.rounds",
        undefined,
        "canonical",
        "rounds[] に少なくとも 1 件の探索 round を記録してください。",
      ),
    );
    return issues;
  }

  const polishCycles = normalizePolishCycles(record.polishCycles) ?? [];
  if (obligations && polishCycles.length > obligations.maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-281",
        `mode=${mode.effective} exceeds max polish cycles (${obligations.maxIterations}).`,
        "error",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.maxIterations",
        [String(polishCycles.length), String(obligations.maxIterations)],
        "canonical",
        `mode=${mode.effective} の polish cycle 上限 ${obligations.maxIterations} を超えないようにしてください。`,
      ),
    );
  }

  let latestPerfect100 = false;
  let completedPolishCount = 0;
  let polishWithBreakthroughCheck = false;
  const seenCommitShas = new Map<string, string>();

  for (const [index, candidate] of rounds.entries()) {
    const prefix = `rounds[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(makeSchemaIssue(root, evidencePath, `${prefix} must be an object.`));
      continue;
    }
    issues.push(
      ...validateLifecycleCommitSha(
        root,
        evidencePath,
        prefix,
        candidate.commitSha,
        seenCommitShas,
      ),
    );
    let validRound: ExplorationRound | null = null;
    if (!isExplorationRound(candidate.round)) {
      issues.push(makeSchemaIssue(root, evidencePath, `${prefix}.round must be r5|r3|r2|r1.`));
    } else {
      validRound = candidate.round;
      // Round funnel order: rounds[0..N-1] must be the prefix of
      // EXPLORATION_ROUNDS = [r5, r3, r2, r1]. Recording r5 then jumping to
      // r2 would corrupt the harvest/narrow lineage downstream. The funnel
      // also caps at 4 rounds total — any further entry (5th round) is a
      // contract violation regardless of its `round` value.
      if (index >= EXPLORATION_ROUNDS.length) {
        issues.push(
          makeSchemaIssue(
            root,
            evidencePath,
            `${prefix} exceeds the funnel limit (rounds[] must contain at most ${EXPLORATION_ROUNDS.length} entries: ${EXPLORATION_ROUNDS.join("→")}).`,
          ),
        );
      } else {
        const expectedRound = EXPLORATION_ROUNDS[index];
        if (expectedRound !== undefined && validRound !== expectedRound) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.round must be ${expectedRound} (rounds[] must follow ${EXPLORATION_ROUNDS.join("→")}); got ${validRound}.`,
            ),
          );
        }
      }
    }
    const candidateIds: string[] = [];
    const seenCandidateIds = new Set<string>();
    if (!Array.isArray(candidate.candidates) || candidate.candidates.length === 0) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.candidates must be a non-empty array.`),
      );
    } else {
      for (const [candidateIndex, roundCandidate] of candidate.candidates.entries()) {
        if (!isRecord(roundCandidate)) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.candidates[${candidateIndex}] must be an object.`,
            ),
          );
          continue;
        }
        if (!isCandidateId(roundCandidate.candidateId)) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.candidates[${candidateIndex}].candidateId must be a valid candidate id.`,
            ),
          );
        } else if (seenCandidateIds.has(roundCandidate.candidateId)) {
          // The per-candidate evidence maps below are keyed by candidateId, so
          // a duplicate id silently collapses two slots into one and lets the
          // round funnel pass with fewer real survivors than the count check
          // sees.
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.candidates[${candidateIndex}].candidateId must be unique within the round; ${roundCandidate.candidateId} already appears earlier.`,
            ),
          );
        } else {
          seenCandidateIds.add(roundCandidate.candidateId);
          candidateIds.push(roundCandidate.candidateId);
        }
      }
      // Per-round candidate-count invariant: ROUND_SURVIVOR_COUNT
      // (r5=5, r3=3, r2=2, r1=1). A record with the wrong count means the
      // narrow funnel was bypassed.
      if (validRound) {
        const expectedCandidateCount = ROUND_SURVIVOR_COUNT[validRound];
        if (candidate.candidates.length !== expectedCandidateCount) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.candidates must contain exactly ${expectedCandidateCount} entries for round ${validRound}; got ${candidate.candidates.length}.`,
            ),
          );
        }
      }
    }

    // Per-candidate evidence references: every candidateId surfaced in
    // candidates[] MUST appear as a key in screenEvidenceByCandidate (array
    // of screen-artifact refs) and evaluatorReviewRefsByCandidate (string
    // path). The maps themselves are required whenever candidates[] is
    // populated — a record that omits them entirely would otherwise let
    // downstream completion gates pass with zero evidence on disk.
    const screenMap = isRecord(candidate.screenEvidenceByCandidate)
      ? candidate.screenEvidenceByCandidate
      : null;
    if (screenMap === null) {
      issues.push(
        makeSchemaIssue(
          root,
          evidencePath,
          `${prefix}.screenEvidenceByCandidate must be an object keyed by candidateId.`,
        ),
      );
    }
    const reviewMap = isRecord(candidate.evaluatorReviewRefsByCandidate)
      ? candidate.evaluatorReviewRefsByCandidate
      : null;
    if (reviewMap === null) {
      issues.push(
        makeSchemaIssue(
          root,
          evidencePath,
          `${prefix}.evaluatorReviewRefsByCandidate must be an object keyed by candidateId.`,
        ),
      );
    }
    for (const candidateId of candidateIds) {
      if (screenMap) {
        const screens = screenMap[candidateId];
        if (!Array.isArray(screens) || screens.length === 0) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.screenEvidenceByCandidate.${candidateId} must be a non-empty array of screen artifact refs.`,
            ),
          );
        }
      }
      if (reviewMap) {
        const reviewRef = reviewMap[candidateId];
        if (typeof reviewRef !== "string" || reviewRef.trim().length === 0) {
          issues.push(
            makeSchemaIssue(
              root,
              evidencePath,
              `${prefix}.evaluatorReviewRefsByCandidate.${candidateId} must be a non-empty string.`,
            ),
          );
        }
      }
    }

    if (typeof candidate.allAxesPerfect100 !== "boolean") {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.allAxesPerfect100 must be a boolean.`),
      );
    } else {
      latestPerfect100 = candidate.allAxesPerfect100;
    }
  }

  for (const [index, cycle] of polishCycles.entries()) {
    const prefix = `polishCycles[${index}]`;
    if (!isRecord(cycle)) {
      issues.push(makeSchemaIssue(root, evidencePath, `${prefix} must be an object.`));
      continue;
    }
    issues.push(
      ...validateLifecycleCommitSha(root, evidencePath, prefix, cycle.commitSha, seenCommitShas),
    );
    if (typeof cycle.cycle !== "number" || !Number.isInteger(cycle.cycle) || cycle.cycle <= 0) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.cycle must be a positive integer.`),
      );
    }
    if (
      typeof cycle.kind !== "string" ||
      !["polish", "branch", "reviewer_gate", "completed"].includes(cycle.kind)
    ) {
      issues.push(
        makeSchemaIssue(
          root,
          evidencePath,
          `${prefix}.kind must be polish|branch|reviewer_gate|completed.`,
        ),
      );
    }
    if (
      typeof cycle.evaluatorReviewRef !== "string" ||
      cycle.evaluatorReviewRef.trim().length === 0
    ) {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.evaluatorReviewRef must be non-empty.`),
      );
    }
    if (typeof cycle.allAxesPerfect100 !== "boolean") {
      issues.push(
        makeSchemaIssue(root, evidencePath, `${prefix}.allAxesPerfect100 must be a boolean.`),
      );
    } else {
      latestPerfect100 = cycle.allAxesPerfect100;
    }
    if (cycle.kind === "polish") {
      completedPolishCount += 1;
      if (typeof cycle.breakthroughRef === "string" && cycle.breakthroughRef.trim().length > 0) {
        polishWithBreakthroughCheck = true;
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

  if (completionClaimed) {
    if (!latestPerfect100) {
      issues.push(
        issue(
          "QFAI-PROT-287",
          "Completion requires every reviewer to score every evaluation axis at 100.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.perfect100",
          undefined,
          "canonical",
          "completionClaimed/completed を記録する前に、最新 round または polish cycle の allAxesPerfect100 を true にしてください。",
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
          "Completion requires at least one completed post-selection polish cycle.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.postSelectionPolish",
          undefined,
          "canonical",
          "postSelectionPolishCount >= 1 とし、polish cycle を少なくとも 1 件記録してください。",
        ),
      );
    }
    if (!polishWithBreakthroughCheck) {
      issues.push(
        issue(
          "QFAI-PROT-286",
          "Completion requires a polish cycle with breakthrough evidence.",
          "error",
          path.relative(root, evidencePath).replace(/\\/g, "/"),
          "prototypingEvidence.postSelectionPolish",
          undefined,
          "canonical",
          "polish cycle に breakthroughRef を記録してください。",
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
  if (!latestPerfect100 && polishCycles.length < maxIterations) {
    issues.push(
      issue(
        "QFAI-PROT-282",
        `mode=${mode.effective} has not reached all-reviewer-axes-perfect-100 and has remaining polish cycles.`,
        "warning",
        path.relative(root, evidencePath).replace(/\\/g, "/"),
        "prototypingEvidence.convergence",
        [String(polishCycles.length), String(maxIterations)],
        "canonical",
        "全 reviewer / 全 axis が 100 点に達していないため、mode 上限に達するまで polish cycle を継続してください。",
      ),
    );
  }

  return issues;
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

function validateLifecycleCommitSha(
  root: string,
  evidencePath: string,
  prefix: string,
  value: unknown,
  seenCommitShas: Map<string, string>,
): Issue[] {
  const relPath = path.relative(root, evidencePath).replace(/\\/g, "/");
  if (typeof value !== "string" || !COMMIT_SHA_PATTERN.test(value)) {
    return [
      issue(
        "QFAI-PROT-337",
        `${prefix}.commitSha must be a 40-character git commit SHA.`,
        "error",
        relPath,
        "prototypingEvidence.commitSha",
        undefined,
        "canonical",
        "各 exploration round / polish cycle の完了後に git commit し、その SHA を commitSha に記録してください。",
      ),
    ];
  }

  const normalized = value.toLowerCase();
  const previous = seenCommitShas.get(normalized);
  if (previous) {
    return [
      issue(
        "QFAI-PROT-338",
        `${prefix}.commitSha duplicates ${previous}.commitSha; each prototyping round/cycle must have its own commit.`,
        "error",
        relPath,
        "prototypingEvidence.commitSha",
        [previous, prefix],
        "canonical",
        "各回転ごとに別の git commit を作成し、重複しない commitSha を記録してください。",
      ),
    ];
  }

  seenCommitShas.set(normalized, prefix);
  return [];
}

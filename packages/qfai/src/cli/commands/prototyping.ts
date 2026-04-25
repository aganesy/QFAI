import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { readUiContractScreenContracts } from "../../core/contracts/screenContracts.js";
import { buildAbsorptionPlan } from "../../core/prototyping/absorptionBuilder.js";
import { parseCandidateIds } from "../../core/prototyping/candidate.js";
import { candidateConceptPath } from "../../core/prototyping/candidateConcept.js";
import { buildHarvestRecord, type HarvestRecord } from "../../core/prototyping/harvestBuilder.js";
import {
  writeRoundReviewBundle,
  type RoundReviewBundle,
} from "../../core/prototyping/reviewBundle.js";
import {
  isAbsorptionRound,
  isHarvestableExplorationRound,
  nextExplorationRound,
  previousExplorationRound,
  roundAbsorptionPlanPath,
  roundEvaluatorReviewPath,
  roundHarvestPath,
  roundNarrowDecisionPath,
  roundReimplementationPath,
  roundReviewBundlePath,
  ROUND_SURVIVOR_COUNT,
  type AbsorptionRound,
  type ExplorationRound,
  type HarvestableExplorationRound,
} from "../../core/prototyping/round.js";
import type { PrototypingMode } from "../../core/review/prototyping.js";
import { error, info } from "../lib/logger.js";

export type RunPrototypingCommandOptions = {
  root: string;
  action:
    | "round-start"
    | "round-harvest"
    | "round-narrow"
    | "round-absorb"
    | "round-reimplement-verify";
  targetUrl?: string | undefined;
  mode: PrototypingMode;
  round: ExplorationRound;
  candidates?: string[] | undefined;
  survivors?: string[] | undefined;
};

export async function runPrototypingCommand(
  options: RunPrototypingCommandOptions,
): Promise<number> {
  switch (options.action) {
    case "round-start":
      return runRoundStart(options);
    case "round-harvest":
      return runRoundHarvest(options);
    case "round-narrow":
      return runRoundNarrow(options);
    case "round-absorb":
      return runRoundAbsorb(options);
    case "round-reimplement-verify":
      return runRoundReimplementVerify(options);
  }
}

async function runRoundStart(options: RunPrototypingCommandOptions): Promise<number> {
  if (!options.targetUrl) {
    error("qfai prototyping round-start: --target-url is required.");
    return 2;
  }
  const candidateIds = parseRequiredCandidateIds(options.action, options.candidates);
  if (!candidateIds) {
    return 2;
  }
  if (candidateIds.length !== ROUND_SURVIVOR_COUNT[options.round]) {
    error(
      `qfai prototyping round-start: round ${options.round} requires ${ROUND_SURVIVOR_COUNT[options.round]} candidates.`,
    );
    return 2;
  }
  const configResult = await loadConfig(options.root);

  const screens = await readUiContractScreenContracts(
    options.root,
    configResult.config.paths.contractsDir,
  );

  if (screens.length === 0) {
    error(
      `qfai prototyping round-start: no screens declared under ${configResult.config.paths.contractsDir}/ui/*.yaml. ` +
        "Add at least one UI contract with screens[] before generating round artifacts.",
    );
    return 2;
  }

  const result = await writeRoundReviewBundle({
    root: options.root,
    targetUrl: options.targetUrl,
    mode: options.mode,
    round: options.round,
    candidateIds,
    screens,
  });

  info(
    `qfai prototyping round-start: wrote review-bundle + command plans ` +
      `for ${candidateIds.length} candidates across ${screens.length} screens ` +
      `(round=${options.round}, mode=${options.mode}, targetUrl=${options.targetUrl}).`,
  );
  info(`- review-bundle: ${result.reviewBundlePath}`);
  info(`- command-plans: ${result.commandPlanPath}`);

  return 0;
}

async function runRoundHarvest(options: RunPrototypingCommandOptions): Promise<number> {
  if (!isHarvestableExplorationRound(options.round)) {
    error(`qfai prototyping round-harvest: ${options.round} does not support harvest.`);
    return 2;
  }

  const reviewBundle = await readRoundReviewBundleFile(options.root, options.round);
  if (!reviewBundle) {
    error(
      `qfai prototyping round-harvest: missing or invalid ${roundReviewBundlePath(options.round)}.`,
    );
    return 2;
  }

  for (const candidate of reviewBundle.candidates) {
    const reviewPath = path.join(
      options.root,
      ...roundEvaluatorReviewPath(options.round, candidate.candidateId).split("/"),
    );
    const parsed = await readJsonFile(reviewPath);
    if (!parsed || parsed.candidateId !== candidate.candidateId || parsed.round !== options.round) {
      error(
        `qfai prototyping round-harvest: evaluator review missing or invalid for ${candidate.candidateId}.`,
      );
      return 2;
    }
  }

  const harvest = buildHarvestRecord({
    fromRound: options.round,
    allCandidatesConsidered: reviewBundle.candidates.map((candidate) => candidate.candidateId),
  });
  const harvestPath = path.join(options.root, ...roundHarvestPath(options.round).split("/"));
  await mkdir(path.dirname(harvestPath), { recursive: true });
  await writeFile(harvestPath, `${JSON.stringify(harvest, null, 2)}\n`, "utf-8");

  info(
    `qfai prototyping round-harvest: wrote harvest template for ${harvest.allCandidatesConsidered.length} candidates.`,
  );
  info(`- harvest: ${harvestPath}`);
  return 0;
}

async function runRoundNarrow(options: RunPrototypingCommandOptions): Promise<number> {
  if (!isHarvestableExplorationRound(options.round)) {
    error(`qfai prototyping round-narrow: ${options.round} does not support narrowing.`);
    return 2;
  }

  const survivors = parseRequiredCandidateIds(options.action, options.survivors);
  if (!survivors) {
    return 2;
  }

  const harvest = await readHarvestRecord(options.root, options.round);
  if (!harvest) {
    error(`qfai prototyping round-narrow: missing or invalid ${roundHarvestPath(options.round)}.`);
    return 2;
  }

  const nextRound = nextExplorationRound(options.round);
  const expectedSurvivors = ROUND_SURVIVOR_COUNT[nextRound];
  if (survivors.length !== expectedSurvivors) {
    error(
      `qfai prototyping round-narrow: ${options.round} -> ${nextRound} requires ${expectedSurvivors} survivors.`,
    );
    return 2;
  }

  const allCandidates = new Set(harvest.allCandidatesConsidered);
  if (survivors.some((candidateId) => !allCandidates.has(candidateId))) {
    error("qfai prototyping round-narrow: survivors must be a subset of harvested candidates.");
    return 2;
  }

  const droppedCandidateIds = harvest.allCandidatesConsidered.filter(
    (candidateId) => !survivors.includes(candidateId),
  );
  const narrowDecision = {
    schemaVersion: "2.0" as const,
    fromRound: options.round,
    toRound: nextRound,
    allCandidatesConsidered: harvest.allCandidatesConsidered,
    survivorCandidateIds: survivors,
    droppedCandidateIds,
  };
  const narrowPath = path.join(options.root, ...roundNarrowDecisionPath(options.round).split("/"));
  await mkdir(path.dirname(narrowPath), { recursive: true });
  await writeFile(narrowPath, `${JSON.stringify(narrowDecision, null, 2)}\n`, "utf-8");

  info(`qfai prototyping round-narrow: recorded ${survivors.length} survivors for ${nextRound}.`);
  info(`- narrow-decision: ${narrowPath}`);
  return 0;
}

async function runRoundAbsorb(options: RunPrototypingCommandOptions): Promise<number> {
  if (!isAbsorptionRound(options.round)) {
    error(`qfai prototyping round-absorb: ${options.round} does not support absorption.`);
    return 2;
  }

  const survivors = parseRequiredCandidateIds(options.action, options.survivors);
  if (!survivors) {
    return 2;
  }

  const expectedSurvivors = ROUND_SURVIVOR_COUNT[options.round];
  if (survivors.length !== expectedSurvivors) {
    error(
      `qfai prototyping round-absorb: ${options.round} requires ${expectedSurvivors} survivors.`,
    );
    return 2;
  }

  const previousRound = previousExplorationRound(options.round);
  const harvest = await readHarvestRecord(options.root, previousRound);
  if (!harvest) {
    error(`qfai prototyping round-absorb: missing or invalid ${roundHarvestPath(previousRound)}.`);
    return 2;
  }

  const allCandidates = new Set(harvest.allCandidatesConsidered);
  if (survivors.some((candidateId) => !allCandidates.has(candidateId))) {
    error("qfai prototyping round-absorb: survivors must be a subset of harvested candidates.");
    return 2;
  }

  const absorptionPlan = buildAbsorptionPlan({
    round: options.round,
    harvest,
    harvestRef: roundHarvestPath(previousRound),
    survivors,
    targetConceptRefs: Object.fromEntries(
      survivors.map((candidateId) => [
        candidateId,
        candidateConceptPath(options.round, candidateId),
      ]),
    ),
  });

  const absorptionPath = path.join(
    options.root,
    ...roundAbsorptionPlanPath(options.round).split("/"),
  );
  await mkdir(path.dirname(absorptionPath), { recursive: true });
  await writeFile(absorptionPath, `${JSON.stringify(absorptionPlan, null, 2)}\n`, "utf-8");

  info(
    `qfai prototyping round-absorb: wrote absorption plan for ${survivors.length} survivors at ${options.round}.`,
  );
  info(`- absorption-plan: ${absorptionPath}`);
  return 0;
}

async function runRoundReimplementVerify(options: RunPrototypingCommandOptions): Promise<number> {
  if (!isAbsorptionRound(options.round)) {
    error(
      `qfai prototyping round-reimplement-verify: ${options.round} does not support reimplementation verification.`,
    );
    return 2;
  }

  const reimplementationPath = path.join(
    options.root,
    ...roundReimplementationPath(options.round).split("/"),
  );
  const record = await readJsonFile(reimplementationPath);
  if (!isValidReimplementationRecord(record, options.round)) {
    error(
      `qfai prototyping round-reimplement-verify: invalid reimplementation record at ${roundReimplementationPath(options.round)}.`,
    );
    return 2;
  }

  info(
    `qfai prototyping round-reimplement-verify: ${roundReimplementationPath(options.round)} is structurally valid.`,
  );
  return 0;
}

function parseRequiredCandidateIds(
  action: RunPrototypingCommandOptions["action"],
  values: string[] | undefined,
) {
  if (!values || values.length === 0) {
    error(`qfai prototyping ${action}: candidate list is required.`);
    return null;
  }
  try {
    return parseCandidateIds(values);
  } catch (caught) {
    error(
      caught instanceof Error
        ? `qfai prototyping ${action}: ${caught.message}`
        : `qfai prototyping ${action}: invalid candidate IDs.`,
    );
    return null;
  }
}

async function readRoundReviewBundleFile(
  root: string,
  round: ExplorationRound,
): Promise<RoundReviewBundle | null> {
  const reviewBundlePath = path.join(root, ...roundReviewBundlePath(round).split("/"));
  const parsed = await readJsonFile(reviewBundlePath);
  if (
    !parsed ||
    parsed.spec !== "0017" ||
    parsed.round !== round ||
    !Array.isArray(parsed.candidates)
  ) {
    return null;
  }

  return parsed as RoundReviewBundle;
}

async function readHarvestRecord(
  root: string,
  round: HarvestableExplorationRound,
): Promise<HarvestRecord | null> {
  const harvestPath = path.join(root, ...roundHarvestPath(round).split("/"));
  const parsed = await readJsonFile(harvestPath);
  if (
    !parsed ||
    parsed.schemaVersion !== "2.0" ||
    parsed.fromRound !== round ||
    !Array.isArray(parsed.allCandidatesConsidered)
  ) {
    return null;
  }

  return parsed as HarvestRecord;
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isValidReimplementationRecord(
  record: Record<string, unknown> | null,
  round: AbsorptionRound,
): boolean {
  if (
    !record ||
    record.schemaVersion !== "2.0" ||
    record.round !== round ||
    typeof record.absorptionPlanRef !== "string" ||
    record.absorptionPlanRef.trim().length === 0 ||
    !Array.isArray(record.candidateChanges)
  ) {
    return false;
  }

  return record.candidateChanges.every((candidateChange) => {
    if (!isRecord(candidateChange)) {
      return false;
    }
    return (
      typeof candidateChange.candidateId === "string" &&
      Array.isArray(candidateChange.changedScreens) &&
      candidateChange.changedScreens.every((screen) => typeof screen === "string") &&
      typeof candidateChange.diffSummary === "string" &&
      candidateChange.diffSummary.trim().length > 0 &&
      typeof candidateChange.codeChangeEvidenceRef === "string" &&
      candidateChange.codeChangeEvidenceRef.trim().length > 0
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

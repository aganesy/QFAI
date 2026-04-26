import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { ABSORPTION_ROUNDS, roundEvaluatorReviewsDir } from "../prototyping/round.js";
import type { AbsorptionRound } from "../prototyping/round.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const ISSUE_CODE = "QFAI-PROT-AXIS-FLOOR-001";
const RULE = "evaluatorReviewHardFloor.perAxisScore";

type FileReadResult =
  | { kind: "missing" }
  | { kind: "invalid" }
  | { kind: "ok"; value: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPosixRelative(root: string, target: string): string {
  return path.relative(root, target).replace(/\\/g, "/");
}

async function readYamlObject(filePath: string): Promise<FileReadResult> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { kind: "missing" };
    }
    return { kind: "invalid" };
  }
  try {
    const parsed: unknown = parseYaml(raw);
    return isRecord(parsed) ? { kind: "ok", value: parsed } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

async function readJsonObject(filePath: string): Promise<FileReadResult> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { kind: "missing" };
    }
    return { kind: "invalid" };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? { kind: "ok", value: parsed } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

function loadHardFloors(rubric: Record<string, unknown>): Map<string, number> {
  const map = new Map<string, number>();
  const entries = rubric.hard_floors;
  if (!Array.isArray(entries)) {
    return map;
  }
  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
    }
    const id = entry.id;
    const minScore = entry.min_score;
    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      typeof minScore !== "number" ||
      !Number.isFinite(minScore)
    ) {
      continue;
    }
    map.set(id, minScore);
  }
  return map;
}

async function listCandidateReviewFiles(
  reviewsDirAbsolute: string,
): Promise<string[] | null> {
  try {
    const names = await readdir(reviewsDirAbsolute);
    return names.filter((name) => name.endsWith(".json"));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function extractCandidateId(fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

function evaluatePerAxis(
  review: Record<string, unknown>,
  hardFloors: Map<string, number>,
): Array<{ axisId: string; score: number; minScore: number }> {
  const perAxis = review.perAxis;
  if (!Array.isArray(perAxis)) {
    return [];
  }
  const violations: Array<{ axisId: string; score: number; minScore: number }> = [];
  for (const axis of perAxis) {
    if (!isRecord(axis)) {
      continue;
    }
    const axisId = axis.axisId;
    const score = axis.score;
    if (
      typeof axisId !== "string" ||
      axisId.trim().length === 0 ||
      typeof score !== "number" ||
      !Number.isFinite(score)
    ) {
      continue;
    }
    const minScore = hardFloors.get(axisId);
    if (minScore === undefined) {
      continue;
    }
    if (score < minScore) {
      violations.push({ axisId, score, minScore });
    }
  }
  return violations;
}

async function checkRound(
  root: string,
  round: AbsorptionRound,
  hardFloors: Map<string, number>,
): Promise<Issue[]> {
  const reviewsDirRelative = roundEvaluatorReviewsDir(round);
  const reviewsDirAbsolute = path.join(root, reviewsDirRelative);
  const files = await listCandidateReviewFiles(reviewsDirAbsolute);
  if (files === null || files.length === 0) {
    return [];
  }
  const issues: Issue[] = [];
  for (const fileName of files) {
    const candidateId = extractCandidateId(fileName);
    const reviewPathAbsolute = path.join(reviewsDirAbsolute, fileName);
    const result = await readJsonObject(reviewPathAbsolute);
    if (result.kind !== "ok") {
      continue;
    }
    const violations = evaluatePerAxis(result.value, hardFloors);
    const reviewPathRelative = toPosixRelative(root, reviewPathAbsolute);
    for (const violation of violations) {
      issues.push(
        issue(
          ISSUE_CODE,
          `Candidate ${candidateId} axis ${violation.axisId} score ${violation.score} is below hard_floors min_score ${violation.minScore} in round ${round}.`,
          "error",
          reviewPathRelative,
          RULE,
          [round, candidateId, violation.axisId, String(violation.score), String(violation.minScore)],
          "canonical",
          `${reviewPathRelative} の ${violation.axisId} スコアを再評価し、hard_floors[].min_score (${violation.minScore}) 以上にしてください。`,
        ),
      );
    }
  }
  return issues;
}

export async function validateEvaluatorReviewHardFloor(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return [];
  }
  const rubricPath = path.join(
    root,
    config.paths.contractsDir,
    "design",
    "evaluation-rubric.yaml",
  );
  const rubric = await readYamlObject(rubricPath);
  if (rubric.kind !== "ok") {
    return [];
  }
  const hardFloors = loadHardFloors(rubric.value);
  if (hardFloors.size === 0) {
    return [];
  }
  const issues: Issue[] = [];
  for (const round of ABSORPTION_ROUNDS) {
    const roundIssues = await checkRound(root, round, hardFloors);
    issues.push(...roundIssues);
  }
  return issues;
}

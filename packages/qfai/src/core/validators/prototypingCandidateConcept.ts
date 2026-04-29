import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { readUiContractScreenContracts } from "../contracts/screenContracts.js";
import { EXPLORATION_ROUNDS, roundReviewBundlePath } from "../prototyping/round.js";
import type { CandidateId } from "../prototyping/candidate.js";
import type { ExplorationRound } from "../prototyping/round.js";
import type { Issue } from "../types.js";
import { issue } from "./utils.js";

const VALID_TEMPLATE_USAGE = new Set(["none", "reference-only", "implementation-seed"]);
const PLACEHOLDER_RE = /^(?:tbd|todo|n\/a|none|placeholder|example|lorem|to be defined)$/i;

type CandidateConceptRecord = {
  schemaVersion?: unknown;
  candidateId?: unknown;
  round?: unknown;
  statement?: unknown;
  designThesis?: unknown;
  referenceLineage?: unknown;
  templateSeedUsage?: unknown;
  antiTemplateConstraints?: unknown;
  noveltyBet?: unknown;
};

type RoundBundle = {
  candidates?: unknown;
};

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).replace(/\\/g, "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasMeaningful(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 && !PLACEHOLDER_RE.test(normalized);
  }
  if (Array.isArray(value)) {
    return value.some(hasMeaningful);
  }
  return false;
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf-8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function conceptPath(round: ExplorationRound, candidateId: CandidateId): string {
  return path.join(
    ".qfai",
    "evidence",
    "prototyping",
    "rounds",
    round,
    "candidates",
    candidateId,
    "concept.json",
  );
}

function conceptIssue(root: string, filePath: string, message: string, refs: string[] = []): Issue {
  return issue(
    "QFAI-PROT-CONCEPT-001",
    message,
    "error",
    toPosixRelative(root, filePath),
    "prototypingCandidateConcept.requiredField",
    refs,
    "canonical",
    "Write a complete candidate concept with designThesis, referenceLineage, templateSeedUsage, antiTemplateConstraints, and noveltyBet.",
  );
}

function validateConceptShape(
  root: string,
  filePath: string,
  round: ExplorationRound,
  candidateId: CandidateId,
  concept: CandidateConceptRecord,
): Issue[] {
  const issues: Issue[] = [];
  if (concept.schemaVersion !== "2.0") {
    issues.push(conceptIssue(root, filePath, "candidate concept schemaVersion must be 2.0."));
  }
  if (concept.candidateId !== candidateId || concept.round !== round) {
    issues.push(
      conceptIssue(
        root,
        filePath,
        `candidate concept identity must match ${round}/${candidateId}.`,
      ),
    );
  }
  for (const key of ["statement", "designThesis", "noveltyBet"] as const) {
    if (!hasMeaningful(concept[key])) {
      issues.push(conceptIssue(root, filePath, `candidate concept is missing ${key}.`));
    }
  }
  if (!Array.isArray(concept.referenceLineage) || !concept.referenceLineage.some(hasMeaningful)) {
    issues.push(conceptIssue(root, filePath, "candidate concept needs referenceLineage[]."));
  }
  if (
    typeof concept.templateSeedUsage !== "string" ||
    !VALID_TEMPLATE_USAGE.has(concept.templateSeedUsage)
  ) {
    issues.push(conceptIssue(root, filePath, "candidate concept has invalid templateSeedUsage."));
  }
  if (
    concept.templateSeedUsage !== "none" &&
    (!Array.isArray(concept.antiTemplateConstraints) ||
      !concept.antiTemplateConstraints.some(hasMeaningful))
  ) {
    issues.push(
      conceptIssue(
        root,
        filePath,
        "template-seeded candidate concept requires antiTemplateConstraints[].",
      ),
    );
  }
  return issues;
}

async function validateRound(root: string, round: ExplorationRound): Promise<Issue[]> {
  const bundlePath = path.join(root, ...roundReviewBundlePath(round).split("/"));
  const bundle = (await readJsonObject(bundlePath)) as RoundBundle | null;
  if (!bundle || !Array.isArray(bundle.candidates)) {
    return [];
  }

  const issues: Issue[] = [];
  const r5Theses = new Map<string, string>();
  for (const entry of bundle.candidates) {
    if (!isRecord(entry) || typeof entry.candidateId !== "string") {
      continue;
    }
    const candidateId = entry.candidateId as CandidateId;
    const filePath = path.join(root, conceptPath(round, candidateId));
    const concept = (await readJsonObject(filePath)) as CandidateConceptRecord | null;
    if (!concept) {
      issues.push(
        conceptIssue(
          root,
          filePath,
          `candidate concept is missing or invalid for ${round}/${candidateId}.`,
          [round, candidateId],
        ),
      );
      continue;
    }
    issues.push(...validateConceptShape(root, filePath, round, candidateId, concept));
    if (round === "r5" && typeof concept.designThesis === "string") {
      const normalized = concept.designThesis.trim().toLowerCase();
      const previous = r5Theses.get(normalized);
      if (previous) {
        issues.push(
          conceptIssue(
            root,
            filePath,
            `r5 candidates must not share the same designThesis (${previous} and ${candidateId}).`,
            ["r5", previous, candidateId],
          ),
        );
      } else if (normalized.length > 0) {
        r5Theses.set(normalized, candidateId);
      }
    }
  }
  return issues;
}

export async function validatePrototypingCandidateConcept(
  root: string,
  config: QfaiConfig,
): Promise<Issue[]> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return [];
  }

  const issues: Issue[] = [];
  for (const round of EXPLORATION_ROUNDS) {
    issues.push(...(await validateRound(root, round)));
  }
  return issues;
}

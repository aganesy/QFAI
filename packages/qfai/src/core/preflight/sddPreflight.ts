import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";
import type { Issue } from "../types.js";
import { validatePrototypingRecommendation } from "../validators/prototypingRecommendation.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;

export type SddPreflightSource = "discussion-pack";
export type SddPreflightStatus = "ready" | "blocked";

export type RunSddPreflightOptions = {
  assumptions?: string[];
};

export type SddPreflightResult = {
  status: SddPreflightStatus;
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  openQuestions: string[];
  blockers: string[];
  nextCommands: string[];
  preflightSummaryPath: string;
};

export async function runSddPreflight(
  root: string,
  config: QfaiConfig,
  options: RunSddPreflightOptions = {},
): Promise<SddPreflightResult> {
  const discussionRoot = resolvePath(root, config, "discussionDir");
  const reportRoot = resolvePath(root, config, "outDir");
  const summaryPath = path.join(reportRoot, "preflight_summary.md");

  await mkdir(reportRoot, { recursive: true });

  const readiness = await inspectLatestDiscussionPack(discussionRoot);
  const nextCommands = ["/qfai-discussion"];
  const carryOverOpenQuestions = normalizeTextList(options.assumptions);
  const blockers = resolvePreflightBlockers(readiness);

  // W-1: schema-validity gate — invalid prototyping.yaml blocks preflight
  const recommendationBlockers = await resolveRecommendationBlockers(root, config);
  blockers.push(...recommendationBlockers);

  if (blockers.length > 0) {
    await writeFile(
      summaryPath,
      `${buildBlockedPreflightSummary({
        selectedDiscussionPack: readiness.latestPackDir,
        blockers,
        nextCommands,
      })}\n`,
      "utf-8",
    );

    return {
      status: "blocked",
      source: "discussion-pack",
      selectedInputPath: readiness.latestPackDir,
      importedReqCount: null,
      openQuestions: carryOverOpenQuestions,
      blockers,
      nextCommands,
      preflightSummaryPath: summaryPath,
    };
  }

  const selectedInputPath = readiness.latestPackDir;
  const reqPath = selectedInputPath === null ? null : path.join(selectedInputPath, "06_REQ.md");
  const reqText = reqPath ? await readSafe(reqPath) : "";
  const reqCount = countReqIds(reqText);

  await writeFile(
    summaryPath,
    `${buildReadyPreflightSummary({
      selectedDiscussionPack: selectedInputPath,
      importedReqCount: reqCount,
      openQuestions: carryOverOpenQuestions,
    })}\n`,
    "utf-8",
  );

  return {
    status: "ready",
    source: "discussion-pack",
    selectedInputPath,
    importedReqCount: reqCount,
    openQuestions: carryOverOpenQuestions,
    blockers: [],
    nextCommands,
    preflightSummaryPath: summaryPath,
  };
}

function resolvePreflightBlockers(readiness: {
  latestPackDir: string | null;
  dangerousPackNames: string[];
  missingFiles: string[];
  missingSideArtifacts: string[];
  incompleteFiles: string[];
  blockingOqIds: string[];
  prototypingRequired: boolean;
}): string[] {
  const blockers: string[] = [];

  if (!readiness.latestPackDir) {
    blockers.push(
      "latest discussion-pack が見つかりません（`.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/` を作成してください）。",
    );
  }

  if (readiness.dangerousPackNames.length > 0) {
    blockers.push(
      `discussion 配下に命名不正の discussion-* が存在します: ${readiness.dangerousPackNames.join(", ")}`,
    );
  }

  if (readiness.missingFiles.length > 0 || readiness.missingSideArtifacts.length > 0) {
    const fileMissing = [...readiness.missingFiles];
    const sideArtifactMissing = [...readiness.missingSideArtifacts];

    if (fileMissing.length > 0) {
      blockers.push(`必須ファイル不足: ${fileMissing.join(", ")}`);
    }
    if (sideArtifactMissing.length > 0) {
      const message = readiness.prototypingRequired
        ? `latest UI-bearing discussion pack is missing ${sideArtifactMissing.join(", ")}`
        : `必須 side artifact 不足: ${sideArtifactMissing.join(", ")}`;
      blockers.push(message);
    }
  }

  if (readiness.incompleteFiles.length > 0) {
    blockers.push(`最小内容を満たしていないファイル: ${readiness.incompleteFiles.join(", ")}`);
  }

  if (readiness.blockingOqIds.length > 0) {
    blockers.push(`Blocking OQ（Disposition=open）: ${readiness.blockingOqIds.join(", ")}`);
  }

  return blockers;
}

function buildBlockedPreflightSummary(input: {
  selectedDiscussionPack: string | null;
  blockers: string[];
  nextCommands: string[];
}): string {
  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: blocked",
    `- latest discussion-pack: ${input.selectedDiscussionPack ?? "(not found)"}`,
    "",
    "## Blockers",
    "",
    ...input.blockers.map((item) => `- ${item}`),
    "",
    "## Next Commands",
    "",
    ...input.nextCommands.map((command) => `- ${command}`),
  ].join("\n");
}

function buildReadyPreflightSummary(input: {
  selectedDiscussionPack: string | null;
  importedReqCount: number;
  openQuestions: string[];
}): string {
  const openQuestions =
    input.openQuestions.length > 0 ? input.openQuestions.map((item) => `- ${item}`) : ["- none"];

  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: ready",
    "- source: discussion-pack",
    `- selected discussion-pack: ${input.selectedDiscussionPack ?? "(unknown)"}`,
    "",
    "## Requirement Intake",
    "",
    `- Imported REQ count: ${input.importedReqCount}`,
    "",
    "## Open Questions (Carry-over)",
    "",
    ...openQuestions,
  ].join("\n");
}

function normalizeTextList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

function countReqIds(text: string): number {
  const matcher = new RegExp(REQ_ID_RE.source, REQ_ID_RE.flags);
  return Array.from(text.matchAll(matcher)).length;
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

async function resolveRecommendationBlockers(root: string, config: QfaiConfig): Promise<string[]> {
  const issues = await validatePrototypingRecommendation(root, config);
  const errorIssues = issues.filter((issue) => issue.severity === "error");
  if (errorIssues.length === 0) {
    return [];
  }
  return [formatRecommendationBlocker(errorIssues)];
}

function summarizeIssueCodes(issues: Issue[]): string[] {
  return Array.from(new Set(issues.map((issue) => issue.code)));
}

function formatRecommendationBlocker(issues: Issue[]): string {
  const codes = summarizeIssueCodes(issues);
  return `latest discussion pack の prototyping.yaml が schema-invalid です: ${codes.join(", ")}`;
}

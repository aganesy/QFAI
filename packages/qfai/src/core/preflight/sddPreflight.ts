import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestRequirePack } from "../requirePack.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;

export type SddPreflightSource = "require-pack";
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
  const requireRoot = resolvePath(root, config, "requireDir");
  const reportRoot = resolvePath(root, config, "outDir");
  const summaryPath = path.join(reportRoot, "preflight_summary.md");

  await mkdir(reportRoot, { recursive: true });

  const readiness = await inspectLatestRequirePack(requireRoot);
  const nextCommands = ["/qfai-require", "/qfai-discuss"];
  const carryOverOpenQuestions = normalizeTextList(options.assumptions);
  const blockers = resolvePreflightBlockers(readiness);

  if (blockers.length > 0) {
    await writeFile(
      summaryPath,
      `${buildBlockedPreflightSummary({
        selectedRequirePack: readiness.latestPackDir,
        blockers,
        nextCommands,
      })}\n`,
      "utf-8",
    );

    return {
      status: "blocked",
      source: "require-pack",
      selectedInputPath: readiness.latestPackDir,
      importedReqCount: null,
      openQuestions: carryOverOpenQuestions,
      blockers,
      nextCommands,
      preflightSummaryPath: summaryPath,
    };
  }

  const selectedInputPath = readiness.latestPackDir;
  const reqPath = selectedInputPath === null ? null : path.join(selectedInputPath, "03_REQ.md");
  const reqText = reqPath ? await readSafe(reqPath) : "";
  const reqCount = countReqIds(reqText);

  await writeFile(
    summaryPath,
    `${buildReadyPreflightSummary({
      selectedRequirePack: selectedInputPath,
      importedReqCount: reqCount,
      openQuestions: carryOverOpenQuestions,
    })}\n`,
    "utf-8",
  );

  return {
    status: "ready",
    source: "require-pack",
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
  incompleteFiles: string[];
  blockingOqIds: string[];
}): string[] {
  const blockers: string[] = [];

  if (!readiness.latestPackDir) {
    blockers.push(
      "latest require-pack が見つかりません（`.qfai/require/require-YYYYMMDDhhmmssSSS/` を作成してください）。",
    );
  }

  if (readiness.dangerousPackNames.length > 0) {
    blockers.push(
      `require 配下に命名不正の require-* が存在します: ${readiness.dangerousPackNames.join(", ")}`,
    );
  }

  if (readiness.missingFiles.length > 0) {
    blockers.push(`必須ファイル不足: ${readiness.missingFiles.join(", ")}`);
  }

  if (readiness.incompleteFiles.length > 0) {
    blockers.push(`最小内容を満たしていないファイル: ${readiness.incompleteFiles.join(", ")}`);
  }

  if (readiness.blockingOqIds.length > 0) {
    blockers.push(
      `Blocking OQ（Disposition=open + Gate=discuss|require|sdd）: ${readiness.blockingOqIds.join(", ")}`,
    );
  }

  return blockers;
}

function buildBlockedPreflightSummary(input: {
  selectedRequirePack: string | null;
  blockers: string[];
  nextCommands: string[];
}): string {
  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: blocked",
    `- latest require-pack: ${input.selectedRequirePack ?? "(not found)"}`,
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
  selectedRequirePack: string | null;
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
    "- source: require-pack",
    `- selected require-pack: ${input.selectedRequirePack ?? "(unknown)"}`,
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

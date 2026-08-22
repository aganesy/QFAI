import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";
import { resolveImportLiteEntrypoint } from "./importLiteEvidence.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;

/**
 * `import-lite` is the entrypoint for a project that already carries specs but
 * never ran `/qfai-discussion`: Stage 0 records the input source as
 * `.qfai/evidence/import-lite-<timestamp>.md` instead, which is the same
 * artifact `QFAI-IMPLITE-001` accepts. Without it here, a consumer driving
 * Stage 0 through this public entrypoint stayed `blocked` forever on a project
 * the validator considered compliant.
 */
export type SddPreflightSource = "discussion-pack" | "import-lite";
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

  if (blockers.length > 0) {
    // `resolveImportLiteEntrypoint` gates the fallback to the shape the shipped
    // Stage 0 step describes: specs already exist and there is no discussion
    // pack at all (a pack that exists but is incomplete or misnamed still
    // blocks — evidence is an entrypoint, never an override).
    const importLiteEvidencePath = await resolveImportLiteEntrypoint(root, config);
    if (importLiteEvidencePath !== null) {
      return await completeReadyPreflight({
        source: "import-lite",
        selectedInputPath: importLiteEvidencePath,
        // The shipped template is an explicit pointer artifact, "not
        // requirement/spec SSOT", so it carries no REQ ids. Counting them would
        // report a confident `0` for a project whose requirements live in the
        // specs; the count is genuinely unknown on this path.
        importedReqCount: null,
        summaryPath,
        openQuestions: carryOverOpenQuestions,
        // `/qfai-discussion` is not the follow-up here — the input source is
        // already recorded, so the caller continues the SDD workflow.
        nextCommands: ["/qfai-sdd"],
      });
    }

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

  return await completeReadyPreflight({
    source: "discussion-pack",
    selectedInputPath,
    importedReqCount: countReqIds(reqPath === null ? "" : await readSafe(reqPath)),
    summaryPath,
    openQuestions: carryOverOpenQuestions,
    nextCommands,
  });
}

/**
 * Write the ready summary and return the result. Shared by both sources so
 * `preflight_summary.md` and the returned record cannot drift apart between
 * them. `importedReqCount: null` means "not countable from this input source"
 * and renders as `unknown` rather than a confident zero.
 */
async function completeReadyPreflight(input: {
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  summaryPath: string;
  openQuestions: string[];
  nextCommands: string[];
}): Promise<SddPreflightResult> {
  await writeFile(
    input.summaryPath,
    `${buildReadyPreflightSummary({
      source: input.source,
      selectedInputPath: input.selectedInputPath,
      importedReqCount: input.importedReqCount,
      openQuestions: input.openQuestions,
    })}\n`,
    "utf-8",
  );

  return {
    status: "ready",
    source: input.source,
    selectedInputPath: input.selectedInputPath,
    importedReqCount: input.importedReqCount,
    openQuestions: input.openQuestions,
    blockers: [],
    nextCommands: input.nextCommands,
    preflightSummaryPath: input.summaryPath,
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
        ? `UI-bearing discussion pack に必須 side artifact が不足しています: ${sideArtifactMissing.join(", ")}`
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
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  openQuestions: string[];
}): string {
  const openQuestions =
    input.openQuestions.length > 0 ? input.openQuestions.map((item) => `- ${item}`) : ["- none"];
  const inputLabel =
    input.source === "import-lite" ? "selected import-lite evidence" : "selected discussion-pack";

  return [
    "# Preflight Summary",
    "",
    "## Status",
    "",
    "- status: ready",
    `- source: ${input.source}`,
    `- ${inputLabel}: ${input.selectedInputPath ?? "(unknown)"}`,
    "",
    "## Requirement Intake",
    "",
    `- Imported REQ count: ${input.importedReqCount ?? "unknown"}`,
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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";
import { containsMermaidBlock } from "../validators/discussionPack.js";
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
  /**
   * Pack to judge. Defaults to the newest pack under the discussion root;
   * callers that honor `.qfai/state.json#discussion.currentId` pass the
   * pointed-at pack so an explicitly pinned (older) pack is the one gated.
   */
  packDir?: string;
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

  const readiness = await inspectLatestDiscussionPack(
    discussionRoot,
    options.packDir === undefined ? {} : { selectedPackDir: options.packDir },
  );
  const nextCommands = ["/qfai-discussion"];
  const carryOverOpenQuestions = normalizeTextList(options.assumptions);
  const blockers = resolvePreflightBlockers(readiness);
  blockers.push(...(await resolveStoryWorkshopBlockers(readiness.latestPackDir)));

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
        openQuestions: carryOverOpenQuestions,
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
  deferredWithoutDetails: string[];
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

  // `QFAI-DPACK-007` の preflight 側の等価判定。`validate --profile sdd` は
  // discussion validator を実行しないため、ここで止めないと deferred の根拠を
  // 欠いたまま Stage 1 以降へ進んでしまう。
  if (readiness.deferredWithoutDetails.length > 0) {
    blockers.push(
      `11_OQ-Register.md の deferred が 13_Deferred.md に存在しません: ${readiness.deferredWithoutDetails.join(", ")}`,
    );
  }

  return blockers;
}

/**
 * The preflight side of `QFAI-DPACK-008`.
 *
 * `03_Story-Workshop.md` owes a mermaid diagram, and the discussion validator
 * reports its absence at `error`. Stage 0 did not, and `validate --profile sdd`
 * does not run that validator — so prose of the right length cleared the one
 * gate standing between a pack with no flow and Stage 1. Read by the same
 * predicate as the validator, so the two cannot drift into two readings of
 * "has a diagram".
 */
async function resolveStoryWorkshopBlockers(packDir: string | null): Promise<string[]> {
  if (packDir === null) {
    // No pack at all is already a blocker, and there is nothing to read.
    return [];
  }
  const text = await readSafe(path.join(packDir, "03_Story-Workshop.md"));
  // An absent, unreadable or empty file is the missing-files / incomplete-files
  // blocker's finding — `readSafe` here returns `""` for all three. Reporting
  // it again would name one defect twice.
  if (text.length === 0 || containsMermaidBlock(text)) {
    return [];
  }
  return ["03_Story-Workshop.md に Mermaid diagram が見つかりません。"];
}

/**
 * A blocked run keeps the carry-over section too. The summary is the Stage 0
 * SSOT, so `--assume` findings (and carry-over read back from an earlier
 * summary) must survive a blocked re-run — dropping the section here would
 * erase the decision Stage 1 still has to promote.
 */
function buildBlockedPreflightSummary(input: {
  selectedDiscussionPack: string | null;
  blockers: string[];
  openQuestions: string[];
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
    "## Open Questions (Carry-over)",
    "",
    ...renderCarryOver(input.openQuestions),
    "",
    "## Next Commands",
    "",
    ...input.nextCommands.map((command) => `- ${command}`),
  ].join("\n");
}

function renderCarryOver(openQuestions: string[]): string[] {
  return openQuestions.length > 0 ? openQuestions.map((item) => `- ${item}`) : ["- none"];
}

function buildReadyPreflightSummary(input: {
  source: SddPreflightSource;
  selectedInputPath: string | null;
  importedReqCount: number | null;
  openQuestions: string[];
}): string {
  const openQuestions = renderCarryOver(input.openQuestions);
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

/**
 * Requirement intake は `06_REQ.md` が宣言した REQ の件数であり、
 * `REQ-NNNN` トークンの出現回数ではない。Description が兄弟要件を参照する
 * （`REQ-0001 に依存` 等）通常の書き方で件数が水増しされると、Stage 1 が
 * 照合に使う machine-computed 件数が壊れる。`REQ-ID` 列を持つ表があれば
 * その列の宣言行だけを数え、表を持たない pack では一意な ID を数える。
 */
function countReqIds(text: string): number {
  const fromTable = collectTableReqIds(text);
  if (fromTable.size > 0) {
    return fromTable.size;
  }
  return collectDistinctReqIds(text).size;
}

function collectTableReqIds(text: string): Set<string> {
  const ids = new Set<string>();
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index + 1 < lines.length; index += 1) {
    const headers = parseTableCells(lines[index] ?? "");
    const column = headers.findIndex((cell) => {
      const normalized = cell.toLowerCase().replace(/[^a-z0-9-]/g, "");
      return normalized === "req-id" || normalized === "reqid";
    });
    if (column < 0 || !isTableSeparator(lines[index + 1] ?? "", headers.length)) {
      continue;
    }

    for (let row = index + 2; row < lines.length; row += 1) {
      const cells = parseTableCells(lines[row] ?? "");
      if (cells.length === 0) {
        break;
      }
      const id = new RegExp(REQ_ID_RE.source).exec(cells[column] ?? "")?.[0];
      if (id !== undefined) {
        ids.add(id);
      }
    }
  }

  return ids;
}

function collectDistinctReqIds(text: string): Set<string> {
  const matcher = new RegExp(REQ_ID_RE.source, REQ_ID_RE.flags);
  return new Set(Array.from(text.matchAll(matcher), (match) => match[0]));
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return [];
  }
  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string, columnCount: number): boolean {
  const cells = parseTableCells(line);
  return cells.length === columnCount && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

async function readSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

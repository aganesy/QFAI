import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { inspectLatestDiscussionPack } from "../discussionPack.js";

const REQ_ID_RE = /\bREQ-\d{4}\b/g;

export type SddPreflightSource = "discussion-pack";
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

  if (blockers.length > 0) {
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
  selectedDiscussionPack: string | null;
  importedReqCount: number;
  openQuestions: string[];
}): string {
  const openQuestions = renderCarryOver(input.openQuestions);

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
    const column = headers.findIndex((cell) => /^req[-_\s]?id$/i.test(cell));
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

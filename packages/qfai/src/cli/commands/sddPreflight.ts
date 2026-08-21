/**
 * `qfai sdd preflight` — /qfai-sdd Stage 0 のゲートを実行する。
 *
 * 最新 discussion-pack の選択・取り込み `REQ-*` 件数・blocker 解決を
 * `runSddPreflight` に委ね、その結果を `<outDir>/preflight_summary.md` へ
 * 書き出す（書き出しは `runSddPreflight` 自身が行う）。skill 側がテンプレを
 * 手で埋める運用だと `status: ready` が自己申告になり、pack を実際に
 * 見つけたことの証拠にならない。本コマンドはその判定を機械側へ戻す。
 *
 * 終了コード: `status: "blocked"` で 1、`ready` で 0。`--fail-on never` の
 * ときのみ blocked でも 0 を返す（診断だけしたいケース用）。preflight は
 * warning 段を持たないため `--fail-on warning` は `error` と同義。
 */

import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { runSddPreflight, type SddPreflightResult } from "../../core/preflight/sddPreflight.js";
import { error as logError, info as logInfo } from "../lib/logger.js";

export type SddPreflightCommandOptions = {
  /** Project root (`.qfai/discussion` / `.qfai/report` resolve underneath). */
  root: string;
  /** Output format. Defaults to `text`. */
  format?: "text" | "json";
  /** Failure threshold. `never` keeps the exit code at 0 on blockers. */
  failOn?: "never" | "warning" | "error";
  /** Output sink. Defaults to the CLI logger (stdout). */
  write?: (message: string) => void;
  /** Error sink. Defaults to the CLI logger (stderr). */
  writeErr?: (message: string) => void;
};

function toRelative(root: string, target: string): string {
  const relative = path.relative(root, target);
  return (relative === "" ? target : relative).replace(/\\/g, "/");
}

function renderText(root: string, result: SddPreflightResult): string {
  const lines = [
    `qfai sdd preflight: status: ${result.status} (source: ${result.source})`,
    `  selected discussion-pack: ${result.selectedInputPath === null ? "(not found)" : toRelative(root, result.selectedInputPath)}`,
    `  imported REQ count: ${result.importedReqCount === null ? "(n/a)" : String(result.importedReqCount)}`,
  ];
  if (result.blockers.length > 0) {
    lines.push("  blockers:");
    for (const blocker of result.blockers) {
      lines.push(`    - ${blocker}`);
    }
  }
  if (result.nextCommands.length > 0) {
    lines.push("  next commands:");
    for (const command of result.nextCommands) {
      lines.push(`    - ${command}`);
    }
  }
  lines.push(`  summary: ${toRelative(root, result.preflightSummaryPath)}`);
  return lines.join("\n");
}

export async function runSddPreflightCommand(options: SddPreflightCommandOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
  const format = options.format ?? "text";

  let result: SddPreflightResult;
  try {
    const { config } = await loadConfig(options.root);
    result = await runSddPreflight(options.root, config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`qfai sdd preflight: preflight failed: ${message}`);
    return 1;
  }

  write(format === "json" ? JSON.stringify(result, null, 2) : renderText(options.root, result));

  if (result.status !== "blocked") {
    return 0;
  }

  writeErr(
    `qfai sdd preflight: blocked — ${String(result.blockers.length)} blocker(s). ` +
      `Resolve them and re-run; see ${toRelative(options.root, result.preflightSummaryPath)}.`,
  );
  return options.failOn === "never" ? 0 : 1;
}

/**
 * `qfai sdd preflight`: run the /qfai-sdd Stage 0 gate.
 *
 * Delegates the discussion-pack selection, the count of imported `REQ-*`
 * entries and blocker resolution to `runSddPreflight`, which also writes the
 * result to `<outDir>/preflight_summary.md`. If the skill filled the template
 * by hand, `status: ready` would be self-reported and prove nothing about a
 * pack having actually been found. This command moves that decision back to
 * the tool.
 *
 * The pack to judge is the one the runtime-state pointer
 * (`.qfai/state.json#discussion.currentId`) names. If that pack cannot be
 * found, it stops, shows the candidates and the recovery command, and leaves
 * the existing summary untouched. Only when no pointer is set does it fall
 * back to the latest pack.
 *
 * Exit code: 1 for `status: "blocked"`, 0 for `ready`. Only `--fail-on never`
 * returns 0 for a blocked result (for when only the diagnosis is wanted).
 * Preflight has no warning tier, so `--fail-on warning` means the same as
 * `error`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath, type QfaiConfig } from "../../core/config.js";
import {
  ResolveActiveDiscussionPackError,
  resolveActiveDiscussionPack,
} from "../../core/discussionPack.js";
import { runSddPreflight, type SddPreflightResult } from "../../core/preflight/sddPreflight.js";
import { readDiscussionCurrentId } from "../../core/state.js";
import { error as logError, info as logInfo } from "../../core/logger.js";

export type SddPreflightCommandOptions = {
  /** Project root (`.qfai/discussion` / `.qfai/report` resolve underneath). */
  root: string;
  /** Output format. Defaults to `text`. */
  format?: "text" | "json";
  /** Failure threshold. `never` keeps the exit code at 0 on blockers. */
  failOn?: "never" | "warning" | "error";
  /**
   * Carry-over open questions / assumptions to record in the summary
   * (`--assume <text>`, repeatable). When omitted the command preserves the
   * carry-over list already present in `preflight_summary.md` instead of
   * overwriting it with `- none`.
   */
  assumptions?: string[];
  /** Output sink. Defaults to the CLI logger (stdout). */
  write?: (message: string) => void;
  /** Error sink. Defaults to the CLI logger (stderr). */
  writeErr?: (message: string) => void;
};

const CARRY_OVER_HEADING = "## Open Questions (Carry-over)";

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
  if (result.packGaps.length > 0) {
    lines.push("  pack gaps (recorded, not blocking):");
    for (const gap of result.packGaps) {
      lines.push(`    - ${gap}`);
    }
  }
  if (result.openQuestions.length > 0) {
    lines.push("  open questions (carry-over):");
    for (const question of result.openQuestions) {
      lines.push(`    - ${question}`);
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

/**
 * Which pack Stage 0 must judge. The runtime-state pointer wins when it is
 * set, so `npx qfai discussion use <older-id>` is honored. With no pointer the
 * newest pack stays the default: nothing in the shipped skill set writes the
 * pointer, so requiring it would block Stage 0 for every default project.
 */
async function resolveSelectedPackDir(root: string): Promise<string | undefined> {
  const currentId = await readDiscussionCurrentId(root);
  if (currentId === null) {
    return undefined;
  }
  return await resolveActiveDiscussionPack(root);
}

/**
 * Carry-over entries already recorded under `## Open Questions (Carry-over)`.
 * The summary is the Stage 0 SSOT, so a re-run (Required Process step 3) must
 * not silently replace hand-recorded carry-over with `- none`.
 */
async function readRecordedCarryOver(summaryPath: string): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(summaryPath, "utf-8");
  } catch {
    return [];
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === CARRY_OVER_HEADING);
  if (start < 0) {
    return [];
  }

  const carried: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    const item = /^\s*-\s+(.*)$/.exec(line)?.[1]?.trim();
    if (item === undefined || item.length === 0) {
      continue;
    }
    if (item.toLowerCase() === "none" || item.startsWith("<")) {
      continue;
    }
    carried.push(item);
  }
  return carried;
}

async function resolveCarryOver(
  root: string,
  config: QfaiConfig,
  explicit: string[] | undefined,
): Promise<string[]> {
  const provided = (explicit ?? []).map((value) => value.trim()).filter((v) => v.length > 0);
  if (provided.length > 0) {
    return provided;
  }
  return await readRecordedCarryOver(
    path.join(resolvePath(root, config, "outDir"), "preflight_summary.md"),
  );
}

export async function runSddPreflightCommand(options: SddPreflightCommandOptions): Promise<number> {
  const write = options.write ?? logInfo;
  const writeErr = options.writeErr ?? logError;
  const format = options.format ?? "text";

  let result: SddPreflightResult;
  try {
    const { config, issues, configPath } = await loadConfig(options.root);
    // `loadConfig` never throws on a broken YAML / invalid `paths.*`: it falls
    // back to defaultConfig and records the problem. Judging a pack under the
    // default discussion directory — and writing a summary to the default
    // report directory — would answer a question the operator did not ask.
    const configErrors = issues.filter((issue) => issue.severity === "error");
    if (configErrors.length > 0) {
      writeErr(
        `qfai sdd preflight: cannot read ${toRelative(options.root, configPath)} (no fallback to the defaults):`,
      );
      for (const issue of configErrors) {
        writeErr(`  - ${issue.message}`);
      }
      return 1;
    }

    const packDir = await resolveSelectedPackDir(options.root);
    const assumptions = await resolveCarryOver(options.root, config, options.assumptions);
    result = await runSddPreflight(options.root, config, {
      ...(packDir === undefined ? {} : { packDir }),
      ...(assumptions.length > 0 ? { assumptions } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof ResolveActiveDiscussionPackError) {
      writeErr(`qfai sdd preflight: cannot resolve the active discussion-pack: ${message}`);
      return 1;
    }
    writeErr(`qfai sdd preflight: preflight failed: ${message}`);
    return 1;
  }

  // `nextCommands` are the recovery steps for a blocker. Left on a ready
  // result, they would send a user who should move on to Stage 1 back to
  // /qfai-discussion.
  const emitted: SddPreflightResult =
    result.status === "blocked" ? result : { ...result, nextCommands: [] };

  write(format === "json" ? JSON.stringify(emitted, null, 2) : renderText(options.root, emitted));

  if (emitted.status !== "blocked") {
    return 0;
  }

  writeErr(
    `qfai sdd preflight: blocked — ${String(emitted.blockers.length)} blocker(s). ` +
      `Resolve them and re-run; see ${toRelative(options.root, emitted.preflightSummaryPath)}.`,
  );
  return options.failOn === "never" ? 0 : 1;
}

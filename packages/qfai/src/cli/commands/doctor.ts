import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createDoctorData, type DoctorProfile } from "../../core/doctor.js";
import { cleanStaleReviewPacks } from "../../core/doctor/cleanReviewPacks.js";
import { cleanStaleRunLogs, precheckRunLogPrune } from "../../core/doctor/cleanRunLogs.js";
import { runAutoremediate } from "../../core/doctor/autoremediate.js";
import { ensureRootGitignoreEntries } from "./init.js";
import type { FailOn, QfaiConfig } from "../../core/config.js";
import { findConfigRoot, loadConfig } from "../../core/config.js";
import type { Issue } from "../../core/types.js";
import { isCiEnvironment } from "../../core/phasePolicy.js";
import { resolveFailOn } from "../lib/failOn.js";
import { info } from "../lib/logger.js";

export type DoctorCommandOptions = {
  root: string;
  rootExplicit: boolean;
  format: "text" | "json";
  outPath?: string;
  /**
   * 明示された `--fail-on` の値。未指定なら `validation.failOn`
   * (同梱既定値 `error`) が使われる。`never` は明示的なオプトアウト。
   */
  failOn?: FailOn;
  profile?: DoctorProfile;
  /** Skill name when `--profile <skill>` is passed (vs the legacy `prototyping`). */
  skillProfile?: string;
  targetUrl?: string;
  /**
   * `--clean`: archive TTL-expired review packs into
   * `.qfai/review/_archive/` and prune TTL-expired `<outDir>/run-*`
   * validate run logs.
   */
  clean?: boolean;
  /** `--autoremediate`: orchestrate install + clean + config-fill. */
  autoremediate?: boolean;
  /** `--dry-run`: preview only; no side effects. */
  dryRun?: boolean;
  /** `--yes`: skip interactive confirmation (autoremediate). */
  yes?: boolean;
};

function formatDoctorText(data: Awaited<ReturnType<typeof createDoctorData>>): string {
  const lines: string[] = [];
  lines.push(
    `qfai doctor: root=${data.root} config=${data.config.configPath} (${data.config.found ? "found" : "missing"})${data.profile ? ` profile=${data.profile}` : ""}`,
  );
  // Active-profile checks (severity=ok) are listed first so the reader still
  // sees the green signal.
  const okGroup = data.checks.filter((check) => check.severity === "ok");
  for (const check of okGroup) {
    lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
  }
  // 2-group split. Errors that block the active profile go in the first
  // group; warnings + info are advisory drift. The `skills.integrity` finding
  // is always routed into the advisory group regardless of its message
  // wording (routed by `id`, not by severity, so the rule is robust against a
  // future emission that accidentally re-elevates severity).
  const errorGroup = data.checks.filter(
    (check) => check.severity === "error" && check.id !== "skills.integrity",
  );
  const advisoryGroup = data.checks.filter(
    (check) =>
      (check.severity === "warning" || check.severity === "info") &&
      check.id !== "skills.integrity",
  );
  const skillsAdvisory = data.checks.filter((check) => check.id === "skills.integrity");
  lines.push("");
  lines.push("== errors blocking the active profile ==");
  if (errorGroup.length === 0) {
    // Prefix the empty-bucket line with `[ok]` so the grep-by-severity
    // pattern downstream tooling uses (`^\[(ok|warning|error|info)\]`)
    // still catches the line. Pre-fix `(none)` had no prefix and slipped
    // past severity-grep readers entirely.
    lines.push("[ok] (no findings in this bucket)");
  } else {
    for (const check of errorGroup) {
      lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
    }
  }
  lines.push("");
  lines.push("== advisory findings (drift, non-blocking by default) ==");
  const combinedAdvisory = [...advisoryGroup, ...skillsAdvisory];
  if (combinedAdvisory.length === 0) {
    lines.push("[ok] (no findings in this bucket)");
  } else {
    for (const check of combinedAdvisory) {
      lines.push(`[${check.severity}] ${check.id}: ${check.message}`);
    }
  }
  lines.push("");
  lines.push(
    `summary: ok=${data.summary.ok} info=${data.summary.info} warning=${data.summary.warning} error=${data.summary.error}`,
  );
  return lines.join("\n");
}

function formatDoctorJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Archive TTL-expired review packs and prune TTL-expired validate run
 * logs, returning the side-effect summary lines.
 *
 * Phrase the summary in the future tense when `--dry-run` is in effect.
 * Both cleaners still populate their result arrays under dry-run (they
 * list what the live command WOULD do), so reusing the past-tense
 * wording from the live path would falsely read as "it happened".
 * Mirror the `autoremediate` dry-run vocabulary (`would run ...` /
 * `would fill ...`).
 *
 * Review-pack archival always runs (it moves, and is therefore
 * recoverable). The run-log prune deletes, so it runs only after
 * `precheckRunLogPrune` clears it.
 *
 * `failed` reports run logs the prune could not remove. The summary is
 * still printed in that case — the removals that DID happen are
 * irreversible and the operator has to see them — and the flag makes
 * `runDoctor` exit non-zero regardless of `--fail-on`.
 *
 * `config` and `configIssues` come from `runDoctor`'s single
 * `loadConfig` rather than a second load here: `precheckRunLogPrune`
 * blocks the irreversible half on unresolved config issues, so it has
 * to see the very issue list the caller's `failOn` resolution read.
 */
async function runCleanPhase(
  resolvedRoot: string,
  config: QfaiConfig,
  configIssues: readonly Issue[],
  dryRun: boolean,
): Promise<{ lines: string[]; failed: boolean }> {
  const lines: string[] = [];
  const reviewTtlDays = config.review?.staleTtlDays;
  const packs = await cleanStaleReviewPacks(resolvedRoot, {
    ...(typeof reviewTtlDays === "number" ? { ttlDays: reviewTtlDays } : {}),
    ...(dryRun ? { dryRun: true } : {}),
  });
  lines.push(
    dryRun
      ? `doctor --clean (dry-run): would archive=${packs.archived.length}, in-ttl=${packs.skippedInTtl.length} (ttlDays=${packs.ttlDays})`
      : `doctor --clean: archived=${packs.archived.length}, in-ttl=${packs.skippedInTtl.length} (ttlDays=${packs.ttlDays})`,
  );
  for (const entry of packs.archived) {
    lines.push(
      dryRun ? `  would move -> _archive/${entry.packName}` : `  -> _archive/${entry.packName}`,
    );
  }

  // The run-log half of `--clean` deletes rather than moves, so it is
  // gated on the two preconditions the diagnostic pass would otherwise
  // only report AFTER the deletion (invalid config, shared outDir).
  const precheck = await precheckRunLogPrune(resolvedRoot, config, configIssues);
  if (precheck.blocked) {
    lines.push(`doctor --clean: run log prune skipped — ${precheck.reason}`);
    return { lines, failed: false };
  }

  const runLogTtlDays = config.report?.staleTtlDays;
  const keepLatestRuns = config.report?.keepLatestRuns;
  const runLogs = await cleanStaleRunLogs(resolvedRoot, config, {
    ...(typeof runLogTtlDays === "number" ? { ttlDays: runLogTtlDays } : {}),
    ...(typeof keepLatestRuns === "number" ? { keepLatest: keepLatestRuns } : {}),
    ...(dryRun ? { dryRun: true } : {}),
  });
  const runLogCounts = `in-ttl=${runLogs.skippedInTtl.length}, kept-latest=${runLogs.retainedLatest.length}, kept-pointer=${runLogs.retainedPointer.length} (ttlDays=${runLogs.ttlDays}, keepLatestRuns=${runLogs.keepLatest})`;
  lines.push(
    dryRun
      ? `doctor --clean (dry-run): would prune run logs=${runLogs.removed.length}, ${runLogCounts}`
      : `doctor --clean: pruned run logs=${runLogs.removed.length}, ${runLogCounts}`,
  );
  for (const entry of runLogs.removed) {
    lines.push(dryRun ? `  would remove -> ${entry.runId}` : `  removed -> ${entry.runId}`);
  }
  // Listed after the removals so the two are read together: what is
  // gone for good, then what is still on disk and why.
  if (runLogs.failed.length > 0) {
    lines.push(`doctor --clean: failed to prune run logs=${runLogs.failed.length}`);
    for (const failure of runLogs.failed) {
      lines.push(`  failed -> ${failure.entry.runId}: ${failure.reason}`);
    }
  }
  return { lines, failed: runLogs.failed.length > 0 };
}

export async function runDoctor(options: DoctorCommandOptions): Promise<number> {
  // Resolve the project root BEFORE running any side-effecting
  // pre-step. Pre-fix `runAutoremediate` and `cleanStaleReviewPacks`
  // received the raw `options.root` (effectively the cwd when
  // `--root` was omitted), which meant remediation invoked from a
  // subdirectory would probe / install / archive under that
  // subdirectory and create `<subdir>/qfai.config.yaml` instead of
  // touching the project root. The diagnostic pass below already
  // walks up via `createDoctorData`; mirror that resolution here so
  // the two paths agree on the operating root.
  const resolvedRoot = options.rootExplicit
    ? options.root
    : (await findConfigRoot(options.root)).root;
  // doctor の失敗条件は validate と同じ設定キー (`validation.failOn`) で
  // 決まる。フラグ由来の値しか見なかった頃は、`== errors blocking the
  // active profile ==` に `[error]` を並べたうえで exit 0 を返しており、
  // 契約 (errors バケットが空でなければ exit 1) にも validate にも
  // 反しない読み方が存在しなかった。`--clean` 分岐の TTL 参照も
  // この 1 回のロードを共有する。
  const { config, issues: configIssues } = await loadConfig(resolvedRoot);
  // Side-effecting pre-steps run before the diagnostic build so the
  // post-cleanup tree is what `createDoctorData` reports on.
  const sideEffectLines: string[] = [];
  // A partial run-log prune must not report success: some directories
  // are irreversibly gone while others the operator asked to remove are
  // still there. Independent of `--fail-on`, which grades diagnostics.
  let cleanFailed = false;
  if (options.autoremediate) {
    // The owning business rule suppresses autoremediation on "standard CI
    // env vars", not on the single `CI` variable. An inline
    // `process.env["CI"] === "true"` missed the `GITHUB_ACTIONS` arm and read
    // `CI=1` as "local", so a lane that exports only `GITHUB_ACTIONS=true`
    // kept remediating: `npm install`, root `.gitignore` rewrite, review-pack
    // archival and config-fill all ran on CI checkouts that AC-0006-0018 puts
    // off limits. `isCiEnvironment` is the repo's SSOT for that detection
    // (`core/phasePolicy.ts`); reuse it so the two CI gates cannot drift apart.
    const isCi = isCiEnvironment();
    // Thread the resolved skill profile into the autoremediate orchestrator
    // so the install phase actually reaches the runtimeDependencies probe.
    // Without `skill`, runAutoremediate's (1) install branch is skipped
    // entirely — an operator running `qfai doctor --profile <skill>
    // --autoremediate` would see clean + config-fill run but never the
    // install they were expecting. The diagnostic pass below also receives
    // `skillProfile`, so the two stay in lockstep on the same option.
    // Before it, so the record the legacy-review-pack migration writes is not
    // ignored: an existing repository still carries the older managed block,
    // whose `.qfai/review/*` would keep `.legacy-packs` out of every commit —
    // and every legacy claim is then uncorroborated in CI and in the next
    // clone. `runAutoremediate` lives in core and this helper in the CLI, so
    // the call belongs here rather than the import belonging there.
    if (!isCi) {
      await ensureRootGitignoreEntries(resolvedRoot, Boolean(options.dryRun), (line) =>
        sideEffectLines.push(line),
      );
    }
    const summary = await runAutoremediate({
      root: resolvedRoot,
      dryRun: Boolean(options.dryRun),
      yes: Boolean(options.yes),
      isCi,
      ...(options.skillProfile ? { skill: options.skillProfile } : {}),
    });
    sideEffectLines.push(...summary.lines);
    cleanFailed = summary.failedRunLogPrunes.length > 0;
    // When the operator did not pass `--profile <skill>`, the install
    // phase of runAutoremediate is structurally skipped (there is no
    // manifest to probe). Surface that explicitly so operators do not
    // misread the absent install lines as "all dependencies satisfied".
    if (!options.skillProfile && !summary.disabledInCi) {
      sideEffectLines.push(
        "doctor --autoremediate: install phase skipped (provide --profile <skill> to probe a skill manifest's runtimeDependencies).",
      );
    }
    if (summary.disabledInCi) {
      // Honor AC-0006-0018: autoremediate disabled in CI; no diagnostic
      // build needed for the CI off path. Output-channel routing
      // mirrors the main return path below: under `--format json`,
      // side-effect lines go to stderr so the stdout channel remains
      // valid JSON for downstream consumers (`jq` / `JSON.parse`). The
      // CI-off path emits an empty `{}` JSON payload on stdout in that
      // case so consumers see a parseable document rather than a bare
      // newline.
      if (options.format === "json") {
        if (sideEffectLines.length > 0) {
          process.stderr.write(`${sideEffectLines.join("\n")}\n`);
        }
        info("{}");
      } else {
        info(sideEffectLines.join("\n"));
      }
      return 0;
    }
  } else if (options.clean) {
    const cleanPhase = await runCleanPhase(
      resolvedRoot,
      config,
      configIssues,
      Boolean(options.dryRun),
    );
    sideEffectLines.push(...cleanPhase.lines);
    cleanFailed = cleanPhase.failed;
  }

  const data = await createDoctorData({
    startDir: options.root,
    rootExplicit: options.rootExplicit,
    ...(options.profile ? { profile: options.profile } : {}),
    ...(options.skillProfile ? { skillProfile: options.skillProfile } : {}),
    ...(options.targetUrl ? { targetUrl: options.targetUrl } : {}),
  });

  const output = options.format === "json" ? formatDoctorJson(data) : formatDoctorText(data);
  const isJson = options.format === "json";
  // Keep `--format json` output machine-parseable: side-effect summary
  // lines (clean / autoremediate) are routed to stderr instead of being
  // prepended to stdout (and to the `--out` file), which would corrupt
  // the JSON document for any consumer that pipes stdout to `jq` or
  // reads the file with `JSON.parse`. Under `--format text` the prefix
  // remains on stdout (legacy human-readable behavior).
  const sideEffectPrefix =
    !isJson && sideEffectLines.length > 0 ? `${sideEffectLines.join("\n")}\n` : "";
  const failOn = resolveFailOn(
    options.failOn ? { failOn: options.failOn } : {},
    config.validation.failOn,
  );
  // `cleanFailed` overrides `failOn` on purpose: it reports an
  // irreversible, partially-applied deletion, which is not a diagnostic
  // severity for `--fail-on` (or `validation.failOn`) to grade away.
  const exitCode = cleanFailed || shouldFailDoctor(data.summary, failOn) ? 1 : 0;

  if (isJson && sideEffectLines.length > 0) {
    process.stderr.write(`${sideEffectLines.join("\n")}\n`);
  }

  if (options.outPath) {
    // Relative `--out` is anchored to the operating root, not the process
    // cwd, so `qfai doctor --root <proj> --out <rel>` and
    // `qfai report --root <proj> --out <rel>` land in the same tree.
    // The cwd-based resolution used to scatter a CI job's evidence: the
    // report went into the project while the doctor artifact went to the
    // runner's working directory, silently, because the "wrote <abs>" line
    // still looks like success. `prototyping preflight` shares this slot.
    const outAbs = path.isAbsolute(options.outPath)
      ? options.outPath
      : path.resolve(resolvedRoot, options.outPath);
    await mkdir(path.dirname(outAbs), { recursive: true });
    await writeFile(outAbs, `${sideEffectPrefix}${output}\n`, "utf-8");
    info(`doctor: wrote ${outAbs}`);
    return exitCode;
  }

  info(`${sideEffectPrefix}${output}`);
  return exitCode;
}

function shouldFailDoctor(summary: { warning: number; error: number }, failOn: FailOn): boolean {
  if (failOn === "never") {
    return false;
  }
  if (failOn === "error") {
    return summary.error > 0;
  }
  return summary.warning + summary.error > 0;
}

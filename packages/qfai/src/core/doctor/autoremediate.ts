/**
 * `qfai doctor --autoremediate` orchestrator.
 *
 * Coordinates three remediations on demand:
 *   1. install unmet runtimeDependencies (via `npm install <name>`).
 *   2. archive stale review packs (delegates to `cleanStaleReviewPacks`)
 *      and prune stale validate run logs (via `cleanStaleRunLogs`).
 *   3. write missing default-keyed config fields (does NOT overwrite
 *      user-authored values).
 *
 * Disabled in CI by default: the caller detects CI via the framework's
 * `isCiEnvironment` predicate (any truthy `CI` value, or
 * `GITHUB_ACTIONS=true`) and passes `isCi`, on which this orchestrator
 * emits `"autoremediate disabled in CI"` and returns without remediating.
 * Honors `--dry-run` by surfacing the plan without side effects.
 * Honors `--yes` by skipping interactive confirmation; this CLI is
 * non-interactive today, so `--yes` mostly serves as a documented
 * forward-compatible flag.
 *
 * The `npm install` call is routed through a pluggable runner so tests
 * can substitute a no-op stub. The default runner is loaded lazily and
 * skipped entirely under `dryRun`.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { exists } from "../validators/utils.js";
import { loadConfig } from "../config.js";
import { migrateLegacyReviewPacks } from "./migrateLegacyReviewPacks.js";
import { cleanStaleReviewPacks } from "./cleanReviewPacks.js";
import { cleanStaleRunLogs, precheckRunLogPrune } from "./cleanRunLogs.js";
import { probeSkillManifest, type SkillManifestProbeResult } from "./skillManifestProbe.js";

export type InstallRunner = (name: string, cwd: string) => Promise<void>;

export type AutoremediateOptions = {
  readonly root: string;
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly isCi: boolean;
  /** Test seam: skip the npm install side effect. Defaults to false. */
  readonly skipInstall?: boolean;
  /** Test seam: replace the install runner. Defaults to `npmInstall`. */
  readonly installRunner?: InstallRunner;
  /** Test seam: skill to probe for runtimeDependencies. Defaults to none. */
  readonly skill?: string;
};

export type AutoremediateSummary = {
  readonly disabledInCi: boolean;
  readonly lines: string[];
  readonly installed: readonly string[];
  readonly archived: readonly string[];
  readonly configFieldsWritten: readonly string[];
  /** Validate run-log directories pruned by this run. */
  readonly prunedRunLogs: readonly string[];
  /**
   * Run-log directories this run tried and failed to remove. Non-empty
   * means the prune was partial — `prunedRunLogs` is still irreversibly
   * gone — and the caller must exit non-zero.
   */
  readonly failedRunLogPrunes: readonly string[];
  /** Review packs recorded as predating `revision_form` by this run. */
  readonly legacyPacksRecorded: readonly string[];
};

const DEFAULT_KEYED_CONFIG_FIELDS: ReadonlyArray<{
  yamlKey: string;
  defaultLine: string;
}> = [{ yamlKey: "review:", defaultLine: "review:\n  staleTtlDays: 14\n" }];

async function defaultInstallRunner(name: string, cwd: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install", name], {
      cwd,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install ${name} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function tryFillConfigDefaults(
  root: string,
): Promise<{ written: string[]; lines: string[] }> {
  const written: string[] = [];
  const lines: string[] = [];
  const configPath = path.join(root, "qfai.config.yaml");
  let existing = "";
  if (await exists(configPath)) {
    try {
      existing = await readFile(configPath, "utf-8");
    } catch {
      lines.push(`autoremediate: skipped config-fill (failed to read ${configPath})`);
      return { written, lines };
    }
  }
  let appended = existing;
  for (const field of DEFAULT_KEYED_CONFIG_FIELDS) {
    // Anchor key existence at column 0 of any line (multiline-mode
    // regex) so we do NOT false-match nested keys (`  review:`),
    // YAML comments (`# review:`), or substring occurrences in
    // values (`description: "code_review: ..."`). The yamlKey
    // SSOT carries the trailing colon, so escape the literal `:`
    // when building the regex.
    const literal = field.yamlKey.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
    const keyRe = new RegExp(`^${literal}`, "mu");
    if (!keyRe.test(appended)) {
      appended = `${appended.replace(/\s*$/u, "")}\n${field.defaultLine}`;
      written.push(field.yamlKey.replace(/:$/u, ""));
    }
  }
  if (written.length > 0) {
    try {
      await writeFile(configPath, appended, "utf-8");
      lines.push(`autoremediate: wrote default-keyed fields: ${written.join(", ")}`);
    } catch (error) {
      lines.push(
        `autoremediate: failed to write config defaults: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { written, lines };
}

/**
 * Phrase for a manifest that was never probed. "not found" is reserved
 * for a genuinely missing file inside an existing skills root; a
 * missing skills root is an uninitialized project, and a read fault is
 * neither of those.
 */
function describeUnprobedManifest(probe: SkillManifestProbeResult): string {
  if (probe.manifest === "unparseable") {
    return "unparseable";
  }
  if (probe.manifest === "unreadable") {
    return "present but unreadable";
  }
  return probe.skillsRootExists ? "not found" : "not found (skills root missing; run qfai init)";
}

export async function runAutoremediate(
  options: AutoremediateOptions,
): Promise<AutoremediateSummary> {
  const lines: string[] = [];

  if (options.isCi) {
    lines.push("autoremediate disabled in CI");
    return {
      disabledInCi: true,
      lines,
      installed: [],
      archived: [],
      configFieldsWritten: [],
      prunedRunLogs: [],
      failedRunLogPrunes: [],
      legacyPacksRecorded: [],
    };
  }

  if (options.dryRun) {
    lines.push("autoremediate: dry-run (no install / archive / config write)");
  }

  // (1) Probe runtimeDependencies and (optionally) install missing ones.
  const installed: string[] = [];
  if (options.skill) {
    const probe = await probeSkillManifest(options.root, options.skill);
    const missing = probe.findings.filter((finding) => finding.status === "missing");
    if (probe.manifest !== "found") {
      // Claiming "all installed" for a skill whose manifest was never
      // read reads as a positive result; say what actually happened so
      // a typo'd `--profile`, an uninitialized project, and a real
      // filesystem fault stay distinguishable in the remediation log.
      const reason = describeUnprobedManifest(probe);
      lines.push(
        `autoremediate: runtimeDependencies — manifest ${reason} at ${path.relative(options.root, probe.manifestPath)}; nothing installed`,
      );
    } else if (missing.length === 0) {
      lines.push("autoremediate: runtimeDependencies — all installed");
    } else {
      for (const finding of missing) {
        if (options.dryRun || options.skipInstall) {
          lines.push(`autoremediate: would run ${finding.installCommand}`);
        } else {
          const runner = options.installRunner ?? defaultInstallRunner;
          try {
            await runner(finding.name, options.root);
            installed.push(finding.name);
            lines.push(`autoremediate: ran ${finding.installCommand}`);
          } catch (error) {
            lines.push(
              `autoremediate: install failed for ${finding.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }
  }

  // (2) Archive stale review packs (--clean behavior).
  const { config, issues: configIssues } = await loadConfig(options.root);
  const ttlDays = config.review?.staleTtlDays;
  const cleanResult = await cleanStaleReviewPacks(options.root, {
    ...(typeof ttlDays === "number" ? { ttlDays } : {}),
    ...(options.dryRun ? { dryRun: true } : {}),
  });
  const archivedNames = cleanResult.archived.map((entry) => entry.packName);
  lines.push(
    `autoremediate: review packs archived=${archivedNames.length}, in-ttl=${cleanResult.skippedInTtl.length}`,
  );

  // (2b) Prune stale validate run logs (--clean behavior, second target).
  // Kept in lockstep with the `--clean` branch in `cli/commands/doctor.ts`
  // so `--autoremediate` is not a narrower clean than `--clean`.
  // Same precondition gate as `--clean`: an invalid config or an outDir
  // shared with another project root means the retention numbers in
  // hand are not the ones governing the directory, and this half of the
  // cleanup deletes rather than moves.
  const prunedRunLogs: string[] = [];
  const failedRunLogPrunes: string[] = [];
  const precheck = await precheckRunLogPrune(options.root, config, configIssues);
  if (precheck.blocked) {
    lines.push(`autoremediate: run log prune skipped — ${precheck.reason}`);
  } else {
    const runLogTtlDays = config.report?.staleTtlDays;
    const keepLatestRuns = config.report?.keepLatestRuns;
    const runLogResult = await cleanStaleRunLogs(options.root, config, {
      ...(typeof runLogTtlDays === "number" ? { ttlDays: runLogTtlDays } : {}),
      ...(typeof keepLatestRuns === "number" ? { keepLatest: keepLatestRuns } : {}),
      ...(options.dryRun ? { dryRun: true } : {}),
    });
    prunedRunLogs.push(...runLogResult.removed.map((entry) => entry.runId));
    lines.push(
      options.dryRun
        ? `autoremediate: would prune run logs=${prunedRunLogs.length}, in-ttl=${runLogResult.skippedInTtl.length}, kept-latest=${runLogResult.retainedLatest.length} (dry-run)`
        : `autoremediate: run logs pruned=${prunedRunLogs.length}, in-ttl=${runLogResult.skippedInTtl.length}, kept-latest=${runLogResult.retainedLatest.length}`,
    );
    // A failed `rm` no longer aborts the pruner, so the partial outcome
    // is reported here instead of being lost with the summary: the
    // removals above already happened and cannot be undone.
    failedRunLogPrunes.push(...runLogResult.failed.map((failure) => failure.entry.runId));
    for (const failure of runLogResult.failed) {
      lines.push(
        `autoremediate: run log prune failed -> ${failure.entry.runId}: ${failure.reason}`,
      );
    }
  }

  // (3) Write missing default-keyed config fields (user-authored values
  // are NOT touched because we only append the key when absent).
  let configFieldsWritten: string[] = [];
  if (!options.dryRun) {
    const filled = await tryFillConfigDefaults(options.root);
    configFieldsWritten = filled.written;
    lines.push(...filled.lines);
  } else {
    lines.push("autoremediate: would fill default-keyed config fields (dry-run)");
  }

  // (4) Record the review packs that predate `revision_form`, once.
  // Taking a version that requires the marker turns every pack already on disk
  // into a blocking `QFAI-REVIEW-007` — a repository that keeps its review
  // history fails `--fail-on error` on adoption, for a condition no producer
  // can go back and fix. Additive and idempotent, so a repeat run is a no-op
  // and a pack that forgets its marker *after* the migration is not excused.
  // The managed `.gitignore` block is refreshed by the caller before this runs
  // (`doctor.ts`): an existing repository still carries the older one, whose
  // `.qfai/review/*` would ignore the record written below, so it never reaches
  // a commit and every legacy claim is uncorroborated again in CI and in the
  // next clone. It is done there rather than here because this module is core
  // and that helper is CLI — importing it the other way is a cycle.
  const migration = await migrateLegacyReviewPacks(options.root, {
    ...(options.dryRun ? { dryRun: true } : {}),
  });
  lines.push(
    options.dryRun
      ? `autoremediate: would record legacy review packs=${String(migration.added.length)} (dry-run)`
      : `autoremediate: legacy review packs recorded=${String(migration.added.length)}`,
  );

  return {
    disabledInCi: false,
    lines,
    installed,
    archived: archivedNames,
    prunedRunLogs,
    failedRunLogPrunes,
    configFieldsWritten,
    legacyPacksRecorded: migration.added,
  };
}

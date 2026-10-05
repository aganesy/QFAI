/**
 * `qfai doctor --autoremediate` orchestrator.
 *
 * Coordinates two remediations on demand:
 *   1. install unmet runtimeDependencies (via `npm install <name>`).
 *   2. prune stale validate run logs (via `cleanStaleRunLogs`).
 *
 * Disabled in CI by default: the caller detects a standard CI environment
 * via the framework's `isCiEnvironment` predicate (any truthy `CI` value,
 * or `GITHUB_ACTIONS=true`) and passes `isCi`, on which this orchestrator
 * emits `"autoremediate disabled in CI"` and returns without remediating.
 * Honors `--dry-run` by surfacing the plan in the future tense, without
 * side effects.
 *
 * `--yes` is meant to skip the interactive confirmation the CLI contract
 * requires before an install. That prompt is NOT implemented yet — this CLI
 * is non-interactive today — so the pass runs unattended either way. That is
 * a known deviation from the `qfai doctor` contract, not a relaxation of it.
 *
 * The `npm install` call is routed through a pluggable runner so tests
 * can substitute a no-op stub. The default runner is loaded lazily and
 * skipped entirely under `dryRun`.
 */

import path from "node:path";

import { loadConfig } from "../config.js";
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
  /** Validate run-log directories pruned by this run. */
  readonly prunedRunLogs: readonly string[];
  /**
   * Run-log directories this run tried and failed to remove. Non-empty
   * means the prune was partial — `prunedRunLogs` is still irreversibly
   * gone — and the caller must exit non-zero.
   */
  readonly failedRunLogPrunes: readonly string[];
};

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
      prunedRunLogs: [],
      failedRunLogPrunes: [],
    };
  }

  if (options.dryRun) {
    lines.push("autoremediate: dry-run (no install / run-log removal)");
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

  const { config, issues: configIssues } = await loadConfig(options.root);

  // (2) Prune stale validate run logs (--clean behavior).
  // Kept in lockstep with the `--clean` branch in `cli/commands/doctor.ts`
  // so `--autoremediate` is not a narrower clean than `--clean`.
  // Same precondition gate as `--clean`: an invalid config or an outDir
  // shared with another project root means the retention numbers in
  // hand are not the ones governing the directory.
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

  return {
    disabledInCi: false,
    lines,
    installed,
    prunedRunLogs,
    failedRunLogPrunes,
  };
}

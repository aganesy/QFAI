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
 * Before `npm install` runs, the operator confirms the listed packages
 * (the doctor contract requires it): the install scripts run with the operator's
 * privileges. `--yes` skips the prompt. A session whose stdin is not a
 * terminal cannot answer it, so without `--yes` nothing is installed there
 * and the pass says how to proceed. The rest of the pass runs either way,
 * except after Ctrl+C at the prompt, which stops the command.
 *
 * The `npm install` call is routed through a pluggable runner so tests
 * can substitute a no-op stub. The default runner is loaded lazily and
 * skipped entirely under `dryRun`. It starts npm without a shell on every
 * platform, so a manifest entry is one argument and never shell text; the
 * probe has already refused any entry that is not a registry package name.
 */

import path from "node:path";
import type { ReadLineOptions } from "node:readline";

import { loadConfig } from "../config.js";
import { npmCommand } from "../graph/process.js";
import { cleanStaleRunLogs, precheckRunLogPrune } from "./cleanRunLogs.js";
import {
  probeSkillManifest,
  quoteManifestNames,
  type SkillManifestProbeResult,
} from "./skillManifestProbe.js";

export type InstallRunner = (name: string, cwd: string) => Promise<void>;

/** Asks the operator to approve installing `packages`; resolves true on an affirmative answer. */
export type InstallConfirmer = (packages: readonly string[]) => Promise<boolean>;

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
  /** Test seam: whether the operator can answer a prompt. Defaults to stdin being a terminal. */
  readonly interactive?: boolean;
  /** Test seam: replace the confirmation prompt. Defaults to a `[y/N]` prompt on stderr. */
  readonly confirmInstall?: InstallConfirmer;
};

export type AutoremediateSummary = {
  readonly disabledInCi: boolean;
  readonly lines: string[];
  readonly installed: readonly string[];
  /**
   * Dependencies whose install this run tried and failed. Non-empty means
   * the remediation is incomplete and the caller must exit non-zero.
   */
  readonly failedInstalls: readonly string[];
  /** Validate run-log directories pruned by this run. */
  readonly prunedRunLogs: readonly string[];
  /**
   * Run-log directories this run tried and failed to remove. Non-empty
   * means the prune was partial — `prunedRunLogs` is still irreversibly
   * gone — and the caller must exit non-zero.
   */
  readonly failedRunLogPrunes: readonly string[];
};

export type NpmInstallInvocation = {
  readonly command: string;
  readonly args: readonly string[];
};

/**
 * The program and arguments the default runner starts for `npm install <name>`.
 * On Windows npm is a `.cmd` launcher that only a shell can start, so the
 * runner starts npm's JavaScript entry with Node instead.
 */
export async function npmInstallInvocation(name: string): Promise<NpmInstallInvocation> {
  const npm = await npmCommand();
  return { command: npm.command, args: [...npm.prefix, "install", name] };
}

async function defaultInstallRunner(name: string, cwd: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const invocation = await npmInstallInvocation(name);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(invocation.command, [...invocation.args], {
      cwd,
      stdio: "ignore",
      shell: false,
      windowsHide: true,
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

/** Where the install prompt reads and writes; tests pass their own streams. */
export type InstallPromptStreams = Pick<ReadLineOptions, "input" | "output" | "terminal">;

/**
 * The `[y/N]` prompt. Ctrl+D is a decline, since no answer is not a yes:
 * the close it causes settles the prompt, because Node 20 leaves a pending
 * question unsettled when the interface closes.
 * Ctrl+C rejects, so the command stops instead of carrying on with the rest
 * of the pass. Readline rejects both keys with the same `AbortError`, so
 * Ctrl+C aborts the question through its own signal to stay distinguishable.
 */
export async function askBeforeInstall(
  packages: readonly string[],
  // stderr, so a `--format json` report on stdout stays one JSON document.
  streams: InstallPromptStreams = { input: process.stdin, output: process.stderr },
): Promise<boolean> {
  const { createInterface } = await import("node:readline/promises");
  const prompt = createInterface(streams);
  const interrupted = new AbortController();
  prompt.once("SIGINT", () => interrupted.abort());
  const closed = new Promise<false>((resolve) => {
    prompt.once("close", () => resolve(false));
  });
  try {
    const answered = prompt.question(
      `doctor --autoremediate: run npm install for ${packages.join(", ")}? Install scripts run with your privileges. [y/N] `,
      { signal: interrupted.signal },
    );
    return await Promise.race([answered.then(isAffirmative), closed]);
  } catch (error: unknown) {
    if (interrupted.signal.aborted) {
      throw error;
    }
    return false;
  } finally {
    prompt.close();
  }
}

function isAffirmative(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "y" || normalized === "yes";
}

type InstallApproval =
  { readonly approved: true } | { readonly approved: false; readonly line: string };

/**
 * The install may run on `--yes`, or on an affirmative answer from an
 * operator who can be asked. A refusal carries the line to log.
 */
async function approveInstall(
  options: AutoremediateOptions,
  packages: readonly string[],
): Promise<InstallApproval> {
  if (options.yes) {
    return { approved: true };
  }
  const listed = packages.join(", ");
  // `isTTY` is undefined, not false, on a stdin that is not a terminal.
  const interactive = options.interactive ?? process.stdin.isTTY;
  if (!interactive) {
    return {
      approved: false,
      line: `autoremediate: install skipped — confirmation needed and this session is not interactive; rerun with --yes to install ${listed}`,
    };
  }
  const confirm = options.confirmInstall ?? askBeforeInstall;
  if (await confirm(packages)) {
    return { approved: true };
  }
  return {
    approved: false,
    line: `autoremediate: install declined; nothing installed (${listed})`,
  };
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
  if (probe.manifest === "invalid") {
    return `lists entries that are not registry package names (${quoteManifestNames(probe.invalidNames)})`;
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
      failedInstalls: [],
      prunedRunLogs: [],
      failedRunLogPrunes: [],
    };
  }

  if (options.dryRun) {
    lines.push("autoremediate: dry-run (no install / run-log removal)");
  }

  // (1) Probe runtimeDependencies and (optionally) install missing ones.
  const installed: string[] = [];
  const failedInstalls: string[] = [];
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
    } else if (options.dryRun || options.skipInstall) {
      for (const finding of missing) {
        lines.push(`autoremediate: would run ${finding.installCommand}`);
      }
    } else {
      const approval = await approveInstall(
        options,
        missing.map((finding) => finding.name),
      );
      if (!approval.approved) {
        lines.push(approval.line);
      } else {
        const runner = options.installRunner ?? defaultInstallRunner;
        for (const finding of missing) {
          try {
            await runner(finding.name, options.root);
            installed.push(finding.name);
            lines.push(`autoremediate: ran ${finding.installCommand}`);
          } catch (error) {
            failedInstalls.push(finding.name);
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
    failedInstalls,
    prunedRunLogs,
    failedRunLogPrunes,
  };
}

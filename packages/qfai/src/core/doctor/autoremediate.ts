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
 * Disabled in CI by default: the caller detects a standard CI environment
 * via the framework's `isCiEnvironment` predicate (any truthy `CI` value,
 * or `GITHUB_ACTIONS=true`) and passes `isCi`, on which this orchestrator
 * emits `"autoremediate disabled in CI"` and returns without remediating.
 * Honors `--dry-run` by surfacing the plan in the future tense, without
 * side effects. The plan is the one a live run would execute: the
 * config-fill preview parses the config and names only the fields that
 * are actually missing, and reports the same decline a live run would.
 *
 * `--yes` is meant to skip the interactive confirmation the CLI contract
 * requires before any install / tracked-file write. That prompt is NOT
 * implemented yet — this CLI is non-interactive today — so the pass runs
 * unattended either way. That is a known deviation from the contract (see
 * `.qfai/contracts/cli/qfai-doctor.md`), not a relaxation of it.
 *
 * The `npm install` call is routed through a pluggable runner so tests
 * can substitute a no-op stub. The default runner is loaded lazily and
 * skipped entirely under `dryRun`.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";

import { exists } from "../validators/utils.js";
import { loadConfig } from "../config.js";
import { migrateLegacyReviewPacks } from "./migrateLegacyReviewPacks.js";
import { WOULD_UNTRACK_REASON } from "./archiveVisibility.js";
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
  /** Top-level mapping key, as the parsed document spells it (no colon). */
  key: string;
  defaultLine: string;
}> = [{ key: "review", defaultLine: "review:\n  staleTtlDays: 14\n" }];

/**
 * The document's top-level mapping keys, or `null` when the file is not a
 * mapping this pass may safely append to.
 *
 * Presence used to be decided by a raw-text `^review:` regex, which reads a
 * *spelling* rather than the document. `"review":` and `'review' :` are valid
 * YAML for the same key, so a config that set `staleTtlDays: 30` under a quoted
 * key was misread as unset: the pass appended a second `review:` block, which
 * either makes the file invalid (duplicate key) or — on a last-wins reader —
 * silently replaces the operator's 30 with 14. Parsing answers for every
 * spelling of the key at once.
 *
 * `null` is also the answer for a document that does not parse or is not a
 * mapping (a list, a scalar): appending text to it cannot be made safe, so the
 * caller declines rather than guessing.
 */
function topLevelKeys(source: string): Set<string> | null {
  if (source.trim().length === 0) {
    return new Set<string>();
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(source);
  } catch {
    return null;
  }
  // An empty document (`---`, or a comment-only file) parses to null and is
  // still a file this pass may append a first key to.
  if (parsed === null || parsed === undefined) {
    return new Set<string>();
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return new Set(Object.keys(parsed));
}

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

type ConfigFillPlan = {
  readonly configPath: string;
  /** Default-keyed fields absent from the PARSED document, in declaration order. */
  readonly missing: readonly string[];
  /** Exact content a live run would write; `null` when there is nothing to write. */
  readonly nextSource: string | null;
  /** Set when the pass declines outright (unreadable, or not a YAML mapping). */
  readonly skipLine: string | null;
};

/**
 * Decide — without writing — what a config-fill would do.
 *
 * The dry-run branch used to skip this work entirely and print a fixed
 * `would fill default-keyed config fields` line, so a preview promised an
 * append for a config that already carried the key (live run: writes nothing)
 * and for one that does not parse as a mapping (live run: `skipped
 * config-fill`). Both paths now read the same plan, so the preview cannot
 * claim a change the live run will not make.
 */
async function planConfigFill(root: string): Promise<ConfigFillPlan> {
  const configPath = path.join(root, "qfai.config.yaml");
  let existing = "";
  if (await exists(configPath)) {
    try {
      existing = await readFile(configPath, "utf-8");
    } catch {
      return {
        configPath,
        missing: [],
        nextSource: null,
        skipLine: `autoremediate: skipped config-fill (failed to read ${configPath})`,
      };
    }
  }
  const presentKeys = topLevelKeys(existing);
  if (presentKeys === null) {
    return {
      configPath,
      missing: [],
      nextSource: null,
      skipLine: `autoremediate: skipped config-fill (${configPath} is not a parseable YAML mapping)`,
    };
  }
  const missing: string[] = [];
  let appended = existing;
  for (const field of DEFAULT_KEYED_CONFIG_FIELDS) {
    if (!presentKeys.has(field.key)) {
      appended = `${appended.replace(/\s*$/u, "")}\n${field.defaultLine}`;
      missing.push(field.key);
    }
  }
  return {
    configPath,
    missing,
    nextSource: missing.length > 0 ? appended : null,
    skipLine: null,
  };
}

/** Report a plan in the future tense. Issues no filesystem write. */
function describeConfigFillPlan(plan: ConfigFillPlan): string {
  if (plan.skipLine !== null) {
    return plan.skipLine;
  }
  if (plan.missing.length === 0) {
    return "autoremediate: config-fill not needed, default-keyed fields present (dry-run)";
  }
  return `autoremediate: would fill default-keyed config fields: ${plan.missing.join(", ")} (dry-run)`;
}

async function applyConfigFill(
  plan: ConfigFillPlan,
): Promise<{ written: string[]; lines: string[] }> {
  if (plan.skipLine !== null) {
    return { written: [], lines: [plan.skipLine] };
  }
  if (plan.nextSource === null) {
    return { written: [], lines: [] };
  }
  const written = [...plan.missing];
  try {
    await writeFile(plan.configPath, plan.nextSource, "utf-8");
    return {
      written,
      lines: [`autoremediate: wrote default-keyed fields: ${written.join(", ")}`],
    };
  } catch (error) {
    return {
      written,
      lines: [
        `autoremediate: failed to write config defaults: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
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
  // `cleanStaleReviewPacks` populates `archived` under dry-run too — it lists
  // the packs a live run WOULD move. Reporting that count with the past-tense
  // `archived=N` wording made a preview read as a completed archive, so an
  // operator checking the plan saw packs already gone. Mirror the `--clean`
  // dry-run vocabulary instead (`would archive` / `would move ->`).
  if (options.dryRun) {
    lines.push(
      `autoremediate: would archive review packs=${archivedNames.length}, in-ttl=${cleanResult.skippedInTtl.length}, kept-tracked=${cleanResult.skippedWouldUntrack.length}`,
    );
    for (const packName of archivedNames) {
      lines.push(`  would move -> _archive/${packName}`);
    }
    for (const entry of cleanResult.skippedWouldUntrack) {
      lines.push(`  kept ${entry.packName}: ${WOULD_UNTRACK_REASON}`);
    }
  } else {
    lines.push(
      `autoremediate: review packs archived=${archivedNames.length}, in-ttl=${cleanResult.skippedInTtl.length}, kept-tracked=${cleanResult.skippedWouldUntrack.length}`,
    );
    for (const packName of archivedNames) {
      lines.push(`  -> _archive/${packName}`);
    }
    for (const entry of cleanResult.skippedWouldUntrack) {
      lines.push(`  kept ${entry.packName}: ${WOULD_UNTRACK_REASON}`);
    }
  }

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
  // Both branches read the SAME plan. The dry-run branch used to short-circuit
  // to a fixed `would fill default-keyed config fields` line without looking at
  // the file, so it promised an append for a config that already declared the
  // key — a live run writes nothing there — and for one that is not a parseable
  // mapping, where a live run declines with `skipped config-fill`. Planning is
  // read-only, so the preview costs nothing and cannot drift from the write.
  const configPlan = await planConfigFill(options.root);
  let configFieldsWritten: string[] = [];
  if (options.dryRun) {
    lines.push(describeConfigFillPlan(configPlan));
  } else {
    const filled = await applyConfigFill(configPlan);
    configFieldsWritten = filled.written;
    lines.push(...filled.lines);
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
  // The archive pass above already ran, so a live run no longer sees the packs
  // it moved into `_archive/` and records none of them. A dry-run moves
  // nothing, so without the same exclusion it enumerated those packs and
  // reported `would record legacy review packs=N` for a live run whose answer
  // is 0 — a preview that promised manifest and summary writes the run would
  // never make. Handing the archived names over keeps both paths on the same
  // post-archive set.
  const migration = await migrateLegacyReviewPacks(options.root, {
    ...(options.dryRun ? { dryRun: true } : {}),
    excludePacks: archivedNames,
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

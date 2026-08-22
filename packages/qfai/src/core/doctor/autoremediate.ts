/**
 * `qfai doctor --autoremediate` orchestrator.
 *
 * Coordinates three remediations on demand:
 *   1. install unmet runtimeDependencies (via `npm install <name>`).
 *   2. archive stale review packs (delegates to `cleanStaleReviewPacks`).
 *   3. write missing default-keyed config fields (does NOT overwrite
 *      user-authored values).
 *
 * Disabled in CI by default: the caller detects a standard CI environment
 * (`isCiEnvironment`) and passes `isCi`, which makes this emit
 * `"autoremediate disabled in CI"` and return without remediating.
 * Honors `--dry-run` by surfacing the plan in the future tense, without
 * side effects.
 *
 * `--yes` is meant to skip the interactive confirmation the CLI contract
 * requires before any install / tracked-file write. That prompt is NOT
 * implemented yet, so today the pass runs unattended either way — a known
 * deviation from the contract (see `.qfai/contracts/cli/qfai-doctor.md`),
 * not a relaxation of it.
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
import { cleanStaleReviewPacks } from "./cleanReviewPacks.js";
import { probeSkillManifestRuntimeDeps } from "./skillManifestProbe.js";

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
  const presentKeys = topLevelKeys(existing);
  if (presentKeys === null) {
    lines.push(
      `autoremediate: skipped config-fill (${configPath} is not a parseable YAML mapping)`,
    );
    return { written, lines };
  }
  let appended = existing;
  for (const field of DEFAULT_KEYED_CONFIG_FIELDS) {
    if (!presentKeys.has(field.key)) {
      appended = `${appended.replace(/\s*$/u, "")}\n${field.defaultLine}`;
      written.push(field.key);
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
      legacyPacksRecorded: [],
    };
  }

  if (options.dryRun) {
    lines.push("autoremediate: dry-run (no install / archive / config write)");
  }

  // (1) Probe runtimeDependencies and (optionally) install missing ones.
  const installed: string[] = [];
  if (options.skill) {
    const findings = await probeSkillManifestRuntimeDeps(options.root, options.skill);
    const missing = findings.filter((finding) => finding.status === "missing");
    if (missing.length === 0) {
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
  const { config } = await loadConfig(options.root);
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
      `autoremediate: would archive review packs=${archivedNames.length}, in-ttl=${cleanResult.skippedInTtl.length}`,
    );
    for (const packName of archivedNames) {
      lines.push(`  would move -> _archive/${packName}`);
    }
  } else {
    lines.push(
      `autoremediate: review packs archived=${archivedNames.length}, in-ttl=${cleanResult.skippedInTtl.length}`,
    );
    for (const packName of archivedNames) {
      lines.push(`  -> _archive/${packName}`);
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
    configFieldsWritten,
    legacyPacksRecorded: migration.added,
  };
}

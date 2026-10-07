import { constants, type Dirent } from "node:fs";
import { access, lstat, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parseAgentFrontmatter } from "./agentFrontmatter.js";
import { isEnoent } from "./fs/errno.js";
import {
  defaultConfig,
  findConfigRoot,
  getConfigPath,
  loadConfig,
  resolvePath,
  type ConfigPathKey,
} from "./config.js";
import { readUiContractScreenContracts } from "./contracts/screenContracts.js";
import {
  DESIGN_MD_SAMPLE_MARKER,
  isUnreplacedDesignMdSample,
  parseDesignMd,
} from "./design/designMd.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import { toRelativePath } from "./paths.js";
import {
  PROTOTYPING_REQUIRED_ROLE_IDS,
  PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS,
} from "./prototyping/policy.js";
import {
  getProbeOrder as getPlaywrightProbeOrder,
  resolvePlaywrightLauncher,
  type PlaywrightLauncherResolution,
} from "./prototyping/playwrightLauncher.js";
import { resolvePrimaryPrototypingSpec } from "./prototyping/specResolution.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { readStoryTreeModel } from "./storyTree/tree.js";
import type { Issue } from "./types.js";
import { validateDesignContractReadiness } from "./validators/designContractReadiness.js";
import { BIDIRECTIONAL_CONTROLS, LINE_SEPARATORS } from "./validators/assistantAssets.js";
import { validateIntegrationSurface } from "./validators/integrationSurface.js";
import { applyWaivers } from "./waivers.js";
import { resolveToolVersion } from "./version.js";
import {
  probeSkillManifest,
  SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD,
  type SkillManifestProbeResult,
} from "./doctor/skillManifestProbe.js";
import { detectOutDirCollisions } from "./doctor/outDirCollisions.js";
import {
  checkAssistantAssetLineBudget,
  type ExemptAssistantAsset,
  type OversizedAssistantAsset,
  type WideLineAssistantAsset,
} from "./doctor/assetLineBudget.js";
import { checkDocsLane } from "./doctor/docsLane.js";
import { checkMutationProofs } from "./doctor/mutationProofs.js";
import { checkMdschemaBinary } from "./doctor/mdschemaBinary.js";
import { checkWorkflowPreconditions } from "./doctor/workflowPreconditions.js";

export type DoctorSeverity = "ok" | "info" | "warning" | "error";
export type DoctorProfile = "prototyping";

export type DoctorCheck = {
  id: string;
  severity: DoctorSeverity;
  title: string;
  message: string;
  details?: Record<string, unknown>;
};

export type DoctorData = {
  tool: "qfai";
  version: string;
  generatedAt: string;
  root: string;
  profile?: DoctorProfile;
  config: {
    startDir: string;
    found: boolean;
    configPath: string;
  };
  summary: { ok: number; info: number; warning: number; error: number };
  checks: DoctorCheck[];
};

type CreateDoctorDataOptions = {
  startDir: string;
  rootExplicit: boolean;
  profile?: DoctorProfile;
  /**
   * Per-skill profile name (e.g. "qfai-prototyping"). Distinct from
   * the legacy `profile: "prototyping"` enum which gates the bundled
   * prototyping checks. When a skill profile is supplied,
   * the manifest probe runs and contributes `skill.runtimeDependencies`
   * findings.
   */
  skillProfile?: string;
  targetUrl?: string;
};

/** Follows links on every platform, so a broken link does not exist; `access` succeeds on one on Windows. */
async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/** True when the path is a regular file the process may read, which is what `qfai report` needs of validate.json. */
async function isReadableFile(target: string): Promise<boolean> {
  try {
    if (!(await stat(target)).isFile()) {
      return false;
    }
    await access(target, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** True only when nothing is at the path; a file, a broken link or an unreadable path is not absent. */
async function isAbsent(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return false;
  } catch (error: unknown) {
    return isEnoent(error);
  }
}

function addCheck(checks: DoctorCheck[], check: DoctorCheck): void {
  checks.push(check);
}

/** `qfai validate` allocates one of these per run and never reuses one. */
const RUN_LOG_DIR_RE = /^run-\d{17}$/u;

/**
 * Count of run-log directories at which the accumulation is worth
 * mentioning. `outDir` is covered by the managed gitignore block, so
 * `git status` never shows the growth and nothing else prompts a
 * cleanup — this check is the only place the condition becomes visible
 * before the directory is measured in tens of megabytes.
 */
const RUN_LOG_ADVISORY_COUNT = 50;

async function buildRunLogVolumeCheck(root: string, outDirAbs: string): Promise<DoctorCheck> {
  let count: number;
  try {
    const names = await readdir(outDirAbs);
    count = names.filter((name) => RUN_LOG_DIR_RE.test(name)).length;
  } catch {
    // Unreadable outDir is already reported by the `paths.outDir`
    // check above; do not duplicate the finding here.
    count = 0;
  }
  const crowded = count > RUN_LOG_ADVISORY_COUNT;
  return {
    id: "report.runLogs",
    severity: crowded ? "info" : "ok",
    title: "Validate run logs (outDir/run-*)",
    message: crowded
      ? `${count} run-* directories accumulated (> ${RUN_LOG_ADVISORY_COUNT}); run 'qfai doctor --clean' to prune the TTL-expired ones`
      : `${count} run-* directories`,
    details: { outDir: toRelativePath(root, outDirAbs), runLogCount: count },
  };
}

function summarize(checks: DoctorCheck[]): DoctorData["summary"] {
  const summary = { ok: 0, info: 0, warning: 0, error: 0 };
  for (const check of checks) {
    summary[check.severity] += 1;
  }
  return summary;
}

function normalizeGlobs(values: string[]): string[] {
  return values.map((glob) => glob.trim()).filter((glob) => glob.length > 0);
}

const DEFAULT_SKILL_CREATED_PATH_KEYS = new Set<ConfigPathKey>([
  "specsDir",
  "contractsDir",
  "discussionDir",
]);

function isDefaultSkillCreatedPath(key: ConfigPathKey, relPath: string): boolean {
  return DEFAULT_SKILL_CREATED_PATH_KEYS.has(key) && relPath === defaultConfig.paths[key];
}

const DEFAULT_ABSENT_NOTES: Partial<Record<ConfigPathKey, string>> = {
  srcDir: "the project has no source yet",
  testsDir: "the project has no tests yet",
  outDir: "the first `qfai validate` creates it",
};

/** What an absent directory at its shipped default means, or undefined where it is a fault. */
function defaultAbsentNote(key: ConfigPathKey, relPath: string): string | undefined {
  return path.normalize(relPath) === path.normalize(defaultConfig.paths[key])
    ? DEFAULT_ABSENT_NOTES[key]
    : undefined;
}

export async function createDoctorData(options: CreateDoctorDataOptions): Promise<DoctorData> {
  const startDir = path.resolve(options.startDir);
  const checks: DoctorCheck[] = [];

  const configPath = getConfigPath(startDir);
  const search = options.rootExplicit
    ? {
        root: startDir,
        configPath,
        found: await exists(configPath),
      }
    : await findConfigRoot(startDir);

  const root = search.root;
  const version = await resolveToolVersion();
  const generatedAt = new Date().toISOString();

  addCheck(checks, {
    id: "config.search",
    severity: search.found ? "ok" : "warning",
    title: "Config search",
    message: search.found
      ? "qfai.config.yaml found"
      : "qfai.config.yaml not found (default config will be used)",
    details: { configPath: toRelativePath(root, search.configPath) },
  });

  const { config, issues, configPath: resolvedConfigPath } = await loadConfig(root);
  if (issues.length === 0) {
    addCheck(checks, {
      id: "config.load",
      severity: "ok",
      title: "Config load",
      message: "Loaded and normalized with 0 issues",
      details: { configPath: toRelativePath(root, resolvedConfigPath) },
    });
  } else {
    // Pinning every config issue to `warning` made `doctor --fail-on error`
    // exit 0 on a config the loader had rejected — a value past its sunset
    // reads as "normalized with defaults" rather than as the blocking fault
    // the `qfai doctor` contract says it is. The check now carries the worst severity
    // the loader actually reported.
    const configHasError = issues.some((issue) => issue.severity === "error");
    // The text formatter prints only `message`, so the issues the loader
    // returned are listed there, one line, `; `-joined.
    const listed = issues.map((issue) => renderIssueForMessage(issue.message)).join("; ");
    addCheck(checks, {
      id: "config.load",
      severity: configHasError ? "error" : "warning",
      title: "Config load",
      message: configHasError
        ? `Loaded with ${issues.length} issue(s), including ${issues.filter((i) => i.severity === "error").length} that must be fixed: ${listed}`
        : `Loaded with ${issues.length} issue(s) (normalized with defaults when needed): ${listed}`,
      details: {
        configPath: toRelativePath(root, resolvedConfigPath),
        issues,
      },
    });
  }

  const pathKeys = [
    "specsDir",
    "contractsDir",
    "discussionDir",
    "outDir",
    "srcDir",
    "testsDir",
    "skillsDir",
  ] as const;

  for (const key of pathKeys) {
    const resolved = resolvePath(root, config, key);
    const ok = await exists(resolved);
    const missingDefaultSkillCreatedPath = !ok && isDefaultSkillCreatedPath(key, config.paths[key]);
    const absentNote =
      ok || missingDefaultSkillCreatedPath || !(await isAbsent(resolved))
        ? undefined
        : defaultAbsentNote(key, config.paths[key]);
    addCheck(checks, {
      id: `paths.${key}`,
      severity: ok
        ? "ok"
        : missingDefaultSkillCreatedPath || absentNote !== undefined
          ? "info"
          : "warning",
      title: `Path exists: ${key}`,
      message: ok
        ? `${key} exists`
        : missingDefaultSkillCreatedPath
          ? `${key} is not created by init; QFAI skills create it when real artifacts exist`
          : absentNote !== undefined
            ? `${key} is the shipped default and does not exist yet: ${absentNote}`
            : `${key} is missing (configure this path or create the directory)`,
      details: { path: toRelativePath(root, resolved) },
    });

    if (key === "outDir" && ok) {
      addCheck(checks, await buildRunLogVolumeCheck(root, resolved));
    }
  }

  addCheck(checks, await buildIntegrationLinksCheck(root));
  addCheck(checks, await buildAgentFrontmatterCheck(root));
  addCheck(checks, await buildAssetLineBudgetCheck(root));

  addCheck(checks, await checkDocsLane(root));
  const mutationProofs = await checkMutationProofs(root, config);
  if (mutationProofs)
    addCheck(checks, { ...mutationProofs, message: escapeForMessage(mutationProofs.message) });
  addCheck(checks, await checkMdschemaBinary());
  for (const check of await checkWorkflowPreconditions(root)) addCheck(checks, check);

  const deprecatedPromptsDir = resolvePath(root, config, "promptsDir");
  const deprecatedPromptsExists = await exists(deprecatedPromptsDir);
  let deprecatedPromptsContainContent = false;
  if (deprecatedPromptsExists) {
    try {
      const entries = await readdir(deprecatedPromptsDir, { withFileTypes: true });
      deprecatedPromptsContainContent =
        entries.length !== 1 || entries[0]?.name !== ".gitkeep" || !entries[0].isFile();
    } catch {
      // A path that cannot be inspected is not the known empty init seed.
      deprecatedPromptsContainContent = true;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional: checking deprecated promptsDir for diagnostic
  const deprecatedPromptsConfigured = config.paths.promptsDir !== defaultConfig.paths.promptsDir;
  addCheck(checks, {
    id: "paths.promptsDirDeprecated",
    severity: deprecatedPromptsContainContent || deprecatedPromptsConfigured ? "warning" : "ok",
    title: "Deprecated path: promptsDir",
    message: deprecatedPromptsConfigured
      ? "promptsDir is deprecated and is set in the config (migrate to skillsDir)"
      : deprecatedPromptsContainContent
        ? "promptsDir is deprecated; even when it exists it is not used by validation (use skillsDir)"
        : deprecatedPromptsExists
          ? "promptsDir is deprecated; the shipped empty directory contains no prompts"
          : "promptsDir is deprecated (not being created is fine)",
    details: {
      path: toRelativePath(root, deprecatedPromptsDir),
      configured: deprecatedPromptsConfigured,
    },
  });

  if (options.profile === "prototyping") {
    checks.push(...(await buildPrototypingDoctorChecks(root, config, options.targetUrl)));
  }

  if (options.skillProfile) {
    checks.push(...(await buildSkillManifestProbeChecks(root, options.skillProfile)));
  }

  const validateJsonAbs = path.isAbsolute(config.output.validateJsonPath)
    ? config.output.validateJsonPath
    : path.resolve(root, config.output.validateJsonPath);
  const validateJsonExists = await isReadableFile(validateJsonAbs);
  const validateJsonAbsent = !validateJsonExists && (await isAbsent(validateJsonAbs));
  addCheck(checks, {
    id: "output.validateJson",
    severity: validateJsonExists ? "ok" : validateJsonAbsent ? "info" : "warning",
    title: "validate.json",
    message: validateJsonExists
      ? "validate.json exists (report can run)"
      : validateJsonAbsent
        ? "validate.json is missing (run 'qfai validate' before 'qfai report')"
        : "validate.json is not a readable file (a directory, a broken link or an unreadable path); fix or remove it, then run 'qfai validate'",
    details: { path: toRelativePath(root, validateJsonAbs) },
  });

  const outDirAbs = resolvePath(root, config, "outDir");
  const rel = path.relative(outDirAbs, validateJsonAbs);
  const inside = rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  addCheck(checks, {
    id: "output.pathAlignment",
    severity: inside ? "ok" : "warning",
    title: "Output path alignment",
    message: inside
      ? "validateJsonPath is under outDir"
      : "validateJsonPath is not under outDir (may be intended, but check configuration)",
    details: {
      outDir: toRelativePath(root, outDirAbs),
      validateJsonPath: toRelativePath(root, validateJsonAbs),
    },
  });

  if (options.rootExplicit) {
    addCheck(checks, await buildOutDirCollisionCheck(root));
  }

  const storyTree = await readStoryTreeModel(root, config);
  const globs = normalizeGlobs(config.validation.traceability.testFileGlobs);
  const exclude = normalizeGlobs([
    ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
    ...config.validation.traceability.testFileExcludeGlobs,
  ]);

  try {
    const scanResult =
      globs.length === 0
        ? {
            files: [],
            truncated: false,
            matchedFileCount: 0,
            limit: DEFAULT_GLOB_FILE_LIMIT,
          }
        : await collectFilesByGlobs(root, { globs, ignore: exclude });
    const matchedCount = scanResult.matchedFileCount;
    const truncated = scanResult.truncated;

    // A configured glob that matches no test cannot verify a declared flow.
    // An empty story tree has no obligation to scan, and an unset glob is
    // advisory until the project configures its test layout.
    const severity: DoctorSeverity =
      globs.length === 0
        ? "warning"
        : truncated
          ? "warning"
          : storyTree.flows.length > 0 && matchedCount === 0
            ? "error"
            : "ok";

    addCheck(checks, {
      id: "traceability.testGlobs",
      severity,
      title: "Test file globs",
      message:
        globs.length === 0
          ? "testFileGlobs is empty (flow test coverage cannot be verified)"
          : truncated
            ? `fileCount=${matchedCount} (truncated, limit=${scanResult.limit})`
            : `fileCount=${matchedCount}`,
      details: {
        globs,
        excludeGlobs: exclude,
        flows: storyTree.flows.length,
        truncated,
        limit: scanResult.limit,
      },
    });
  } catch (error) {
    addCheck(checks, {
      id: "traceability.testGlobs",
      severity: "error",
      title: "Test file globs",
      message: "Glob scan failed (invalid pattern or filesystem error)",
      details: {
        globs,
        excludeGlobs: exclude,
        limit: DEFAULT_GLOB_FILE_LIMIT,
        error: String(error),
      },
    });
  }

  return {
    tool: "qfai",
    version,
    generatedAt,
    root: toRelativePath(process.cwd(), root),
    ...(options.profile ? { profile: options.profile } : {}),
    config: {
      startDir: toRelativePath(process.cwd(), startDir),
      found: search.found,
      configPath: toRelativePath(root, search.configPath) || "qfai.config.yaml",
    },
    summary: summarize(checks),
    checks,
  };
}

/**
 * Reports assistant assets that exceed the shipped line ceiling.
 *
 * The framework's own asset test asserts the ceiling too, but it is not
 * published, so without this check a project created by init has no way to
 * check the rule its operating baseline states. Severity is `warning`: an oversized asset is
 * authoring drift, not something that stops the active profile.
 */
async function buildAssetLineBudgetCheck(root: string): Promise<DoctorCheck> {
  const report = await checkAssistantAssetLineBudget(root);
  const title = "Assistant asset line budget";
  const details = {
    assistantDir: toRelativePath(root, report.assistantDir),
    maxLines: report.maxLines,
    maxLineChars: report.maxLineChars,
    scanned: report.scanned,
    oversized: report.oversized,
    wideLines: report.wideLines,
    // The baseline promises the exemption is visible to the reader, not just to
    // the implementation: each exempt path is listed with the reason it was not
    // measured, and the same pair is rendered into the message for text readers.
    exempt: report.exempt,
    unreadable: report.unreadable,
    unscannable: report.unscannable,
  };
  const exemptNote = formatExemptAssets(report.exempt);

  if (report.status === "skipped_missing_assistant") {
    return {
      id: "assets.lineBudget",
      severity: "info",
      title,
      message: "Skipped: no assistant assets have been created yet (run 'qfai init')",
      details,
    };
  }

  if (report.status === "ok") {
    return {
      id: "assets.lineBudget",
      severity: "ok",
      title,
      // "within the ceiling that applies to each" rather than "within 400": the
      // shipped files carrying a recorded width are inside their own number and
      // over the default one, so naming the default here would tell a reader the
      // opposite of what was checked.
      // Two counts, because the two ceilings measure different populations.
      // Every scanned asset is held to a width; the exempt ones are not held to
      // a line count, so saying "all N are within 800 lines" would claim a check
      // that did not run on them — and contradict the exemption note beside it.
      message:
        `all ${String(report.scanned - report.exempt.length)} assistant assets held to the ` +
        `line ceiling are within ${report.maxLines} lines, and all ${report.scanned} are ` +
        `within the line width each is held to (${report.maxLineChars} unless the shipped ` +
        `file carries a recorded width)${exemptNote}`,
      details,
    };
  }

  const unmeasuredPaths = [...report.unreadable, ...report.unscannable];
  const unmeasured = unmeasuredPaths.length;

  if (report.status === "incomplete") {
    const incompleteActions = [
      "check that the unreadable paths exist and are readable, then run doctor again",
    ];
    return {
      id: "assets.lineBudget",
      severity: "warning",
      title,
      message:
        `${unmeasured} assistant assets could not be read, so their line counts were not checked: ` +
        `${formatMessagePaths(unmeasuredPaths)}${exemptNote}${formatNextActionHint(incompleteActions)}`,
      details: {
        ...details,
        nextActions: incompleteActions,
      },
    };
  }

  const unmeasuredNote =
    unmeasured > 0
      ? ` (a further ${unmeasured} could not be read and were not checked: ${formatMessagePaths(unmeasuredPaths)})`
      : "";
  const nextActions = assetLineBudgetNextActions(report.oversized, report.wideLines);
  // Both halves in one message. A file can fail either ceiling, and reporting
  // only the count would leave the width failure with no line of its own.
  const overruns = [
    ...(report.oversized.length > 0
      ? [
          `${report.oversized.length} exceed ${report.maxLines} lines: ` +
            formatOversizedAssets(report.oversized),
        ]
      : []),
    ...(report.wideLines.length > 0
      ? [`${report.wideLines.length} carry a line too wide: ` + formatWideAssets(report.wideLines)]
      : []),
  ].join("; ");
  return {
    id: "assets.lineBudget",
    severity: "warning",
    title,
    message:
      `assistant assets over budget — ${overruns}${unmeasuredNote}${exemptNote}` +
      formatNextActionHint(nextActions),
    details: {
      ...details,
      nextActions,
    },
  };
}

/**
 * Whether one code point must not reach a single-line message: a C0, DEL or C1
 * control character, a Unicode line or paragraph separator, or a bidirectional
 * control.
 *
 * Read as code points rather than matched with the equivalent character-class
 * regular expression: that pattern needs an `eslint-disable no-control-regex`,
 * and the universal quality rule forbids adding a suppression without the
 * user’s explicit permission.
 */
function isControlCodePoint(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    LINE_SEPARATORS.has(code) ||
    BIDIRECTIONAL_CONTROLS.has(code)
  );
}

/** The longest one loader issue may run in the `config.load` message; `details.issues` keeps it whole. */
const MAX_LISTED_ISSUE_LENGTH = 500;

const CUT_MARKER = " ... ";

/** Takes whole tokens from the front of `tokens` while they fit in `budget` characters. */
function takeWithin(tokens: ReadonlyArray<string>, budget: number): string[] {
  const taken: string[] = [];
  let used = 0;
  for (const token of tokens) {
    if (used + token.length > budget) {
      break;
    }
    taken.push(token);
    used += token.length;
  }
  return taken;
}

/**
 * Renders one loader issue for the `config.load` message: without a YAML parse
 * error's source excerpt, escaped, and at most `MAX_LISTED_ISSUE_LENGTH`
 * characters as displayed. Several loader messages quote the rejected value, so a
 * very large value is cut. The middle goes, so the start of the message and the
 * diagnosis at its end both stay, and no escape sequence is split.
 */
function renderIssueForMessage(message: string): string {
  const tokens = Array.from(withoutYamlExcerpt(message), escapeCharacter);
  if (tokens.reduce((total, token) => total + token.length, 0) <= MAX_LISTED_ISSUE_LENGTH) {
    return tokens.join("");
  }
  const kept = MAX_LISTED_ISSUE_LENGTH - CUT_MARKER.length;
  const head = takeWithin(tokens, Math.ceil(kept / 2));
  const tail = takeWithin(tokens.slice().reverse(), Math.floor(kept / 2)).reverse();
  return `${head.join("")}${CUT_MARKER}${tail.join("")}`;
}

/**
 * A YAML parse error ends with an excerpt of the offending source after a blank
 * line, and that excerpt can hold any value the file holds. This keeps the cause
 * and its position and drops the excerpt; any other issue is returned whole.
 */
function withoutYamlExcerpt(message: string): string {
  return message.replace(/^([^\r\n]* at line \d+, column \d+:)\r?\n\r?\n[\s\S]*$/, "$1");
}

/**
 * Makes any display string — a path, a filename or a loader message — safe to
 * splice into a single-line finding message.
 *
 * A filename may legally contain a newline or an ANSI escape on POSIX, and
 * `formatDoctorText` prints `check.message` verbatim. Left raw, such a string
 * could inject extra lines — including counterfeit `[ok]` / `[error]` lines —
 * into the very output whose one-finding-per-line shape downstream severity
 * greps rely on. `details` keeps the raw value; only what is rendered is
 * escaped.
 */
function escapeCharacter(character: string): string {
  const code = character.codePointAt(0);
  return code !== undefined && isControlCodePoint(code)
    ? `\\${code > 0xff ? "u" : "x"}${code.toString(16).padStart(code > 0xff ? 4 : 2, "0")}`
    : character;
}

function escapeForMessage(value: string): string {
  return Array.from(value, escapeCharacter).join("");
}

function formatMessagePaths(paths: ReadonlyArray<string>): string {
  return paths.map(escapeForMessage).join(", ");
}

/**
 * Renders the offending files into `check.message` itself.
 *
 * The default `qfai doctor` run is the text formatter, and that formatter
 * prints only `check.message` — `details` reaches nobody who did not pass
 * `--format json`. The shipped baseline promises the ordinary command reports
 * every file over the ceiling, so the paths and their measured line counts
 * belong in the message. Same shape as `skill.runtimeDependencies`: the whole
 * list, comma-joined on one line, so the severity-grep readers downstream still
 * see exactly one line per finding.
 */
function formatOversizedAssets(oversized: ReadonlyArray<OversizedAssistantAsset>): string {
  return oversized
    .map((entry) => `${escapeForMessage(entry.path)} (${entry.lines} lines)`)
    .join(", ");
}

/**
 * Names the width each file was held to, not only the width it has.
 *
 * A file carrying a recorded width is measured against that number rather than
 * the shipped ceiling, so `(1500 chars)` alone would leave a reader unable to
 * tell a regression from a file that was always wide.
 */
function formatWideAssets(wide: ReadonlyArray<WideLineAssistantAsset>): string {
  return wide
    .map((entry) => `${escapeForMessage(entry.path)} (${entry.widest} > ${entry.allowed} chars)`)
    .join(", ");
}

/**
 * States what was skipped and why, in the default output as well as in JSON.
 *
 * An asset that is never measured is invisible otherwise: the counts speak only
 * for what was measured, so without this a reader has no way to tell a compliant
 * tree from one whose longest file is exempt. The baseline promises the reason
 * travels with the path, so both are rendered.
 */
function formatExemptAssets(exempt: ReadonlyArray<ExemptAssistantAsset>): string {
  if (exempt.length === 0) {
    return "";
  }
  const entries = exempt
    .map((entry) => `${escapeForMessage(entry.path)} (${escapeForMessage(entry.reason)})`)
    .join(", ");
  // "from the line ceiling", not "from the check": these files are measured for
  // width like every other asset, and the same message says so one clause
  // earlier. Naming the whole check reads as though they were skipped.
  return ` (${exempt.length} exempt from the line ceiling: ${entries})`;
}

/** Appends the repair guidance so text readers get it, not only JSON readers. */
function formatNextActionHint(actions: ReadonlyArray<string>): string {
  return actions.length > 0 ? ` — next: ${actions.join(" / ")}` : "";
}

/**
 * Repair guidance for the layers the oversized files actually sit in.
 *
 * `assets.lineBudget` measures every assistant asset, not just skills, so a
 * blanket "move a section under the skill's references/" would tell a reader to
 * relocate a rule document or an agent card into an unrelated skill
 * and break the loader contract that reads it from its own layer.
 */
function assetLineBudgetNextActions(
  oversized: ReadonlyArray<{ path: string }>,
  wide: ReadonlyArray<{ path: string }>,
): string[] {
  const actions: string[] = [];
  const paths = [...new Set(oversized.map((entry) => entry.path))];
  const hasSkillAsset = paths.some((entry) => entry.startsWith("assistant/skill/"));
  const hasOtherAsset = paths.some((entry) => !entry.startsWith("assistant/skill/"));
  if (hasSkillAsset) {
    actions.push("move one topic out of the oversized skill into that skill's own references/");
  }
  if (hasOtherAsset) {
    actions.push(
      "split a non-skill asset (rule/, agent/, prompt/) by topic within its own layer, and update the paths that reference it",
    );
  }
  // A separate action, because the two ceilings ask for different edits. A file
  // of two lines can fail the width one, and telling its author to move a topic
  // into `references/` asks for a structural change that would not fix it: what
  // the width ceiling wants is the line wrapped.
  if (wide.length > 0) {
    actions.push(
      "wrap the over-wide prose — a list item, an ordered item or a paragraph — at the width ceiling; a table row and a fenced block are not measured",
    );
  }
  return actions;
}

/**
 * Whether the integration wrappers a skill is loaded through actually resolve.
 *
 * Asks the question `validate` asks, through the same code and at the severity
 * that code chose, so the two cannot disagree about one tree.
 *
 * Severity is carried, not decided here. `QFAI-LINK-001` is a `warning` when the
 * canonical document is readable and an `error` when it is not, and choosing one
 * of them for both would put this check and the gate on opposite sides of
 * `--fail-on error` for the same tree.
 *
 * The remedy is carried for the same reason: it depends on which damage the
 * validator found, and several shapes are not fixed by re-running `init` at all.
 *
 * A wrapper that was never created is not damage and is not reported here; the
 * validator draws that line, and this check inherits it by not drawing its own.
 */
/**
 * The worst severity in `issues`, or `null` when there are none.
 *
 * A finding reaches this check at `error`, `warning` or `info` — the last when
 * a waiver lowered it without suppressing it — and the check has to sit on the
 * same side of every `--fail-on` threshold as the gate, not only `error`.
 */
function worstSeverity(issues: readonly Issue[]): DoctorSeverity | null {
  if (issues.some((issue) => issue.severity === "error")) return "error";
  if (issues.some((issue) => issue.severity === "warning")) return "warning";
  return issues.length > 0 ? "info" : null;
}

async function buildIntegrationLinksCheck(root: string): Promise<DoctorCheck> {
  const title = "Integration wrappers (.claude / .codex / .agents / .github)";
  let issues: Issue[];
  try {
    issues = await validateIntegrationSurface(root);
  } catch {
    // The surface could not be walked at all — a permission or an I/O failure
    // over a directory or a link. Reported rather than thrown, because a check
    // that exists to describe a damaged tree must survive one; at `error`,
    // because the validator propagates this and takes `validate` down with it.
    // A check that could not run is not a check that passed.
    return {
      id: "integration.links",
      severity: "error",
      title,
      message:
        "Could not inspect the integration wrappers (reading a directory or a link failed). " +
        "Check the permissions and the path.",
      details: {},
    };
  }

  // The same waiver pass `validate` runs. Without it a project that waived this
  // finding passes the gate and fails the diagnostic, which is the disagreement
  // this check exists to remove — reintroduced one layer along.
  const waived = await applyWaivers(root, issues).catch(() => null);
  const applied = waived?.issues ?? issues;

  // The waiver pass reports on its own input as well as on the findings: a
  // waiver file that does not parse, or one written at the unsupported
  // extension, comes back as `QFAI-WAIVER-001`. Keeping only the link findings
  // dropped those, so `validate` failed on the waiver file while `doctor`
  // passed — the same disagreement this check exists to remove, over the file
  // that decides what the check is allowed to stay quiet about.
  //
  // The suppressions themselves are still read. A file that fails to parse
  // yields no waivers at all, so there is nothing there to distrust; the one
  // fault that leaves working suppressions behind is a stray `.yaml` beside a
  // valid `.yml`, and those suppressions are the project's, correctly parsed.
  const waiverFaults = applied.filter(
    (issue) => issue.code === "QFAI-WAIVER-001" && issue.suppressed !== true,
  );
  const broken = applied.filter(
    (issue) => issue.code === "QFAI-LINK-001" && issue.suppressed !== true,
  );

  if (broken.length === 0) {
    const suppressed = applied.filter(
      (issue) => issue.code === "QFAI-LINK-001" && issue.suppressed === true,
    ).length;
    if (waiverFaults.length > 0) {
      return {
        id: "integration.links",
        // The gate fails on the waiver file whatever the wrappers look like, so
        // a clean sweep of the wrappers is not a passing check here.
        severity: worstSeverity(waiverFaults) ?? /* c8 ignore next */ "error",
        title,
        message:
          "No unwaived integration wrapper findings, but the waiver file itself is rejected. " +
          "`qfai validate` reports it as QFAI-WAIVER-001.",
        details: {},
      };
    }
    return {
      id: "integration.links",
      severity: "ok",
      title,
      // A waiver silences a finding; it does not repair the wrapper. Saying
      // every wrapper resolves would report a tree as sound on the strength of
      // a decision to stop being told about it.
      message:
        suppressed === 0
          ? "Every integration wrapper resolves to the skill or agent it names"
          : `No unwaived integration wrapper findings (${String(suppressed)} waived — still unrepaired)`,
      details: suppressed === 0 ? {} : { waivedFindings: suppressed },
    };
  }

  const paths = broken.flatMap((issue) => issue.refs ?? []);
  // The worst severity anything in this run carries — the wrapper findings and
  // the waiver pass's own. The validator reports the damage classes separately
  // (a readable canonical document is a `warning`, an unreadable one an
  // `error`) and a waiver can downgrade either to `info` without suppressing
  // it, so collapsing everything short of `error` to `warning` put this check
  // on the far side of `validation.failOn: warning` from a `validate` that
  // passes on the downgrade.
  const severity: DoctorSeverity =
    worstSeverity([...broken, ...waiverFaults]) ?? /* c8 ignore next */ "warning";
  return {
    id: "integration.links",
    severity,
    title,
    // Counts and paths, not a diagnosis. `QFAI-LINK-001` covers several shapes
    // and they do not share one sentence: a flattened link is not loaded at
    // all, while a wrapper left behind by a retired skill resolves perfectly
    // and is loading instructions this release no longer ships. Asserting
    // "not being loaded" over both hid the second, which is the worse one.
    message:
      `${String(paths.length || broken.length)} integration wrapper(s) need attention. ` +
      "`qfai validate` reports the same paths as QFAI-LINK-001, and its finding says which " +
      "damage each one is and how to repair it.",
    details: {
      wrappers: paths,
      // English, because `doctor`'s output is. The per-shape remedy is the
      // validator's and stays there: pointing at it beats copying text written
      // to a different contract into this one's JSON.
      nextActions: ["Run qfai validate and follow the QFAI-LINK-001 finding for these paths"],
    },
  };
}

async function buildAgentFrontmatterCheck(root: string): Promise<DoctorCheck> {
  const agentsDir = path.join(root, ".qfai", "assistant", "agent");
  if (!(await exists(agentsDir))) {
    return {
      id: "agents.frontmatter",
      severity: "warning",
      title: "Agent frontmatter",
      message: "canonical agent directory is missing (run 'qfai init')",
      details: { path: toRelativePath(root, agentsDir) },
    };
  }

  let entries: Dirent[];
  try {
    entries = await readdir(agentsDir, { withFileTypes: true });
  } catch {
    // `exists()` passed, so this is a permission or race failure rather than
    // an absent tree. Reporting it beats rejecting the whole doctor run.
    return {
      id: "agents.frontmatter",
      severity: "warning",
      title: "Agent frontmatter",
      message: "Could not enumerate the agent directory (check the permissions or a lock)",
      details: { path: toRelativePath(root, agentsDir) },
    };
  }
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (markdownFiles.length === 0) {
    return {
      id: "agents.frontmatter",
      severity: "warning",
      title: "Agent frontmatter",
      message: "no canonical agent markdown files were found",
      details: { path: toRelativePath(root, agentsDir) },
    };
  }

  const invalidFiles: Array<{ file: string; error: string }> = [];
  const unreadableFiles: string[] = [];
  for (const fileName of markdownFiles) {
    const filePath = path.join(agentsDir, fileName);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      // Deleted between the listing and the read, or unreadable. It is not
      // "valid frontmatter" and it must not reject the run either.
      unreadableFiles.push(`.qfai/assistant/agent/${fileName}`);
      continue;
    }
    const parsed = parseAgentFrontmatter(content);
    if (!parsed.ok) {
      invalidFiles.push({
        file: `.qfai/assistant/agent/${fileName}`,
        error: parsed.error,
      });
    }
  }

  if (unreadableFiles.length > 0 && invalidFiles.length === 0) {
    return {
      id: "agents.frontmatter",
      severity: "warning",
      title: "Agent frontmatter",
      message: `Agent definitions could not be read, so they were not checked (count=${unreadableFiles.length}): ${formatMessagePaths(unreadableFiles)}`,
      details: { count: markdownFiles.length, unreadableFiles },
    };
  }

  if (invalidFiles.length > 0) {
    return {
      id: "agents.frontmatter",
      severity: "error",
      title: "Agent frontmatter",
      message: `invalid Claude/GitHub Copilot-compatible frontmatter detected (count=${invalidFiles.length})`,
      details: {
        count: markdownFiles.length,
        invalidFiles,
      },
    };
  }

  return {
    id: "agents.frontmatter",
    severity: "ok",
    title: "Agent frontmatter",
    message: `all canonical agent markdown files include valid Claude/GitHub Copilot-compatible frontmatter (count=${markdownFiles.length})`,
    details: {
      count: markdownFiles.length,
      path: toRelativePath(root, agentsDir),
    },
  };
}

/**
 * Report a manifest the probe could not read. An unprobed manifest is
 * NOT a clean bill of health: nothing was probed.
 *
 * The four unprobed states are diagnosed apart because they call for
 * different actions:
 * - `unparseable` / `unreadable` — the path is occupied by something
 *   unusable, so this is an error the user must repair (bad JSON,
 *   permissions, I/O, or a skill "directory" that is a regular file).
 * - skills root missing — the project is uninitialized (or its
 *   configured `paths.skillsDir` is gone). Every skill name resolves
 *   to a missing directory then, so blaming `--profile` would be a
 *   misdiagnosis; this is the same "run init" condition that the
 *   `paths.skillsDir` check reports, and it stays
 *   a warning so `--fail-on error` is not tripped by it.
 * - skill directory missing inside an existing skills root — only
 *   here is the `--profile` value itself wrong (a typo, or a skill
 *   that was renamed), so that case is an error.
 */
function buildUnreadableManifestCheck(
  root: string,
  skill: string,
  result: SkillManifestProbeResult,
): DoctorCheck {
  const manifestRel = toRelativePath(root, result.manifestPath);
  const skillDirRel = toRelativePath(root, path.dirname(result.manifestPath));
  const skillsRootRel = toRelativePath(root, result.skillsRootPath);
  const details = {
    skill,
    manifest: result.manifest,
    manifestPath: manifestRel,
    skillDirExists: result.skillDirExists,
    skillsRootExists: result.skillsRootExists,
    skillsRoot: skillsRootRel,
  };
  const base = { id: "skill.runtimeDependencies", title: "Skill runtimeDependencies", details };
  if (result.manifest === "unparseable") {
    return {
      ...base,
      severity: "error",
      message: `manifest for skill '${skill}' at ${manifestRel} is not JSON declaring a '${SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD}' array — runtimeDependencies were not probed`,
    };
  }
  if (result.manifest === "unreadable") {
    return {
      ...base,
      severity: "error",
      message: `manifest for skill '${skill}' at ${manifestRel} could not be read (permissions, a directory in its place, a path component that is a regular file instead of a directory, or an I/O error) — runtimeDependencies were not probed`,
    };
  }
  if (!result.skillsRootExists) {
    return {
      ...base,
      severity: "warning",
      message: `skills root ${skillsRootRel} does not exist, so skill '${skill}' could not be resolved (run 'qfai init', or fix paths.skillsDir) — runtimeDependencies were not probed`,
    };
  }
  if (!result.skillDirExists) {
    return {
      ...base,
      severity: "error",
      message: `unknown skill '${skill}': no skill directory at ${skillDirRel} — check the --profile value; runtimeDependencies were not probed`,
    };
  }
  return {
    ...base,
    severity: "warning",
    message: `no manifest for skill '${skill}' at ${manifestRel} — runtimeDependencies were not probed`,
  };
}

async function buildSkillManifestProbeChecks(root: string, skill: string): Promise<DoctorCheck[]> {
  const result = await probeSkillManifest(root, skill);
  if (result.manifest !== "found") {
    return [buildUnreadableManifestCheck(root, skill, result)];
  }
  const findings = result.findings;
  const manifestPath = toRelativePath(root, result.manifestPath);
  if (findings.length === 0) {
    return [
      {
        id: "skill.runtimeDependencies",
        severity: "ok",
        title: "Skill runtimeDependencies",
        message: `manifest for skill '${skill}' declares no runtimeDependencies (${manifestPath})`,
        details: { skill, manifestPath },
      },
    ];
  }
  const missing = findings.filter((finding) => finding.status === "missing");
  if (missing.length === 0) {
    return [
      {
        id: "skill.runtimeDependencies",
        severity: "ok",
        title: "Skill runtimeDependencies",
        message: `all runtimeDependencies for skill '${skill}' are installed (count=${findings.length})`,
        details: {
          skill,
          manifestPath,
          deps: findings.map((finding) => ({ name: finding.name, status: finding.status })),
        },
      },
    ];
  }
  return [
    {
      id: "skill.runtimeDependencies",
      severity: "error",
      title: "Skill runtimeDependencies",
      message: `missing runtimeDependencies for skill '${skill}': ${missing
        .map((finding) => `${finding.name} (${finding.installCommand})`)
        .join(", ")}`,
      details: {
        skill,
        manifestPath,
        missing: missing.map((finding) => ({
          name: finding.name,
          installCommand: finding.installCommand,
          probedPaths: finding.probedPaths,
        })),
        deps: findings.map((finding) => ({ name: finding.name, status: finding.status })),
      },
    },
  ];
}

async function buildPrototypingDoctorChecks(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
  targetUrlOverride?: string,
): Promise<DoctorCheck[]> {
  const targetUrl = targetUrlOverride ?? config.prototyping?.execution?.targetUrl ?? undefined;
  const [
    primarySpec,
    uiContracts,
    designMdReadiness,
    requiredRoles,
    launcherChecks,
    targetUrlCheck,
  ] = await Promise.all([
    buildPrototypingPrimarySpecCheck(root, config),
    buildPrototypingUiContractsCheck(root, config),
    buildPrototypingDesignMdReadinessCheck(root, config),
    buildPrototypingRolesCheck(root),
    buildPlaywrightLauncherChecks(root),
    buildTargetUrlCheck(root, targetUrl, targetUrlOverride ? "cli" : "config"),
  ]);
  const designMdChecks = await buildPrototypingDesignMdChecks(root);
  // `launcherChecks` may yield 1 or 2 entries: the primary check plus an
  // optional `D-DEPRECATED-PROBE` finding when the deprecated stage resolves.
  return [
    primarySpec,
    uiContracts,
    designMdReadiness,
    requiredRoles,
    ...launcherChecks,
    targetUrlCheck,
    ...designMdChecks,
  ];
}

async function buildPrototypingDesignMdChecks(root: string): Promise<DoctorCheck[]> {
  const designMdRel = "DESIGN.md";
  const designMdAbs = path.join(root, designMdRel);

  const checks: DoctorCheck[] = [];
  let designMdText: string | null;
  try {
    designMdText = await readFile(designMdAbs, "utf-8");
  } catch {
    designMdText = null;
  }

  if (designMdText === null) {
    checks.push({
      id: "prototyping.designMdRoot",
      severity: "error",
      title: "Root DESIGN.md",
      message: `root DESIGN.md is missing at ${designMdRel}`,
      details: { path: designMdRel },
    });
  } else if (isUnreplacedDesignMdSample(designMdText)) {
    // `qfai init` seeds the shipped sample brand into the project root,
    // so "file exists and parses" cannot distinguish an authored brand
    // from an unauthored one. Report it here, before a prototyping loop
    // runs against it as the project's brand.
    //
    // Samples seeded by releases that predate the marker are detected by
    // content fingerprint instead, so the remediation text must not tell
    // those projects to delete a comment that is not there.
    const markerPresent = designMdText.includes(DESIGN_MD_SAMPLE_MARKER);
    checks.push({
      id: "prototyping.designMdRoot",
      severity: "error",
      title: "Root DESIGN.md",
      message: markerPresent
        ? "root DESIGN.md is still the qfai sample brand — replace it with this product's brand SSOT and delete the sample marker before prototyping"
        : "root DESIGN.md is still the qfai sample brand (seeded by a release older than the sample marker) — replace it with this product's brand SSOT before prototyping",
      details: { path: designMdRel, marker: markerPresent ? DESIGN_MD_SAMPLE_MARKER : null },
    });
  } else {
    const parsed = parseDesignMd(designMdText);
    if ("error" in parsed) {
      checks.push({
        id: "prototyping.designMdRoot",
        severity: "error",
        title: "Root DESIGN.md",
        message: `root DESIGN.md failed to parse: ${parsed.error.message}`,
        details: { path: designMdRel, code: parsed.error.code },
      });
    } else {
      checks.push({
        id: "prototyping.designMdRoot",
        severity: "ok",
        title: "Root DESIGN.md",
        message: "root DESIGN.md parses",
        details: { path: designMdRel },
      });
    }
  }

  return checks;
}

async function buildPrototypingPrimarySpecCheck(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck> {
  const resolvedContract = await resolvePrimaryPrototypingSpec(root, config);
  if (!resolvedContract) {
    return {
      id: "prototyping.primaryUiContract",
      severity: "error",
      title: "Primary UI contract",
      message: "no UI contract with UI-NNNN and screens[] resolved under contractsDir/ui",
    };
  }

  return {
    id: "prototyping.primaryUiContract",
    severity: "ok",
    title: "Primary UI contract",
    message: `resolved primary UI contract ${resolvedContract.uiContractId}`,
    details: {
      uiContractId: resolvedContract.uiContractId,
      path: resolvedContract.contractPath,
    },
  };
}

async function buildPrototypingUiContractsCheck(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck> {
  const screens = await readUiContractScreenContracts(root, config.paths.contractsDir);
  if (screens.length === 0) {
    return {
      id: "prototyping.uiContracts",
      severity: "error",
      title: "UI contracts",
      message:
        "no UI screens declared under contracts/ui; prototyping review bundle cannot be prepared",
      details: {
        contractsDir: config.paths.contractsDir,
      },
    };
  }

  // A prototype is built around each screen's primary tasks, so the stage does
  // not start while a screen has none. The audit lane refuses the same contract
  // under `QFAI-AUD-001`; without this, the stage's own preflight passed it.
  // A screen whose every entry is malformed has no task either, but telling
  // its author to add one hides the cause: the entries are there, in the
  // wrong shape.
  const withoutTasks = screens.filter((screen) => screen.primaryTasks.length === 0);
  if (withoutTasks.length > 0) {
    const refs = (list: typeof screens): string =>
      list.map((screen) => screen.sourceRef || screen.screenId).join(", ");
    const malformed = withoutTasks.filter((screen) => screen.primaryTaskShapeFindings.length > 0);
    const empty = withoutTasks.filter((screen) => screen.primaryTaskShapeFindings.length === 0);
    const problems = [
      ...(empty.length > 0
        ? [
            `UI contract screen(s) with no primary_tasks: ${refs(empty)}; add at least one primary_task to each screen`,
          ]
        : []),
      ...(malformed.length > 0
        ? [
            `UI contract screen(s) whose primary_tasks entries are not {id, label, acceptance} mappings: ${refs(malformed)}; write each entry as a mapping with exactly id, label and acceptance`,
          ]
        : []),
    ];
    return {
      id: "prototyping.uiContracts",
      severity: "error",
      title: "UI contracts",
      message: `${problems.join("; ")} before prototyping`,
      details: {
        contractsDir: config.paths.contractsDir,
        screenIds: withoutTasks.map((screen) => screen.screenId),
      },
    };
  }

  return {
    id: "prototyping.uiContracts",
    severity: "ok",
    title: "UI contracts",
    message: `UI contracts declare ${screens.length} screen(s) for prototyping`,
    details: {
      contractsDir: config.paths.contractsDir,
      screenIds: screens.map((screen) => screen.screenId),
    },
  };
}

async function buildPrototypingDesignMdReadinessCheck(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck> {
  const issues = await validateDesignContractReadiness(root, config);
  if (issues.length === 0) {
    return {
      id: "prototyping.designMdReadiness",
      severity: "ok",
      title: "Root DESIGN.md readiness",
      message: "root DESIGN.md satisfies the readiness checks",
      details: {
        designMd: "DESIGN.md",
      },
    };
  }

  const codeCounts = new Map<string, number>();
  for (const item of issues) {
    codeCounts.set(item.code, (codeCounts.get(item.code) ?? 0) + 1);
  }

  return {
    id: "prototyping.designMdReadiness",
    severity: issues.some((item) => item.severity === "error") ? "error" : "warning",
    title: "Root DESIGN.md readiness",
    message: `root DESIGN.md has blocking issue(s) (count=${issues.length})`,
    details: {
      designMd: "DESIGN.md",
      issues: issues.map((item) => ({
        code: item.code,
        severity: item.severity,
        file: item.file,
        message: item.message,
      })),
      codeSummary: Array.from(codeCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((left, right) => left.code.localeCompare(right.code)),
    },
  };
}

async function buildPrototypingRolesCheck(root: string): Promise<DoctorCheck> {
  const activeIntegrations = await Promise.all(
    PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS.map(async (integration) => {
      const absDir = path.join(root, integration.dir);
      return (await exists(absDir)) ? { ...integration, absDir } : null;
    }),
  ).then((items) => items.filter((item) => item !== null));

  if (activeIntegrations.length === 0) {
    return {
      id: "prototyping.requiredRoles",
      severity: "error",
      title: "Required prototyping roles",
      message:
        "no supported prototyping agent wrapper integrations were found (.claude/agents or .github/agents)",
      details: {
        requiredRoles: PROTOTYPING_REQUIRED_ROLE_IDS,
        expectedIntegrations: PROTOTYPING_ROLE_WRAPPER_INTEGRATIONS,
      },
    };
  }

  const roleFindings: Array<Record<string, unknown>> = [];
  for (const roleId of PROTOTYPING_REQUIRED_ROLE_IDS) {
    const canonicalPath = path.join(root, ".qfai", "assistant", "agent", `${roleId}.md`);
    const canonicalExists = await exists(canonicalPath);
    const finding: Record<string, unknown> = {
      roleId,
      canonicalPath: toRelativePath(root, canonicalPath),
      canonicalExists,
      activeIntegrations: activeIntegrations.map((integration) => integration.id),
      wrappers: [] as Array<Record<string, unknown>>,
      missingLiteralInputs: [] as string[],
    };

    if (canonicalExists) {
      const canonicalContent = await readFile(canonicalPath, "utf-8");
      const parsedCanonical = parseAgentFrontmatter(canonicalContent);
      finding.canonicalFrontmatterValid = parsedCanonical.ok;
      if (parsedCanonical.ok) {
        finding.canonicalFrontmatterName = parsedCanonical.frontmatter.name;
      } else {
        finding.canonicalFrontmatterError = parsedCanonical.error;
      }

      const requiredInputs = extractLiteralRequiredInputs(canonicalContent);
      const missingLiteralInputs = (
        await Promise.all(
          requiredInputs.map(async (relativePath) => {
            const existsOnDisk = await exists(path.join(root, relativePath));
            return existsOnDisk ? null : relativePath;
          }),
        )
      ).filter((value) => value !== null);
      finding.missingLiteralInputs = missingLiteralInputs;
    }

    for (const integration of activeIntegrations) {
      const wrapperPath = path.join(integration.absDir, `${roleId}${integration.suffix}`);
      const wrapperExists = await exists(wrapperPath);
      const wrapperFinding: Record<string, unknown> = {
        integration: integration.id,
        label: integration.label,
        wrapperPath: toRelativePath(root, wrapperPath),
        wrapperExists,
      };
      if (wrapperExists) {
        const parsedWrapper = parseAgentFrontmatter(await readFile(wrapperPath, "utf-8"));
        wrapperFinding.frontmatterValid = parsedWrapper.ok;
        if (parsedWrapper.ok) {
          wrapperFinding.frontmatterName = parsedWrapper.frontmatter.name;
        } else {
          wrapperFinding.error = parsedWrapper.error;
        }
      }
      (finding["wrappers"] as Array<Record<string, unknown>>).push(wrapperFinding);
    }

    roleFindings.push(finding);
  }

  const invalidRoles = roleFindings.filter((item) => {
    if (item["canonicalExists"] !== true) {
      return true;
    }
    if (
      item["canonicalFrontmatterValid"] !== true ||
      item["canonicalFrontmatterName"] !== item["roleId"]
    ) {
      return true;
    }
    if (((item["missingLiteralInputs"] as string[] | undefined) ?? []).length > 0) {
      return true;
    }
    return ((item["wrappers"] as Array<Record<string, unknown>> | undefined) ?? []).some(
      (wrapper) =>
        wrapper["wrapperExists"] !== true ||
        wrapper["frontmatterValid"] !== true ||
        wrapper["frontmatterName"] !== item["roleId"],
    );
  });

  if (invalidRoles.length > 0) {
    return {
      id: "prototyping.requiredRoles",
      severity: "error",
      title: "Required prototyping roles",
      message: `required prototyping role readiness issues detected (count=${invalidRoles.length})`,
      details: {
        requiredRoles: PROTOTYPING_REQUIRED_ROLE_IDS,
        activeIntegrations: activeIntegrations.map(({ id, dir, label }) => ({ id, dir, label })),
        invalidRoles,
      },
    };
  }

  return {
    id: "prototyping.requiredRoles",
    severity: "ok",
    title: "Required prototyping roles",
    message:
      `all required prototyping roles are ready across ${activeIntegrations.length} integration(s) ` +
      `(count=${PROTOTYPING_REQUIRED_ROLE_IDS.length})`,
    details: {
      requiredRoles: PROTOTYPING_REQUIRED_ROLE_IDS,
      activeIntegrations: activeIntegrations.map(({ id, dir, label }) => ({ id, dir, label })),
    },
  };
}

const PLAYWRIGHT_SUNSET = "1.10.0";
const PLAYWRIGHT_INSTALL_HINT = "npm i -D playwright";

async function buildPlaywrightLauncherChecks(root: string): Promise<DoctorCheck[]> {
  const resolution = await resolvePlaywrightLauncher(root);
  const probeOrder = getPlaywrightProbeOrder();
  const lookedInRelative = {
    ...resolution.lookedIn,
    scriptsDir: toRelativePath(root, resolution.lookedIn.scriptsDir),
    localBinDir: toRelativePath(root, resolution.lookedIn.localBinDir),
  };

  if (resolution.status === "resolved" && resolution.resolved) {
    return buildResolvedChecks(root, resolution.resolved, lookedInRelative, probeOrder);
  }
  if (resolution.status === "not_runnable") {
    return [buildNotRunnableCheck(root, resolution.attempts, lookedInRelative, probeOrder)];
  }
  return [buildNotFoundCheck(lookedInRelative, probeOrder)];
}

type LauncherLookedIn = {
  scriptsDir: string;
  localBinDir: string;
  path: string;
};

function buildResolvedChecks(
  root: string,
  resolved: PlaywrightLauncherResolution["attempts"][number],
  lookedInRelative: LauncherLookedIn,
  probeOrder: string[],
): DoctorCheck[] {
  const checks: DoctorCheck[] = [
    {
      id: "prototyping.playwrightCli",
      severity: "ok",
      title: "Playwright launcher",
      message: `playwright launcher resolved via ${resolved.origin} (stage=${resolved.stage}) and passed bounded invocation probe`,
      details: {
        resolvedStage: resolved.stage,
        deprecated: resolved.stage === "deprecated-cli",
        origin: resolved.origin,
        executable: relativizeMaybe(root, resolved.executable),
        args: resolved.args,
        displayCommand: resolved.displayCommand,
        probe: resolved.probe,
        probeOrder,
        lookedIn: lookedInRelative,
      },
    },
  ];
  if (resolved.stage === "deprecated-cli") {
    // The literal `sunset: 1.10.0` substring is part of the public wire
    // contract, so it is written as a constant rather than folded into prose.
    checks.push({
      // The config layer rejects this launcher, so anything softer than an
      // error would have doctor call "fine" what `loadConfig` calls broken.
      id: "D-DEPRECATED-PROBE",
      severity: "error",
      title: "Deprecated playwright-cli probe",
      message: `playwright-cli probe is deprecated (sunset: ${PLAYWRIGHT_SUNSET}); install playwright as the primary launcher (${PLAYWRIGHT_INSTALL_HINT})`,
      details: {
        sunset: PLAYWRIGHT_SUNSET,
        installHint: PLAYWRIGHT_INSTALL_HINT,
        resolvedVia: resolved.origin,
        executable: relativizeMaybe(root, resolved.executable),
        probeOrder,
      },
    });
  }
  return checks;
}

function buildNotRunnableCheck(
  root: string,
  attempts: PlaywrightLauncherResolution["attempts"],
  lookedInRelative: LauncherLookedIn,
  probeOrder: string[],
): DoctorCheck {
  return {
    id: "prototyping.playwrightCli",
    severity: "error",
    title: "Playwright launcher",
    message: `playwright launcher candidates were found but none passed the bounded invocation probe (install hint: ${PLAYWRIGHT_INSTALL_HINT})`,
    details: {
      installHint: PLAYWRIGHT_INSTALL_HINT,
      probeOrder,
      attempts: attempts.map((attempt) => ({
        stage: attempt.stage,
        origin: attempt.origin,
        executable: relativizeMaybe(root, attempt.executable),
        args: attempt.args,
        displayCommand: attempt.displayCommand,
        probe: attempt.probe,
      })),
      lookedIn: lookedInRelative,
    },
  };
}

function buildNotFoundCheck(lookedInRelative: LauncherLookedIn, probeOrder: string[]): DoctorCheck {
  return {
    id: "prototyping.playwrightCli",
    severity: "error",
    title: "Playwright launcher",
    message: `no runnable playwright launcher resolved (probe order: ${probeOrder.join(" -> ")}); install hint: ${PLAYWRIGHT_INSTALL_HINT}`,
    details: {
      installHint: PLAYWRIGHT_INSTALL_HINT,
      probeOrder,
      lookedIn: lookedInRelative,
    },
  };
}

async function buildTargetUrlCheck(
  root: string,
  targetUrl: string | null | undefined,
  source: "cli" | "config",
): Promise<DoctorCheck> {
  if (!targetUrl) {
    return {
      id: "prototyping.targetUrl",
      severity: "warning",
      title: "Target URL",
      message:
        "no targetUrl configured for the prototyping profile (set prototyping.execution.targetUrl or pass --target-url)",
    };
  }

  const probe = await probeHttpUrl(targetUrl);
  if (!probe.ok) {
    return {
      id: "prototyping.targetUrl",
      severity: "error",
      title: "Target URL",
      message: probe.statusCode
        ? `targetUrl responded with HTTP ${probe.statusCode}`
        : `targetUrl probe failed: ${probe.error ?? "unknown error"}`,
      details: {
        source,
        targetUrl,
        ...(probe.statusCode ? { statusCode: probe.statusCode } : {}),
      },
    };
  }

  return {
    id: "prototyping.targetUrl",
    severity: "ok",
    title: "Target URL",
    message: `targetUrl responded with HTTP ${probe.statusCode}`,
    details: {
      source,
      targetUrl,
      statusCode: probe.statusCode,
    },
  };
}

async function probeHttpUrl(
  targetUrl: string,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
    });
    return {
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The path a required-input bullet names, taken off the front of it.
 *
 * A bullet is free to say what the input is for, and the explanation is not
 * part of the path. Read whole, `.qfai/assistant/rule/test-layers.md (SSOT
 * for hard coverage obligations)` is a required input no tree can satisfy —
 * while the file it names is on disk.
 *
 * The path ends at the first space, `(`, backtick or em dash; everything after
 * that is prose.
 */
function leadingPath(bullet: string): string {
  return (/^[^\s(`—]+/u.exec(bullet)?.[0] ?? "").replace(/[.,]$/u, "");
}

/**
 * The paths an agent card's `## Inputs you must read` section requires on disk.
 *
 * @internal Exported for direct unit-testing — not part of the package's public
 * surface.
 */
export function extractLiteralRequiredInputs(content: string): string[] {
  const lines = content.split(/\r?\n/u);
  const items: string[] = [];
  let inInputsSection = false;
  let currentItem: string | null = null;

  for (const line of lines) {
    if (/^##\s+Inputs you must read\s*$/iu.test(line)) {
      inInputsSection = true;
      continue;
    }
    if (!inInputsSection) {
      continue;
    }
    if (/^##\s+/u.test(line)) {
      break;
    }
    const bulletMatch = /^\s*-\s+(.*)$/u.exec(line);
    if (bulletMatch) {
      if (currentItem) {
        items.push(currentItem.trim());
      }
      const bulletValue = bulletMatch.at(1);
      if (bulletValue === undefined) {
        continue;
      }
      currentItem = bulletValue.trim();
      continue;
    }
    if (currentItem && /^\s{2,}\S/u.test(line)) {
      currentItem = `${currentItem} ${line.trim()}`;
    }
  }

  if (currentItem) {
    items.push(currentItem.trim());
  }

  return Array.from(
    new Set(
      items
        // Read against the whole bullet: a card says an input is optional in
        // the prose beside the path, which the path itself cannot carry.
        .filter((item) => !/\boptional\b|\bwhen available\b/iu.test(item))
        .map((item) => leadingPath(item.replace(/`/gu, "").trim()))
        // A glob names a set and a `<placeholder>` names a shape, so neither is
        // a file to find: `.qfai/spec/02_business-flow/business-flow-<id>/business-flow.md`
        // names a shape and no file exists at that literal path. Tested on the path so
        // that a glob or a placeholder written in a bullet's explanation does
        // not drop the file the bullet actually requires.
        .filter((item) => item.startsWith(".") && !/[*?<>]/u.test(item)),
    ),
  );
}

function relativizeMaybe(root: string, target: string): string {
  return path.isAbsolute(target) ? toRelativePath(root, target) || target : target;
}

async function buildOutDirCollisionCheck(root: string): Promise<DoctorCheck> {
  try {
    const result = await detectOutDirCollisions(root);
    const relativeRoot = toRelativePath(process.cwd(), result.monorepoRoot);
    const configRoots = result.configRoots
      .map((configRoot) => toRelativePath(result.monorepoRoot, configRoot))
      .sort((a, b) => a.localeCompare(b));
    const collisions = result.collisions
      .map((item) => ({
        outDir: toRelativePath(result.monorepoRoot, item.outDir),
        roots: item.roots
          .map((collisionRoot) => toRelativePath(result.monorepoRoot, collisionRoot))
          .sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.outDir.localeCompare(b.outDir));
    const truncated = result.scan.truncated;
    const severity: DoctorSeverity = collisions.length > 0 || truncated ? "warning" : "ok";
    const messageBase =
      collisions.length > 0
        ? `outDir collision detected (count=${collisions.length})`
        : `outDir collision not detected (configs=${configRoots.length})`;
    const message = truncated
      ? `${messageBase}; scan truncated (collected=${result.scan.matchedFileCount}, limit=${result.scan.limit})`
      : messageBase;

    return {
      id: "output.outDirCollision",
      severity,
      title: "OutDir collision",
      message,
      details: {
        monorepoRoot: relativeRoot,
        configRoots,
        collisions,
        scan: result.scan,
      },
    };
  } catch (error) {
    return {
      id: "output.outDirCollision",
      severity: "error",
      title: "OutDir collision",
      message: "OutDir collision scan failed",
      details: { error: String(error) },
    };
  }
}

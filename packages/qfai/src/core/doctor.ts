import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseAgentFrontmatter } from "./agentFrontmatter.js";
import { SUNSETS, deprecationSeverity } from "./sunset.js";
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
  hashDesignMd,
  isUnreplacedDesignMdSample,
  parseDesignMd,
} from "./design/designMd.js";
import { readDesignMdLockSha } from "./design/designMdLock.js";
import { collectScenarioFiles } from "./discovery.js";
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
import { collectSpecEntries } from "./specLayout.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { diffProjectSkillsAgainstInitAssets } from "./skillsIntegrity.js";
import { validateSddDesignContractReadiness } from "./validators/designContractReadiness.js";
import { resolveToolVersion } from "./version.js";
import { loadDecisionGuardrails, normalizeDecisionGuardrails } from "./decisionGuardrails.js";
import {
  probeSkillManifest,
  SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD,
  type SkillManifestProbeResult,
} from "./doctor/skillManifestProbe.js";

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
   * prototyping preflight checks. When a skill profile is supplied,
   * the manifest probe runs and contributes `skill.runtimeDependencies`
   * findings.
   */
  skillProfile?: string;
  targetUrl?: string;
};

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function addCheck(checks: DoctorCheck[], check: DoctorCheck): void {
  checks.push(check);
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
    // `qfai-doctor.md` says it is. The check now carries the worst severity
    // the loader actually reported.
    const configHasError = issues.some((issue) => issue.severity === "error");
    addCheck(checks, {
      id: "config.load",
      severity: configHasError ? "error" : "warning",
      title: "Config load",
      message: configHasError
        ? `Loaded with ${issues.length} issue(s), including ${issues.filter((i) => i.severity === "error").length} that must be fixed`
        : `Loaded with ${issues.length} issue(s) (normalized with defaults when needed)`,
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
    addCheck(checks, {
      id: `paths.${key}`,
      severity: ok ? "ok" : missingDefaultSkillCreatedPath ? "info" : "warning",
      title: `Path exists: ${key}`,
      message: ok
        ? `${key} exists`
        : missingDefaultSkillCreatedPath
          ? `${key} is not created by init; QFAI skills create it when real artifacts exist`
          : `${key} is missing (configure this path or create the directory)`,
      details: { path: toRelativePath(root, resolved) },
    });

    if (key === "skillsDir") {
      const diff = await diffProjectSkillsAgainstInitAssets(root, config);
      if (diff.status === "skipped_missing_skills") {
        addCheck(checks, {
          id: "skills.integrity",
          severity: "info",
          title: "Skills integrity (.qfai/assistant/skills)",
          message: "skills が未作成のため検査をスキップしました（'qfai init' を実行してください）",
          details: { skillsDir: toRelativePath(root, diff.skillsDir) },
        });
      } else if (diff.status === "skipped_missing_assets") {
        addCheck(checks, {
          id: "skills.integrity",
          severity: "info",
          title: "Skills integrity (.qfai/assistant/skills)",
          message:
            "init assets が見つからないため検査をスキップしました（インストール状態を確認してください）",
          details: { skillsDir: toRelativePath(root, diff.skillsDir) },
        });
      } else if (diff.status === "ok") {
        addCheck(checks, {
          id: "skills.integrity",
          severity: "ok",
          title: "Skills integrity (.qfai/assistant/skills)",
          message: "標準 assets と一致しています",
          details: { skillsDir: toRelativePath(root, diff.skillsDir) },
        });
      } else {
        // skills.integrity defaults to `warning`: direct edits to
        // .qfai/assistant/skills/** are advisory, not active-profile-blocking.
        // The doctor 2-group renderer always routes this finding into the
        // advisory group regardless of message wording.
        addCheck(checks, {
          id: "skills.integrity",
          severity: "warning",
          title: "Skills integrity (.qfai/assistant/skills)",
          message:
            "標準資産 '.qfai/assistant/skills/**' が改変されています。skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
          details: {
            skillsDir: toRelativePath(root, diff.skillsDir),
            missing: diff.missing,
            extra: diff.extra,
            changed: diff.changed,
            nextActions: ["必要なら qfai init --force で skills を標準状態へ戻す"],
          },
        });
      }
    }
  }

  addCheck(checks, await buildAgentFrontmatterCheck(root));

  const deprecatedPromptsDir = resolvePath(root, config, "promptsDir");
  const deprecatedPromptsExists = await exists(deprecatedPromptsDir);
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional: checking deprecated promptsDir for diagnostic
  const deprecatedPromptsConfigured = config.paths.promptsDir !== defaultConfig.paths.promptsDir;
  addCheck(checks, {
    id: "paths.promptsDirDeprecated",
    severity: deprecatedPromptsExists || deprecatedPromptsConfigured ? "warning" : "ok",
    title: "Deprecated path: promptsDir",
    message: deprecatedPromptsConfigured
      ? "promptsDir は deprecated です。設定で指定されています（skillsDir へ移行してください）"
      : deprecatedPromptsExists
        ? "promptsDir は deprecated です。存在しても検証では使用されません（skillsDir を使用してください）"
        : "promptsDir は deprecated です（未作成で問題ありません）",
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

  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  let missingCoreFiles = 0;
  let missingHowSsotFiles = 0;
  let duplicatedHowSsotFiles = 0;
  let legacyImplementationBriefOnly = 0;

  for (const entry of entries) {
    if (entry.layout === "layered") {
      const layeredRequired = [
        entry.userStoriesPath,
        entry.acceptanceCriteriaPath,
        entry.businessRulesPath,
        entry.examplesPath,
        entry.testCasesPath,
      ];
      for (const filePath of layeredRequired) {
        if (!(await exists(filePath))) {
          missingCoreFiles += 1;
        }
      }
      const hasDelta = (
        await Promise.all(entry.deltaCandidates.map((target) => exists(target)))
      ).some(Boolean);
      if (!hasDelta) {
        missingCoreFiles += 1;
      }
      const hasPlan = await exists(entry.planPath);
      if (!hasPlan) {
        missingHowSsotFiles += 1;
      }
      continue;
    }

    const legacyCoreRequired = [
      entry.specPath,
      entry.deltaPath,
      entry.scenarioPath,
      entry.caseCataloguePath,
      entry.traceabilityMatrixPath,
    ];
    for (const filePath of legacyCoreRequired) {
      if (!(await exists(filePath))) {
        missingCoreFiles += 1;
      }
    }
    const hasPlan = await exists(entry.planPath);
    const hasLegacy = await exists(entry.legacyImplementationBriefPath);
    if (!hasPlan && !hasLegacy) {
      missingHowSsotFiles += 1;
    } else if (hasPlan && hasLegacy) {
      duplicatedHowSsotFiles += 1;
    } else if (!hasPlan && hasLegacy) {
      legacyImplementationBriefOnly += 1;
    }
  }

  const hasCoreMissing = missingCoreFiles > 0;
  const hasHowSsotError = missingHowSsotFiles > 0 || duplicatedHowSsotFiles > 0;
  const hasLegacyOnly = legacyImplementationBriefOnly > 0;
  const specLayoutSeverity: DoctorSeverity =
    hasCoreMissing || hasHowSsotError ? "warning" : hasLegacyOnly ? "info" : "ok";
  const specLayoutMessage =
    hasCoreMissing || hasHowSsotError
      ? `Missing required files in spec packs (missingCoreFiles=${missingCoreFiles}, missingHowSsotFiles=${missingHowSsotFiles}, duplicatedHowSsotFiles=${duplicatedHowSsotFiles}, legacyImplementationBriefOnly=${legacyImplementationBriefOnly})`
      : hasLegacyOnly
        ? `legacy implementation-brief.md is used in ${legacyImplementationBriefOnly} spec pack(s). Migrate to plan.md.`
        : `All spec packs have required files (count=${entries.length})`;

  addCheck(checks, {
    id: "spec.layout",
    severity: specLayoutSeverity,
    title: "Spec pack shape",
    message: specLayoutMessage,
    details: {
      specPacks: entries.length,
      missingCoreFiles,
      missingHowSsotFiles,
      duplicatedHowSsotFiles,
      legacyImplementationBriefOnly,
    },
  });

  const guardrailsLoad = await loadDecisionGuardrails(root, {
    specsRoot,
  });
  const guardrailsItems = normalizeDecisionGuardrails(guardrailsLoad.entries);
  let guardrailsSeverity: DoctorSeverity;
  let guardrailsMessage: string;
  if (guardrailsLoad.errors.length > 0) {
    guardrailsSeverity = "warning";
    guardrailsMessage = `Decision Guardrails scan failed (errors=${guardrailsLoad.errors.length})`;
  } else if (guardrailsItems.length === 0) {
    guardrailsSeverity = "info";
    guardrailsMessage = "Decision Guardrails not found (optional)";
  } else {
    guardrailsSeverity = "ok";
    guardrailsMessage = `Decision Guardrails detected (count=${guardrailsItems.length})`;
  }

  addCheck(checks, {
    id: "guardrails.present",
    severity: guardrailsSeverity,
    title: "Decision Guardrails",
    message: guardrailsMessage,
    details: {
      count: guardrailsItems.length,
      errors: guardrailsLoad.errors.map((item) => ({
        path: toRelativePath(root, item.path),
        message: item.message,
      })),
    },
  });

  const validateJsonAbs = path.isAbsolute(config.output.validateJsonPath)
    ? config.output.validateJsonPath
    : path.resolve(root, config.output.validateJsonPath);
  const validateJsonExists = await exists(validateJsonAbs);
  addCheck(checks, {
    id: "output.validateJson",
    severity: validateJsonExists ? "ok" : "warning",
    title: "validate.json",
    message: validateJsonExists
      ? "validate.json exists (report can run)"
      : "validate.json is missing (run 'qfai validate' before 'qfai report')",
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

  const scenarioFiles = await collectScenarioFiles(specsRoot);
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

    const severity: DoctorSeverity =
      globs.length === 0
        ? "warning"
        : truncated
          ? "warning"
          : scenarioFiles.length > 0 &&
              config.validation.traceability.scMustHaveTest &&
              matchedCount === 0
            ? "warning"
            : "ok";

    addCheck(checks, {
      id: "traceability.testGlobs",
      severity,
      title: "Test file globs",
      message:
        globs.length === 0
          ? "testFileGlobs is empty (SC→Test cannot be verified)"
          : truncated
            ? `fileCount=${matchedCount} (truncated, limit=${scanResult.limit})`
            : `fileCount=${matchedCount}`,
      details: {
        globs,
        excludeGlobs: exclude,
        scenarioFiles: scenarioFiles.length,
        scMustHaveTest: config.validation.traceability.scMustHaveTest,
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

async function buildAgentFrontmatterCheck(root: string): Promise<DoctorCheck> {
  const agentsDir = path.join(root, ".qfai", "assistant", "agents");
  if (!(await exists(agentsDir))) {
    return {
      id: "agents.frontmatter",
      severity: "warning",
      title: "Agent frontmatter",
      message: "canonical agent directory is missing (run 'qfai init')",
      details: { path: toRelativePath(root, agentsDir) },
    };
  }

  const entries = await readdir(agentsDir, { withFileTypes: true });
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
  for (const fileName of markdownFiles) {
    const filePath = path.join(agentsDir, fileName);
    const parsed = parseAgentFrontmatter(await readFile(filePath, "utf-8"));
    if (!parsed.ok) {
      invalidFiles.push({
        file: `.qfai/assistant/agents/${fileName}`,
        error: parsed.error,
      });
    }
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
 * - `unparseable` / `unreadable` — the file is there but unusable, so
 *   this is an error the user must repair (bad JSON, permissions, I/O).
 * - skills root missing — the project is uninitialized (or its
 *   configured `paths.skillsDir` is gone). Every skill name resolves
 *   to a missing directory then, so blaming `--profile` would be a
 *   misdiagnosis; this is the same "run init" condition that the
 *   `paths.skillsDir` / `skills.integrity` checks report, and it stays
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
      message: `manifest for skill '${skill}' at ${manifestRel} exists but could not be read (permissions, a directory in its place, or an I/O error) — runtimeDependencies were not probed`,
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
  const [primarySpec, uiContracts, designContracts, requiredRoles, launcherChecks, targetUrlCheck] =
    await Promise.all([
      buildPrototypingPrimarySpecCheck(root, config),
      buildPrototypingUiContractsCheck(root, config),
      buildPrototypingDesignContractsCheck(root, config),
      buildPrototypingRolesCheck(root),
      buildPlaywrightLauncherChecks(root),
      buildTargetUrlCheck(root, targetUrl, targetUrlOverride ? "cli" : "config"),
    ]);
  const designMdChecks = await buildPrototypingDesignMdChecks(root, config);
  // `launcherChecks` may yield 1 or 2 entries: the primary check plus an
  // optional `D-DEPRECATED-PROBE` finding when the deprecated stage resolves.
  return [
    primarySpec,
    uiContracts,
    designContracts,
    requiredRoles,
    ...launcherChecks,
    targetUrlCheck,
    ...designMdChecks,
  ];
}

async function buildPrototypingDesignMdChecks(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck[]> {
  const designMdRel = "DESIGN.md";
  const lockRel = path.join(config.paths.contractsDir, "design", "DESIGN.md.lock.yaml");
  const designMdAbs = path.join(root, designMdRel);
  const lockAbs = path.join(root, lockRel);

  const checks: DoctorCheck[] = [];
  let designMdText: string | null = null;
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
    // from an unauthored one. Report it here, before /qfai-sdd Phase 0
    // freezes its sha256 as the project's brand contract.
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
        ? "root DESIGN.md is still the qfai sample brand — replace it with this product's brand SSOT and delete the sample marker before freezing"
        : "root DESIGN.md is still the qfai sample brand (seeded by a release older than the sample marker) — replace it with this product's brand SSOT before freezing",
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

  let lockText: string | null = null;
  try {
    lockText = await readFile(lockAbs, "utf-8");
  } catch {
    lockText = null;
  }
  let lockSha: string | null = null;
  if (lockText === null) {
    checks.push({
      id: "prototyping.designMdLock",
      severity: "error",
      title: "DESIGN.md.lock.yaml",
      message: `DESIGN.md.lock.yaml is missing at ${toRelativePath(root, lockAbs)}`,
      details: { path: toRelativePath(root, lockAbs) },
    });
  } else {
    lockSha = readDesignMdLockSha(lockText);
    if (lockSha === null) {
      checks.push({
        id: "prototyping.designMdLock",
        severity: "error",
        title: "DESIGN.md.lock.yaml",
        message: "DESIGN.md.lock.yaml is missing 'designMdSha256' or is malformed YAML",
        details: { path: toRelativePath(root, lockAbs) },
      });
    } else {
      checks.push({
        id: "prototyping.designMdLock",
        severity: "ok",
        title: "DESIGN.md.lock.yaml",
        message: "DESIGN.md.lock.yaml carries designMdSha256",
        details: { path: toRelativePath(root, lockAbs) },
      });
    }
  }

  if (designMdText !== null && lockSha !== null) {
    const currentSha = hashDesignMd(designMdText);
    if (currentSha === lockSha) {
      checks.push({
        id: "prototyping.designMdSha",
        severity: "ok",
        title: "DESIGN.md sha256 freeze",
        message: "DESIGN.md sha256 matches DESIGN.md.lock.yaml",
        details: { sha256: currentSha },
      });
    } else {
      checks.push({
        id: "prototyping.designMdSha",
        severity: "error",
        title: "DESIGN.md sha256 freeze",
        message: `DESIGN.md sha256 mismatch: lock=${lockSha} current=${currentSha}`,
        details: { lock: lockSha, current: currentSha },
      });
    }
  }
  return checks;
}

async function buildPrototypingPrimarySpecCheck(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck> {
  const resolvedSpec = await resolvePrimaryPrototypingSpec(root, config);
  if (!resolvedSpec) {
    return {
      id: "prototyping.primarySpec",
      severity: "error",
      title: "Primary prototyping spec",
      message:
        "no primary prototyping spec resolved (set prototyping.primarySpecId or add `surface_type: ui-bearing` to 01_Spec.md)",
    };
  }

  return {
    id: "prototyping.primarySpec",
    severity: "ok",
    title: "Primary prototyping spec",
    message: `resolved primary prototyping spec ${resolvedSpec.specId}`,
    details: {
      specId: resolvedSpec.specId,
      path: toRelativePath(root, resolvedSpec.specMdPath),
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

async function buildPrototypingDesignContractsCheck(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
): Promise<DoctorCheck> {
  const issues = await validateSddDesignContractReadiness(root, config);
  if (issues.length === 0) {
    return {
      id: "prototyping.designContracts",
      severity: "ok",
      title: "Pre-prototyping design contracts",
      message: "pre-prototyping design contracts satisfy readiness checks",
      details: {
        designDir: `${config.paths.contractsDir}/design`,
      },
    };
  }

  const codeCounts = new Map<string, number>();
  for (const item of issues) {
    codeCounts.set(item.code, (codeCounts.get(item.code) ?? 0) + 1);
  }

  return {
    id: "prototyping.designContracts",
    severity: issues.some((item) => item.severity === "error") ? "error" : "warning",
    title: "Pre-prototyping design contracts",
    message: `pre-prototyping design contracts have blocking issue(s) (count=${issues.length})`,
    details: {
      designDir: `${config.paths.contractsDir}/design`,
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
    const canonicalPath = path.join(root, ".qfai", "assistant", "agents", `${roleId}.md`);
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

const PLAYWRIGHT_SUNSET = SUNSETS.playwrightCli;
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
    return buildResolvedChecks(
      root,
      resolution.resolved,
      lookedInRelative,
      probeOrder,
      await resolveToolVersion(),
    );
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
  toolVersion: string,
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
    // Deprecation surface: still accepted during the deprecation window but
    // flagged as warning. The literal `sunset: 1.10.0` substring is part of
    // the public wire contract.
    checks.push({
      // The window is what makes this a warning; past the sunset the probe is
      // reporting a launcher the config layer now rejects, so leaving it at
      // `warning` would have doctor call "fine" what `loadConfig` calls an
      // error.
      id: "D-DEPRECATED-PROBE",
      severity: deprecationSeverity(toolVersion, PLAYWRIGHT_SUNSET),
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
        "no targetUrl configured for prototyping preflight (set prototyping.execution.targetUrl or pass --target-url)",
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

function extractLiteralRequiredInputs(content: string): string[] {
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
        .map((item) => item.replace(/`/gu, "").replace(/[.,]$/u, "").trim())
        .filter(
          (item) =>
            item.startsWith(".") &&
            !/[*?]/u.test(item) &&
            !/\boptional\b|\bwhen available\b/iu.test(item),
        ),
    ),
  );
}

function relativizeMaybe(root: string, target: string): string {
  return path.isAbsolute(target) ? toRelativePath(root, target) || target : target;
}

const DEFAULT_CONFIG_SEARCH_IGNORE_GLOBS = [
  ...DEFAULT_TEST_FILE_EXCLUDE_GLOBS,
  "**/.pnpm/**",
  "**/tmp/**",
  "**/.mcp-tools/**",
];

type OutDirCollision = {
  outDir: string;
  roots: string[];
};

type OutDirCollisionResult = {
  monorepoRoot: string;
  configRoots: string[];
  collisions: OutDirCollision[];
  scan: {
    truncated: boolean;
    matchedFileCount: number;
    limit: number;
  };
};

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

async function detectOutDirCollisions(root: string): Promise<OutDirCollisionResult> {
  const monorepoRoot = await findMonorepoRoot(root);
  const configScan = await collectFilesByGlobs(monorepoRoot, {
    globs: ["**/qfai.config.yaml"],
    ignore: DEFAULT_CONFIG_SEARCH_IGNORE_GLOBS,
  });
  const configPaths = configScan.files;
  const configRoots = Array.from(
    new Set(configPaths.map((configPath) => path.dirname(configPath))),
  ).sort((a, b) => a.localeCompare(b));
  const outDirToRoots = new Map<string, Set<string>>();

  for (const configRoot of configRoots) {
    const { config } = await loadConfig(configRoot);
    const outDir = path.normalize(resolvePath(configRoot, config, "outDir"));
    const roots = outDirToRoots.get(outDir) ?? new Set<string>();
    roots.add(configRoot);
    outDirToRoots.set(outDir, roots);
  }

  const collisions: OutDirCollision[] = [];
  for (const [outDir, roots] of outDirToRoots.entries()) {
    if (roots.size > 1) {
      collisions.push({
        outDir,
        roots: Array.from(roots).sort((a, b) => a.localeCompare(b)),
      });
    }
  }

  return {
    monorepoRoot,
    configRoots,
    collisions,
    scan: {
      truncated: configScan.truncated,
      matchedFileCount: configScan.matchedFileCount,
      limit: configScan.limit,
    },
  };
}

async function findMonorepoRoot(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  for (;;) {
    const gitPath = path.join(current, ".git");
    const workspacePath = path.join(current, "pnpm-workspace.yaml");
    if ((await exists(gitPath)) || (await exists(workspacePath))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(startDir);
}

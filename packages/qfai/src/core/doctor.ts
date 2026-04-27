import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseAgentFrontmatter } from "./agentFrontmatter.js";
import { defaultConfig, findConfigRoot, getConfigPath, loadConfig, resolvePath } from "./config.js";
import { readUiContractScreenContracts } from "./contracts/screenContracts.js";
import { collectScenarioFiles } from "./discovery.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import { toRelativePath } from "./paths.js";
import { resolvePrimaryPrototypingSpec } from "./prototyping/specResolution.js";
import { collectSpecEntries } from "./specLayout.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { diffProjectSkillsAgainstInitAssets } from "./skillsIntegrity.js";
import { resolveToolVersion } from "./version.js";
import { loadDecisionGuardrails, normalizeDecisionGuardrails } from "./decisionGuardrails.js";

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
    addCheck(checks, {
      id: "config.load",
      severity: "warning",
      title: "Config load",
      message: `Loaded with ${issues.length} issue(s) (normalized with defaults when needed)`,
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
    addCheck(checks, {
      id: `paths.${key}`,
      severity: ok ? "ok" : "warning",
      title: `Path exists: ${key}`,
      message: ok ? `${key} exists` : `${key} is missing (did you run 'qfai init'?)`,
      details: { path: toRelativePath(root, resolved) },
    });

    if (key === "skillsDir") {
      const skillsLocalDir = path.join(path.dirname(resolved), `${path.basename(resolved)}.local`);
      const found = await exists(skillsLocalDir);
      addCheck(checks, {
        id: "paths.skillsLocalDir",
        severity: "info",
        title: "Skills override (skills.local)",
        message: found
          ? "skills.local exists (local override can be used)"
          : "skills.local is optional (create it to override skills)",
        details: { path: toRelativePath(root, skillsLocalDir) },
      });

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
        addCheck(checks, {
          id: "skills.integrity",
          severity: "error",
          title: "Skills integrity (.qfai/assistant/skills)",
          message:
            "標準資産 '.qfai/assistant/skills/**' が改変されています。skills の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
          details: {
            skillsDir: toRelativePath(root, diff.skillsDir),
            missing: diff.missing,
            extra: diff.extra,
            changed: diff.changed,
            nextActions: [
              "変更内容を .qfai/assistant/skills.local/** に移す（同一相対パスで配置）",
              "必要なら qfai init --force で skills を標準状態へ戻す（skills.local は保護されます）",
            ],
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

const REQUIRED_PROTOTYPING_ROLE_IDS = [
  "frontend-engineer",
  "product-experience-architect",
  "product-surface-reviewer",
  "backend-engineer",
  "devops-ci-engineer",
] as const;

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
      message: `invalid Claude-compatible frontmatter detected (count=${invalidFiles.length})`,
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
    message: `all canonical agent markdown files include valid Claude-compatible frontmatter (count=${markdownFiles.length})`,
    details: {
      count: markdownFiles.length,
      path: toRelativePath(root, agentsDir),
    },
  };
}

async function buildPrototypingDoctorChecks(
  root: string,
  config: Awaited<ReturnType<typeof loadConfig>>["config"],
  targetUrlOverride?: string,
): Promise<DoctorCheck[]> {
  const targetUrl = targetUrlOverride ?? config.prototyping?.execution?.targetUrl ?? undefined;
  return Promise.all([
    buildPrototypingPrimarySpecCheck(root, config),
    buildPrototypingUiContractsCheck(root, config),
    buildPrototypingRolesCheck(root),
    buildPlaywrightCliCheck(root),
    buildTargetUrlCheck(root, targetUrl, targetUrlOverride ? "cli" : "config"),
  ]);
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

async function buildPrototypingRolesCheck(root: string): Promise<DoctorCheck> {
  const wrapperDir = path.join(root, ".claude", "agents");
  const roleFindings: Array<Record<string, unknown>> = [];

  for (const roleId of REQUIRED_PROTOTYPING_ROLE_IDS) {
    const wrapperPath = path.join(wrapperDir, `${roleId}.md`);
    const canonicalPath = path.join(root, ".qfai", "assistant", "agents", `${roleId}.md`);
    const wrapperExists = await exists(wrapperPath);
    const canonicalExists = await exists(canonicalPath);
    const finding: Record<string, unknown> = {
      roleId,
      canonicalExists,
      wrapperExists,
      wrapperPath: toRelativePath(root, wrapperPath),
    };

    if (wrapperExists) {
      const parsed = parseAgentFrontmatter(await readFile(wrapperPath, "utf-8"));
      finding.frontmatterValid = parsed.ok;
      if (parsed.ok) {
        finding.frontmatterName = parsed.frontmatter.name;
      } else {
        finding.error = parsed.error;
      }
    }

    roleFindings.push(finding);
  }

  const invalidRoles = roleFindings.filter(
    (item) =>
      item["canonicalExists"] !== true ||
      item["wrapperExists"] !== true ||
      item["frontmatterValid"] !== true ||
      item["frontmatterName"] !== item["roleId"],
  );

  if (invalidRoles.length > 0) {
    return {
      id: "prototyping.requiredRoles",
      severity: "error",
      title: "Required prototyping roles",
      message: `missing or invalid required role wrappers detected (count=${invalidRoles.length})`,
      details: {
        requiredRoles: REQUIRED_PROTOTYPING_ROLE_IDS,
        invalidRoles,
      },
    };
  }

  return {
    id: "prototyping.requiredRoles",
    severity: "ok",
    title: "Required prototyping roles",
    message: `all required prototyping role wrappers are present and frontmatter-valid (count=${REQUIRED_PROTOTYPING_ROLE_IDS.length})`,
    details: {
      requiredRoles: REQUIRED_PROTOTYPING_ROLE_IDS,
      wrapperDir: toRelativePath(root, wrapperDir),
    },
  };
}

async function buildPlaywrightCliCheck(root: string): Promise<DoctorCheck> {
  const localBinDir = path.join(root, "node_modules", ".bin");
  const localCandidate = await findCommandInDir(localBinDir, "playwright-cli");
  if (localCandidate) {
    return {
      id: "prototyping.playwrightCli",
      severity: "ok",
      title: "Playwright CLI",
      message: "playwright-cli is reachable via project-local node_modules/.bin",
      details: {
        origin: "node_modules/.bin",
        path: toRelativePath(root, localCandidate),
      },
    };
  }

  const globalCandidate = await findCommandInPath("playwright-cli");
  if (globalCandidate) {
    return {
      id: "prototyping.playwrightCli",
      severity: "ok",
      title: "Playwright CLI",
      message: "playwright-cli is reachable via PATH",
      details: {
        origin: "PATH",
        path: globalCandidate,
      },
    };
  }

  return {
    id: "prototyping.playwrightCli",
    severity: "error",
    title: "Playwright CLI",
    message:
      "playwright-cli is not reachable via PATH or project-local node_modules/.bin (install it or use npx/playwright-cli local bin)",
    details: {
      lookedIn: {
        path: process.env.PATH ?? "",
        localBinDir: toRelativePath(root, localBinDir),
      },
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

async function findCommandInPath(command: string): Promise<string | null> {
  const searchPath = process.env.PATH ?? "";
  const dirs = searchPath.split(path.delimiter).filter((entry) => entry.length > 0);
  for (const dir of dirs) {
    const candidate = await findCommandInDir(dir, command);
    if (candidate) {
      return candidate;
    }
  }
  return null;
}

async function findCommandInDir(dir: string, command: string): Promise<string | null> {
  for (const fileName of commandCandidates(command)) {
    const candidate = path.join(dir, fileName);
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function commandCandidates(command: string): string[] {
  return [`${command}.cmd`, `${command}.ps1`, `${command}.exe`, `${command}.bat`, command];
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

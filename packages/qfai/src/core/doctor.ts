import { access } from "node:fs/promises";
import path from "node:path";

import {
  findConfigRoot,
  getConfigPath,
  loadConfig,
  resolvePath,
} from "./config.js";
import { collectScenarioFiles } from "./discovery.js";
import { collectFilesByGlobs, DEFAULT_GLOB_FILE_LIMIT } from "./fs.js";
import { toRelativePath } from "./paths.js";
import { collectSpecEntries } from "./specLayout.js";
import { DEFAULT_TEST_FILE_EXCLUDE_GLOBS } from "./traceability.js";
import { diffProjectPromptsAgainstInitAssets } from "./promptsIntegrity.js";
import { resolveToolVersion } from "./version.js";

export type DoctorSeverity = "ok" | "info" | "warning" | "error";

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

export async function createDoctorData(
  options: CreateDoctorDataOptions,
): Promise<DoctorData> {
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

  const {
    config,
    issues,
    configPath: resolvedConfigPath,
  } = await loadConfig(root);
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
    "outDir",
    "srcDir",
    "testsDir",
    "rulesDir",
    "promptsDir",
  ] as const;

  for (const key of pathKeys) {
    const resolved = resolvePath(root, config, key);
    const ok = await exists(resolved);
    addCheck(checks, {
      id: `paths.${key}`,
      severity: ok ? "ok" : "warning",
      title: `Path exists: ${key}`,
      message: ok
        ? `${key} exists`
        : `${key} is missing (did you run 'qfai init'?)`,
      details: { path: toRelativePath(root, resolved) },
    });

    if (key === "promptsDir") {
      const promptsLocalDir = path.join(
        path.dirname(resolved),
        `${path.basename(resolved)}.local`,
      );
      const found = await exists(promptsLocalDir);
      addCheck(checks, {
        id: "paths.promptsLocalDir",
        severity: "info",
        title: "Prompts overlay (prompts.local)",
        message: found
          ? "prompts.local exists (overlay can be used)"
          : "prompts.local is optional (create it to override prompts)",
        details: { path: toRelativePath(root, promptsLocalDir) },
      });

      const diff = await diffProjectPromptsAgainstInitAssets(root);
      if (diff.status === "skipped_missing_prompts") {
        addCheck(checks, {
          id: "prompts.integrity",
          severity: "info",
          title: "Prompts integrity (.qfai/prompts)",
          message:
            "prompts が未作成のため検査をスキップしました（'qfai init' を実行してください）",
          details: { promptsDir: toRelativePath(root, diff.promptsDir) },
        });
      } else if (diff.status === "skipped_missing_assets") {
        addCheck(checks, {
          id: "prompts.integrity",
          severity: "info",
          title: "Prompts integrity (.qfai/prompts)",
          message:
            "init assets が見つからないため検査をスキップしました（インストール状態を確認してください）",
          details: { promptsDir: toRelativePath(root, diff.promptsDir) },
        });
      } else if (diff.status === "ok") {
        addCheck(checks, {
          id: "prompts.integrity",
          severity: "ok",
          title: "Prompts integrity (.qfai/prompts)",
          message: "標準 assets と一致しています",
          details: { promptsDir: toRelativePath(root, diff.promptsDir) },
        });
      } else {
        addCheck(checks, {
          id: "prompts.integrity",
          severity: "error",
          title: "Prompts integrity (.qfai/prompts)",
          message:
            "標準資産 '.qfai/prompts/**' が改変されています。prompts の直編集は非推奨です（アップデート/再 init で上書きされ得ます）。",
          details: {
            promptsDir: toRelativePath(root, diff.promptsDir),
            missing: diff.missing,
            extra: diff.extra,
            changed: diff.changed,
            nextActions: [
              "変更内容を .qfai/prompts.local/** に移す（同一相対パスで配置）",
              "必要なら qfai init --force で prompts を標準状態へ戻す（prompts.local は保護されます）",
            ],
          },
        });
      }
    }
  }

  const specsRoot = resolvePath(root, config, "specsDir");
  const entries = await collectSpecEntries(specsRoot);
  let missingFiles = 0;

  for (const entry of entries) {
    const requiredFiles = [entry.specPath, entry.deltaPath, entry.scenarioPath];
    for (const filePath of requiredFiles) {
      if (!(await exists(filePath))) {
        missingFiles += 1;
      }
    }
  }

  addCheck(checks, {
    id: "spec.layout",
    severity: missingFiles === 0 ? "ok" : "warning",
    title: "Spec pack shape",
    message:
      missingFiles === 0
        ? `All spec packs have required files (count=${entries.length})`
        : `Missing required files in spec packs (missingFiles=${missingFiles})`,
    details: { specPacks: entries.length, missingFiles },
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
            ? `matchedFileCount=${matchedCount} (truncated, limit=${scanResult.limit})`
            : `matchedFileCount=${matchedCount}`,
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
    config: {
      startDir: toRelativePath(process.cwd(), startDir),
      found: search.found,
      configPath: toRelativePath(root, search.configPath) || "qfai.config.yaml",
    },
    summary: summarize(checks),
    checks,
  };
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
          .map((collisionRoot) =>
            toRelativePath(result.monorepoRoot, collisionRoot),
          )
          .sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.outDir.localeCompare(b.outDir));
    const truncated = result.scan.truncated;
    const severity: DoctorSeverity =
      collisions.length > 0 || truncated ? "warning" : "ok";
    const messageBase =
      collisions.length > 0
        ? `outDir collision detected (count=${collisions.length})`
        : `outDir collision not detected (configs=${configRoots.length})`;
    const message = truncated
      ? `${messageBase}; scan truncated (matched=${result.scan.matchedFileCount}, limit=${result.scan.limit})`
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

async function detectOutDirCollisions(
  root: string,
): Promise<OutDirCollisionResult> {
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
  while (true) {
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

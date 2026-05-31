/**
 * Per-skill manifest probe used by `qfai doctor --profile <skill>`.
 *
 * Reads the skill's manifest at
 * `.qfai/assistant/skills/<skill>/manifest.json` (or the equivalent
 * install-asset path under `assets/init/.qfai/assistant/skills/<skill>`)
 * and probes each declared `runtimeDependencies` entry against the
 * consumer project's `node_modules`. A dep counts as found when either
 * `node_modules/.bin/<name>` (with Windows extension variants) OR
 * `node_modules/<name>/` exists.
 *
 * Empty / absent runtimeDependencies yields an empty array — no false
 * positives. The probe is intentionally additive: it never throws on
 * missing manifest / parse error; instead it returns no findings so
 * the caller can decide whether to surface a separate "manifest
 * missing" diagnostic.
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

export const SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD = "runtimeDependencies";

export type SkillManifestProbeFinding = {
  readonly name: string;
  readonly status: "found" | "missing";
  readonly installCommand: string;
  readonly probedPaths: readonly string[];
};

export type SkillManifestProbeOptions = {
  /**
   * Optional override for the manifest location. When absent the probe
   * looks up the consumer project's `.qfai/assistant/skills/<skill>/manifest.json`.
   */
  readonly manifestPath?: string;
};

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

const WIN_BIN_EXTS = [".cmd", ".bat", ".ps1", ".exe"] as const;

async function probeNodeModulesFor(root: string, name: string): Promise<{
  found: boolean;
  probedPaths: string[];
}> {
  const probedPaths: string[] = [];
  const binBase = path.join(root, "node_modules", ".bin", name);
  probedPaths.push(binBase);
  if (await exists(binBase)) {
    return { found: true, probedPaths };
  }
  if (process.platform === "win32") {
    for (const ext of WIN_BIN_EXTS) {
      const candidate = `${binBase}${ext}`;
      probedPaths.push(candidate);
      if (await exists(candidate)) {
        return { found: true, probedPaths };
      }
    }
  }
  const pkgDir = path.join(root, "node_modules", name);
  probedPaths.push(pkgDir);
  if (await exists(pkgDir)) {
    return { found: true, probedPaths };
  }
  return { found: false, probedPaths };
}

function resolveManifestPath(root: string, skill: string, options?: SkillManifestProbeOptions): string {
  if (options?.manifestPath) {
    return options.manifestPath;
  }
  return path.join(root, ".qfai", "assistant", "skills", skill, "manifest.json");
}

async function readManifestRuntimeDeps(manifestPath: string): Promise<string[] | null> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const value = (parsed as Record<string, unknown>)[SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD];
  if (!Array.isArray(value)) {
    return null;
  }
  const deps: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      deps.push(item.trim());
    }
  }
  return deps;
}

export async function probeSkillManifestRuntimeDeps(
  root: string,
  skill: string,
  options?: SkillManifestProbeOptions,
): Promise<readonly SkillManifestProbeFinding[]> {
  const manifestPath = resolveManifestPath(root, skill, options);
  const deps = await readManifestRuntimeDeps(manifestPath);
  if (!deps || deps.length === 0) {
    return [];
  }
  const findings: SkillManifestProbeFinding[] = [];
  for (const name of deps) {
    const probe = await probeNodeModulesFor(root, name);
    findings.push({
      name,
      status: probe.found ? "found" : "missing",
      installCommand: `npm install ${name}`,
      probedPaths: probe.probedPaths,
    });
  }
  return findings;
}

/**
 * Tokens that the SSOT-sync pair (Pair III) checks for on the
 * probe-implementation side. Stable substrings; keep in sync with
 * `skillManifestPairs.ts`.
 */
export const SKILL_MANIFEST_PROBE_TOKENS = {
  runtimeDependenciesField: SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD,
} as const;

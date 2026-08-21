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
 * missing manifest / parse error; instead it reports the manifest
 * state alongside the findings so the caller can surface a separate
 * "manifest missing" diagnostic.
 *
 * `probeSkillManifest` is the full-fidelity entry point: it keeps
 * "manifest found, zero deps declared" distinct from "no manifest at
 * all" and from "manifest unreadable". `probeSkillManifestRuntimeDeps`
 * stays as the findings-only convenience wrapper.
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../config.js";

export const SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD = "runtimeDependencies";

export type SkillManifestProbeFinding = {
  readonly name: string;
  readonly status: "found" | "missing";
  readonly installCommand: string;
  readonly probedPaths: readonly string[];
};

/**
 * Whether the skill's manifest was located and understood.
 *
 * - `found` — manifest read and parsed (it may still declare no deps).
 * - `absent` — no manifest file at the resolved path.
 * - `unparseable` — manifest exists but is not JSON, is not an object,
 *   or declares a non-array `runtimeDependencies`.
 */
export type SkillManifestState = "found" | "absent" | "unparseable";

export type SkillManifestProbeResult = {
  readonly manifest: SkillManifestState;
  /** Absolute path the probe resolved and read (or tried to read). */
  readonly manifestPath: string;
  /**
   * Whether the skill's own directory exists. `false` means the skill
   * itself is unresolvable — a typo'd or renamed `--profile <skill>`.
   */
  readonly skillDirExists: boolean;
  readonly findings: readonly SkillManifestProbeFinding[];
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

async function probeNodeModulesFor(
  root: string,
  name: string,
): Promise<{
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

async function resolveManifestPath(
  root: string,
  skill: string,
  options?: SkillManifestProbeOptions,
): Promise<string> {
  if (options?.manifestPath) {
    return options.manifestPath;
  }
  // Honor `config.paths.skillsDir` so a project that relocates its
  // skills tree still has its per-skill `manifest.json` resolved
  // correctly. Pre-fix the path was hardcoded to
  // `.qfai/assistant/skills/<skill>/manifest.json`; with a relocated
  // skillsDir this caused `qfai doctor --profile <skill>` to see
  // an absent manifest, report no runtimeDependencies, and let
  // autoremediate silently skip the install phase for relocated
  // skills. The default `config.paths.skillsDir` keeps the legacy
  // path intact for projects that did not override it.
  const { config } = await loadConfig(root);
  const skillsDirRel = config.paths.skillsDir;
  return path.resolve(root, skillsDirRel, skill, "manifest.json");
}

type ManifestRead =
  | { readonly state: "absent" }
  | { readonly state: "unparseable" }
  | { readonly state: "found"; readonly deps: readonly string[] };

function extractRuntimeDeps(parsed: unknown): ManifestRead {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { state: "unparseable" };
  }
  const record: Record<string, unknown> = { ...parsed };
  const value = record[SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD];
  if (value === undefined) {
    // A manifest that simply omits the field genuinely declares zero
    // runtime dependencies — that is a `found` manifest, not a defect.
    return { state: "found", deps: [] };
  }
  if (!Array.isArray(value)) {
    return { state: "unparseable" };
  }
  const deps: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      deps.push(item.trim());
    }
  }
  return { state: "found", deps };
}

async function readManifest(manifestPath: string): Promise<ManifestRead> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch {
    return { state: "absent" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: "unparseable" };
  }
  return extractRuntimeDeps(parsed);
}

/**
 * Probe a skill's manifest and report BOTH the manifest state and the
 * per-dependency findings. Callers need the state to tell "manifest
 * declares zero dependencies" apart from "this skill has no manifest
 * at all" (a typo'd `--profile <skill>`, a renamed skill, a manifest
 * nobody authored yet) — collapsing the two lets an unresolvable skill
 * report healthy.
 */
export async function probeSkillManifest(
  root: string,
  skill: string,
  options?: SkillManifestProbeOptions,
): Promise<SkillManifestProbeResult> {
  const manifestPath = await resolveManifestPath(root, skill, options);
  const skillDirExists = await exists(path.dirname(manifestPath));
  const read = await readManifest(manifestPath);
  if (read.state !== "found") {
    return { manifest: read.state, manifestPath, skillDirExists, findings: [] };
  }
  const findings: SkillManifestProbeFinding[] = [];
  for (const name of read.deps) {
    const probe = await probeNodeModulesFor(root, name);
    findings.push({
      name,
      status: probe.found ? "found" : "missing",
      installCommand: `npm install ${name}`,
      probedPaths: probe.probedPaths,
    });
  }
  return { manifest: "found", manifestPath, skillDirExists, findings };
}

/**
 * Findings-only convenience wrapper over {@link probeSkillManifest}.
 * Prefer the full result whenever the caller reports on whether the
 * manifest exists.
 */
export async function probeSkillManifestRuntimeDeps(
  root: string,
  skill: string,
  options?: SkillManifestProbeOptions,
): Promise<readonly SkillManifestProbeFinding[]> {
  const result = await probeSkillManifest(root, skill, options);
  return result.findings;
}

/**
 * Tokens that the SSOT-sync pair (Pair III) checks for on the
 * probe-implementation side. Stable substrings; keep in sync with
 * `skillManifestPairs.ts`.
 */
export const SKILL_MANIFEST_PROBE_TOKENS = {
  runtimeDependenciesField: SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD,
} as const;

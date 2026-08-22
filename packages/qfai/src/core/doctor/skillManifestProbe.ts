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
 * all", from "manifest present but unreadable" (permission / I/O
 * fault), and from "manifest unparseable". It also reports whether the
 * skills root itself exists, so callers can tell an uninitialized
 * project from a typo'd `--profile <skill>`.
 * `probeSkillManifestRuntimeDeps` stays as the findings-only
 * convenience wrapper.
 */

import { access, readFile, stat } from "node:fs/promises";
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
 * - `absent` — no manifest file at the resolved path (`ENOENT`: the
 *   file, or a directory on the way to it, does not exist).
 * - `unreadable` — the manifest could not be read for a reason other
 *   than a plainly missing path: permission denied, the entry is a
 *   directory (`EISDIR`), a component of the path exists but is not a
 *   directory (`ENOTDIR` — typically `<skillsRoot>/<skill>` is itself
 *   a regular file), or a transient I/O error. Distinct from `absent`:
 *   reporting it as "no manifest" would hide a filesystem fault as a
 *   config gap.
 * - `unparseable` — manifest exists but is not JSON, is not an object,
 *   or declares a non-array `runtimeDependencies`.
 */
export type SkillManifestState = "found" | "absent" | "unreadable" | "unparseable";

export type SkillManifestProbeResult = {
  readonly manifest: SkillManifestState;
  /** Absolute path the probe resolved and read (or tried to read). */
  readonly manifestPath: string;
  /**
   * Whether the skill's own directory exists **and is a directory**.
   * `false` means the skill itself is unresolvable — a typo'd or
   * renamed `--profile <skill>`, but ONLY when `skillsRootExists` is
   * true. See below. A path that exists but is not a directory is
   * reported as `manifest: "unreadable"` rather than as a missing
   * skill, so a corrupted tree never reads as a mere config gap.
   */
  readonly skillDirExists: boolean;
  /** Absolute path of the skills root the manifest was resolved under. */
  readonly skillsRootPath: string;
  /**
   * Whether the skills root itself (`config.paths.skillsDir`) exists
   * as a directory. `false` means the project is uninitialized or its configured
   * skillsDir is missing — every skill name resolves to a missing
   * directory there, so `skillDirExists === false` says nothing about
   * whether the requested `--profile` value is correct.
   */
  readonly skillsRootExists: boolean;
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

/**
 * What a path is, for the two directories the probe depends on.
 *
 * `access()` alone cannot tell a directory from a regular file, so a
 * skill "directory" that is actually a file would otherwise be counted
 * as an existing skill while the manifest read fails — surfacing a
 * filesystem fault as a benign "no manifest" gap.
 *
 * - `directory` — usable.
 * - `absent` — nothing here (`ENOENT`), or a parent component is a
 *   regular file so this path cannot exist (`ENOTDIR`); either way the
 *   entry itself is missing, and the offending parent is diagnosed by
 *   its own probe.
 * - `unusable` — the path exists but is not a directory, or `stat()`
 *   itself failed (permissions, I/O).
 */
type DirectoryProbe = "directory" | "absent" | "unusable";

async function probeDirectory(target: string): Promise<DirectoryProbe> {
  try {
    const stats = await stat(target);
    return stats.isDirectory() ? "directory" : "unusable";
  } catch (error: unknown) {
    const code = errorCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? "absent" : "unusable";
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

type ResolvedManifestLocation = {
  readonly manifestPath: string;
  readonly skillsRootPath: string;
};

async function resolveManifestPath(
  root: string,
  skill: string,
  options?: SkillManifestProbeOptions,
): Promise<ResolvedManifestLocation> {
  if (options?.manifestPath) {
    const manifestPath = options.manifestPath;
    return {
      manifestPath,
      skillsRootPath: path.dirname(path.dirname(manifestPath)),
    };
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
  const skillsRootPath = path.resolve(root, skillsDirRel);
  return {
    manifestPath: path.resolve(skillsRootPath, skill, "manifest.json"),
    skillsRootPath,
  };
}

type ManifestRead =
  | { readonly state: "absent" }
  | { readonly state: "unreadable" }
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

/**
 * Error codes that mean "there is nothing at this path" rather than
 * "something is there but the read failed". Only `ENOENT` qualifies —
 * a missing component on the way to the manifest reports `ENOENT` too.
 * `ENOTDIR` is deliberately NOT here: it means a component exists but
 * is a regular file (e.g. `<skillsRoot>/<skill>` is a file), which is
 * a filesystem fault, not an absent manifest.
 */
const ABSENT_READ_ERROR_CODES: ReadonlySet<string> = new Set(["ENOENT"]);

function errorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code: unknown = error.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

async function readManifest(manifestPath: string): Promise<ManifestRead> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch (error: unknown) {
    // Only a genuinely missing path is `absent`. Permission denied,
    // "manifest.json is a directory" (EISDIR), "a path component is a
    // regular file" (ENOTDIR), and transient I/O errors leave the
    // manifest unprobed and MUST NOT be reported as "this skill
    // declares no runtimeDependencies".
    const code = errorCode(error);
    return code !== undefined && ABSENT_READ_ERROR_CODES.has(code)
      ? { state: "absent" }
      : { state: "unreadable" };
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
  const { manifestPath, skillsRootPath } = await resolveManifestPath(root, skill, options);
  const skillDir = await probeDirectory(path.dirname(manifestPath));
  const skillDirExists = skillDir === "directory";
  // A usable skill directory implies a usable skills root above it.
  const skillsRoot: DirectoryProbe = skillDirExists
    ? "directory"
    : await probeDirectory(skillsRootPath);
  const skillsRootExists = skillsRoot === "directory";
  const location = { manifestPath, skillDirExists, skillsRootPath, skillsRootExists };
  if (skillDir === "unusable" || skillsRoot === "unusable") {
    // One of the two directories is occupied by something that is not
    // a directory (a stray regular file named after the skill, a
    // half-finished extraction), or could not be stat'ed at all.
    // Reading the manifest beneath it yields ENOTDIR on POSIX but
    // ENOENT on Windows — reporting either as "absent" would downgrade
    // a corrupted tree to a benign "no manifest" warning (and let
    // autoremediate call it "not found"), so classify the fault here
    // rather than inferring it from the read error.
    return { manifest: "unreadable", ...location, findings: [] };
  }
  const read = await readManifest(manifestPath);
  if (read.state !== "found") {
    return { manifest: read.state, ...location, findings: [] };
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
  return { manifest: "found", ...location, findings };
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

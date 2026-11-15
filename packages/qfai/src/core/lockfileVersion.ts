import { readFile } from "node:fs/promises";
import path from "node:path";

import { findOwnCopyProjectDir, resolveToolVersion } from "./version.js";

/** The package manager a lockfile belongs to. */
export type LockfileManager = "npm" | "pnpm" | "yarn";

/** The qfai version a project's lockfile pins, and the lockfile that pins it. */
export type LockfilePin = {
  readonly manager: LockfileManager;
  readonly file: string;
  readonly version: string;
};

type Reader = (text: string) => string | null;

/**
 * The lockfiles read, in the order they are tried. The first one present
 * decides: a project keeps one, and reading a second would compare against a
 * file its package manager does not use.
 */
const LOCKFILES: readonly { file: string; manager: LockfileManager; read: Reader }[] = [
  { file: "package-lock.json", manager: "npm", read: npmPinnedVersion },
  { file: "pnpm-lock.yaml", manager: "pnpm", read: pnpmPinnedVersion },
  { file: "yarn.lock", manager: "yarn", read: yarnPinnedVersion },
];

/** The command that installs what the lockfile pins, per package manager. */
export const INSTALL_COMMANDS: Readonly<Record<LockfileManager, string>> = {
  npm: "npm ci",
  pnpm: "pnpm install --frozen-lockfile",
  yarn: "yarn install --frozen-lockfile",
};

/**
 * The qfai version the lockfile in `dir` pins, or `null` when there is nothing
 * to compare: no lockfile, a lockfile that does not name qfai, a pin that is a
 * link or a workspace package rather than a version, or a lockfile that does
 * not parse.
 */
export async function readLockfilePin(dir: string): Promise<LockfilePin | null> {
  for (const { file, manager, read } of LOCKFILES) {
    let text: string;
    try {
      text = await readFile(path.join(dir, file), "utf-8");
    } catch {
      continue;
    }
    const version = read(text);
    return version === null ? null : { manager, file, version };
  }
  return null;
}

/** A version as a lockfile records a registry package: `x.y.z`, with any prerelease or build suffix. */
function registryVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // pnpm appends the peers it resolved: `2.4.0(typescript@5.6.0)`.
  const version = value.trim().split("(")[0] ?? "";
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]*)?$/.test(version) ? version : null;
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, key) : undefined;
}

/**
 * npm: `packages["node_modules/qfai"].version`. A workspace or `npm link`
 * entry carries `link: true` and no version.
 *
 * SIMPLIFIED: a version-1 lockfile, which has no `packages` map, is not read.
 * Lift when: a project still on npm 6 needs the comparison.
 */
export function npmPinnedVersion(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const entry = field(field(parsed, "packages"), "node_modules/qfai");
  if (field(entry, "link") === true) return null;
  return registryVersion(field(entry, "version"));
}

const PNPM_DEPENDENCY_FIELDS = new Set(["dependencies", "devDependencies", "optionalDependencies"]);

/**
 * pnpm: the `version` of the `qfai` dependency of the importer `.`, in any
 * dependency field. It is `x.y.z` for a registry install and `link:<path>` for
 * a workspace package.
 *
 * Scanned line by line rather than parsed: the check runs before every
 * command, and a lockfile can run to megabytes. The importers come before the
 * packages, so the scan stops once it leaves them.
 *
 * SIMPLIFIED: only lockfile version 6 (pnpm 8) or later is read, whose
 * importer dependencies are maps of `specifier` and `version`. Lift when: a
 * project on an older lockfile needs the comparison.
 */
export function pnpmPinnedVersion(text: string): string | null {
  const keys: string[] = [];
  const indents: number[] = [];
  let leftImporters = false;
  for (const line of text.split(/\r?\n/)) {
    const match = /^(\s*)(['"]?)([^'":#]+)\2:(?:\s+(.*))?$/.exec(line);
    if (match === null) continue;
    const indent = (match[1] ?? "").length;
    const key = (match[3] ?? "").trim();
    while ((indents.at(-1) ?? -1) >= indent) {
      indents.pop();
      if (keys.pop() === "importers") leftImporters = true;
    }
    if (leftImporters) return null;
    indents.push(indent);
    keys.push(key);
    const [top, importer, dependencies, name, leaf] = keys;
    if (
      keys.length === 5 &&
      top === "importers" &&
      importer === "." &&
      PNPM_DEPENDENCY_FIELDS.has(dependencies ?? "") &&
      name === "qfai" &&
      leaf === "version"
    ) {
      return registryVersion((match[4] ?? "").replace(/^['"]|['"]$/g, ""));
    }
  }
  return null;
}

/**
 * yarn: the `version` of the entry whose header names `qfai@`. Classic writes
 * `qfai@^2.4.0:` and `version "2.4.0"`; Berry writes `"qfai@npm:^2.4.0":` and
 * `version: 2.4.0`, and `"qfai@workspace:."` for a workspace package.
 *
 * Entries that pin different versions leave nothing to compare against, so
 * they answer `null`.
 */
export function yarnPinnedVersion(text: string): string | null {
  const versions = new Set<string>();
  let inQfaiEntry = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      const descriptors = line
        .replace(/:\s*$/, "")
        .split(",")
        .map((each) => each.trim().replace(/^"|"$/g, ""));
      inQfaiEntry = descriptors.some((each) => each.startsWith("qfai@"));
      if (descriptors.some((each) => /^qfai@(?:workspace|link|portal|file):/.test(each))) {
        return null;
      }
      continue;
    }
    if (!inQfaiEntry) continue;
    const match = /^\s+version:?\s+"?([^"\s]+)"?\s*$/.exec(line);
    if (match === null) continue;
    const version = registryVersion(match[1]);
    if (version === null) return null;
    versions.add(version);
  }
  return versions.size === 1 ? ([...versions][0] ?? null) : null;
}

/** A running qfai that is not the version the project's lockfile pins. */
export type StaleInstall = {
  readonly running: string;
  readonly pin: LockfilePin;
  /** The directory holding the project's `package.json` and lockfile. */
  readonly dir: string;
};

/**
 * Whether the running qfai is the project's own copy at a version other than
 * the one its lockfile pins: the state a pulled qfai upgrade leaves in a
 * checkout that has not run its install since.
 *
 * The lockfile is read once, and only when the copy is the project's own: a
 * copy from elsewhere is not the one the lockfile installs, which
 * `qfai validate` reports on its own. Build metadata (`+...`) does not make
 * two versions differ.
 *
 * SIMPLIFIED: the lockfile is looked for only in the directory that declares
 * qfai, so the check is off in a workspace sub-package that declares qfai,
 * which has no lockfile of its own. Lift when: a monorepo needs it, by walking
 * up to the workspace root's lockfile and reading that sub-package's importer.
 *
 * `tool` stands in for the running copy, which a test cannot move; it defaults
 * to that copy.
 */
export async function findStaleInstall(
  root: string,
  tool?: { readonly packageDir: string | null; readonly version: string },
): Promise<StaleInstall | null> {
  const dir = await findOwnCopyProjectDir(root, tool?.packageDir);
  if (dir === null) return null;
  const pin = await readLockfilePin(dir);
  if (pin === null) return null;
  const running = tool?.version ?? (await resolveToolVersion());
  if (running === "unknown" || withoutBuild(running) === withoutBuild(pin.version)) return null;
  return { running, pin, dir };
}

/** A version without its `+build` metadata, which semver precedence ignores. */
function withoutBuild(version: string): string {
  return version.split("+")[0] ?? version;
}

/** The one line a stale install prints on stderr, ending with what to do. */
export function describeStaleInstall(stale: StaleInstall, stops: boolean): string {
  const command = INSTALL_COMMANDS[stale.pin.manager];
  const outcome = stops ? " This command stops until then." : "";
  return (
    `qfai: the installed qfai is ${stale.running}, but ${stale.pin.file} pins ` +
    `${stale.pin.version}. Run \`${command}\` in ${stale.dir}, then run the command again.` +
    outcome
  );
}

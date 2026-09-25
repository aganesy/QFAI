import { readFile, realpath, stat } from "node:fs/promises";
import { isBuiltin } from "node:module";
import path from "node:path";

import { withoutJsoncSyntax } from "./jsonc.js";
import { isInside } from "./validators/utils.js";

/**
 * The files a recorded test observation reached.
 *
 * A test observes the modules its test file imports, and the modules those
 * import, and nothing else under the source directory. Measuring a completed
 * row's staleness over the whole source directory makes every `done` row stale
 * within hours in an active repository, whatever changed. Measuring it over
 * this set turns "the change was unrelated" into a computed fact rather than a
 * judgement.
 *
 * The set holds the roots — the test file and the other files its record names
 * as test inputs — and every file under the source directory the roots reach
 * through their imports. The walk passes through files outside the source
 * directory, such as test helpers, to find the source files they import.
 *
 * `unfollowed` means the reach cannot be stated, and the caller measures over
 * the whole source directory instead. An import that cannot be followed may
 * lead anywhere, so under-reporting it would clear a row the change did reach.
 *
 * A relative path is resolved the way a bundler resolves one. A bare specifier
 * is resolved through the `compilerOptions.paths` and `baseUrl` of the root
 * `tsconfig.json` (or `jsconfig.json` where there is none), and otherwise
 * counts as external only when it is a runtime built-in or a package installed
 * outside the repository's own code.
 *
 * SIMPLIFIED: reads string-literal specifiers only, and only the root config.
 * A computed `import()` or `require()`, an alias no pattern resolves, or a test
 * file in a language other than JavaScript or TypeScript is unfollowed. Setup
 * files a test runner loads by configuration are not reached.
 * Lift when: a project's rows are measured falling back to the whole source
 * directory for one of these, rather than for an import that names no file.
 */
export type ObservationReach =
  | {
      readonly kind: "reach";
      readonly files: ReadonlySet<string>;
      /**
       * `files`, plus every other repository file the walk passed through
       * outside `node_modules`: the test helpers, fixtures and setup modules
       * that `files` leaves out because they sit outside the source directory.
       */
      readonly walked: ReadonlySet<string>;
    }
  | { readonly kind: "unfollowed"; readonly reason: string };

/** What one file imports, resolved, or why its imports cannot be followed. */
type FileImports =
  | { readonly kind: "imports"; readonly files: readonly string[] }
  | { readonly kind: "unfollowed"; readonly reason: string };

/** The path aliases a project's root compiler config declares. */
interface PathAliases {
  /** The config file they were read from, for a finding to name. */
  readonly configName: string;
  /** `[pattern, targets]`, each pattern holding at most one `*`. */
  readonly paths: ReadonlyArray<readonly [string, readonly string[]]>;
  /** Where a `paths` target is resolved from. */
  readonly pathsBase: string;
  /** Where a bare specifier no pattern matches is tried, if anywhere. */
  readonly baseUrl: string | null;
}

/**
 * Shared by every row of one run: each file's imports, and the project's path
 * aliases, which stay `undefined` until the first row reads them.
 */
export interface ObservationReachCache {
  readonly imports: Map<string, FileImports>;
  aliases?: PathAliases | null;
}

/** The part of a compiler config that decides how a bare specifier resolves. */
interface ConfigPaths {
  readonly dir: string;
  readonly baseUrl: string | null;
  readonly paths: ReadonlyArray<readonly [string, readonly string[]]> | null;
}

/** Everything a file's imports are resolved against. */
interface WalkContext {
  readonly root: string;
  readonly realRoot: string;
  readonly aliases: PathAliases | null;
}

const SCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const PROBE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".d.ts",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
];
/** TypeScript's ESM convention: `./x.js` names the source `./x.ts`. */
const SOURCE_FOR_EMITTED: Readonly<Record<string, readonly string[]>> = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
};

const FROM_SPECIFIER = /\b(?:import|export)\b[^'"`;]*?\bfrom\s*(['"])([^'"\n]+)\1/g;
const BARE_IMPORT = /\bimport\s*(['"])([^'"\n]+)\1/g;
const CALL_SPECIFIER = /\b(?:import|require)\s*\(\s*(['"])([^'"\n]+)\1\s*[,)]/g;
const COMPUTED_CALL = /\b(?:import|require)\s*\(\s*(?!['"\s])/;

function specifiersIn(content: string): string[] {
  const found: string[] = [];
  for (const pattern of [FROM_SPECIFIER, BARE_IMPORT, CALL_SPECIFIER]) {
    for (const match of content.matchAll(pattern)) {
      const specifier = match[2];
      if (specifier !== undefined) found.push(specifier);
    }
  }
  return found;
}

async function isFile(absolute: string): Promise<boolean> {
  try {
    return (await stat(absolute)).isFile();
  } catch {
    return false;
  }
}

function underNodeModules(absolute: string): boolean {
  return absolute.split(path.sep).includes("node_modules");
}

/** The file an import of `base` loads: as written, by extension, or as a directory index. */
async function resolveFile(base: string): Promise<string | null> {
  const extension = path.extname(base);
  const stem = base.slice(0, base.length - extension.length);
  const candidates = [
    base,
    ...(SOURCE_FOR_EMITTED[extension] ?? []).map((source) => stem + source),
    ...PROBE_EXTENSIONS.map((probe) => base + probe),
    ...PROBE_EXTENSIONS.map((probe) => path.join(base, `index${probe}`)),
  ];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

/**
 * Whether a bare specifier names code outside the repository's own.
 *
 * A package counts only once it is found installed. An unfound name may be a
 * path alias into the source directory, and a package whose installed copy is
 * a link back into the repository — a workspace member — is the repository's
 * own code under another name.
 */
async function isExternalPackage(
  realRoot: string,
  from: string,
  specifier: string,
): Promise<boolean> {
  const segments = specifier.split("/");
  const scoped = specifier.startsWith("@");
  const nameSegments = segments.slice(0, scoped ? 2 : 1);
  if (nameSegments.some((segment) => !/^@?[a-z0-9][\w.-]*$/i.test(segment))) return false;
  if (scoped && nameSegments.length < 2) return false;
  let directory = path.dirname(from);
  for (;;) {
    const installed = path.join(directory, "node_modules", ...nameSegments);
    try {
      const target = await realpath(installed);
      return !(isInside(realRoot, target) && !underNodeModules(target));
    } catch {
      // Not installed at this level; look one level up.
    }
    const parent = path.dirname(directory);
    if (parent === directory) return false;
    directory = parent;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A JSONC file's value, `undefined` when there is no such file, `null` when it does not parse. */
async function readJsonc(file: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(file, "utf-8");
  } catch {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(withoutJsoncSyntax(text));
    return parsed;
  } catch {
    return null;
  }
}

function configPaths(config: unknown, dir: string): ConfigPaths {
  const options: Record<string, unknown> =
    isRecord(config) && isRecord(config.compilerOptions) ? config.compilerOptions : {};
  const baseUrl = typeof options.baseUrl === "string" ? path.resolve(dir, options.baseUrl) : null;
  const paths = isRecord(options.paths)
    ? Object.entries(options.paths).map(
        ([pattern, targets]): readonly [string, readonly string[]] => [
          pattern,
          Array.isArray(targets)
            ? targets.filter((target): target is string => typeof target === "string")
            : [],
        ],
      )
    : null;
  return { dir, baseUrl, paths };
}

/**
 * The config a relative `extends` names, one level up.
 *
 * SIMPLIFIED: one level, and a relative path only. A package name or an array
 * in `extends` is not read, so the aliases it declares do not resolve and the
 * row falls back to the whole source directory.
 * Lift when: a project whose aliases live in an extended package config is
 * measured falling back for that reason.
 */
async function extendedConfigPaths(config: unknown, dir: string): Promise<ConfigPaths | null> {
  const parent = isRecord(config) ? config.extends : undefined;
  if (typeof parent !== "string" || !(parent.startsWith("./") || parent.startsWith("../"))) {
    return null;
  }
  const file = path.resolve(dir, parent);
  for (const candidate of file.endsWith(".json") ? [file] : [file, `${file}.json`]) {
    const parsed = await readJsonc(candidate);
    if (parsed !== undefined) return configPaths(parsed, path.dirname(candidate));
  }
  return null;
}

/**
 * The path aliases of the project's root `tsconfig.json`, or of its
 * `jsconfig.json` where it has no `tsconfig.json`.
 *
 * `paths` and `baseUrl` follow the compiler: a config's own value wins over the
 * one it extends, and `paths` targets resolve from `baseUrl` where one is set,
 * otherwise from the directory of the config that declared them.
 */
async function loadPathAliases(root: string): Promise<PathAliases | null> {
  for (const configName of ["tsconfig.json", "jsconfig.json"]) {
    const config = await readJsonc(path.join(root, configName));
    if (config === undefined) continue;
    const own = configPaths(config, root);
    const parent = await extendedConfigPaths(config, root);
    const baseUrl = own.baseUrl ?? parent?.baseUrl ?? null;
    const declaring = own.paths !== null ? own : parent?.paths ? parent : null;
    return {
      configName,
      baseUrl,
      paths: declaring?.paths ?? [],
      pathsBase: baseUrl ?? declaring?.dir ?? root,
    };
  }
  return null;
}

/**
 * The `paths` pattern that governs `specifier`, and what its `*` captured.
 *
 * An exact pattern wins; among wildcards, the longest prefix does, as the
 * compiler chooses.
 */
function matchingPattern(
  paths: PathAliases["paths"],
  specifier: string,
): { pattern: string; targets: readonly string[]; captured: string } | null {
  let best: { pattern: string; targets: readonly string[]; captured: string } | null = null;
  let bestPrefix = -1;
  for (const [pattern, targets] of paths) {
    const star = pattern.indexOf("*");
    if (star === -1) {
      if (pattern === specifier) return { pattern, targets, captured: "" };
      continue;
    }
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (
      prefix.length > bestPrefix &&
      specifier.length >= prefix.length + suffix.length &&
      specifier.startsWith(prefix) &&
      specifier.endsWith(suffix)
    ) {
      const captured = specifier.slice(prefix.length, specifier.length - suffix.length);
      best = { pattern, targets, captured };
      bestPrefix = prefix.length;
    }
  }
  return best;
}

/** Where a specifier leads: a file, code outside the project, or nowhere this walk can follow. */
type SpecifierTarget =
  | { readonly kind: "file"; readonly file: string }
  | { readonly kind: "external" }
  | { readonly kind: "unfollowed"; readonly why: string };

/**
 * A bare specifier resolved through the project's path aliases, or `null` when
 * no alias applies to it.
 */
async function resolveAlias(
  aliases: PathAliases | null,
  specifier: string,
): Promise<SpecifierTarget | null> {
  if (aliases === null) return null;
  const match = matchingPattern(aliases.paths, specifier);
  if (match !== null) {
    for (const target of match.targets) {
      const file = await resolveFile(
        path.resolve(aliases.pathsBase, target.replace("*", match.captured)),
      );
      if (file !== null) return { kind: "file", file };
    }
    return {
      kind: "unfollowed",
      why: `which matches \`${match.pattern}\` in ${aliases.configName} but names no file`,
    };
  }
  if (aliases.baseUrl !== null) {
    const file = await resolveFile(path.resolve(aliases.baseUrl, specifier));
    if (file !== null) return { kind: "file", file };
  }
  return null;
}

async function resolveSpecifier(
  context: WalkContext,
  from: string,
  specifier: string,
): Promise<SpecifierTarget> {
  const withoutQuery = specifier.replace(/\?.*$/, "");
  if (withoutQuery.startsWith("./") || withoutQuery.startsWith("../")) {
    const file = await resolveFile(
      path.resolve(path.dirname(from), withoutQuery.replace(/#.*$/, "")),
    );
    return file !== null
      ? { kind: "file", file }
      : { kind: "unfollowed", why: "which names no file" };
  }
  if (isBuiltin(withoutQuery)) return { kind: "external" };
  const aliased = await resolveAlias(context.aliases, withoutQuery);
  if (aliased !== null) return aliased;
  if (await isExternalPackage(context.realRoot, from, withoutQuery)) return { kind: "external" };
  return {
    kind: "unfollowed",
    why: "which is neither relative, a path alias, nor an installed package",
  };
}

async function readImports(context: WalkContext, absolute: string): Promise<FileImports> {
  const shown = path.relative(context.root, absolute).split(path.sep).join("/");
  let content: string;
  try {
    content = await readFile(absolute, "utf-8");
  } catch {
    return { kind: "unfollowed", reason: `\`${shown}\` could not be read` };
  }
  if (COMPUTED_CALL.test(content)) {
    return { kind: "unfollowed", reason: `\`${shown}\` imports a computed path` };
  }
  const files: string[] = [];
  for (const specifier of specifiersIn(content)) {
    const target = await resolveSpecifier(context, absolute, specifier);
    if (target.kind === "external") continue;
    const why =
      target.kind === "unfollowed"
        ? target.why
        : isInside(context.root, target.file)
          ? null
          : "which resolves outside the repository";
    if (why !== null) {
      return { kind: "unfollowed", reason: `\`${shown}\` imports \`${specifier}\`, ${why}` };
    }
    if (target.kind === "file") files.push(target.file);
  }
  return { kind: "imports", files };
}

/**
 * The reach of a test observation, as repository-relative paths.
 *
 * `otherRoots` are the other test inputs the row's record names. The test file
 * has to be a script; the other roots are walked when they are scripts, and
 * counted as covered either way.
 */
export async function observationReach(
  root: string,
  srcRelDir: string,
  testFile: string,
  otherRoots: readonly string[],
  cache: ObservationReachCache = { imports: new Map() },
): Promise<ObservationReach> {
  const absoluteRoot = path.resolve(root);
  // An installed package's real path is compared against the root's, so a
  // project reached through a symlink still recognises its own workspace code.
  const realRoot = await realpath(absoluteRoot).catch(() => absoluteRoot);
  const toRelative = (absolute: string): string =>
    path.relative(absoluteRoot, absolute).split(path.sep).join("/");
  const toAbsolute = (relative: string): string | null => {
    const normalized = relative.replace(/\\/g, "/");
    if (path.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) return null;
    const absolute = path.resolve(absoluteRoot, normalized);
    return absolute !== absoluteRoot && isInside(absoluteRoot, absolute) ? absolute : null;
  };

  const testPath = toAbsolute(testFile);
  if (testPath === null || !SCRIPT_EXTENSIONS.has(path.extname(testPath))) {
    return {
      kind: "unfollowed",
      reason: `the test file \`${testFile}\` is not a JavaScript or TypeScript file in the repository`,
    };
  }
  const sourceRoot = srcRelDir.length > 0 ? toAbsolute(srcRelDir) : null;
  if (sourceRoot === null) {
    return { kind: "unfollowed", reason: "no source directory is configured" };
  }

  if (cache.aliases === undefined) cache.aliases = await loadPathAliases(absoluteRoot);
  const context: WalkContext = { root: absoluteRoot, realRoot, aliases: cache.aliases };
  const covered = new Set<string>(
    [testFile, ...otherRoots].map((file) => file.replace(/\\/g, "/")),
  );
  const pending: string[] = [testPath];
  for (const other of otherRoots) {
    const absolute = toAbsolute(other);
    if (absolute !== null && SCRIPT_EXTENSIONS.has(path.extname(absolute))) {
      if (await isFile(absolute)) pending.push(absolute);
    }
  }
  const visited = new Set<string>();
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (visited.has(next)) continue;
    visited.add(next);
    if (isInside(sourceRoot, next)) covered.add(toRelative(next));
    if (!SCRIPT_EXTENSIONS.has(path.extname(next)) || underNodeModules(next)) continue;
    let imports = cache.imports.get(next);
    if (imports === undefined) {
      imports = await readImports(context, next);
      cache.imports.set(next, imports);
    }
    if (imports.kind === "unfollowed") return imports;
    pending.push(...imports.files);
  }
  const walked = new Set(covered);
  for (const file of visited) {
    if (!underNodeModules(file)) walked.add(toRelative(file));
  }
  return { kind: "reach", files: covered, walked };
}

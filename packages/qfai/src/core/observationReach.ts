import { readFile, realpath, stat } from "node:fs/promises";
import { isBuiltin } from "node:module";
import path from "node:path";

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
 * SIMPLIFIED: reads string-literal specifiers only. A relative path is resolved
 * the way a bundler resolves one; a bare specifier counts as external only when
 * it is a runtime built-in or a package installed outside the repository's own
 * code. A path alias (`@/lib/x`), a computed `import()` or `require()`, or a
 * test file in a language other than JavaScript or TypeScript is unfollowed.
 * Setup files a test runner loads by configuration are not reached either.
 * Lift when: a project's aliased rows are measured still going stale for
 * changes their tests do not import.
 */
export type ObservationReach =
  | { readonly kind: "reach"; readonly files: ReadonlySet<string> }
  | { readonly kind: "unfollowed"; readonly reason: string };

/** What one file imports, resolved, or why its imports cannot be followed. */
type FileImports =
  | { readonly kind: "imports"; readonly files: readonly string[] }
  | { readonly kind: "unfollowed"; readonly reason: string };

/** Parsed imports per absolute path, shared by every row of one run. */
export type ObservationReachCache = Map<string, FileImports>;

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

async function resolveRelative(from: string, specifier: string): Promise<string | null> {
  const base = path.resolve(path.dirname(from), specifier.replace(/[?#].*$/, ""));
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
  if (isBuiltin(specifier)) return true;
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

async function readImports(root: string, realRoot: string, absolute: string): Promise<FileImports> {
  const shown = path.relative(root, absolute).split(path.sep).join("/");
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
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const resolved = await resolveRelative(absolute, specifier);
      if (resolved === null || !isInside(root, resolved)) {
        return {
          kind: "unfollowed",
          reason: `\`${shown}\` imports \`${specifier}\`, which names no file in the repository`,
        };
      }
      files.push(resolved);
    } else if (!(await isExternalPackage(realRoot, absolute, specifier))) {
      return {
        kind: "unfollowed",
        reason: `\`${shown}\` imports \`${specifier}\`, which is neither relative nor an installed package`,
      };
    }
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
  cache: ObservationReachCache = new Map(),
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
    let imports = cache.get(next);
    if (imports === undefined) {
      imports = await readImports(absoluteRoot, realRoot, next);
      cache.set(next, imports);
    }
    if (imports.kind === "unfollowed") return imports;
    pending.push(...imports.files);
  }
  return { kind: "reach", files: covered };
}

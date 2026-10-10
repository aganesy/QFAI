import { readdirSync, readFileSync, statSync, type Dirent } from "node:fs";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";
import { unusableGlobReason } from "./fs.js";
import { braceRangeMembers, BraceRangeRefused } from "./globBraceRange.js";
import { isGlobExclusion } from "./testGlobExtensions.js";
/**
 * Extension set used when the project declares no
 * `validation.traceability.testFileGlobs`. It is a fallback, not the rule: its
 * code extensions are all JavaScript/TypeScript, so a Python / Go / Java /
 * Ruby / Rust repository matched none of its executable test files under it.
 * (`feature` / `md` / `markdown` still match, but those are annotation
 * carriers, not test code — a repo with no Gherkin or markdown ledger matches
 * nothing at all.)
 */
const DEFAULT_TEST_FILE_EXTENSIONS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  "feature",
  "md",
  "markdown",
] as const;
const DEFAULT_TEST_FILE_GLOB = `**/*.{${DEFAULT_TEST_FILE_EXTENSIONS.join(",")}}`;

export type AtddTestKind = "e2e" | "api" | "integration";

/** Test directory each `AtddTestKind` owns, for user-facing messages. */
export const ATDD_TEST_KIND_DIRS: Record<AtddTestKind, string> = {
  integration: "tests/integration/**",
  api: "tests/api/**",
  e2e: "tests/e2e/**",
};

/**
 * The same map rendered against the project's configured `paths.testsDir`.
 *
 * The scan already follows `testsDir`, so a project that renamed it to e.g.
 * `acceptance` would otherwise be told to annotate `tests/api/**` — a directory
 * the scan never reads. A root-level layout (`testsDir: "."`) is the same trap in
 * the other direction: the scan reads `api/**` at the repository root, so the
 * `tests/` segment must be dropped rather than kept.
 * {@link ATDD_TEST_KIND_DIRS} stays as the default-shaped fallback for callers
 * with no config in hand.
 */
export function atddTestKindDirs(testsDirRelative: string): Record<AtddTestKind, string> {
  const base = toPosixPath(testsDirRelative).replace(/\/+$/, "");
  if (base === "tests") {
    return ATDD_TEST_KIND_DIRS;
  }
  const prefix = base.length === 0 || base === "." ? "" : `${base}/`;
  return {
    integration: `${prefix}integration/**`,
    api: `${prefix}api/**`,
    e2e: `${prefix}e2e/**`,
  };
}

/**
 * Extensions the ATDD scan must always read, whatever the project configures.
 *
 * `validation.traceability.testFileGlobs` describes executable test *code*, but
 * annotations also legitimately live in Gherkin features and in markdown
 * traceability files. These are annotation carriers, not code,
 * so they are unioned in rather than replaced.
 */
const STRUCTURAL_ANNOTATION_EXTENSIONS = ["feature", "md", "markdown"] as const;

/**
 * Lifts the bare extension set out of the project's configured `testFileGlobs`
 * (`tests/**\/*.py` -> `py`). Empty when nothing could be recovered.
 *
 * Exported because the scaffold writer selects its skeleton dialect from the
 * same set (`core/atdd/scaffoldDialect.ts`): the command that PRODUCES ATDD
 * tests and the scan that CONSUMES them must read this config key identically,
 * or the writer emits an extension the scan never opens.
 */
/**
 * The most candidates one glob may expand into.
 *
 * Ranges multiply, so a ceiling on how many are read is what keeps a pattern
 * from expanding into more strings than there is reason to hold. A glob past it
 * yields no extension at all: a set read from part of an expansion names
 * extensions the matcher does not select, which is the mistake reading the
 * ranges exists to avoid.
 */
const RANGE_CANDIDATES = 4096;

/**
 * The glob with its brace ranges written out, as fast-glob expands them before
 * it matches anything.
 *
 * `tests/**\/*.{p..p}y` names Python files, and read as text it names an
 * extension nothing recognises, so the stage fell back to its JavaScript
 * default and scanned a tree the project does not keep its tests in.
 *
 * Lists are left alone: the caller reads `.{a,b}` itself, keeping a member's
 * wildcards, which expansion here would lose.
 */
function withRangesExpanded(glob: string): string[] | null {
  let expanded = [glob];
  // Each round writes out one range per candidate, so a candidate holding a
  // range still holds one fewer afterwards and the loop reaches a pattern with
  // none. Stopping at a fixed number of rounds instead left the ranges past it
  // as text, and a pattern whose extension is spelled by the last of them read
  // as one whose extension nothing supports.
  for (;;) {
    const next: string[] = [];
    let changed = false;
    for (const candidate of expanded) {
      const written = firstRangeWrittenOut(candidate);
      if (written === null) {
        next.push(candidate);
        continue;
      }
      changed = true;
      next.push(...written);
    }
    if (next.length > RANGE_CANDIDATES) return null;
    expanded = next;
    if (!changed) break;
  }
  return expanded;
}

/**
 * The candidate with its first brace range written out, or `null` when it holds
 * none.
 *
 * Every group is looked at, not only the first: a directory list can stand
 * ahead of a range in the extension, as `tests/{unit,integration}/**\/*.{p..p}y`
 * does, and stopping at the list left the extension unread.
 *
 * A range fast-glob refuses is left as it stands, and the groups after it are
 * read all the same. The pattern then selects nothing, and whoever compiles it
 * says so; dropping it here would leave a configured project looking like one
 * that configured no glob at all.
 */
function firstRangeWrittenOut(candidate: string): string[] | null {
  for (let open = candidate.indexOf("{"); open !== -1; open = candidate.indexOf("{", open + 1)) {
    const close = candidate.indexOf("}", open);
    if (close === -1) return null;
    let members: readonly string[] | null;
    try {
      members = braceRangeMembers(candidate.slice(open + 1, close));
    } catch (error) {
      // A range fast-glob refuses stays as it stands, and the groups after it
      // are still read: the pattern selects nothing either way, and the one
      // that spells the extension is what the stage needs from it.
      if (!(error instanceof BraceRangeRefused)) throw error;
      continue;
    }
    if (members === null) continue;
    // A group in the last segment decides the extension, so every member of it
    // is read. One further up gives every member the same tail, so one member
    // answers for all of them — and reading more multiplies the candidates a
    // pattern expands into without reaching a different extension.
    const inLastSegment = !candidate.slice(open).includes("/");
    const read = inLastSegment ? members : members.slice(0, 1);
    return read.map((member) => candidate.slice(0, open) + member + candidate.slice(close + 1));
  }
  return null;
}

/**
 * The extensions a set of globs names, and whether any of them was too large to
 * write out.
 *
 * The two are reported apart because they call for opposite answers. A project
 * that configured nothing has no extension and takes the default; a glob whose
 * expansion passed the bound has extensions this read could not recover, and a
 * caller that treats it as the first writes a file the project's own scan will
 * not collect.
 */
export type TestFileExtensions = {
  readonly extensions: Set<string>;
  readonly overBound: boolean;
};

export function readTestFileExtensions(testFileGlobs: readonly string[]): TestFileExtensions {
  let overBound = false;
  const extensions = new Set<string>();
  for (const entry of testFileGlobs) {
    // Trimmed as the scan trims it, or a trailing space hides the extension.
    const glob = entry.trim();
    // A leading `!` excludes. Its extension names files the scan must not read,
    // and counted, `!tests/fixtures/**/*.ts` beside a Python glob added TypeScript
    // to what the stage scans. `!(` opens a negated extglob instead, which
    // selects: `!(fixtures)/**/*.py` is a Python selector, as fast-glob reads it.
    if (isGlobExclusion(glob)) continue;
    // Read off the patterns fast-glob matches with, which are the pattern with
    // its ranges written out. Both shapes are read from each of them: a range
    // inside a list — `*.{{p..p}y,rb}` — is a list only once the range is
    // written out, and the list pattern cannot parse it before that.
    // A glob too large to write out yields nothing, and says so: what a partial
    // expansion names is not what the matcher selects, and an empty answer on
    // its own reads as a project that configured nothing.
    const candidates = withRangesExpanded(glob);
    if (candidates === null) {
      overBound = true;
      continue;
    }
    for (const candidate of candidates) {
      for (const match of candidate.matchAll(/\.\{([^}]+)\}$/g)) {
        for (const ext of (match[1] ?? "").split(",")) {
          // A member is copied into the generated scan pattern whole, wildcards
          // included, since the matcher reads `test-*.js` there as it does here.
          // One the matcher cannot use is left out: a NUL byte copied in made the
          // scan throw before any finding was reported.
          const trimmed = ext.trim();
          if (trimmed.length > 0 && unusableGlobReason(trimmed) === null) extensions.add(trimmed);
        }
      }
      const single = /\.([A-Za-z0-9]+)$/.exec(candidate);
      if (single?.[1]) {
        extensions.add(single[1]);
      }
    }
  }
  return { extensions, overBound };
}

/**
 * The extensions alone, for a caller whose answer to an unreadable glob is the
 * same as its answer to no glob at all: the scan's own pattern, which widens
 * rather than narrows and so reads more files rather than fewer.
 */
export function deriveTestFileExtensions(testFileGlobs: readonly string[]): Set<string> {
  return readTestFileExtensions(testFileGlobs).extensions;
}

/**
 * Derives the per-layer file pattern from the project's configured
 * `testFileGlobs`, so a non-JS repository is scanned with its own extensions.
 *
 * Configured globs describe whole paths (`tests/**\/*.py`); the ATDD scan needs
 * a pattern to append under `tests/{e2e,api,integration}/`. The extension set is
 * therefore lifted out of them, unioned with the structural annotation carriers
 * above, and recombined. When no extension can be recovered, the JS/TS default
 * is used.
 */
export function deriveAtddFilePattern(testFileGlobs: readonly string[]): string {
  const extensions = deriveTestFileExtensions(testFileGlobs);
  if (extensions.size === 0) {
    return DEFAULT_TEST_FILE_GLOB;
  }
  for (const ext of STRUCTURAL_ANNOTATION_EXTENSIONS) {
    extensions.add(ext);
  }
  // Always the brace form: the loop above unions in
  // STRUCTURAL_ANNOTATION_EXTENSIONS, three entries, so a non-empty set can
  // never have one member and a `**/*.<ext>` branch would be dead code.
  const sorted = Array.from(extensions).sort();
  return `**/*.{${sorted.join(",")}}`;
}

function buildAtddTestGlobs(root: string, testsRoot: string, filePattern: string): string[] {
  const relativeTestsRoot = path.relative(root, testsRoot);
  const isInsideRoot =
    relativeTestsRoot.length === 0 ||
    (!relativeTestsRoot.startsWith("..") && !path.isAbsolute(relativeTestsRoot));
  const base = isInsideRoot
    ? toPosixPath(relativeTestsRoot.length === 0 ? "." : relativeTestsRoot)
    : toPosixPath(testsRoot);
  const normalizedBase = base.replace(/\/+$/, "");
  return [
    `${normalizedBase}/e2e/${filePattern}`,
    `${normalizedBase}/api/${filePattern}`,
    `${normalizedBase}/integration/${filePattern}`,
  ];
}

/**
 * Every glob the scan collects from.
 *
 * Two sources, because one of them cannot answer for a monorepo.
 * `paths.testsDir` is a single value, so in a repository whose suites live one
 * per package there is no second `testsDir` for the other packages to be named
 * by, and the three layer globs built from it match a directory holding no
 * tests at all. The project's own `validation.traceability.testFileGlobs` name
 * those suites already.
 *
 * The project's globs are used as written, never sliced for a base to build a
 * layer glob under. A glob whose directory part carries a wildcard slices to a
 * base with the wildcard still in it, and the layer glob synthesized under that
 * base addresses a directory the project never configured.
 */
function buildAtddScanGlobs(
  root: string,
  testsRoot: string,
  filePattern: string,
  projectTestFileGlobs: readonly string[],
): string[] {
  const globs = new Set(buildAtddTestGlobs(root, testsRoot, filePattern));
  for (const glob of projectTestFileGlobs) {
    const normalized = toPosixPath(glob).trim();
    if (normalized.length > 0) {
      globs.add(normalized);
    }
  }
  return [...globs];
}

/**
 * The acceptance-test globs this stage reads, for a scanner that brings its own
 * file pattern.
 *
 * Two sources, the same two the ATDD scan uses: the layer directories under
 * `paths.testsDir`, built from the pattern, and the project's own
 * `validation.traceability.testFileGlobs`, which is where a monorepo's other
 * packages keep their acceptance suites.
 *
 * **The result is not acceptance-only.** The project globs describe the whole
 * repository's tests, unit and component suites included, so a caller must
 * apply `atddAcceptanceLayerFilter` to what these globs collect. The globs
 * decide what can be read; the filter decides what this stage owns.
 */
export function atddAcceptanceTestGlobs(
  root: string,
  config: QfaiConfig,
  filePattern: string,
): string[] {
  return buildAtddScanGlobs(
    root,
    resolvePath(root, config, "testsDir"),
    filePattern,
    config.validation.traceability.testFileGlobs,
  );
}

/**
 * Directory names that declare an acceptance layer.
 *
 * The same three the contract names. A file outside `paths.testsDir` already
 * says which layer it is by sitting in one of them; reading that is what lets
 * a second package's acceptance tests count.
 */
const ATDD_LAYER_SEGMENTS = new Map<string, AtddTestKind>([
  ["e2e", "e2e"],
  ["api", "api"],
  ["integration", "integration"],
]);

export type TestLayerRoots = {
  root: string;
  testsDirName: string;
  e2eRoot: string;
  apiRoot: string;
  integrationRoot: string;
  isPackageRoot: (absoluteDir: string) => boolean;
};

/** Shared directory crosswalk for acceptance checks and migration. */
export function createTestLayerRoots(root: string, config: QfaiConfig): TestLayerRoots {
  const testsRoot = resolvePath(root, config, "testsDir");
  return {
    root,
    testsDirName: testsDirName(root, config),
    e2eRoot: path.join(testsRoot, "e2e"),
    apiRoot: path.join(testsRoot, "api"),
    integrationRoot: path.join(testsRoot, "integration"),
    isPackageRoot: packageRootProbe(),
  };
}

/** An acceptance layer a file answers, and the layer directory it sits in. */
type TestLayer = { kind: AtddTestKind; layerDir: string };

export function resolveTestKind(filePath: string, roots: TestLayerRoots): AtddTestKind | null {
  return resolveTestLayer(filePath, roots)?.kind ?? null;
}

function resolveTestLayer(filePath: string, roots: TestLayerRoots): TestLayer | null {
  if (isWithinPath(roots.e2eRoot, filePath)) {
    return { kind: "e2e", layerDir: roots.e2eRoot };
  }
  if (isWithinPath(roots.apiRoot, filePath)) {
    return { kind: "api", layerDir: roots.apiRoot };
  }
  if (isWithinPath(roots.integrationRoot, filePath)) {
    return { kind: "integration", layerDir: roots.integrationRoot };
  }
  return resolveTestLayerFromPath(roots.root, filePath, roots.testsDirName, roots.isPackageRoot);
}

/**
 * Directory names a test suite is rooted at.
 *
 * The layer is read from the segment **after** one of these, not from any
 * ancestor that happens to share a layer's name. Scanning ancestors put every
 * test of a package called `api` — including its unit suite — in the API layer,
 * and `packages/api/tests/helpers/` has no deeper layer segment to correct it.
 *
 * The configured `paths.testsDir` basename joins this set per project, so a
 * project that renamed the directory is read the same way.
 */
const TEST_ROOT_SEGMENTS = new Set(["tests", "test", "__tests__"]);

/**
 * The layer a file outside `paths.testsDir` declares by where it sits.
 *
 * One segment decides it: the one immediately inside the deepest test root on
 * the path. That is the shape the contract describes — `<testsDir>/<layer>/**` —
 * and reading it there rather than anywhere in the path keeps a package name
 * out of the answer.
 *
 * `null` for a path outside the repository root, for one with no test root on
 * it, and for a file sitting directly in a test root with no layer directory
 * between them.
 *
 * The second of those is the reason a configured glob does not get its own
 * rule. A colocated `src/api/client.spec.ts` is a unit test, and answering from
 * the file's own directory would read it as an API acceptance one — after which
 * an annotation in it discharges an obligation, and an unfilled stub blocks a
 * gate that owns none of it. A project whose suites sit outside a directory
 * named here anchors them by naming their root `tests`, `test` or `__tests__`,
 * or by pointing `paths.testsDir` at one; missing such a file is the safe
 * direction, and claiming one is not.
 */
function resolveTestLayerFromPath(
  root: string,
  filePath: string,
  testsDirName: string,
  isPackageRoot: (absoluteDir: string) => boolean,
): TestLayer | null {
  const relative = path.relative(root, filePath);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const directories = toPosixPath(relative).split("/").slice(0, -1);
  let testRoot = -1;
  directories.forEach((directory, index) => {
    if (!TEST_ROOT_SEGMENTS.has(directory) && directory !== testsDirName) {
      return;
    }
    // A package may be called `tests`, and `packages/tests/api/client.spec.ts`
    // is then a source tree whose second segment reads as a layer. What
    // separates the two is the manifest: a workspace package has one, a suite
    // directory inside a package does not.
    if (isPackageRoot(path.join(root, ...directories.slice(0, index + 1)))) {
      // A package root clears every outer candidate, because the directories
      // below it belong to that package rather than to the outer layout. In
      // `packages/app/tests/integration/fixtures/tests/api/client.test.ts`,
      // with a manifest in the inner `tests`, the file answers no layer of the
      // outer suite: its annotation discharges nothing there, and its stub
      // gates nothing that package owns.
      //
      // The scan continues, so a genuine test root deeper still is reached.
      testRoot = -1;
      return;
    }
    // A deeper root answers or invalidates; it never leaves an outer one
    // standing over a suite that declares something else.
    const below = directories[index + 1];
    if (below === undefined) {
      // A terminal container: `<pkg>/tests/integration/__tests__/pay.test.ts`
      // is the documented layout with one more directory inside it, and the
      // outer root's layer is still the file's.
      return;
    }
    if (!ATDD_LAYER_SEGMENTS.has(below)) {
      // The deeper root declares a layer this stage does not own —
      // `.../fixtures/tests/unit/pay.test.ts` is a unit suite — so the outer
      // candidate goes too. The file belongs to that unit suite, which owes
      // ATDD nothing, so neither its annotation nor its stub answers the outer
      // `integration` layer.
      //
      // The scan continues: a still deeper root may be the real one, as in
      // `examples/test/projects/app/tests/integration/**`, where the first
      // pair is a fixture path and the second is the suite.
      testRoot = -1;
      return;
    }
    testRoot = index;
  });
  if (testRoot < 0) {
    return null;
  }
  const layer = directories[testRoot + 1];
  const kind = layer === undefined ? undefined : ATDD_LAYER_SEGMENTS.get(layer);
  return kind === undefined
    ? null
    : { kind, layerDir: path.join(root, ...directories.slice(0, testRoot + 2)) };
}

/**
 * The basename `resolveTestLayerFromPath` reads as a test root for this project.
 *
 * Empty when `paths.testsDir` is the repository root: there the layer directories
 * sit at the top level and the containment check answers for them, so taking
 * the checkout's own directory name as a test root would only let an unrelated
 * path match it.
 */
function testsDirName(root: string, config: QfaiConfig): string {
  const testsRoot = resolvePath(root, config, "testsDir");
  if (path.relative(root, testsRoot) === "") {
    return "";
  }
  const base = toPosixPath(testsRoot).replace(/\/+$/, "");
  return base.slice(base.lastIndexOf("/") + 1);
}

/**
 * Package-manifest basenames that name a package whatever they hold, across the
 * ecosystems this toolkit reads tests in.
 *
 * The list follows the ecosystems a workspace declares packages in, not the
 * languages the stub validator has a dialect for: a package called `tests` has
 * to be told apart from a test root in any of them, and the discriminator has
 * to be its own manifest, not Node's.
 */
const PACKAGE_MANIFEST_NAMES = new Set([
  "setup.py",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "build.sbt",
  "Gemfile",
  "composer.json",
  "Package.swift",
  "pubspec.yaml",
]);

/** Manifest extensions whose basename a project chooses. */
const PACKAGE_MANIFEST_EXTENSIONS = new Set([".gemspec", ".csproj", ".vbproj", ".fsproj"]);

/** Whether a JSON manifest's top level declares a string `name`. */
function declaresName(content: string): boolean {
  try {
    const parsed: unknown = JSON.parse(content);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "name" in parsed &&
      typeof parsed.name === "string"
    );
  } catch {
    return false;
  }
}

/**
 * JSONC with its comments and trailing commas taken out, so `JSON.parse` reads
 * it. A `//` or `/*` inside a string is text, not a comment.
 */
function withoutJsoncSyntax(content: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i] ?? "";
    const next = content[i + 1] ?? "";
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next;
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      const end = content.indexOf("\n", i);
      i = end === -1 ? content.length : end - 1;
    } else if (char === "/" && next === "*") {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 1;
    } else if (char === "," && /^\s*[}\]]/.test(withoutLeadingComments(content.slice(i + 1)))) {
      // A trailing comma: the next thing that is not a comment closes the value.
    } else {
      out += char;
    }
  }
  return out;
}

/** Text with leading whitespace and comments removed, up to its first token. */
function withoutLeadingComments(text: string): string {
  let rest = text;
  for (;;) {
    const trimmed = rest.trimStart();
    if (trimmed.startsWith("//")) {
      const end = trimmed.indexOf("\n");
      rest = end === -1 ? "" : trimmed.slice(end + 1);
    } else if (trimmed.startsWith("/*")) {
      const end = trimmed.indexOf("*/");
      rest = end === -1 ? "" : trimmed.slice(end + 2);
    } else {
      return trimmed;
    }
  }
}

/**
 * Manifests a test root also keeps for its runner's settings, with what makes
 * one a package's.
 *
 * A suite may hold `setup.cfg` or a tool-only `pyproject.toml` for pytest, or a
 * `package.json` holding only `"type"` to set its module format, so each of
 * these counts only when its contents name a package. Anything else would make
 * the suite's own directory a package, and no acceptance file below it would
 * answer a layer.
 */
const CONFIGURABLE_MANIFESTS = new Map<string, (content: string) => boolean>([
  ["package.json", declaresName],
  ["deno.json", declaresName],
  ["deno.jsonc", (content) => declaresName(withoutJsoncSyntax(content))],
  // A TOML or INI table header may carry a trailing comment, so the line is
  // read to the comment rather than to its end: `[project] # package metadata`
  // declares a package as plainly as `[project]` does.
  ["pyproject.toml", (content) => /^\s*\[(?:project|tool\.poetry)\]\s*(?:#.*)?$/m.test(content)],
  ["setup.cfg", (content) => /^\s*\[metadata\]\s*(?:[#;].*)?$/m.test(content)],
  // A test directory keeps a `CMakeLists.txt` to add its targets; only a
  // `project()` command declares a package — and only an active one, so the
  // comments go first. A bracket comment spans lines, which a line-oriented
  // read cannot see, and a directory whose only `project(` sits inside one was
  // taken for a package, dropping every acceptance file below it.
  ["CMakeLists.txt", (content) => /^\s*project\s*\(/im.test(withoutCMakeComments(content))],
]);

/**
 * CMake source with its comments blanked, line endings kept.
 *
 * A bracket comment opens `#[` followed by any number of `=` and a `[`, and
 * closes on the matching `]=…=]`; everything from `#` to the end of the line is
 * a comment otherwise. Blanked rather than removed, so a command the file really
 * runs keeps the line it is on.
 */
function withoutCMakeComments(content: string): string {
  return content
    .replace(/#\[(=*)\[[\s\S]*?\]\1\]/g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/#[^\n]*/g, (comment) => " ".repeat(comment.length));
}

function isPackageManifest(absoluteDir: string, entry: string): boolean {
  const namesPackage = CONFIGURABLE_MANIFESTS.get(entry);
  if (namesPackage) {
    try {
      return namesPackage(readFileSync(path.join(absoluteDir, entry), "utf-8"));
    } catch {
      // A manifest that cannot be read leaves the question open, and the two
      // answers are not equally safe. Read as no package, the directory becomes
      // a test root, and a source under its `api`, `e2e` or `integration`
      // subdirectory then satisfies an obligation it was never written for —
      // a silent pass. Read as a package, the path answers no layer and the
      // obligation stays reported. So an unreadable manifest counts as one.
      return true;
    }
  }
  return (
    PACKAGE_MANIFEST_NAMES.has(entry) ||
    PACKAGE_MANIFEST_EXTENSIONS.has(path.extname(entry).toLowerCase())
  );
}

/**
 * Whether a directory entry is a file, or a link to one. A fixture directory
 * that happens to be called `go.mod` is not a manifest, and taking it for one
 * would clear a genuine test root.
 */
function isFileEntry(absoluteDir: string, entry: Dirent): boolean {
  if (entry.isFile()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return statSync(path.join(absoluteDir, entry.name)).isFile();
  } catch {
    return false;
  }
}

/**
 * Whether a directory carries a package manifest, memoised per scan.
 *
 * One `readdirSync` per candidate directory — the same cost class as a stat,
 * and it answers the named manifests and the ones whose basename the project
 * chooses in one read; a manifest a suite may keep for configuration is read
 * as well. A scan asks about the same few directories over and
 * over, so the answer is cached. Synchronous because the layer question is
 * asked from a predicate the file stream calls per file, which cannot await.
 */
export function packageRootProbe(): (absoluteDir: string) => boolean {
  const seen = new Map<string, boolean>();
  return (absoluteDir: string): boolean => {
    const cached = seen.get(absoluteDir);
    if (cached !== undefined) {
      return cached;
    }
    let answer: boolean;
    try {
      answer = readdirSync(absoluteDir, { withFileTypes: true }).some(
        (entry) => isFileEntry(absoluteDir, entry) && isPackageManifest(absoluteDir, entry.name),
      );
    } catch {
      // Unreadable, or a path that is not a directory at all. Neither is a
      // package root, and neither is this function's to report.
      answer = false;
    }
    seen.set(absoluteDir, answer);
    return answer;
  };
}

/**
 * Whether a repository-relative path sits in an acceptance layer.
 *
 * The stub gate's filter. It asks the same question the scan asks and gets it
 * from the same function, so a file the scan declines cannot be a file the gate
 * reads — which is what keeps a unit test's stub from blocking a gate that owns
 * none of it.
 */
export function atddAcceptanceLayerFilter(
  root: string,
  config: QfaiConfig,
): (relativePath: string) => boolean {
  const testsRoot = resolvePath(root, config, "testsDir");
  const roots = {
    root,
    testsDirName: testsDirName(root, config),
    e2eRoot: path.join(testsRoot, "e2e"),
    apiRoot: path.join(testsRoot, "api"),
    integrationRoot: path.join(testsRoot, "integration"),
    isPackageRoot: packageRootProbe(),
  };
  // The whole of `resolveTestKind`, not the path half. A layout rooted at the
  // repository (`testsDir: "."`) puts the layer directories at the top level,
  // where no test-root segment precedes them and only containment answers.
  return (relativePath) => resolveTestKind(path.resolve(root, relativePath), roots) !== null;
}

function isWithinPath(base: string, target: string): boolean {
  const relative = path.relative(base, target);
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

/**
 * Does a workflow `run:` command reach a build?
 *
 * Twelve versions. Each of the first eleven was measured, reported clean by whoever wrote it, and then
 * broken by a corpus someone else chose. That sentence is the design brief, and round 9 wrote it out:
 *
 * > `B1`, `B2` and `A1` are the same shape: the instrument is checked against its own claims rather
 * > than against the world. Eleven versions in, the corpus's authority still comes from who chose it.
 *
 * The instructive failures, in order:
 *
 * - **v4** reported `pnpm ci:build-verify` as a build **by the script's name**, so what it measured was
 *   npm-script naming rather than behaviour.
 * - **v7** assumed every runner shares one grammar. One global "flags that take a directory" set held
 *   three flags that are **boolean** in the tools it was applied to, so `make -B build` was `none`
 *   while `make --always-make build` was `build`.
 * - **v8** kept one global rule — a spaced flag consumes its value unless it is a known boolean — with
 *   `known` hardcoded `true` for every build tool, so no tool's spaced flag ever consumed anything and
 *   `gradle --console plain build` was `none`.
 * - **v11** was measured by planting real builds in a shipped lane. **Ten of eleven shipped
 *   unnoticed**, then **eighteen of twenty** on a wider corpus, and fifteen of the eighteen were tools
 *   this file already declared. `mvn package`, `gradle assemble`, `dotnet publish`, `make`, `ninja`,
 *   `sbt compile`, `go install` and `rake` are the canonical builds of eight of thirty entries.
 *
 * Every one of those is the same defect at a different level: a rule standing in for knowledge the
 * runner has and the rule does not. So each family declares its own, and v12 is where the last three
 * families got theirs.
 *
 * 1. A **package manager** takes a script, after its own passthrough verbs, resolved in the manifest
 *    its directory flags select. Its flag set is open-ended, so a flag consumes its value **only when a
 *    later bare token exists to be the script**, together with the boolean list and the per-manager
 *    value list. v12 tried that one rule ALONE, deleting both lists, and round 10 recovered the set and
 *    measured every member of it changing a verdict — `yarn --silent workspace pkg build` went from
 *    `heuristic` to `none` because the rule ate the `workspace` verb. Three reasons, not one.
 * 2. A **build tool** takes subcommands, and its flag set is closed and declared here. It may build
 *    without the word (`builds`, `buildPrefixes`), with no subcommand at all (`bareIsBuild`), or not at
 *    all past a subcommand that ends the window (`stops`).
 * 3. A **wrapper**'s command begins at the first token that **names** a command. No flag list, so it
 *    cannot be incomplete: that is what finally saw through
 *    `xvfb-run -a -s "-screen 0 1024x768x24" pnpm build`, whose quoted multi-token flag value no
 *    list-and-count scheme survived.
 * 4. An **interpreter** re-enters its `-c` argument as a shell line. `bash -c "pnpm build"` is the
 *    commonest way to put a compound command in a `run:` step, and it was `none` for eleven versions.
 *
 * **What each version DELETED matters as much as what it added.** Writing one deletion-detecting probe
 * per grammar member, and neutralising each rule in turn, has now emptied eight sets: every tool's
 * `pass` list, `MANAGER_CONSUMING`'s flag members, `NOT_A_BUNDLER`, the wrapper `booleans` list, the
 * wrapper `values` lists and their `args` counts, `MANAGER_BOOLEAN`, `MANAGER_VALUES`, and three flags
 * shadowed by `TARGET_FLAGS`. Each was a list whose deletion changed no command's verdict. A rule no
 * probe can distinguish is not grammar, and the only way to find out is to try deleting it.
 *
 * **What no command-line scan can see**, and this file's assertion is only as strong as this list is
 * honest: a build spawned from inside a helper. `scripts/check-build-warnings.mjs`,
 * `scripts/verify-pack.mjs` and `scripts/check-publish-dry-run.mjs` each reach
 * `prepack -> npm run build -> tsup`, and reading `package.json` cannot follow a `spawnSync` inside a
 * `.mjs`. Only the first has a filename that says `build`, so only commands reaching it land on
 * `heuristic`; `node scripts/bundle.mjs` is invisible and stays that way.
 */

/**
 * The predicate's version, exported so the record's pin compares a number to a number.
 *
 * The pin used to take the largest `vN` token anywhere in this file's prose. That closed round 7's
 * literal-pin defect and left a residual round 9 named: a bump whose comment forgot to say the new
 * number would leave both sides agreeing on the old one. It then failed in the other direction the
 * moment a sentence *discussed* a future version, and the pin demanded that version of the record. This
 * is the one place to change.
 */
export const VERSION = 12;

export type BuildVerdict = "build" | "heuristic" | "none";

export interface ScriptSources {
  /**
   * Directory, repository-relative with no leading or trailing slash, to that manifest's `scripts`.
   * The repository root is the empty string.
   *
   * Keyed by directory rather than merged, and that is load-bearing: this repository's root `build` is
   * `pnpm -C packages/qfai build` while the package's is `tsup`, so one merged map makes the name
   * self-referential and resolves to nothing.
   */
  readonly manifests: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface Context {
  readonly sources: ScriptSources | undefined;
  readonly cwd: string;
  readonly seen: Set<string>;
  readonly noScripts?: boolean;
  /**
   * The head is a binary a manager launched, not a command this grammar declares.
   *
   * Its arguments are read the way a tool's are — an exact build verb counts, a split-only match is a
   * guess — because that is what they are. Without it the manager path stopped at the first bare token
   * and `npx next build` was `none`.
   */
  readonly unknownBinary?: boolean;
}

const MANAGERS = new Set([
  "pnpm",
  "npm",
  "yarn",
  "npx",
  "pnpx",
  "bunx",
  "bun",
  "node",
  // The JS script runners. Their bare tokens are script names, which is what a manager already means.
  "npm-run-all",
  "run-s",
  "run-p",
]);

/**
 * Build tools, each declaring what it takes.
 *
 * `dirs` take a directory and `values` take anything else — and **for a tool the two are
 * behaviourally identical**, because the only difference is that `dirs` moves the directory a script
 * resolves in and a tool never resolves a script. Folding every tool's `dirs` into its `values` moves
 * nothing across the whole corpus, measured. The split is kept as documentation of what a flag takes,
 * and it is load-bearing only for `MANAGER_DIRS`.
 * `optional` take a value only when the next token could be one — GNU make's `-j` is the case, and
 * `make -j build` is a real build the always-consume shape asserted away. `buildFlags` mean build by
 * themselves. `builds` are subcommands that mean build without being spelled it, `buildPrefixes` are
 * prefixes of them (`assembleRelease`), `bareIsBuild` marks a tool whose bare invocation builds a
 * default target, and `stops` are subcommands past which nothing in the line is this lane's build.
 *
 * There is no `pass` list: for a tool every bare token is a candidate subcommand, so skipping a verb
 * and declining to read it as a build are the same thing.
 */
interface ToolGrammar {
  readonly dirs: readonly string[];
  readonly values: readonly string[];
  readonly optional?: readonly string[];
  readonly buildFlags?: readonly string[];
  readonly builds?: readonly string[];
  readonly buildPrefixes?: readonly string[];
  /**
   * A bare invocation of this tool builds: `make`, `ninja`, `hugo`.
   *
   * **This requires the tool's flag partition to be complete, in both halves.** The check runs after
   * the token loop and is gated on no target having been seen, so a flag whose argument this grammar
   * does not know to consume leaves that argument sitting in target position and suppresses the
   * default — `hugo -d dist` came out `none`. And a query flag that this grammar does not know to
   * refuse leaves the default firing for a command that builds nothing — `rake -T` came out `build`.
   * Round 11 measured thirteen wrong verdicts across nine tools, in both directions, from that one
   * mechanism.
   *
   * So every `bareIsBuild` tool must declare its value flags in `values` and its query flags in
   * `never`. That is a closed-world assumption about ONE tool's documented flag set, which is
   * defensible in the way the closed-world assumption about the SET of build tools is not: a tool's
   * flags are finite and written down by its authors, while the set of build tools is neither.
   */
  readonly bareIsBuild?: boolean;
  /**
   * Every invocation builds, so there is nothing to recognise past the program's own name.
   *
   * `bareIsBuild` is not enough for a compiler: its argument is the SOURCE FILE, which the path-like
   * rule skips while recording that a target was given — so `gcc -O2 -o dist/app src/main.c` came out
   * `none` while a bare `gcc` came out `build`, which is backwards. `--version` and `--help` are
   * refused by `NEVER_FLAGS` before this is reached, which is what makes it safe.
   */
  readonly alwaysBuilds?: boolean;
  readonly stops?: readonly string[];
  /**
   * This tool's own spellings of a flag that means "do not do it".
   *
   * `NEVER_FLAGS` holds the spellings shared across tools (`--dry-run`, `--help`, `--version`), and a
   * tool with its own spelling of the same idea used to escape it: `make --dry-run build` was `none`
   * while `make -n build` and `make --just-print build` were builds. One command, three spellings, two
   * verdicts — the invariant the sh-cluster and Windows-separator repairs were both about, in the
   * false-positive direction this time. Per-tool rather than global, because `-n` means something else
   * elsewhere and a global entry would refuse real builds.
   */
  readonly never?: readonly string[];
}

const MAKE: ToolGrammar = {
  dirs: ["-C", "--directory"],
  values: ["-f", "--file", "-o", "--old-file", "-W", "--what-if"],
  optional: ["-j", "--jobs", "-l", "--load-average"],
  builds: ["all", "dist", "release", "compile", "install"],
  // make's own spellings of `--dry-run`, plus question mode, which also runs nothing.
  never: ["-n", "--just-print", "--recon", "-q", "--question"],
  bareIsBuild: true,
};

const PYTHON: ToolGrammar = {
  dirs: [],
  values: ["-c"],
  builds: ["bdist_wheel", "sdist", "build_ext"],
};

const GRADLE: ToolGrammar = {
  dirs: ["-p", "--project-dir"],
  values: [
    "--console",
    "--max-workers",
    "--build-file",
    "-b",
    "--init-script",
    "-x",
    "--exclude-task",
  ],
  // `assemble` itself is not listed: `buildPrefixes` has to hold it for `assembleRelease`, and one
  // rule covering a member twice leaves one of them unprobed.
  builds: ["jar", "war", "bootJar", "shadowJar", "installDist"],
  buildPrefixes: ["assemble", "bundle"],
};

/**
 * No `-t` / `--tag`. They appear only in `docker build` and `docker buildx build`, and the exact `build`
 * token decides those before any flag is read, so no real docker command can distinguish them. The cases
 * that pinned them were `docker -t build clean` and `docker --name build clean`, which put a subcommand
 * flag in docker's global position — commands docker rejects. `--name` stays, pinned by
 * `docker create --name build-agent alpine`, which is a command people write.
 */
const DOCKER: ToolGrammar = {
  dirs: ["-f", "--file"],
  values: ["--build-arg", "-H", "--platform", "--name", "-p", "--project-name"],
  builds: ["bake"],
  stops: ["run", "exec"],
};

/** Nothing declared: an unknown binary's arguments are a tool's, with no flags known to take a value. */
const UNKNOWN_BINARY: ToolGrammar = { dirs: [], values: [] };

/**
 * A compiler: any invocation of it builds something, so there is no subcommand to recognise.
 *
 * `--version` and `--help` are refused by `NEVER_FLAGS` before this is reached, which is what makes
 * `bareIsBuild` safe here.
 */
const COMPILER: ToolGrammar = { dirs: [], values: [], alwaysBuilds: true };

const MVN: ToolGrammar = {
  dirs: ["-f", "--file"],
  values: ["-P", "-D", "-T"],
  builds: ["package", "install", "verify", "compile", "deploy"],
};

const BAZEL: ToolGrammar = {
  dirs: ["--output_base", "--output_user_root"],
  values: ["--config"],
};

const TOOLS: Record<string, ToolGrammar> = {
  turbo: { dirs: ["--cwd"], values: ["--concurrency", "--filter"] },
  nx: { dirs: [], values: ["--projects", "--configuration"] },
  lerna: { dirs: [], values: ["--concurrency"] },
  rush: { dirs: [], values: ["--to", "--from"] },
  make: MAKE,
  // `gmake` is GNU make under its other name, which is the spelling on BSD and macOS.
  gmake: MAKE,
  cmake: {
    dirs: ["--install", "-B", "-S", "--prefix"],
    values: ["--config", "-G", "-D"],
    buildFlags: ["--build"],
    // `cmake build` configures `./build` as the SOURCE directory. cmake's build verb is `--build`,
    // which is in `buildFlags`; the bare word is a path.
    stops: ["build"],
  },
  ninja: {
    dirs: ["-C"],
    values: ["-j", "-k", "-f", "-d", "-l", "-w"],
    never: ["-n", "-t"],
    bareIsBuild: true,
  },
  bazel: BAZEL,
  // `bazelisk` is the launcher for bazel, as `gradlew` is for gradle and `mvnw` for mvn. Round 10
  // planted all three; two were declared and one was not, which is the shape the launcher aliases
  // exist to close.
  bazelisk: BAZEL,
  buck: { dirs: [], values: ["--config"] },
  just: {
    dirs: ["-d", "--working-directory"],
    values: ["--set", "--justfile", "-f", "--color"],
    never: ["--list", "-l", "--summary", "--dump", "--evaluate", "-n"],
    bareIsBuild: true,
  },
  task: {
    dirs: ["-d", "--dir"],
    values: ["-p", "--parallel", "-t", "--taskfile", "-o", "--output"],
    never: ["--list", "-l", "--list-all", "-a", "--summary", "--dry", "-n"],
    bareIsBuild: true,
  },
  waf: {
    dirs: [],
    values: ["-j", "--jobs", "-o", "--out", "-t", "--top", "-p", "--prefix"],
    bareIsBuild: true,
  },
  dune: { dirs: ["--root"], values: ["-j", "--profile"] },
  stack: { dirs: ["--work-dir"], values: ["--resolver"] },
  cargo: {
    dirs: ["--target-dir", "--manifest-path"],
    values: ["--color", "--config", "-j", "--jobs", "--features"],
    // `b` is cargo's own documented alias for `build`.
    builds: ["install", "b"],
  },
  go: { dirs: ["-C"], values: ["-o", "-tags"], builds: ["install"] },
  gradle: GRADLE,
  // `./gradlew` is the wrapper script for the same tool. One definition, so a flag added to gradle
  // cannot be forgotten here — and a member's pinning case cannot pass for one spelling and not the
  // other.
  gradlew: GRADLE,
  mvn: MVN,
  mvnw: MVN,
  dotnet: {
    dirs: ["-o", "--output"],
    values: [
      "-a",
      "--arch",
      "--os",
      "--framework",
      "-c",
      "--configuration",
      "-r",
      "--runtime",
      "-v",
      "--verbosity",
    ],
    // No `msbuild`: it is in BUNDLERS, which is checked before this list.
    builds: ["publish", "pack"],
  },
  swift: { dirs: ["--package-path"], values: ["-c", "--configuration"] },
  meson: { dirs: ["-C"], values: ["-D"], builds: ["compile"] },
  scons: {
    dirs: [],
    values: ["-j", "-f", "--file", "--sconstruct", "-Y", "--repository"],
    never: ["-n", "--no-exec", "--tree", "-H", "--help-options", "--debug"],
    bareIsBuild: true,
  },
  zig: { dirs: [], values: ["-target"] },
  /**
   * `tsc -b` EMITS. `packages/qfai/tsconfig.json` sets `outDir: dist` and `composite: true` with no
   * `noEmit`, so this repository's own `check-types` script builds — and three rounds pinned it as
   * *not* a build on the strength of the script's name, which is the defect v4 was broken for.
   * `--noEmit` is in `NEVER_FLAGS`, which is what separates the type check from the emit.
   */
  tsc: {
    dirs: [],
    // No `--target`: `TARGET_FLAGS` is checked first, so listing it here pinned nothing — the same
    // shadowing that removed it from cargo's and flutter's lists.
    values: ["-p", "--project", "-t", "--module"],
    buildFlags: ["-b", "--build", "--outDir", "--outFile", "--emitDeclarationOnly"],
    // `--showConfig` prints the resolved configuration and compiles nothing; `--listFiles` and
    // `--listFilesOnly` are the same shape. `--noEmit` is already in the global `NEVER_FLAGS`.
    never: ["--showConfig", "--listFiles", "--listFilesOnly", "--traceResolution"],
    bareIsBuild: true,
  },
  docker: DOCKER,
  podman: DOCKER,
  "docker-compose": { dirs: ["-f", "--file"], values: ["-p", "--project-name"] },
  poetry: { dirs: ["-C", "--directory"], values: ["--format"] },
  flutter: { dirs: [], values: ["--flavor", "-t"] },
  python: PYTHON,
  python3: PYTHON,
  // `py` is the Windows Python launcher, and `py -m build` is the same command as `python -m build`.
  py: PYTHON,
  sbt: { dirs: [], values: [], builds: ["compile", "package", "assembly", "stage"] },
  rake: {
    dirs: ["-C"],
    values: ["-f", "-I", "-r", "-R"],
    never: ["-T", "--tasks", "-P", "--prereqs", "-D", "--describe", "-n", "-W", "--where"],
    bareIsBuild: true,
  },
  // The JS-framework CLIs. Declared as TOOLS rather than BUNDLERS because the program name alone does
  // not mean build for any of them — `next dev` and `ng serve` are the commands people run most — so
  // the subcommand has to be read.
  // No `builds: ["build"]` on any of these. A declared tool already reads a bare `build` token as a
  // build through the generic verb rule, so the list entry could never be the reason for the verdict —
  // measured: deleting it changed nothing for all nine tools that had it. Only a verb that is NOT the
  // word `build` needs declaring.
  next: { dirs: [], values: [] },
  ng: { dirs: [], values: ["--configuration", "-c"] },
  nuxt: { dirs: [], values: [], builds: ["generate"] },
  gulp: { dirs: [], values: ["--gulpfile", "--cwd"] },
  grunt: { dirs: [], values: ["--gruntfile", "--base"] },
  // Static-site and docs generators, where a bare invocation builds the site: that is what the program
  // is for, and `hugo --minify` is the common CI line.
  hugo: {
    dirs: ["-s", "--source"],
    values: ["-d", "--destination", "-b", "--baseURL", "--config", "--cacheDir", "--theme"],
    bareIsBuild: true,
  },
  // `b` is jekyll's own documented alias for `build`, exactly as it is cargo's. The asymmetry was the
  // finding: one was declared with a comment explaining why, and the other was not.
  jekyll: { dirs: ["-s", "--source"], values: ["-d", "--destination"], builds: ["b"] },
  mkdocs: { dirs: [], values: ["-f", "--config-file"] },
  // Its own object rather than an alias of `COMPILER`: sub-members are labelled under the first key
  // that owns a shared object, so aliasing here would have relabelled `TOOLS.gcc.alwaysBuilds` as
  // `TOOLS.sphinx-build.alwaysBuilds` purely because this line sits above the compilers.
  "sphinx-build": { dirs: [], values: [], alwaysBuilds: true },
  // Language and infrastructure build tools.
  cabal: { dirs: [], values: ["--builddir"], builds: ["install"] },
  mix: { dirs: [], values: [], builds: ["compile", "release"] },
  buck2: { dirs: [], values: ["--config"] },
  helm: { dirs: [], values: ["-d", "--destination"], builds: ["package"] },
  goreleaser: { dirs: [], values: ["--config"], builds: ["release"] },
  packer: { dirs: [], values: ["-var-file"] },
  shards: { dirs: [], values: [] },
  // `tox -e build` runs the environment named `build`, and `R CMD build .` puts the verb one token in.
  // Neither needs a `builds` entry: declaring the tool is enough for the generic verb rule to read the
  // bare `build`, which is exactly the name-shaped case that rule is for.
  // No `bareIsBuild`: bare `tox` runs the envlist, which is a test run more often than a build, and
  // `tox -e build` gets its verdict from the generic verb rule reading the environment name. Round 11
  // reported bare `tox` as `none` and this records that it is intended rather than missed.
  tox: { dirs: [], values: [] },
  R: { dirs: [], values: [] },
  ant: {
    dirs: [],
    values: ["-f", "-buildfile", "-D", "-lib", "-logfile", "-propertyfile"],
    builds: ["dist", "jar", "compile"],
    bareIsBuild: true,
  },
  deno: { dirs: [], values: ["--output", "--config"], builds: ["compile"] },
  nix: { dirs: [], values: ["--out-link", "-f"] },
  buildah: { dirs: ["-f", "--file"], values: ["-t", "--tag"], builds: ["bud"] },
  earthly: { dirs: [], values: ["--build-arg"], buildPrefixes: ["+build"] },
  pants: { dirs: [], values: ["--tag"], builds: ["package"] },
  dart: { dirs: [], values: ["--output", "-o"], builds: ["compile"] },
  elm: { dirs: [], values: ["--output"], builds: ["make"] },
  gcc: COMPILER,
  "g++": COMPILER,
  clang: COMPILER,
  javac: COMPILER,
  rustc: COMPILER,
  swiftc: COMPILER,
};

/** Invoking one of these IS a build, whatever follows. */
const BUNDLERS = new Set([
  "tsup",
  "rollup",
  "esbuild",
  "webpack",
  "swc",
  // The scoped spelling is its own name, not a path: `@swc/cli` used to collapse to `cli`, which
  // named nothing, so `npx --yes @swc/cli src -d dist` was `none` — a real build. Declared whole.
  "@swc/cli",
  "parcel",
  "vite",
  "rspack",
  "rolldown",
  "unbuild",
  "tsdown",
  "babel",
  "msbuild",
  "xcodebuild",
]);

/** A package manager's own passthrough verbs, before the script name. */
/**
 * A package manager's own passthrough verbs, before the script name.
 *
 * `--` is here again. v12 removed it claiming no verdict changed; round 10 restored the one member and
 * `npm exec -- tsup --config tsup.config.ts` went from `none` to `build`, because the consume rule ate
 * the bundler name. No corpus contained a bare `--`, which is exactly why the measurement said nothing.
 */
const MANAGER_PASS = new Set(["run", "exec", "dlx", "workspaces", "foreach", "--"]);
/**
 * A bare verb that consumes the following token without it being the script.
 *
 * Only `workspace`. Four filter flags were also here once and are subsumed by the consume rule; the
 * boolean list was too, and that deletion was **wrong** — see `MANAGER_BOOLEAN`, restored after round 10
 * measured every member of it changing a verdict. No count is stated here, because a count in prose is
 * the figure this stage has got wrong in every round that wrote one.
 */
const MANAGER_CONSUMING = new Set(["workspace"]);

/**
 * Manager flags that take NO value, so the token after them can still be the script.
 *
 * **Deleted in v12 and restored here.** v12 replaced this list with one rule — a manager flag consumes
 * its value only when a later bare token exists to be the script — on the strength of a sweep showing
 * no verdict changed. Round 10 refuted that: recovering the set and testing each member, **all twenty-two
 * change a verdict**, and `yarn --silent workspace pkg build` went from `heuristic` to `none` because
 * the rule ate the `workspace` verb. Nine of ten planted builds shipped unnoticed through a manager the
 * grammar declares. That was a regression introduced by the deletion, not a missing tool.
 *
 * The sweep could not see it, and the reason is the finding worth keeping: **its report is identical
 * whether a member is dead or whether the corpus merely lacks its shape**, and every deletion this
 * stage made inferred the first from the second. A member is now only removable with a probe that
 * exercises its shape and still does not move.
 */
const MANAGER_BOOLEAN = new Set([
  "-w",
  "--workspace-root",
  "-r",
  "--recursive",
  "--silent",
  "--quiet",
  "--yes",
  "-y",
  "--frozen-lockfile",
  "--ignore-scripts",
  "--no-scripts",
  "--if-present",
  "--prod",
  "--dev",
  "--no-bail",
  "--offline",
  "--force",
  "--verbose",
  "--stream",
  "--aggregate-output",
  "--no-color",
  "--parallel",
]);

/**
 * Flags that take a value for THIS manager, checked before the shared boolean list.
 *
 * `-w` is the case: boolean for pnpm (`--workspace-root`) and a package name for npm (`--workspace`).
 * One spelling, two managers, two meanings — and no shared list can hold both.
 */
const MANAGER_VALUES: Record<string, readonly string[]> = {
  npm: ["-w", "--workspace"],
};

/** Manager flags naming the directory whose manifest a script resolves in. */
const MANAGER_DIRS = new Set(["-C", "--dir", "--cwd", "--prefix"]);
/**
 * Flags whose value IS the target: `python -m build`, `nx --target=build`.
 *
 * Checked **before** a tool's own `values`, because `-m` is in both and reading it as an ordinary value
 * consumed `build`.
 */
const TARGET_FLAGS = new Set(["-m", "--target"]);
/** With one of these, `pack`/`publish` do not fire their lifecycle hooks. */
const NO_SCRIPTS = new Set(["--ignore-scripts", "--no-scripts"]);
/** Present anywhere, the command does not build: it asks, renders or checks. */
// `-version` and `-help` in the single-dash spelling too: the java-family tools (`ant`, `javac`)
// use it, and `ant -version` read as a build because `bareIsBuild` saw no target.
const NEVER_FLAGS = new Set([
  "--help",
  "-h",
  "-help",
  "--version",
  "-version",
  "--dry-run",
  "--print",
  "--noEmit",
]);

/**
 * Wrappers, as a bare set — because the tail of a wrapper is found, not counted.
 *
 * v11 gave each wrapper a `values` list and an `args` count; both are gone, and forty members with
 * them. The rule that replaces them: **a wrapper's command begins at the first token that names a
 * command.** That is what a wrapper does, and it needs no per-flag knowledge, so it cannot be
 * incomplete the way a list can.
 */
const WRAPPERS = new Set([
  "time",
  "sudo",
  "nice",
  "ionice",
  "xvfb-run",
  "command",
  "stdbuf",
  "nohup",
  "env",
  "timeout",
  "cross-env",
  "setsid",
  "unbuffer",
  "flock",
  "taskset",
  "chrt",
  "retry",
  "script",
  "concurrently",
  "corepack",
  // `bundle exec <tool>`: a wrapper's command begins at the first token that NAMES a command, so
  // `exec` is skipped without being declared. `poetry` is not here — it is a declared tool with its own
  // `build` subcommand, and listing it as a wrapper made `poetry build` unreadable.
  "bundle",
  "xargs",
]);
/** `command -v x` reports whether `x` exists. It runs nothing. */
const EXISTENCE_PROBE = new Set(["-v", "-V"]);

/**
 * `inline` values are shell lines and are re-entered; `scripts` values are script files; `values` are
 * consumed.
 *
 * The sh family has an EMPTY `inline` list on purpose. `-c` is matched by the cluster rule in
 * `interpreterTail`, which has to exist regardless for `-lc`, `-ec` and `-euxc`; listing `-c` as well
 * left the cluster rule unprobed — deleting it changed no verdict. One rule, one probe.
 */
interface InterpreterGrammar {
  readonly values: readonly string[];
  readonly inline: readonly string[];
}

const POWERSHELL: InterpreterGrammar = {
  values: ["-ExecutionPolicy", "-WorkingDirectory", "-OutputFormat"],
  inline: ["-Command", "-c", "-EncodedCommand"],
  // There is no `scripts` list. `-File script.ps1` was handled by it and is handled without it: the
  // scan stops at the first token that is not a flag, and that token is the script.
};

const INTERPRETERS: Record<string, InterpreterGrammar> = {
  // No `-o`: the cluster walk owns single letters, and listing it here left the walk deciding the
  // same verdict twice. The long forms are not clusters, so they stay.
  bash: { values: ["--rcfile", "--init-file"], inline: [] },
  sh: { values: [], inline: [] },
  zsh: { values: ["--rcs"], inline: [] },
  pwsh: POWERSHELL,
  powershell: POWERSHELL,
};
const SH_FAMILY = new Set(["bash", "sh", "zsh"]);
/** Cluster letters that take the next token: `-eo pipefail` is `-e` plus `-o pipefail`. */
const SH_CLUSTER_VALUES = new Set(["o", "O"]);

const LIFECYCLE: Record<string, readonly string[]> = {
  pack: ["prepack"],
  publish: ["prepublishOnly", "prepack"],
};

/**
 * The lists that BUILD the regex and the split, so what is exported IS the grammar.
 *
 * Round 9 measured six of these eight extensions and two of five separators as deletable with nothing
 * noticing, because `GRAMMAR` exported neither and the sweep's reach is exactly `GRAMMAR`. A copy of a
 * list is not the list.
 */
const SCRIPT_EXTENSIONS = ["sh", "ps1", "bat", "cmd", "mjs", "cjs", "js", "ts"];
/**
 * Extensions a COMMAND may wear on Windows. `pnpm.cmd build` is `pnpm build`, and without this the
 * `.cmd` made it match `SCRIPT_FILE` first and return `none` — one command, two verdicts, decided by
 * which platform wrote the lane.
 */
const EXECUTABLE_EXTENSIONS = ["cmd", "exe", "bat", "ps1"];
const NAME_SEPARATORS = [":", "-", "_", ".", "/", "\\"];

// `\\` is in the path class because `scripts\\build.ps1` is how a Windows lane spells it, and no
// Windows-separator path could match before.
const scriptFileRe = (): RegExp =>
  new RegExp(`^[\\w.\\\\/-]*[\\w-]+\\.(?:${SCRIPT_EXTENSIONS.join("|")})$`);
/**
 * Every separator escaped by one rule rather than by a per-character ternary.
 *
 * The ternary listed `-` and `/` and nothing else, so adding `\\` to the list built
 * `[:\\-_.\\/\\]+` — an unterminated character class that threw at the first call. A list whose
 * members need escaping should not depend on someone remembering to extend the escaper.
 */
const separatorRe = (): RegExp => new RegExp(`[${NAME_SEPARATORS.map((s) => `\\${s}`).join("")}]+`);

/**
 * Predicates behind a mutable indirection, so a sweep can neutralise a rule as easily as it deletes a
 * member. `isSetting` was reducible to a constant `false` with the whole corpus green — a live rule
 * with no probe, which is the state forty-five deleted members were in.
 */
const RULES = {
  /** A bare token carrying `=` is a setting, not a subcommand: `make build_dir=out clean`. */
  isSetting: (t: string): boolean => t.includes("="),
  /** A path or label, not a verb: `bazel test //src/build:tests` is not a build. */
  isPathLike: (t: string): boolean => t.includes("/") || t.startsWith(".") || /\.\w{1,5}$/.test(t),
};

const namesABuild = (t: string): boolean =>
  t.split(separatorRe()).filter(Boolean).includes("build");
const normalise = (d: string): string =>
  d
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p !== "" && p !== ".")
    .join("/");
const strongest = (v: readonly BuildVerdict[]): BuildVerdict =>
  v.includes("build") ? "build" : v.includes("heuristic") ? "heuristic" : "none";
const unquote = (t: string): string => t.replace(/^['"]|['"]$/g, "");
/** `pnpm.cmd` -> `pnpm`, and `build.cmd` -> `build`; the caller decides which of those is a command. */
const stripExecutableExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return name;
  return EXECUTABLE_EXTENSIONS.includes(name.slice(dot + 1)) ? name.slice(0, dot) : name;
};

export function classifyBuildCommand(
  line: string,
  sources?: ScriptSources,
  cwd = "",
): BuildVerdict {
  return shell(line, { sources, cwd: normalise(cwd), seen: new Set() });
}

function shell(line: string, ctx: Context): BuildVerdict {
  const parts = line
    // `&` backgrounds a command, so it separates one as surely as `;` does, and a subshell's
    // parentheses are punctuation rather than part of the command — `(cd x && pnpm build)` left the
    // closing paren attached to `build`, which `namesABuild` then could not see.
    .replace(/[()]/g, " ")
    .split(/&&|\|\||;|&|(?<!\|)\|(?!\|)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: BuildVerdict[] = [];
  let cwd = ctx.cwd;
  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens[0] === "cd" && tokens[1] !== undefined) {
      const target = tokens[1];
      cwd = target.startsWith("/") ? normalise(target) : normalise(`${cwd}/${target}`);
      continue;
    }
    out.push(command(tokens, { ...ctx, cwd }));
  }
  return strongest(out);
}

/**
 * The command name a token carries, if any.
 *
 * `basename` is right for a PATH — `./node_modules/.bin/tsup` is tsup — and wrong for a scoped npm
 * package name, where the slash is part of the name: `@swc/cli` is not `cli`, and `@anything/tsup`
 * read as the bundler `tsup`, which is the same answer for the wrong reason. A token starting with `@`
 * keeps its whole name.
 */
function commandName(token: string): string {
  const whole = unquote(token);
  if (whole.startsWith("@")) return whole;
  // Both separators: a Windows path reaches here too, and `scripts\\build.cmd` is not a command named
  // `scripts\\build.cmd`.
  return whole.split(/[/\\]/).pop() ?? "";
}

/**
 * Does any token refuse the whole line, by naming a flag in `refusing`?
 *
 * Reads the inline `flag=value` spelling as well as the spaced one. A whole-token match could not see
 * `scons --tree=all` or `tsc --showConfig=true`, which is the one-command-two-spellings invariant the
 * per-tool `never` list was introduced for, reproduced inside its own first use.
 */
function refusedBy(tokens: readonly string[], refusing: ReadonlySet<string>): boolean {
  return tokens.some((token) => {
    if (refusing.has(token)) return true;
    const at = token.indexOf("=");
    return at > 0 && refusing.has(token.slice(0, at));
  });
}

/** Does this token name something that can start a command? */
function namesACommand(token: string): boolean {
  // Unquoted ONCE, and both halves read the same token. The regex used to be tested on the RAW token
  // while the four set lookups read the unquoted basename, so `sudo "scripts/build.sh"` was not
  // recognised as wrapping a script while `sudo "pnpm" build` was — two coordinate systems in one
  // five-line function.
  const unquoted = unquote(token);
  const bare = commandName(token);
  return (
    MANAGERS.has(bare) ||
    TOOLS[bare] !== undefined ||
    BUNDLERS.has(bare) ||
    INTERPRETERS[bare] !== undefined ||
    WRAPPERS.has(bare) ||
    scriptFileRe().test(unquoted)
  );
}

/**
 * Strip leading `VAR=value` assignments and wrappers.
 *
 * A wrapper's command begins at the first token that NAMES a command. If none of the remaining tokens
 * does, the wrapper is wrapping something this scan does not know, and the honest tail is empty.
 */
function stripPrefix(input: readonly string[]): string[] {
  let tokens = [...input];
  // Bounded by the token count: every iteration consumes at least one token or breaks. v11 used a
  // literal 8, which returned `none` for a ninth stacked assignment with nothing saying so.
  for (let guard = 0; guard <= input.length && tokens.length; guard += 1) {
    const head = tokens[0] ?? "";
    // Lowercase assignment prefixes are legal shell, and `npm_config_*` is the common Node CI case.
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(head)) {
      tokens = tokens.slice(1);
      continue;
    }
    const bare = commandName(head);
    if (!WRAPPERS.has(bare)) break;
    // Scoped to `command`, and to the position the probe occupies. It used to be tested against EVERY
    // wrapper at EVERY position, so appending ` -v` to any wrapped build returned `none` — a one-token
    // route past the guard this predicate serves. `-v` is *verbose* for time, sudo, ionice, stdbuf and
    // most of the rest, and `/usr/bin/time -v make` is a standard CI idiom.
    if (bare === "command" && EXISTENCE_PROBE.has(tokens[1] ?? "")) return [];

    // The first candidate that is not a BUNDLER, else the first candidate.
    //
    // `env -u vite pnpm test` was `build`: the scan stopped at `vite`, and a bundler answers `build`
    // from its name alone with no further reading, so a flag value that happens to name one became the
    // command. Skipping any candidate preceded by a flag was the first attempt and it was worse — it
    // lost `xvfb-run -a pnpm build` and `sudo -E make build`, where the flag is boolean and the token
    // after it IS the command. A bundler is the one head that cannot be corrected downstream, so it is
    // the one that yields to a later candidate.
    let next = -1;
    let firstBundler = -1;
    for (let i = 1; i < tokens.length; i += 1) {
      const candidate = tokens[i] ?? "";
      if (!namesACommand(candidate)) continue;
      const bare = unquote(candidate).split(/[/\\]/).pop() ?? "";
      if (BUNDLERS.has(stripExecutableExtension(bare))) {
        if (firstBundler === -1) firstBundler = i;
        continue;
      }
      next = i;
      break;
    }
    if (next === -1) next = firstBundler;
    if (next === -1) return [];
    tokens = tokens.slice(next);
  }
  return tokens;
}

/** Where an interpreter's own arguments end, and what kind of thing follows. */
type InterpreterTail =
  | { readonly kind: "shell"; readonly line: string }
  | { readonly kind: "tokens"; readonly tokens: readonly string[] };

function interpreterTail(
  tokens: readonly string[],
  grammar: InterpreterGrammar,
  head: string,
): InterpreterTail {
  const values = new Set(grammar.values);
  const inline = new Set(grammar.inline);
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    if (!token.startsWith("-")) return { kind: "tokens", tokens: tokens.slice(i) };
    if (inline.has(token)) return { kind: "shell", line: unquote(tokens.slice(i + 1).join(" ")) };
    // For the sh family the inline flag is a LETTER IN A CLUSTER, so the cluster is walked rather than
    // matched. Matching the whole token could not see `-eo pipefail -c` — which is GitHub Actions' own
    // documented default for `shell: bash` — because the cluster carries a value-taking letter, so it
    // was neither inline nor consumed and the loop broke on `pipefail`. `bash -eo pipefail -c X` and
    // `bash -e -o pipefail -c X` were the same command with two verdicts.
    // Uppercase too: `bash -O extglob` is a real option letter, and a cluster mixing cases
    // (`-eO extglob`) was not matched at all while `SH_CLUSTER_VALUES` claimed to hold `O`.
    if (SH_FAMILY.has(head) && /^-[A-Za-z]+$/.test(token)) {
      let consumed = 0;
      for (const letter of token.slice(1)) {
        if (letter === "c") {
          return { kind: "shell", line: unquote(tokens.slice(i + 1 + consumed).join(" ")) };
        }
        if (SH_CLUSTER_VALUES.has(letter)) consumed += 1;
      }
      i += consumed;
      continue;
    }
    if (values.has(token)) i += 1;
  }
  return { kind: "tokens", tokens: [] };
}

/**
 * What a command's grammar decides BEFORE any token is read.
 *
 * Two checks, not three. It shipped with a `NEVER_FLAGS` line as well, and that line was DEAD:
 * `resolveHead` refuses the global never-flags before this is reached, so nothing could observe the
 * ordering the docstring claimed between them. A dead check whose comment asserts a precedence is the
 * class this spec catalogues, so the check is gone and the claim is only about what remains.
 *
 * The ordering that IS load-bearing: a per-tool never must beat `alwaysBuilds`. Every invocation of a
 * compiler builds, so `alwaysBuilds` answers immediately — and `ant -version` read as a build until the
 * single-dash spelling was declared, which is what makes "refuse first" a requirement rather than a
 * preference.
 */
function openingVerdict(
  tokens: readonly string[],
  tool: ToolGrammar | undefined,
): BuildVerdict | undefined {
  if (refusedBy(tokens, new Set(tool?.never ?? []))) return "none";
  if (tool?.alwaysBuilds === true) return "build";
  return undefined;
}

/** A command reduced to the program it runs and that program's own arguments. */
interface Head {
  readonly verdict?: BuildVerdict;
  readonly tokens?: readonly string[];
  readonly verb?: string;
}

/**
 * Everything before the token loop: prefix stripping, the `node --run` shortcut, the interpreter
 * hand-off and the script-file case.
 *
 * Extracted because `command()` was 211 lines and that length had a measured consequence: `bareIsBuild`
 * is decided after the loop and hugo's grammar is declared 650 lines earlier, so a comment claiming the
 * first "decides before any flag can matter" was written, reviewed and believed by readers who could not
 * see both ends. Round 11 `B4`.
 */
function resolveHead(input: readonly string[], ctx: Context): Head {
  let tokens = stripPrefix(input);
  if (!tokens.length) return { verdict: "none" };
  if (refusedBy(tokens, NEVER_FLAGS)) return { verdict: "none" };

  // Unquoted once, here, because `namesACommand` unquotes and this did not — so `stripPrefix` could
  // choose a tail beginning at a token this stage then failed to recognise. `sudo "pnpm" build` was
  // `none`, a one-character evasion, and `concurrently` / `script` are only ever written with quoted
  // commands because that is how they take a multi-word one.
  const head =
    unquote(tokens[0] ?? "")
      .split("/")
      .pop() ?? "";
  // Gated on MEMBERSHIP, not on the literal name. `node --run` is node acting as a package
  // manager, so the shortcut belongs to node's entry in MANAGERS — and while it was a bare
  // string check, deleting `node` from that set changed no verdict and the member was unpinnable.
  if (head === "node" && MANAGERS.has(head)) {
    if (tokens[1] === "--run") return { verdict: script(tokens[2] ?? "", ctx) };
    tokens = tokens.slice(1);
  } else {
    // The extension is stripped here too: `bash.exe -c "pnpm build"` and `pwsh.exe -Command ...` were
    // `none`, because the lookup ran before `stripExecutableExtension`.
    const interpreter = INTERPRETERS[stripExecutableExtension(head)];
    if (interpreter !== undefined) {
      const tail = interpreterTail(tokens, interpreter, head);
      if (tail.kind === "shell") return { verdict: shell(tail.line, ctx) };
      tokens = [...tail.tokens];
    }
  }
  if (!tokens.length) return { verdict: "none" };

  const first = unquote(tokens[0] ?? "");
  // The executable extension is stripped BEFORE the script-file test, because `pnpm.cmd` is a manager
  // and `build.cmd` is a script, and only the head's own name can tell them apart.
  // `commandName`, not a bare basename: a scoped package name is not a path, and `@swc/cli`
  // collapsed to `cli` here as well as in `namesACommand` — two sites, one rule.
  const stripped = stripExecutableExtension(commandName(first));
  const known = MANAGERS.has(stripped) || TOOLS[stripped] !== undefined || BUNDLERS.has(stripped);
  if (!known && scriptFileRe().test(first)) {
    return { verdict: namesABuild(first.split("/").pop() ?? "") ? "heuristic" : "none" };
  }
  return { tokens, verb: stripped };
}

/**
 * What one flag token does: end the line as a build, move the manifest lookup, and/or consume tokens.
 *
 * **`consume` is the field with a consequence far from here.** A flag whose argument this does not
 * consume leaves that argument sitting in target position, which sets `sawBare` in `command()` and
 * suppresses the `bareIsBuild` decision at its end. Round 11 measured thirteen wrong verdicts across nine
 * tools from that one relationship — and the reason a comment claiming the opposite could be written,
 * reviewed and believed is that the two ends were 130 lines apart inside a 211-line function.
 *
 * The three effects are separate on purpose. A `dirs` flag consumes AND moves the lookup; a `values` flag
 * consumes and does not; an inline `flag=value` moves the lookup and consumes NOTHING, because its value
 * is inside the same token. A first extraction collapsed those and moved 143 member cases.
 *
 * **A flag has three MORE effects, and this type carries none of them.** Saying "the three effects are
 * separate" was true and incomplete, and the incompleteness is where a surviving bug was found:
 *
 *   - refuse the whole line — `NEVER_FLAGS` in `resolveHead`, `tool.never` in `openingVerdict`;
 *   - suppress lifecycle hooks — `NO_SCRIPTS`, a pre-pass over the whole token list. This was the one
 *     flag effect still matching whole tokens, so `npm publish --ignore-scripts=true` disagreed with
 *     `npm publish --ignore-scripts`. It reads the inline spelling now.
 *   - pass through without consuming — `MANAGER_PASS`, checked before the dash branch runs at all.
 */
interface FlagAction {
  readonly build?: boolean;
  readonly cwd?: string;
  readonly consume: number;
}

function readFlag(
  token: string,
  tokens: readonly string[],
  i: number,
  g: {
    readonly dirs: ReadonlySet<string>;
    readonly values: ReadonlySet<string>;
    readonly optional: ReadonlySet<string>;
    readonly buildFlags: ReadonlySet<string>;
    readonly isManager: boolean;
    readonly verb: string;
  },
): FlagAction {
  const { dirs, values, optional, buildFlags, isManager, verb } = g;
  const next = tokens[i + 1];

  const inline = /^(--?[\w.-]+)=(.*)$/.exec(token);
  if (inline) {
    const [, flag = "", value = ""] = inline;
    // A build flag means build whichever way it is spelled. Every other branch here is exhaustive over
    // the flag's meaning and this one skipped `buildFlags` entirely, so `cmake --build=.` was `none`
    // while `cmake --build .` was `build`.
    if (buildFlags.has(flag)) return { build: true, consume: 0 };
    // No `consume`: the value is in this token.
    if (dirs.has(flag)) return { cwd: normalise(value), consume: 0 };
    if (TARGET_FLAGS.has(flag) && !RULES.isPathLike(value) && namesABuild(value)) {
      return { build: true, consume: 0 };
    }
    return { consume: 0 };
  }

  if (TARGET_FLAGS.has(token)) {
    if (next !== undefined && !next.startsWith("-") && namesABuild(next)) {
      return { build: true, consume: 0 };
    }
    return { consume: next === undefined ? 0 : 1 };
  }

  if (optional.has(token)) {
    // An optional-argument flag consumes only what could be its argument. `make -j build` is a real
    // build; `make -j 4 build` is the same build with a job count.
    return { consume: next !== undefined && /^\d+$/.test(next) ? 1 : 0 };
  }

  if (dirs.has(token) || values.has(token)) {
    if (next === undefined || next.startsWith("-")) return { consume: 0 };
    // Both consume; only a `dirs` flag moves the lookup.
    return dirs.has(token) ? { cwd: normalise(next), consume: 1 } : { consume: 1 };
  }

  if (buildFlags.has(token)) return { build: true, consume: 0 };

  // Three reasons not to consume, and each has a case that fails without it:
  //
  //   1. the flag is known to take no value (`--silent`), or takes one for THIS manager (`npm -w`);
  //   2. the next token NAMES a command — `npx --yes esbuild src/index.ts --bundle` had the bundler
  //      eaten, because a later bare token made the flag look value-taking;
  //   3. nothing further could be the script, so consuming would leave the line empty
  //      (`pnpm --no-frozen-lockfile build`, where the flag is in no list anyone wrote).
  //
  // v12 had only (3) and called it a replacement for the boolean list. Round 10 measured all
  // twenty-two members changing a verdict without it.
  if (isManager) {
    const managerValues = new Set(MANAGER_VALUES[verb] ?? []);
    const laterBare = tokens.slice(i + 2).some((candidate) => !candidate.startsWith("-"));
    const consumes =
      managerValues.has(token) ||
      (!MANAGER_BOOLEAN.has(token) &&
        next !== undefined &&
        !next.startsWith("-") &&
        !namesACommand(next) &&
        laterBare);
    if (consumes && next !== undefined) return { consume: 1 };
  }
  return { consume: 0 };
}

function command(input: readonly string[], ctx: Context): BuildVerdict {
  const head = resolveHead(input, ctx);
  if (head.verdict !== undefined) return head.verdict;
  const tokens = head.tokens ?? [];
  const verb = head.verb ?? "";

  if (BUNDLERS.has(verb)) return "build";
  const tool = ctx.unknownBinary === true ? UNKNOWN_BINARY : TOOLS[verb];
  const isManager = ctx.unknownBinary !== true && MANAGERS.has(verb);
  if (tool === undefined && !isManager) return "none";

  const pass = isManager ? MANAGER_PASS : new Set<string>();
  const dirs = isManager ? MANAGER_DIRS : new Set(tool?.dirs ?? []);
  const values = isManager ? new Set<string>() : new Set(tool?.values ?? []);
  const optional = new Set(tool?.optional ?? []);
  const buildFlags = new Set(tool?.buildFlags ?? []);
  const builds = new Set(tool?.builds ?? []);
  const stops = new Set(tool?.stops ?? []);
  const buildPrefixes = tool?.buildPrefixes ?? [];
  const opening = openingVerdict(tokens, tool);
  if (opening !== undefined) return opening;
  // `refusedBy`, not a whole-token match. This was the last flag effect in the file still reading whole
  // tokens, so `npm publish --ignore-scripts` skipped the lifecycle hooks and
  // `npm publish --ignore-scripts=true` did not — npm accepts both spellings identically, so one command
  // had two verdicts. The same invariant `refusedBy` was introduced for, surviving in the one place that
  // did not use it.
  const noScripts = refusedBy(tokens, NO_SCRIPTS);
  let cwd = ctx.cwd;
  let sawBare = false;
  let guessed = false;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) break;
    if (pass.has(token)) continue;
    if (isManager && MANAGER_CONSUMING.has(token)) {
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      const action = readFlag(token, tokens, i, {
        dirs,
        values,
        optional,
        buildFlags,
        isManager,
        verb,
      });
      if (action.build === true) return "build";
      if (action.cwd !== undefined) cwd = action.cwd;
      i += action.consume;
      continue;
    }

    const whole = unquote(token);
    // The command name is for LOOKING UP a command — `./node_modules/.bin/tsup` is tsup, and
    // `@swc/cli` is `@swc/cli`. It is not for reading a build VERB out of a path: `docker inspect
    // ./build` has basename `build` and is not a build. Two different questions, two different tokens.
    const bare = commandName(token);
    if (BUNDLERS.has(bare)) return "build";
    // Every build-verb rule below belongs to the TOOL path. For a MANAGER the bare token is a
    // SCRIPT NAME, and a script named `build` is only a build if its body reaches one — which is
    // what `script()` resolves. Reading it here returned `build` for `pnpm run build` with no
    // manifest at all, defeating the whole three-verdict design.
    if (tool !== undefined) {
      // A gradle task may be project-qualified — `:app:build`, `:core:jar` — so the build verb is
      // the LAST segment, not the whole token. Matched on both, since `docker buildx bake` has none.
      const verbTail = whole.includes(":") ? (whole.split(":").pop() ?? whole) : whole;
      if (builds.has(whole) || builds.has(verbTail)) return "build";
      if ([whole, verbTail].some((v) => buildPrefixes.some((p) => v.startsWith(p)))) return "build";
      // A declared stop beats the generic verb guess below, which is the whole point of declaring one.
      // It used to be checked AFTER, so a tool could not declare that the word `build` is not a build
      // for it — and `cmake build` is exactly that: it CONFIGURES `./build` as the source directory,
      // the inverse of the `cmake --install build` case this corpus already holds. Reading it as a
      // build made the test punish a lane that legitimately configures, which is the shape this spec
      // rejects in writing. Only docker declared stops (`run`, `exec`), neither of which is `build`,
      // so nothing else moves.
      // Both spellings, matching the generic rule one line below, which reads `verbTail` for exactly
      // this reason. No command distinguishes them today — there is no colon-qualified `cmake build` or
      // `docker run` — so this is a consistency repair rather than a demonstrated miss, and it stops
      // being one the first time a `stops` entry is declared for gradle or another colon-qualifying tool.
      if (stops.has(whole) || stops.has(verbTail)) return "none";
      if (whole === "build" || verbTail === "build") return "build";
    }
    // `isPathLike` belongs to the TOOL path only: a MANAGER's first bare token is a script NAME, and
    // `build.prod` is a script people write. Reading it as a path lost 142 generated lines, one shape.
    //
    // A skipped token still COUNTS as a target having been given, which `bareIsBuild` reads below.
    // `make ./build/report.txt` names a file to make; it is not make's default build.
    if (tool !== undefined && (RULES.isPathLike(token) || RULES.isSetting(token))) {
      sawBare = true;
      continue;
    }
    if (RULES.isSetting(token)) continue;
    if (MANAGERS.has(bare) || TOOLS[bare] !== undefined) {
      return command(tokens.slice(i), { ...ctx, cwd });
    }

    if (tool !== undefined) {
      sawBare = true;
      // A split-only match is a guess, not an analysis: `make clean-build-cache` is the same evidence
      // as `npm run clean-build-cache`, which the manager side reports as `heuristic`. `BuildVerdict`
      // has three values precisely to keep those apart.
      if (namesABuild(whole)) guessed = true;
      continue;
    }

    // A manager's first bare token is the SCRIPT — and if it resolves, that is the whole answer.
    const resolved = script(whole, { ...ctx, cwd, noScripts });
    if (resolved !== "none") return resolved;

    // It did not resolve, so the token is a BINARY the manager is launching and the rest of the line is
    // that binary's own argument list. Reading it as a tool's is what `npx next build` needs — the token
    // loop used to return here and never look at the word after it, so plausibly the commonest build
    // command in the ecosystem was `none`. Sixteen of round 10's forty-four missed builds are this
    // shape: `pnpm exec ng build`, `npx nuxt build`, `npx astro build`, `npx gatsby build`.
    //
    // `UNKNOWN_BINARY` gives it a tool's grammar with nothing declared, so only an exact build verb or a
    // split-only guess can fire, and a path-like or setting token is skipped as it would be for a tool.
    return command([whole, ...tokens.slice(i + 1)], {
      ...ctx,
      cwd,
      noScripts,
      unknownBinary: true,
    });
  }

  if (guessed) return "heuristic";
  if (tool?.bareIsBuild === true && !sawBare) return "build";
  return "none";
}

function script(target: string, ctx: Context): BuildVerdict {
  if (!target) return "none";
  if (ctx.sources === undefined) return namesABuild(target) ? "heuristic" : "none";
  const key = `${ctx.cwd}::${target}`;
  if (ctx.seen.has(key)) return "none";
  const seen = new Set(ctx.seen);
  seen.add(key);

  const scripts = ctx.sources.manifests[ctx.cwd] ?? {};
  const bodies: string[] = [];
  if (ctx.noScripts !== true) {
    for (const hook of LIFECYCLE[target] ?? []) {
      const hookBody = scripts[hook];
      if (typeof hookBody === "string") bodies.push(hookBody);
    }
  }
  const own = scripts[target];
  if (typeof own === "string") bodies.push(own);
  if (!bodies.length) return namesABuild(target) ? "heuristic" : "none";
  return strongest(bodies.map((b) => shell(b, { ...ctx, seen, noScripts: false })));
}

/** Convenience: does this line reach a build, counting a labelled guess as one? */
export function reachesBuild(line: string, sources?: ScriptSources, cwd = ""): boolean {
  return classifyBuildCommand(line, sources, cwd) !== "none";
}

/**
 * Every set and rule the grammar is built from, exported so a corpus can be checked for **naming each
 * member** — and so a sweep can delete each one and require a case to notice.
 *
 * `scriptExtensions`, `nameSeparators` and `rules` are here because they were not, and round 9 measured
 * what that cost: six extensions, two separators and the whole of `isSetting` deletable with the entire
 * corpus green. The sweep's reach is exactly this object, so anything that decides a verdict and is not
 * here is unpinned by construction.
 */
export const GRAMMAR = {
  managers: MANAGERS,
  tools: TOOLS,
  bundlers: BUNDLERS,
  managerPass: MANAGER_PASS,
  managerBoolean: MANAGER_BOOLEAN,
  managerValues: MANAGER_VALUES,
  managerConsuming: MANAGER_CONSUMING,
  managerDirs: MANAGER_DIRS,
  targetFlags: TARGET_FLAGS,
  noScripts: NO_SCRIPTS,
  neverFlags: NEVER_FLAGS,
  wrappers: WRAPPERS,
  existenceProbe: EXISTENCE_PROBE,
  interpreters: INTERPRETERS,
  // Exported because they decide verdicts. `SH_FAMILY` gates the whole `-c` cluster path and was
  // outside this object until round 10 found it there — at a set introduced by the commit that
  // closed the same finding for three others. `UNKNOWN_BINARY` declares nothing, so it
  // contributes no members; it is here because a declaration this file makes and this object
  // cannot reach is unpinned by construction, and that is now a test rather than a habit.
  shFamily: SH_FAMILY,
  shClusterValues: SH_CLUSTER_VALUES,
  unknownBinary: UNKNOWN_BINARY,
  lifecycle: LIFECYCLE,
  scriptExtensions: SCRIPT_EXTENSIONS,
  executableExtensions: EXECUTABLE_EXTENSIONS,
  nameSeparators: NAME_SEPARATORS,
  rules: RULES,
} as const;

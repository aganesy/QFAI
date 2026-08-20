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
 *    later bare token exists to be the script** — which is what replaced a nineteen-member boolean list
 *    and fixed `pnpm --no-frozen-lockfile build` along with every flag nobody has met yet.
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
 * `dirs` take a directory (and move the manifest a script resolves in); `values` take anything else;
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
  readonly bareIsBuild?: boolean;
  readonly stops?: readonly string[];
}

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

const DOCKER: ToolGrammar = {
  dirs: ["-f", "--file"],
  values: ["-t", "--tag", "--build-arg", "-H", "--platform", "--name", "-p", "--project-name"],
  builds: ["bake"],
  stops: ["run", "exec"],
};

const TOOLS: Record<string, ToolGrammar> = {
  turbo: { dirs: ["--cwd"], values: ["--concurrency", "--filter"] },
  nx: { dirs: [], values: ["--projects", "--configuration"] },
  lerna: { dirs: [], values: ["--concurrency"] },
  rush: { dirs: [], values: ["--to", "--from"] },
  make: {
    dirs: ["-C", "--directory"],
    values: ["-f", "--file", "-o", "--old-file", "-W", "--what-if"],
    optional: ["-j", "--jobs", "-l", "--load-average"],
    builds: ["all"],
    bareIsBuild: true,
  },
  cmake: {
    dirs: ["--install", "-B", "-S", "--prefix"],
    values: ["--config", "-G", "-D"],
    buildFlags: ["--build"],
  },
  ninja: { dirs: ["-C"], values: ["-j", "-k", "-f"], bareIsBuild: true },
  bazel: { dirs: ["--output_base", "--output_user_root"], values: ["--config"] },
  buck: { dirs: [], values: ["--config"] },
  just: { dirs: ["-d", "--working-directory"], values: ["--set"], bareIsBuild: true },
  task: { dirs: ["-d", "--dir"], values: ["-p", "--parallel"], bareIsBuild: true },
  waf: { dirs: [], values: ["-j", "--jobs"], bareIsBuild: true },
  dune: { dirs: ["--root"], values: ["-j", "--profile"] },
  stack: { dirs: ["--work-dir"], values: ["--resolver"] },
  cargo: {
    dirs: ["--target-dir", "--manifest-path"],
    values: ["--color", "--config", "-j", "--jobs", "--features"],
    builds: ["install"],
  },
  go: { dirs: ["-C"], values: ["-o", "-tags"], builds: ["install"] },
  gradle: GRADLE,
  // `./gradlew` is the wrapper script for the same tool. One definition, so a flag added to gradle
  // cannot be forgotten here — and a member's pinning case cannot pass for one spelling and not the
  // other.
  gradlew: GRADLE,
  mvn: {
    dirs: ["-f", "--file"],
    values: ["-P", "-D", "-T"],
    builds: ["package", "install", "verify", "compile", "deploy"],
  },
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
  scons: { dirs: [], values: ["-j"], bareIsBuild: true },
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
    bareIsBuild: true,
  },
  docker: DOCKER,
  podman: DOCKER,
  "docker-compose": { dirs: ["-f", "--file"], values: ["-p", "--project-name"] },
  poetry: { dirs: ["-C", "--directory"], values: ["--format"] },
  flutter: { dirs: [], values: ["--flavor", "-t"] },
  python: { dirs: [], values: ["-c"], builds: ["bdist_wheel", "sdist", "build_ext"] },
  python3: { dirs: [], values: ["-c"], builds: ["bdist_wheel", "sdist", "build_ext"] },
  sbt: { dirs: [], values: [], builds: ["compile", "package", "assembly", "stage"] },
  rake: { dirs: ["-C"], values: ["-f"], bareIsBuild: true },
};

/** Invoking one of these IS a build, whatever follows. */
const BUNDLERS = new Set([
  "tsup",
  "rollup",
  "esbuild",
  "webpack",
  "swc",
  "parcel",
  "vite",
  "rspack",
  "rolldown",
  "msbuild",
  "xcodebuild",
]);

/** A package manager's own passthrough verbs, before the script name. */
// No `--`: the rule that a manager flag consumes only when a later bare token exists already
// leaves the script readable, so listing it changed no verdict.
const MANAGER_PASS = new Set(["run", "exec", "dlx", "workspaces", "foreach"]);
/**
 * A bare verb that consumes the following token without it being the script.
 *
 * Only `workspace`. Everything else that was here — four filter flags, then a nineteen-member boolean
 * list — is subsumed by the rule that a manager flag consumes its value only when a later bare token
 * exists, and each was measured to change no verdict.
 */
const MANAGER_CONSUMING = new Set(["workspace"]);
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
const NEVER_FLAGS = new Set(["--help", "-h", "--version", "--dry-run", "--print", "--noEmit"]);

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
  bash: { values: ["-o", "--rcfile", "--init-file"], inline: [] },
  sh: { values: ["-o"], inline: [] },
  zsh: { values: ["-o", "--rcs"], inline: [] },
  pwsh: POWERSHELL,
  powershell: POWERSHELL,
};
const SH_FAMILY = new Set(["bash", "sh", "zsh"]);

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
const NAME_SEPARATORS = [":", "-", "_", ".", "/"];

const scriptFileRe = (): RegExp =>
  new RegExp(`^[\\w./-]*[\\w-]+\\.(?:${SCRIPT_EXTENSIONS.join("|")})$`);
const separatorRe = (): RegExp =>
  new RegExp(
    `[${NAME_SEPARATORS.map((s) => (s === "-" ? "\\-" : s === "/" ? "\\/" : s)).join("")}]+`,
  );

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

export function classifyBuildCommand(
  line: string,
  sources?: ScriptSources,
  cwd = "",
): BuildVerdict {
  return shell(line, { sources, cwd: normalise(cwd), seen: new Set() });
}

function shell(line: string, ctx: Context): BuildVerdict {
  const parts = line
    .split(/&&|\|\||;|(?<!\|)\|(?!\|)/)
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

/** Does this token name something that can start a command? */
function namesACommand(token: string): boolean {
  const bare = unquote(token).split("/").pop() ?? "";
  return (
    MANAGERS.has(bare) ||
    TOOLS[bare] !== undefined ||
    BUNDLERS.has(bare) ||
    INTERPRETERS[bare] !== undefined ||
    WRAPPERS.has(bare) ||
    scriptFileRe().test(token)
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
    const bare = head.split("/").pop() ?? "";
    if (!WRAPPERS.has(bare)) break;
    if (tokens.slice(1).some((token) => EXISTENCE_PROBE.has(token))) return [];

    let next = -1;
    for (let i = 1; i < tokens.length; i += 1) {
      if (namesACommand(tokens[i] ?? "")) {
        next = i;
        break;
      }
    }
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
    // `-lc`, `-ec`, `-euxc`: for the sh family the inline flag is a letter in a cluster, not a token.
    if (inline.has(token) || (SH_FAMILY.has(head) && /^-[a-z]*c[a-z]*$/.test(token))) {
      return { kind: "shell", line: unquote(tokens.slice(i + 1).join(" ")) };
    }
    if (values.has(token)) i += 1;
  }
  return { kind: "tokens", tokens: [] };
}

function command(input: readonly string[], ctx: Context): BuildVerdict {
  let tokens = stripPrefix(input);
  if (!tokens.length) return "none";
  if (tokens.some((t) => NEVER_FLAGS.has(t))) return "none";

  const head = (tokens[0] ?? "").split("/").pop() ?? "";
  if (head === "node") {
    if (tokens[1] === "--run") return script(tokens[2] ?? "", ctx);
    tokens = tokens.slice(1);
  } else {
    const interpreter = INTERPRETERS[head];
    if (interpreter !== undefined) {
      const tail = interpreterTail(tokens, interpreter, head);
      if (tail.kind === "shell") return shell(tail.line, ctx);
      tokens = [...tail.tokens];
    }
  }
  if (!tokens.length) return "none";

  const first = tokens[0] ?? "";
  if (scriptFileRe().test(first)) {
    return namesABuild(first.split("/").pop() ?? "") ? "heuristic" : "none";
  }

  const verb = first.split("/").pop() ?? "";
  if (BUNDLERS.has(verb)) return "build";
  const tool = TOOLS[verb];
  const isManager = MANAGERS.has(verb);
  if (tool === undefined && !isManager) return "none";

  const pass = isManager ? MANAGER_PASS : new Set<string>();
  const dirs = isManager ? MANAGER_DIRS : new Set(tool?.dirs ?? []);
  const values = isManager ? new Set<string>() : new Set(tool?.values ?? []);
  const optional = new Set(tool?.optional ?? []);
  const buildFlags = new Set(tool?.buildFlags ?? []);
  const builds = new Set(tool?.builds ?? []);
  const stops = new Set(tool?.stops ?? []);
  const buildPrefixes = tool?.buildPrefixes ?? [];
  const noScripts = tokens.some((t) => NO_SCRIPTS.has(t));
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
      const inline = /^(--?[\w.-]+)=(.*)$/.exec(token);
      if (inline) {
        const [, flag = "", value = ""] = inline;
        if (dirs.has(flag)) cwd = normalise(value);
        else if (TARGET_FLAGS.has(flag) && !RULES.isPathLike(value) && namesABuild(value)) {
          return "build";
        }
        continue;
      }
      if (TARGET_FLAGS.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-") && namesABuild(value)) return "build";
        if (value !== undefined) i += 1;
        continue;
      }
      if (optional.has(token)) {
        // An optional-argument flag consumes only what could be its argument. `make -j build` is a
        // real build; `make -j 4 build` is the same build with a job count.
        const value = tokens[i + 1];
        if (value !== undefined && /^\d+$/.test(value)) i += 1;
        continue;
      }
      if (dirs.has(token) || values.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-")) {
          if (dirs.has(token)) cwd = normalise(value);
          i += 1;
        }
        continue;
      }
      if (buildFlags.has(token)) return "build";
      // For a MANAGER, consume only when a later bare token exists to be the script. That one rule
      // replaced a nineteen-member boolean list: `pnpm --no-frozen-lockfile build` keeps its script,
      // and `pnpm --reporter build-log install` still loses the reporter name.
      if (isManager) {
        const value = tokens[i + 1];
        const laterBare = tokens.slice(i + 2).some((t) => !t.startsWith("-"));
        if (value !== undefined && !value.startsWith("-") && laterBare) i += 1;
      }
      continue;
    }

    const whole = unquote(token);
    // The basename is for LOOKING UP a command — `./node_modules/.bin/tsup` is tsup. It is not for
    // reading a build VERB out of a path: `docker inspect ./build` has basename `build` and is not a
    // build. Two different questions, two different tokens.
    const bare = whole.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    // Every build-verb rule below belongs to the TOOL path. For a MANAGER the bare token is a
    // SCRIPT NAME, and a script named `build` is only a build if its body reaches one — which is
    // what `script()` resolves. Reading it here returned `build` for `pnpm run build` with no
    // manifest at all, defeating the whole three-verdict design.
    if (tool !== undefined) {
      if (builds.has(whole)) return "build";
      if (buildPrefixes.some((prefix) => whole.startsWith(prefix))) return "build";
      if (whole === "build") return "build";
      if (stops.has(whole)) return "none";
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
    return script(whole, { ...ctx, cwd, noScripts });
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
  managerConsuming: MANAGER_CONSUMING,
  managerDirs: MANAGER_DIRS,
  targetFlags: TARGET_FLAGS,
  noScripts: NO_SCRIPTS,
  neverFlags: NEVER_FLAGS,
  wrappers: WRAPPERS,
  existenceProbe: EXISTENCE_PROBE,
  interpreters: INTERPRETERS,
  lifecycle: LIFECYCLE,
  scriptExtensions: SCRIPT_EXTENSIONS,
  nameSeparators: NAME_SEPARATORS,
  rules: RULES,
} as const;

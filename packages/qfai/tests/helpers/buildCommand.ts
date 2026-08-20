/**
 * Does a workflow `run:` command reach a build?
 *
 * Ten versions. Each of the first nine was measured, reported clean by the party that wrote it, and
 * then broken by a corpus someone else chose. The three most instructive:
 *
 * - **v4** reported `pnpm ci:build-verify` as a build **by the script's name**, so what it measured was
 *   npm-script naming rather than behaviour.
 * - **v7** assumed every runner shares one grammar. A global set of "flags that take a directory" held
 *   three flags that are **boolean** in the tools it was applied to — `-B` is `--always-make` in make,
 *   `-S` is `--no-keep-going` there and `--full-stacktrace` in gradle — so `make -B build` was `none`
 *   while `make --always-make build` was `build`. And `run` was a global passthrough, so
 *   `docker run --name build-agent alpine` was a **build**: the real subcommand was skipped and a
 *   container name read as a target. Fifteen defects over fifty-nine probes.
 * - **v8** gave each family its own grammar but kept one global rule — a spaced flag consumes its value
 *   unless it is a known boolean, with `known` hardcoded `true` for every build tool. So no tool's
 *   spaced flag ever consumed anything, and its value landed in the subcommand position:
 *   `gradle --console plain build` was `none`. Twenty-five of sixty-six probes disagreed.
 *
 * The thing v6, v7 and v8 each approximated with a global rule is per-tool knowledge of **which flags
 * take a value**, so v9 has each tool declare it. `dirs` was always a special case of that — a value
 * flag whose value happens to be a directory. Three further rules came out of v8's false positives:
 *
 * - a FLAG never names a build, except a per-tool allowlist (`cmake --build`). Without that,
 *   `gradle --build-cache test` and `gradle --build-file other.gradle clean` were both builds.
 * - a bare token carrying `=` is a setting, not a subcommand: `cargo --config build.jobs=2 test`.
 * - for a tool, EVERY bare token is a candidate subcommand. `make -j 4 build` has two.
 *
 * That last rule is what makes v10 **smaller** than v9. Writing one deletion-detecting probe per
 * grammar member (`../unit/buildCommand.test.ts`) forced the question "what command changes verdict if
 * this member goes?" for all 207 of them, and for forty-five the answer was *none*:
 *
 * - every tool's `pass` list, because a bare verb a tool does not read as a build is already skipped.
 *   Six members over five tools, none observable;
 * - `MANAGER_CONSUMING`'s four flag members, subsumed by the manager default of consuming any flag not
 *   known to be boolean. `workspace` stays: it is a bare verb, and without it the token after it is
 *   read as the script name;
 * - `NOT_A_BUNDLER`, which short-circuited the whole command to `none`. The one command whose verdict
 *   it changed at all — `make tsc build` — it got **wrong**, since make would run the `build` target;
 * - `--target` in cargo's and flutter's `values` and `-m` in python's, all shadowed by `TARGET_FLAGS`
 *   being checked first;
 * - `--task` in `TARGET_FLAGS`, which names no attested flag of any tool here and could only invent a
 *   build (`--task=build-agent` splits to include "build").
 *
 * With those gone, all 208 remaining members are pinned: deleting any one reddens the corpus.
 *
 * Two rules survive from v8, both measured in both directions:
 *
 * 1. A **package manager** takes a SCRIPT, after its own passthrough verbs, resolved in the manifest
 *    its directory flags select. Its flag set is open-ended, so the safe default is to consume.
 * 2. A **build tool** takes SUBCOMMANDS, and its flag set is closed and declared here, so the safe
 *    default is to consume nothing.
 *
 * **What no command-line scan can see**, because this repository has three instances: a build spawned
 * from inside a helper. `scripts/check-build-warnings.mjs`, `scripts/verify-pack.mjs` and
 * `scripts/check-publish-dry-run.mjs` each reach `prepack -> npm run build -> tsup`, and reading
 * `package.json` cannot follow a `spawnSync` inside a `.mjs`. Only the first has a filename that says
 * `build`, so only commands reaching it land on `heuristic`.
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

const MANAGERS = new Set(["pnpm", "npm", "yarn", "npx", "pnpx", "bunx", "bun", "node"]);

/**
 * Build tools, each declaring which of its flags take a value.
 *
 * `dirs` take a directory (and move the manifest a script resolves in), `values` take anything else,
 * and `buildFlags` are flags that themselves mean "build". A flag in none of the three takes no value,
 * so the token after it can still be a subcommand — which is what `make -B build` needs, and the
 * opposite of what `gradle --console plain build` needs.
 *
 * There is no `pass` list: for a tool every bare token is a candidate subcommand, so skipping a verb
 * and declining to read it as a build are the same thing.
 */
interface ToolGrammar {
  readonly dirs: readonly string[];
  readonly values: readonly string[];
  readonly buildFlags: readonly string[];
}

const TOOLS: Record<string, ToolGrammar> = {
  turbo: { dirs: ["--cwd"], values: ["--concurrency", "--filter"], buildFlags: [] },
  nx: { dirs: [], values: ["--projects", "--configuration"], buildFlags: [] },
  lerna: { dirs: [], values: ["--concurrency"], buildFlags: [] },
  rush: { dirs: [], values: ["--to", "--from"], buildFlags: [] },
  make: {
    dirs: ["-C", "--directory"],
    values: ["-j", "-l", "-f", "--file", "--jobs"],
    buildFlags: [],
  },
  cmake: {
    dirs: ["--install", "-B", "-S", "--prefix"],
    values: ["--config", "-G", "-D"],
    buildFlags: ["--build"],
  },
  ninja: { dirs: ["-C"], values: ["-j", "-k", "-f"], buildFlags: [] },
  bazel: { dirs: ["--output_base", "--output_user_root"], values: ["--config"], buildFlags: [] },
  buck: { dirs: [], values: ["--config"], buildFlags: [] },
  just: { dirs: ["-d", "--working-directory"], values: ["--set"], buildFlags: [] },
  task: { dirs: ["-d", "--dir"], values: ["-p", "--parallel"], buildFlags: [] },
  waf: { dirs: [], values: ["-j", "--jobs"], buildFlags: [] },
  dune: { dirs: ["--root"], values: ["-j", "--profile"], buildFlags: [] },
  stack: { dirs: ["--work-dir"], values: ["--resolver"], buildFlags: [] },
  cargo: {
    dirs: ["--target-dir", "--manifest-path"],
    values: ["--color", "--config", "-j", "--jobs", "--features"],
    buildFlags: [],
  },
  go: { dirs: ["-C"], values: ["-o", "-tags"], buildFlags: [] },
  gradle: {
    dirs: ["-p", "--project-dir"],
    values: ["--console", "--max-workers", "--build-file", "-b", "--init-script"],
    buildFlags: [],
  },
  gradlew: {
    dirs: ["-p", "--project-dir"],
    values: ["--console", "--max-workers", "--build-file", "-b"],
    buildFlags: [],
  },
  mvn: { dirs: ["-f", "--file"], values: ["-P", "-D", "-T"], buildFlags: [] },
  dotnet: {
    dirs: ["-o", "--output"],
    values: [
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
    buildFlags: [],
  },
  swift: { dirs: ["--package-path"], values: ["-c", "--configuration"], buildFlags: [] },
  zig: { dirs: [], values: ["-target"], buildFlags: [] },
  docker: {
    dirs: ["-f", "--file"],
    values: ["-t", "--tag", "--build-arg", "-H", "--platform", "--name"],
    buildFlags: [],
  },
  podman: { dirs: ["-f", "--file"], values: ["-t", "--tag", "--build-arg"], buildFlags: [] },
  poetry: { dirs: ["-C", "--directory"], values: ["--format"], buildFlags: [] },
  flutter: { dirs: [], values: ["--flavor", "-t"], buildFlags: [] },
  python: { dirs: [], values: ["-c"], buildFlags: [] },
  python3: { dirs: [], values: ["-c"], buildFlags: [] },
  sbt: { dirs: [], values: [], buildFlags: [] },
  rake: { dirs: ["-C"], values: ["-f"], buildFlags: [] },
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
const MANAGER_PASS = new Set(["run", "exec", "dlx", "workspaces", "--"]);
/**
 * A bare verb that consumes the following token without it being the script.
 *
 * Only `workspace`. The four flags that used to be here — `--filter`, `-F`, `--filter-prod`, `--scope`
 * — are subsumed by the manager default below, which consumes any flag not known to be boolean, and no
 * command's verdict changed when they were deleted.
 */
const MANAGER_CONSUMING = new Set(["workspace"]);
/** Manager flags that take NO value, so the token after them can still be the script. */
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
]);
/** Manager flags naming the directory whose manifest a script resolves in. */
const MANAGER_DIRS = new Set(["-C", "--dir", "--cwd", "--prefix"]);
/**
 * Flags whose value IS the target: `python -m build`, `nx --target=build`.
 *
 * Checked **before** a tool's own `values`, because `-m` is in both and reading it as an ordinary value
 * consumed `build`. That ordering is why `-m` was then dropped from python's `values`, and `--target`
 * from cargo's and flutter's: shadowed there, they pinned nothing.
 */
const TARGET_FLAGS = new Set(["-m", "--target"]);
/** With one of these, `pack`/`publish` do not fire their lifecycle hooks. */
const NO_SCRIPTS = new Set(["--ignore-scripts", "--no-scripts"]);

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
]);
const INTERPRETERS = new Set(["bash", "sh", "zsh", "pwsh", "powershell"]);
const LIFECYCLE: Record<string, readonly string[]> = {
  pack: ["prepack"],
  publish: ["prepublishOnly", "prepack"],
};
const SCRIPT_FILE = /^[\w./-]*[\w-]+\.(?:sh|ps1|bat|cmd|mjs|cjs|js|ts)$/;
/** Shared empty set, for whichever side of a manager/tool branch has no members of its own. */
const EMPTY: ReadonlySet<string> = new Set();

const namesABuild = (t: string): boolean =>
  t
    .split(/[:\-_./]+/)
    .filter(Boolean)
    .includes("build");
const isPathLike = (t: string): boolean =>
  t.includes("/") || t.startsWith(".") || /\.\w{1,5}$/.test(t);
/** A bare token carrying `=` is a setting, not a subcommand: `cargo --config build.jobs=2 test`. */
const isSetting = (t: string): boolean => t.includes("=");
const normalise = (d: string): string =>
  d
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p !== "" && p !== ".")
    .join("/");
const strongest = (v: readonly BuildVerdict[]): BuildVerdict =>
  v.includes("build") ? "build" : v.includes("heuristic") ? "heuristic" : "none";

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

function command(input: readonly string[], ctx: Context): BuildVerdict {
  let tokens = [...input];
  for (let g = 0; g < 8 && tokens.length; g += 1) {
    const head = tokens[0];
    if (
      /^[A-Z_][A-Z0-9_]*=/.test(head ?? "") ||
      WRAPPERS.has((head ?? "").split("/").pop() ?? "")
    ) {
      tokens = tokens.slice(1);
      continue;
    }
    break;
  }
  if (!tokens.length) return "none";

  const head = (tokens[0] ?? "").split("/").pop() ?? "";
  if (head === "node") {
    if (tokens[1] === "--run") return script(tokens[2] ?? "", ctx);
    tokens = tokens.slice(1);
  } else if (INTERPRETERS.has(head)) {
    tokens = tokens.slice(1);
  }
  if (!tokens.length) return "none";

  const first = tokens[0] ?? "";
  if (SCRIPT_FILE.test(first)) {
    return namesABuild(first.split("/").pop() ?? "") ? "heuristic" : "none";
  }

  const verb = first.split("/").pop() ?? "";
  if (BUNDLERS.has(verb)) return "build";
  const tool = TOOLS[verb];
  const isManager = MANAGERS.has(verb);
  if (tool === undefined && !isManager) return "none";

  const pass = isManager ? MANAGER_PASS : EMPTY;
  const dirs = isManager ? MANAGER_DIRS : new Set(tool?.dirs ?? []);
  const values = isManager ? EMPTY : new Set(tool?.values ?? []);
  const buildFlags = isManager ? EMPTY : new Set(tool?.buildFlags ?? []);
  const noScripts = tokens.some((t) => NO_SCRIPTS.has(t));
  let cwd = ctx.cwd;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) break;
    if (pass.has(token)) continue;
    if (isManager && MANAGER_CONSUMING.has(token)) {
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      // `.` is in the flag class because `-Dspring.profiles=x` and `--config build.jobs=2` carry one.
      const inline = /^(--?[\w.-]+)=(.*)$/.exec(token);
      if (inline) {
        const [, flag = "", value = ""] = inline;
        if (dirs.has(flag)) cwd = normalise(value);
        else if (TARGET_FLAGS.has(flag) && !isPathLike(value) && namesABuild(value)) return "build";
        else if (buildFlags.has(flag)) return "build";
        continue;
      }
      // TARGET_FLAGS before `values`: `-m` is python's module flag AND a target-naming flag, and the
      // other order consumed `build` in `python -m build` as an ordinary value.
      if (TARGET_FLAGS.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-") && namesABuild(value)) return "build";
        if (value !== undefined) i += 1;
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
      // A FLAG never names a build otherwise. v8 returned `build` for any flag whose own name contained
      // one, which made `gradle --build-cache test` and `gradle --build-file other.gradle clean` builds.
      //
      // A tool's flag set is closed and declared above, so a flag not in it takes no value and the next
      // token can still be the subcommand. A manager's is open-ended, so there the same question is
      // answered by MANAGER_BOOLEAN and the default is to consume.
      if (isManager && !MANAGER_BOOLEAN.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-")) i += 1;
      }
      continue;
    }

    const bare = token.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    if (isPathLike(token) || isSetting(token)) continue;
    if (MANAGERS.has(bare) || TOOLS[bare] !== undefined) {
      return command(tokens.slice(i), { ...ctx, cwd });
    }

    if (tool !== undefined) {
      // EVERY bare token is a candidate subcommand for a tool — `make -j 4 build` has two, and v8
      // returned on the first, so `4` decided that command. For a MANAGER the first bare token IS the
      // script, so there it returns.
      if (namesABuild(token)) return "build";
      continue;
    }
    return script(token, { ...ctx, cwd, noScripts });
  }
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
 * Every set the grammar is built from, exported so a corpus can be checked for **naming each member**.
 *
 * Round 7 measured 10 of 23 mutations surviving because each new rule was pinned at exactly one member,
 * and round 8 measured the repair — a test that ITERATED these sets — detecting nothing at all, because
 * it generated its probes from the sets it pinned, so deleting a member deleted its own assertion.
 * `../unit/buildCommand.test.ts` therefore holds a hardcoded case per member and uses this export only
 * to assert that no member is left unnamed.
 *
 * `wrappers`, `interpreters` and `lifecycle` are here because they were NOT, and so nothing could see
 * that six wrappers, four interpreters and `prepublishOnly` had no case at all.
 */
export const GRAMMAR = {
  managers: MANAGERS,
  tools: TOOLS,
  bundlers: BUNDLERS,
  managerPass: MANAGER_PASS,
  managerConsuming: MANAGER_CONSUMING,
  managerBoolean: MANAGER_BOOLEAN,
  managerDirs: MANAGER_DIRS,
  targetFlags: TARGET_FLAGS,
  noScripts: NO_SCRIPTS,
  wrappers: WRAPPERS,
  interpreters: INTERPRETERS,
  lifecycle: LIFECYCLE,
} as const;

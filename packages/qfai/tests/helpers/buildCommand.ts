/**
 * Does a workflow `run:` command reach a build?
 *
 * Eight versions. Each of the first seven was measured, reported clean by the party that wrote it, and
 * then broken by a corpus a reviewer chose. The two most instructive:
 *
 * - **v4** reported `pnpm ci:build-verify` as a build **by the script's name**, so what it measured was
 *   npm-script naming rather than behaviour.
 * - **v7** assumed every runner shares one grammar. A global set of "flags that take a directory" held
 *   three flags that are **boolean** in the tools it was applied to — `-B` is `--always-make` in make,
 *   `-S` is `--no-keep-going` there and `--full-stacktrace` in gradle — so `make -B build` was `none`
 *   while `make --always-make build` was `build`. And `run` was a global passthrough, so
 *   `docker run --name build-agent alpine` was a **build**: the real subcommand was skipped and a
 *   container name read as a target. Fifteen defects over fifty-nine probes.
 *
 * v8 gives each family its own grammar, which is the thing v7 was missing rather than another rule:
 *
 * 1. A **package manager** takes a SCRIPT, after its own passthrough verbs, resolved in the manifest
 *    its directory flags select.
 * 2. A **build tool** takes a SUBCOMMAND, with **per-tool** passthrough verbs and directory flags —
 *    `cmake --install` takes a directory, `make -B` does not.
 * 3. A spaced flag **consumes its value** unless it is a known boolean. That leans toward missing a
 *    build rather than inventing one, which is the safe direction here: the assertion this serves is
 *    that a tree contains none, so a false positive breaks it the day someone adds an innocent lane.
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

/** Build tools, each with its own passthrough verbs and directory-valued flags. */
const TOOLS: Record<
  string,
  { readonly pass: readonly string[]; readonly dirs: readonly string[] }
> = {
  turbo: { pass: ["run"], dirs: ["--cwd"] },
  nx: { pass: ["run", "run-many"], dirs: [] },
  lerna: { pass: ["run"], dirs: [] },
  rush: { pass: [], dirs: [] },
  make: { pass: [], dirs: ["-C", "--directory"] },
  cmake: { pass: [], dirs: ["--install", "-B", "-S", "--prefix"] },
  ninja: { pass: [], dirs: ["-C"] },
  bazel: { pass: [], dirs: ["--output_base", "--output_user_root"] },
  buck: { pass: [], dirs: [] },
  just: { pass: [], dirs: ["-d", "--working-directory"] },
  task: { pass: [], dirs: ["-d", "--dir"] },
  waf: { pass: [], dirs: [] },
  dune: { pass: [], dirs: ["--root"] },
  stack: { pass: [], dirs: ["--work-dir"] },
  cargo: { pass: [], dirs: ["--target-dir", "--manifest-path"] },
  go: { pass: [], dirs: ["-C"] },
  gradle: { pass: [], dirs: ["-p", "--project-dir"] },
  gradlew: { pass: [], dirs: ["-p", "--project-dir"] },
  mvn: { pass: [], dirs: ["-f", "--file"] },
  dotnet: { pass: [], dirs: ["-o", "--output"] },
  swift: { pass: [], dirs: ["--package-path"] },
  zig: { pass: [], dirs: [] },
  docker: { pass: ["buildx"], dirs: ["-f", "--file"] },
  podman: { pass: ["buildx"], dirs: ["-f", "--file"] },
  poetry: { pass: [], dirs: ["-C", "--directory"] },
  flutter: { pass: [], dirs: [] },
  python: { pass: [], dirs: [] },
  python3: { pass: [], dirs: [] },
  sbt: { pass: [], dirs: [] },
  rake: { pass: [], dirs: ["-C"] },
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
const NOT_A_BUNDLER = new Set(["tsc"]);

/** A package manager's own passthrough verbs, before the script name. */
const MANAGER_PASS = new Set(["run", "exec", "dlx", "workspaces", "--"]);
/** Verbs and flags that consume the following token without it being the target. */
const MANAGER_CONSUMING = new Set(["workspace", "--filter", "-F", "--filter-prod", "--scope"]);
/** Manager flags that take NO value, so the token after them can still be the script. */
const MANAGER_BOOLEAN = new Set([
  "-w",
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
/** Flags whose value IS the target. */
const TARGET_FLAGS = new Set(["-m", "--target", "--task"]);
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

const namesABuild = (t: string): boolean =>
  t
    .split(/[:\-_./]+/)
    .filter(Boolean)
    .includes("build");
const isPathLike = (t: string): boolean =>
  t.includes("/") || t.startsWith(".") || /\.\w{1,5}$/.test(t);
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

  const pass = isManager ? MANAGER_PASS : new Set(tool?.pass ?? []);
  const dirs = isManager ? MANAGER_DIRS : new Set(tool?.dirs ?? []);
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
      const inline = /^(--?[\w-]+)=(.*)$/.exec(token);
      if (inline) {
        const [, flag = "", value = ""] = inline;
        if (dirs.has(flag)) cwd = normalise(value);
        else if (TARGET_FLAGS.has(flag) && !isPathLike(value) && namesABuild(value)) return "build";
        continue;
      }
      if (dirs.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-")) {
          cwd = normalise(value);
          i += 1;
        }
        continue;
      }
      if (TARGET_FLAGS.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-") && namesABuild(value)) return "build";
        if (value !== undefined) i += 1;
        continue;
      }
      if (namesABuild(token.replace(/^-+/, ""))) return "build";
      // A spaced flag consumes its value unless it is a known boolean. Leaning this way misses a build
      // rather than inventing one, which is the safe direction for an assertion that a tree has none.
      const known = isManager ? MANAGER_BOOLEAN.has(token) : true;
      if (!known) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-")) i += 1;
      }
      continue;
    }

    const bare = token.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    if (NOT_A_BUNDLER.has(bare)) return "none";
    if (isPathLike(token)) continue;
    if (MANAGERS.has(bare) || TOOLS[bare] !== undefined) {
      return command(tokens.slice(i), { ...ctx, cwd });
    }
    if (tool !== undefined) return namesABuild(token) ? "build" : "none";
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
 * The sets v8's grammar is built from, exported so a corpus can pin **every member** rather than one.
 *
 * Round 7 measured 10 of 23 mutations surviving because each new rule was pinned at exactly one member
 * — `--install` of six directory flags, `--ignore-scripts` of two, `buildx` of seven passthroughs.
 * Deleting the other five was invisible. A test that iterates these cannot have that hole.
 */
export const GRAMMAR = {
  managers: MANAGERS,
  tools: TOOLS,
  bundlers: BUNDLERS,
  notABundler: NOT_A_BUNDLER,
  managerPass: MANAGER_PASS,
  managerConsuming: MANAGER_CONSUMING,
  managerBoolean: MANAGER_BOOLEAN,
  managerDirs: MANAGER_DIRS,
  targetFlags: TARGET_FLAGS,
  noScripts: NO_SCRIPTS,
} as const;

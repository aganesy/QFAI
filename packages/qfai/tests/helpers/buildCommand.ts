/**
 * Does a workflow `run:` command reach a build?
 *
 * Seven versions. Each of the first six was measured, reported clean by the party that wrote it, and
 * then broken by a corpus a reviewer chose. The history is the argument for the current shape:
 *
 * - **v1** one flag-value pair only. `pnpm run build`, `npx tsup` and six more reddened nothing.
 * - **v2** a package-manager list plus `build` anywhere after it. Caught `npx tsc --noEmit`.
 * - **v3** `build` as a standalone shell word. 9 missed, 10 false positives; caught `rm -rf build dist`.
 * - **v4** verb plus first target. Fixed those and regressed on 20 of 23 forms, because returning on
 *   the first target hides everything after `&&` — and it reported `pnpm ci:build-verify` as a build
 *   **by the script's name**, so what it measured was npm-script naming rather than behaviour.
 * - **v5** shell segments, per-manifest script bodies, a third `heuristic` verdict. A manifest lookup
 *   that MISSED returned the strong `build` from the bare name, so one command had two verdicts
 *   depending on whether the lookup hit.
 * - **v6** managers versus tools, a capped miss, nested runners. Round 6 measured **20 missed / 2
 *   false positives over 46 cases**: `sawFlag` was set by ANY flag, so `make -C packages/qfai build`,
 *   `make -j4 build`, `cargo --locked build`, `gradle --no-daemon build` and `docker buildx build`
 *   were all `none` — every one a build under v5. And `pnpm build` / `pnpm --filter qfai build` /
 *   `pnpm -F qfai build` gave **three different verdicts** for one command, because `--filter` was read
 *   as a directory and its short form was not read at all.
 *
 * v7 narrows three rules rather than broadening them:
 *
 * 1. Only a flag that takes a **directory** makes the next bare token a location instead of a
 *    subcommand. That is what `cmake --install build` is; `cargo --locked build` is not.
 * 2. `--filter` / `-F` select a **package**, not a directory, so they consume their value and leave
 *    the manifest alone — which is what makes the three `pnpm build` forms agree.
 * 3. Only a **target-naming** flag's value can name a target, so `--reporter=build-log` is not a build.
 *
 * And `--ignore-scripts` suppresses the lifecycle hooks, so `pnpm pack --ignore-scripts` does not
 * reach `prepack`.
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
const TOOLS = new Set([
  "turbo",
  "nx",
  "lerna",
  "rush",
  "make",
  "cmake",
  "ninja",
  "bazel",
  "buck",
  "just",
  "task",
  "waf",
  "dune",
  "stack",
  "cargo",
  "go",
  "gradle",
  "gradlew",
  "mvn",
  "dotnet",
  "swift",
  "zig",
  "docker",
  "podman",
  "poetry",
  "flutter",
  "python",
  "python3",
  "sbt",
  "rake",
]);
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
const PASSTHROUGH = new Set(["run", "run-many", "exec", "dlx", "workspaces", "--", "buildx"]);
/** Sub-verbs and flags that consume the next token without it being the target. */
const CONSUMING = new Set(["workspace", "--filter", "-F", "--filter-prod", "--scope"]);
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
/** Flags naming the directory whose manifest a script resolves in. */
const DIR_FLAGS = new Set(["-C", "--dir", "--cwd", "--prefix"]);
/** Flags whose value IS the target. */
const TARGET_FLAGS = new Set(["-m", "--target", "--task"]);
/**
 * Flags whose value is a DIRECTORY, so a `build` after one is a location and not a subcommand.
 * `cmake --install build` is the case this exists for.
 */
const DIRECTORY_VALUE_FLAGS = new Set(["--install", "-B", "-S", "--source", "--output", "-o"]);
/** With this present, `pack`/`publish` do not fire their lifecycle hooks. */
const NO_SCRIPTS = new Set(["--ignore-scripts", "--no-scripts"]);
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
  const isManager = MANAGERS.has(verb);
  const isTool = TOOLS.has(verb);
  if (!isManager && !isTool) return "none";

  const noScripts = tokens.some((t) => NO_SCRIPTS.has(t));
  let cwd = ctx.cwd;
  let afterDirectoryFlag = false;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) break;
    if (PASSTHROUGH.has(token)) {
      afterDirectoryFlag = false;
      continue;
    }
    if (CONSUMING.has(token)) {
      i += 1;
      afterDirectoryFlag = false;
      continue;
    }

    if (token.startsWith("-")) {
      const inline = /^(--?[\w-]+)=(.*)$/.exec(token);
      if (inline) {
        const [, flag = "", value = ""] = inline;
        if (DIR_FLAGS.has(flag)) cwd = normalise(value);
        // Only a target-naming flag's value can name a target: `--reporter=build-log` cannot.
        else if (TARGET_FLAGS.has(flag) && !isPathLike(value) && namesABuild(value)) return "build";
        afterDirectoryFlag = false;
        continue;
      }
      if (DIR_FLAGS.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-")) {
          cwd = normalise(value);
          i += 1;
        }
        afterDirectoryFlag = false;
        continue;
      }
      if (TARGET_FLAGS.has(token)) {
        const value = tokens[i + 1];
        if (value !== undefined && !value.startsWith("-") && namesABuild(value)) return "build";
        if (value !== undefined) i += 1;
        afterDirectoryFlag = false;
        continue;
      }
      if (namesABuild(token.replace(/^-+/, ""))) return "build";
      // Only a flag that takes a DIRECTORY makes the next bare token a location rather than a target.
      afterDirectoryFlag = DIRECTORY_VALUE_FLAGS.has(token);
      continue;
    }

    const bare = token.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    if (NOT_A_BUNDLER.has(bare)) return "none";
    if (isPathLike(token)) {
      afterDirectoryFlag = false;
      continue;
    }
    if (MANAGERS.has(bare) || TOOLS.has(bare)) return command(tokens.slice(i), { ...ctx, cwd });

    if (afterDirectoryFlag) {
      afterDirectoryFlag = false;
      continue;
    }
    if (isTool) return namesABuild(token) ? "build" : "none";
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

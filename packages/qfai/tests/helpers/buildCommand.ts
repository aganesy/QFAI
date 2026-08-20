/**
 * Does a workflow `run:` command reach a build?
 *
 * Six versions, each measured, and the first five were each wrong in a way the next review round
 * found. The history is kept because it is the argument for the current shape:
 *
 * - **v1** one flag-value pair only. `pnpm run build`, `npx tsup` and six more reddened nothing.
 * - **v2** a package-manager list plus `build` anywhere after it. Caught `npx tsc --noEmit`.
 * - **v3** `build` as a standalone shell word. Measured against a corpus someone else chose: 9 missed,
 *   10 false positives, against a recorded "0 misclassified". It caught `rm -rf build dist`.
 * - **v4** verb-allowlist plus first-target. Fixed v3's false positives and regressed on 20 of 23
 *   forms v3 caught, because returning on the first target hides everything after `&&`. And it
 *   reported `pnpm ci:build-verify` as a build **by the script's name**, so what it measured was
 *   npm-script naming rather than behaviour.
 * - **v5** shell segments, per-manifest script resolution, and a third `heuristic` verdict. Round 5
 *   broke it ten ways. The worst: when a manifest lookup MISSED, it returned the strong `build`
 *   verdict from the bare name — so `pnpm --filter qfai ci:build-verify` was `build` while
 *   `pnpm ci:build-verify` was `heuristic`. The same command, upgraded by a lookup failure, in the one
 *   place the file's own docstring promised a labelled guess. It also lost `pnpm -w build` (`-w` is
 *   boolean, and the flag ate the target), `npx turbo run build` and `pnpm nx build web` (a runner
 *   nested inside a runner), `yarn workspace qfai build` (the workspace name read as the target),
 *   `python -m build`, and it treated `cd ./pkg` and `cd pkg` as different directories.
 *
 * v6 keeps v5's three moves and adds three distinctions:
 *
 * 1. **A package manager resolves a SCRIPT; a build tool takes a SUBCOMMAND.** `pnpm build` looks up
 *    `build` in a manifest; `cargo build` does not. Conflating them is what let a missing script
 *    become a confident `build`.
 * 2. **A missing script is UNKNOWN**, so it returns `heuristic` at most — never `build`.
 * 3. **A runner may nest**, and a build tool's subcommand only counts **before any flag**, which is
 *    what separates `cmake --build .` from `cmake --install build`.
 *
 * **What no command-line scan can see**, stated because this repository has three instances: a build
 * spawned from inside a helper script. `scripts/check-build-warnings.mjs`, `scripts/verify-pack.mjs`
 * and `scripts/check-publish-dry-run.mjs` each reach `prepack -> npm run build -> tsup`. Reading
 * `package.json` cannot follow a `spawnSync` inside a `.mjs`. Only the first has a filename that says
 * `build`, so only commands reaching it land on `heuristic`; the other two are indistinguishable from
 * any other helper and land on `none`. That is a limit of the method, not of this implementation.
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
}

/** Package managers: the target is a SCRIPT, resolved through a manifest. */
const MANAGERS = new Set(["pnpm", "npm", "yarn", "npx", "pnpx", "bunx", "bun", "node"]);

/** Build tools: the target is a SUBCOMMAND of the tool, not a script. */
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
const PASSTHROUGH = new Set(["run", "run-many", "exec", "dlx", "workspaces", "--"]);
/** Sub-verbs that consume the token after them without it being the target. */
const CONSUMING = new Set(["workspace", "--filter-prod"]);
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
/** Flags naming the directory whose manifest a script resolves in. `-w` is boolean, not a path. */
const DIR_FLAGS = new Set(["-C", "--dir", "--cwd", "--filter", "--prefix"]);
/** Flags whose value IS the target: `python -m build`, `nx --target build`. */
const TARGET_FLAGS = new Set(["-m", "--target", "--task"]);
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
    const first = tokens[0];
    const target = tokens[1];
    if (first === "cd" && target !== undefined) {
      cwd = target.startsWith("/") ? normalise(tokens[1]) : normalise(`${cwd}/${tokens[1]}`);
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

  let cwd = ctx.cwd;
  let sawFlag = false;
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) break;
    if (PASSTHROUGH.has(token)) continue;
    if (CONSUMING.has(token)) {
      i += 1;
      continue;
    }

    if (token.startsWith("-")) {
      sawFlag = true;
      const inline = /^(--?[\w-]+)=(.*)$/.exec(token);
      if (inline) {
        const [, flag = "", value = ""] = inline;
        if (DIR_FLAGS.has(flag)) {
          cwd = normalise(value);
          continue;
        }
        if (!isPathLike(value) && namesABuild(value)) return "build";
        continue;
      }
      if (DIR_FLAGS.has(token)) {
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
      continue;
    }

    const bare = token.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    if (NOT_A_BUNDLER.has(bare)) return "none";
    if (isPathLike(token)) continue;

    // A nested runner: `npx turbo run build`, `pnpm nx build web`.
    if (MANAGERS.has(bare) || TOOLS.has(bare)) {
      return command(tokens.slice(i), { ...ctx, cwd });
    }

    // A build tool's subcommand only counts before any flag: `cmake --build .` is a build,
    // `cmake --install build` names a directory.
    if (isTool) return !sawFlag && namesABuild(token) ? "build" : "none";

    return script(token, { ...ctx, cwd });
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
  for (const hook of LIFECYCLE[target] ?? []) {
    const hookBody = scripts[hook];
    if (typeof hookBody === "string") bodies.push(hookBody);
  }
  const own = scripts[target];
  if (typeof own === "string") bodies.push(own);

  // A script this manifest does not declare is UNKNOWN. Round 5 found the previous version returning
  // the strong `build` here from the bare name, so `pnpm --filter qfai ci:build-verify` was `build`
  // while `pnpm ci:build-verify` was `heuristic` — the same command, upgraded by a lookup failure.
  if (!bodies.length) return namesABuild(target) ? "heuristic" : "none";
  return strongest(bodies.map((b) => shell(b, { ...ctx, seen })));
}

/** Convenience: does this line reach a build, counting a labelled guess as one? */
export function reachesBuild(line: string, sources?: ScriptSources, cwd = ""): boolean {
  return classifyBuildCommand(line, sources, cwd) !== "none";
}

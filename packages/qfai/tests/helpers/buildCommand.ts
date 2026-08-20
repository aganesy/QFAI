/**
 * Does a workflow `run:` command reach a build?
 *
 * Five versions, each measured, and the first four were each wrong in a way the next review round
 * found. The history is kept because it is the argument for the current shape:
 *
 * - **v1** one flag-value pair only. `pnpm run build`, `npx tsup` and six more reddened nothing.
 * - **v2** a package-manager list plus `build` anywhere after it. Fixed v1's misses and overshot:
 *   `npx tsc --noEmit` is a type check and was reported as a build.
 * - **v3** `build` as a standalone shell word. Measured against someone else's corpus: 9 missed, 10
 *   false positives, against a recorded "0 misclassified". It caught `rm -rf build dist` and a JS
 *   comment.
 * - **v4** verb-allowlist plus first-target. Fixed v3's false positives and **regressed on 20 of 23
 *   forms v3 caught**, because returning on the first target makes everything after a shell operator
 *   invisible — including `npm ci && npm run build`, the most common build form in a `run:` block.
 *   And it caught `pnpm ci:build-verify` **by the script's name**: that command's body is
 *   `node ./scripts/check-build-warnings.mjs && …`, so what it measured was npm-script naming rather
 *   than behaviour. `pnpm ci:pack-verify` would be identical behaviour and `false`.
 *
 * v5 changes three things, in the order they matter:
 *
 * 1. **Segments before verbs.** A `run:` body is shell. Split on `&&`, `||`, `;` and `|`, strip
 *    wrappers (`time`, `sudo`, `env`, `nice`), follow `cd`, and classify each segment on its own.
 * 2. **Bodies before names, per manifest.** A `pnpm <script>` resolves to that script's *body*, in
 *    **the manifest the command's directory selects** — `-C`, `--dir`, `--filter` and a preceding `cd`
 *    all move it. That distinction is load-bearing here: this repository's root `build` is
 *    `pnpm -C packages/qfai build` and the package's `build` is `tsup`, so a single merged script map
 *    makes the name self-referential and resolves to nothing. `pack` and `publish` resolve through the
 *    `prepack` / `prepublishOnly` lifecycle hooks, which is how `pnpm -C packages/qfai pack` reaches
 *    `tsup` while naming no build at all.
 * 3. **A labelled guess where nothing can be resolved.** Three verdicts, not two: `build` when a chain
 *    of bodies provably reaches one, `heuristic` when only a *name* suggests it — an unknown script, a
 *    helper file called `check-build-warnings.mjs` — and `none` otherwise. A caller that needs
 *    certainty can demand `build`; one guarding an absence can reject both.
 *
 * **What no command-line scan can see**, stated because this repository has two instances: a build
 * spawned from inside a helper script. `scripts/check-build-warnings.mjs` spawns
 * `pnpm -C packages/qfai build`, and both `pnpm ci:gate` and `pnpm ci:build-verify` reach it. Reading
 * `package.json` cannot follow a `spawnSync` inside a `.mjs`; those two land on `heuristic` because
 * the helper's filename happens to say `build`, and that is luck rather than analysis.
 */

/** Verbs that can run a build, where the target decides. */
const RUNNERS = new Set([
  "pnpm",
  "npm",
  "yarn",
  "npx",
  "pnpx",
  "bunx",
  "bun",
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

/** Verbs that ARE a build when invoked at all. */
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

/**
 * `tsc` is deliberately NOT a bundler: in this ecosystem it is a type check as often as an emit
 * (`npx tsc --noEmit`, and this repository's own `check-types` is `tsc -b`).
 */
const NOT_A_BUNDLER = new Set(["tsc"]);

/** Sub-verbs a runner uses before it names its target. */
const PASSTHROUGH = new Set(["run", "run-many", "exec", "dlx", "workspace", "workspaces", "--"]);

/** Wrappers that delegate to the command after them. */
const WRAPPERS = new Set([
  "time",
  "sudo",
  "nice",
  "ionice",
  "xvfb-run",
  "command",
  "exec",
  "stdbuf",
  "nohup",
  "env",
]);

const INTERPRETERS = new Set(["bash", "sh", "zsh", "pwsh", "powershell"]);

/** Flags that name the directory whose manifest a script resolves in. */
const DIRECTORY_FLAGS = new Set(["-C", "--dir", "--cwd", "--filter", "--prefix", "-w"]);

/** Targets that trigger a lifecycle hook rather than a script of that name. */
const LIFECYCLE: Record<string, readonly string[]> = {
  pack: ["prepack"],
  publish: ["prepublishOnly", "prepack"],
};

const SCRIPT_FILE = /^[\w./-]*[\w-]+\.(?:sh|ps1|bat|cmd|mjs|cjs|js|ts)$/;

export type BuildVerdict = "build" | "heuristic" | "none";

export interface ScriptSources {
  /**
   * Directory, repository-relative with no leading or trailing slash, to that manifest's `scripts`.
   * The repository root is the empty string.
   */
  readonly manifests: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

interface Context {
  readonly sources: ScriptSources | undefined;
  readonly cwd: string;
  readonly visited: Set<string>;
}

/** `ci:build-verify` -> `["ci","build","verify"]`. */
function namesABuild(token: string): boolean {
  return token
    .split(/[:\-_./]+/)
    .filter((part) => part !== "")
    .includes("build");
}

/** A path or filename — a location rather than a target name. */
function isPathLike(token: string): boolean {
  return token.includes("/") || token.startsWith(".") || /\.\w{1,5}$/.test(token);
}

function normalise(dir: string): string {
  return dir.replace(/^\.\//, "").replace(/^\/+|\/+$/g, "");
}

function strongest(verdicts: readonly BuildVerdict[]): BuildVerdict {
  if (verdicts.includes("build")) return "build";
  if (verdicts.includes("heuristic")) return "heuristic";
  return "none";
}

/**
 * Classify one `run:` line.
 *
 * @param line the command text, comments already stripped
 * @param sources per-directory `package.json#scripts`; omit when the tree's scripts are unknown, and
 *   a name-shaped match then returns `heuristic` rather than `build`
 * @param cwd directory the line starts in, repository-relative; `""` for the root
 */
export function classifyBuildCommand(
  line: string,
  sources?: ScriptSources,
  cwd = "",
): BuildVerdict {
  return classifyShell(line, { sources, cwd: normalise(cwd), visited: new Set() });
}

/** Split into commands, threading `cd` through the sequence as a shell would. */
function classifyShell(line: string, context: Context): BuildVerdict {
  const parts = line
    .split(/&&|\|\||;|(?<!\|)\|(?!\|)/)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const verdicts: BuildVerdict[] = [];
  let cwd = context.cwd;
  for (const part of parts) {
    const tokens = part.split(/\s+/).filter((token) => token !== "");
    if ((tokens[0] ?? "") === "cd" && tokens[1] !== undefined) {
      cwd = normalise(tokens[1].startsWith("/") ? tokens[1] : `${cwd}/${tokens[1]}`);
      continue;
    }
    verdicts.push(classifyCommand(tokens, { ...context, cwd }));
  }
  return strongest(verdicts);
}

function classifyCommand(input: readonly string[], context: Context): BuildVerdict {
  let tokens = [...input];
  if (tokens.length === 0) return "none";

  // Strip inline env assignments and wrappers until a verb is in front.
  for (let guard = 0; guard < 8 && tokens.length > 0; guard += 1) {
    const head = tokens[0] ?? "";
    if (/^[A-Z_][A-Z0-9_]*=/.test(head) || WRAPPERS.has(head.split("/").pop() ?? "")) {
      tokens = tokens.slice(1);
      continue;
    }
    break;
  }
  if (tokens.length === 0) return "none";

  const head = tokens[0]?.split("/").pop() ?? "";
  if (head === "node") {
    // `node --run build` runs a package script; `node foo.mjs` runs a file.
    if (tokens[1] === "--run") return resolveScript(tokens[2] ?? "", context);
    tokens = tokens.slice(1);
  } else if (INTERPRETERS.has(head)) {
    tokens = tokens.slice(1);
  }

  const candidate = tokens[0];
  if (candidate === undefined) return "none";

  // A script FILE: only its name is available, so a match is a labelled guess.
  if (SCRIPT_FILE.test(candidate)) {
    return namesABuild(candidate.split("/").pop() ?? "") ? "heuristic" : "none";
  }

  const verb = candidate.split("/").pop() ?? "";
  if (BUNDLERS.has(verb)) return "build";
  if (!RUNNERS.has(verb)) return "none";

  let cwd = context.cwd;
  for (let cursor = 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token === undefined) break;
    if (PASSTHROUGH.has(token)) continue;

    if (token.startsWith("-")) {
      const inline = /^(--?[\w-]+)=(.*)$/.exec(token);
      if (inline !== null) {
        const [, flag = "", value = ""] = inline;
        if (DIRECTORY_FLAGS.has(flag)) {
          cwd = normalise(value);
          continue;
        }
        if (!isPathLike(value) && namesABuild(value)) return "build";
        continue;
      }
      if (DIRECTORY_FLAGS.has(token)) {
        const value = tokens[cursor + 1];
        if (value !== undefined && !value.startsWith("-")) {
          cwd = normalise(value);
          cursor += 1;
        }
        continue;
      }
      if (namesABuild(token.replace(/^-+/, ""))) return "build";
      // Flags are otherwise skipped and never treated as consuming their value: v4 consumed it and
      // lost `npx --yes tsup`.
      continue;
    }

    const bare = token.split("/").pop() ?? "";
    if (BUNDLERS.has(bare)) return "build";
    if (NOT_A_BUNDLER.has(bare)) return "none";
    if (isPathLike(token)) continue;
    return resolveScript(token, { ...context, cwd });
  }
  return "none";
}

/**
 * Resolve a script target through its body, in the manifest its directory selects.
 *
 * This is the step that stops the predicate measuring names: `ci:build-verify` names a build and
 * reaches none; `pack` names none and reaches `tsup` through `prepack`.
 */
function resolveScript(target: string, context: Context): BuildVerdict {
  if (target === "") return "none";
  if (context.sources === undefined) {
    return namesABuild(target) ? "heuristic" : "none";
  }

  const key = `${context.cwd}::${target}`;
  if (context.visited.has(key)) return "none";
  const visited = new Set(context.visited);
  visited.add(key);

  const scripts = context.sources.manifests[context.cwd] ?? {};
  const bodies: string[] = [];
  for (const hook of LIFECYCLE[target] ?? []) {
    const body = scripts[hook];
    if (typeof body === "string") bodies.push(body);
  }
  const own = scripts[target];
  if (typeof own === "string") bodies.push(own);

  if (bodies.length === 0) {
    // Not a declared script in this manifest: `cargo build`, `docker build`, `make build` land here,
    // and so does a script in a manifest that was not supplied.
    return namesABuild(target) ? "build" : "none";
  }
  return strongest(bodies.map((body) => classifyShell(body, { ...context, visited })));
}

/** Convenience: does this line reach a build, counting a labelled guess as one? */
export function reachesBuild(line: string, sources?: ScriptSources, cwd = ""): boolean {
  return classifyBuildCommand(line, sources, cwd) !== "none";
}

/**
 * `tests/helpers/buildCommand.ts` — the predicate `US-0017-0004` rests on.
 *
 * Four review rounds measured four versions of it and each version was reported as clean by the party
 * that wrote it. Every corpus this stage chose flattered its own predicate; every corpus a reviewer
 * chose broke it. So the corpora below are, deliberately, **not** this stage's:
 *
 * - the twenty forms round 4's `qa-gatekeeper` measured as v4 regressions against v3;
 * - the forms v4 already handled, kept so a fix for the above cannot silently undo them;
 * - the non-builds rounds 2, 3 and 4 each added after a false positive;
 * - and the two cases from **this repository** where a script's name and a script's behaviour
 *   disagree, which is what v4 was actually measuring.
 *
 * The last group is the reason `classifyBuildCommand` takes a script map. `pnpm ci:build-verify`
 * *names* a build and reaches none — its body is `node ./scripts/check-build-warnings.mjs && …`, and
 * the build is spawned inside that helper, invisible to any command-line scan. `pnpm pack` names no
 * build and reaches `tsup` through the `prepack` hook. v4 got the first one right by coincidence and
 * the second one wrong.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { classifyBuildCommand, reachesBuild, type ScriptSources } from "../helpers/buildCommand.js";

const ROOT = path.resolve(__dirname, "../../../..");

async function scriptsOf(relative: string): Promise<Record<string, string>> {
  const text = await readFile(path.join(ROOT, relative), "utf8");
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("scripts" in parsed) ||
    typeof parsed.scripts !== "object" ||
    parsed.scripts === null
  ) {
    return {};
  }
  const scripts: Record<string, string> = {};
  for (const [name, body] of Object.entries(parsed.scripts)) {
    if (typeof body === "string") scripts[name] = body;
  }
  return scripts;
}

/**
 * The two manifests, keyed by directory rather than merged.
 *
 * Merging them was the first attempt and it cannot work: the root `build` is
 * `pnpm -C packages/qfai build` and the package's `build` is `tsup`, so one map makes the name
 * self-referential and resolves to nothing at all. The `-C` argument is what selects the manifest.
 */
async function repositorySources(): Promise<ScriptSources> {
  return {
    manifests: {
      "": await scriptsOf("package.json"),
      "packages/qfai": await scriptsOf("packages/qfai/package.json"),
    },
  };
}

describe("classifyBuildCommand", () => {
  it("catches the twenty forms round 4 measured as v4 regressions", async () => {
    const sources = await repositorySources();
    const REGRESSIONS = [
      "npm ci && npm run build",
      "pnpm install --frozen-lockfile && pnpm build",
      "cd packages/qfai && pnpm build",
      "pnpm lint; pnpm build",
      "time pnpm build",
      "sudo make build",
      "env NODE_ENV=production pnpm build",
      "docker build -t qfai:ci .",
      "just build",
      "task build",
      "waf build",
      "dune build",
      "stack build",
      "flutter build web",
      "poetry build",
      "python -m build",
      "xcodebuild -scheme QFAI build",
      "npx --yes tsup",
      "node --run build",
      "msbuild MySolution.sln",
    ];
    // `msbuild` was named as missed by round 3 and dropped from the corpus a round later, which is
    // corpus selection by outcome. It stays in this list now whether it passes or not.
    const missed = REGRESSIONS.filter((line) => classifyBuildCommand(line, sources) === "none");
    expect.soft(missed, "a build form v3 caught and a later version must not lose").toEqual([]);
  });

  it("keeps every form v4 already handled", async () => {
    const sources = await repositorySources();
    const KEPT = [
      "pnpm -C packages/qfai build",
      "pnpm run build",
      "npm run build-storybook",
      "nx run-many --target=build",
      "cmake --build .",
      "npx tsup",
      "./scripts/build.sh",
      "bash scripts/build-dist.sh",
      "turbo run build",
      "cargo build",
      "go build ./...",
      "gradle build",
      "dotnet build",
      "pnpm exec vite build",
      "npx webpack --mode production",
    ];
    const missed = KEPT.filter((line) => classifyBuildCommand(line, sources) === "none");
    expect.soft(missed, "a fix for the regressions must not undo v4's own gains").toEqual([]);
  });

  it("reports none for every non-build a review round added after a false positive", async () => {
    const sources = await repositorySources();
    const NOT_BUILDS = [
      "npx tsc --noEmit",
      "pnpm check-types",
      "npm ci --ignore-scripts",
      "pnpm exec eslint . --cache-location .cache/build",
      "npm test -- --reporter=junit --outputFile reports/build.xml",
      "npx playwright test --output=build-artifacts",
      "yarn dlx license-checker --start ./build",
      "pnpm vitest run --project e2e",
      "npm run lint:md",
      "pnpm -C packages/qfai test:e2e",
      "pnpm install --frozen-lockfile",
      "rm -rf build dist",
      "mkdir -p build",
      "cp -r dist build-output",
      "apt-get install -y build-essential",
      "git diff --name-only",
      'echo "unit lane placeholder - opted in, but the test-lane body ships later"',
      'echo "::notice::build reuse is not wired yet"',
    ];
    const falsePositives = NOT_BUILDS.filter(
      (line) => classifyBuildCommand(line, sources) !== "none",
    );
    expect.soft(falsePositives, "a non-build reported as one").toEqual([]);
  });

  it("resolves a script's body rather than its name, in both directions", async () => {
    const sources = await repositorySources();

    // Names a build, and what it reaches is a helper file whose NAME also says build — so the honest
    // verdict is the labelled guess, not `build`. v4 returned a flat `true`, which reads as analysis;
    // the build is spawned by `spawnSync` inside `check-build-warnings.mjs`, which no command-line
    // scan reaches.
    expect
      .soft(
        classifyBuildCommand("pnpm ci:build-verify", sources),
        "`ci:build-verify` runs `node ./scripts/check-build-warnings.mjs && …`, so only the helper's " +
          "filename suggests a build",
      )
      .toBe("heuristic");

    // Names no build, reaches one through the `prepack` lifecycle hook.
    expect
      .soft(
        classifyBuildCommand("pnpm -C packages/qfai pack --pack-destination /tmp/x", sources),
        "`pack` triggers `prepack`, which is `npm run build`, which is `tsup`",
      )
      .toBe("build");

    // Resolved through the root manifest, which delegates to the package's.
    expect
      .soft(
        classifyBuildCommand("pnpm build", sources),
        "the root `build` is `pnpm -C packages/qfai build`, whose `build` is `tsup`",
      )
      .toBe("build");

    // With no script map there is nothing but the name, and the verdict says so rather than passing
    // a guess off as an analysis.
    expect(classifyBuildCommand("pnpm ci:build-verify")).toBe("heuristic");
    expect(classifyBuildCommand("pnpm run build")).toBe("heuristic");
  });

  it("classifies each command of a compound line, not just the first", () => {
    // v4 returned on the first target, so everything after `&&` was invisible — including
    // `npm ci && npm run build`, the most common build form in a workflow `run:` block.
    //
    // `reachesBuild` rather than the verdict here: with no script map every one of these can only be
    // a name-shaped match, and what this test is about is the SPLIT, not the strength.
    expect(reachesBuild("npm ci && npm run build")).toBe(true);
    expect(reachesBuild("pnpm lint && pnpm test")).toBe(false);
    expect(reachesBuild("pnpm lint | tee log.txt")).toBe(false);
    expect(reachesBuild("pnpm lint || pnpm build")).toBe(true);
    expect(reachesBuild("cd packages/qfai && pnpm build")).toBe(true);

    // And with the manifests supplied, the same split resolves to a proven build.
    const sources: ScriptSources = { manifests: { "": { build: "tsup" } } };
    expect(classifyBuildCommand("npm ci && npm run build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm lint && pnpm test", sources)).toBe("none");
  });

  it("classifies the ten forms round 5 measured against v5", async () => {
    // Round 5's `qa-gatekeeper` broke v5 ten ways. Its cases are here, in its own framing, because a
    // corpus this stage chose has flattered this predicate at every version.
    const sources = await repositorySources();

    // The worst one: a MISSING script returned the strong `build` verdict from the bare name, so the
    // same command changed verdict depending on whether a lookup happened to hit.
    expect
      .soft(
        classifyBuildCommand("pnpm --filter qfai ci:build-verify", sources),
        "a manifest lookup that misses may never produce more than a labelled guess",
      )
      .toBe("heuristic");
    expect.soft(classifyBuildCommand("pnpm ci:build-verify", sources)).toBe("heuristic");
    expect
      .soft(
        classifyBuildCommand("pnpm --filter qfai ci:build-verify", sources),
        "and it must agree with the unfiltered form — round 5 found them differing",
      )
      .toBe(classifyBuildCommand("pnpm ci:build-verify", sources));

    // Names that merely contain `build` are guesses, not builds.
    expect.soft(classifyBuildCommand("npm run clean:build-cache", sources)).toBe("heuristic");
    expect.soft(classifyBuildCommand("npm run restore:build-artifact", sources)).toBe("heuristic");

    // A build tool's subcommand counts before a flag, not after: `--install build` names a directory.
    expect.soft(classifyBuildCommand("cmake --install build", sources)).toBe("none");
    expect.soft(classifyBuildCommand("cmake --build .", sources)).toBe("build");

    // Forms v5 lost entirely.
    expect.soft(classifyBuildCommand("pnpm -w build", sources), "`-w` is boolean").toBe("build");
    expect.soft(classifyBuildCommand("npx turbo run build", sources)).toBe("build");
    expect.soft(classifyBuildCommand("pnpm nx build web", sources)).toBe("build");
    expect
      .soft(
        classifyBuildCommand("yarn workspace qfai build", sources),
        "the workspace NAME is not the target",
      )
      .toBe("build");
    expect.soft(classifyBuildCommand("python -m build", sources)).toBe("build");
  });

  it("treats `cd ./pkg` and `cd pkg` as the same directory", () => {
    // Round 5 found them differing: `normalise` left the `./` in place, so one resolved in a manifest
    // that did not exist. Round 5 also found that removing the whole `cd` handler reddened nothing,
    // which is why this asserts a positive resolution rather than an absence.
    const sources: ScriptSources = { manifests: { "": {}, pkg: { build: "tsup" } } };
    expect(classifyBuildCommand("cd ./pkg && pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("cd pkg && pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("cd ./pkg/ && pnpm build", sources)).toBe("build");
    // And a directory with no manifest resolves to a guess, not to the root's script.
    expect(classifyBuildCommand("cd ./elsewhere && pnpm build", sources)).toBe("heuristic");
    // Without the `cd`, the root manifest declares no `build`, so the same command is only a guess.
    expect(classifyBuildCommand("pnpm build", sources)).toBe("heuristic");
  });

  it("classifies the class round 6 measured v6 regressing on", async () => {
    // v6 treated ANY flag as ending the subcommand position, so every one of these went to `none`
    // while being a build under v5. Round 6 measured them; the fix is narrower, not broader — only a
    // flag that takes a DIRECTORY makes the next bare token a location.
    const sources = await repositorySources();
    const REGRESSED = [
      "make -C packages/qfai build",
      "make -j4 build",
      "cargo --locked build",
      "gradle --no-daemon build",
      "bazel --output_base=/tmp build //...",
      "docker buildx build --push .",
      "docker -H tcp://x build .",
    ];
    const missed = REGRESSED.filter((line) => classifyBuildCommand(line, sources) !== "build");
    expect.soft(missed, "a build v5 caught and v6 lost").toEqual([]);

    // And the one case the directory-flag rule exists for still holds.
    expect.soft(classifyBuildCommand("cmake --install build", sources)).toBe("none");
    expect.soft(classifyBuildCommand("cmake --build .", sources)).toBe("build");
  });

  it("gives one command one verdict across a flag's long, short and absent forms", async () => {
    // Round 6: `pnpm build` was `build`, `pnpm --filter qfai build` `heuristic`, and
    // `pnpm -F qfai build` `none`. `--filter` selects a PACKAGE, not a directory, so reading it as a
    // manifest path pointed at a directory that does not exist — and the short form was not read at
    // all. All three must agree.
    const sources = await repositorySources();
    const forms = ["pnpm build", "pnpm --filter qfai build", "pnpm -F qfai build"];
    const verdicts = forms.map((line) => classifyBuildCommand(line, sources));
    expect.soft(new Set(verdicts).size, `one command, one verdict: ${verdicts.join(", ")}`).toBe(1);
    expect.soft(verdicts[0]).toBe("build");
  });

  it("does not read a build out of a flag value or a suppressed lifecycle hook", async () => {
    const sources = await repositorySources();
    // `--ignore-scripts` means `prepack` does not run, so packing reaches no build.
    expect
      .soft(
        classifyBuildCommand("pnpm -C packages/qfai pack --ignore-scripts", sources),
        "a suppressed lifecycle hook cannot be a build",
      )
      .toBe("none");
    // Only a target-naming flag's value can name a target.
    expect
      .soft(
        classifyBuildCommand("pnpm --reporter=build-log install", sources),
        "a reporter name is not a build target",
      )
      .toBe("none");
  });

  it("terminates on a self-referential script chain rather than recursing forever", () => {
    const sources: ScriptSources = { manifests: { "": { a: "pnpm b", b: "pnpm a" } } };
    expect(classifyBuildCommand("pnpm a", sources)).toBe("none");
  });

  it("resolves a script in the manifest its directory selects, not a merged one", () => {
    const sources: ScriptSources = {
      manifests: {
        "": { build: "pnpm -C pkg build", other: "echo root" },
        pkg: { build: "tsup", other: "echo package" },
      },
    };
    expect(classifyBuildCommand("pnpm build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm -C pkg build", sources)).toBe("build");
    expect(classifyBuildCommand("pnpm other", sources)).toBe("none");
    // `cd` moves the manifest too, which is what makes `cd pkg && …` differ from a bare invocation.
    expect(classifyBuildCommand("cd pkg && pnpm other", sources)).toBe("none");
  });
});

describe("the real workflow trees", () => {
  interface CommandLine {
    readonly file: string;
    readonly command: string;
  }

  /** Every `run:` command line in a workflow directory, comments stripped. */
  async function commandLines(relativeDir: string): Promise<CommandLine[]> {
    const { readdir } = await import("node:fs/promises");
    const dir = path.join(ROOT, relativeDir);
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return [];
    }

    const lines: CommandLine[] = [];
    for (const file of names) {
      if (!/\.ya?ml$/.test(file)) continue;
      const text = await readFile(path.join(dir, file), "utf8");
      let inRun = false;
      let indent = 0;
      for (const rawLine of text.split(/\r?\n/)) {
        const inline = /^\s*(?:-\s+)?run:\s*(\S.*)$/.exec(rawLine);
        if (inline !== null && !/^[|>]/.test(inline[1] ?? "")) {
          lines.push({ file, command: inline[1] ?? "" });
          inRun = false;
          continue;
        }
        const block = /^(\s*)(?:-\s+)?run:\s*[|>][-+]?\s*$/.exec(rawLine);
        if (block !== null) {
          inRun = true;
          indent = (block[1] ?? "").length;
          continue;
        }
        if (!inRun || rawLine.trim() === "") continue;
        if (rawLine.length - rawLine.trimStart().length <= indent) {
          inRun = false;
          continue;
        }
        lines.push({ file, command: rawLine.trim() });
      }
    }

    return lines
      .map((entry) => ({ file: entry.file, command: entry.command.replace(/#.*$/, "").trim() }))
      .filter((entry) => entry.command !== "");
  }

  it("finds no build in the shipped tree, which is what US-0017-0004 needs", async () => {
    // No script map: `qfai init` ships no `package.json`, so an adopter's script bodies are unknown
    // and only a name-shaped guess is available. BOTH verdicts are rejected here, so the assertion is
    // the stronger one — not even a suspicious name appears in a shipped lane.
    const lines = await commandLines("packages/qfai/assets/init/root/.github/workflows");
    const flagged = lines
      .filter((entry) => classifyBuildCommand(entry.command) !== "none")
      .map((entry) => `${entry.file}::${entry.command}`);
    expect.soft(lines.length, "the shipped tree must actually have been read").toBeGreaterThan(50);
    expect.soft(flagged, "no shipped lane may run or appear to run its own build").toEqual([]);
  });

  it("finds the own tree's builds, and labels the two no scan can resolve", async () => {
    const sources = await repositorySources();
    const lines = await commandLines(".github/workflows");
    expect
      .soft(lines.length, "the scan must reach a real corpus or its silence means nothing")
      .toBeGreaterThan(250);

    const flagged = lines
      .map((entry) => ({ ...entry, verdict: classifyBuildCommand(entry.command, sources) }))
      .filter((entry) => entry.verdict !== "none")
      .map((entry) => `${entry.verdict}::${entry.file}::${entry.command}`)
      .sort();

    // Round 4 established that this repository reaches a build in FOUR places, and that the previous
    // assertion — "exactly the two real builds and nothing else" — was green only because the
    // predicate was blind. Two resolve through `package.json`; two do not, because the build is
    // spawned inside `scripts/check-build-warnings.mjs`, and those land on `heuristic` only because
    // that filename happens to say `build`.
    //
    // Pinned as a set, so a build in a new place fails this rather than being absorbed by a count.
    expect
      .soft(
        flagged,
        "every command reaching or appearing to reach a build: `build` = a resolved chain of script " +
          "bodies, `heuristic` = only a name says so",
      )
      .toEqual([
        "build::ci.yml::pnpm -C packages/qfai build",
        'build::release.yml::pnpm -C packages/qfai pack --pack-destination "$PWD/tmp"',
        "heuristic::ci.yml::pnpm ci:build-verify",
        "heuristic::release.yml::pnpm ci:gate",
      ]);
  });
});

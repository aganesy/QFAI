/**
 * The allowlist, against every build anyone has planted in the shipped lane.
 *
 * `US-0017-0004` says no shipped lane runs or appears to run its own build. For ten rounds that was
 * asserted with a predicate over build spellings, and round 10 measured the ceiling of the approach:
 * fifty real builds planted into the shipped orchestrator, **forty-four shipped unnoticed**, with the
 * verdict that settled it —
 *
 * > I did not have to find a weakness in v12: I only named build tools it does not name, and gave the
 * > ones it does name their real arguments.
 *
 * So the story is asserted the other way round now, by enumerating what a lane MAY invoke. This file is
 * the falsification of that, and the corpus is not this stage's: it is every form rounds 8, 9 and 10
 * planted, plus the plain spellings the classifier already caught. All of them must be refused, and the
 * shipped tree's own shapes must not be — a guard that refuses everything is as useless as one that
 * refuses nothing, which is why both directions are here.
 */
import { describe, expect, it } from "vitest";

import {
  ALLOWED_ACTION_INPUTS,
  ALLOWED_ACTIONS,
  ALLOWED_INVOCATIONS,
  commandsOf,
  HARMLESS_PROGRAMS,
  invocationOf,
  invocationsOf,
  refusals,
} from "../helpers/shippedLaneCommands.js";

/** Every form a reviewer planted, across three rounds. None was chosen by this stage. */
const PLANTED = [
  // round 10, the implementation review's six — planted with the classifier's guard green
  "npm exec -- tsup --config tsup.config.ts",
  'bash -eo pipefail -c "pnpm -C packages/qfai build"',
  "time -v make all",
  'sudo "make" build',
  "run-s clean build",
  "env pnpm build -v",
  // round 10, the QA gate's fifty, by the family it named
  "npx next build",
  "pnpm exec ng build --configuration production",
  "npx nuxt build",
  "npx astro build",
  "pnpm exec nest build",
  "npx gatsby build",
  "npx docusaurus build",
  "npx react-scripts build",
  "npx vue-cli-service build",
  "npx unbuild",
  "npx tsdown",
  "npx ncc build src/index.ts",
  "npx babel src --out-dir lib",
  "npx --yes esbuild src/index.ts --bundle --outfile=dist/index.js",
  "npx --no-install tsup --config tsup.config.ts",
  "npx --package=tsup -- tsup --config tsup.config.ts",
  "npm-run-all --parallel build lint",
  "npm-run-all clean build",
  "run-p lint build",
  "./mvnw -B package",
  "bazelisk build //...",
  "cargo b --release",
  "corepack pnpm build",
  "ant dist",
  "deno task build",
  "deno compile --output app main.ts",
  "nix build",
  "buildah bud -t qfai:ci .",
  "earthly +build",
  "pants package ::",
  "dart compile exe bin/main.dart",
  "elm make src/Main.elm --output=dist/app.js",
  "gcc -O2 -o dist/app src/main.c",
  "javac -d out src/Main.java",
  "rustc -O src/main.rs",
  "swiftc main.swift -o app",
  "powershell -NoProfile -File scripts\\build.ps1",
  ".\\scripts\\build.cmd",
  "(cd packages/qfai && pnpm build)",
  'bash -eo pipefail -c "pnpm build"',
  'script -q -c "pnpm build" /dev/null',
  "xargs -I{} pnpm -C {} build",
  // rounds 8 and 9, and the plain spellings
  "gradle --console plain build",
  "make -j 4 build",
  "cross-env NODE_ENV=production pnpm build",
  'xvfb-run -a -s "-screen 0 1024x768x24" pnpm build',
  "yarn workspaces foreach --all run build",
  "pnpm build",
  "pnpm -C packages/qfai build",
  "npx tsup",
  "make",
  "gradle assemble",
  "tsc -b",
  "docker build -t x .",
  "mvn package",
  "dotnet publish -c Release",
];

/** Shapes the shipped tree actually contains, which must pass. */
const SHIPPED = [
  'echo "unit lane placeholder - opted in, but the test-lane body ships in a later revision"',
  "npx qfai validate --profile full --fail-on error",
  'declared="$(node -e \'const { readFileSync } = require("node:fs"); process.stdout.write("[]");\')" || declared="[]"',
  'if printf \'%s\' "$X" | grep -Eq \'"result": *"(failure|cancelled)"\'; then exit 1; fi',
  "corepack enable",
  "npm ci",
  'if [ -f package.json ]; then echo "yes"; fi',
  "git diff --name-only origin/main...HEAD | cut -d/ -f1 | tr -d ' '",
];

describe("the shipped-lane allowlist", () => {
  it("refuses every build anyone has planted, without a corpus of build spellings", () => {
    const escaped = PLANTED.filter((line) => refusals(line).length === 0);
    expect(
      escaped,
      "a planted build the allowlist let through: the classifier caught 6 of 50 of these, which is " +
        "why the assertion was inverted",
    ).toEqual([]);
  });

  it("accepts the shapes the shipped tree actually contains", () => {
    // The other direction, and it is not a formality: an allowlist that refuses the shipped tree is a
    // test nobody can keep green, and the temptation is then to widen it until it refuses nothing.
    const falselyRefused = SHIPPED.map((line) => [line, refusals(line)] as const).filter(
      ([, refused]) => refused.length > 0,
    );
    expect(
      falselyRefused.map(([line, refused]) => `${refused.join(", ")} <- ${line.slice(0, 60)}`),
      "a shape the shipped tree contains that the allowlist refuses",
    ).toEqual([]);
  });

  it("reads a payload as opaque rather than as commands", () => {
    // Three versions of the scanner descended into `node -e '<javascript>'` and reported `typeof
    // parsed`, `let field` and `try {` as programs. The last of them failed because the payload sits
    // inside `"$( … )"`, so the DOUBLE quote opens first and the single-quoted payload is never seen as
    // quoted at all.
    const body = 'x="$(node -e \'const a = require("node:fs"); try { a; } catch { }\')" || x="[]"';
    expect(invocationsOf(body), "the program, and nothing from inside its payload").toEqual([
      "node",
    ]);
  });

  it("does not read a `case` pattern alternation as a program", () => {
    // `*.md|*.txt|LICENSE|docs/*)` was split on `|` and reported `LICENSE` as a program. A pipe
    // separates commands only when it is spaced; the unspaced form is legal shell that nobody writes.
    expect(commandsOf("*.md|*.markdown|*.txt|LICENSE|docs/*) ;;")).toHaveLength(1);
    expect(invocationOf("*.md|*.txt|LICENSE|docs/*)")).toBeUndefined();
    // And a real pipe still separates.
    expect(commandsOf("printf '%s' x | grep -q y")).toHaveLength(2);
  });

  it("keeps the two lists disjoint, so a program cannot be allowed by both routes", () => {
    // A program in `HARMLESS_PROGRAMS` is allowed whatever its arguments, so listing it again as an
    // exact invocation would be dead — and worse, would read as though the exact form were the limit.
    const both = [...ALLOWED_INVOCATIONS].filter((invocation) =>
      HARMLESS_PROGRAMS.has(invocation.split(" ")[0] ?? ""),
    );
    expect(both, "an invocation whose program is already allowed by name").toEqual([]);
    expect(ALLOWED_ACTIONS.size, "the action allowlist is not empty").toBeGreaterThan(0);
    expect(ALLOWED_ACTION_INPUTS.has("arguments"), "`arguments` is the `uses:` build channel").toBe(
      false,
    );
    expect(ALLOWED_ACTION_INPUTS.has("args"), "as is `args`").toBe(false);
  });
});

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

import { classifyBuildCommand } from "../helpers/buildCommand.js";
import {
  ALLOWED_ACTION_INPUTS,
  ALLOWED_ACTIONS,
  ALLOWED_INVOCATIONS,
  commandsOf,
  HARMLESS_PROGRAMS,
  invocationOf,
  invocationsOf,
  refusals,
  NOTHING,
  UNREADABLE,
} from "../helpers/shippedLaneCommands.js";

/**
 * The **de-duplicated union** of every form reviewers planted, across four rounds. None was chosen by
 * this stage.
 *
 * No count of it appears here or in the block comments below. Five plantings produced 141 forms and
 * many were the same command by two spellings, so the pre-dedup numerals the comments used to carry
 * ("the implementation review's six", "the QA gate's fifty") described the plantings rather than this
 * list, and a reader could not tell whether the difference was merging or dropping. The list grows once
 * a round, so no numeral over it survives a round — which is the argument the record makes about the
 * classifier's corpora, one instrument over.
 */
const PLANTED = [
  // round 10, the implementation review — planted with the classifier's guard green
  "npm exec -- tsup --config tsup.config.ts",
  'bash -eo pipefail -c "pnpm -C packages/qfai build"',
  "time -v make all",
  'sudo "make" build',
  "run-s clean build",
  "env pnpm build -v",
  // round 10, the QA gate, by the families it named
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
  // The two real `node -e` payloads are covered where they live: the `US-0017-0004` row runs `refusals()`
  // over every shipped step body. A PARAPHRASE of one used to sit here, in a list documented as shapes the
  // tree actually contains, and it is refused now — correctly, because an unenumerated payload is refused
  // even when it is harmless. That is the cost of failing closed, and it belongs in the refused direction.
  'if printf \'%s\' "$X" | grep -Eq \'"result": *"(failure|cancelled)"\'; then exit 1; fi',
  "corepack enable",
  "npm ci",
  'if [ -f package.json ]; then echo "yes"; fi',
  "git diff --name-only origin/main...HEAD | cut -d/ -f1 | tr -d ' '",
];

/**
 * Seven ordinary shell constructs that execute the command they wrap.
 *
 * Round 11 measured the corpus above going from 0 of 62 missed to **61 of 62 missed** under any one of
 * these. Every entry in `PLANTED` was a bare command, so the list's "0 escaped" result said nothing
 * about the commonest thing a CI author writes: a build inside a conditional.
 *
 * Applied as a WRAPPER rather than pasted in as more literals, deliberately. A hole that appears only
 * under wrapping cannot be closed by enumerating unwrapped spellings — which is the lesson the build
 * classifier's twelve versions taught one instrument over, arriving here in a new shape.
 */
/** A literal backtick, built from its code point because it cannot appear inside a template. */
const BACKTICK = String.fromCharCode(96);

const WRAPS: ReadonlyArray<(command: string) => string> = [
  (c) => `if [ -f package.json ]; then ${c}; fi`,
  (c) => `if true; then ${c}; fi`,
  (c) => `if false; then echo skip; else ${c}; fi`,
  (c) => `for p in one; do ${c}; done`,
  (c) => `until ${c}; do break; done`,
  (c) => `{ ${c}; }`,
  (c) => `! ${c}`,
  (c) => `echo ${BACKTICK}${c}${BACKTICK}`,
  (c) => `grep -q x <(${c})`,
  (c) => `echo a#b && ${c}`,
];

/**
 * The five parser holes round 11 measured, each with a distinct root cause and each EXECUTED with a
 * marker stub by the reviewer that found it. Kept as literals beside the wrapper because their point is
 * the root cause rather than the spelling.
 */
const ROOT_CAUSES = [
  // a keyword is a prefix to a command, not a command
  "if [ -f package.json ]; then pnpm build; fi",
  // the other spelling of `$( … )`
  `declared=${BACKTICK} tsup ${BACKTICK}`,
  // a glob in the head is a path being executed, not a `case` pattern
  "./ci/*/build.sh",
  // process substitution
  "read -r v < <(pnpm build)",
  // `#` starts a comment only at the beginning of a word
  "echo a#b && npx tsup",
  // A `node -e` payload nobody enumerated, harmless or not. Round 12 ran
  // `node -e "require('child_process').execSync('pnpm build')"` straight through, and a payload is code
  // that no command scanner reads — so the payloads are enumerated by digest and every other is refused.
  "node -e 'process.stdout.write(\"x\")'",
  "node -e \"require('child_process').execSync('pnpm build')\"",
  // A one-line function definition, whose header used to swallow its whole body. The shipped tree
  // contains the construct, so this is the tree's own idiom rather than exotic shell.
  "build_once() { pnpm -C packages/qfai build; }",
  // An unspaced pipe, which the previous spacing rule read as one command invoking `echo`.
  "echo x|npx tsup",
  "[ -f package.json ]|npx tsup",
  // and `git`, which takes a shell command as its argument in five separate subcommands
  "git -c alias.zz='!pnpm build' zz",
  "git submodule foreach 'pnpm -C packages/qfai build'",
  "git bisect run make",
  // a build inside a `case` arm, which the pattern head used to hide
  "*.ts) npx tsup ;;",
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

  it("refuses the same builds when one shell construct is wrapped around them", () => {
    // The measurement that mattered most in round 11, as a permanent test. `pnpm build` is the first
    // entry `PLANTED` refuses, and `if [ -f package.json ]; then pnpm build; fi` refused nothing: one
    // construct around a command the corpus already names was enough to defeat the instrument the whole
    // story rests on.
    const escaped: string[] = [];
    for (const wrap of WRAPS) {
      for (const line of PLANTED) {
        const wrapped = wrap(line);
        if (refusals(wrapped).length === 0) escaped.push(wrapped);
      }
    }
    expect
      .soft(escaped.slice(0, 12), "a planted build that a shell construct hid from the allowlist")
      .toEqual([]);
    expect(escaped.length, "how many of the wrapped forms escaped").toBe(0);
  });

  it("refuses each of the five parser holes by its root cause", () => {
    // Enumerated separately from `WRAPS` because the fix for these is not "one more entry": it is that
    // `invocationOf` distinguishes "invokes nothing" from "cannot be read", and refuses the second. A
    // spelling nobody has thought of now costs a spurious refusal in review rather than a shipped
    // build, which is what "fails closed" has to mean for a claim that there is nothing here.
    expect(
      ROOT_CAUSES.filter((line) => refusals(line).length === 0),
      "a parser hole that still hides the command behind it",
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

  it("refuses an install that names a package, which the two-token prefix could not see", () => {
    // `ALLOWED_INVOCATIONS` matches a program plus its FIRST non-flag argument, and its docstring used
    // to call that exact — so `npm install left-pad` read as `npm install` and shipped. Installing an
    // arbitrary package in a shipped lane is a different act from restoring a lockfile, and the shortest
    // route to running arbitrary code, through that package's own install scripts.
    for (const line of [
      "npm install left-pad",
      "npm ci extra-package",
      "pnpm install some-pkg",
      "yarn install some-pkg",
      "corepack enable yarn@4.0.0",
    ]) {
      expect(refusals(line), `${line} must be refused`).toHaveLength(1);
    }
    // And the shipped forms, which carry flags but no package, stay accepted.
    for (const line of [
      "npm install",
      "npm ci",
      "pnpm install --frozen-lockfile",
      "yarn install --immutable",
      "corepack enable",
    ]) {
      expect(refusals(line), `${line} must be accepted`).toEqual([]);
    }
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

  it("reads a `case` arm as a prefix, not as a program and not as a wall", () => {
    // `*.md|*.txt|LICENSE|docs/*)` was split on `|` and reported `LICENSE` as a program. A pipe
    // separates commands only when it is spaced; the unspaced form is legal shell that nobody writes.
    expect(commandsOf("*.md|*.markdown|*.txt|LICENSE|docs/*) ;;")).toHaveLength(1);
    // An arm with nothing after it invokes NOTHING, which is a different verdict from UNREADABLE — and
    // the distinction is the whole of round 11's repair. Both used to be `undefined`, and `refusals()`
    // read `undefined` as consent, so a construct the scanner could not parse was permission to run
    // anything.
    expect(invocationOf("*.md|*.txt|LICENSE|docs/*)")).toBe(NOTHING);
    // An arm WITH a command after it is a prefix: the pattern must not hide what follows it. This is the
    // keyword defect wearing a different punctuation mark, and it hid a build inside a case arm.
    expect(invocationOf("*.md) echo docs")).toBe("echo docs");
    expect(refusals("*.ts) npx tsup ;;")).toHaveLength(1);
    // A glob head that is NOT an arm is a path being executed, and unreadable rather than nothing.
    expect(invocationOf("./ci/*/build.sh")).toBe(UNREADABLE);
    // And a real pipe still separates.
    expect(commandsOf("printf '%s' x | grep -q y")).toHaveLength(2);
  });

  it("records which instrument catches each planted build, so neither can narrow invisibly", () => {
    // The two instruments cover each other's holes, and round 11 measured four commands where they give
    // opposite answers:
    //
    //   npm install esbuild                       allowed by the allowlist, caught by the classifier
    //   pnpm install --filter tsup                allowed by the allowlist, caught by the classifier
    //   docker run --rm -v .:/w img make build    refused by the allowlist, missed by the classifier
    //   docker exec ci make build                 refused by the allowlist, missed by the classifier
    //
    // (The first two are now refused by the allowlist as well, since an install naming a package is
    // refused — but the shape is what matters: complementary coverage held by accident, asserted
    // nowhere. Either instrument could have been narrowed and the loss would not have shown.)
    //
    // What is asserted is the floor, not the split: every planted line must be caught by AT LEAST ONE.
    // A change that moves a line from "both" to "one" still passes, because that is a legitimate
    // simplification; a change that moves it to "neither" fails, which is the only outcome that matters.
    const missed: string[] = [];
    const byAllowlistOnly: string[] = [];
    const byClassifierOnly: string[] = [];
    for (const line of PLANTED) {
      const allowlist = refusals(line).length > 0;
      const classifier = classifyBuildCommand(line) !== "none";
      if (!allowlist && !classifier) missed.push(line);
      else if (allowlist && !classifier) byAllowlistOnly.push(line);
      else if (!allowlist && classifier) byClassifierOnly.push(line);
    }
    expect(missed, "a planted build neither instrument catches").toEqual([]);

    // And the relationship, measured rather than assumed — which was worth measuring, because it is not
    // the one round 11 described. On THIS corpus the two instruments agree on every single line: after
    // this round's repairs neither is the sole catcher of anything here.
    expect(
      { byAllowlistOnly, byClassifierOnly },
      "on the planted corpus the two instruments agree line for line; a non-empty list here means one " +
        "of them has narrowed, or gained a shape the other lacks, and either is worth reading",
    ).toEqual({ byAllowlistOnly: [], byClassifierOnly: [] });

    // So **the classifier is not a second net for `US-0017-0004`**, and saying so is the point of this
    // test. Its job is the OWN tree, where a miss is tolerable and the three-verdict labelling is what
    // is wanted. Anything relying on it as a backstop for the story is relying on a coincidence that
    // this assertion has now measured away.
    const DOCKER_SHAPES = ["docker run --rm -v .:/w img make build", "docker exec ci make build"];
    for (const line of DOCKER_SHAPES) {
      expect(refusals(line), `${line}: the allowlist must catch it`).not.toEqual([]);
      expect(classifyBuildCommand(line), `${line}: the classifier reads docker's stops`).toBe(
        "none",
      );
    }
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

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
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { classifyBuildCommand } from "../helpers/buildCommand.js";
import {
  ALLOWED_ACTION_INPUTS,
  ALLOWED_ACTIONS,
  ALLOWED_INVOCATIONS,
  bodyDigest,
  commandsOf,
  HARMLESS_PROGRAMS,
  initMustNotShip,
  BUILD_DECORATION,
  LIVE_DECORATIONS,
  INERT_DECORATIONS,
  invocationOf,
  invocationsOf,
  maskOf,
  payloadDigest,
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
  // A one-line `case`, whose pattern used to swallow the arm on the same line. The multi-line form
  // worked, because `commandsOf` splits on `;` and the arm landed in its own segment.
  "case $x in *) npx tsup ;; esac",
  // A substitution deciding WHICH invocation runs. `commandsOf` removed it from the surrounding word,
  // narrowing the command into the shorter, allowed `node`.
  "node $(echo build.mjs)",
  // An assignment prefix whose VALUE names a program, which the prefix skip made invisible.
  "GIT_EXTERNAL_DIFF=./ext-diff.sh git diff --ext-diff HEAD",
  // An install naming a package behind an opaque flag: counting stopped at `-e` and reported zero.
  "npm install -e foo left-pad",
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

/**
 * The forms a twenty-agent adversarial sweep confirmed EXECUTING, grouped by the mechanism that let
 * each one through rather than by its spelling.
 *
 * The grouping is the finding. Every entry here was closed by a rule about a KIND of thing — where a
 * command's input comes from, that a flag is part of an invocation, that a write is worth whatever
 * reads it — and none by adding its spelling to a list. That is what the sweep settled: enumerating
 * our own shipped surface converges and fails closed, while enumerating bash grammar converges only at
 * a complete bash parser, and every gap on the way there fails open.
 *
 * No count appears over this list, for the reason `PLANTED` gives one instrument over.
 */
const MECHANISMS = [
  // the lexer's quote state was wrong, so the split was wrong: a backslash before a quote, and a `)`
  // inside a string or a comment that ended a `case` arm the scanner was not in
  'echo \\" ; npx tsup',
  "echo | npx tsup ')'",
  "echo | npx tsup # )",
  // a command's INPUT is a command. `node` reads its program from stdin, so a here-string, a pipe and
  // a `<` file each run code that no argument carries
  '<<<\'require("fs").writeFileSync(process.env.MB,"NODE_RAN")\' node',
  "echo \"require('child_process').execSync('pnpm build')\" | node",
  "printf \"require('child_process').execSync('pnpm build')\" > pl\n<pl node",
  // a subshell is a command list, and the previous scan read `( … )` as one opaque word
  "( echo x | npx tsup )",
  "( echo aGkK | base64 -d | sh )",
  // a substitution decides WHICH invocation runs, in both of its spellings
  "node `echo build.mjs`",
  "node <(echo 'console.log(1)')",
  // a flag is part of the invocation. For an interpreter the flags ARE the program, and every one of
  // these resolved to the bare allowed `node`
  "node --run=build",
  "node --import=./evil.mjs",
  "node --require=./evil.cjs",
  "node --test",
  "node -p \"require('child_process').execSync('pnpm build')\"",
  "node --print \"require('child_process').execSync('pnpm build')\"",
  "node --eval=\"require('child_process').execSync('pnpm build')\"",
  "npx --package=evilpkg qfai",
  // an environment prefix decides what the following name resolves to
  "PATH=bin:$PATH npx qfai",
  // the lane WRITES the code that a permitted install then runs. Neither half is refusable alone: the
  // write is by a program whose arguments cannot reach a build, and the install is enumerated
  'echo \'require("fs").writeFileSync("PF_C5","top")\' > .pnpmfile.cjs\necho \'{}\' > package.json\npnpm install',
  "printf 'yarnPath: ./evil.cjs\\n' > .yarnrc.yml\nprintf 'require(\"fs\").writeFileSync(\"YARN_MARK\",\"x\")\\n' > evil.cjs\necho '{}' > package.json\ncorepack enable\nyarn",
  'echo \'{"scripts":{"postinstall":"node wm.cjs c1_post"}}\' > package.json\nnpm install',
  'echo \'{"scripts":{"prepare":"node wm.cjs c3_prep"}}\' > package.json\nnpm install',
  'echo \'{"scripts":{"preinstall":"node build.mjs"}}\' > package.json\nnpm install',
  // round 14, three reviewers: a redirection does not have to BEGIN a token, and removing one space
  // was enough. The write rule, the stdin rule and the splitter each read a token shape.
  'echo \'{"scripts":{"postinstall":"node evil.js"}}\'>package.json\nnpm install',
  "echo NODE_OPTIONS=--require=./evil.cjs>>$GITHUB_ENV",
  "echo x&>evil.cjs",
  // and a `case` arm, where `headIndexOf` answered `undefined` while `invocationOf` read the arm, so
  // the install carrying a package had no arguments by one of the two functions
  "case x in *) npm install ./evil --no-audit --no-fund ;; esac",
  // round 16: three decisions in the splitter read the raw text while the mask sat three lines away,
  // and an escaped `>` fooled all of them
  "echo a\\>|npx tsup",
  "echo a\\> | npx tsup",
  "echo a\\ #b && npx tsup",
  // round 17: the two walks disagreed about what a quote is, in three ways
  "echo $'a\\'' | npx tsup",
  "echo $'a\\'' && npx tsup",
  'echo a | npx tsup "$(echo ")")"',
  // and a here-document whose closer could not be found took the rest of the body with it
  "read x <<\\EOF\ndata\nEOF\nnpx tsup",
  "read x <<NOPE\nnpx tsup",
  "read x <<EOF && npx tsup\ndata\nEOF",
  // round 18: five more root causes, 50 executed escapes between them
  // the third quote walk, `matchingParen`, had no backslash model while the other two did
  'echo "$(echo \\")" ; npx tsup',
  // `codeMask`'s comment rule was missing the guard `commandsOf`'s carries
  "echo x <\\ #y & npx tsup",
  // an UNQUOTED here-document delimiter leaves its data subject to expansion
  "read v <<EOF\n$(npx tsup)\nEOF",
  // and `lastCode` skipped masked text, so a quoted redirection target disarmed the split
  'echo x > "$GITHUB_OUTPUT" | npx tsup',
  // a `node` with no flag at all, which reads its program from stdin: the absence of an argument
  // is not the absence of a program, and the inverted rule refuses it by the missing `-e`
  "node",
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

  it("refuses each mechanism the adversarial sweep confirmed executing", () => {
    // Fourteen confirmed escapes and none refuted, plus the ten already known, asserted as one list
    // because the repair was one shape: the scanner had no model of a command's input, no model of a
    // flag and no model of an effect, and each of those gaps was open in every spelling of itself.
    // Enumerating the spellings would have closed sixteen of these and left the mechanism intact.
    expect(
      MECHANISMS.filter((line) => refusals(line).length === 0),
      "a mechanism the sweep proved executes, which the allowlist still lets through",
    ).toEqual([]);
  });

  it("gives two inputs that behave differently two different digests", () => {
    // **Three collisions, one per attempt to normalize, and the third one killed the practice.** The
    // gate is IDENTITY, so a collision IS the hole, and each of these was found by someone attacking a
    // digest rather than reading it:
    //
    //   collapsing whitespace     a newline inside `$( … )` is one command or two   (round 14, mine)
    //   stripping trailing space  a space after a continuation ends the continuation (round 14, twice)
    //   folding CRLF to LF        a CR before the newline ends it the same way       (round 15)
    //
    // The third was the sharpest, because round 14 had recorded that branch as UNREACHABLE on a
    // measurement of block scalars, where the parser folds line breaks itself — and a quoted flow
    // scalar hands the digest a live CR. Measuring the reachable case and concluding about every case
    // is the class this spec's record catalogues.
    //
    // So neither digest normalizes anything now, and the assertions below are written against a local
    // copy of the rule that was dropped. A test that asserted `payloadDigest` still collides would
    // have to be deleted the moment the collapse was, taking the lesson with it.
    const collapsing = (text: string): string =>
      createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex");

    const pairs: ReadonlyArray<readonly [string, string, string]> = [
      [
        "a newline inside a substitution is one command or two",
        'if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then echo shallow; fi',
        'if [ "$(git\nrev-parse --is-shallow-repository)" = "true" ]; then echo shallow; fi',
      ],
      [
        "a trailing space ends a line continuation",
        "echo a \\\n  && echo b",
        "echo a \\ \n  && echo b",
      ],
      ["a CR before the newline ends it too", "echo a \\\nnpx tsup", "echo a \\\r\nnpx tsup"],
      [
        "a newline terminates a // comment, so collapsing swallows the statement after it",
        '// read the manifest\nprocess.stdout.write("x");',
        '// read the manifest process.stdout.write("x");',
      ],
    ];

    const survived: string[] = [];
    for (const [why, left, right] of pairs) {
      // The dropped rule cannot tell them apart — which is why it was dropped, and asserting it here
      // keeps each pair's point checkable rather than remembered.
      expect(collapsing(left), `the collapsing rule cannot tell these apart: ${why}`).toBe(
        collapsing(right),
      );
      if (bodyDigest(left) === bodyDigest(right)) survived.push(`bodyDigest: ${why}`);
      if (payloadDigest(left) === payloadDigest(right)) survived.push(`payloadDigest: ${why}`);
    }
    expect(survived, "two inputs that behave differently must not share a digest").toEqual([]);
  });

  it("answers every question `initMustNotShip` asks, including the ones no real file reaches", () => {
    // **Round 20's gate found all four branches unexercised.** Every one of the 191 blobs in the init
    // source is mode `100644` with an ordinary extension, and `initMustNotShip` has exactly two
    // callers, both walking real trees — so the executable-bit branch and all three byte-order-mark
    // branches were dead code on every platform, verified only by a reviewer's throwaway probe and by
    // this stage's, both deleted at the end of their rounds.
    //
    // That is the same shape as the bash oracle: the only thing that ever exercised the rule lived in
    // scratch. A branch nothing reaches is a branch nothing protects, and the tree being clean is
    // exactly why it stays that way.
    const bom = (bytes: number[], rest: string): Buffer =>
      Buffer.concat([
        Buffer.from(bytes),
        Buffer.from(rest, bytes[0] === 0xff || bytes[0] === 0xfe ? "utf16le" : "utf8"),
      ]);
    const utf16be = (rest: string): Buffer =>
      Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(rest, "utf16le").swap16()]);

    const CASES: ReadonlyArray<readonly [string, string, Buffer, number, string | undefined]> = [
      ["a plain shebang", "docs/note.md", Buffer.from("#!/bin/sh\n"), 0o644, "carries a shebang"],
      // The round-19 escape: three bytes in front of `#!`, and `sh <file>` runs it anyway.
      [
        "a UTF-8 BOM before the shebang",
        "docs/note.md",
        bom([0xef, 0xbb, 0xbf], "#!/bin/sh\n"),
        0o644,
        "carries a shebang",
      ],
      [
        "a UTF-16LE BOM before it",
        "docs/note.md",
        bom([0xff, 0xfe], "#!/bin/sh\n"),
        0o644,
        "carries a shebang",
      ],
      [
        "a UTF-16BE BOM before it",
        "docs/note.md",
        utf16be("#!/bin/sh\n"),
        0o644,
        "carries a shebang",
      ],
      [
        "blank lines before it",
        "docs/note.md",
        Buffer.from("\n\n   #!/bin/sh\n"),
        0o644,
        "carries a shebang",
      ],
      [
        "a BOM and a blank line",
        "docs/note.md",
        bom([0xef, 0xbb, 0xbf], "\n #!/bin/sh\n"),
        0o644,
        "carries a shebang",
      ],
      // The bit is real on the Linux runner and unobservable on Windows, where Node reports 0o666 for
      // every file — which is why it is asked HERE, with the mode supplied rather than read off disk.
      [
        "the executable bit alone",
        "docs/note.md",
        Buffer.from("echo x\n"),
        0o755,
        "arrives executable",
      ],
      [
        "a name a tool knows",
        "tools/run.sh",
        Buffer.from("echo x\n"),
        0o644,
        "is a manifest or a script by name",
      ],
      [
        "a manifest",
        "package.json",
        Buffer.from("{}\n"),
        0o644,
        "is a manifest or a script by name",
      ],
      [
        "a hook directory",
        "hooks/pre-commit",
        Buffer.from("echo x\n"),
        0o644,
        "is a manifest or a script by name",
      ],
      // …and the other direction, which is what stops the rule from refusing the tree it guards.
      ["ordinary markdown", "docs/note.md", Buffer.from("# Title\n\nProse.\n"), 0o644, undefined],
      [
        "markdown behind a BOM",
        "docs/note.md",
        bom([0xef, 0xbb, 0xbf], "# Title\n"),
        0o644,
        undefined,
      ],
      [
        "yaml opening with a comment",
        "a.yml",
        Buffer.from("# comment\nkey: value\n"),
        0o644,
        undefined,
      ],
      ["json", "a.json", Buffer.from('{"a":1}\n'), 0o644, undefined],
      [
        "a shebang further down the file",
        "docs/note.md",
        Buffer.from("# Title\n\n#!/bin/sh\n"),
        0o644,
        undefined,
      ],
    ];

    const wrong = CASES.filter(
      ([, file, bytes, mode, want]) => initMustNotShip(file, bytes, mode) !== want,
    ).map(
      ([label, file, bytes, mode, want]) =>
        `${label}: expected ${String(want)}, got ${String(initMustNotShip(file, bytes, mode))}`,
    );
    expect(wrong, "a question `initMustNotShip` answers differently than the rule says").toEqual(
      [],
    );
  });

  it("refuses a build wherever the mask says the text is code", () => {
    // **The differential test the last four rounds were doing by hand.**
    //
    // Every escape found in rounds 15 to 18 has the same signature: a build command sat at a position
    // `codeMask` calls CODE, and `refusals()` returned `[]` anyway — because some other walk in this
    // file disagreed with the mask about quotes, escapes, comments or here-documents. Three quote
    // walks, two comment rules, two fence strippers: each was found as a disagreement, and each was
    // found by a reviewer generating decorations by hand and running them.
    //
    // So the property is stated once and generated: **if the mask says a build is code, the scan must
    // refuse it, and if the mask says it is not, the scan must not be asked to.** That ties the two
    // instruments together rather than leaving each to be checked against a corpus of the last round's
    // spellings, and a walk that diverges from the mask fails here whatever the spelling.
    //
    // **Every entry below is a claim about bash, and the obligation is to have RUN it.** Round 19
    // found the reason this matters: a wrong `inert` entry passes precisely when the mask is also
    // wrong, so a misfiled row would have this test certifying an escape rather than catching one.
    // `.qfai/evidence/atdd-spec-0017.md` records the marker output for each. Do not add a row here
    // from reading; add it from a run.
    const BUILD = BUILD_DECORATION;
    const live = LIVE_DECORATIONS;
    const inert = INERT_DECORATIONS;
    // A shape may not hide a second build: `indexOf` measures the FIRST, so "here it is dead, here it
    // is live" would be scored at the wrong one, silently.
    const ambiguous = live
      .concat(inert)
      .filter((shape) => shape.indexOf("%s") !== shape.lastIndexOf("%s"));
    expect(ambiguous, "a decoration with two build sites is measured at only one of them").toEqual(
      [],
    );

    const missed: string[] = [];
    const misread: string[] = [];
    const overRefused: string[] = [];
    // Every position of the token, not just its first character: `codeMask` changes state mid-token
    // in several of the branches this file has been wrong about, and a divergence that starts at the
    // `p` of `npx` was invisible while the test sampled only the `n`.
    const spans = (body: string, at: number): boolean[] =>
      maskOf(body).slice(at, at + BUILD.length);
    for (const shape of live) {
      const body = shape.replace("%s", BUILD);
      const at = body.indexOf(BUILD);
      if (spans(body, at).some((bit) => bit !== true)) {
        misread.push(`live but masked: ${JSON.stringify(shape)}`);
        continue;
      }
      if (refusals(body).length === 0) missed.push(JSON.stringify(shape));
    }
    for (const shape of inert) {
      const body = shape.replace("%s", BUILD);
      const at = body.indexOf(BUILD);
      if (spans(body, at).some((bit) => bit === true)) {
        misread.push(`inert but code: ${JSON.stringify(shape)}`);
      }
      if (refusals(body).length > 0) overRefused.push(JSON.stringify(shape));
    }

    expect(
      misread,
      "the mask and bash disagree about whether this position runs — the mask is the thing to fix",
    ).toEqual([]);
    expect(
      missed,
      "a build at a position the mask calls code, which the scan did not refuse. Every escape found " +
        "in rounds 15 to 18 had this signature, and each was a second walk disagreeing with the mask",
    ).toEqual([]);
    expect(
      overRefused,
      "a position bash never runs, which the scan refused anyway. Harmless to an adopter and fatal " +
        "to this test's other half: it is the only assertion `commandsOf` gets at these positions",
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

  it("holds no by-name program the shipped tree does not invoke", async () => {
    // An allowlist over a FIXED surface should hold nothing that surface does not use: an unused entry is
    // a slot a future edit can fill without anyone reading it. Round 12 found three — `[[`, `test` and
    // `false` — and a trim only lasts a round unless something keeps it trimmed.
    //
    // Derived from the shipped tree rather than from a second list, so this cannot drift from what
    // `US-0017-0004` measures.
    const dir = path.resolve(__dirname, "../../assets/init/root/.github/workflows");
    const invoked = new Set<string>();
    for (const file of (await readdir(dir)).filter((name) => /\.ya?ml$/.test(name))) {
      const parsed: unknown = parseYaml(await readFile(path.join(dir, file), "utf8"));
      if (typeof parsed !== "object" || parsed === null || !("jobs" in parsed)) continue;
      const jobs = parsed.jobs;
      if (typeof jobs !== "object" || jobs === null) continue;
      for (const job of Object.values(jobs)) {
        if (typeof job !== "object" || job === null || !("steps" in job)) continue;
        const steps = job.steps;
        if (!Array.isArray(steps)) continue;
        for (const step of steps) {
          if (typeof step !== "object" || step === null || !("run" in step)) continue;
          const body = step.run;
          if (typeof body !== "string") continue;
          for (const invocation of invocationsOf(body)) {
            invoked.add(invocation.split(" ")[0] ?? "");
          }
        }
      }
    }
    expect(invoked.size, "the shipped tree must invoke something").toBeGreaterThan(0);
    expect(
      [...HARMLESS_PROGRAMS].filter((program) => !invoked.has(program)).sort(),
      "a by-name program the shipped tree never invokes is a slot a future edit can fill unread",
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
    // Per action since round 15, so the channel must be shut for every one of them: a flat set let each
    // action accept the other two's inputs, and `arguments` on any of the three is the same channel.
    const carriesBuildInput = [...ALLOWED_ACTION_INPUTS].flatMap(([action, inputs]) =>
      ["arguments", "args", "run"]
        .filter((key) => inputs.has(key))
        .map((key) => `${action}: ${key}`),
    );
    expect(
      carriesBuildInput,
      "`arguments`, `args` and `run` are the channels a `uses:` build arrives by, on any action",
    ).toEqual([]);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SHIPPED_WORKFLOW_NAMES } from "../../src/cli/commands/init.js";
import { shapeValueLiterals } from "../integration/shippedWorkflowShape.js";

// What the two READMEs state as fact. A README claim is pinned here and nowhere
// else, so an edit to either file has one test file to check. A claim that
// names a command, a flag, a path or a finding code is a fact; the wording of a
// sentence is not pinned.

const repoRoot = path.resolve(process.cwd(), "..", "..");
const READMES = [
  path.join(repoRoot, "README.md"),
  path.join(repoRoot, "packages", "qfai", "README.md"),
];

describe("README facts", () => {
  it("names package.json#packageManager as the pnpm version source", async () => {
    for (const readmePath of READMES) {
      const readme = await readFile(readmePath, "utf-8");
      expect(readme, readmePath).toContain("package.json#packageManager");
    }
  });

  it("documents every CI workflow `qfai init` installs in both READMEs", async () => {
    expect(SHIPPED_WORKFLOW_NAMES.size).toBeGreaterThan(0);
    const invocations = shapeValueLiterals();
    expect(
      invocations.length,
      "the declared shape exposes no invocation to check for",
    ).toBeGreaterThan(0);

    for (const readmePath of READMES) {
      const readme = await readFile(readmePath, "utf-8");
      const label = path.relative(repoRoot, readmePath);

      for (const name of SHIPPED_WORKFLOW_NAMES) {
        expect(readme, `${label} must name .github/workflows/${name}`).toContain(
          `.github/workflows/${name}`,
        );
      }
      // Derived, never restated. The declared shape is the one oracle for the
      // lane's subcommand / profile / threshold (the contract's DTC-5), so
      // spelling the invocation here would make this a second one — and would
      // go stale silently the day the shape changed it.
      for (const invocation of invocations) {
        expect(readme, `${label} must state the gate a shipped workflow runs`).toContain(
          invocation,
        );
      }
    }
  });

  it("keeps npm README onboarding consistent", async () => {
    const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const readme = await readFile(readmePath, "utf-8");
    const sanitized = readme.replace(/https?:\/\/\S+/g, "");

    expect(readme).toContain("npx qfai init");
    expect(readme).toContain("npx qfai validate");
    expect(readme).toContain("npx qfai report");
    expect(readme).toContain("npx qfai doctor");
    expect(readme).toContain("validate.json");
    expect(readme).toContain("report.json");
    expect(readme).toContain("doctor.json");
    expect(sanitized).not.toContain("docs/schema");
    expect(sanitized).not.toContain("docs/examples");
  });

  it("documents every qfai init flag in both READMEs", async () => {
    const readmes = await Promise.all(READMES.map((readmePath) => readFile(readmePath, "utf-8")));

    // Backticked tokens only: prose mentions such as `npx qfai init --force`
    // do not count as documenting the flag. `--dir <path>` is documented with
    // its value placeholder inside the same span, so a trailing space closes
    // the token just as a backtick does.
    const documentsFlag = (readme: string, flag: string): boolean =>
      readme.includes(`\`${flag}\``) || readme.includes(`\`${flag} `);

    for (const readme of readmes) {
      // The remedy the deprecation finding prints at operators.
      expect(readme).toContain("D-DEPRECATED-PATH");
    }

    // SSOT drift guard: the documented set is DERIVED from the actual flag
    // registration, not hand-maintained. `main.ts` decides which parsed
    // options `runInit` receives, and `args.ts` decides which `--flag`
    // writes each of those options — so a new init flag added to the parser
    // and wired into `runInit` fails this test until both READMEs list it,
    // whether or not the CLI ever prints guidance mentioning it.
    const mainSource = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "main.ts"),
      "utf-8",
    );
    const argsSource = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "lib", "args.ts"),
      "utf-8",
    );

    // 1. Which ParsedArgs options does the `init` command consume?
    const initCase = /case "init":([\s\S]*?)\breturn;/.exec(mainSource);
    expect(initCase, 'main.ts must keep a `case "init":` dispatch block').not.toBeNull();
    const initOptionKeys = collectOptionKeys(initCase?.[1] ?? "");
    expect(initOptionKeys.size).toBeGreaterThan(0);

    // 1b. `qfai init --help` never reaches the switch: main.ts answers the
    //     common help flags in the guard above the dispatch, so scanning only
    //     `case "init":` would let both READMEs drop `--help` / `-h` while the
    //     test name still promises "every qfai init flag". Derive that guard's
    //     options too — they apply to every command, `init` included.
    const preDispatch = mainSource.slice(0, mainSource.indexOf("switch (command) {"));
    expect(preDispatch.length, "main.ts must keep a `switch (command) {` dispatch").toBeGreaterThan(
      0,
    );
    const commonOptionKeys = collectOptionKeys(preDispatch);

    // 1c. Options the PARSER folds into an init option after the switch.
    //     `main.ts`'s `case "init":` hands `runInit` its `dir` and never names
    //     `options.root`, so an alias args.ts resolves on its own —
    //     `options.dir = options.root` under a `command === "init"` guard — is
    //     invisible to a derivation that reads main.ts alone. `--root` then
    //     decides where `qfai init` writes while this test, whose name promises
    //     "every qfai init flag", still calls it undocumented.
    for (const key of collectInitAliasSources(argsSource, initOptionKeys)) {
      initOptionKeys.add(key);
    }

    // 2. Which flag writes each of those options in the parser? Short aliases
    //    (`-h`) and fall-through label groups (`case "--help": case "-h":`)
    //    both count, so the help flags resolve to a real registration.
    const flagsByOption = mapCliFlagsToOptions(argsSource);

    // 3. Every flag that can set an init option must be documented in both
    //    READMEs. An init option with no flag at all means the derivation
    //    broke and is failed rather than skipped.
    const expectDocumented = (flag: string, why: string): void => {
      for (const readme of readmes) {
        expect(
          documentsFlag(readme, flag),
          `README must document the init flag ${flag} (${why})`,
        ).toBe(true);
      }
    };
    for (const key of initOptionKeys) {
      const flags = flagsByOption.get(key);
      expect(flags, `args.ts must register a --flag that sets options.${key}`).toBeDefined();
      expect((flags?.size ?? 0) > 0).toBe(true);
      for (const flag of flags ?? []) {
        expectDocumented(flag, `sets options.${key}`);
      }
    }

    // 3b. The pre-dispatch guard also reads parser-internal state that no flag
    //     writes (`options.invalidExitCode`), so only the flag-backed keys are
    //     required here — and at least one must survive, or the derivation rotted.
    const commonFlags = new Set<string>();
    for (const key of commonOptionKeys) {
      for (const flag of flagsByOption.get(key) ?? []) {
        commonFlags.add(flag);
      }
    }
    expect(
      commonFlags.size,
      "main.ts's pre-dispatch guard must resolve to at least one registered flag",
    ).toBeGreaterThan(0);
    for (const flag of commonFlags) {
      expectDocumented(flag, "handled before the init dispatch");
    }

    // Drift guard: any `qfai init --<flag>` the tool prints at operators must
    // be documented in both READMEs.
    const sources = await Promise.all(
      [
        path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "init.ts"),
        path.join(
          repoRoot,
          "packages",
          "qfai",
          "src",
          "core",
          "validators",
          "assistantTreeMigration.ts",
        ),
      ].map((sourcePath) => readFile(sourcePath, "utf-8")),
    );
    const printedFlags = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(/qfai init (--[a-z][a-z-]+)/g)) {
        const flag = match[1];
        if (flag !== undefined) {
          printedFlags.add(flag);
        }
      }
    }
    expect(printedFlags.size).toBeGreaterThan(0);
    for (const flag of printedFlags) {
      for (const readme of readmes) {
        expect(
          documentsFlag(readme, flag),
          `README must document the init flag ${flag} that the CLI prints`,
        ).toBe(true);
      }
    }
  });

  it("names the optional prototyping artifact and the prototype directory", async () => {
    for (const readmePath of READMES) {
      const readme = await readFile(readmePath, "utf-8");
      expect(readme, readmePath).toContain("prototyping.yaml");
      expect(readme, readmePath).toContain(".qfai/prototype/");
    }
  });
});

/** Every `options.<key>` the given slice of CLI source touches. */
function collectOptionKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const match of source.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)/g)) {
    const key = match[1];
    if (key !== undefined) {
      keys.add(key);
    }
  }
  return keys;
}

/** A token `args.ts` can register as a CLI flag: `--long` or a `-s` alias. */
const CLI_FLAG_TOKEN = /^-{1,2}[A-Za-z][A-Za-z0-9-]*$/;

/**
 * Flag alias sets `args.ts` declares as named constants, e.g.
 * `const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"])`.
 *
 * The parser tests these with `.has(...)` where it once carried switch labels,
 * so a derivation that reads only `case` labels resolves no flag at all for
 * the options such a guard writes.
 */
function collectFlagAliasSets(argsSource: string): Map<string, string[]> {
  const sets = new Map<string, string[]>();
  for (const declaration of argsSource.matchAll(
    /\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\b[^=\n]*=\s*new Set\(\s*\[([^\]]*)\]/g,
  )) {
    const name = declaration[1];
    const literals = declaration[2];
    if (name === undefined || literals === undefined) {
      continue;
    }
    const flags = [...literals.matchAll(/"([^"]+)"/g)]
      .map((literal) => literal[1])
      .filter((flag): flag is string => flag !== undefined && CLI_FLAG_TOKEN.test(flag));
    if (flags.length > 0) {
      sets.set(name, flags);
    }
  }
  return sets;
}

/** Net brace balance a single line contributes. */
function braceBalance(line: string): number {
  return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
}

/**
 * The option keys the parser copies INTO an init option under a
 * `command === "init"` guard — i.e. the sources of init's own aliases.
 *
 * `collectOptionKeys` reads `main.ts`, which is only half the derivation:
 * `args.ts` resolves `--root` into `options.dir` for `init` before `main.ts`
 * ever sees it, so the flag that decides where `qfai init` writes never
 * appears in the `case "init":` block. Following the assignment is what keeps
 * "every qfai init flag" true of aliases as well as of direct registrations.
 *
 * Restricted to assignments whose TARGET is already a known init option, so an
 * unrelated `command === "init"` guard cannot widen the documented set.
 */
function collectInitAliasSources(
  argsSource: string,
  initOptionKeys: ReadonlySet<string>,
): Set<string> {
  const sources = new Set<string>();
  for (const guard of argsSource.matchAll(
    /if\s*\(\s*command === "init"[\s\S]*?\)\s*\{([\s\S]*?)\n\s*\}/g,
  )) {
    for (const assignment of (guard[1] ?? "").matchAll(
      /options\.([A-Za-z][A-Za-z0-9]*)\s*=\s*options\.([A-Za-z][A-Za-z0-9]*)/g,
    )) {
      const target = assignment[1];
      const source = assignment[2];
      if (target !== undefined && source !== undefined && initOptionKeys.has(target)) {
        sources.add(source);
      }
    }
  }
  return sources;
}

/**
 * Map `options.<key>` -> the CLI flags that write it, read straight out of
 * `args.ts`. Two registration shapes count, because the parser uses both:
 * consecutive `case` labels sharing the body they fall through into
 * (`case "--help": case "-h":`), and a named alias set tested in a guard
 * (`if (arg !== undefined && HELP_FLAGS.has(arg)) {`). Short aliases are kept
 * in both, so a flag is only missing here when the parser really does not
 * register it.
 */
function mapCliFlagsToOptions(argsSource: string): Map<string, Set<string>> {
  const flagsByOption = new Map<string, Set<string>>();
  const aliasSets = collectFlagAliasSets(argsSource);
  let pendingFlags: string[] = [];
  let sawBody = false;
  // The alias set an enclosing guard is matching, and the depth at which its
  // block closes. Attribution is scoped to that block so a set cannot leak
  // onto the assignments that follow it.
  let guardFlags: readonly string[] = [];
  let guardDepth = 0;

  const record = (line: string, flags: readonly string[]): void => {
    if (flags.length === 0) {
      return;
    }
    for (const assignment of line.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)\s*=[^=]/g)) {
      const key = assignment[1];
      if (key === undefined) {
        continue;
      }
      const bucket = flagsByOption.get(key) ?? new Set<string>();
      for (const flag of flags) {
        bucket.add(flag);
      }
      flagsByOption.set(key, bucket);
    }
  };

  for (const line of argsSource.split("\n")) {
    if (guardFlags.length > 0) {
      record(line, guardFlags);
      guardDepth += braceBalance(line);
      if (guardDepth <= 0) {
        guardFlags = [];
      }
      continue;
    }
    // A single-line `if (... NAME.has(token)) {` guard over a known alias set.
    // Requiring the brace on the same line keeps the scan off `.has(...)` uses
    // that are not guards at all, such as the positional-token predicate.
    const guard =
      /^\s*(?:\}\s*else\s+)?if\s*\(.*\b([A-Za-z_][A-Za-z0-9_]*)\.has\(.*\)\s*\{\s*$/.exec(line);
    const guarded = guard === null ? undefined : aliasSets.get(guard[1] ?? "");
    if (guarded !== undefined) {
      guardFlags = guarded;
      guardDepth = 1;
      continue;
    }
    // A label line, with or without the block brace prettier keeps on it.
    const label = /^\s*(?:case "([^"]*)"|default)\s*:\s*\{?\s*$/.exec(line);
    if (label !== null) {
      if (sawBody) {
        pendingFlags = [];
        sawBody = false;
      }
      const flag = label[1];
      if (flag !== undefined && CLI_FLAG_TOKEN.test(flag)) {
        pendingFlags.push(flag);
      }
      continue;
    }
    if (line.trim().length === 0) {
      continue;
    }
    sawBody = true;
    record(line, pendingFlags);
  }

  return flagsByOption;
}

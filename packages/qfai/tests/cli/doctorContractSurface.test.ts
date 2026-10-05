/**
 * The `qfai doctor` CLI contract must describe the command that ships.
 *
 * The contract once declared a one-flag surface and called doctor read-only,
 * while the binary accepted `--clean` and `--autoremediate`, which rewrite the
 * root `.gitignore` and remove run logs. A contract that does not know a flag exists cannot gate a
 * change to what that flag writes.
 *
 * These assertions read the contract's business rules against the parser, so
 * a doctor-only flag added to `args.ts` fails here until a rule names it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";

// tests/cli/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CONTRACT = path.join(
  repoRoot,
  ".qfai",
  "spec",
  "03_contract",
  "cli",
  "cli-0008-qfai-doctor.md",
);
const ARGS = path.join(repoRoot, "packages", "qfai", "src", "cli", "lib", "args.ts");

/**
 * The flags `main.ts` threads into `runDoctor` on the `doctor` branch. Kept
 * explicit rather than parsed: the option names on the call site are camelCase
 * (`doctorClean`), and the contract declares the operator-facing spelling.
 */
const THREADED_FLAGS = [
  "--profile",
  "--format",
  "--out",
  "--fail-on",
  "--clean",
  "--autoremediate",
  "--dry-run",
  "--yes",
] as const;

/** Every business-rule statement of the doctor contract, keyed by rule ID. */
async function readRules(): Promise<Map<string, string>> {
  const text = await readFile(CONTRACT, "utf-8");
  const scan = parseContractRules(CONTRACT, text);
  expect(scan.errors).toEqual([]);
  return new Map(scan.rules.map((rule) => [rule.id, rule.statement]));
}

/** The one rule whose statement holds every needle. */
function ruleWith(rules: Map<string, string>, ...needles: string[]): string {
  const found = [...rules.values()].find((statement) =>
    needles.every((needle) => statement.includes(needle)),
  );
  expect(found, `no doctor business rule states all of: ${needles.join(" | ")}`).toBeDefined();
  return found ?? "";
}

/** The rule that declares the command's options. */
function optionsRule(rules: Map<string, string>): string {
  return ruleWith(rules, "`qfai doctor` accepts");
}

/** Flags whose parser branch is gated on `command === "doctor"`. */
function doctorOnlyFlags(argsSource: string): string[] {
  const found = new Set<string>();
  const re = /case "(--[a-z0-9-]+)":\s*\{\s*if \(command === "doctor"\)/gu;
  let match = re.exec(argsSource);
  while (match !== null) {
    const flag = match[1];
    if (flag !== undefined) {
      found.add(flag);
    }
    match = re.exec(argsSource);
  }
  return [...found].sort();
}

/**
 * The values the parser's `--fail-on` branch accepts.
 *
 * Read out of the source rather than hard-coded: the point of the assertion is
 * that the contract's enumeration and the parser's cannot drift, and a list
 * repeated in the test would drift with neither.
 */
function failOnValues(argsSource: string): string[] {
  const branch = /case "--fail-on": \{([\s\S]*?)\n {6}\}/u.exec(argsSource);
  const body = branch?.[1] ?? "";
  const found = new Set<string>();
  const re = /next === "([a-z-]+)"/gu;
  let match = re.exec(body);
  while (match !== null) {
    const value = match[1];
    if (value !== undefined) {
      found.add(value);
    }
    match = re.exec(body);
  }
  return [...found].sort();
}

describe("`qfai doctor` CLI contract surface", () => {
  it("says what doctor deletes, and that nothing else is deleted", async () => {
    // A reader deciding whether the command is reversible must get one
    // answer: a TTL-expired run log is removed, and nothing else is.
    const rules = await readRules();

    ruleWith(rules, "`--clean` removes each `<outDir>/run-<ts>/`");
    ruleWith(rules, "A run log is the one thing doctor deletes", "nothing else is deleted");
    for (const statement of rules.values()) {
      expect(statement).not.toMatch(/does NOT delete anything|no path is removed on any flag/);
    }
  });

  it("declares every flag the doctor branch threads into runDoctor", async () => {
    const statement = optionsRule(await readRules());

    for (const flag of THREADED_FLAGS) {
      expect(statement).toContain(flag);
    }
  });

  it("declares every doctor-only flag the parser accepts", async () => {
    const [rules, argsSource] = await Promise.all([readRules(), readFile(ARGS, "utf-8")]);
    const statement = optionsRule(rules);
    const parserFlags = doctorOnlyFlags(argsSource);

    // Guard the guard: if the parser shape changes so nothing matches, the
    // loop below would pass vacuously.
    expect(parserFlags).toContain("--clean");
    expect(parserFlags).toContain("--autoremediate");
    for (const flag of parserFlags) {
      expect(statement).toContain(flag);
    }
  });

  it("enumerates every `--fail-on` value the parser accepts", async () => {
    const [rules, argsSource] = await Promise.all([readRules(), readFile(ARGS, "utf-8")]);
    const statement = optionsRule(rules);
    const values = failOnValues(argsSource);

    // Guard the guard: an unmatched branch would make the loop vacuous.
    expect(values).toContain("never");
    expect(values).toContain("error");
    for (const value of values) {
      expect(statement).toContain(`\`${value}\``);
    }
  });

  it("declares the `--out` write, which needs neither mutating flag", async () => {
    // `runDoctor` creates the parent directories and writes the file on any
    // invocation carrying `--out`, so "doctor writes nothing unless --clean or
    // --autoremediate" would be false for the one write an operator names.
    const rules = await readRules();

    const out = ruleWith(rules, "With `--out <path>`");
    expect(out).toContain("missing parent directories are created");
    expect(out).toContain("with or without `--clean` or `--autoremediate`");
    ruleWith(rules, "read-only by default", "the `--out` file is its only write");
  });

  it("puts npm lifecycle scripts outside the listed side effects", async () => {
    // The install spawns `npm install <name>` with no `--ignore-scripts`, so
    // the package's hooks run as the operator. Claiming the remediation is
    // bounded by the listed paths without that carve-out overstates it.
    const statement = ruleWith(await readRules(), "without `--ignore-scripts`");

    expect(statement).toContain("`postinstall`");
    expect(statement).toContain("can write outside the paths doctor lists");
  });

  it("conditions the `.gitignore` rewrite on the block being missing or stale", async () => {
    // The rewrite returns early, writing nothing, when the marker, the
    // governance negations, their ordering and the absence of legacy lines
    // all hold, so a repeat run produces no diff.
    const rules = await readRules();

    ruleWith(rules, "`<root>/.gitignore`", "when the block is missing or stale");
    ruleWith(rules, "The `.gitignore` rewrite writes nothing when", "byte-identical");
  });

  it("names every path the mutating flags write", async () => {
    const rules = await readRules();
    const writes = ruleWith(rules, "`--autoremediate` writes only these paths");

    for (const written of [
      "`<root>/.gitignore`",
      "`<outDir>/run-<ts>/` removed",
      "`npm install <name>`",
      // The `npm install` has no `--no-save`, so it lands on tracked files too.
      "`package.json`",
      "`package-lock.json`",
    ]) {
      expect(writes).toContain(written);
    }
    // The CI suppression an operator relies on before running this in a lane.
    ruleWith(rules, "`--autoremediate` is off", "`GITHUB_ACTIONS=true`");
  });

  it("declares the dry-run plan as decided, not assumed", async () => {
    const statement = ruleWith(await readRules(), "`--dry-run` applies to `--clean` and");

    expect(statement).toContain("only the changes that pass would make");
    expect(statement).toContain("would remove -> <run id>");
    expect(statement).toContain("writes nothing");
  });

  it("keeps the `--yes` confirmation gate as a requirement", async () => {
    // Wording that froze a non-interactive binary into the contract would make
    // an unattended install-and-write the specified behaviour, not a defect.
    const statement = ruleWith(await readRules(), "`--yes` skips it");

    expect(statement).toContain("Interactive confirmation is required by default");
    expect(statement).not.toContain("changes no behavior on its own");
  });

  it("describes `--out` as redirecting stdout rather than duplicating it", async () => {
    // `runDoctor` writes the summary to the file and prints only
    // `doctor: wrote <path>`, so under `--format json` the stdout line is not JSON.
    const statement = ruleWith(await readRules(), "With `--out <path>`");

    expect(statement).toContain("instead of stdout");
    expect(statement).toContain("doctor: wrote <absolute path>");
  });
});

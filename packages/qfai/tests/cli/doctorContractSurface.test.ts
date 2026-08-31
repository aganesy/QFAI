/**
 * The `qfai doctor` CLI contract must describe the command that ships.
 *
 * `.qfai/contracts/cli/qfai-doctor.md` declared a one-flag surface
 * (`qfai doctor [--profile <name>]`), labelled its inputs "read; never
 * written", and asserted in Non-goals that doctor "is read-only". The binary
 * accepts `--clean` and `--autoremediate` as well, and those two rewrite
 * `qfai.config.yaml`, the root `.gitignore`, and rename directories under
 * `.qfai/review/`. A contract that does not know a flag exists cannot gate a
 * change to what that flag writes, so the two flags with the widest blast
 * radius were the two with no declared behaviour.
 *
 * These assertions read the contract against the parser and the module tree,
 * so a doctor-only flag added to `args.ts` — or a module added under
 * `src/core/doctor/` — fails here until the contract names it.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/cli/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const CONTRACT = path.join(repoRoot, ".qfai", "contracts", "cli", "qfai-doctor.md");
const ARGS = path.join(repoRoot, "packages", "qfai", "src", "cli", "lib", "args.ts");
const DOCTOR_MODULE_DIR = path.join(repoRoot, "packages", "qfai", "src", "core", "doctor");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/gu, " ");

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

/** The `### \`qfai doctor ...\`` command-shape heading. */
function commandShapeHeading(contract: string): string {
  const line = contract.split("\n").find((candidate) => candidate.startsWith("### `qfai doctor"));
  return line ?? "";
}

describe("`qfai doctor` CLI contract surface", () => {
  it("declares every flag the doctor branch threads into runDoctor", async () => {
    const contract = await readFile(CONTRACT, "utf-8");
    const heading = commandShapeHeading(contract);

    expect(heading).not.toBe("");
    for (const flag of THREADED_FLAGS) {
      expect(heading).toContain(flag);
    }
  });

  it("declares every doctor-only flag the parser accepts", async () => {
    const [contract, argsSource] = await Promise.all([
      readFile(CONTRACT, "utf-8"),
      readFile(ARGS, "utf-8"),
    ]);
    const heading = commandShapeHeading(contract);
    const parserFlags = doctorOnlyFlags(argsSource);

    // Guard the guard: if the parser shape changes so nothing matches, the
    // loop below would pass vacuously.
    expect(parserFlags).toContain("--clean");
    expect(parserFlags).toContain("--autoremediate");
    for (const flag of parserFlags) {
      expect(heading).toContain(flag);
    }
  });

  it("enumerates every `--fail-on` value the parser accepts", async () => {
    const [contract, argsSource] = await Promise.all([
      readFile(CONTRACT, "utf-8"),
      readFile(ARGS, "utf-8"),
    ]);
    const heading = commandShapeHeading(contract);
    const values = failOnValues(argsSource);

    // Guard the guard: an unmatched branch would make the loop vacuous.
    expect(values).toContain("never");
    expect(values).toContain("error");
    for (const value of values) {
      expect(heading).toContain(value);
    }
  });

  it("declares the `--out` write, which needs neither mutating flag", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // `runDoctor` mkdir -p's the parent and writes the file on any invocation
    // carrying `--out`, so "doctor writes nothing unless --clean or
    // --autoremediate" was false for the one write an operator asks for by
    // name.
    expect(contract).not.toContain("Doctor writes nothing unless `--clean` or `--autoremediate`");
    expect(contract).toContain("### `--out <path>`");
    expect(contract).toContain("created recursively");
  });

  it("puts npm lifecycle scripts outside the enumerated side-effect boundary", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // `defaultInstallRunner` spawns `npm install <name>` with no
    // `--ignore-scripts`, so the package's preinstall / install / postinstall /
    // prepare hooks run as the operator. Claiming the remediation is "bounded
    // by the paths enumerated" without that carve-out overstates the guarantee.
    expect(contract).not.toContain(
      'are bounded by the paths enumerated under "Side effects (written)"',
    );
    expect(contract).toContain("Install scripts are an UNBOUNDED side effect");
    expect(contract).toContain("without `--ignore-scripts`");
    expect(contract).toContain("`postinstall`");
  });

  it("conditions the `.gitignore` rewrite on the block being missing or stale", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // `ensureRootGitignoreEntries` returns early — writing nothing — when the
    // marker, the governance negations, their ordering and the absence of
    // legacy lines all hold, so an `always` row promised a diff a repeat run
    // does not produce.
    expect(contract).toContain("the managed block is missing or stale");
    expect(contract).toContain("returns early");
    expect(contract).toContain("byte-identical");
  });

  it("scopes the read-only claim instead of asserting it unconditionally", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    expect(contract).not.toContain("does NOT attempt repairs. It is read-only.");
    expect(contract).toContain("read-only BY DEFAULT");
    expect(contract).toContain("## Side effects (written)");
  });

  it("names every path the mutating flags write", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // `--autoremediate`
    expect(contract).toContain("`qfai.config.yaml`");
    expect(contract).toContain("`<root>/.gitignore`");
    expect(contract).toContain("`npm install <name>`");
    // The `npm install` has no `--no-save`, so it lands on tracked files too.
    expect(contract).toContain("`package.json`");
    expect(contract).toContain("`package-lock.json`");
    // Both halves of the legacy-pack migration, not the manifest alone.
    expect(contract).toContain("`.qfai/review/.legacy-packs`");
    expect(contract).toContain("`.qfai/review/review-<ts>/summary.json`");
    // `--clean`
    expect(contract).toContain("`.qfai/review/_archive/`");
    // The CI suppression an operator relies on before running this in a lane.
    expect(contract).toContain("disables `--autoremediate`");
    expect(contract).toContain("`GITHUB_ACTIONS=true`");
    // `--dry-run` / `--yes` semantics, absent entirely before this.
    expect(contract).toContain("### `--dry-run` / `--yes` interaction");
  });

  it("declares the dry-run plan as decided, not assumed", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // The config-fill preview used to be a fixed line printed without reading
    // the config, so it promised an append for a config that already declared
    // the key and for one that does not parse. The contract must say a `would`
    // line is a commitment, and name the two answers a live run gives instead.
    expect(contract).toContain("The plan is DECIDED, not assumed");
    expect(contract).toContain("would fill default-keyed config fields: review");
    expect(contract).toContain("config-fill not needed, default-keyed fields present");
  });

  it("keeps the `--yes` confirmation gate as a requirement, not a retracted one", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // The gate the owning spec mandates must still read as mandatory. The
    // pre-fix wording ("non-interactive today, so `--yes` ... changes no
    // behavior") froze the unimplemented state into the contract, which
    // would have made an unattended install-and-write the specified
    // behaviour rather than a defect.
    expect(contract).not.toContain("changes no behavior on its own");
    expect(contract).toContain("REQUIRES by default");
    expect(contract).toContain("Known implementation deviation:");
  });

  it("describes `--out` as redirecting stdout rather than duplicating it", async () => {
    const contract = flat(await readFile(CONTRACT, "utf-8"));

    // `runDoctor` writes the summary to the file and prints only
    // `doctor: wrote <path>`, so the summary is never on both channels — and
    // under `--format json` the stdout line is not JSON.
    expect(contract).not.toContain("writes the rendered summary to `<path>` in addition to stdout");
    expect(contract).toContain("INSTEAD of stdout");
    expect(contract).toContain("doctor: wrote <absolute path>");
  });

  it("lists the core/doctor modules that exist on disk", async () => {
    const [contract, entries] = await Promise.all([
      readFile(CONTRACT, "utf-8"),
      readdir(DOCTOR_MODULE_DIR),
    ]);
    const modules = entries.filter((name) => name.endsWith(".ts") && !name.endsWith(".d.ts"));

    expect(modules.length).toBeGreaterThan(0);
    expect(flat(contract)).not.toContain("there is no `core/doctor/` directory");
    for (const moduleName of modules) {
      expect(contract).toContain(`\`${moduleName}\``);
    }
  });
});

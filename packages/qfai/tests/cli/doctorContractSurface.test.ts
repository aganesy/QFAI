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
    // `--clean`
    expect(contract).toContain("`.qfai/review/_archive/`");
    // The CI suppression an operator relies on before running this in a lane.
    expect(contract).toContain("`CI=true` disables `--autoremediate`");
    // `--dry-run` / `--yes` semantics, absent entirely before this.
    expect(contract).toContain("### `--dry-run` / `--yes` interaction");
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

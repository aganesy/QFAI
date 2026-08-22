import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * CLI contracts must not use a release version as their tracking mechanism.
 *
 * A note of the shape "NOT YET IMPLEMENTED in vX.Y.Z — scheduled for vA.B.C+"
 * expires silently: the only way to notice the deadline arrived is to diff the
 * contract against `packages/qfai/package.json#version`. `qfai-init.md` carried
 * two such notes (`--allow-dirty`, exit 65) whose target version shipped with
 * neither behaviour implemented. Either a contract describes what the code does
 * today, or it points at a tracking issue — never at a version number.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");
const CONTRACTS_DIR = path.join(ROOT, ".qfai", "contracts");

/** Deferral markers that pin a promise to a release rather than to an issue. */
const DEFERRAL_MARKERS: readonly RegExp[] = [
  /NOT YET IMPLEMENTED/i,
  /scheduled for v\d+\.\d+\.\d+/i,
];

async function collectFiles(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(full);
    }
  }
  return files;
}

describe("CLI contracts do not defer behaviour to a version number", () => {
  it("no contract carries a version-pinned deferral note", async () => {
    const files = await collectFiles(CONTRACTS_DIR, ".md");
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (DEFERRAL_MARKERS.some((marker) => marker.test(line))) {
          offenders.push(`${path.relative(ROOT, file).replace(/\\/g, "/")}:${index + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});

describe("qfai-init.md matches what --upgrade-assistant-tree actually does", () => {
  const contractPath = path.join(CONTRACTS_DIR, "cli", "qfai-init.md");
  const initSourcePath = path.join(ROOT, "packages", "qfai", "src", "cli", "commands", "init.ts");

  it("documents that the helper does not inspect the working tree, and no --allow-dirty exists", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");
    const args = await readFile(
      path.join(ROOT, "packages", "qfai", "src", "cli", "lib", "args.ts"),
      "utf-8",
    );

    // The contract must state the absence plainly, not promise a future flag.
    expect(contract).toMatch(/Working tree state is NOT inspected/);
    expect(contract).not.toMatch(/`--allow-dirty` is supplied/);

    // …and the source must actually still lack the flag and the probe. If
    // either is implemented, the contract above is the thing to update.
    expect(source).not.toMatch(/allowDirty|allow-dirty/);
    expect(source).not.toMatch(/status\s+--porcelain/);
    expect(args).not.toMatch(/allowDirty|allow-dirty/);
  });

  it("documents the catalog fallback instead of an unreachable exit 65", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    // The `--upgrade-assistant-tree` exit-code table must not promise a code
    // the helper cannot emit.
    const additional = contract.split("Exit codes (additional):")[1] ?? "";
    expect(additional).not.toMatch(/^\|\s*65\s*\|/m);
    expect(additional).toMatch(/catalog/);

    // The fallback the contract now documents is the classifier's last
    // statement; covered behaviourally by tests/cli/init.test.ts
    // ("leaves non-top-level migrations segments in catalog/").
    expect(source).toMatch(/return \{ layer: "catalog", subpath: posix \};/);
  });

  // The `catalog/` fallback only reaches files the helper actually walks, and
  // the pre-recut `manifest/` surface is deliberately not one of them (its path
  // is unchanged by the recut). A contract that promises "any legacy path" is
  // wrong for exactly the surface whose rationale it quotes.
  it("scopes the relocation to the surfaces runUpgradeAssistantTree walks", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`\.qfai\/assistant\/manifest\/\*` is \*\*not\*\* walked/);
    expect(source).toMatch(
      /const legacySurfaces: Array<\{ name: "steering" \| "instructions"; dir: string \}>/,
    );
  });

  // `report` prints copies as a count and enumerates paths only for skipped /
  // removed, so a contract cannot send the operator to a "copied-path list".
  it("does not point the operator at a copied-path list the run never prints", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).not.toMatch(/copied-path list/);
    expect(contract).toMatch(/git status --short \.qfai\/assistant\//);

    expect(source).toMatch(/info\(`\s+created: \$\{copied\.length\}`\)/);
    expect(source).not.toMatch(/copied paths:/);
  });

  // `--upgrade-assistant-tree` falls through into the ordinary init flow, which
  // rewrites the managed `.gitignore` block in place and (with `--force`, which
  // is not rejected alongside it) regenerates and deletes files. The contract
  // must scope "additive" to the migration step rather than to the invocation.
  it("separates the additive migration step from the init flow that follows it", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`ensureRootGitignoreEntries`/);
    expect(contract).toMatch(/`--force` is not rejected alongside `--upgrade-assistant-tree`/);

    // The non-additive step the contract now names really is on this path.
    expect(source).toMatch(/await ensureRootGitignoreEntries\(destRoot, options\.dryRun\)/);
  });
});

/**
 * A finding code documented with no emitter is the same failure mode as a
 * version-pinned deferral: the contract promises behaviour, nothing produces
 * it, and no mechanism notices. `E-WORKLOG-SECRET` sat in the delta table as a
 * security hard block that no validator raises, so the table is now checked
 * against the source that would have to emit each code.
 */
describe("qfai-validate.md documents only finding codes the source can emit", () => {
  it("every code in the delta table appears somewhere under src/", async () => {
    const contract = await readFile(path.join(CONTRACTS_DIR, "cli", "qfai-validate.md"), "utf-8");
    const section = contract.split("## New finding codes (this delta)")[1] ?? "";
    const table = section.split(/^## /m)[0] ?? "";

    const codes = [...table.matchAll(/^\|\s*`([A-Z]-[A-Z0-9-]+)`/gm)]
      .map((match) => match[1] ?? "")
      .filter((code) => code.length > 0);
    expect(codes.length).toBeGreaterThan(5);

    const sourceFiles = await collectFiles(path.join(ROOT, "packages", "qfai", "src"), ".ts");
    const bodies = await Promise.all(sourceFiles.map((file) => readFile(file, "utf-8")));
    const haystack = bodies.join("\n");

    const orphans = codes.filter((code) => !haystack.includes(code));
    expect(orphans).toEqual([]);
  });
});

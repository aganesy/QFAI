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

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

describe("CLI contracts do not defer behaviour to a version number", () => {
  it("no contract carries a version-pinned deferral note", async () => {
    const files = await collectMarkdownFiles(CONTRACTS_DIR);
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
});

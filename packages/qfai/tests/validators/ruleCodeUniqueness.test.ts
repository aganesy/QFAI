import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const validatorsRoot = path.resolve(process.cwd(), "src", "core", "validators");

/**
 * Rule codes already emitted from more than one module when this guard was
 * introduced. They are pre-existing collisions, not permission to add more —
 * each needs its own split, tracked separately from #241.
 */
const KNOWN_COLLISIONS = new Set(["QFAI-BFLOW-003"]);

const CODE_LITERAL = /issue\(\s*(?:\/\/[^\n]*\n\s*)*"([A-Z][A-Z0-9_]*(?:-[A-Z0-9]+)+)"/g;

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

describe("validator rule codes are owned by exactly one module", () => {
  it("no rule code is emitted from two different validator files", async () => {
    const files = await collectTsFiles(validatorsRoot);
    expect(files.length).toBeGreaterThan(0);

    const owners = new Map<string, Set<string>>();
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      const relative = path.relative(validatorsRoot, file).replace(/\\/g, "/");
      for (const match of source.matchAll(CODE_LITERAL)) {
        const code = match[1];
        if (code === undefined) {
          continue;
        }
        const set = owners.get(code) ?? new Set<string>();
        set.add(relative);
        owners.set(code, set);
      }
    }

    // Sanity: the scan must actually find codes, or the assertion is vacuous.
    expect(owners.size).toBeGreaterThan(100);

    const collisions = Array.from(owners)
      .filter(([code, files_]) => files_.size > 1 && !KNOWN_COLLISIONS.has(code))
      .map(([code, files_]) => `${code} -> ${Array.from(files_).sort().join(", ")}`)
      .sort();

    expect(
      collisions,
      "a rule code is the public contract of `qfai validate`; sharing one across unrelated checks makes findings impossible to grep, filter or waive apart",
    ).toEqual([]);
  });

  it("the screen-id casing check and specsCovered linkage no longer share a code", async () => {
    const casing = await readFile(path.join(validatorsRoot, "prototypingEvidence.ts"), "utf-8");
    const linkage = await readFile(
      path.join(validatorsRoot, "prototyping", "specIdLinkage.ts"),
      "utf-8",
    );

    expect(casing).toContain('"QFAI-PROT-010"');
    expect(linkage).toContain('"QFAI-PROT-008"');
    expect(linkage).not.toContain('"QFAI-PROT-010"');
  });
});

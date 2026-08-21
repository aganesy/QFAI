/**
 * Constitution documents were cited under four different base paths.
 *
 * The same file was written `.qfai/assistant/constitution/x.md`, `x.md`,
 * `constitution/x.md` and `../../../constitution/x.md` — sometimes two forms
 * eight lines apart in one file — and no shipped document said which base a
 * reader should resolve against. Nineteen of those citations resolved against
 * none of the plausible bases: not the citing file's directory, not the
 * assistant root, not the project root. Every one of them is a routing
 * instruction, so an agent following one either stops or guesses.
 *
 * The convention is now stated in `shared-skill-operating-baseline.md` and
 * checked here: a constitution document is always cited by its full path from
 * the project root, the one form that resolves from every directory in the tree
 * and from the cwd an agent actually has.
 */

import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const CANONICAL_PREFIX = ".qfai/assistant/constitution/";

/** Inline-code spans that name a markdown file, with an optional anchor. */
const CITATION = /`([^`\s]+\.md)(#[^`\s]*)?`/g;

interface Citation {
  readonly location: string;
  readonly cited: string;
}

async function constitutionFilenames(tree: string): Promise<ReadonlySet<string>> {
  const dir = path.join(repoRoot, tree, "assistant", "constitution");
  const entries = await readdir(dir, { withFileTypes: true });
  return new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
}

/**
 * Every citation of a constitution document found under `assistant/`.
 *
 * Filtering by basename is what keeps runtime artifact paths (`test-list.md`,
 * `.qfai/evidence/implement-<spec-id>.md`) out — those correctly do not exist
 * in the shipped tree.
 */
async function collectCitations(tree: string): Promise<readonly Citation[]> {
  const names = await constitutionFilenames(tree);
  const assistant = path.join(repoRoot, tree, "assistant");
  const files = await fg(["**/*.md"], { cwd: assistant, absolute: false });
  const found: Citation[] = [];
  for (const relative of files.sort()) {
    const text = await readFile(path.join(assistant, relative), "utf-8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === undefined) continue;
      for (const match of line.matchAll(CITATION)) {
        const cited = `${match[1]}${match[2] ?? ""}`;
        if (!names.has(path.posix.basename(match[1] ?? ""))) continue;
        found.push({ location: `${tree}/assistant/${relative}:${i + 1}`, cited });
      }
    }
  }
  return found;
}

describe.each(QFAI_TREES)("%s constitution citations", { timeout: 30000 }, (tree) => {
  it("states the base path convention where the authoring shape is defined", async () => {
    // Without this the convention is folklore, and the next author picks
    // whichever of the four forms the file they copied from happened to use.
    const baseline = await readFile(path.join(repoRoot, tree, BASELINE), "utf-8");
    expect(baseline).toContain("## Citation Path Form (Mandatory)");
    expect(baseline).toContain("`.qfai/assistant/constitution/drift-protocol.md`");
    expect(baseline).toContain("Write the path from the project root");
  });

  it("cites every constitution document by its full path from the project root", async () => {
    const offenders = (await collectCitations(tree))
      .filter((citation) => !citation.cited.startsWith(CANONICAL_PREFIX))
      .map((citation) => `${citation.location}  \`${citation.cited}\``);
    expect(offenders).toEqual([]);
  });

  it("resolves every constitution citation against the project root", async () => {
    // The canonical form is only worth mandating if it actually resolves from
    // the base it names — the project root that contains this `.qfai` tree.
    const projectRoot = path.join(repoRoot, path.dirname(tree));
    const citations = await collectCitations(tree);
    expect(citations.length).toBeGreaterThan(100);
    const dangling: string[] = [];
    for (const citation of citations) {
      const withoutAnchor = citation.cited.split("#")[0] ?? "";
      if (!existsSync(path.join(projectRoot, withoutAnchor))) {
        dangling.push(`${citation.location}  \`${citation.cited}\``);
      }
    }
    expect(dangling).toEqual([]);
  });
});

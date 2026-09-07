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
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const CANONICAL_PREFIX = ".qfai/assistant/constitution/";

/**
 * Any path expression naming a markdown file, with an optional anchor.
 *
 * Deliberately not restricted to inline-code spans. A citation inside a fenced
 * work-order template, an HTML comment, a YAML comment or a bare sentence
 * routes an agent exactly the same way, and those forms are copied into
 * generated work orders and Change Requests verbatim. Scanning only backticked
 * spans left four base-less citations standing while this test passed.
 */
const CITATION = /(?:[\w.-]+\/)*[\w.-]+\.md(?:#[\w.-]*)?/g;

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
 * Every citation of a constitution document found under one `assistant/` tree.
 *
 * The manifest YAML is scanned alongside the markdown: `agent-catalog.yml`
 * carries whole agent cards as its `developer_instructions`, so a citation
 * there reaches an agent just as directly as one in the card itself.
 *
 * Two ways in, and the order matters. A citation carrying the canonical prefix
 * is claimed **whatever it names**, because the prefix is the claim: it says
 * "this is a constitution document" and the resolution check below is what
 * decides whether that is true. Recognising a citation only by the names the
 * directory currently holds made deletion self-concealing — retire or rename
 * `quality.md` and its three surviving citations stop being collected at all,
 * so the dangling check never sees them and the non-vacuity floor is still
 * cleared by the ~145 that remain.
 *
 * The filename set is then the second door, for the non-canonical short forms
 * (`x.md`, `constitution/x.md`, `../../../constitution/x.md`) that the
 * full-path rule exists to catch and that carry no prefix to recognise them
 * by. That is also what keeps runtime artifact paths (`test-list.md`,
 * `.qfai/evidence/implement-<spec-id>.md`) out — those correctly do not exist
 * in the shipped tree.
 */
async function citationsUnder(
  assistant: string,
  names: ReadonlySet<string>,
  label: string,
): Promise<readonly Citation[]> {
  const files = await fg(["**/*.md", "**/*.yml", "**/*.yaml"], { cwd: assistant, absolute: false });
  const found: Citation[] = [];
  for (const relative of files.sort()) {
    const text = await readFile(path.join(assistant, relative), "utf-8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === undefined) continue;
      for (const match of line.matchAll(CITATION)) {
        const cited = match[0];
        const withoutAnchor = cited.split("#")[0] ?? "";
        const canonical = cited.startsWith(CANONICAL_PREFIX);
        if (!canonical && !names.has(path.posix.basename(withoutAnchor))) continue;
        found.push({ location: `${label}/${relative}:${i + 1}`, cited });
      }
    }
  }
  return found;
}

async function collectCitations(tree: string): Promise<readonly Citation[]> {
  return await citationsUnder(
    path.join(repoRoot, tree, "assistant"),
    await constitutionFilenames(tree),
    `${tree}/assistant`,
  );
}

describe("the collector does not lose a citation when its document does", () => {
  /** A two-file assistant tree: one constitution document and one citer. */
  async function fixture(cited: string): Promise<{ dir: string; cleanup: () => Promise<void> }> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-citation-"));
    const assistant = path.join(dir, "assistant");
    await mkdir(path.join(assistant, "constitution"), { recursive: true });
    await mkdir(path.join(assistant, "skills", "qfai-x"), { recursive: true });
    await writeFile(
      path.join(assistant, "constitution", "drift-protocol.md"),
      "# Drift Protocol\n",
      "utf-8",
    );
    await writeFile(
      path.join(assistant, "skills", "qfai-x", "SKILL.md"),
      `Follow \`${cited}\` before proceeding.\n`,
      "utf-8",
    );
    return { dir, cleanup: async () => await rm(dir, { recursive: true, force: true }) };
  }

  it("collects a canonical citation of a document the directory no longer holds", async () => {
    // Retiring `quality.md` used to retire its dangling citations with it: the
    // basename was no longer in the constitution directory, so the collector
    // dropped them before the resolution check ran, and the ~145 survivors
    // kept the non-vacuity floor satisfied. Deletion has to make the citations
    // *fail*, not disappear.
    const { dir, cleanup } = await fixture(`${CANONICAL_PREFIX}quality.md`);
    try {
      const names = new Set(["drift-protocol.md"]);
      const found = await citationsUnder(path.join(dir, "assistant"), names, "fixture");
      expect(found.map((citation) => citation.cited)).toEqual([`${CANONICAL_PREFIX}quality.md`]);
    } finally {
      await cleanup();
    }
  });

  it("still ignores a runtime artifact path that names no constitution document", async () => {
    // The filename set is what keeps `tdd/test-list.md` and
    // `.qfai/evidence/implement-<spec-id>.md` out; widening the prefix door
    // must not open that one.
    const { dir, cleanup } = await fixture(".qfai/evidence/implement-spec-0001.md");
    try {
      const names = new Set(["drift-protocol.md"]);
      expect(await citationsUnder(path.join(dir, "assistant"), names, "fixture")).toEqual([]);
    } finally {
      await cleanup();
    }
  });
});

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

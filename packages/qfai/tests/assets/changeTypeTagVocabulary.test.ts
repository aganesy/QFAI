/**
 * The Change Type tag vocabulary has exactly one definition (#771, #792).
 *
 * `workflow.md` restated the tag list and offered a sixth value, `@ui`, that
 * the classification SSOT never defined and `CHANGE_TYPE_TAG_VALUES` never
 * accepted. `asTagArray` takes any string, `normalizeTag` returns `null` for
 * an unknown one and the report summary skips it, so an agent that followed
 * `workflow.md` had its tag accepted at write time and dropped at read time
 * with no diagnostic anywhere.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CHANGE_TYPE_TAG_VALUES } from "../../src/core/deltaV1.js";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const ASSISTANT = "assistant";
const WORKFLOW = "assistant/constitution/workflow.md";
const CLASSIFICATION = "assistant/constitution/change-classification.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** The tags a `` `@a @b` `` style list line offers, in the order it offers them. */
const tagsInListLine = (body: string, linePrefix: string): string[] => {
  const line = body.split(/\r?\n/).find((candidate) => candidate.startsWith(linePrefix));
  if (line === undefined) {
    throw new Error(`no line starting with ${JSON.stringify(linePrefix)}`);
  }
  return line.match(/@[a-z]+/g) ?? [];
};

/** The tags the `## 2. Tags (multi-select)` table defines a row for. */
const tagsInClassificationTable = (body: string): string[] =>
  body
    .split(/\r?\n/)
    .map((line) => /^\|\s*\*\*(@[a-z]+)\*\*/.exec(line)?.[1])
    .filter((tag): tag is string => tag !== undefined);

const markdownFilesUnder = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await markdownFilesUnder(full)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
};

describe("the Change Type tag list agrees with its SSOT", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: workflow.md offers exactly the tags change-classification.md defines`, async () => {
      const workflow = await read(tree, WORKFLOW);
      const classification = await read(tree, CLASSIFICATION);

      const declared = tagsInClassificationTable(classification);
      expect(declared).toEqual(["@api", "@db", "@nfr", "@docs", "@test"]);

      // The three restatements — the table, the PR-body list, and the
      // workflow line an agent actually reads — must be one vocabulary.
      expect(tagsInListLine(classification, "- Tags: list from")).toEqual(declared);
      expect(tagsInListLine(workflow, "- Tags (optional):")).toEqual(declared);
    });

    it(`${tree}: the shipped tag list matches CHANGE_TYPE_TAG_VALUES`, async () => {
      const workflow = await read(tree, WORKFLOW);

      // A tag the code cannot normalize is silently dropped from the report
      // summary, so prose must never offer one the constant omits.
      expect(tagsInListLine(workflow, "- Tags (optional):")).toEqual([...CHANGE_TYPE_TAG_VALUES]);
    });

    it(`${tree}: no undefined tag survives anywhere in the assistant tree`, async () => {
      const files = await markdownFilesUnder(path.join(repoRoot, tree, ASSISTANT));
      const known = new Set<string>(CHANGE_TYPE_TAG_VALUES);
      const offenders: string[] = [];

      for (const file of files) {
        const body = await readFile(file, "utf-8");
        for (const line of body.split(/\r?\n/)) {
          if (!/^-\s*Tags/.test(line)) {
            continue;
          }
          for (const tag of line.match(/@[a-z]+/g) ?? []) {
            if (!known.has(tag)) {
              offenders.push(`${path.relative(repoRoot, file)}: ${tag}`);
            }
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${tree}: workflow.md points at the classification SSOT`, async () => {
      const workflow = await read(tree, WORKFLOW);

      // Restating a list without naming its owner is how the lists drifted.
      expect(workflow).toContain("constitution/change-classification.md");
    });
  }
});

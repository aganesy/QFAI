/**
 * Constitution front matter convention (#770).
 *
 * `constitution/agent-selection.md` shipped an un-ported copy of the internal
 * authoring format: a hyphenated `update-frequency` key, a `version` marker and
 * a `dependencies` list whose targets (`02_project/**`) exist in no tree a
 * consumer receives. Nothing reads any of it, so no gate could ever report the
 * drift — only readers paid, by being sent to unresolvable paths.
 *
 * These tests pin the shipped convention instead: a constitution file either
 * carries no front matter, or carries exactly `id` / `category` /
 * `update_frequency`, with `id` equal to its own basename.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CONSTITUTION = "assistant/constitution";
const ALLOWED_KEYS = ["id", "category", "update_frequency"];

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Top-level YAML keys of a front-matter block; indented list items are skipped. */
const topLevelKeys = (block: string): string[] =>
  block
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z]/.test(line))
    .map((line) => line.slice(0, line.indexOf(":")))
    .filter((key) => key.length > 0);

const frontMatterOf = (content: string): string | undefined => {
  const match = FRONT_MATTER.exec(content);
  return match?.[1];
};

const constitutionFiles = async (tree: string): Promise<string[]> =>
  (await fg(["*.md"], { cwd: path.join(repoRoot, tree, CONSTITUTION) })).sort();

describe("constitution front matter follows one shipped convention", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: a front-matter block carries exactly the shipped key set`, async () => {
      const offenders: string[] = [];
      for (const file of await constitutionFiles(tree)) {
        const block = frontMatterOf(
          await readFile(path.join(repoRoot, tree, CONSTITUTION, file), "utf-8"),
        );
        if (block === undefined) {
          continue;
        }
        // Compare the key list itself, not just membership: a dropped key or a
        // duplicated one has to fail here too, not only an unknown key.
        const keys = topLevelKeys(block);
        if (keys.join(",") !== ALLOWED_KEYS.join(",")) {
          offenders.push(`${file}: [${keys.join(", ")}]`);
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${tree}: a front-matter block declares an id equal to its basename`, async () => {
      const offenders: string[] = [];
      for (const file of await constitutionFiles(tree)) {
        const block = frontMatterOf(
          await readFile(path.join(repoRoot, tree, CONSTITUTION, file), "utf-8"),
        );
        if (block === undefined) {
          continue;
        }
        const id = /^id:\s*(\S+)\s*$/m.exec(block)?.[1];
        if (id !== path.basename(file, ".md")) {
          offenders.push(`${file}: ${id ?? "(missing)"}`);
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${tree}: agent-selection.md carries the same schema as its siblings`, async () => {
      const block = frontMatterOf(
        await readFile(path.join(repoRoot, tree, CONSTITUTION, "agent-selection.md"), "utf-8"),
      );

      expect(block).toBeDefined();
      expect(topLevelKeys(block ?? "")).toEqual(ALLOWED_KEYS);
      // The dropped `dependencies` pointed at `02_project/**`, a root no
      // consumer has; the dropped `version` was the file's only version marker.
      // (Body citations of `.instruction/**` are a separate issue's scope.)
      expect(block).not.toContain("02_project/");
    });
  }
});

/**
 * `qfai-sdd` Critical Constraint 1 — the template whitelist.
 *
 * The constraint used to enumerate template subdirectories, which put it in a
 * race with the directory listing it describes: `templates/evidence/` shipped
 * with a usable `import-lite.md` while the constraint still named three
 * directories, so the correct behaviour under the shipped rules was to ignore
 * the template and invent a layout — the exact drift the "canonical file set is
 * defined by skill templates" sentence exists to prevent.
 *
 * These cases pin the shape that cannot drift: the constraint names the
 * directory, agrees with the Mandatory Outputs sentence, and states the one
 * cross-skill template reference the same file makes.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const TEMPLATES = "assistant/skills/qfai-sdd/templates";

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

describe("qfai-sdd's template whitelist covers what the skill ships", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Constraint 1 names the directory, not a list of subdirectories`, async () => {
      const skill = await read(tree, SKILL);
      expect(flat(skill)).toContain(
        "Use only templates under `.qfai/assistant/skills/qfai-sdd/templates/` — the whole directory, not an enumerated subset",
      );
    });

    it(`${tree}: no shipped template directory is outside the constraint`, async () => {
      // The regression this file exists for: a directory ships, the
      // enumeration is not updated, and the skill is told not to read it.
      const dirents = await readdir(path.join(repoRoot, tree, TEMPLATES), {
        withFileTypes: true,
      });
      const shipped = dirents.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      expect(shipped.length, "qfai-sdd ships no template directories").toBeGreaterThan(0);
      expect(shipped).toContain("evidence");

      const skill = flat(await read(tree, SKILL));
      // Bounds are searched on number-independent wording and asserted before
      // slicing. An `indexOf` miss returns -1, so `slice(-1, -1)` yields an
      // empty string and the enumeration check below would pass vacuously —
      // the test would go green on exactly the drift it exists to catch.
      const start = skill.indexOf("Use only templates under");
      const end = skill.indexOf("Always write the preflight summary");
      expect(start, "Constraint 1's opening wording moved").toBeGreaterThanOrEqual(0);
      expect(end, "the constraint after Constraint 1 moved").toBeGreaterThan(start);
      const constraint = skill.slice(start, end);
      // A per-directory enumeration inside the constraint is what drifts, so
      // the constraint must not name individual subdirectories at all.
      for (const name of shipped) {
        expect(constraint, `Constraint 1 enumerates \`templates/${name}\``).not.toContain(
          `templates/${name}`,
        );
      }
    });

    it(`${tree}: the constraint and the Mandatory Outputs sentence agree`, async () => {
      // These two said different things 31 lines apart, and both were binding.
      const skill = await read(tree, SKILL);
      expect(skill).toContain(
        "The canonical file set is defined by skill templates under `.qfai/assistant/skills/qfai-sdd/templates/`.",
      );
    });

    it(`${tree}: the one cross-skill template reference is a stated exception`, async () => {
      // `Phase 0 DESIGN.md Freeze` points the user at a qfai-prototyping
      // template, which "use only templates under qfai-sdd/templates/" does
      // not cover. Left unstated, it read as a licence to browse other skills.
      const skill = await read(tree, SKILL);
      expect(flat(skill)).toContain(
        "Named cross-skill exception: `.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`",
      );
      expect(flat(skill)).toContain("It is an exception, not a licence to read other skills");
      // The reference the exception exists for must still be there.
      expect(skill).toContain(
        "`.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`",
      );
    });

    it(`${tree}: the shipped evidence template stays readable under the constraint`, async () => {
      const template = await read(tree, `${TEMPLATES}/evidence/import-lite.md`);
      expect(template).toContain("# Evidence: import-lite");
    });
  }
});

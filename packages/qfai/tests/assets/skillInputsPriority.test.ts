/**
 * `Inputs Priority` is what makes a skill read the shared documents as a set.
 * It carries two globs — the constitution directory at P1 and the catalog
 * directory inside P2 — so a document added to either is reached without
 * editing the skill again.
 *
 * The alternative is a closed list of file names, which is what three of the
 * seven skills carried: every invariant added to those directories reached the
 * skills that glob and missed the ones that enumerate, and nothing reported the
 * gap. The check is per skill and read off the directory, so a skill added
 * later is asked the same question.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILLS_DIR = "assistant/skills";

const CONSTITUTION_GLOB = "`.qfai/assistant/constitution/*`";
const CATALOG_GLOB = "`.qfai/assistant/catalog/*`";

async function skillNames(tree: string): Promise<string[]> {
  const entries = await readdir(path.join(repoRoot, tree, SKILLS_DIR));
  return entries.filter((name) => name.startsWith("qfai-")).sort();
}

/**
 * The body of the `## Inputs Priority` section, from its heading to the next
 * H2. Returns `null` when the skill has no such section, which is the state
 * this suite exists to report.
 */
function inputsPrioritySection(content: string): string | null {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## Inputs Priority\b/.test(line));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

describe.each(QFAI_TREES)("%s: every skill reads the shared directories as a set", (tree) => {
  it("finds the skills it reads the directory for", async () => {
    // An empty read passes every case below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    const names = await skillNames(tree);
    expect(names.length, `${tree}/${SKILLS_DIR} holds no qfai-* skill`).toBeGreaterThan(0);
  });

  it("gives every skill an Inputs Priority section", async () => {
    const missing: string[] = [];
    for (const skill of await skillNames(tree)) {
      const body = await readFile(
        path.join(repoRoot, tree, SKILLS_DIR, skill, "SKILL.md"),
        "utf-8",
      );
      if (inputsPrioritySection(body) === null) missing.push(skill);
    }
    expect(missing, "a skill with no Inputs Priority reads only the files it names").toEqual([]);
  });

  // Read over the SECTION, not the file. Every skill names some file under
  // `constitution/` somewhere, so a whole-file search passes on a skill whose
  // Inputs Priority enumerates rather than globs — which is the state under
  // test.
  it("states both directories as globs inside that section", async () => {
    const gaps: string[] = [];
    for (const skill of await skillNames(tree)) {
      const body = await readFile(
        path.join(repoRoot, tree, SKILLS_DIR, skill, "SKILL.md"),
        "utf-8",
      );
      const section = inputsPrioritySection(body);
      if (section === null) continue; // reported by the case above
      if (!section.includes(CONSTITUTION_GLOB)) gaps.push(`${skill}: no ${CONSTITUTION_GLOB}`);
      if (!section.includes(CATALOG_GLOB)) gaps.push(`${skill}: no ${CATALOG_GLOB}`);
    }
    expect(gaps, "a directory named file by file stops carrying what is added to it").toEqual([]);
  });
});

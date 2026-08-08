/**
 * A missing newline can delete a shipped rule without deleting any text.
 *
 * `qfai-implement/SKILL.md` joined the tail of one Spec-completion-conditions
 * bullet to the whole of the next: `... hard gate at 0%- Each item reached
 * \`done\` or valid \`exception\` (with DR-ID)`. Because the joined line is a
 * two-space continuation of the preceding item, markdown renders all of it as
 * that item's text — so the skill's primary completion condition stopped being
 * a list item, and every downstream Decision Record that cited it by line
 * number pointed at a line the clause does not occupy.
 *
 * Nothing detected it: the words were all still present, the file still
 * parsed, and prettier/markdownlint have no opinion about a `- ` that is not at
 * the start of a line. This scans the shipped assistant tree for the shape.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/**
 * A `- ` list marker that is not at the start of its line, preceded by a
 * character that is neither whitespace, `-`, nor `<`.
 *
 * - The `-` exclusion keeps `-- x-qfai-status: planned` — a SQL comment the
 *   contract guides quote — from matching its own second dash.
 * - The `<` exclusion keeps the `X <- Y` dependency arrows out.
 * - A `-` followed by anything other than a space (`2026-08-05`, `L1-L3`) is
 *   not a list marker and never matches.
 *
 * The lookahead is the noise filter: a swallowed bullet starts a sentence, so
 * it opens with a capital or a code span. A suspended hyphen (`platform- and
 * domain-specific`) continues one, so it opens lowercase.
 */
const MID_LINE_LIST_MARKER = /[^\s\-<]-\s(?=[A-Z`])/;

/** Remove fenced blocks and inline code spans, where a literal `- ` is content. */
function stripCode(text: string): string {
  return text.replace(/^```[\s\S]*?^```/gm, "").replace(/`[^`\n]*`/g, "``");
}

async function offendingLines(tree: string): Promise<string[]> {
  const root = path.join(repoRoot, tree);
  // The assistant tree is the shipped policy surface: a bullet lost here is a
  // rule lost. `review_archive/**` is a frozen historical record, not policy.
  const files = await fg("assistant/**/*.md", { cwd: root, dot: true });
  const found: string[] = [];

  for (const file of files.sort()) {
    const raw = await readFile(path.join(root, file), "utf-8");
    const lines = stripCode(raw).split(/\r?\n/);
    lines.forEach((line, index) => {
      // A table row's cells are delimited by `|`, not by line starts, so a
      // `- ` inside one is ordinary text.
      if (line.trimStart().startsWith("|")) return;
      if (MID_LINE_LIST_MARKER.test(line)) {
        found.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  return found;
}

describe.each(TREES)("%s", (tree) => {
  it("has no list marker swallowed into the middle of a line", async () => {
    expect(await offendingLines(tree)).toEqual([]);
  });
});

describe("the condition that was swallowed is a list item again", () => {
  it.each(TREES)("%s", async (tree) => {
    const skill = await readFile(
      path.join(repoRoot, tree, "assistant/skills/qfai-implement/SKILL.md"),
      "utf-8",
    );
    // Anchored at a line start, so a future re-join fails here too and names
    // the clause rather than only the shape.
    expect(skill).toMatch(/^- Each item reached `done` or valid `exception` \(with DR-ID\)$/m);
    expect(skill).not.toContain("hard gate at 0%- Each item reached");
  });
});

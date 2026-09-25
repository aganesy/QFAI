import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-sdd";
const HEADING = "## Resolving a merge conflict in a delta ledger";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, SKILL, rel), "utf-8");

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

/** The body of one `##` section, up to the next `##` heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`${heading}\n`);
  if (start < 0) return "";
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\n## /);
  return end < 0 ? rest : rest.slice(0, end);
}

describe("a delta ledger conflict has one stated resolution", () => {
  for (const tree of TREES) {
    it(`${tree}: the triage reference states the mechanical resolution`, async () => {
      // Parallel branches append to the same place in the ledger, so a
      // conflict there is routine. Keeping both sides, or a union merge,
      // produces a ledger that is either invalid or silently short.
      const body = unwrap(section(await read(tree, "references/sdd-triage.md"), HEADING));
      expect(body).toContain("**Keeping both sides in an editor**");
      expect(body).toContain("**A line-based `union` merge driver**");
      expect(body).toContain("Take the ledger whole from the branch you are merging into.");
      expect(body).toContain("Re-append every entry your branch added");
      expect(body).toContain("with its content unchanged");
      expect(body).toContain("give your entry the next free one");
      expect(body).toContain("Run `npx qfai validate`.");
    });

    it(`${tree}: the skill's persist step points at the rule`, async () => {
      const skill = unwrap(await read(tree, "SKILL.md"));
      expect(skill).toContain(
        `A merge conflict in either ledger is resolved as \`references/sdd-triage.md\` (\`${HEADING}\`) describes.`,
      );
    });
  }
});

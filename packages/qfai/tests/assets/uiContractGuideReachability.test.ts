import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: Vitest may be launched from
// the workspace root, from `packages/qfai`, or by an IDE with its own CWD, and
// the reads below must resolve the same way in all three.
// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const GUIDE = "assistant/skills/qfai-sdd/references/ui-contract-guide.md";
const GUIDE_REF = "`.qfai/assistant/skills/qfai-sdd/references/ui-contract-guide.md`";

/**
 * Returns the body of the `## <heading>` section, up to the next `## ` heading.
 *
 * Selected by heading rather than by line numbers so an insertion anywhere else
 * in `SKILL.md` does not silently move the window being asserted on.
 */
function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    throw new Error(`SKILL.md has no "## ${heading}" section`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which prettier happened to break the line.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("ui-contract-guide.md is reachable from the /qfai-sdd skill", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the guide the read-list points at exists`, async () => {
      const guide = await readFile(path.join(repoRoot, tree, GUIDE), "utf-8");
      // The three facts that live only in the guide: the count-to-behavior
      // table, the closed-schema rejection, and the rationale for 3..7.
      expect(guide).toContain("`QFAI-AUD-001` error (empty primary_tasks)");
      expect(unwrap(guide)).toContain(
        "carrying any extra key (e.g. `priority`, `owner`), is rejected at validate time",
      );
      expect(guide).toMatch(/3\.\.7|3 to 7/);
    });

    it(`${tree}: the FORMAT SSOT read-list names the guide`, async () => {
      const content = await readFile(path.join(repoRoot, tree, SKILL), "utf-8");
      const readList = section(content, "FORMAT SSOT (Mandatory)");
      expect(readList).toContain(GUIDE_REF);
      // Scoped, so non-UI work is not made to read it.
      expect(unwrap(readList)).toContain(`${GUIDE_REF} (UI-bearing targets)`);
    });

    it(`${tree}: Critical Constraint 3 names the guide next to normalization`, async () => {
      const content = await readFile(path.join(repoRoot, tree, SKILL), "utf-8");
      const constraints = unwrap(section(content, "Critical Constraints"));
      // Constraint 3 is the one that actually triggers UI contract authoring,
      // so the authoring guide has to be named there and not only in the
      // read-list an agent may reach before it knows the target is UI-bearing.
      const constraint = constraints.match(/3\. Contracts-first is mandatory;[^]*?(?= 4\. )/)?.[0];
      expect(constraint, "Critical Constraint 3 not found").toBeDefined();
      expect(constraint).toContain("`references/ui-design-contract-normalization.md`");
      expect(constraint).toContain("`references/ui-contract-guide.md`");
    });
  }
});

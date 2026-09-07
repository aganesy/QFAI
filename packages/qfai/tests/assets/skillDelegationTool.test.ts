import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

/** The heading a skill uses to declare that it may not do the work itself. */
const DELEGATION_HEADING = "## Sub-agent Delegation (MANDATORY)";

/** The name the current harness exposes the sub-agent delegation tool under. */
const DELEGATION_TOOL = "Agent";

/** The name older harnesses exposed the same tool under; kept for compatibility. */
const LEGACY_DELEGATION_TOOL = "Task";

/**
 * `allowed-tools` is read by the agent harness, not by any QFAI validator, so
 * a wrong entry cannot fail at validate time — it surfaces at run time as a
 * delegation failure the skill's own taxonomy misfiles as an environment
 * problem. These assertions are the only gate on the field. Both names are
 * required: a harness that knows only one of them ignores the other, so
 * listing both is what makes the granted set runtime-version independent.
 */
async function skillFiles(tree: string): Promise<string[]> {
  const skillsDir = path.join(repoRoot, tree, "assistant", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: true });
  return files.sort();
}

/** Returns the `allowed-tools` entries declared in the frontmatter. */
function allowedTools(content: string): string[] {
  const declared = /^allowed-tools:\s*\[([^\]]*)\]\s*$/m.exec(content)?.[1];
  if (declared === undefined) {
    return [];
  }
  return declared
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

describe("shipped skills declare the delegation tool they mandate", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: every skill mandating sub-agent delegation allows both \`${DELEGATION_TOOL}\` and \`${LEGACY_DELEGATION_TOOL}\``, async () => {
      const files = await skillFiles(tree);
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      let mandating = 0;
      for (const filePath of files) {
        const content = await readFile(filePath, "utf-8");
        if (!content.includes(DELEGATION_HEADING)) {
          continue;
        }
        mandating += 1;
        const tools = allowedTools(content);
        const missing = [DELEGATION_TOOL, LEGACY_DELEGATION_TOOL].filter(
          (tool) => !tools.includes(tool),
        );
        if (missing.length > 0) {
          offenders.push(`${path.relative(repoRoot, filePath)} (missing: ${missing.join(", ")})`);
        }
      }

      // Guard the guard: a renamed heading must not silently retire this check.
      expect(mandating, `no skill under ${tree} declares "${DELEGATION_HEADING}"`).toBeGreaterThan(
        0,
      );
      expect(offenders).toEqual([]);
    });

    it(`${tree}: no skill allows \`${LEGACY_DELEGATION_TOOL}\` without \`${DELEGATION_TOOL}\``, async () => {
      const files = await skillFiles(tree);
      const offenders: string[] = [];
      for (const filePath of files) {
        const content = await readFile(filePath, "utf-8");
        const tools = allowedTools(content);
        if (tools.includes(LEGACY_DELEGATION_TOOL) && !tools.includes(DELEGATION_TOOL)) {
          offenders.push(path.relative(repoRoot, filePath));
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${tree}: every qfai-* skill allows \`TodoWrite\``, async () => {
      const files = (await skillFiles(tree)).filter((filePath) =>
        path.basename(path.dirname(filePath)).startsWith("qfai-"),
      );
      expect(files.length).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (const filePath of files) {
        const content = await readFile(filePath, "utf-8");
        if (!allowedTools(content).includes("TodoWrite")) {
          offenders.push(path.relative(repoRoot, filePath));
        }
      }

      expect(offenders).toEqual([]);
    });
  }
});

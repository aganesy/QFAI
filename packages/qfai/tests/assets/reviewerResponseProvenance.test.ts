import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const BASELINE = "constitution/shared-skill-delegation-baseline.md";

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

/** The first fenced block under a `## <heading>` section. */
function fencedBlockUnder(content: string, heading: string): string {
  const sectionStart = content.indexOf(`## ${heading}\n`);
  expect(sectionStart, `section "## ${heading}" must exist`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(sectionStart);
  const match = /```text\n([\s\S]*?)```/.exec(rest);
  expect(match, `section "## ${heading}" must carry a text block`).not.toBeNull();
  return match?.[1] ?? "";
}

/**
 * The completion gate of every skill is a substring match over an agent's free
 * text. While the reviewer response carried a bare `Result: PASS | REVISE` and
 * the work order handed the agent *being reviewed* the same vocabulary
 * (`Quality bar: PASS if ... / REVISE if ...`), a doer's self-assessment was
 * character-for-character what the gate accepts as a reviewer's verdict, and an
 * orchestrator integrating two returned texts had no field to tell them apart.
 * The response now names the speaker and the subject; the work order no longer
 * speaks the verdict vocabulary at all.
 */
describe("reviewer response provenance", () => {
  it("names the speaker and the subject in the reviewer response template", async () => {
    for (const content of await readShipped(BASELINE)) {
      const template = fencedBlockUnder(content, "Reviewer response template");

      expect(template).toContain("Reviewer role:");
      expect(template).toContain("Reviewed artifact:");
      expect(template).toContain("Result: PASS | REVISE");

      // Provenance has to arrive before the verdict: a reader scanning for the
      // verdict line must already have been told who is speaking and about what.
      // Line-indexed on purpose — `Reviewer role:`'s own trailing comment
      // mentions `Result:`, so a substring search finds the wrong occurrence.
      const lines = template.split("\n");
      const lineStartingWith = (prefix: string): number => {
        const index = lines.findIndex((line) => line.startsWith(prefix));
        expect(index, `the template must carry a \`${prefix}\` line`).toBeGreaterThanOrEqual(0);
        return index;
      };
      const verdictLine = lineStartingWith("Result: PASS | REVISE");
      expect(lineStartingWith("Reviewer role:")).toBeLessThan(verdictLine);
      expect(lineStartingWith("Reviewed artifact:")).toBeLessThan(verdictLine);
    }
  });

  it("keeps the verdict vocabulary out of the work order handed to a doer", async () => {
    for (const content of await readShipped(BASELINE)) {
      const template = fencedBlockUnder(content, "Work order template");

      expect(template).toContain("Acceptance bar:");
      expect(template, "the doer-facing bar must not be labelled `Quality bar:`").not.toContain(
        "Quality bar:",
      );
      // The exact strings the observed agents echoed back as a verdict.
      expect(template).not.toMatch(/\bPASS if\b/);
      expect(template).not.toMatch(/\bREVISE if\b/);
      // …and the bar says outright that the verdict words are not the doer's.
      expect(template).toMatch(/never `PASS`\/`REVISE`/);
    }
  });

  it("makes both provenance fields a hard requirement of a valid verdict", async () => {
    for (const content of await readShipped(BASELINE)) {
      expect(content).toContain(
        "`Reviewer role`, `Reviewed artifact` and `Authored/edited under review` are REQUIRED.",
      );
      expect(content).toContain("MUST NOT satisfy a completion gate");
      // A response short of them is re-requested, not mined for its `Result:` line.
      expect(content).toMatch(/re-request it rather than reading a bare `Result:` line/);
    }
  });

  it("requires the provenance lines at every skill-level reviewer gate", async () => {
    for (const content of await readShipped("skills/qfai-implement/SKILL.md")) {
      expect(content).toContain(
        "Reviewer response must include `Reviewer role:`, `Reviewed artifact:` and `Result: PASS | REVISE`",
      );
      expect(content).not.toContain(
        "Reviewer response must include `Result: PASS | REVISE` (matching",
      );
    }

    for (const relative of ["skills/qfai-implement/SKILL.md", "skills/qfai-discussion/SKILL.md"]) {
      for (const content of await readShipped(relative)) {
        expect(
          content,
          `${relative} must cite the provenance pair in its shared schema line`,
        ).toContain(
          "reviewer response `Reviewer role:` + `Reviewed artifact:` + `Result: PASS | REVISE`",
        );
      }
    }

    for (const content of await readShipped("skills/web-research/SKILL.md")) {
      expect(content).toContain("REQUIRED `Reviewer role:`, `Reviewed artifact:` and");
    }
  });
});

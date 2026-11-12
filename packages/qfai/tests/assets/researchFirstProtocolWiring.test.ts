/**
 * `rule/research-first-protocol.md` is triggered by `/qfai-discussion`: its first step runs the
 * protocol, and the summary stays in the stage report the interview reads.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readDiscussionStep } from "../helpers/discussionSteps.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const discussionRoots = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skill",
    "qfai-discussion",
  ),
  path.join(repoRoot, ".qfai", "assistant", "skill", "qfai-discussion"),
];
const protocolPaths = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "rule",
    "research-first-protocol.md",
  ),
  path.join(repoRoot, ".qfai", "assistant", "rule", "research-first-protocol.md"),
];
const webResearchSkillPaths = [
  path.join(
    repoRoot,
    "packages",
    "qfai",
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skill",
    "web-research",
    "SKILL.md",
  ),
  path.join(repoRoot, ".qfai", "assistant", "skill", "web-research", "SKILL.md"),
];

function section(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return "";
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

describe("research-first protocol is wired into /qfai-discussion", () => {
  for (const discussionRoot of discussionRoots) {
    const label = path.relative(repoRoot, discussionRoot);

    it(`${label}: the first step runs the protocol before the interview`, async () => {
      const assistantDir = path.dirname(path.dirname(discussionRoot));
      const research = await readDiscussionStep(assistantDir, "discussion-research");
      expect(research).toContain("research-first-protocol.md");
      expect(section(research, "## Procedure").replace(/\s+/g, " ")).toContain(
        "before the interview starts, and report its `research_summary` output",
      );
      const skill = await readFile(path.join(discussionRoot, "SKILL.md"), "utf-8");
      expect(/^steps:\s*\[\s*([\w-]+)/m.exec(skill)?.[1]).toBe("discussion-research");
    });
  }

  for (const protocolPath of protocolPaths) {
    it(`${path.relative(repoRoot, protocolPath)}: Storage keeps the summary in the stage report`, async () => {
      const storage = section(await readFile(protocolPath, "utf-8"), "## Storage").replace(
        /\s+/g,
        " ",
      );
      expect(storage).toContain("`research_summary` goes to the invoking stage's own report.");
      expect(storage).toContain("goes into that option's row of the deliberation record as a URL");
    });

    it(`${path.relative(repoRoot, protocolPath)}: descriptions mark any phrase kept from the source`, async () => {
      const quotation = section(await readFile(protocolPath, "utf-8"), "## Quotation Rule").replace(
        /\s+/g,
        " ",
      );
      expect(quotation).toContain(
        "Each `best_practices` and `anti_patterns` `description` is written in the analyst's own words. " +
          "A phrase kept from the source is marked as a quotation with ordinary quotation marks.",
      );
      // The rule is taught by one worked example: the source, the entry, and why.
      expect(quotation).toContain(
        'The source says: "Retry idempotent requests with exponential backoff and jitter; ' +
          'never retry a non-idempotent write."',
      );
      expect(quotation).toContain(
        "description: >- Only a request that is safe to repeat is retried, and the wait between " +
          'attempts grows and is randomized, which the source calls "exponential backoff and jitter".',
      );
      expect(quotation).toContain(
        "This is correct because the claim is restated in the analyst's words, and the one phrase " +
          "kept verbatim is in quotation marks, so a reader can tell which words are the source's.",
      );
    });

    it(`${path.relative(repoRoot, protocolPath)}: a recognized name is still searched`, async () => {
      const names = section(
        await readFile(protocolPath, "utf-8"),
        "## Name Verification Rule",
      ).replace(/\s+/g, " ");
      expect(names).toContain(
        "Where a query centers on a name — a framework, a model, a CLI tool, a component catalogue, " +
          "a theme — that name is what gets verified. Search it as it was written.",
      );
      expect(names).toContain("Recognizing the name is not grounds to skip the search.");
      // The lookup is a source like any other, so a verified name is told apart
      // from one answered from memory.
      expect(names).toContain("Record what the search found in the summary's `sources`");
    });
  }

  for (const skillPath of webResearchSkillPaths) {
    it(`${path.relative(repoRoot, skillPath)}: points to both rules instead of restating them`, async () => {
      const skill = await readFile(skillPath, "utf-8");
      expect(skill).toContain("research-first-protocol.md#name-verification-rule");
      expect(skill).toContain("research-first-protocol.md#quotation-rule");
      // A copy of the clause text would drift from the protocol it restates.
      expect(skill).not.toContain("not grounds to skip the search");
      expect(skill).not.toContain("This is correct because");
    });
  }
});

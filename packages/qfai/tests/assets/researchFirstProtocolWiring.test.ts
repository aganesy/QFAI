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

  for (const protocolPath of protocolPaths) {
    const surveyPath = path.join(
      path.dirname(protocolPath),
      "references",
      "visual-reference-survey.md",
    );
    it(`${path.relative(repoRoot, protocolPath)}: a redesign also runs the visual reference survey`, async () => {
      const trigger = section(await readFile(protocolPath, "utf-8"), "## Trigger").replace(
        /\s+/g,
        " ",
      );
      expect(trigger).toContain("`.qfai/assistant/rule/references/visual-reference-survey.md`");
    });

    const briefPath = path.join(path.dirname(protocolPath), "references", "ui-research-brief.md");
    it(`${path.relative(repoRoot, protocolPath)}: a new screen type fills the UI research brief on every axis`, async () => {
      const trigger = section(await readFile(protocolPath, "utf-8"), "## Trigger").replace(
        /\s+/g,
        " ",
      );
      expect(trigger).toContain("`.qfai/assistant/rule/references/ui-research-brief.md`");
      const brief = await readFile(briefPath, "utf-8");
      for (const axis of [
        "pattern",
        "accessibility",
        "catalogue",
        "domain-analogues",
        "framework-idioms",
        "locale",
      ]) {
        expect(section(brief, "## Record"), axis).toMatch(new RegExp(`[|:] ${axis}( |$)`, "m"));
      }
      const flat = brief.replace(/\s+/g, " ");
      expect(flat).toContain("A product screenshot is not a source for this axis.");
      expect(flat).toContain("Never a visual direction");
      expect(flat).toContain("An axis left out is a gap the research has not closed.");
      expect(flat).toContain("A finding nothing was checked against is `defer`.");
      expect(flat).toContain(
        "Axis 3 is not applicable when the `Component catalogue` row of `tech.md` names no catalogue.",
      );
    });

    it(`${path.relative(repoRoot, surveyPath)}: samples by stratum, grades acclaim, dedupes, and lands each finding`, async () => {
      const survey = await readFile(surveyPath, "utf-8");
      const flat = survey.replace(/\s+/g, " ");
      for (const stratum of ["same-domain", "adjacent-domain", "target-market", "aspect-award"]) {
        expect(section(survey, "## Sample"), stratum).toContain(`\`${stratum}\``);
      }
      for (const level of ["award", "gallery", "case-study", "unconfirmed"]) {
        expect(section(survey, "## Acclaim"), level).toContain(`\`${level}\``);
      }
      expect(flat).toContain("no finding rests on it alone");
      expect(section(survey, "## Dedupe before counting").replace(/\s+/g, " ")).toContain(
        "The sample size is the count after this.",
      );
      expect(flat).toContain("Record the same fields for every site");
      expect(flat).toContain("lands_in: design-md | ui-contract");
      expect(flat).toContain("action: adopt | reject | defer");
      // Colour, type and motion become Do and Don't points, never tokens.
      expect(section(survey, "## Where findings land").replace(/\s+/g, " ")).toContain(
        "never a `visual.*` value",
      );
      expect(flat).toContain("A finding nothing was checked against is `defer`.");
      expect(flat).toContain(
        "A finding rests on at least two sites, at least one of them at `award` or `gallery` level.",
      );
    });

    it(`${path.relative(repoRoot, surveyPath)}: opens a redesign with an inventory and checks each adopted finding against the anti-patterns`, async () => {
      const survey = await readFile(surveyPath, "utf-8");
      const inventory = section(survey, "## Inventory first").replace(/\s+/g, " ");
      expect(inventory).toContain("the user decides every removal before the survey starts");
      const findings = section(survey, "## Findings").replace(/\s+/g, " ");
      expect(findings).toContain("checked against the design anti-pattern list");
      expect(findings).toContain("_Displacement_ section included");
      expect(findings).toContain("`audience.do_not_look_like`");
      expect(findings).toContain("A pattern common on well-known sites is not exempt.");
    });
  }

  for (const protocolPath of protocolPaths) {
    it(`${path.relative(repoRoot, protocolPath)}: a dependency source is checked against the installed version`, async () => {
      const protocol = await readFile(protocolPath, "utf-8");
      const rule = section(protocol, "## Version Rule").replace(/\s+/g, " ");
      expect(rule).toContain("Record the `package` and the `version` the source describes");
      expect(rule).toContain("every lockfile or manifest that declares the package");
      expect(rule).toContain("the minor version below 1.0");
      expect(rule).toContain("the entry's `reason` then names the version the project would adopt");
      expect(protocol).toContain("version_warnings:");
      for (const field of ["package: string", "version: string", "installed: string"]) {
        expect(protocol, field).toContain(field);
      }
      const applying = section(protocol, "## Applying an External Source").replace(/\s+/g, " ");
      expect(applying).toContain(
        "An entry whose source has a version warning is `apply` only when its `reason` names what was checked against the installed version or, for a package not installed yet, against the version the project would adopt.",
      );
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

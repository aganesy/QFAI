/**
 * Every shipped skill the agent may select says when to select it.
 *
 * A skill's `description:` is the part of it a host always loads, and the agent
 * matches a request against it to choose a skill. A description that says only
 * what the skill does leaves the agent unable to tell two neighbouring skills
 * apart, so each one carries a sentence beginning "Use when".
 *
 * A skill that declares `disable-model-invocation: true` is started by the user
 * by name. The agent never matches against it, so it is not held here.
 *
 * The host injects the text into a system prompt, so it is written in the third
 * person: a sentence addressed to the reader, or spoken as "I", disagrees with
 * the point of view around it. The length and the name follow the limits a host
 * places on a skill it registers.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { skillFrontmatterMapping } from "../../src/core/agentFrontmatter.js";
import { collectCanonicalSkillIds } from "../../src/core/init/integrationDirs.js";

// tests/assets/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const assistantDir = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

const TRIGGER = /\bUse when\b/;
const FIRST_OR_SECOND_PERSON =
  /\b(?:I|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves)\b/i;
const DESCRIPTION_MAX_LENGTH = 1024;
const RESERVED_NAME_WORD = /anthropic|claude/i;

interface SelectableSkill {
  skill: string;
  name: string;
  description: string;
}

/** Every shipped skill without `disable-model-invocation: true`. */
async function selectableSkills(): Promise<SelectableSkill[]> {
  const found: SelectableSkill[] = [];
  for (const skill of await collectCanonicalSkillIds(assistantDir)) {
    const raw = await readFile(path.join(assistantDir, "skill", skill, "SKILL.md"), "utf-8");
    const mapping = skillFrontmatterMapping(raw);
    if (mapping?.["disable-model-invocation"] === true) continue;
    const name = mapping?.["name"];
    const description = mapping?.["description"];
    found.push({
      skill,
      name: typeof name === "string" ? name : skill,
      description: typeof description === "string" ? description : "",
    });
  }
  return found;
}

describe("shipped skill descriptions say when to select the skill", () => {
  it("reads at least one skill the agent may select", async () => {
    // An empty read passes every case below without checking anything.
    expect((await selectableSkills()).length).toBeGreaterThan(0);
  });

  it("carries a sentence beginning 'Use when' in every description", async () => {
    const skills = await selectableSkills();
    const missing = skills
      .filter(({ description }) => !TRIGGER.test(description))
      .map(({ skill }) => skill);
    expect(missing).toEqual([]);

    const boundaries = {
      "qfai-atdd": [
        "qfai-sdd writes the examples and cases; this skill automates them as tests.",
        "Product code that makes a test pass belongs to qfai-implement.",
      ],
      "qfai-implement": [
        "It is for code to write; a gate on a change with no code left to write belongs to qfai-verify.",
        "A change to wording or comments alone belongs to qfai-maintain.",
      ],
      "qfai-sdd": [
        "It writes the examples and cases; automating them as tests belongs to qfai-atdd.",
        "A product idea whose scope is not settled yet belongs to qfai-discussion.",
      ],
      "qfai-verify": [
        "It is a gate with no code to write; code still to write belongs to qfai-implement.",
      ],
      "qfai-prototyping": [
        "Screen sidecars for an idea still being scoped belong to qfai-discussion, and the UI contracts themselves to qfai-sdd.",
      ],
      "qfai-discussion": ["Once the scope is settled, writing the story tree belongs to qfai-sdd."],
      "qfai-maintain": [
        "An edit with any semantic effect, including rearranging code, belongs to qfai-implement, and a change to a story or a contract to qfai-sdd.",
      ],
      "qfai-triage": ["A request that needs a change belongs to another stage."],
    };
    for (const [skill, clauses] of Object.entries(boundaries)) {
      const description = skills.find((entry) => entry.skill === skill)?.description;
      expect(description, skill).toBeDefined();
      expect(description, skill).toContain(
        "A free-text request that names no stage goes to qfai-run.",
      );
      for (const clause of clauses) expect(description, skill).toContain(clause);
    }
  });

  it("writes every description in the third person", async () => {
    const personal = (await selectableSkills())
      .filter(({ description }) => FIRST_OR_SECOND_PERSON.test(description))
      .map(({ skill }) => skill);
    expect(personal).toEqual([]);
  });

  it(`keeps every description within ${DESCRIPTION_MAX_LENGTH} characters`, async () => {
    const long = (await selectableSkills())
      .filter(({ description }) => description.length > DESCRIPTION_MAX_LENGTH)
      .map(({ skill, description }) => `${skill} (${description.length})`);
    expect(long).toEqual([]);
  });

  it("names no skill with 'anthropic' or 'claude'", async () => {
    const reserved = (await selectableSkills())
      .filter(({ name }) => RESERVED_NAME_WORD.test(name))
      .map(({ skill }) => skill);
    expect(reserved).toEqual([]);
  });
});

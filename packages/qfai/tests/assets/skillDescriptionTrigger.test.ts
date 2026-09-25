/**
 * Every shipped skill the agent may start says when to start it.
 *
 * A skill's `description:` is the only part of it a host always loads, and the
 * agent matches a request against it to choose a skill. A description that says
 * only what the skill does leaves the agent unable to tell which of two
 * neighbouring skills a request belongs to, so each one carries a sentence
 * beginning "Use when".
 *
 * A skill that declares `disable-model-invocation: true` is started by the user
 * by name, so the agent never matches against it and it is not held here.
 *
 * The text is written in the third person: the host injects it into a system
 * prompt, where a first- or second-person sentence disagrees with the point of
 * view around it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { skillFrontmatterMapping } from "../../src/core/agentFrontmatter.js";
import { collectCanonicalSkillIds } from "../../src/cli/commands/init.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const assistantDir = path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant");

const TRIGGER = /\bUse when\b/;
const FIRST_OR_SECOND_PERSON = /\b(?:I|me|my|we|our|you|your)\b/i;

async function descriptions(): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  for (const skill of await collectCanonicalSkillIds(assistantDir)) {
    const raw = await readFile(path.join(assistantDir, "skills", skill, "SKILL.md"), "utf-8");
    const mapping = skillFrontmatterMapping(raw);
    if (mapping?.["disable-model-invocation"] === true) continue;
    const description = mapping?.["description"];
    found.set(skill, typeof description === "string" ? description : "");
  }
  return found;
}

describe("shipped skill descriptions say when to use the skill", () => {
  it("reads at least one skill the agent may start", async () => {
    expect((await descriptions()).size).toBeGreaterThan(0);
  });

  it("carries a sentence beginning 'Use when' in every description", async () => {
    const missing = [...(await descriptions())]
      .filter(([, text]) => !TRIGGER.test(text))
      .map(([skill]) => skill);
    expect(missing).toEqual([]);
  });

  it("writes every description in the third person", async () => {
    const personal = [...(await descriptions())]
      .filter(([, text]) => FIRST_OR_SECOND_PERSON.test(text))
      .map(([skill]) => skill);
    expect(personal).toEqual([]);
  });
});

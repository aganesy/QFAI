/**
 * How a shipped skill declares that the agent may not fire it.
 *
 * Whether a skill carries the `description:` a host needs to register it is a
 * validator's subject, because it is true of any project's skills. What is left
 * is narrower and belongs here: that `disable-model-invocation` says the same
 * thing in the front matter and in the body, in both directions.
 *
 * The field is one line of metadata whose effect is invisible in the file that
 * carries it. Removed while tidying, the skill quietly becomes one the agent
 * fires on its own; added without a word of explanation, it reads as a setting
 * rather than a decision. Pairing it with the body's account of it makes either
 * half alone a failure.
 *
 * The subject is every skill an install carries, taken from the installer's own
 * collector rather than from a second reading of the directory. A suite that
 * decides for itself what counts as a skill answers a slightly different
 * question, and the gap shows up as a shipped skill nothing checks.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { collectCanonicalSkillIds } from "../../src/cli/commands/init.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const ASSISTANT_DIR = "assistant";
const SKILLS_DIR = `${ASSISTANT_DIR}/skills`;

const OPT_OUT_FIELD = "disable-model-invocation";
const CANONICAL_OPT_OUT = `${OPT_OUT_FIELD}: true`;

/**
 * Any front-matter line whose key is the opt-out, however it is spelled.
 *
 * Quoted keys are valid YAML and the host reads them, so a line-oriented match
 * on the bare key would see no declaration where the host sees one — and the
 * body case would then pass by finding neither half.
 */
const OPT_OUT_KEY_LINE = new RegExp(`^\\s*['"]?${OPT_OUT_FIELD}['"]?\\s*:.*$`, "gm");

function skillNames(tree: string): Promise<string[]> {
  return collectCanonicalSkillIds(path.join(repoRoot, tree, ASSISTANT_DIR));
}

function readSkill(tree: string, skill: string): Promise<string> {
  return readFile(path.join(repoRoot, tree, SKILLS_DIR, skill, "SKILL.md"), "utf-8");
}

/** The leading `---` block, or an empty string when the file has none. */
function frontMatter(raw: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  return match?.[1] ?? "";
}

/** Everything after that block, as paragraphs with their soft wraps collapsed. */
function paragraphs(raw: string): string[] {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  return (match?.[1] ?? raw).split(/\r?\n\s*\r?\n/).map((block) => block.replace(/\s*\n\s*/g, " "));
}

describe.each(QFAI_TREES)("%s: the opt-out is stated once, in two places", (tree) => {
  it("finds the skills it reads the directory for", async () => {
    // An empty read passes every case below without asking anything, and the
    // two ways to get one — a moved directory, a collector that matches nothing
    // — look identical to a green run.
    const names = await skillNames(tree);
    expect(names.length, `${tree}/${SKILLS_DIR} holds no skill`).toBeGreaterThan(0);
  });

  it("writes the opt-out once, as a declaration, or not at all", async () => {
    // Three ways to state nothing while reading like a decision: `false`, which
    // is what the host assumes already; a spelling this suite would not see but
    // the host would; and a second line further down, which decides the value
    // while the first one is what a reader finds.
    const wrong: string[] = [];
    for (const skill of await skillNames(tree)) {
      const lines = frontMatter(await readSkill(tree, skill)).match(OPT_OUT_KEY_LINE) ?? [];
      if (lines.length === 0) continue;
      if (lines.length > 1 || lines[0] !== CANONICAL_OPT_OUT) wrong.push(skill);
    }
    expect(wrong, `${OPT_OUT_FIELD} is written once, as \`${CANONICAL_OPT_OUT}\``).toEqual([]);
  });

  it("says it in the front matter and the body, or in neither", async () => {
    // Both halves of one statement, so neither can go alone. A declaration the
    // body never accounts for is a setting the next contributor tidies away; an
    // account with no declaration behind it describes a skill the agent is in
    // fact free to fire, and reads as though it does not.
    //
    // The body half is a paragraph that names the field and says who invokes
    // the skill. Naming it anywhere would be met by a code sample or a passing
    // reference, and neither tells the next contributor why the line is there.
    const unpaired: string[] = [];
    for (const skill of await skillNames(tree)) {
      const raw = await readSkill(tree, skill);
      const declared = frontMatter(raw).includes(CANONICAL_OPT_OUT);
      const explained = paragraphs(raw).some(
        (block) => block.includes(OPT_OUT_FIELD) && /\buser\b/i.test(block),
      );
      if (declared !== explained) unpaired.push(skill);
    }
    expect(unpaired, `${OPT_OUT_FIELD} is declared and explained, or neither`).toEqual([]);
  });
});

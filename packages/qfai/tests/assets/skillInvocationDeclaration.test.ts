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

import { skillFrontmatterMapping } from "../../src/core/agentFrontmatter.js";
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
 * The claim an explanation has to make: the agent does not start this skill,
 * and the user is who does.
 *
 * Naming the field is not that claim. A paragraph can carry the field and the
 * word "user" while saying nothing about who may invoke what, and the reason
 * the line is there is the whole of what the next contributor needs.
 */
const INVOCATION_CLAIM =
  /\bonly\b[^.]*\buser\b|\buser-invoked\b|\bnever\b[^.]*\b(?:agent|model)\b|\b(?:agent|model)\b[^.]*\bnever\b/i;

/**
 * Any front-matter line whose key is the opt-out, however it is spelled.
 *
 * Quoted keys are valid YAML and the host reads them, so a line-oriented match
 * on the bare key would see no declaration where the host sees one — and the
 * body case would then pass by finding neither half.
 */
const OPT_OUT_KEY_LINE = new RegExp(`^\\s*['"]?${OPT_OUT_FIELD}['"]?\\s*:.*$`, "gm");

/**
 * The opt-out lines a front-matter block declares, however the key is spelled.
 *
 * Read as lines rather than as a substring of the block, because the block also
 * holds text the host does not act on — a commented-out declaration reads
 * exactly like a live one to a substring search, and that is the state where
 * the agent may fire a skill whose body still says it may not.
 */
function optOutLines(frontMatterText: string): string[] {
  return frontMatterText.match(OPT_OUT_KEY_LINE) ?? [];
}

/**
 * Whether the host receives the opt-out, read through the same parser the
 * validator uses.
 *
 * YAML has more than one way to write a mapping, and the host acts on the
 * parsed value rather than on the line it was written as. A suite matching
 * lines alone answers a narrower question, and the two disagree in the
 * permissive direction: a flow-style block declares the opt-out while the lines
 * show none, and a skill whose body then never explains it passes as a skill
 * that opted out of nothing.
 */
function declaresOptOut(raw: string): boolean {
  return skillFrontmatterMapping(raw)?.[OPT_OUT_FIELD] === true;
}

/**
 * Whether the front matter carries the key at all, whatever it is set to.
 *
 * Read separately from the value, because only this one decides whether a skill
 * has anything to check. A flow-style `false` declares nothing and is still the
 * file saying something about the opt-out, which is what the canonical-spelling
 * rule below exists for.
 */
function mentionsOptOutKey(raw: string): boolean {
  const mapping = skillFrontmatterMapping(raw);
  return mapping !== undefined && Object.hasOwn(mapping, OPT_OUT_FIELD);
}

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

/**
 * The prose after that block, as paragraphs with their soft wraps collapsed,
 * and with fenced blocks dropped.
 *
 * A sample is not an explanation. A configuration example naming the field
 * reads to a search exactly like a sentence about why the line is there, and
 * only one of the two tells the next contributor anything.
 */
function paragraphs(raw: string): string[] {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  return withoutFences(match?.[1] ?? raw)
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, " "));
}

/** The text with every fenced code block removed, fence lines included. */
function withoutFences(text: string): string {
  const kept: string[] = [];
  let open: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open === null) {
      if (fence) open = fence[1];
      else kept.push(line);
      continue;
    }
    // A fence closes on the same character, at least as long as the one that
    // opened it, which is what lets a longer fence quote a shorter one.
    if (fence && fence[1][0] === open[0] && fence[1].length >= open.length) open = null;
  }
  return kept.join("\n");
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
    // Four ways to leave the next reader with the wrong answer: `false`, which
    // is what the host assumes already; a second line further down, which
    // decides the value while the first is what a reader finds; a quoted key;
    // and a flow-style mapping, which the host acts on and no line shows. The
    // subject is every skill the host reads an opt-out from, plus every one
    // that wrote the key without declaring anything.
    const wrong: string[] = [];
    for (const skill of await skillNames(tree)) {
      const raw = await readSkill(tree, skill);
      const lines = optOutLines(frontMatter(raw));
      if (lines.length === 0 && !mentionsOptOutKey(raw)) continue;
      if (lines.length !== 1 || lines[0] !== CANONICAL_OPT_OUT) wrong.push(skill);
    }
    expect(wrong, `${OPT_OUT_FIELD} is written once, as \`${CANONICAL_OPT_OUT}\``).toEqual([]);
  });

  it("says it in the front matter and the body, or in neither", async () => {
    // Both halves of one statement, so neither can go alone. A declaration the
    // body never accounts for is a setting the next contributor tidies away; an
    // account with no declaration behind it describes a skill the agent is in
    // fact free to fire, and reads as though it does not.
    //
    // Both halves read the thing that acts. The front-matter half is the
    // parsed value the host receives, not the field's name somewhere in the
    // block: a commented-out declaration leaves the body's account standing
    // over a skill the agent is once again free to fire. The body half is a
    // paragraph of prose that names the field and says the agent does not
    // start the skill. Naming it anywhere would be met by a code sample or a
    // passing reference, and neither tells the next contributor why the line is
    // there.
    const unpaired: string[] = [];
    for (const skill of await skillNames(tree)) {
      const raw = await readSkill(tree, skill);
      const declared = declaresOptOut(raw);
      const explained = paragraphs(raw).some(
        (block) => block.includes(OPT_OUT_FIELD) && INVOCATION_CLAIM.test(block),
      );
      if (declared !== explained) unpaired.push(skill);
    }
    expect(unpaired, `${OPT_OUT_FIELD} is declared and explained, or neither`).toEqual([]);
  });
});

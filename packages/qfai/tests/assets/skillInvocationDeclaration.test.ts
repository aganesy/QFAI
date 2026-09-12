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
 * Read off the skills directory rather than written against the one skill that
 * declares it today, so the next user-invoked skill is asked the same question.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILLS_DIR = "assistant/skills";

const OPT_OUT_FIELD = "disable-model-invocation";

async function skillNames(tree: string): Promise<string[]> {
  const entries = await readdir(path.join(repoRoot, tree, SKILLS_DIR));
  return entries.filter((name) => name.startsWith("qfai-")).sort();
}

function readSkill(tree: string, skill: string): Promise<string> {
  return readFile(path.join(repoRoot, tree, SKILLS_DIR, skill, "SKILL.md"), "utf-8");
}

/** The leading `---` block, or an empty string when the file has none. */
function frontMatter(raw: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(raw);
  return match?.[1] ?? "";
}

/** Everything after that block, which is where a field is explained. */
function body(raw: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  return (match?.[1] ?? raw).replace(/\s*\n\s*/g, " ");
}

describe.each(QFAI_TREES)("%s: the opt-out is stated once, in two places", (tree) => {
  it("finds the skills it reads the directory for", async () => {
    // An empty read passes every case below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    const names = await skillNames(tree);
    expect(names.length, `${tree}/${SKILLS_DIR} holds no qfai-* skill`).toBeGreaterThan(0);
  });

  it("writes the opt-out as a declaration or not at all", async () => {
    // `false` is what the host assumes already, so a skill carrying it states
    // nothing while reading like a skill that has decided something. The field
    // is present only where it changes the answer.
    const wrong: string[] = [];
    for (const skill of await skillNames(tree)) {
      const line = new RegExp(`^${OPT_OUT_FIELD}:.*$`, "m").exec(
        frontMatter(await readSkill(tree, skill)),
      );
      if (line !== null && line[0] !== `${OPT_OUT_FIELD}: true`) wrong.push(skill);
    }
    expect(wrong, `${OPT_OUT_FIELD} carries no value but \`true\``).toEqual([]);
  });

  it("says it in the front matter and the body, or in neither", async () => {
    // Both halves of one statement, so neither can go alone. A declaration the
    // body never accounts for is a setting the next contributor tidies away; an
    // account with no declaration behind it describes a skill the agent is in
    // fact free to fire, and reads as though it does not.
    const unpaired: string[] = [];
    for (const skill of await skillNames(tree)) {
      const raw = await readSkill(tree, skill);
      const declared = new RegExp(`^${OPT_OUT_FIELD}: true$`, "m").test(frontMatter(raw));
      if (declared !== body(raw).includes(OPT_OUT_FIELD)) unpaired.push(skill);
    }
    expect(unpaired, `${OPT_OUT_FIELD} is declared and explained, or neither`).toEqual([]);
  });
});

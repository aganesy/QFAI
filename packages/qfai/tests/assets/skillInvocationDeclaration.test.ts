/**
 * How a shipped skill declares who may invoke it.
 *
 * A host reads `description:` to decide whether to offer a skill at all, and
 * `disable-model-invocation: true` to decide whether the agent may fire it.
 * Those are two questions, and answering the second by leaving the first out
 * answers neither reliably: on a host that requires a description, a skill
 * without one registers nowhere, so the front door disappears instead of
 * narrowing.
 *
 * So the declaration is explicit, and this suite holds it for every skill in
 * the directory rather than for the one skill that uses it today. A rule that
 * names a skill reads as an exception to the next person who finds it, and the
 * next user-invoked skill would be written without anything asking it the same
 * question.
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

describe.each(QFAI_TREES)("%s: every skill says who may invoke it", (tree) => {
  it("finds the skills it reads the directory for", async () => {
    // An empty read passes every case below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    const names = await skillNames(tree);
    expect(names.length, `${tree}/${SKILLS_DIR} holds no qfai-* skill`).toBeGreaterThan(0);
  });

  it("gives every skill a description", async () => {
    // Including the ones the agent may not fire. Omitting the description is
    // the tempting way to keep a skill out of the model's reach, and it works
    // only on a host that tolerates a skill without one; the rest register
    // nothing, which loses the user's front door too.
    const missing: string[] = [];
    for (const skill of await skillNames(tree)) {
      if (!/^description:/m.test(frontMatter(await readSkill(tree, skill)))) missing.push(skill);
    }
    expect(missing, "a skill with no description is offered by nothing").toEqual([]);
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

  it("explains the opt-out in the body of the skill that declares it", async () => {
    // A front-matter line nobody can source is a line the next contributor
    // removes while tidying unknown metadata. Naming the field in the body is
    // what turns it from a setting into a decision with a reason attached.
    const unexplained: string[] = [];
    for (const skill of await skillNames(tree)) {
      const raw = await readSkill(tree, skill);
      if (!new RegExp(`^${OPT_OUT_FIELD}: true$`, "m").test(frontMatter(raw))) continue;
      if (!body(raw).includes(OPT_OUT_FIELD)) unexplained.push(skill);
    }
    expect(unexplained, "the body never says what the opt-out does").toEqual([]);
  });
});

/**
 * A skill a host cannot register.
 *
 * `description:` does two jobs at once — it is what a host reads to register a
 * skill, and what it reads to decide whether to offer the skill to the model.
 * Leaving it out to stop the second loses the first on every host that requires
 * the field: the skill is not loaded, and the user cannot invoke it by name
 * either, which is the opposite of what the omission was for.
 *
 * `qfai-grill` is the skill in that position — it is reached only when a user
 * names it — and it is the one most likely to lose the field to a contributor
 * filling in metadata that nine skills out of ten carry. So the rule is general
 * rather than a per-skill exception: every skill needs the description, and one
 * that should not be offered to the model says so with
 * `disable-model-invocation: true` beside it.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { validateAssistantAssets } from "../../src/core/validators/assistantAssets.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

/** A project whose skills tree holds one skill with the given front matter. */
async function projectWithSkill(frontMatter: readonly string[]): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-registration-"));
  tempDirs.push(root);
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-example");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      "name: qfai-example",
      ...frontMatter,
      "---",
      "",
      "## qfai-example",
      "",
      "[DRIFT-PROTOCOL:MANDATORY]",
      "",
      "### Reviewer Gate (MUST)",
      "",
      "- Reviewer checks the Drift Protocol, verifies alignment with `test-layers.md`,",
      "  and treats ratios as signals, not gates.",
      "",
    ].join("\n"),
    "utf-8",
  );
  return root;
}

/** A project whose skills tree holds one skill with the given document body. */
async function projectWithSkillDocument(body: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-registration-"));
  tempDirs.push(root);
  const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-example");
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), body, "utf-8");
  return root;
}

const registrationFindings = async (
  root: string,
): Promise<Awaited<ReturnType<typeof validateAssistantAssets>>> =>
  (await validateAssistantAssets(root, defaultConfig)).filter(
    (finding) => finding.code === "QFAI-SKILLS-015",
  );

describe("a skill carries what a host needs to register it", () => {
  it("accepts a skill with a description", async () => {
    const root = await projectWithSkill(['description: "Does the thing."']);
    expect(await registrationFindings(root)).toEqual([]);
  });

  it("accepts a skill that opts out of model invocation and keeps its description", async () => {
    // The shape `qfai-grill` ships: reachable by name, never offered to the
    // model, and registered like every other skill.
    const root = await projectWithSkill([
      'description: "Run a session on whatever the user names."',
      "disable-model-invocation: true",
    ]);
    expect(await registrationFindings(root)).toEqual([]);
  });

  it("reports a skill with no description, and says what the field is for", async () => {
    const root = await projectWithSkill(['argument-hint: "<subject>"']);
    const [finding] = await registrationFindings(root);
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("A host reads that field to register the skill");
    expect(finding?.suggested_action).toContain("disable-model-invocation: true");
  });

  it("says what the opt-out does not cover when the flag is there without one", async () => {
    // The edit that matters: a contributor removes the description from the
    // skill that declares the opt-out, reading the flag as the whole mechanism.
    const root = await projectWithSkill(["disable-model-invocation: true"]);
    const [finding] = await registrationFindings(root);
    expect(finding?.severity).toBe("error");
    expect(finding?.message).toContain("stops the model from firing the skill");
    expect(finding?.message).toContain("the user cannot invoke it by name either");
  });

  it("reports a description the host has no text for", async () => {
    // The key is present and carries nothing a host can register the skill by.
    // Matching the key alone passes a file in exactly the state this finding
    // exists to name.
    for (const line of ["description:", 'description: ""', "description: 42"]) {
      const root = await projectWithSkill([line]);
      const [finding] = await registrationFindings(root);
      expect(finding?.severity, line).toBe("error");
    }
  });

  it("reports a skill whose front matter a host cannot read", async () => {
    // No front matter at all, and front matter that does not parse. Both leave
    // the host with nowhere to read the field from, so both are the finding.
    const documents = [
      "# qfai-example\n\nIt does the thing.\n",
      "---\nname: qfai-example\ndescription: [\n---\n\n# qfai-example\n",
    ];
    for (const document of documents) {
      const root = await projectWithSkillDocument(document);
      const [finding] = await registrationFindings(root);
      expect(finding?.severity, document.slice(0, 16)).toBe("error");
    }
  });
});

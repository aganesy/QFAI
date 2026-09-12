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
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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
    expect(finding?.message).toContain("asks the Claude Code surface not to fire the skill");
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

  it("tells the operator to replace a value rather than add a second key", async () => {
    // Told to add `description:` to front matter that already has one, an
    // operator writes a second mapping key and the document stops parsing.
    const root = await projectWithSkill(['description: ""']);
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("with nothing a host can use in it");
    expect(finding?.suggested_action).toContain("Replace the value of `description:`");
  });

  it("reads the delimiter the loader reads", async () => {
    // `--- # note` is not a front-matter opener to the skill loader, so a
    // mapping under it is not front matter here either. Certifying it would
    // pass registration metadata on a file the assistant cannot load.
    const root = await projectWithSkillDocument(
      ["--- # note", "name: qfai-example", 'description: "Does the thing."', "---", ""].join("\n"),
    );
    const [finding] = await registrationFindings(root);
    expect(finding?.severity).toBe("error");
  });

  it("asks for the front matter to be repaired before the field is written", async () => {
    // Adding a key to a block that does not parse leaves the syntax error in
    // place, so nothing the operator writes clears the finding.
    const root = await projectWithSkillDocument(
      ["---", "name: qfai-example", "description: [", "---", "", "# qfai-example", ""].join("\n"),
    );
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("front matter a host cannot read");
    expect(finding?.suggested_action).toContain("Repair the front matter first");
  });

  it("reads a skill whose directory name the document crawl ignores", async () => {
    // `dist` is on the shared ignore list and is an ordinary name for a skill.
    // The loader opens one SKILL.md per direct subdirectory whatever it is
    // called, so a descriptionless skill there fails to register in silence.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const ignored = path.join(root, ".qfai", "assistant", "skills", "dist");
    await mkdir(ignored, { recursive: true });
    await writeFile(
      path.join(ignored, "SKILL.md"),
      ["---", "name: dist", "---", "", "## dist", ""].join("\n"),
      "utf-8",
    );

    const [finding] = await registrationFindings(root);
    expect(finding?.severity).toBe("error");
    expect(finding?.file).toContain("dist");
  });

  it("asks nothing of a template that only looks like a skill", async () => {
    // The loader opens one SKILL.md per direct subdirectory. A generator
    // template under `templates/` is never registered by anything.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const templates = path.join(root, ".qfai", "assistant", "skills", "qfai-example", "templates");
    await mkdir(templates, { recursive: true });
    await writeFile(
      path.join(templates, "SKILL.md"),
      ["---", "name: <skill-name>", "---", "", "## <skill-name>", ""].join("\n"),
      "utf-8",
    );

    expect(await registrationFindings(root)).toEqual([]);
  });

  it("reports a direct skill in an ignored directory that cannot be read", async () => {
    // The crawl never reached the file, so this pass is the only place that can
    // say the skill will not load. Permission is the portable way to produce an
    // unreadable regular file, and neither Windows nor root honours it.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const root = await projectWithSkill(['description: "Does the thing."']);
    const ignored = path.join(root, ".qfai", "assistant", "skills", "tmp");
    await mkdir(ignored, { recursive: true });
    const file = path.join(ignored, "SKILL.md");
    await writeFile(file, ["---", "name: tmp", "---", ""].join("\n"), "utf-8");
    await chmod(file, 0o000);

    const findings = (await validateAssistantAssets(root, defaultConfig)).filter(
      (finding) => finding.file === file,
    );

    await chmod(file, 0o600);
    expect(findings.map((finding) => finding.code)).toContain("QFAI-SKILLS-014");
  });

  it("reports an unreadable direct skill once, not twice", async () => {
    // The crawl reaches an ordinary skill directory and has already said it
    // could not read the file. Reading it again here reports the same fault a
    // second time, in text and JSON output both.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const root = await projectWithSkill(['description: "Does the thing."']);
    const file = path.join(root, ".qfai", "assistant", "skills", "qfai-example", "SKILL.md");
    await chmod(file, 0o000);

    const findings = (await validateAssistantAssets(root, defaultConfig)).filter(
      (finding) => finding.file === file && finding.code === "QFAI-SKILLS-014",
    );

    await chmod(file, 0o600);
    expect(findings).toHaveLength(1);
  });

  it("reads an empty block as a block with no description", async () => {
    // `---` and `---` on the next line is closed and empty. Read as unclosed,
    // the operator is sent to repair delimiters that are already right.
    const root = await projectWithSkillDocument(
      ["---", "---", "", "# qfai-example", ""].join("\n"),
    );
    const findings = await registrationFindings(root);
    // The empty block declares neither field, so both are reported.
    expect(findings.map((finding) => finding.rule ?? "")).toEqual(
      expect.arrayContaining([expect.anything()]),
    );
    const description = findings.find((finding) => finding.message.includes("description:"));
    expect(description?.message).toContain("has no `description:`");
    expect(description?.suggested_action).toContain("Add `description:`");
  });

  it("follows a symlinked skill directory", async () => {
    // A shape this CLI writes itself. `isDirectory()` is false for the link, so
    // excluding on it left the skill unchecked by anything.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    const real = path.join(root, "elsewhere", "qfai-linked");
    await mkdir(real, { recursive: true });
    await writeFile(
      path.join(real, "SKILL.md"),
      ["---", "name: qfai-linked", "---", "", "## qfai-linked", ""].join("\n"),
      "utf-8",
    );
    try {
      await symlink(real, path.join(skills, "qfai-linked"), "junction");
    } catch {
      // A host without permission to link cannot exercise this case.
      return;
    }

    const codes = (await registrationFindings(root)).map((finding) => finding.code);
    expect(codes).toContain("QFAI-SKILLS-015");
  });

  it("says which host honours the opt-out", async () => {
    // Codex reads `name` and `description` and knows nothing of the flag, so
    // advice promising it everywhere would pass validation on a skill that is
    // still offered to a model.
    const root = await projectWithSkill(['argument-hint: "<subject>"']);
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("Claude Code surface");
    expect(finding?.message).toContain("Codex surface");
  });

  it("reports an entry point that is not a file", async () => {
    // A `SKILL.md` that is a directory: `stat` succeeds and the host still
    // cannot load it, and the crawl walks through rather than naming it.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(path.join(skills, "qfai-folder", "SKILL.md"), { recursive: true });

    const findings = (await validateAssistantAssets(root, defaultConfig)).filter((finding) =>
      finding.file.includes("qfai-folder"),
    );

    expect(findings.map((finding) => finding.code)).toContain("QFAI-SKILLS-014");
  });

  it("reports a skill with no usable name", async () => {
    // The host keys the skill by it, and the user invokes it by it.
    const root = await projectWithSkillDocument(
      ["---", 'description: "Does the thing."', "---", "", "# a skill", ""].join("\n"),
    );
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("no usable `name:`");
    expect(finding?.suggested_action).toContain("the name a user invokes");
  });

  it("follows a readable symlink to the entry point", async () => {
    // The host opens through the link. Refusing one here reported a skill it
    // loads without trouble.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-example");
    const real = path.join(root, "elsewhere", "SKILL.md");
    await mkdir(path.dirname(real), { recursive: true });
    await writeFile(
      real,
      ["---", "name: qfai-example", 'description: "Does the thing."', "---", ""].join("\n"),
      "utf-8",
    );
    await rm(path.join(skillDir, "SKILL.md"));
    try {
      await symlink(real, path.join(skillDir, "SKILL.md"));
    } catch {
      // A host without symlink permission cannot exercise this case.
      return;
    }

    expect(await registrationFindings(root)).toEqual([]);
  });

  it("says the opt-out is one surface's, in the action as well as the message", async () => {
    const root = await projectWithSkill(['argument-hint: "<subject>"']);
    const [finding] = await registrationFindings(root);
    expect(finding?.suggested_action).toContain("Claude Code surface");
    expect(finding?.suggested_action).toContain("guard the skill itself");
  });
});

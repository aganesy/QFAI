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
    // Both fields: the block never parsed, so neither has been looked at, and
    // an action naming one leaves valid front matter that fails again on the
    // other.
    expect(finding?.suggested_action).toContain("`name:`");
    expect(finding?.suggested_action).toContain("`description:`");
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
      (finding.file ?? "").includes("qfai-folder"),
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
    // The directory, because that is what a host lists the skill under.
    expect(finding?.suggested_action).toContain("`qfai-example`");
  });

  it("reports a name the host's own contract refuses", async () => {
    // Present and non-empty is not the contract: a capital or a space is
    // rejected by the loader, a value past the cap is truncated or dropped, and
    // one that is not the directory names a skill the user will not find.
    for (const [name, why] of [
      ["My Skill", "not lowercase letters, digits and single hyphens"],
      ["qfai_example", "not lowercase letters, digits and single hyphens"],
      ["-qfai-example", "not lowercase letters, digits and single hyphens"],
      ["qfai-other", "not the skill's directory"],
      [`qfai-${"e".repeat(62)}`, "past the 64 a host accepts"],
    ] as const) {
      const root = await projectWithSkillDocument(
        ["---", `name: ${name}`, 'description: "Does the thing."', "---", "", "# x", ""].join("\n"),
      );
      const [finding] = await registrationFindings(root);
      expect(finding?.code, name).toBe("QFAI-SKILLS-015");
      expect(finding?.message, name).toContain(why);
    }
  });

  it("accepts the name a host registers", async () => {
    const root = await projectWithSkill(['description: "Does the thing."']);
    expect(await registrationFindings(root)).toEqual([]);
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

describe("what the gate and the host disagreed about", () => {
  const findings = async (
    root: string,
  ): Promise<Awaited<ReturnType<typeof validateAssistantAssets>>> =>
    (await validateAssistantAssets(root, defaultConfig)).filter((finding) =>
      finding.code.startsWith("QFAI-SKILLS-01"),
    );

  it("reports a description the host refuses for its length", async () => {
    // The field is registration metadata, not the document. Past the cap the
    // host refuses it and the skill is not loaded, which is the same outcome as
    // having no description at all.
    const root = await projectWithSkill([`description: "${"a".repeat(1025)}"`]);
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("1025 characters");
    expect(finding?.suggested_action).toContain("Cut `description:`");
    // And the length a host does accept is accepted here.
    const ok = await projectWithSkill([`description: "${"a".repeat(1024)}"`]);
    expect(await registrationFindings(ok)).toEqual([]);
  });

  it("tells the operator to rename a directory no name can match", async () => {
    // The directory's own spelling fails the form, and every legal spelling
    // differs from it, so the action names the rename.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-registration-"));
    tempDirs.push(root);
    const skillDir = path.join(root, ".qfai", "assistant", "skills", "My Skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      ["---", "name: my-skill", 'description: "Does the thing."', "---", "", "# x", ""].join("\n"),
      "utf-8",
    );

    const [finding] = await registrationFindings(root);
    expect(finding?.suggested_action).toContain("Rename the skill's directory");
    expect(finding?.suggested_action).not.toContain("Set `name:` to `My Skill`");
  });

  it("passes over a directory the host does not list", async () => {
    // A dot-prefixed skill directory is one the host never loads.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(path.join(skills, ".draft"), { recursive: true });
    await writeFile(path.join(skills, ".draft", "SKILL.md"), "# draft\n", "utf-8");

    expect(await findings(root)).toEqual([]);
  });

  it("reports a crawled document that is not valid UTF-8", async () => {
    // An entry point holding a byte that is not UTF-8 is one the host refuses,
    // so it is reported, however well its metadata would parse.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skillDir = path.join(root, ".qfai", "assistant", "skills", "qfai-example");
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      Buffer.concat([
        Buffer.from('---\nname: qfai-example\ndescription: "Does the '),
        Buffer.from([0xff]),
        Buffer.from('thing."\n---\n\n# qfai-example\n'),
      ]),
    );

    const codes = (await findings(root)).map((finding) => finding.code);
    expect(codes).toContain("QFAI-SKILLS-014");
  });

  it("reads nothing under a hidden tree, references included", async () => {
    // Nothing under a hidden skill directory is read: its references answer no
    // rule, and its citations vouch for no document.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(path.join(skills, ".draft", "references"), { recursive: true });
    await writeFile(path.join(skills, ".draft", "SKILL.md"), "# draft\n", "utf-8");
    await writeFile(path.join(skills, ".draft", "references", "orphan.md"), "# orphan\n", "utf-8");

    const reported = (await validateAssistantAssets(root, defaultConfig)).filter((finding) =>
      (finding.file ?? "").includes(".draft"),
    );
    expect(reported).toEqual([]);
  });
  it("reports an entry point that is not valid UTF-8", async () => {
    // A byte that is not UTF-8 makes the document unreadable, as the host reads it.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    const dist = path.join(skills, "dist");
    await mkdir(dist, { recursive: true });
    await writeFile(
      path.join(dist, "SKILL.md"),
      Buffer.concat([
        Buffer.from('---\nname: dist\ndescription: "Does the '),
        Buffer.from([0xff]),
        Buffer.from('thing."\n---\n\n# dist\n'),
      ]),
    );

    const codes = (await findings(root)).map((finding) => finding.code);
    expect(codes).toContain("QFAI-SKILLS-014");
    expect(codes).not.toContain("QFAI-SKILLS-015");
  });

  it("escapes a control character in the name it reports", async () => {
    // A value read out of a document reaches the terminal escaped, so a newline
    // or an escape sequence in it cannot forge lines in the run's output.
    const root = await projectWithSkillDocument(
      ["---", 'name: "qfai-\u001b[31mexample"', 'description: "Does the thing."', "---", ""].join(
        "\n",
      ),
    );
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("\\u001b");
    expect(finding?.message).not.toContain("\u001b");
  });

  it("asks for a rename when the directory is longer than a name may be", async () => {
    // The directory's spelling is legal and its length is not, so the action
    // names the rename rather than a `name:` that fails the same check.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-skill-registration-"));
    tempDirs.push(root);
    const overlong = "a".repeat(65);
    const skillDir = path.join(root, ".qfai", "assistant", "skills", overlong);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      ["---", "name: qfai-example", 'description: "Does the thing."', "---", "", "# x", ""].join(
        "\n",
      ),
      "utf-8",
    );

    const [finding] = await registrationFindings(root);
    expect(finding?.suggested_action).toContain("Rename the skill's directory");
    expect(finding?.suggested_action).not.toContain(`Set \`name:\` to \`${overlong}\``);
  });

  it("passes over a hidden directory whose name begins with two dots", async () => {
    // The host lists no dot-prefixed directory, `..draft` included: it is a
    // name under the skills root, not a path leaving it.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const skills = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(path.join(skills, "..draft", "references"), { recursive: true });
    await writeFile(path.join(skills, "..draft", "SKILL.md"), "# draft\n", "utf-8");
    await writeFile(path.join(skills, "..draft", "references", "orphan.md"), "# orphan\n", "utf-8");

    const reported = (await validateAssistantAssets(root, defaultConfig)).filter((finding) =>
      (finding.file ?? "").includes("..draft"),
    );
    expect(reported).toEqual([]);
  });

  it("passes over a hidden directory it cannot enumerate", async () => {
    // The walk does not enter a hidden skill directory, so one this process
    // cannot read fails nothing. Permission is the portable way to produce one,
    // and neither Windows nor root honours it.
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    const root = await projectWithSkill(['description: "Does the thing."']);
    const hidden = path.join(root, ".qfai", "assistant", "skills", ".draft");
    await mkdir(hidden, { recursive: true });
    await writeFile(path.join(hidden, "SKILL.md"), "# draft\n", "utf-8");
    await chmod(hidden, 0o000);

    const reported = await findings(root).catch((error: unknown) => error);

    await chmod(hidden, 0o700);
    expect(reported).toEqual([]);
  });

  it("says what an unreadable reference stops, and what it does not", async () => {
    // The host registers the skill from its entry point and reads a reference
    // only where a step names one, so the finding says the step fails, not the
    // load.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const references = path.join(
      root,
      ".qfai",
      "assistant",
      "skills",
      "qfai-example",
      "references",
    );
    await mkdir(references, { recursive: true });
    const file = path.join(references, "note.md");
    await writeFile(file, Buffer.concat([Buffer.from("# note\n"), Buffer.from([0xff])]));

    const [finding] = (await validateAssistantAssets(root, defaultConfig)).filter(
      (item) => item.code === "QFAI-SKILLS-014" && item.file === file,
    );
    expect(finding?.message).toContain("only where a step names it");
    expect(finding?.message).not.toContain("registers no skill");
  });

  it("reads a hidden directory inside a registered skill", async () => {
    // Inside a registered skill, a dot-prefixed directory is read: the skill can
    // name a document under it, and the host then opens it.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const internal = path.join(
      root,
      ".qfai",
      "assistant",
      "skills",
      "qfai-example",
      "references",
      ".internal",
    );
    await mkdir(internal, { recursive: true });
    const file = path.join(internal, "guide.md");
    await writeFile(file, Buffer.concat([Buffer.from("# guide\n"), Buffer.from([0xff])]));

    const codes = (await validateAssistantAssets(root, defaultConfig))
      .filter((item) => item.file === file)
      .map((item) => item.code);
    expect(codes).toContain("QFAI-SKILLS-014");
  });

  it("reads a directory named like a build output inside a registered skill", async () => {
    // Inside a registered skill, a directory named like build output is read:
    // the skill can name a document under it.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const tmp = path.join(
      root,
      ".qfai",
      "assistant",
      "skills",
      "qfai-example",
      "references",
      "tmp",
    );
    await mkdir(tmp, { recursive: true });
    const file = path.join(tmp, "guide.md");
    await writeFile(file, Buffer.concat([Buffer.from("# guide\n"), Buffer.from([0xff])]));

    const codes = (await validateAssistantAssets(root, defaultConfig))
      .filter((item) => item.file === file)
      .map((item) => item.code);
    expect(codes).toContain("QFAI-SKILLS-014");
  });

  it("calls a nested SKILL.md a reference, not an entry point", async () => {
    // A template named SKILL.md inside a skill registers nothing, so an invalid
    // byte in it stops the step that names it rather than the skill.
    const root = await projectWithSkill(['description: "Does the thing."']);
    const templates = path.join(root, ".qfai", "assistant", "skills", "qfai-example", "templates");
    await mkdir(templates, { recursive: true });
    const file = path.join(templates, "SKILL.md");
    await writeFile(file, Buffer.concat([Buffer.from("# template\n"), Buffer.from([0xff])]));

    const [finding] = (await validateAssistantAssets(root, defaultConfig)).filter(
      (item) => item.code === "QFAI-SKILLS-014" && item.file === file,
    );
    expect(finding?.message).toContain("only where a step names it");
  });

  it("measures a description as a host reads it, trimmed", async () => {
    // Padding around the text is not part of the value the host measures.
    const padded = await projectWithSkill([`description: " ${"a".repeat(1024)} "`]);
    expect(await registrationFindings(padded)).toEqual([]);
    const over = await projectWithSkill([`description: " ${"a".repeat(1025)}"`]);
    const [finding] = await registrationFindings(over);
    expect(finding?.message).toContain("1025 characters");
  });

  it("counts a description in characters, not UTF-16 units", async () => {
    // An emoji outside the Basic Multilingual Plane is one character to a host
    // and two units to a JavaScript string.
    const emoji = String.fromCodePoint(0x1f600);
    const within = await projectWithSkill([`description: "${emoji.repeat(1024)}"`]);
    expect(await registrationFindings(within)).toEqual([]);
    const over = await projectWithSkill([`description: "${emoji.repeat(1025)}"`]);
    const [finding] = await registrationFindings(over);
    expect(finding?.message).toContain("1025 characters");
  });

  it("strips a description with the host's whitespace set", async () => {
    // U+FEFF is kept by the host's strip and counted; U+0085 is removed.
    const bom = await projectWithSkill([`description: "${"a".repeat(1024)}\uFEFF"`]);
    expect((await registrationFindings(bom))[0]?.message).toContain("1025 characters");
    const nel = await projectWithSkill([`description: "${"a".repeat(1024)}\u0085"`]);
    expect(await registrationFindings(nel)).toEqual([]);
  });

  it("refuses a description holding an angle bracket, as a host does", async () => {
    const root = await projectWithSkill(['description: "Use <file> inputs."']);
    const [finding] = await registrationFindings(root);
    expect(finding?.message).toContain("holding `<` or `>`");
  });

  it("does not read front matter behind a byte order mark", async () => {
    // The host keeps a leading byte order mark, so it finds no opening
    // delimiter behind one and registers nothing.
    const body = [
      "---",
      "name: qfai-example",
      'description: "Does the thing."',
      "---",
      "",
      "# x",
      "",
    ].join("\n");
    const root = await projectWithSkillDocument(body);
    const file = path.join(root, ".qfai", "assistant", "skills", "qfai-example", "SKILL.md");
    await writeFile(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body)]));

    expect((await registrationFindings(root)).length).toBeGreaterThan(0);
    await writeFile(file, body, "utf-8");
    expect(await registrationFindings(root)).toEqual([]);
  });
});

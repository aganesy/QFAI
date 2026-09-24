import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  validateStoryDirectories,
  validateStoryTreeStructureModel,
} from "../../src/core/validators/storyTreeStructure.js";

const roots: string[] = [];
const spec = ".qfai/spec";
const flow = `${spec}/02_business-flow/business-flow-0001`;
const story = `${flow}/user-story-0001-0001`;
const secondStory = `${flow}/user-story-0001-0002`;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function files(acRef = "AC-0001-0001-01"): Map<string, string> {
  return new Map([
    [`${flow}/business-flow.md`, "# BF-0001: Develop and verify\n"],
    [`${story}/01_User-story.md`, "# US-0001-0001: First story\n"],
    [
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: First criterion\n  Given a project\n  When it is checked\n  Then it passes\n```\n",
    ],
    [
      `${story}/03_Example.md`,
      `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | ${acRef} | project | passes |\n`,
    ],
    [
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | Check the project | EX-0001-0001-01 |\n",
    ],
  ]);
}

function findings(contents: Map<string, string>, code: string) {
  return validateStoryTreeStructureModel(buildStoryTreeModel(contents)).filter(
    (entry) => entry.code === code,
  );
}

async function put(root: string, relative: string, content: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

describe("BF-0001 story-directory examples", () => {
  it("accepts exactly the three story files", async () => {
    // QFAI:EX-0001-0005-04
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-story-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`)) await put(root, relative, content);
    }
    expect((await readdir(path.join(root, story))).sort()).toEqual([
      "01_User-story.md",
      "02_Acceptance-Criteria.md",
      "03_Example.md",
    ]);
    expect(await validateStoryDirectories(path.join(root, spec))).toEqual([]);
  });

  async function extra(name: string, kind: "file" | "directory") {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-extra-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`)) await put(root, relative, content);
    }
    if (kind === "file") await put(root, `${story}/${name}`, "extra");
    else await mkdir(path.join(root, story, name));
    const issues = await validateStoryDirectories(path.join(root, spec));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "QFAI-STORY-001", file: path.join(root, story) });
    expect(issues[0]?.message).toContain(name);
  }

  it("names an extra notes file", async () => {
    // QFAI:EX-0001-0005-05
    await extra("notes.md", "file");
  });

  it("names an extra fixtures directory", async () => {
    // QFAI:EX-0001-0005-06
    await extra("fixtures", "directory");
  });

  it("names a missing example file", async () => {
    // QFAI:EX-0001-0005-07
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf1-missing-"));
    roots.push(root);
    for (const [relative, content] of files()) {
      if (relative.startsWith(`${story}/`) && !relative.endsWith("03_Example.md")) {
        await put(root, relative, content);
      }
    }
    const issues = await validateStoryDirectories(path.join(root, spec));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ code: "QFAI-STORY-001", file: path.join(root, story) });
    expect(issues[0]?.message).toContain("03_Example.md");
  });
});

describe("BF-0001 ID examples", () => {
  it("rejects an AC with a three-digit tail and names its file", () => {
    // QFAI:EX-0001-0008-02
    const contents = files();
    contents.set(
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-001\nScenario: Malformed\n  Given a project\n```\n",
    );
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/02_Acceptance-Criteria.md`,
          message: expect.stringContaining("AC-0001-0001-001"),
        }),
      ]),
    );
  });

  it("reports both files that declare one US ID", () => {
    // QFAI:EX-0001-0008-03
    const contents = files();
    contents.set(`${secondStory}/01_User-story.md`, "# US-0001-0001: Duplicate\n");
    const duplicates = findings(contents, "QFAI-STORY-002").filter((entry) =>
      entry.message.includes("defined more than once"),
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.message).toContain(`${story}/01_User-story.md`);
    expect(duplicates[0]?.message).toContain(`${secondStory}/01_User-story.md`);
  });

  it("accepts matching flow, story, AC and EX IDs", () => {
    // QFAI:EX-0001-0008-04
    expect(findings(files(), "QFAI-STORY-002")).toEqual([]);
  });

  it("rejects a story numbered for another flow", () => {
    // QFAI:EX-0001-0008-05
    const contents = files();
    contents.set(`${story}/01_User-story.md`, "# US-0002-0001: Wrong flow\n");
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/01_User-story.md`,
          message: expect.stringContaining("US-0002-0001"),
        }),
      ]),
    );
  });

  it("rejects a story directory numbered differently from its ID", () => {
    // QFAI:EX-0001-0008-06
    const contents = files();
    contents.set(
      `${secondStory}/01_User-story.md`,
      contents.get(`${story}/01_User-story.md`) ?? "",
    );
    contents.delete(`${story}/01_User-story.md`);
    expect(findings(contents, "QFAI-STORY-002")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${secondStory}/01_User-story.md`,
          message: expect.stringContaining("user-story-0001-0002"),
        }),
      ]),
    );
  });
});

describe("BF-0001 EX and BR reference examples", () => {
  function invalidAcRef(acRef: string) {
    const issue = findings(files(acRef), "QFAI-STORY-004").find((entry) =>
      entry.refs?.includes("EX-0001-0001-01"),
    );
    expect(issue).toMatchObject({ file: `${story}/03_Example.md` });
    expect(issue?.message).toContain("EX-0001-0001-01");
  }

  it("accepts one existing same-story AC reference", () => {
    // QFAI:EX-0001-0009-01
    // QFAI:EX-0001-0009-06
    expect(findings(files(), "QFAI-STORY-004")).toEqual([]);
  });

  it("rejects an empty AC reference", () => {
    // QFAI:EX-0001-0009-02
    invalidAcRef("");
  });

  it("rejects two AC references", () => {
    // QFAI:EX-0001-0009-03
    invalidAcRef("AC-0001-0001-01, AC-0001-0001-02");
  });

  it("rejects an AC in another story", () => {
    // QFAI:EX-0001-0009-04
    const contents = files("AC-0001-0002-01");
    contents.set(
      `${secondStory}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0002-01\nScenario: Other story\n  Given a project\n```\n",
    );
    const issue = findings(contents, "QFAI-STORY-004").find((entry) =>
      entry.refs?.includes("EX-0001-0001-01"),
    );
    expect(issue).toMatchObject({ file: `${story}/03_Example.md` });
    expect(issue?.message).toContain("EX-0001-0001-01");
  });

  it("rejects an undeclared AC", () => {
    // QFAI:EX-0001-0009-05
    invalidAcRef("AC-0001-0001-02");
  });

  it("names a criterion with no example", () => {
    // QFAI:EX-0001-0009-07
    const contents = files();
    contents.set(
      `${story}/02_Acceptance-Criteria.md`,
      `${contents.get(`${story}/02_Acceptance-Criteria.md`) ?? ""}\n\`\`\`gherkin\n# AC-0001-0001-02\nScenario: Uncovered\n  Given a project\n\`\`\`\n`,
    );
    expect(findings(contents, "QFAI-STORY-004")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/02_Acceptance-Criteria.md`,
          message: expect.stringContaining("AC-0001-0001-02 has no example"),
        }),
      ]),
    );
  });

  it("accepts an EX cited by two rules", () => {
    // QFAI:EX-0001-0009-08
    const contents = files();
    contents.set(
      `${story}/03_Example.md`,
      "| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | AC-0001-0001-01 | first | passes |\n| EX-0001-0001-02 | AC-0001-0001-01 | second | passes |\n",
    );
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | First rule | EX-0001-0001-01, EX-0001-0001-02 |\n| BR-0002 | Second rule | EX-0001-0001-01 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual([]);
  });

  it("names a rule with no examples", () => {
    // QFAI:EX-0001-0009-09
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | No examples | |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001 has no examples"),
        }),
      ]),
    );
  });

  it("names an example no rule cites", () => {
    // QFAI:EX-0001-0009-10
    const contents = files();
    contents.delete(`${spec}/03_contract/cli/check.md`);
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${story}/03_Example.md`,
          message: expect.stringContaining("EX-0001-0001-01 is not cited"),
        }),
      ]),
    );
  });

  it("names an unknown example and the contract that cites it", () => {
    // QFAI:EX-0001-0009-11
    const contents = files();
    contents.set(
      `${spec}/03_contract/cli/check.md`,
      "## Rules\n\n| BR-ID | Statement | Examples |\n| --- | --- | --- |\n| BR-0001 | Unknown example | EX-0001-0001-99 |\n",
    );
    expect(findings(contents, "QFAI-STORY-005")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: `${spec}/03_contract/cli/check.md`,
          message: expect.stringContaining("BR-0001 cites unknown EX-0001-0001-99"),
        }),
      ]),
    );
  });
});

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { buildStoryTreeModel } from "../../src/core/storyTree/tree.js";
import {
  validateStoryDirectories,
  validateStoryTreeStructureModel,
} from "../../src/core/validators/storyTreeStructure.js";
import { captureStdout } from "../helpers/stdout.js";

const roots: string[] = [];
const spec = ".qfai/spec";
const flow = `${spec}/02_business-flow/business-flow-0001`;
const story = `${flow}/user-story-0001-0001`;

async function sandbox(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-bf0001-acceptance-"));
  roots.push(root);
  return root;
}

async function put(root: string, relative: string, body: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

function storyFiles(acRef = "AC-0001-0001-01"): Map<string, string> {
  return new Map([
    [`${flow}/business-flow.md`, "# BF-0001: Checkout\n"],
    [`${story}/01_User-story.md`, "# US-0001-0001: Checkout\n"],
    [
      `${story}/02_Acceptance-Criteria.md`,
      "```gherkin\n# AC-0001-0001-01\nScenario: Complete checkout\n  Given a cart\n  When checkout completes\n  Then a total is shown\n```\n",
    ],
    [
      `${story}/03_Example.md`,
      `| EX-ID | AC-Ref | Input | Expected |\n| --- | --- | --- | --- |\n| EX-0001-0001-01 | ${acRef} | Two items | Total |\n`,
    ],
  ]);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("BF-0001 story-tree acceptance", () => {
  // QFAI:AC-0001-0005-01
  it("seeds both project tables and the policy, flow and contract roots at configured defaults", async () => {
    const root = await sandbox();
    await captureStdout(() => runInit({ dir: root, force: false, dryRun: false, yes: true }));

    const names = await readdir(path.join(root, spec), { withFileTypes: true });
    expect(names.filter((entry) => entry.isFile()).map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["decisions.md", "open-questions.md"]),
    );
    expect(names.filter((entry) => entry.isDirectory()).map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["01_policy", "02_business-flow", "03_contract"]),
    );
    const configBody = await readFile(path.join(root, "qfai.config.yaml"), "utf8");
    expect(configBody).toContain("specsDir: .qfai/spec\n");
    expect(configBody).toContain("contractsDir: .qfai/spec/03_contract\n");
  });

  // QFAI:AC-0001-0005-03
  it("accepts only the three named story files and reports an added directory", async () => {
    const root = await sandbox();
    const files = storyFiles();
    for (const [relative, body] of files) await put(root, relative, body);

    const storyDir = path.join(root, story);
    expect((await readdir(storyDir)).sort()).toEqual([
      "01_User-story.md",
      "02_Acceptance-Criteria.md",
      "03_Example.md",
    ]);
    expect(await validateStoryDirectories(path.join(root, spec))).toEqual([]);

    await mkdir(path.join(storyDir, "notes"));
    const findings = await validateStoryDirectories(path.join(root, spec));
    expect(findings.filter((finding) => finding.code === "QFAI-STORY-001")).toHaveLength(1);
    expect(findings[0]?.message).toContain("extra notes");
  });

  // QFAI:AC-0001-0008-02
  it("rejects a story ID whose number disagrees with its parent flow", () => {
    const files = storyFiles();
    expect(
      validateStoryTreeStructureModel(buildStoryTreeModel(files)).filter(
        (finding) => finding.code === "QFAI-STORY-002",
      ),
    ).toEqual([]);

    files.set(`${story}/01_User-story.md`, "# US-0002-0001: Checkout\n");
    const findings = validateStoryTreeStructureModel(buildStoryTreeModel(files));
    expect(
      findings.some(
        (finding) => finding.code === "QFAI-STORY-002" && finding.refs?.includes("US-0002-0001"),
      ),
    ).toBe(true);
  });

  // QFAI:AC-0001-0009-01
  it("requires one existing same-story AC reference per example and an example per AC", () => {
    const valid = storyFiles();
    expect(
      validateStoryTreeStructureModel(buildStoryTreeModel(valid)).filter(
        (finding) => finding.code === "QFAI-STORY-004",
      ),
    ).toEqual([]);

    for (const acRef of ["AC-0001-0001-01, AC-0001-0001-02", "AC-0002-0001-01"]) {
      const invalid = storyFiles(acRef);
      const findings = validateStoryTreeStructureModel(buildStoryTreeModel(invalid));
      expect(findings.some((finding) => finding.code === "QFAI-STORY-004")).toBe(true);
      expect(findings.some((finding) => finding.message.includes("has no example"))).toBe(true);
    }
  });
});

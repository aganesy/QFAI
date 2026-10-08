import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

/** A step carrying `env:` twice, the shape a scripted text edit leaves behind. */
const DUPLICATE_KEY = [
  "name: ci",
  "on: push",
  "jobs:",
  "  build:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - run: echo hi",
  "        env:",
  '          A: "1"',
  "        env:",
  '          B: "2"',
  "",
].join("\n");

const VALID =
  "name: ok\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n";

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-workflow-parse-"));
  roots.push(root);
  await writeFile(path.join(root, "qfai.config.yaml"), "paths:\n  specsDir: .qfai/spec\n", "utf-8");
  for (const [relative, text] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text, "utf-8");
  }
  return root;
}

async function parseFindings(root: string) {
  const data = await createDoctorData({ startDir: root, rootExplicit: true });
  return data.checks.filter((check) => check.id.startsWith("workflows.parse"));
}

describe("qfai doctor warns about a workflow file that cannot be parsed", () => {
  // QFAI:EX-0003-0011-29
  it("warns for a key that appears twice, naming the file and the line, and changes nothing", async () => {
    // QFAI:AC-0003-0011-13
    const root = await project({ ".github/workflows/ci.yml": DUPLICATE_KEY });

    const found = await parseFindings(root);

    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("workflows.parse.workflows/ci.yml");
    expect(found[0]?.severity).toBe("warning");
    expect(found[0]?.message).toContain(".github/workflows/ci.yml cannot be parsed at line 10");
    expect(found[0]?.message).toContain("Map keys must be unique");
    expect(await readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf-8")).toBe(
      DUPLICATE_KEY,
    );
  });

  // QFAI:EX-0003-0011-30
  it("reads composite actions too, and raises nothing for a valid file or a file elsewhere", async () => {
    // QFAI:AC-0003-0011-13
    const root = await project({
      ".github/workflows/ok.yml": VALID,
      ".github/actions/good/action.yaml": VALID,
      ".github/actions/setup/action.yml": "a: 1\n\tb: 2\n",
      ".github/workflows/notes.txt": DUPLICATE_KEY,
      ".github/dependabot.yml": DUPLICATE_KEY,
    });

    const found = await parseFindings(root);

    expect(found.map((check) => check.id)).toEqual(["workflows.parse.actions/setup/action.yml"]);
    expect(found[0]?.message).toContain(".github/actions/setup/action.yml cannot be parsed");
  });

  // QFAI:EX-0003-0011-30
  it("raises nothing for a project with no workflow directory", async () => {
    // QFAI:AC-0003-0011-13
    expect(await parseFindings(await project({}))).toEqual([]);
  });
});

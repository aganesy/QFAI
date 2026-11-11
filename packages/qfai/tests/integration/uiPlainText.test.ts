/**
 * Acceptance of the plain-text check through `validateProject`: a project with
 * a `qfai.config.yaml`, prototype pages and declared surface files, read the
 * way `qfai validate` reads it.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-plain-text-at-"));
  roots.push(root);
  const all = { "qfai.config.yaml": 'uiux:\n  surfacePaths: ["src/**"]\n', ...files };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

async function uitext(root: string, profile: "prototyping" | "sdd" = "prototyping") {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.filter((found) => found.code.startsWith("QFAI-UITEXT-"));
}

const REASON = "<!-- qfai-text: why=Orders sync once a night; without=Users expect live totals -->";

// QFAI:AC-0001-0297-01
describe("a plain text without a reason fails", () => {
  it("fails in prototyping with the remedies, and raises nothing in sdd", async () => {
    const root = await projectWith({
      ".qfai/prototype/final/index.html": "<main><p>Manage all your orders easily.</p></main>\n",
    });
    const found = await uitext(root);
    expect(found.map((item) => [item.code, item.severity])).toEqual([["QFAI-UITEXT-001", "error"]]);
    expect(found[0]?.suggested_action).toMatch(/Delete[\s\S]*Replace[\s\S]*Move[\s\S]*reason/);
    expect(await uitext(root, "sdd")).toEqual([]);
  });
});

// QFAI:AC-0001-0297-02
describe("a reason that leaves out what is asked fails", () => {
  it("fails a reason with no without, and passes a complete one", async () => {
    const root = await projectWith({
      "src/a.html": `<!-- qfai-text: why=Needed -->\n<p>Totals update nightly.</p>\n${REASON}\n<p>Second text.</p>\n`,
    });
    expect((await uitext(root)).map((item) => item.code)).toEqual(["QFAI-UITEXT-002"]);
  });
});

// QFAI:AC-0001-0297-03
describe("text that names, labels or reports is not checked", () => {
  it("raises nothing for a heading, a button, a label and an alert", async () => {
    const root = await projectWith({
      "src/a.vue":
        '<template>\n  <h1>Orders</h1>\n  <Button>Save</Button>\n  <label>Search</label>\n  <div role="alert">Could not save.</div>\n  <p>{{ total }}</p>\n</template>\n',
    });
    expect(await uitext(root)).toEqual([]);
  });
});

// QFAI:AC-0001-0297-04
describe("the files read are the current prototype and the declared surface", () => {
  it("reads the latest iteration and the selected components, not old pages or tests", async () => {
    const text = "<p>Totals update nightly.</p>\n";
    const root = await projectWith({
      ".qfai/prototype/iter-01/index.html": text,
      ".qfai/prototype/iter-03/index.html": text,
      "src/a.svelte": text,
      "src/a.test.tsx": `export const A = () => ${text}`,
    });
    expect((await uitext(root)).map((item) => item.file).sort()).toEqual([
      ".qfai/prototype/iter-03/index.html",
      "src/a.svelte",
    ]);
  });
});

// QFAI:AC-0001-0297-05
describe("JSX needs the TypeScript compiler the project installs", () => {
  it("raises one 003 when the project cannot load typescript", async () => {
    const root = await projectWith({ "src/a.tsx": "export const A = () => <p>Hi</p>;\n" });
    const found = await uitext(root);
    expect(found.map((item) => [item.code, item.file])).toEqual([
      ["QFAI-UITEXT-003", "qfai.config.yaml"],
    ]);
  });
});

// QFAI:AC-0001-0297-06
describe("the duty reaches the agents that write and review screens", () => {
  it("ships the comment form to writers and the reason review to reviewers", async () => {
    const assistant = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "assets",
      "init",
      ".qfai",
      "assistant",
    );
    const read = (relative: string): Promise<string> =>
      readFile(path.join(assistant, ...relative.split("/")), "utf-8");
    for (const writer of [
      "skill/qfai-prototyping/references/generator-prompt.md",
      "skill/qfai-implement/references/ui-affecting.md",
      "agent/fullstack-engineer.md",
    ]) {
      const text = await read(writer);
      expect(text).toContain("qfai-text: why=");
      expect(text).toMatch(/^1\. Delete/m);
    }
    for (const reviewer of [
      "skill/qfai-prototyping/references/reviewer-prompt.md",
      "agent/product-surface-reviewer.md",
    ]) {
      expect(await read(reviewer)).toContain("qfai-text");
    }
  });
});

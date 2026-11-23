/**
 * Acceptance of the legacy-pattern warnings: read through `validateProject` in each profile, and
 * listed in the shipped implementation UI guidance.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { Issue, ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-patterns-at-"));
  roots.push(root);
  const all = { "qfai.config.yaml": 'uiux:\n  surfacePaths: ["src/**"]\n', ...files };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

async function legacy(root: string, profile: ValidationProfile): Promise<Issue[]> {
  const result = await validateProject(root, undefined, { profile });
  return result.issues.filter((found) => found.code.startsWith("QFAI-LEGACY-"));
}

// QFAI:AC-0001-0316-01
// QFAI:AC-0001-0316-02
// QFAI:AC-0001-0316-03
describe("legacy patterns are warnings in the four UI profiles only", () => {
  // QFAI:EX-0001-0316-07
  it("reports a script with no integrity in prototyping, saas-package, verify and full", async () => {
    const root = await projectWith({
      "src/index.html": [
        "<!doctype html>",
        "<head>",
        '<script src="https://cdn.example.com/a.js"></script>',
        '<script src="//cdn.example.com/b.js"></script>',
        '<script src="https://cdn.example.com/c.js" integrity="sha384-abc" crossorigin="anonymous"></script>',
        '<script src="/local.js"></script>',
        '<!-- <script src="https://cdn.example.com/old.js"></script> -->',
        "</head>",
        "",
      ].join("\n"),
    });
    const reporting: ValidationProfile[] = ["prototyping", "saas-package", "verify", "full"];
    const silent: ValidationProfile[] = ["discussion", "sdd", "atdd", "tdd", "drift"];
    for (const profile of reporting) {
      const found = await legacy(root, profile);
      expect(found.map((item) => [item.code, item.severity, item.file, item.loc?.line])).toEqual([
        ["QFAI-LEGACY-001", "warning", "src/index.html", 3],
        ["QFAI-LEGACY-001", "warning", "src/index.html", 4],
      ]);
    }
    for (const profile of silent) expect(await legacy(root, profile)).toEqual([]);
  });

  it("reads a .css file the surface paths select", async () => {
    const root = await projectWith({ "src/form.css": "input:invalid { color: red; }\n" });
    const found = await legacy(root, "prototyping");
    expect(found.map((item) => [item.code, item.file, item.loc?.line])).toEqual([
      ["QFAI-LEGACY-002", "src/form.css", 1],
    ]);
  });

  it("warns about a hand-built modal where no catalogue is installed", async () => {
    const root = await projectWith({ "src/page.html": '<div role="dialog"></div>\n' });
    const found = await legacy(root, "prototyping");
    expect(found.map((item) => [item.code, item.file, item.loc?.line])).toEqual([
      ["QFAI-LEGACY-003", "src/page.html", 1],
    ]);
  });
});

// QFAI:AC-0001-0316-04
describe("the implementation UI guidance lists the warnings", () => {
  // QFAI:EX-0001-0316-08
  it("names each code with its replacement and that replacement's Baseline status", async () => {
    const guidance = await readFile(
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "assets",
        "init",
        ".qfai",
        "assistant",
        "skill",
        "qfai-implement",
        "references",
        "ui-affecting.md",
      ),
      "utf-8",
    );
    const text = guidance.replace(/\s*\n\s*/g, " ");
    const section = text.slice(text.indexOf("## Legacy patterns"));
    for (const [code, replacement] of [
      ["QFAI-LEGACY-001", "Subresource Integrity"],
      ["QFAI-LEGACY-002", "`:user-invalid`"],
      ["QFAI-LEGACY-003", "`<dialog>`"],
    ] as const) {
      const row = section.split("|").findIndex((cell) => cell.trim() === `\`${code}\``);
      expect(row, code).toBeGreaterThan(-1);
      expect(section).toContain(replacement);
    }
    expect(section).toContain("Baseline Widely available");
  });
});

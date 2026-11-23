/**
 * The warnings validate raises for a legacy pattern whose replacement is Baseline Widely available.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../../src/core/config.js";
import type { Issue } from "../../../src/core/types.js";
import { validateLegacyPatterns } from "../../../src/core/validators/legacyPatterns.js";

const roots: string[] = [];

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) await rm(root, { recursive: true, force: true });
  }
});

const config: QfaiConfig = {
  ...defaultConfig,
  uiux: { ...defaultConfig.uiux, surfacePaths: ["src/**"] },
};

async function projectWith(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-patterns-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, ...name.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content, "utf-8");
  }
  return root;
}

function rows(
  found: readonly Issue[],
): Array<[string, string, string | undefined, number | undefined]> {
  return found.map((item) => [item.code, item.severity, item.file, item.loc?.line]);
}

const homeTsx = [
  "export const Home = ({ open }: { open: boolean }) => (",
  "  <main>",
  '    <div role="dialog" aria-modal="true" />',
  "    <div aria-modal={open} />",
  '    <dialog aria-modal="true" />',
  '    <div aria-modal="false" />',
  '    <Modal role="dialog" />',
  '    <ul role="menu" />',
  "  </main>",
  ");",
  "",
].join("\n");

describe("a script from another origin with no integrity attribute", () => {
  // QFAI:EX-0001-0316-01
  it("warns at each such script in HTML, not one with integrity, same-origin or commented out", async () => {
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
    const found = await validateLegacyPatterns(root, config);
    expect(rows(found)).toEqual([
      ["QFAI-LEGACY-001", "warning", "src/index.html", 3],
      ["QFAI-LEGACY-001", "warning", "src/index.html", 4],
    ]);
    expect(found[0]?.message).toContain("`https://cdn.example.com/a.js`");
    expect(found[0]?.suggested_action).toContain("integrity");
  });

  // QFAI:EX-0001-0316-02
  it("reads a literal src in JSX and Vue, not an expression or a Script component", async () => {
    const root = await projectWith({
      "src/app.tsx": [
        "export const App = ({ cdn }: { cdn: string }) => (<head>",
        '  <script src="https://cdn.example.com/a.js" />',
        "  <script src={cdn} />",
        '  <Script src="https://cdn.example.com/b.js" />',
        "</head>);",
        "",
      ].join("\n"),
      "src/page.vue": '<script src="https://cdn.example.com/c.js"></script>\n<template />\n',
    });
    expect(rows(await validateLegacyPatterns(root, config))).toEqual([
      ["QFAI-LEGACY-001", "warning", "src/app.tsx", 2],
      ["QFAI-LEGACY-001", "warning", "src/page.vue", 1],
    ]);
  });
});

describe("error styling on :invalid", () => {
  // QFAI:EX-0001-0316-03
  it("warns at each :invalid in a .css selector, naming its compound", async () => {
    const root = await projectWith({
      "src/styles/form.css": [
        "input:invalid { border-color: red; }",
        ".field :invalid, select:invalid { color: red; }",
        "input:user-invalid { color: red; }",
        "form:invalid button { opacity: 0.5; }",
        "input:not(:invalid) { color: green; }",
        "/* input:invalid { color: red; } */",
        'a::after { content: ":invalid"; }',
        "",
      ].join("\n"),
    });
    const found = await validateLegacyPatterns(root, config);
    expect(rows(found)).toEqual([
      ["QFAI-LEGACY-002", "warning", "src/styles/form.css", 1],
      ["QFAI-LEGACY-002", "warning", "src/styles/form.css", 2],
      ["QFAI-LEGACY-002", "warning", "src/styles/form.css", 2],
    ]);
    expect(found.map((item) => item.message)).toEqual([
      expect.stringContaining("`input:invalid`"),
      expect.stringContaining("`:invalid`"),
      expect.stringContaining("`select:invalid`"),
    ]);
    expect(found[0]?.suggested_action).toContain(":user-invalid");
  });

  // QFAI:EX-0001-0316-04
  it("reads a <style> element of a Vue file, and not the text of a .tsx file", async () => {
    const root = await projectWith({
      "src/form.vue": [
        "<template><input required /></template>",
        "<style>",
        "input:invalid { color: red; }",
        "</style>",
        "",
      ].join("\n"),
      "src/form.tsx": 'export const rule = "input:invalid";\n',
    });
    expect(rows(await validateLegacyPatterns(root, config))).toEqual([
      ["QFAI-LEGACY-002", "warning", "src/form.vue", 3],
    ]);
  });
});

describe("a hand-built modal where no component catalogue is installed", () => {
  // QFAI:EX-0001-0316-05
  it("warns at each native element carrying role=dialog or aria-modal", async () => {
    const root = await projectWith({
      "src/pages/home.tsx": homeTsx,
      "src/pages/about.html": '<main>\n<div role="dialog">\n</div>\n</main>\n',
    });
    const found = await validateLegacyPatterns(root, config);
    expect(rows(found)).toEqual([
      ["QFAI-LEGACY-003", "warning", "src/pages/about.html", 2],
      ["QFAI-LEGACY-003", "warning", "src/pages/home.tsx", 3],
      ["QFAI-LEGACY-003", "warning", "src/pages/home.tsx", 4],
    ]);
    expect(found[1]?.message).toContain('`role="dialog"` and `aria-modal`');
    expect(found[2]?.message).toContain("`aria-modal`");
    expect(found[2]?.message).not.toContain("role=");
    expect(found[0]?.suggested_action).toContain("<dialog>");
  });

  // QFAI:EX-0001-0316-06
  it("leaves the modal to the catalogue warning where a registry is declared", async () => {
    const root = await projectWith({
      "src/pages/home.tsx": homeTsx,
      "src/pages/about.html": '<main>\n<div role="dialog">\n</div>\n</main>\n',
    });
    const withRegistry: QfaiConfig = {
      ...config,
      uiux: { ...config.uiux, registries: { shadcn: "https://ui.shadcn.com/r/{name}.json" } },
    };
    expect(await validateLegacyPatterns(root, withRegistry)).toEqual([]);
  });
});

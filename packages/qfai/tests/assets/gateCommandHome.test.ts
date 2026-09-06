/**
 * Gate commands shipped with three homes and two skills pointed at two of them.
 *
 * `constitution/quality.md` owns the capability list and routes the commands to
 * `catalog/tech.md`; `catalog/structure.md` nonetheless headed a shorter,
 * four-entry command list with `(SSOT)`. `/qfai-verify`'s steering refresh wrote
 * "standard gate commands" into `structure.md` while `/qfai-implement` Stage 0
 * read them from `tech.md#standard-commands-copy-paste`, so a project that only
 * ran `/qfai-verify` left the file `/qfai-implement` reads on its placeholders.
 *
 * These assertions pin the single home: `tech.md#standard-commands-copy-paste`
 * carries a command for every capability `quality.md` names, `structure.md`
 * claims no authority of its own, and both skills fill and read the same file.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const STRUCTURE = "assistant/catalog/structure.md";
const TECH = "assistant/catalog/tech.md";
const QUALITY = "assistant/constitution/quality.md";
const VERIFY = "assistant/skills/qfai-verify/SKILL.md";
const IMPLEMENT = "assistant/skills/qfai-implement/SKILL.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("leaves structure.md with no competing SSOT claim over the gate set", async () => {
    // The label made the conflict worse than a duplication: a reader resolving
    // it by authority picked the file that omitted two of the five capabilities.
    const structure = await read(tree, STRUCTURE);
    expect(structure).not.toContain("## Quality gates (SSOT)");
    expect(structure).toContain("## Quality gates");
  });

  it("points structure.md at the two files that do own the gate set", async () => {
    const structure = await read(tree, STRUCTURE);
    expect(structure).toContain("constitution/quality.md");
    expect(structure).toContain("catalog/tech.md#standard-commands-copy-paste");
  });

  it("covers every capability quality.md names from the one command home", async () => {
    // `quality.md` lists format / lint / typecheck / tests / pack, and calls a
    // capability with no discoverable command UNRUN rather than passed.
    const quality = await read(tree, QUALITY);
    expect(quality).toContain("- format check - lint - typecheck - tests - pack / distribution");

    const tech = await read(tree, TECH);
    const commands = tech.slice(tech.indexOf("## Standard commands (copy-paste)"));
    for (const entry of [
      "- Format:",
      "- Lint:",
      "- Typecheck:",
      "- Test:",
      "- Pack / distribution:",
    ]) {
      expect(commands, `missing gate command entry ${entry}`).toContain(entry);
    }
  });

  it("keeps the how-to-run block in structure.md free of gate commands", async () => {
    // Otherwise the steering-refresh checklist fills `<test command>` here as a
    // real value while `tech.md` holds the same one — the drift, re-created.
    const structure = await read(tree, STRUCTURE);
    const howTo = structure.slice(structure.indexOf("## How to run locally"));
    expect(howTo).not.toContain("<test command>");
    expect(howTo).not.toContain("<build command>");
    expect(howTo).toContain("catalog/tech.md#standard-commands-copy-paste");
  });

  it("sends /qfai-verify's steering refresh to the file /qfai-implement reads", async () => {
    const verify = await read(tree, VERIFY);
    expect(verify).toContain("standard gate commands from the task-runner manifest");
    expect(verify).toContain("(tech.md#standard-commands-copy-paste)");
    expect(verify).not.toContain("gate commands from the file tree and scripts (structure.md)");
    expect(verify).not.toContain(
      "structure.md: repo layout, key packages, entrypoints, standard gate commands",
    );
  });

  it("discovers gate commands from non-Node manifests too, and writes them back", async () => {
    // A Makefile/justfile/pyproject-only project has no package.json scripts;
    // enumerating only Node sources leaves `tech.md` on its placeholders.
    const verify = await read(tree, VERIFY);
    for (const source of ["`Makefile`", "`justfile`", "`pyproject.toml`", "`Cargo.toml`"]) {
      expect(verify, `missing discovery source ${source}`).toContain(source);
    }
    const step1 = verify.slice(verify.indexOf("## Step 1 — Discover project gate commands"));
    expect(step1).toContain("catalog/tech.md#standard-commands-copy-paste");
  });

  it("keeps /qfai-implement reading that same home", async () => {
    const implement = await read(tree, IMPLEMENT);
    expect(implement).toContain("`tech.md#standard-commands-copy-paste` rather than inventing one");
  });
});

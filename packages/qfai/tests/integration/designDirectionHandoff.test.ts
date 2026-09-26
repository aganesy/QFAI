// QFAI:AC-0001-0090-01
// QFAI:AC-0001-0090-02

/**
 * The design direction reaches `/qfai-sdd` through the pack, in the tree `qfai init` installs:
 * discussion records the chosen theme and who chose it and writes no `DESIGN.md`, and the
 * `DESIGN.md` authoring step reads that record and asks when there is none.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");
const SKILLS = ".qfai/assistant/skill";

let root = "";

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-design-direction-"));
  const init = spawnSync(process.execPath, [CLI, "init", "--yes"], { cwd: root, encoding: "utf8" });
  if (init.status !== 0) throw new Error(`qfai init: ${init.stderr}`);
}, 180_000);

afterAll(async () => {
  await removeTempTree(root);
});

/** An installed file with its line wraps folded, so a sentence reads the same at any width. */
async function installed(rel: string): Promise<string> {
  return (await readFile(path.join(root, rel), "utf8")).replace(/\s*\r?\n\s*/g, " ");
}

it("Discussion records the adopted theme and who chose it, and leaves root DESIGN.md to /qfai-sdd", async () => {
  const context = await installed(`${SKILLS}/qfai-discussion/templates/01_Context.md`);
  const skill = await installed(`${SKILLS}/qfai-discussion/SKILL.md`);
  const matrix = await installed(
    `${SKILLS}/qfai-discussion/references/discussion-completion-matrix.md`,
  );

  expect({
    section: context.includes("## Design Direction"),
    fields: ["adopted_theme:", "chosen_by:"].filter((key) => !context.includes(key)),
    notAnOutput: skill.includes("Root DESIGN.md is not a discussion output"),
    completion: matrix.includes("`01_Context.md#Design Direction` names an adopted theme"),
    rootDesign: existsSync(path.join(root, "DESIGN.md")),
  }).toEqual({
    section: true,
    fields: [],
    notAnOutput: true,
    completion: true,
    rootDesign: false,
  });
});

it("/qfai-sdd authors root DESIGN.md from the recorded direction, and asks when the pack records none", async () => {
  const authoring = await installed(`${SKILLS}/qfai-sdd/references/design-md-authoring.md`);
  const intake = await installed(`${SKILLS}/qfai-discussion/references/design-dna-intake.md`);

  expect({
    reads: authoring.includes("`01_Context.md#Design Direction` is the decision the user made"),
    asks: authoring.includes("stop and ask rather than pick one"),
    writtenBySdd: intake.includes(
      "Root `DESIGN.md` is written later, by `/qfai-sdd`'s `03_contract` step, which reads those records",
    ),
  }).toEqual({ reads: true, asks: true, writtenBySdd: true });
});

// QFAI:AC-0001-0087-01
// QFAI:AC-0001-0087-02

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

import { assertBuiltCliFresh } from "../helpers/builtCli.js";
import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI = path.join(PACKAGE_ROOT, "dist", "cli", "index.mjs");
assertBuiltCliFresh(CLI);
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
      "Root `DESIGN.md` is written later, by `/qfai-sdd`'s `common-design-md` step, which reads those records",
    ),
  }).toEqual({ reads: true, asks: true, writtenBySdd: true });
});

// These assertions inspect installed authoring instructions, not agent file writes.
it("The installed design step bounds an authorized repair and keeps the source of changed values", async () => {
  const step = await installed(".qfai/assistant/step/common-design-md/STEP.md");
  const authoring = await installed(`${SKILLS}/qfai-sdd/references/design-md-authoring.md`);

  for (const instructions of [step, authoring]) {
    expect(instructions).toMatch(/triage.*path.*change/i);
    expect(instructions).toMatch(/new WIP.*change.request.*authoriz/i);
    expect(instructions).toMatch(/preserve.*brand.*tokens/i);
  }
  expect(step).toMatch(/only[^.]*authorized change|repair[^.]*within[^.]*change/i);
  expect(step).toMatch(/recorded direction or (?:the )?named theme/i);
  expect(step).toMatch(
    /no value was written that the recorded direction or the named theme does not supply/i,
  );
  expect(step).toMatch(/parseDesignMd\(text\)[^.]*validateDesignMd/);
});

it("The installed design step preserves an existing file without new authorization and refuses the sample", async () => {
  const step = await installed(".qfai/assistant/step/common-design-md/STEP.md");

  expect(step).toMatch(/without.*authoriz.*validat.*without an overwrite/i);
  expect(step).toMatch(/inherited DONE[^.]*authoriz[^.]*no new change/i);
  expect(step).toMatch(/unreplaced sample is refused/i);
  expect(step).toMatch(/Never adopt the sample design/i);
  expect(step).toMatch(/Once a prototyping loop has started, `DESIGN\.md` is read-only for it/i);
});

// QFAI:EX-0001-0087-02
it("The installed instructions scope missing brand direction to initial authoring", async () => {
  const step = await installed(".qfai/assistant/step/common-design-md/STEP.md");
  const authoring = await installed(`${SKILLS}/qfai-sdd/references/design-md-authoring.md`);

  for (const instructions of [step, authoring]) {
    const initialAuthoring = instructions.match(/For initial authoring[^.]*\./i)?.[0];
    expect(initialAuthoring).toMatch(/pack[^.]*no[^.]*direction[^.]*brand unchosen/i);
  }
});

it("The installed instructions keep an established brand for validation and authorized non-brand repairs", async () => {
  const step = await installed(".qfai/assistant/step/common-design-md/STEP.md");
  const authoring = await installed(`${SKILLS}/qfai-sdd/references/design-md-authoring.md`);

  for (const instructions of [step, authoring]) {
    const existingFile = instructions.match(/For an existing valid file,[^.]*\./i)?.[0];
    expect(existingFile).toMatch(/validat/i);
    expect(existingFile).toMatch(/authorized repairs/i);
    expect(existingFile).toMatch(/preserve[^.]*brand[^.]*tokens/i);
    expect(existingFile).toMatch(/require no new brand selection/i);
  }
});

it("The installed design step leaves CLI-only files unchanged and stops on an unchosen brand", async () => {
  const step = await installed(".qfai/assistant/step/common-design-md/STEP.md");

  expect(step).toMatch(/cli-only[^.]*writes no[^.]*`DESIGN\.md`/i);
  expect(step).toMatch(/existing file[^.]*unchanged/i);
  expect(step).toMatch(/names `web`, `mobile`, `desktop` or `mixed`/);
  expect(step).toMatch(/pack that records no design direction leaves the brand unchosen/i);
  expect(step).toMatch(/under `--auto` stop and name it/i);
});

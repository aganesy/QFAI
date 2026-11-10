/**
 * A restyle keeps the text its screens show, is sized by an audit before any
 * edit, and edits the aspects a stylesheet reaches in a fixed order; a
 * prototype takes its sample data from the examples.
 *
 * The loop is run by the `/qfai-prototyping` skill, so the shipped step and
 * references are the behaviour under test, in the package tree and in the tree
 * `pnpm sync:ssot` generates from it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
);
const TREES = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];

const read = (tree: string, relative: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, relative), "utf-8");

/** Wrap-tolerant text: a rule is matched as one sentence, not by its wrap column. */
const flat = (text: string): string => text.replace(/\s*\n\s*/g, " ");

const LOOP = "step/prototyping-loop/STEP.md";
const GENERATOR = "skill/qfai-prototyping/references/generator-prompt.md";
const REVIEWER = "skill/qfai-prototyping/references/reviewer-prompt.md";

describe.each(TREES)("%s", (tree) => {
  // QFAI:AC-0001-0295-01
  // QFAI:EX-0001-0295-01
  // QFAI:EX-0001-0295-02
  // QFAI:EX-0001-0295-10
  it("saves a baseline before a restyle edits and blocks on text the screen no longer shows", async () => {
    const loop = flat(await read(tree, LOOP));
    expect(loop).toContain("### Before a restyle edits anything");
    expect(loop).toContain(
      "save the text the screen shows to `.qfai/prototype/baseline/<ui-contract-id>/<screen>.txt`",
    );
    expect(loop).toContain(
      "Capture it twice and leave out only text that differs between the two captures",
    );
    // The reviewer is told to expect the baseline among its mandatory inputs.
    expect(loop).toContain("The reviewer of every restyle iteration compares the route with it.");

    const reviewer = flat(await read(tree, REVIEWER));
    expect(reviewer).toContain(
      "Compare each route with its baseline, `.qfai/prototype/baseline/<ui-contract-id>/<screen>.txt`",
    );
    expect(reviewer).toContain(
      "a figure, a proper name, a field value or any other text in the route's baseline that the screen now changes, drops or replaces with prose",
    );
    expect(reviewer).toContain(
      "The finding names the screen, the baseline text and what the screen shows instead.",
    );
    expect(reviewer).toContain("A missing baseline is a missing mandatory input.");
  });

  // QFAI:AC-0001-0295-02
  // QFAI:EX-0001-0295-03
  it("takes a prototype's sample data from the examples and invents no claim", async () => {
    const generator = flat(await read(tree, GENERATOR));
    expect(generator).toContain(
      "Take the sample data from the examples that the in-scope UI contract's rules cite",
    );
    expect(generator).toContain("list it in `progress.md` as sample data no example supplies");
    expect(generator).toContain("invent no metric, customer count, customer name or testimonial");
  });

  // QFAI:AC-0001-0295-03
  // QFAI:EX-0001-0295-04
  // QFAI:EX-0001-0295-05
  it("audits a restyle and records its level before the first edit, within DESIGN.md tokens", async () => {
    const loop = flat(await read(tree, LOOP));
    expect(loop).toContain("Record `restyleLevel` in `progress.md` beside `iterationKind`");
    for (const level of ["`full`", "`polish`", "`none`"]) {
      expect(loop).toContain(`| ${level}`);
    }
    expect(loop).toContain("Every level stays within the root `DESIGN.md` tokens");
    expect(loop).toContain("is reported as a `DESIGN.md` change, not made.");
    expect(loop).toContain("Put the audit and the level to the user before the first edit");

    const generator = flat(await read(tree, GENERATOR));
    expect(generator).toContain("Change only what the `restyleLevel` in `progress.md` allows");
  });

  // QFAI:AC-0001-0295-04
  // QFAI:EX-0001-0295-06
  // QFAI:EX-0001-0295-07
  // QFAI:EX-0001-0295-09
  it("leaves a screen that is already good as it is", async () => {
    const loop = flat(await read(tree, LOOP));
    expect(loop).toContain("A screen that is already good is not changed to be different");
    expect(loop).toContain("iteration 00 applies only the refinements the user accepted");
    expect(loop).toContain(
      "when the user accepts none, the run ends there as **Stopped**, with no edit and no handoff; the route's later stages then change nothing",
    );
    expect(loop).toContain("or a restyle at `none` had no refinement accepted");
    expect(loop).toContain("the `restyleLevel` field in `progress.md` is not one.");

    const generator = flat(await read(tree, GENERATOR));
    expect(generator).toContain(
      "only the refinements the user accepted, as `progress.md` lists them.",
    );
    expect(loop).toContain(
      "at `none` nobody can accept a refinement, so the run stops before iteration 00.",
    );
  });

  // QFAI:AC-0001-0295-05
  // QFAI:EX-0001-0295-08
  it("edits the aspects a stylesheet reaches in order and leaves text, icons and images to the contract", async () => {
    const generator = flat(await read(tree, GENERATOR));
    expect(generator).toContain(
      "in this order, and finish each across every screen in scope before starting the next: spacing, color, type, layout, details such as radius, borders, shadows and states, then motion.",
    );
    expect(generator).toContain(
      "Changing displayed text, an icon or an image is not a restyle; report it as a change the contract needs.",
    );
    expect(generator).toContain("new markup is a contract change");
  });
});

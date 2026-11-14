/**
 * The design anti-pattern list asks whether a screen fits another product's
 * name, and puts an unsupported claim already on a screen to the user instead
 * of deleting or rewriting it.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];
const LIST = "skill/qfai-sdd/references/design-anti-patterns.md";

const read = async (tree: string): Promise<string> =>
  (await readFile(path.join(repoRoot, tree, LIST), "utf-8")).replace(/\s*\n\s*/g, " ");

describe.each(TREES)("%s", (tree) => {
  // QFAI:AC-0001-0296-01
  // QFAI:EX-0001-0296-01
  it("asks whether the screen would still fit another product's name", async () => {
    const list = await read(tree);
    expect(list).toContain(
      "if another product's name replaced this one, would the screen still fit?",
    );
    expect(list).toContain(
      "the copy, the one distinctive element, or the visual. It is a reviewer's judgement, not a detection, and it adds no `lap-*` entry.",
    );
  });

  // QFAI:AC-0001-0296-02
  // QFAI:EX-0001-0296-02
  // QFAI:EX-0001-0296-03
  // QFAI:EX-0001-0296-05
  // QFAI:EX-0001-0296-06
  it("puts an unsupported claim already on the screen to the user", async () => {
    const list = await read(tree);
    expect(list).toContain("## Claims nobody has confirmed");
    expect(list).toContain(
      "Whether writing root `DESIGN.md`, building a screen or reviewing one, follow",
    );
    expect(list).toContain(
      "A restyle changes no displayed text, so there a claim to remove or reword is reported as a change the contract needs.",
    );
    expect(list).toContain("A `prototype` iteration applies the answer to the prototype.");
    expect(list).toContain("Put each such claim to the user under the question protocol.");
    expect(list).toContain(
      "A claim the user confirms keeps its wording, or becomes specific with the facts the user gives. A claim the user rejects is removed.",
    );
    expect(list).toContain(
      "A claim an agent writes itself stays the _invented proof_ pattern in _Copy in the UI_",
    );
  });

  // QFAI:AC-0001-0296-03
  // QFAI:EX-0001-0296-04
  it("keeps the claim and opens a question when no user is present", async () => {
    const list = await read(tree);
    expect(list).toContain(
      "With no user present, the claim stays as it is, becomes one row in `open-questions.md` under `paths.specsDir`, and the final report lists it.",
    );
    expect(list).toContain(
      "Inside the prototyping loop, the claim and the user's answer go to the final report instead",
    );
  });

  // The information-architecture and states sections name the missing states
  // and missing tables a bare screen shows. Scoped to DESIGN.md authoring and
  // prototype review, they never reached the screens the implementation builds.
  it("applies the information-architecture and states sections to implemented screens", async () => {
    const list = await read(tree);
    expect(list).toContain(
      "_Information architecture and flow_ and _States and accessibility_ apply to every screen the implementation builds, not only to root `DESIGN.md` and prototypes.",
    );
    expect(list).toContain(
      "the implementation and product-surface reviews check the built screens against them.",
    );
  });
});

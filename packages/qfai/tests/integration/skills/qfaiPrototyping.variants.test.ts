/**
 * The first iteration of an open direction shows variants; the user chooses.
 *
 * The loop is run by the `/qfai-prototyping` skill with the user, so the
 * shipped skill references and steps are the behaviour under test, in the
 * package tree and in the tree `pnpm sync:ssot` generates from it.
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

/** The body of one `## Heading` section, up to the next level-2 heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  expect(start, `missing section ${heading}`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf("\n## ", start + heading.length + 4);
  return flat(text.slice(start, end < 0 ? undefined : end));
}

describe.each(TREES)("%s", (tree) => {
  // QFAI:AC-0001-0273-01
  // QFAI:EX-0001-0273-01
  it("builds two or three structurally different variants on one page while the direction is open", async () => {
    const loop = await read(tree, "skill/qfai-prototyping/references/iteration-loop.md");
    const variants = section(loop, "First-iteration variants");
    expect(variants).toContain(
      "settles neither how the in-scope screens should feel nor which layout carries their task",
    );
    expect(variants).toContain("An `## Escalated` row settles nothing.");
    expect(variants).toContain("two or three variants, `A`, `B` and optionally `C`");
    expect(variants).toContain("differ in grouping, layout or navigation, not only in style");
    expect(variants).toContain("switchable in place through `?variant=<id>`");
    expect(variants).toContain(".qfai/prototype/iter-NN/variant-<id>/review.json");
    expect(variants).toContain(
      ".qfai/prototype/iter-NN/variant-<id>/<ui-contract-id>/<screen>.review.json",
    );

    const step = flat(await read(tree, "step/prototyping-loop/STEP.md"));
    expect(step).toContain("Record `variants` in `progress.md`");

    const generator = await read(tree, "skill/qfai-prototyping/references/generator-prompt.md");
    const seed = section(generator, "The first iteration (seed)");
    expect(seed).toContain("When `progress.md` records `variants` other than `none`");
    expect(seed).toContain("a small floating switcher");
    expect(seed).toContain("Brand tokens stay locked in every variant.");

    const reviewer = flat(await read(tree, "skill/qfai-prototyping/references/reviewer-prompt.md"));
    expect(reviewer).toContain("review each variant as if it were the only one");
    expect(reviewer).toContain(
      "The variant switcher is not part of any screen: do not review, count or report it.",
    );
    const schema = flat(
      await read(tree, "skill/qfai-prototyping/references/review-payload-schema.md"),
    );
    expect(schema).toContain(
      ".qfai/prototype/iter-NN/variant-<id>/<ui-contract-id>/<screen>.review.json",
    );
  });

  // QFAI:AC-0001-0273-02
  // QFAI:EX-0001-0273-02
  // QFAI:EX-0001-0273-03
  // QFAI:EX-0001-0273-04
  // QFAI:EX-0001-0273-06
  it("puts the variants to the user as one comparison and narrows to one prototype on their answer", async () => {
    const step = await read(tree, "step/prototyping-loop/STEP.md");
    const ask = flat(step.slice(step.indexOf("### Putting the prototype to the user")));
    expect(ask).toContain(
      "put them to the user as one compare sheet under `.agents/rules/reply-forms.md`",
    );
    expect(ask).toContain("Neither the agent nor a review's scores pick a variant.");
    expect(ask).toContain(
      "**A pick, a combination or a rejection** — the answer to an iteration with variants — runs the next iteration as one prototype",
    );
    expect(ask).toContain("An iteration with variants is never confirmed as it stands");
    expect(ask).toContain(
      "A reply with no `pick:` whose `why:` turns down every variant is a rejection.",
    );
    // A closure without a pick re-asks; a no-question mode escalates and stops.
    expect(ask).toContain(
      "**Closed** — `proceed` or `done` without an answer to this question, or without a pick —",
    );
    expect(ask).toContain(
      "Under a no-question mode nobody can answer, so the question is written to `## Escalated` and the run stops there.",
    );

    const loop = await read(tree, "skill/qfai-prototyping/references/iteration-loop.md");
    const variants = section(loop, "First-iteration variants");
    expect(variants).toContain(
      "Its prior review is the picked variant's summary, or none after a combination or a rejection.",
    );
    expect(variants).toContain("Every later iteration builds one prototype.");
    expect(section(loop, "Best-of-history is gone")).toContain(
      "The latest iteration is always the one put to the user.",
    );

    const generator = flat(
      await read(tree, "skill/qfai-prototyping/references/generator-prompt.md"),
    );
    expect(generator).toContain("the review of the variant the user picked");
  });

  // QFAI:AC-0001-0273-03
  // QFAI:EX-0001-0273-05
  // QFAI:EX-0001-0273-07
  // QFAI:EX-0001-0273-08
  it("records no variants for a restyle, a scoped run or a settled direction", async () => {
    const loop = await read(tree, "skill/qfai-prototyping/references/iteration-loop.md");
    const variants = section(loop, "First-iteration variants");
    expect(variants).toContain(
      "A `restyle` loop, a run with a `runScope`, and a run whose `## Session` settles the direction record `variants` `none`",
    );

    const step = flat(await read(tree, "step/prototyping-loop/STEP.md"));
    expect(step).toContain(
      "One prototype per iteration, except the variants of a run's first iteration",
    );
  });
});

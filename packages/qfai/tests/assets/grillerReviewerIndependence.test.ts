import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file rather than to `process.cwd()`, for the reason the
// clarification-budget suite gives: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DELEGATION = "assistant/constitution/shared-skill-delegation-baseline.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, DELEGATION), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe("a griller's recommendations and reviewer independence", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the split turns on who settled the decision`, async () => {
      // The whole row each time, outcome included. Pinning the labels alone
      // leaves the two verdicts free to swap or vanish while the suite stays
      // green.
      const content = await read(tree);
      expectPhrase(content, "#### A griller's recommendations, and what they disqualify");
      expect(content).toMatch(
        /\|\s*By the user, from the recommendation among the inputs\s*\|\s*The decision is theirs\. The griller may review the artifact\s*\|/,
      );
      expect(content).toMatch(
        /\|\s*Agent to agent, with no user adjudication\s*\|\s*The artifact is wrong, and no reviewer can clear it\s*\|/,
      );
    });

    it(`${tree}: an agent-settled decision is a defect, not a routing problem`, async () => {
      // A decision is the user's, and a run that could not ask records it open.
      // An agent-adopted recommendation is therefore an artifact carrying
      // something nobody decided — handing it to a different reviewer launders
      // it rather than fixing it.
      const content = await read(tree);
      expectPhrase(content, "**The second row is not a routing problem.**");
      expectPhrase(content, "handing it to a\ndifferent reviewer would launder it");
      expectPhrase(content, "MUST** return `REVISE` and\nname the decision");
    });

    it(`${tree}: names correlation rather than memory as the risk`, async () => {
      // The intuitive objection — a reset context cannot remember, so it cannot
      // defer — is true and does not reach the problem. A fresh instance of the
      // same agent re-derives the same preference from the same evidence.
      const content = await read(tree);
      expectPhrase(content, "**Correlation** is:");
      expectPhrase(content, "removes the memory, not the disposition");
    });

    it(`${tree}: scopes the attestation to the artifact as it stands`, async () => {
      // Read as a history of everything ever recommended, the field disqualifies
      // a reviewer over a decision the artifact no longer carries, or one the
      // user has since settled — which the first row calls theirs.
      const content = await read(tree);
      expectPhrase(content, "The field asks about the artifact **as it now stands**.");
      expectPhrase(content, "the second is the user's decision by the first row above");
      expectPhrase(content, "decisions in THIS artifact as it now stands");
    });

    it(`${tree}: the work orders schema holds the row the field is read off`, async () => {
      // The paragraph above sends a reviewer to a record. Without a row for it
      // in the schema there is no record to read, and the mandatory field is one
      // a reset instance can only guess at.
      const content = await read(tree);
      expectPhrase(content, "**A grilling session adds a row for every decision it settled**");
      expectPhrase(content, "`Task title` = `grilling(<adjudication>): <the decision>`");
      // The field asks what THIS reviewer recommended, so the row names the
      // recommender. "Whose recommendation was adopted" is undefined for the
      // ordinary case where the user chose something else.
      expectPhrase(
        content,
        "the agent that **made the recommendation**, whether or not it was taken",
      );
    });

    it(`${tree}: the row says who adjudicated, not only that a session ran`, async () => {
      // The two outcomes point opposite ways: a user-settled decision leaves
      // the griller free to review the artifact, an agent-settled one makes the
      // artifact wrong until somebody decides. One marker for both makes them
      // indistinguishable in the row the reviewer is told to rely on.
      const content = await read(tree);
      expectPhrase(content, "**`<adjudication>` is `user` or `agents`**");
      expectPhrase(content, "tells the reviewer nothing it can act on");
      // One format, so a gate selecting the prefix finds every row rather than
      // skipping the ones that carry the adjudication.
      expectPhrase(
        content,
        "always parenthesized, so a gate selecting `grilling(` finds every row",
      );
    });

    it(`${tree}: the work order carries the series, not only the response`, async () => {
      // Round 2 is dispatched, so the series has to reach the sub-agent serving
      // it. Present only in the response, a reset instance would have to invent
      // the value it is asked to report.
      const content = await read(tree);
      expectPhrase(content, "The work order and the response both carry a `Review series` value");
      expectPhrase(
        content,
        "Review series: <reviewed artifact> + <reviewer role>   # review work orders only",
      );
    });

    it(`${tree}: gives the reviewer something to attest from`, async () => {
      // A reset instance does not know what an earlier one recommended, so a
      // mandatory field it cannot fill truthfully is a formality. The record
      // supplies the pairing, and a stage without one fails the review.
      const content = await read(tree);
      expectPhrase(content, "**A reviewer cannot attest to what it cannot see.**");
      expectPhrase(content, "the decision and the `Agent instance` that recommended it");
      expectPhrase(content, "read off that record, not off recollection");
    });

    it(`${tree}: counts the round budget per series, not per instance`, async () => {
      // A host may answer round 2 with a fresh sub-agent under a new
      // `Agent instance`. Counted per instance the budget restarts every round,
      // so it never empties and the escalation exit never opens.
      const content = await read(tree);
      expectPhrase(content, "**Review rounds are one series, whatever instance serves them.**");
      expectPhrase(content, "`Review series`");
      expectPhrase(content, "the budget could\nnever be exhausted");
    });

    it(`${tree}: makes the attestation a required field`, async () => {
      // Optional, it is a formality: a response omitting it was still a valid
      // verdict, and the gate read silence as independence.
      const content = await read(tree);
      expectPhrase(
        content,
        "`Review series`, `Authored/edited under review` and `Recommended and unadjudicated` are REQUIRED",
      );
      expectPhrase(
        content,
        "Recommended and unadjudicated: none | <decisions in THIS artifact as it now stands that this reviewer recommended and no user has since settled>",
      );
      expectPhrase(content, "Review series: <reviewed artifact> + <reviewer role>");
      // A false value has to weigh what a false authorship value weighs, or the
      // field is one the gate does not act on.
      expectPhrase(
        content,
        "`Authored/edited under review` or `Recommended and unadjudicated` attestation claim work that was not done",
      );
    });
  }

  it.each([
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md",
    "packages/qfai/assets/init/.qfai/assistant/skills/web-research/SKILL.md",
  ])("%s requires the attestation its own gate reads", async (rel) => {
    // Each restates the required fields for its own gate. One that lists only
    // the authorship attestation accepts a response the baseline would refuse.
    const content = await readFile(path.join(repoRoot, rel), "utf-8");
    expect(unwrap(content)).toContain("Recommended and unadjudicated");
  });
});

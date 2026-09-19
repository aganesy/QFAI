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
      // An adopted non-critical decision stands; only a critical one adopted
      // without the user makes the artifact wrong.
      expect(content).toMatch(
        /\|\s*Agent to agent, not critical\s*\|\s*The decision stands\. The griller that recommended it does not review the artifact\s*\|/,
      );
      expect(content).toMatch(
        /\|\s*Agent to agent, critical, with no user adjudication\s*\|\s*The artifact is wrong, and no reviewer can clear it\s*\|/,
      );
    });

    it(`${tree}: an adopted non-critical decision is not a finding`, async () => {
      // Adoption is how a delegated session ends. Read as a defect, every
      // routine stage would return REVISE over the decisions it exists to
      // settle without the user. The reviewer checks the record; doubt about
      // merit stays an ordinary finding under the reviewer's remit.
      const content = await read(tree);
      expectPhrase(content, "**The second row is how a delegated session is meant to end**");
      expectPhrase(content, "not a finding");
      expectPhrase(
        content,
        "The reviewer checks that the decision has its `agents` row and is not critical.",
      );
      expectPhrase(
        content,
        "raises that as an ordinary finding against the artifact, under its own remit",
      );
    });

    it(`${tree}: an agent-adopted critical decision is a defect, not a routing problem`, async () => {
      // A critical decision is the user's in every session, and a run that
      // could not ask records it open. An agent-adopted critical decision is
      // therefore an artifact carrying something nobody with the standing
      // decided — handing it to a different reviewer launders it rather than
      // fixing it.
      const content = await read(tree);
      expectPhrase(content, "**The third row is not a routing problem.**");
      expectPhrase(content, "A critical decision is the user's in every session");
      expectPhrase(content, "handing it to a different reviewer would launder it");
      expectPhrase(content, "MUST** return `REVISE` and name the decision");
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
      expectPhrase(content, "`Task title` = `grilling(<where>/<adjudication>): <the decision>`");
      // The field asks what THIS reviewer recommended, so the row names the
      // recommender. "Whose recommendation was adopted" is undefined for the
      // ordinary case where the user chose something else.
      expectPhrase(
        content,
        "the agent that **made the recommendation**, whether or not it was taken",
      );
    });

    it(`${tree}: the row says who adjudicated, not only that a session ran`, async () => {
      // The outcomes point different ways: a user-settled decision leaves the
      // griller free to review the artifact, an agent-settled one keeps that
      // griller out of the review, and an agent-settled critical one makes the
      // artifact wrong until the user decides. One marker for all of them makes
      // them indistinguishable in the row the reviewer is told to rely on.
      const content = await read(tree);
      expectPhrase(content, "**`<where>` is the stage's own name for where the session ran**");
      // `withdrawn` is the third: the user's answer dropped the item, which
      // settles the decision by removing what it was about. A gate requires the
      // row, so a vocabulary without it cannot be both written and schema-valid.
      expectPhrase(content, "**`<adjudication>` is one of `user`, `agents` and `withdrawn`**");
      // A row that cannot be assigned to a place is one an omission elsewhere
      // can be counted against.
      expectPhrase(content, "a row that cannot be assigned to a place");
      // An adopted decision reaches the user through the final report, so its
      // row carries the reason and every disagreeing position.
      expectPhrase(
        content,
        "**An `agents` row also carries why the recommendation was taken**, in `Output (refs)`",
      );
      expectPhrase(content, "The stage's final report lists every `agents` row");
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
        "Review series: <reviewed artifact> + <reviewer role> + <replacement ordinal>   # review work orders only",
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
      expectPhrase(content, "it could never be exhausted");
    });

    it(`${tree}: separates a reset instance from a replacement reviewer`, async () => {
      // Both arrive as a new `Agent instance` on the same artifact and role, so
      // a key of artifact + role alone cannot tell them apart and a replacement
      // inherits a round its predecessor spent.
      const content = await read(tree);
      expectPhrase(content, "a replacement ordinal that starts at 1");
      expectPhrase(
        content,
        "a replacement reviewer is issued the next ordinal and starts at round 1",
      );
      expectPhrase(
        content,
        "counting a replacement against its predecessor's series would exhaust it a round early",
      );
      // A fresh series buys a fresh two rounds, so an unbounded supply of
      // replacements is an unbounded budget and the escalation never arrives.
      expectPhrase(content, "**The ordinal is bounded, or the budget is not.**");
      expectPhrase(content, "At most **two series per artifact per role**");
    });

    it(`${tree}: asks about the artifact rather than about the reviewer`, async () => {
      // Scoped to the reviewer's own recommendations the field answers `none`
      // truthfully whenever a different agent made them, which is the common
      // case and the one the record exists to catch.
      const content = await read(tree);
      expectPhrase(content, "**The field asks about the artifact, not about the reviewer.**");
      expectPhrase(content, "whichever agent recommended it");
    });

    it(`${tree}: gives a closed decision a disposition on its row`, async () => {
      // A live row and a closed one look identical, so a reviewer deriving
      // `none` from the artifact would have to contradict the record.
      const content = await read(tree);
      expectPhrase(content, "**A row gains a disposition when its decision stops being open.**");
      expectPhrase(content, "(settled by the user)");
      expectPhrase(content, "Amending is not deleting");
    });

    it(`${tree}: reopens an unadjudicated recommendation instead of rerouting it`, async () => {
      // The handoff remedy answers an authorship conflict. Applied to a
      // recommendation nobody adjudicated, the replacement attests `none`
      // truthfully and the artifact still carries what no user settled.
      const content = await read(tree);
      expectPhrase(
        content,
        "A non-`none` `Recommended and unadjudicated` is not a routing problem, and a handoff does not answer it",
      );
      expectPhrase(
        content,
        "A replacement reviewer would attest `none` truthfully and clear nothing",
      );
    });

    it(`${tree}: lets a stage that ran no grilling session answer none`, async () => {
      // Most stages run no agent-to-agent grilling session and record no row.
      // Required unconditionally, the ordinary `none` response becomes a
      // `REVISE` over provenance that never existed.
      const content = await read(tree);
      expectPhrase(content, "**The record answers either way, and silence answers nothing.**");
      expectPhrase(content, "writes one row reading `grilling(-/none): none`");
      // Parenthesized like every other grilling row: a gate that selects on
      // those fields skips any row that drops them.
      expectPhrase(content, "`grilling(-/none): none` row records a fact rather than a step");
      // Silence cannot be the answer: an omitted row and no session to record look
      // identical in the table, so reading absence as `none` clears the decision
      // the record exists to expose.
      expectPhrase(content, "Absence of rows cannot be read as evidence for `none`");
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
        "Recommended and unadjudicated: none | <critical decisions in THIS artifact as it now stands that any agent recommended and adopted with no user adjudication>",
      );
      expectPhrase(
        content,
        "Review series: <reviewed artifact> + <reviewer role> + <replacement ordinal>",
      );
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

/**
 * The concrete-abstract cycle `/qfai-sdd` runs between its contracts and the per-flow gate.
 *
 * The cycle is agent guidance with no validator of its own, so each example is discharged by the
 * shipped statement that makes the agent do what the example expects, read from the section of
 * `references/concrete-abstract-cycle.md` that owns it.
 *
 * Each assertion requires the distinguishing terms of one obligation inside one statement, so a
 * word left behind by a rewrite that dropped the obligation does not keep the test green.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../helpers/shippedAssistant.js";
import { expectSentence } from "../helpers/shippedSentences.js";

const CYCLE = "skill/qfai-sdd/references/concrete-abstract-cycle.md";
const TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";

async function section(file: string, heading: string): Promise<string> {
  const text = sectionOf(await readShipped(file), heading);
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

const when = (): Promise<string> => section(CYCLE, "## When a cycle runs");
const finder = (): Promise<string> => section(CYCLE, "## The finder");
const deciding = (): Promise<string> => section(CYCLE, "## Deciding a finding");
const applying = (): Promise<string> => section(CYCLE, "## Applying an adopted finding");
const loop = (): Promise<string> => section(CYCLE, "## Two cycles at most");
const notAgain = (): Promise<string> => section(CYCLE, "## A decided finding is not raised again");

/** The five kinds, each by the phrase that names it. */
const KINDS = [
  /case the rule implies that no example states/i,
  /redundant example/i,
  /example no rule explains/i,
  /rule its examples do not support/i,
  /flow, story or criterion split the rules show to be wrong/i,
] as const;

/** Each rule the cycle affected is rewritten from its examples once the changes are in. */
const REWRITE = [/rewrite each BR they affect/i, /from its updated EXs/i] as const;

describe("when a cycle runs, and what the finder raises", () => {
  // QFAI:EX-0001-0147-12
  it("has a sub-agent that wrote none of the rules raise an unstated case, changing no file", async () => {
    const text = await finder();
    expectSentence(text, "the finder", /sub-agent/i, /wrote none of\s+the BRs it reads/i);
    expectSentence(
      text,
      "the rules read",
      /reads/i,
      /BR whose Statement or Examples cell/i,
      /wrote or changed/i,
    );
    expectSentence(text, "the examples read", /reads/i, /EXs each of those BRs cites/i);
    for (const kind of KINDS) expect(flat(text), String(kind)).toMatch(kind);
    expect(rowOf(text, "no example states"), "a boundary is an unstated case").toMatch(/boundary/i);
    expectSentence(text, "a finding's identity", /names its kind/i, /IDs it targets/i);
    expectSentence(text, "raising writes nothing", /Raising/i, /changes no file/i);
  });

  // QFAI:EX-0001-0147-13
  it("raises a cited example the Statement does not explain as a third-kind finding, not a missing citation", async () => {
    const text = await finder();
    expect(rowOf(text, "example no rule explains")).toMatch(/cited EX/i);
    expectSentence(
      text,
      "a cited but unexplained example",
      /cited EX/i,
      /Statement does not explain/i,
      /third kind/i,
      /not a missing citation/i,
    );
  });

  // QFAI:EX-0001-0147-14
  it("runs no cycle in a stage that appends a defect's example", async () => {
    expectSentence(await when(), "no cycle under seeding", /stage is an append stage/i);
    expect(flat(await when())).toMatch(/No cycle runs when/i);
  });

  // QFAI:EX-0001-0147-30
  it("runs no cycle when no rule Statement or Examples cell changed, even if an example did", async () => {
    const text = await when();
    expectSentence(
      text,
      "the trigger",
      /A cycle runs when/i,
      /Statement or the Examples cell of at least one BR/i,
    );
    expectSentence(
      text,
      "no cycle on an example-only change",
      /no BR Statement and no Examples cell/i,
      /even if it changed an AC or an EX/i,
    );
  });
});

describe("who decides a finding", () => {
  // QFAI:EX-0001-0147-15
  it("has the session decide a finding that is not critical, and sends product intent to the user", async () => {
    const text = await deciding();
    expectSentence(text, "the session holds the cycle", /session agent holds the cycle/i);
    expectSentence(text, "the session decides", /decides each finding that is not critical/i);
    expectSentence(
      text,
      "product intent is critical",
      /product intent/i,
      /no BR, no AC, the request nor the discussion states/i,
      /is critical/i,
    );
    expectSentence(text, "the user decides it", /goes to the user/i, /no agent decides it/i);
  });

  // QFAI:EX-0001-0147-16
  it("drops a proposed example nothing implies, writing no row", async () => {
    const text = await deciding();
    expectSentence(
      text,
      "the scope bound",
      /proposed EX must be implied by/i,
      /existing BR, an existing AC or the request/i,
    );
    expectSentence(text, "dropped", /session drops one that is not/i);
    expectSentence(text, "nothing written", /no EX is appended/i, /no row is written/i);
    expectSentence(
      await notAgain(),
      "not raised again",
      /does not raise a finding again/i,
      /finding the session already decided/i,
    );
  });
});

describe("how an adopted finding changes the tree", () => {
  // QFAI:EX-0001-0147-17
  it("narrows a rule this invocation wrote directly, then rewrites the rule from its examples", async () => {
    const text = await applying();
    expect(rowOf(text, "An AC, EX or BR this invocation wrote")).toMatch(
      /Changed directly, with no approval/i,
    );
    expectSentence(text, "rules follow the examples", ...REWRITE);
  });

  // QFAI:EX-0001-0147-18
  it("puts the removal of an approved example to the user and leaves it until approval", async () => {
    const text = await applying();
    const existing = rowOf(text, "existed when the invocation started");
    expect(existing).toMatch(/only under an in-force `Change request:` row/i);
    expect(existing).toMatch(/approved change covers this change/i);
    const uncovered = rowOf(text, "no row that covers the change");
    expect(uncovered).toMatch(/put to the user/i);
    expect(uncovered).toMatch(/item stays unchanged until the user approves it/i);
    expectSentence(
      text,
      "one change request on approval",
      /approved change is written with one `Change request:` row naming the files it changes/i,
    );
  });

  // QFAI:EX-0001-0147-19
  it("puts the split of a story this invocation wrote to the user", async () => {
    const row = rowOf(await applying(), "splitting, merging or retiring a BF or US");
    expect(row).toMatch(/Put to the user/i);
    expect(row).toMatch(/even when this invocation wrote the item/i);
  });

  // QFAI:EX-0001-0147-20
  it("under --contract asks for a wider change request and leaves the story file unchanged", async () => {
    const text = await applying();
    expectSentence(
      text,
      "a story-only answer",
      /`--contract`/,
      /only a story change answers/i,
      /wider change request naming the story file/i,
    );
    expectSentence(
      text,
      "nothing outside the approved scope",
      /story file stays byte for byte unchanged/i,
      /repaired only within the scope already approved/i,
    );
  });

  // QFAI:EX-0001-0147-31
  it("splits a criterion this invocation wrote directly, with no approval", async () => {
    const text = await applying();
    const wrote = rowOf(text, "An AC, EX or BR this invocation wrote");
    expect(wrote).toMatch(/AC it wrote is split the same way, with no approval/i);
    expect(wrote).toMatch(/each EX re-cites the criterion it exercises/i);
    expectSentence(text, "rules follow the split", ...REWRITE);
  });

  // QFAI:EX-0001-0147-32
  it("does not let a change request cover a change it did not describe", async () => {
    const text = await applying();
    expectSentence(
      text,
      "coverage",
      /row naming the file does not cover a change it did not describe/i,
    );
    expect(rowOf(text, "no row that covers the change")).toMatch(/put to the user/i);
  });

  // QFAI:EX-0001-0147-39
  it("applies a change the in-force change request describes, with no new row", async () => {
    const covered = rowOf(await applying(), "existed when the invocation started");
    expect(covered).toMatch(/Changed directly only under an in-force `Change request:` row/i);
    expect(covered).toMatch(/\(WIP or DONE\) whose approved change covers this change/i);
  });
});

describe("how many cycles run", () => {
  // QFAI:EX-0001-0147-23
  it("stops after a cycle that raised nothing", async () => {
    const text = await loop();
    expectSentence(text, "the stop", /cycle that adopts nothing ends the loop/i);
    expectSentence(
      text,
      "the second cycle needs an adoption",
      /second cycle runs only after a first cycle that adopted a finding/i,
    );
  });

  // QFAI:EX-0001-0147-24
  it("runs no third cycle even when the second adopted a finding", async () => {
    const text = await loop();
    expectSentence(text, "no third", /No third cycle runs/i, /even when the second adopted one/i);
    expectSentence(await applying(), "rules follow the second cycle", ...REWRITE);
  });

  // QFAI:EX-0001-0147-25
  it("under --auto asks nothing and opens the Unadjudicated row in the cycle that raised it", async () => {
    const text = await loop();
    expectSentence(text, "silence", /`--auto`/, /nothing is asked/i);
    expectSentence(
      text,
      "the row at once",
      /would go to the user becomes that row in the cycle that raised it/i,
    );
    expectSentence(text, "the gate", /per-flow gate reports that row as `QFAI-SPACK-102`/i);
    expectSentence(
      text,
      "the protected row is authorized when decided",
      /change request the user approves when the finding is decided names `open-questions\.md`/i,
    );
  });

  // QFAI:EX-0001-0147-34
  it("opens one Unadjudicated row for a finding still undecided when the session ends", async () => {
    const text = await loop();
    expectSentence(
      text,
      "the row",
      /finding still undecided when the session ends/i,
      /one `open-questions\.md`\s+row at TODO whose Content opens `Unadjudicated:`/i,
      /target IDs/i,
    );
    expectSentence(text, "the gate", /`QFAI-SPACK-102` until it\s+is decided/i);
  });

  // QFAI:EX-0001-0147-35
  it("stops after a cycle whose only finding was rejected, writing no row for it", async () => {
    const text = await loop();
    expectSentence(text, "adopting nothing stops", /cycle that adopts nothing ends the loop/i);
    expectSentence(text, "no other record", /No other record is written/i);
    expectSentence(text, "no row", /one it dropped/i, /append no row/i);
  });
});

describe("a decided finding is not raised again", () => {
  // QFAI:EX-0001-0147-26
  it("does not raise again a finding the session already decided, by kind, IDs and case", async () => {
    expectSentence(
      await notAgain(),
      "decided in this session",
      /does not raise a finding again/i,
      /kind and target IDs of a finding the session already decided/i,
      /equal to that case, includes it, or is included in it/i,
    );
  });

  // QFAI:EX-0001-0147-37
  it("treats a declined change request as the user's decision until a reopening lifts it", async () => {
    const text = await notAgain();
    expectSentence(
      text,
      "a declined change request",
      /proposed change of a change request the user declined already answers/i,
    );
    expectSentence(
      text,
      "the user decided",
      /declined change request is the user deciding that finding/i,
    );
    expectSentence(text, "wording", /Matching never goes by wording/i);
    expectSentence(text, "reopening", /decision appended to reopen a REJECTED row lifts it/i);
    expectSentence(
      await section(TRIAGE, "## Decision and question rows"),
      "a declined change appends no row",
      /declined change appends no row/i,
    );
  });
});

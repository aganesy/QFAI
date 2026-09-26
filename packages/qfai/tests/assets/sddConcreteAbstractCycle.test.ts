/**
 * The concrete-abstract cycle `/qfai-sdd` runs between its contracts and the per-flow gate.
 *
 * The cycle is agent guidance with no validator of its own: the evidence record and the completion
 * reviewer are its assurance. So each example is discharged by the shipped statement that makes
 * the agent do what the example expects, read from the section that owns it:
 *
 * | Obligation                               | Owner                                                     |
 * | ---------------------------------------- | --------------------------------------------------------- |
 * | Trigger, finder, adjudication, routes    | `references/concrete-abstract-cycle.md`                   |
 * | What each attempt of a run does          | `references/orchestrated-mode.md`, its cycle section      |
 * | The REVISE grounds                       | `references/sdd-quality-gate.md`, its cycle-record section |
 * | The record's columns and empty-cycle row | `templates/evidence/sdd-flow.md`                          |
 *
 * Each assertion requires the distinguishing terms of one obligation inside one statement, so a
 * word left behind by a rewrite that dropped the obligation does not keep the test green.
 */
import { describe, expect, it } from "vitest";

import { flat, readShipped, rowOf, sectionOf } from "../helpers/shippedAssistant.js";
import { expectSentence } from "../helpers/shippedSentences.js";

const CYCLE = "skill/qfai-sdd/references/concrete-abstract-cycle.md";
const ORCHESTRATED = "skill/qfai-sdd/references/orchestrated-mode.md";
const GATE = "skill/qfai-sdd/references/sdd-quality-gate.md";
const EVIDENCE = "skill/qfai-sdd/templates/evidence/sdd-flow.md";

async function section(file: string, heading: string): Promise<string> {
  const text = sectionOf(await readShipped(file), heading);
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

const when = (): Promise<string> => section(CYCLE, "## When a cycle runs");
const finder = (): Promise<string> => section(CYCLE, "## The finder");
const adjudication = (): Promise<string> => section(CYCLE, "## Adjudication");
const applying = (): Promise<string> => section(CYCLE, "## Applying an adopted finding");
const loop = (): Promise<string> => section(CYCLE, "## Two cycles at most");
const rejected = (): Promise<string> => section(CYCLE, "## Rejected findings");
const record = (): Promise<string> => section(CYCLE, "## The record");
const inRun = (): Promise<string> =>
  section(ORCHESTRATED, "## The concrete-abstract cycle in a run");
const revise = (): Promise<string> => section(GATE, "## Concrete-abstract cycle record");
const template = (): Promise<string> => section(EVIDENCE, "## Concrete-Abstract Cycle");

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
  // QFAI:EX-0001-0152-12
  it("has a test-design-analyst that wrote none of the rules raise an unstated case, changing no file", async () => {
    const text = await finder();
    expectSentence(text, "the finder", /`test-design-analyst`/, /wrote none of the BRs it reads/i);
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
    expectSentence(await adjudication(), "one griller decides", /Each cycle has one griller/i);
  });

  // QFAI:EX-0001-0152-13
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

  // QFAI:EX-0001-0152-14
  it("runs no cycle for a defect example seeding work order", async () => {
    expectSentence(
      await when(),
      "no cycle under seeding",
      /No cycle runs/i,
      /no cycle row/i,
      /operation is `defect-example-seeding`/,
    );
  });

  // QFAI:EX-0001-0152-30
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
      /No cycle runs/i,
      /no cycle row/i,
      /no BR Statement and no Examples cell/i,
      /even if it changed an AC or an EX/i,
    );
  });
});

describe("who decides a finding", () => {
  // QFAI:EX-0001-0152-15
  it("adopts the griller's recommendation after two rounds with dissent kept, and sends product intent to the user", async () => {
    const text = await adjudication();
    expectSentence(text, "griller independence", /neither the finder nor an author of an item/i);
    expectSentence(
      text,
      "rounds",
      /puts the findings to the authors of the targeted items/i,
      /at most two/i,
    );
    expectSentence(text, "adoption", /adopts its own recommendation/i, /not critical/i);
    expectSentence(text, "dissent", /dissent is recorded beside the decision/i);
    expectSentence(
      text,
      "product intent is critical",
      /product intent/i,
      /no BR, no AC, the request or the discussion/i,
      /is critical/i,
    );
    expectSentence(text, "the user decides it", /goes to the user/i, /no agent decides it/i);
  });

  // QFAI:EX-0001-0152-16
  it("rejects a proposed example nothing implies and records it as one REJECTED row", async () => {
    const text = await adjudication();
    expectSentence(
      text,
      "the scope bound",
      /proposed EX must be implied by/i,
      /existing BR, an existing AC or the request/i,
    );
    expectSentence(text, "rejection", /griller rejects one that is not/i, /no EX is appended/i);
    const rows = await rejected();
    expectSentence(
      rows,
      "one row",
      /Each rejected finding is one `decisions\.md` row at REJECTED/i,
    );
    expectSentence(
      rows,
      "the row's Content",
      /Content names/i,
      /kind/i,
      /target IDs/i,
      /case by the input that distinguishes it/i,
    );
    expectSentence(rows, "the row's Approach", /reason goes in Approach/i);
  });
});

describe("how an adopted finding changes the tree", () => {
  // QFAI:EX-0001-0152-17
  it("narrows a rule this invocation wrote directly, then rewrites the rule from its examples", async () => {
    const text = await applying();
    expect(rowOf(text, "An AC, EX or BR this invocation wrote")).toMatch(
      /Changed directly, with no approval/i,
    );
    expectSentence(text, "rules follow the examples", ...REWRITE);
  });

  // QFAI:EX-0001-0152-18
  it("holds a change to an approved example behind a TODO change request and a REMOVE triage row", async () => {
    const text = await applying();
    const existing = rowOf(text, "existed when the invocation started");
    expect(existing).toMatch(/Changed only under an in-force `Change request:` row/i);
    expect(existing).toMatch(/approved change covers this change/i);
    const uncovered = rowOf(text, "no row that covers the change");
    expect(uncovered).toMatch(/`Change request:` row at TODO/i);
    expect(uncovered).toMatch(/item unchanged until the user approves it/i);
    expect(rowOf(text, "Removing an item that existed")).toMatch(
      /triage row naming UPDATE:REMOVE at TODO/i,
    );
  });

  // QFAI:EX-0001-0152-19
  it("keeps the triage approval for splitting a story this invocation wrote", async () => {
    const row = rowOf(await applying(), "splitting, merging or retiring a BF or US");
    expect(row).toMatch(/Keeps its triage approval/i);
    expect(row).toMatch(/even when this invocation wrote the item/i);
  });

  // QFAI:EX-0001-0152-20
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

  // QFAI:EX-0001-0152-31
  it("splits a criterion this invocation wrote directly, with no triage row", async () => {
    const text = await applying();
    const wrote = rowOf(text, "An AC, EX or BR this invocation wrote");
    expect(wrote).toMatch(/AC it wrote is split the same way, with no triage row/i);
    expect(wrote).toMatch(/each EX re-cites the criterion it exercises/i);
    expectSentence(text, "rules follow the split", ...REWRITE);
  });

  // QFAI:EX-0001-0152-32
  it("does not let a change request cover a change it did not describe", async () => {
    const text = await applying();
    expectSentence(
      text,
      "coverage",
      /row naming the file does not cover a change it did not describe/i,
    );
    expect(rowOf(text, "no row that covers the change")).toMatch(/`Change request:` row at TODO/i);
    expectSentence(
      await revise(),
      "the reviewer catches it",
      /returns REVISE/i,
      /adopted change to an item that existed when the invocation started/i,
      /no in-force triage approval or `Change request:` row whose approved change covers it/i,
    );
  });

  // QFAI:EX-0001-0152-39
  it("applies a change the in-force change request describes, with no new row", async () => {
    const text = await applying();
    const covered = rowOf(text, "existed when the invocation started");
    expect(covered).toMatch(/in-force `Change request:` row \(WIP or DONE\)/i);
    expect(covered).toMatch(/whose approved change covers this change/i);
    // The TODO row is appended only where no row covers the change.
    expect(rowOf(text, "Append a `Change request:` row at TODO")).toMatch(
      /^\|\s*The same item, with no row that covers the change\s*\|/i,
    );
  });
});

describe("the cycle inside a workflow run", () => {
  // QFAI:EX-0001-0152-21
  it("runs the cycle before the one change question and writes nothing in the first attempt", async () => {
    const text = await inRun();
    expectSentence(
      text,
      "the cycle comes first",
      /first attempt runs the cycle on its proposal before it asks the change question/i,
    );
    expectSentence(
      text,
      "the question shows the result",
      /shows the proposal as the cycle left it/i,
    );
    expectSentence(
      text,
      "a user finding is another question",
      /finding that goes to the user/i,
      /further `decision` question/i,
      /same `awaiting_input` result/i,
    );
    expectSentence(text, "nothing is written", /attempt still writes nothing/i);
    expectSentence(
      await section(ORCHESTRATED, "## A change to the story tree"),
      "the first attempt's rule",
      /first attempt asks once and changes nothing/i,
    );
  });

  // QFAI:EX-0001-0152-22
  it("blocks on an adopted finding outside the checked scope, with no change request", async () => {
    expectSentence(
      await inRun(),
      "blocked",
      /adopted finding on an item outside the run's checked scope is upstream drift/i,
      /no `Change request:` row/i,
      /item unchanged/i,
      /returns `blocked`/,
    );
  });

  // QFAI:EX-0001-0152-33
  it("lets the answering attempt run no cycle and write the first attempt's rejections and evidence", async () => {
    const text = await inRun();
    expectSentence(text, "no further cycle", /attempt holding the answers runs no further cycle/i);
    expectSentence(
      text,
      "the deferred writes",
      /appends the REJECTED rows/i,
      /evidence rows of the cycles the first attempt ran/i,
    );
    expectSentence(
      text,
      "the change request names the register",
      /`Change request:` row names `decisions\.md`/i,
      /when it appended a row/i,
    );
    expectSentence(
      await rejected(),
      "no second raise inside the invocation",
      /does not raise a finding again/i,
      /finding already decided in this invocation/i,
    );
  });

  // QFAI:EX-0001-0152-38
  it("applies the user's answers and opens an Unadjudicated row for each finding left open", async () => {
    const text = await inRun();
    expectSentence(
      text,
      "the answers",
      /applies the answer to each finding the user decided/i,
      /`Unadjudicated:` row for each finding the user left open/i,
    );
    expectSentence(text, "no further cycle", /attempt holding the answers runs no further cycle/i);
    expectSentence(
      text,
      "the change request names the registers",
      /`Change request:` row names `decisions\.md` and `open-questions\.md`/i,
    );
    expectSentence(await applying(), "rules follow the answer", ...REWRITE);
  });
});

describe("how many cycles run", () => {
  // QFAI:EX-0001-0152-23
  it("stops after a cycle that raised nothing, and records that cycle", async () => {
    expectSentence(await loop(), "the stop", /cycle that adopts nothing ends the loop/i);
    expectSentence(
      await record(),
      "the empty cycle's row",
      /one row for each cycle that raised nothing/i,
    );
    expectSentence(
      await template(),
      "the row's form",
      /one row for a cycle that raised nothing/i,
      /`none` in Finding/,
    );
  });

  // QFAI:EX-0001-0152-24
  it("runs no third cycle even when the second adopted a finding", async () => {
    const text = await loop();
    expectSentence(
      text,
      "the second cycle",
      /second cycle runs only after a first cycle that adopted a finding/i,
    );
    expectSentence(text, "no third", /No third cycle runs/i, /even when the second adopted one/i);
    expectSentence(await applying(), "rules follow the second cycle", ...REWRITE);
  });

  // QFAI:EX-0001-0152-25
  it("under --auto asks nothing and opens the Unadjudicated row in the cycle that raised it", async () => {
    const text = await loop();
    expectSentence(text, "silence", /`--auto`/, /nothing is asked/i);
    expectSentence(
      text,
      "the row at once",
      /would go to the user becomes that row in the cycle that raised it/i,
    );
    expectSentence(text, "no decision recorded", /evidence records it with no decision/i);
    expectSentence(text, "the gate", /per-flow gate reports that row as `QFAI-SPACK-102`/i);
    expectSentence(await template(), "the record's form", /no decision has `none` in Decision/i);
  });

  // QFAI:EX-0001-0152-34
  it("opens an Unadjudicated row for a finding the user left open", async () => {
    const text = await loop();
    expectSentence(
      text,
      "the row",
      /finding with no decision when the loop ends/i,
      /`open-questions\.md` row at TODO whose Content opens `Unadjudicated:`/i,
      /target IDs/i,
    );
    expectSentence(text, "the gate", /`QFAI-SPACK-102` until it is decided/i);
  });

  // QFAI:EX-0001-0152-35
  it("stops after a cycle whose only finding was rejected, recording the finding and no empty-cycle row", async () => {
    expectSentence(
      await loop(),
      "adopting nothing stops",
      /cycle that adopts nothing ends the loop/i,
    );
    const text = await record();
    expectSentence(text, "the finding's row", /one row per finding/i, /decision/i);
    // The empty row answers raising nothing, so a cycle that raised a finding and adopted none has none.
    expectSentence(text, "the empty row", /one row for each cycle that raised nothing/i);
    expectSentence(await template(), "the empty row's form", /cycle that raised nothing/i);
  });
});

describe("a decided finding is not raised again", () => {
  // QFAI:EX-0001-0152-26
  it("does not raise a finding a TODO change request already answers", async () => {
    expectSentence(
      await rejected(),
      "change request suppression",
      /does not raise a finding again/i,
      /proposed change of a `Change request:` row at TODO or REJECTED already answers it/i,
    );
  });

  // QFAI:EX-0001-0152-27
  it("does not raise a rejected case, or one including it, whatever the wording, until a reopening lifts it", async () => {
    const text = await rejected();
    expectSentence(
      text,
      "a case including the rejected one",
      /does not raise a finding again/i,
      /kind and target IDs of a finding already decided in this invocation, or of a REJECTED row/i,
      /equal to that case/i,
      /includes it/i,
    );
    expectSentence(text, "wording", /Matching never goes by wording/i);
    expectSentence(text, "reopening", /decision appended to reopen a REJECTED row lifts it/i);
  });

  // QFAI:EX-0001-0152-36
  it("does not raise a case the rejected case includes", async () => {
    expectSentence(
      await rejected(),
      "a case inside the rejected one",
      /does not raise a finding again/i,
      /REJECTED row/,
      /is included in it/i,
    );
  });

  // QFAI:EX-0001-0152-37
  it("treats a declined change request as the user's decision until a reopening lifts it", async () => {
    const text = await rejected();
    expectSentence(
      text,
      "a declined change request",
      /does not raise a finding again/i,
      /`Change request:` row at TODO or REJECTED already answers it/i,
    );
    expectSentence(
      text,
      "the user decided",
      /declined change request is the user deciding that finding/i,
    );
    expectSentence(text, "reopening", /decision appended to reopen a REJECTED row lifts it/i);
  });
});

describe("the record the completion reviewer checks", () => {
  // QFAI:EX-0001-0152-28
  it("returns REVISE on a missing cycle row, a finder that wrote a rule, and a dependent adjudicator", async () => {
    const text = await revise();
    expectSentence(
      text,
      "the reader",
      /completion reviewer reads/i,
      /`## Concrete-Abstract Cycle` table/,
    );
    expectSentence(text, "a missing row", /returns REVISE/i, /cycle that ran has no row/i);
    expectSentence(text, "a dependent finder", /returns REVISE/i, /finder wrote a BR it read/i);
    expectSentence(
      text,
      "a dependent adjudicator",
      /returns REVISE/i,
      /finding the user did not decide/i,
      /its finder, or an author of an item it targets, as adjudicator/i,
    );
    expectSentence(
      text,
      "the fault is named",
      /returns REVISE, naming the cycle, finding or item at fault/i,
    );
    const form = await template();
    expect(
      rowOf(form, "Adjudicator")
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean),
    ).toEqual(["Cycle", "Finding", "Kind", "Target IDs", "Decision", "Adjudicator", "Reason"]);
    expectSentence(form, "the adjudicator", /Adjudicator is the cycle's griller, or `user`/i);
    expectSentence(form, "the finder is named", /Name the finder in the Work Orders Summary/i);
  });

  // QFAI:EX-0001-0152-29
  it("returns REVISE on a change to an approved example with no change request covering it", async () => {
    expectSentence(
      await revise(),
      "an unapproved change",
      /returns REVISE, naming the cycle, finding or item at fault/i,
      /adopted change to an item that existed when the invocation started/i,
      /no in-force triage approval or `Change request:` row whose approved change covers it/i,
    );
  });
});

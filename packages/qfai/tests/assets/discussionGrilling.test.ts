/**
 * `/qfai-discussion` runs its interview as a grilling session.
 *
 * The pack a run produces looks the same whether or not anyone was asked:
 * fifteen files, every topic covered, every open question registered. Nothing
 * downstream can recover the difference, so the obligations that make it are
 * pinned here — the method the interview follows, the bucket its decisions fall
 * in, the point authoring may begin, and the record a reviewer reads.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readDiscussionSkill, readDiscussionStep } from "../helpers/discussionSteps.js";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const MATRIX = "assistant/skill/qfai-discussion/references/discussion-completion-matrix.md";
const REVIEW_REQUEST = "assistant/skill/qfai-discussion/templates/review/review_request.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

/** Entries nested under one bucket header of the autopilot policy. */
function bucket(skill: string, name: string): string {
  const lines = skill.split(/\r?\n/);
  const header = new RegExp(`^\\s*[-*]\\s*${name}\\s*:`, "i");
  const anyHeader = /^\s*[-*]\s*(auto-decide|ask-user|hard-required)\s*:/i;
  const entries: string[] = [];
  let inside = false;
  for (const line of lines) {
    if (header.test(line)) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (anyHeader.test(line)) break;
    entries.push(line);
  }
  return unwrap(entries.join("\n"));
}

describe.each(TREES)("%s — the discussion interview", (tree) => {
  const read = (rel: string): Promise<string> => readFile(path.join(repoRoot, tree, rel), "utf-8");
  const assistantDir = path.join(repoRoot, tree, "assistant");
  /** The parent `SKILL.md` and every step it lists, read as one procedure. */
  const readSkill = (): Promise<string> => readDiscussionSkill(assistantDir);

  it("names the method the interview follows", async () => {
    // Without one, an agent that asked nothing has followed the step. The
    // topics are the checklist's, so there is one list to keep current.
    const skill = await readSkill();
    expectPhrase(skill, "as a grilling session through that skill");
    // The body is read, not the name: a host that loads skill bodies lazily
    // hands the agent the reference and not the procedure, and an agent with
    // the reference alone improvises an interview that reads like the method.
    expectPhrase(skill, "Read `.qfai/assistant/skill/qfai-grilling/SKILL.md`");
    expectPhrase(skill, "**Read the file, do not work from the name.**");
    expectPhrase(skill, "stop and report that `npx qfai init` installs it");
    expectPhrase(skill, ".agents/rules/grilling.md");
    expectPhrase(skill, "references/discussion-coverage-checklist.md");
  });

  it("cites the method rather than restating it", async () => {
    // Two copies of a method drift, and the drift reaches an agent as two
    // instructions to choose between.
    const skill = await readSkill();
    expectPhrase(skill, "this step does not restate it");
    for (const mechanic of [
      /the whole frontier at once/i,
      /each question numbered/i,
      /never at a count/i,
      /facts (?:are )?looked up rather than asked/i,
    ]) {
      expect(unwrap(skill), `the skill restates the method: ${String(mechanic)}`).not.toMatch(
        mechanic,
      );
    }
  });

  it("researches before it interviews", async () => {
    // A decision settled before the research bearing on it is settled against
    // evidence nobody had, and the method reads a fact rather than asking
    // about it — so the protocol's output is an input to the session's tree.
    const skill = await readSkill();
    const research = unwrap(skill).indexOf("research-first-protocol.md");
    const session = unwrap(skill).indexOf("as a grilling session through that skill");
    expect(research).toBeGreaterThan(-1);
    expect(session).toBeGreaterThan(-1);
    expect(research, "research runs after the interview").toBeLessThan(session);
    expectPhrase(skill, "The research findings are inputs to the session's tree");
  });

  it("asks the design direction inside the session, not after the pack", async () => {
    // The pack step records the direction after the pack is written, so a user-owned
    // visual choice asked there is asked after the thing it governs is written
    // — which the pre-authoring guard exists to stop.
    const skill = await readSkill();
    expectPhrase(skill, "the design-direction decisions in");
    expectPhrase(skill, "references/design-dna-intake.md`");
    // A cli-only pack is UI-bearing and has no brand questions, so the
    // condition is the visual surface rather than the UI-bearing flag.
    expectPhrase(skill, "where any classified surface is");
    expectPhrase(skill, "Not every UI-bearing target: a cli-only pack is UI-bearing");
    expectPhrase(
      skill,
      "a user-owned visual choice asked there is asked after the thing it governs",
    );
    expectPhrase(skill, "The choice is made in the session, not here; this step writes it down.");
  });

  it("puts the interview's decisions in ask-user, not auto-decide", async () => {
    // A design choice is not a pick among demonstrably equivalent alternatives,
    // and a skill that files it as one records a design nobody agreed to as
    // decided. Running the interview is what this skill performs, so its
    // questions are its own operations.
    const skill = await readSkill();
    const askUser = bucket(skill, "ask-user");

    expect(askUser).toMatch(/frontier/i);
    expect(askUser).toMatch(/confirmation that closes the session/i);
    expect(askUser).toMatch(/what this skill\s*performs/i);
    // The skill adds no auto-decide entry, so the shared prototype's rule holds.
    expect(bucket(skill, "auto-decide")).toBe("");
    expectPhrase(
      await read("assistant/rule/shared-skill-operating-baseline.md"),
      "**Equivalent-option pick means demonstrably equivalent.** A design choice is not one",
    );
  });

  it("holds the pack's authoring until the session has ended", async () => {
    // A pack drafted mid-session records a design still being decided, and from
    // then on the run defends the draft rather than the decision.
    const skill = await readSkill();
    expectPhrase(skill, "**Authoring the pack**");
    expectPhrase(skill, "does not start until the session has ended");
    // Each step that writes a pack file states the gate itself, since an agent
    // loads only the step it is running.
    for (const step of ["discussion-pack", "discussion-oq", "discussion-uiux"] as const) {
      const body = await readDiscussionStep(assistantDir, step);
      expect(body, step).toContain("## Precondition");
      expectPhrase(body, "`## Grilling Session` row, its `Ended at` is written");
    }
  });

  it("scopes the guard to the pack, not to every write", async () => {
    // Three writes are necessary before or during the session, and a guard over
    // every write makes the process unexecutable: the research the session
    // reads, the records a no-question ending produces — which are what block
    // completion — and a throwaway artifact the method calls for where talking
    // cannot settle a question.
    const skill = await readSkill();
    expectPhrase(skill, "Three writes are not that authoring");
    expectPhrase(
      skill,
      "The session reads it. Held back, the decisions are settled against evidence nobody had",
    );
    // And the exemption names where it goes. Left as the pack file it used to
    // be, the row would license the write the cancellation guard forbids.
    expectPhrase(skill, "The research summary in this run's stage evidence");
    expectPhrase(skill, "no pack directory exists yet");
    expectPhrase(
      skill,
      "a no-question run cannot write the open questions that block its completion",
    );
    expectPhrase(skill, "It is not the pack, and it is not kept");
  });

  it("lets three endings authorize authoring and stops on the fourth", async () => {
    // `stop` ends the session immediately and no further work follows it, so a
    // closure that authorizes proceeding and a cancellation cannot share a
    // value — a pack drafted after `stop` is the run doing exactly what the
    // user told it not to.
    const skill = await readSkill();
    for (const ending of ["`confirmed`", "`user-closed`", "`no-question`", "`stopped`"]) {
      expectPhrase(skill, ending);
    }
    expectPhrase(skill, "the frontier empty **and** no fact lookup still running");
    expectPhrase(skill, "each decision still open becomes a labelled assumption");
    expectPhrase(skill, "**Does not start.** Report every open decision as open and end the run");
    expectPhrase(skill, "a pack drafted after `stop` is the run doing exactly what the");
  });

  it("accepts each ending that authorizes authoring, and no others", async () => {
    // A gate that took only the natural ending would block every run the user
    // closed with `proceed` or `done`, which the method explicitly permits.
    const matrix = await read(MATRIX);
    expectPhrase(matrix, "`Ended` reading one of the three endings that authorize it");
    expectPhrase(matrix, "every decision still open recorded as a labelled assumption");
    expectPhrase(matrix, "`stopped` never completes");
    // When every remaining decision waits on a lookup the frontier is empty
    // while the tree still holds open nodes, so authoring there begins before
    // the lookup can raise the questions it was dispatched to answer.
    expectPhrase(matrix, "the frontier empty **and** no fact lookup still running");
    expectPhrase(matrix, "Both halves of the `confirmed` condition");
    expectPhrase(matrix, "Not at a count");
  });

  it("keeps a hard-required input out of every assumption path", async () => {
    // An ending cannot authorize authoring over an input the run consumes and
    // does not have. Registering an open question does not make it defaultable:
    // the value is what the run needs, and a question about it is not one.
    const skill = await readSkill();
    expectPhrase(
      skill,
      "**No ending authorizes authoring while a `hard-required` input this invocation consumes is missing.**",
    );
    expectPhrase(
      skill,
      "an interactive closure still asks for them, and a no-question run stops and names them",
    );
    expectPhrase(skill, "Registering an open question does not make an input defaultable");
  });

  it("blocks a non-UI pack on its open count too", async () => {
    // A run is `--auto` or not independently of whether it has a surface, and
    // the open count is what a no-question run is blocked by. Listed only under
    // the UI-bearing shape, a non-UI `--auto` pack completed with its decisions
    // still open.
    const matrix = await read(MATRIX);
    const allPacks = /## All Packs([\s\S]*?)^## /m.exec(matrix)?.[1] ?? "";
    expect(unwrap(allPacks)).toContain("`Disposition: open` count is zero in `11_OQ-Register.md`");
    expectPhrase(matrix, "Here rather than under one pack shape");
    // And it is not left in both places, where the two could drift.
    expect(matrix.match(/`Disposition: open` count is zero/g) ?? []).toHaveLength(1);
  });

  it("records when the session ended and when authoring began", async () => {
    // A row holding only the final state reads the same whether the session ran
    // first, ran after, or never ran — it is written at the end either way.
    // The interview writes the row in the shape the shared record step owns.
    const skill = await readSkill();
    expectPhrase(skill, "common-grilling-record/STEP.md#one-session");
    expectPhrase(skill, "write `Ended at` before the first pack file");
    const record = await read("assistant/step/common-grilling-record/STEP.md");
    expectPhrase(record, "| Ended | Ended at | Authoring began |");
    expectPhrase(record, "**The end time is written before work resumes.**");
    // And the limit is stated rather than implied.
    expectPhrase(record, "It still cannot prove a session happened");
  });

  it("leaves a record the reviewer can check the claim against", async () => {
    // A skipped session and a completed one present the same pack, so a
    // reviewer with only the pack must either block every run or accept a
    // claim it cannot verify.
    const skill = await readSkill();
    expectPhrase(skill, "## Grilling Session");
    const record = await read("assistant/step/common-grilling-record/STEP.md");
    expectPhrase(record, "Only `confirmed`, `user-closed` and `no-question` authorize authoring.");
    // The reviewer is handed the row rather than sent looking for it: a row it
    // has to find is one it can return `PASS` without reading.
    const request = await read(REVIEW_REQUEST);
    expectPhrase(request, "## Grilling Session");
    expectPhrase(request, "a row it has to\n> go looking for is one it can pass without reading");
    expectPhrase(skill, "accept a claim it cannot check");
    // And the gate reads the row rather than the event.
    expectPhrase(
      skill,
      "the stage evidence's `## Grilling Session` row shows the session ended before authoring began",
    );

    const matrix = await read(MATRIX);
    expectPhrase(matrix, "The stage evidence's `## Grilling Session` row");
    expectPhrase(matrix, "The no-question row is the one to read carefully");
  });

  it("gives the record a home before the pack has one", async () => {
    // `Ended at` is required before the first pack file, and nothing named a
    // file the run may write at that moment. A row with nowhere to go until the
    // pack exists can only be written after drafting, which is the order the
    // requirement was added to rule out.
    const skill = await readSkill();
    expectPhrase(skill, "`.qfai/evidence/discussion-<YYYYMMDDhhmmssSSS>.md`");
    expectPhrase(skill, "before anything else is written");
    expectPhrase(skill, "have no other home before the pack exists");
  });

  it("keeps a cancelled run from leaving a pack behind", async () => {
    // The research output used to land in a freshly stamped pack directory
    // before the session ran. A run the user stops there leaves one file under
    // the greatest timestamp, and the resolver picks it over the last complete
    // pack, so every later reader reports a project that looks broken.
    const skill = await readSkill();
    expectPhrase(
      skill,
      "**Nothing is written under `.qfai/discussion/` until an ending authorizes authoring.**",
    );
    expectPhrase(skill, "resolved by the greatest timestamp with no completeness check");
    // The summary still has somewhere to be, and reaches the pack when one opens.
    expectPhrase(skill, "record its `research_summary` output in this run's stage evidence");
    expectPhrase(skill, "into the `## Research Summary` section of `04_Sources.md`");
  });

  it("hands the reviewer the two fields it rules on", async () => {
    // The reviewer is told to rule on whether the session ended before
    // authoring began, and the template carried neither time. A row holding the
    // final state alone reads the same whichever order it happened in.
    const request = await read(REVIEW_REQUEST);
    expectPhrase(request, "| Ended | Ended at | Authoring began | Frontier |");
    expectPhrase(request, "Both times, because they are what that ruling compares");
  });

  it("keeps an approval-required decision out of the closure's assumptions", async () => {
    // `proceed` closes the questions, not the authorizations. The visual
    // direction is the case here: the intake document says only the user may
    // choose a theme, so a closure that assumed it would have the run make the
    // one choice that document reserves.
    const skill = await readSkill();
    expectPhrase(
      skill,
      "**An interactive closure does not assume a decision some document requires the user to make and record.**",
    );
    expectPhrase(skill, "only the user may choose a theme");
    expectPhrase(skill, "waives the agent's own uncertainty, never an authorization");
    // And the ending's own row says it, since that is the line an agent reads.
    expectPhrase(skill, "except one a document requires the user to make and record");
  });

  it("leaves the no-question path its documented answer", async () => {
    // The bound is an interactive closure's. Applied to `--auto` it bars the
    // one path written down for a visual run with nobody to ask, and bars it
    // into a state that produces neither half: no pack, and so nowhere to
    // register the question the bar was supposed to leave blocking.
    const skill = await readSkill();
    expectPhrase(skill, "**`--auto` is the other case, and its answer is already written.**");
    expectPhrase(skill, "record it `chosen_by: assumption`, open it in `11_OQ-Register.md`");
    expectPhrase(skill, "What is forbidden is the assumption on its own");
  });

  it("says which writes the pack-only rule was about", async () => {
    // Read as every write, it forbids the stage evidence this run opens first —
    // and it never covered the review pack either, which the cycle writes
    // outside the pack by design.
    const skill = await readSkill();
    expectPhrase(skill, "Discussion authors no design artifact outside its own pack");
    expectPhrase(skill, "record what the run did rather than specify anything");
  });

  it("agrees with the protocol whose output it redirects", async () => {
    // The shared rule outranks the skill and sits at P1 in its own read order,
    // so a storage contract sending the summary straight into the pack is the
    // instruction an agent follows — and it rebuilds the partial pack this
    // change exists to prevent.
    const protocol = await read("assistant/rule/research-first-protocol.md");
    expectPhrase(protocol, "goes to the invoking stage's own evidence when it is");
    expectPhrase(protocol, "carried into the artifact that consumes it");
    expectPhrase(protocol, "a run cancelled before that authorization leaves it behind");
    expectPhrase(protocol, "Not persisted globally");
  });
});

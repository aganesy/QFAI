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

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Source tree first, then the generated root mirror `sync:ssot` writes. */
const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-discussion/SKILL.md";
const MATRIX = "assistant/skills/qfai-discussion/references/discussion-completion-matrix.md";

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

  it("names the method the interview follows", async () => {
    // Without one, an agent that asked nothing has followed the step. The
    // topics are the checklist's, so there is one list to keep current.
    const skill = await read(SKILL);
    expectPhrase(skill, "as a grilling session through that skill");
    // The body is read, not the name: a host that loads skill bodies lazily
    // hands the agent the reference and not the procedure, and an agent with
    // the reference alone improvises the interview this step replaces.
    expectPhrase(skill, "Read `.qfai/assistant/skills/qfai-grilling/SKILL.md`");
    expectPhrase(skill, "**Read the file, do not work from the name.**");
    expectPhrase(skill, "stop and report that `npx qfai init` installs it");
    expectPhrase(skill, ".agents/rules/grilling.md");
    expectPhrase(skill, "references/discussion-coverage-checklist.md");
  });

  it("cites the method rather than restating it", async () => {
    // Two copies of a method drift, and the drift reaches an agent as two
    // instructions to choose between.
    const skill = await read(SKILL);
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
    const skill = await read(SKILL);
    const research = unwrap(skill).indexOf("research-first-protocol.md");
    const session = unwrap(skill).indexOf("as a grilling session through that skill");
    expect(research).toBeGreaterThan(-1);
    expect(session).toBeGreaterThan(-1);
    expect(research, "research runs after the interview").toBeLessThan(session);
    expectPhrase(skill, "Step 1's findings are inputs to the session's tree");
  });

  it("asks the design direction inside the session, not after the pack", async () => {
    // Step 9 runs after steps 3 to 8 have authored the pack, so a user-owned
    // visual choice asked there is asked after the thing it governs is written
    // — which the pre-authoring guard exists to stop.
    const skill = await read(SKILL);
    expectPhrase(skill, "the design-direction decisions in `references/design-dna-intake.md`");
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
    const skill = await read(SKILL);
    const askUser = bucket(skill, "ask-user");
    const autoDecide = bucket(skill, "auto-decide");

    expect(askUser).toMatch(/frontier/i);
    expect(askUser).toMatch(/confirmation that closes the session/i);
    expect(askUser).toMatch(/what this skill\s*performs/i);
    expect(autoDecide).toMatch(/demonstrably equivalent, which a design choice is not/i);
  });

  it("holds authoring until the session has ended, by any of its routes", async () => {
    // A pack drafted mid-session records a design still being decided, and from
    // then on the run defends the draft rather than the decision. Under a
    // no-question mode no confirmation can arrive, so a guard waiting for one
    // would stop the run before it could write the open questions that block
    // its completion.
    const skill = await read(SKILL);
    expectPhrase(skill, "Artifact authoring does not start until the session has ended");
    expectPhrase(skill, "the frontier empty **and** no fact lookup still running");
    expectPhrase(skill, "with every remaining decision\nregistered as an open question");
    expectPhrase(skill, "The no-question route is an ending, not an exemption.");
  });

  it("requires both halves of the end condition", async () => {
    // When every remaining decision waits on a lookup, the frontier is empty
    // while the tree still holds open nodes, and authoring there begins before
    // the lookup can raise the questions it was dispatched to answer.
    const matrix = await read(MATRIX);
    expectPhrase(
      matrix,
      "no node open — the frontier empty\n   **and** no fact lookup still running",
    );
    expectPhrase(matrix, "Both halves of the first condition");
    expectPhrase(matrix, "Not\n   at a count");
  });

  it("leaves a record the reviewer can check the claim against", async () => {
    // A skipped session and a completed one present the same pack, so a
    // reviewer with only the pack must either block every run or accept a
    // claim it cannot verify.
    const skill = await read(SKILL);
    expectPhrase(skill, "## Grilling Session");
    expectPhrase(skill, "`Ended` is `confirmed`, `user-closed` or `no-question`.");
    expectPhrase(skill, "accept a claim it cannot check");
    // And the gate reads the row rather than the event.
    expectPhrase(
      skill,
      "the stage evidence's `## Grilling Session` row shows the session ended before authoring began",
    );

    const matrix = await read(MATRIX);
    expectPhrase(matrix, "The stage evidence's `## Grilling Session` row");
    expectPhrase(matrix, "the row reads `no-question`");
  });
});

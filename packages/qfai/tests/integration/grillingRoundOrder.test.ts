/**
 * The order inside one grilling round: costly decisions first, cheap ones grouped.
 *
 * Dependency already decides which round a question belongs to. These clauses decide its place
 * inside the round, and they keep the grouped question from becoming a way for the agent to answer
 * the user's decisions for them.
 */
// QFAI:AC-0001-0254-01
// QFAI:AC-0001-0254-02
// QFAI:AC-0001-0254-03

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const MASTERS = [
  ".agents/rules/grilling.md",
  "packages/qfai/assets/init/root/.agents/rules/grilling.md",
];
const SKILLS = [
  ".qfai/assistant/skill/qfai-grilling/SKILL.md",
  "packages/qfai/assets/init/.qfai/assistant/skill/qfai-grilling/SKILL.md",
];

/** Collapse soft wraps so a clause is pinned by its wording, not its wrap column. */
const unwrap = (text: string): string => text.replace(/\s*\n\s*/g, " ");

const readRaw = (rel: string): Promise<string> => readFile(path.join(ROOT, rel), "utf-8");
const read = async (rel: string): Promise<string> => unwrap(await readRaw(rel));

/** The text of one `## ` section, so a clause is pinned where it belongs. */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(`## ${heading} `);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = text.indexOf(" ## ", start + 3);
  return end === -1 ? text.slice(start) : text.slice(start, end);
};

describe.each(MASTERS)("%s orders a round upstream first", (rel) => {
  // QFAI:EX-0001-0254-01
  it("puts a costly decision before a cheap one, and leaves the round to dependency", async () => {
    const round = section(await read(rel), "A round");
    expect(round).toContain("**Upstream first: order the round by the cost of a wrong answer.**");
    expect(round).toContain(
      "Dependency decides which round a question belongs to; cost decides its place within the round.",
    );
    expect(round).toContain(
      "A decision that is hard to reverse, or that later decisions hang on, comes first. Every other decision is cheap to revise and comes after, in one grouped question.",
    );
    expect(round).toContain("Two questions never share a round when one depends on the other.");
    expect(round).toContain("the user may move any out");
  });

  // QFAI:EX-0001-0254-02
  it("groups the cheap decisions into one question answered once", async () => {
    const shape = section(await read(rel), "The shape of a question");
    expect(shape).toContain("**Cheap decisions share one grouped question.**");
    expect(shape).toContain(
      "It numbers each decision with its recommended answer and a one-line reason. Its two options are accepting all and deciding some separately by item number",
    );
    expect(shape).toContain("A named item is asked as its own question in the next round.");
    expect(shape).toContain(
      "so it stays one choose (`reply-forms.md` § 1) on the round's one carrier",
    );
  });

  // QFAI:EX-0001-0254-03
  it("never groups a critical decision, a fact or a document-required decision", async () => {
    const shape = section(await read(rel), "The shape of a question");
    expect(shape).toContain(
      "A critical decision, a fact, and a decision some document requires the user to record are never grouped",
    );
  });

  // QFAI:EX-0001-0254-04
  it("records an accepted group as the user's decisions, not a delegation", async () => {
    const shape = section(await read(rel), "The shape of a question");
    expect(shape).toContain(
      "Grouping is not delegation: an accepted group records each item as the user's decision.",
    );
    expect(shape).toContain("a delegated session's rounds keep their own rules");
  });
});

describe.each(SKILLS)("%s carries the round order", (rel) => {
  // QFAI:EX-0001-0254-05
  it("orders upstream first and groups cheap decisions, pointing to the master", async () => {
    const skill = await read(rel);
    expect(skill).toContain("Order it upstream first");
    expect(skill).toContain("(`.agents/rules/grilling.md` § A round)");
    expect(skill).toContain("Decisions cheap to revise share one grouped question");
    expect(skill).toContain("grouping is not delegation");
    expect(skill).toContain("(`.agents/rules/grilling.md` § The shape of a question)");
  });
});

/**
 * The shipped reviewer prompt and per-screen payload schema keep a cycle's four ordinal scores apart
 * from a screen's bounded impressions, and teach the reviewer that a favorable score never stands in
 * for a blocking finding.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistant = path.join(getInitAssetsDir(), ".qfai", "assistant");
const prototypingReferences = path.join(assistant, "skill", "qfai-prototyping", "references");
const discussionSkill = path.join(assistant, "skill", "qfai-discussion");

const flat = (text: string): string => text.replace(/\s+/g, " ");

async function reference(name: string): Promise<string> {
  return readFile(path.join(prototypingReferences, name), "utf-8");
}

/** The lines of a TypeScript type block that sit at exactly `indent` spaces, as their field names. */
function fieldsAt(block: string, indent: number): string[] {
  const pattern = new RegExp(`^ {${indent}}([A-Za-z]+): `);
  return block
    .split(/\r?\n/)
    .map((line) => pattern.exec(line)?.[1] ?? "")
    .filter((name) => name.length > 0);
}

/** The `type <name> = {` block of the first fenced `ts` block that declares it. */
function typeBlock(markdown: string, name: string): string {
  const start = markdown.indexOf(`type ${name} = {`);
  expect(start, `no type ${name}`).toBeGreaterThanOrEqual(0);
  const end = markdown.indexOf("\n};", start);
  return markdown.slice(start, end);
}

describe("the reviewer prompt separates cycle scores from screen impressions", () => {
  // QFAI:AC-0001-0083-01
  // QFAI:EX-0001-0083-01
  it("reports four ordinal axes in the cycle summary and no rating in the per-screen payload", async () => {
    const prompt = await reference("reviewer-prompt.md");
    const schema = await reference("review-payload-schema.md");

    const summary = typeBlock(prompt, "Review");
    const scores = summary.slice(
      summary.indexOf("scores: {"),
      summary.indexOf("layoutAntiPatternsDetected"),
    );
    expect(fieldsAt(scores, 4)).toEqual([
      "informationArchitecture",
      "navigationFlow",
      "usability",
      "functionality",
    ]);
    expect(scores.match(/"weak" \| "acceptable" \| "strong" \| "exceptional"/g)).toHaveLength(4);
    expect(flat(prompt)).toContain(
      "Score each axis `weak`, `acceptable`, `strong`, or `exceptional` from the live review.",
    );

    const payload = typeBlock(schema, "ReviewerPayload");
    expect(fieldsAt(payload, 2)).toEqual([
      "uiContractId",
      "screenId",
      "cycle",
      "sessionStatus",
      "retryCount",
      "blockingFindings",
      "impressions",
      "layoutAntiPatternsDetected",
      "designMdViolations",
      "wallTimeSec",
      "softWarnings",
    ]);
    const impressions = payload.slice(
      payload.indexOf("impressions: {"),
      payload.indexOf("layoutAntiPatternsDetected"),
    );
    expect(fieldsAt(impressions, 4)).toEqual([
      "operability",
      "transitionFeel",
      "crossScreenContinuity",
      "userStoryFeel",
      "acceptanceCriteriaFeel",
      "menuReachabilityFeel",
    ]);
    expect(flat(schema)).toContain(
      "The payload carries findings and bounded prose. It carries no rating",
    );
    expect(flat(prompt)).toContain(
      "The six bounded `impressions.*Feel` fields remain on each per-screen payload; do not add rating keys to that closed schema.",
    );
  });

  // QFAI:AC-0001-0083-01
  // QFAI:EX-0001-0083-01
  it("defines the axes in the prompt alone, with no discussion-pack rubric or calibration sidecar", async () => {
    const prompt = flat(await reference("reviewer-prompt.md"));
    expect(prompt).toContain(
      "The four axes are fixed and say nothing about this prototype's purpose",
    );

    const relatives = await readdir(discussionSkill, { recursive: true });
    const files = relatives.filter((relative) => path.extname(relative) !== "");
    expect(files.length).toBeGreaterThan(0);
    for (const relative of files) {
      expect(relative, "a rubric or calibration file").not.toMatch(/rubric|calibration/i);
      const text = await readFile(path.join(discussionSkill, relative), "utf-8");
      expect(text, relative).not.toMatch(/rubric|calibration/i);
    }
  });
});

describe("the reviewer prompt contrasts an actionable defect with a lenient score", () => {
  // QFAI:AC-0001-0084-01
  it("names the screen, the defect and the correction, and keeps the defect in blockingFindings whatever the score", async () => {
    const prompt = flat(await reference("reviewer-prompt.md"));
    expect(prompt).toContain(
      "Good: on `checkout`, the primary action remains below the fold at the declared mobile width. Record the screen and observable defect, propose moving the action into the visible task path, and keep it in `blockingFindings` even if another screen scores `strong`.",
    );
    expect(prompt).toContain(
      'Bad: record only "navigation looks good" or a favorable score for that same checkout flow while omitting the blocked action.',
    );
    expect(prompt).toContain("A favorable score never hides a blocking finding.");
    expect(prompt).toContain(
      "do not inflate a score: a favorable score that hides a defect misleads the one judgement that ends the loop.",
    );
  });
});

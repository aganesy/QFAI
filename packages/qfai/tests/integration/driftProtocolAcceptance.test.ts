/**
 * Acceptance of the shipped drift protocol: the steps it defines for a change
 * to an approved obligation.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const protocolPath = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "rule",
  "drift-protocol.md",
);

/** The `##` sections of a Markdown document, by title, each with its body up to the next one. */
function sectionsOf(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  for (const chunk of markdown.split(/^## /m).slice(1)) {
    const newline = chunk.indexOf("\n");
    sections.set(chunk.slice(0, newline).trim(), chunk.slice(newline + 1));
  }
  return sections;
}

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

/** The steps numbered at the start of a line, each with the lines that continue it, up to the next heading. */
function numberedSteps(body: string): { number: number; text: string }[] {
  const steps: { number: number; text: string }[] = [];
  for (const line of body.split("\n")) {
    if (line.startsWith("#")) break;
    const start = /^(\d+)\. (.*)$/.exec(line);
    const last = steps.at(-1);
    if (start) steps.push({ number: Number(start[1]), text: start[2] ?? "" });
    else if (last) last.text += ` ${line}`;
  }
  return steps.map(({ number, text }) => ({ number, text: collapse(text) }));
}

describe("drift protocol acceptance", () => {
  let sections = new Map<string, string>();

  beforeAll(async () => {
    sections = sectionsOf((await readFile(protocolPath, "utf-8")).replace(/\r\n/g, "\n"));
  });

  // QFAI:AC-0001-0002-01
  it("defines the six drift steps in order, with the change-request row at WIP, REJECTED and DONE", () => {
    const body = sections.get("When drift is detected") ?? "";
    const steps = numberedSteps(body);

    expect(steps.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(steps.map(({ text }) => text.split(/[.:]/)[0])).toEqual([
      "Stop work on the affected obligation and its dependents",
      "Prepare the change request for the SDD owner",
      "Obtain the user's explicit answer",
      "Rerun the owner skill against the affected artifact",
      "Recheck every dependent BF, AC, and EX test obligation and every affected contract reference",
      "Complete the decision row by changing Status from WIP to DONE only after the owner artifact and dependent checks are complete",
    ]);

    const answer = steps[2]?.text ?? "";
    expect(answer).toContain("Content starts with Change request:");
    expect(answer).toContain("and the row starts at WIP.");
    expect(answer).toContain("the row is appended at REJECTED. It authorizes no edit");
    expect(steps[3]?.text).toContain("The owner updates the specification and its tests together");
    expect(steps[5]?.text).toContain("changing Status from WIP to DONE");
  });
});

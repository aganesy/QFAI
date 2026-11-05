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
  // QFAI:EX-0001-0002-02
  it("defines the five drift steps in order, with an appended change-request row never edited", () => {
    const body = sections.get("When drift is detected") ?? "";
    const steps = numberedSteps(body);

    expect(steps.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5]);
    expect(steps.map(({ text }) => text.split(/[.:]/)[0])).toEqual([
      "Stop work on the affected obligation and its dependents",
      "Prepare the change request for the SDD owner",
      "Obtain the user's explicit answer",
      "Rerun the owner skill against the affected artifact",
      "Recheck every dependent BF, AC, and EX test obligation and every affected contract reference",
    ]);

    const answer = steps[2]?.text ?? "";
    expect(answer).toContain("Content starts with `Change request:`");
    expect(answer).toContain("Content starts with `Declined change request:`");
    expect(answer).toContain("authorizes the paths it names only on the branch that adds it");
    expect(steps[3]?.text).toContain("The owner updates the specification and its tests together");
    expect(collapse(body)).toContain("No step edits the row afterwards.");
  });
});

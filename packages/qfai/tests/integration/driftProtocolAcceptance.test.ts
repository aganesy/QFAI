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

const triagePath = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-sdd",
  "references",
  "sdd-triage.md",
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

describe("merge-added identical decision copy recovery", () => {
  let section = "";
  let triage = "";

  beforeAll(async () => {
    const protocol = (await readFile(protocolPath, "utf-8")).replace(/\r\n/g, "\n");
    const reference = (await readFile(triagePath, "utf-8")).replace(/\r\n/g, "\n");
    const title = "Merge-added identical decision copy recovery";
    section = collapse(sectionsOf(protocol).get(title) ?? "");
    triage = collapse(sectionsOf(reference).get(title) ?? "");
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-23
  it("allows manual removal of proven surplus copies only under a separate target request", () => {
    expect(section).toMatch(/manually remove only raw-identical surplus copies of a decision row/);
    expect(section).toMatch(/exact two-parent bad merge/);
    expect(section).toMatch(/authorizes no target.*separate new in-force change request/);
    expect(section).toMatch(/available ancestor of current HEAD.*exactly two parents/);
    expect(section).toMatch(/unique common ancestor.*exactly one byte-identical original/);
    expect(section).toMatch(/explicit base and its unique comparison ancestor.*one original/);
    expect(section).toMatch(
      /all four cells, delimiters, padding and line ending.*SHA-256, including the line ending/,
    );
    expect(section).toMatch(/retain\/remove mapping.*actual authority/);
    expect(section).toMatch(/reviewed independently and adopted.*actual write HEAD/);
    expect(section).toMatch(/adds no receipt grammar and no validator input/);
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-24
  it("stops on every missing, ambiguous or excluded input", () => {
    expect(section).toMatch(
      /missing or non-ancestor merge, a third parent, a non-unique ancestor or a source that does not hold exactly one original stops recovery/,
    );
    expect(section).toMatch(/Nonidentical cells, padding or endings are a different collision/);
    expect(section).toMatch(
      /Open-question rows, nonidentical collisions, ordinary duplicate cleanup and surplus that the base or its comparison ancestor already holds are excluded/,
    );
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-25
  it("rechecks the proof immediately before writing and refreshes it when it changes", () => {
    expect(section).toMatch(
      /Immediately before writing, recheck the refs, their availability, the path, the authority, the occurrence count, the mapping and the bytes/,
    );
    expect(section).toMatch(
      /Stale, missing, ambiguous, conflicting or changed proof stops before writing/,
    );
    expect(section).toMatch(/Changed observations need refreshed reviewed evidence/);
    expect(section).toMatch(/changed target or operation needs a new request.*earlier one/);
    expect(section).toMatch(/does not name its own commit/);
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-26
  it("removes only the mapped copies and keeps every other byte", () => {
    expect(section).toMatch(
      /Remove only the mapped surplus occurrences.*Keep one complete original/,
    );
    expect(section).toMatch(/every distinct decision and reference.*every unrelated current byte/);
    expect(section).toMatch(/Do not trim, decode escapes or normalize endings/);
    expect(section).toMatch(/Do not change a Status, rewrite a reference or reorder other history/);
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-27
  it("restores the preimage only while the file still equals the owned replacement", () => {
    expect(section).toMatch(
      /restores the recorded complete preimage only while the current file is byte-identical to its owned replacement/,
    );
    expect(section).toMatch(/keep the current bytes, stop and name the unrestored path/);
    expect(section).toMatch(/Restoring brings back the duplicate failure/);
    expect(section).toMatch(/Do not reset, amend or force push/);
  });

  // QFAI:AC-0001-0007-05
  // QFAI:EX-0001-0007-28
  it("leaves the normal checks in force and claims no whole-target result", () => {
    expect(section).toMatch(
      /duplicate check, positional drift, consumed-DONE authorization and valid Status-only rules keep applying without an exemption/,
    );
    expect(section).toMatch(/Other drift that the file already has stays diagnosed/);
    expect(section).toMatch(/required stage gate still stops dependent work/);
    expect(section).toMatch(/not a whole-target PASS.*stays at WIP/);
    expect(section).toMatch(
      /not a command, an executor or a concurrency, atomicity or power-loss guarantee/,
    );
  });

  // QFAI:AC-0001-0007-05
  it("points the SDD triage reference at the rule", () => {
    expect(triage).toContain(
      ".qfai/assistant/rule/drift-protocol.md#merge-added-identical-decision-copy-recovery",
    );
    expect(triage).toMatch(/authorizes no target.*separate new target-specific change request/);
    expect(triage).toMatch(/stays WIP while any named action or required check is unfinished/);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const skillDir = path.join(getInitAssetsDir(), ".qfai", "assistant", "skill", "qfai-implement");
const policyPath = path.join(skillDir, "references", "parallelization-policy.md");

/** The policy with every run of whitespace collapsed, so a sentence can span a wrapped line. */
async function policy(): Promise<string> {
  return (await readFile(policyPath, "utf-8")).replace(/\s+/g, " ");
}

/** The section a `## ` heading opens, up to the next one. */
function section(text: string, heading: string): string {
  return text.split(` ## ${heading} `)[1]?.split(" ## ")[0] ?? "";
}

describe("parallel dispatch by story, under the gate the session agent applies", () => {
  // QFAI:AC-0001-0093-01
  it("fans out only unbuilt stories, only when every gate condition holds, without asking", async () => {
    const text = await policy();
    expect(text).toContain("Process one open EX at a time in ascending ID order");
    const units = section(text, "Units");
    expect(units).toContain("| Story | An implement stage only |");
    expect(units).toContain("one user story no EX of which a test annotates yet");
    const gate = section(text, "Parallel-unit gate");
    expect(gate).toContain("fans out only when every condition holds for every pair of units");
    expect(gate).toContain(
      "It decides alone, records the result in the stage report, and asks the user nothing.",
    );
    for (const condition of ["| G1 |", "| G2 |", "| G3 |", "| G4 |", "| G5 |", "| G6 |"]) {
      expect(gate, condition).toContain(condition);
    }
  });

  // QFAI:EX-0001-0093-01
  it("fails two stories that write one fixture, and not two that only read one", async () => {
    const gate = section(await policy(), "Parallel-unit gate");
    expect(gate).toContain(
      "Two units that write the same shared fixture or mock file, or mutate the same fixture instance, fail G4.",
    );
    expect(gate).toContain(
      "A shared fixture module that both only read as-is does not fail it on its own.",
    );
    expect(gate).toContain("Where any condition is uncertain, the units run serially.");
  });

  // QFAI:EX-0001-0093-02
  it("keeps every change to an implemented story in the session agent", async () => {
    expect(await policy()).toContain(
      "Everything else runs in the session agent: the specification, the discussion interview and pack, prototyping, triage, verify, maintenance, the framing of research and the reading of its answers, and every change to a story that is already implemented.",
    );
  });

  // QFAI:EX-0001-0093-03
  it("keeps a story whose brief would retell the conversation in the session agent", async () => {
    expect(section(await policy(), "Parallel-unit gate")).toContain(
      "A unit whose brief would retell the conversation runs in the session agent",
    );
  });

  // QFAI:EX-0001-0093-04
  it("briefs each story with its own owned paths and reruns every selector on the merged tree", async () => {
    const text = await policy();
    const brief = section(text, "Briefing a unit");
    expect(brief).toContain("never a fork of the session's conversation");
    expect(brief).toContain("the exact owned-path list (empty for a lookup)");
    expect(brief).toContain("Give each a checkout assigned by the host.");
    expect(brief).toContain("Creating a worktree does not grant edit permission.");
    expect(brief).toContain("Workers do not change another worker's files or the story tree.");
    const integration = section(text, "Integration gate");
    expect(integration).toContain(
      "It reruns every story unit's selectors and `npx qfai validate --profile tdd --fail-on error --flow BF-NNNN` on the merged tree",
    );
    expect(integration).toContain("A worker's isolated PASS is not an integrated PASS.");
  });

  // QFAI:EX-0001-0093-07
  it("records a story too small for a brief and leaves fewer than two units serial", async () => {
    expect(section(await policy(), "Parallel-unit gate")).toContain(
      "| G2 | There are two or more units, and the stage report records that each is large enough to be worth a brief |",
    );
  });

  // QFAI:EX-0001-0093-08
  it("runs a story that needs another story's output serially", async () => {
    expect(section(await policy(), "Parallel-unit gate")).toContain(
      "| G5 | No unit needs another unit's output |",
    );
  });

  // QFAI:EX-0001-0093-09
  it("stops the fan-out and repairs serially when the combination fails", async () => {
    expect(section(await policy(), "Integration gate")).toContain(
      "When the combination itself causes the failure, stop the fan-out and repair serially.",
    );
  });
});

describe("parallel read-only lookups", () => {
  // QFAI:AC-0001-0093-02
  // QFAI:EX-0001-0093-05
  it("gives each self-contained question to a worker that writes nothing and cites its sources", async () => {
    const units = section(await policy(), "Units");
    expect(units).toContain(
      "| Lookup | Discussion research, a grilling session, the web-research search, fetch and verify stages |",
    );
    expect(units).toContain(
      "Answers one self-contained question from the repository or the web, writes nothing, and returns the answer with its sources",
    );
  });

  // QFAI:EX-0001-0093-06
  it("runs a lookup that needs another lookup's answer serially", async () => {
    const text = await policy();
    const gate = section(text, "Parallel-unit gate");
    // G1 makes a lookup a unit, so G5 holds for lookups as it does for stories.
    expect(gate).toContain("| G1 | Each unit is a story unit or a lookup unit, as above |");
    expect(gate).toContain("fans out only when every condition holds for every pair of units");
    expect(gate).toContain("| G5 | No unit needs another unit's output |");
    expect(text).toContain("the framing of research and the reading of its answers");
  });
});

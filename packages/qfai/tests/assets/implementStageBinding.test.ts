/**
 * `/qfai-implement` was the only shipped skill bound by neither inheritance
 * route — and it is the one stage that creates production source trees and runs
 * the project's test/lint/typecheck commands once per TDD item.
 *
 * `workflow.md` declares the pipeline `SDD -> ATDD -> TDD -> Verification`, but
 * `## Stages (canonical)` jumped from "5. Acceptance tests (ATDD)" straight to
 * "6. Verify" with no implementation stage, and the mandatory Stage-0
 * steering-refresh contract enumerated five skills, omitting `qfai-implement`.
 * The second route — an explicit anchor reference into the operating baseline —
 * is opt-in, and the skill referenced three anchors, none of them the three that
 * matter here.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const WORKFLOW = "assistant/constitution/workflow.md";
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const TECH = "assistant/catalog/tech.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("lists the implementation stage the pipeline declares", async () => {
    // `SDD -> ATDD -> TDD -> Verification` at the top of the file, with no TDD
    // entry in the numbered list below it.
    const workflow = await read(tree, WORKFLOW);
    expect(workflow).toContain("6. Implementation (TDD): `/qfai-implement` drives the");
    expect(workflow).toContain("7. Verify: run quality gates and provide evidence");
    expect(workflow).not.toContain("6. Verify: run quality gates and provide evidence");
  });

  it("binds the stage that writes production code to the Stage-0 contract", async () => {
    const workflow = await read(tree, WORKFLOW);
    expect(workflow).toContain("`qfai-atdd`, `qfai-implement`, `qfai-verify`");
  });

  it("takes the second route too, since the first is opt-in", async () => {
    // Belt and braces on purpose: the enumeration above and the anchors below
    // are independent, and this skill was missing from both.
    const skill = await read(tree, SKILL);
    for (const anchor of [
      "#stage-0---steering-completion-refresh-mandatory",
      "#format-ssot-mandatory",
      "#delta-rejected-guard-mandatory",
    ]) {
      expect(skill, `missing baseline anchor ${anchor}`).toContain(anchor);
    }
  });

  it("takes its commands from the SSOT rather than inventing them", async () => {
    // This stage executes the project's test/lint/typecheck commands once per
    // ledger row; nothing previously pointed it at the file that declares them.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`tech.md#standard-commands-copy-paste` rather than inventing one");
    expect(skill).toContain("do not continue on stale steering");
  });

  it("closes step 1 on the rule rather than the rationale that motivated it", async () => {
    // `neither inheritance route` was commit-message rationale that survived
    // into the instruction body: the shipped tree defines no such term, so the
    // sentence named no artifact, stated no condition and gave no imperative —
    // sitting one clause after a strict rule ("do not continue on stale
    // steering"), which invites reading it as a constraint of unknown content.
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "Run this stage in full even when invoked from another skill: Stage 0 is not inherited from a parent skill, and this is the stage that creates production source trees.",
    );
    expect(skill).not.toContain("inheritance route");
  });

  it("cites an anchor the SSOT actually has", async () => {
    // A dead anchor would leave the instruction as unactionable as its absence.
    const tech = await read(tree, TECH);
    expect(tech).toContain("## Standard commands (copy-paste)");
  });

  it("cites baseline anchors that exist", async () => {
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("## FORMAT SSOT (Mandatory)");
    expect(baseline).toContain("## Delta Rejected Guard (Mandatory)");
  });
});

/**
 * `/qfai-implement` shipped two rules for one invocation.
 *
 * `## Default Autopilot Policy` lists `primarySpecId` (when absent from
 * inputs) in the `hard-required` bucket — the bucket whose other members
 * (`companyName`, brand intent) cannot be derived from the repository at all,
 * so a hard-required value is one the agent may not supply for itself.
 * `## Spec Auto-Discovery Protocol` > `### User Selection Flow` covered exactly
 * that condition and let the single-spec branch announce and proceed.
 *
 * The governing decision keeps `primarySpecId` hard-required, so the
 * single-spec branch is the side that moves: auto-discovery narrows the
 * candidates, the user still supplies the value. `hard-required` also gets a
 * definition beside the buckets' only other home so the next collision is
 * decidable from the text.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const BASELINE = "assistant/constitution/shared-skill-operating-baseline.md";
const DECISIONS = ".qfai/specs/_policies/08_Decisions.md";
const BUSINESS_RULES = ".qfai/specs/spec-0015/04_Business-Rules.md";

const flat = (s: string): string => s.replace(/\s+/g, " ");

const read = async (tree: string, rel: string): Promise<string> =>
  flat(await readFile(path.join(repoRoot, tree, rel), "utf-8"));

describe.each(QFAI_TREES)("%s", (tree) => {
  it("keeps the hard-required entry at full strength and points at the protocol", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain("`primarySpecId` (when absent from inputs");
    expect(skill).toContain(
      "auto-discovery narrows the candidates, the user still supplies the value; see `## Spec Auto-Discovery Protocol`)",
    );
  });

  it("leaves no carve-out that lets auto-discovery settle the value alone", async () => {
    // The collision was textual: whichever section the agent read last won.
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain("auto-discovery does not resolve exactly one candidate");
    expect(skill).not.toContain("ask for confirmation when scope is ambiguous");
  });

  it("makes the single-spec branch confirm unconditionally, like its two siblings", async () => {
    const skill = await read(tree, SKILL);
    expect(skill).toContain(
      "Single spec: announce the detected spec and require the user to confirm it before the first TDD item",
    );
    expect(skill).toContain("Multiple specs: display the candidates and require the user");
    expect(skill).toContain("Zero specs: stop and ask the user to provide the target spec");
  });

  it("defines hard-required where the buckets' other home already is", async () => {
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("## User Questions (AskUserQuestion Protocol)");
    expect(baseline).toContain(
      "`hard-required` = no default is possible, so the run may not start until the user has supplied the value",
    );
    expect(baseline).toContain(
      "a repository-side derivation may narrow the candidates but never settles the value on the agent's own authority",
    );
  });

  it("defines the two sibling buckets in the same breath", async () => {
    // A definition of one bucket alone would not separate it from `auto-decide`,
    // which is the distinction the collision turned on.
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("`auto-decide` = the skill settles it without asking");
    expect(baseline).toContain("`ask-user` = the skill asks before acting");
  });
});

describe("governing decision", () => {
  it("still classifies primarySpecId as hard-required with no default possible", async () => {
    // The shipped text is downstream of these two; if either is ever relaxed,
    // the skill wording above has to be revisited in the same change.
    const decisions = flat(await readFile(path.join(repoRoot, DECISIONS), "utf-8"));
    const rules = flat(await readFile(path.join(repoRoot, BUSINESS_RULES), "utf-8"));
    for (const doc of [decisions, rules]) {
      expect(doc).toContain(
        "**hard-required** (no default possible; must be supplied before proceeding): `companyName`, brand intent, `primarySpecId` when absent",
      );
    }
  });
});

/**
 * One invocation, one answer about `primarySpecId`.
 *
 * Two sections of `/qfai-implement` state what happens when Spec
 * Auto-Discovery finds exactly one candidate: the `hard-required` bucket of
 * `## Default Autopilot Policy`, and `### User Selection Flow` under
 * `## Spec Auto-Discovery Protocol`. A bare invocation reads both, so they
 * have to agree — otherwise the run's behaviour depends on which section the
 * agent read last.
 *
 * The answer is the governing decision's: `hard-required` means no default is
 * possible and the value is supplied before proceeding. Auto-discovery narrows
 * the candidates; being the only candidate is not the same as the user having
 * named it. So a lone candidate is announced for confirmation, not proceeded
 * on, and both sections say that.
 *
 * These cases pin both statements, and the absence of the readings that let
 * one of them settle the value alone.
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
      "a single candidate is announced for the user to confirm rather than proceeded on)",
    );
  });

  it("gives one answer for a single candidate, in both places that state it", async () => {
    // The bucket and the selection flow are the two statements a bare
    // invocation reads, and they answered the same question differently: one
    // said a lone candidate never settles the value, the other that it does.
    // Whichever answer is taken, a reader must not be able to find the other.
    const skill = await read(tree, SKILL);

    expect(skill).toContain(
      "Single spec: announce the detected spec and require the user to confirm it before the first TDD item",
    );
    expect(skill).toContain("Auto-discovery narrows the candidates; it does not supply the value");
    expect(skill).toContain("one candidate being the only one is not the user having named it");
  });

  it("leaves no carve-out that lets auto-discovery settle the value alone", async () => {
    // The collision was textual: whichever section the agent read last won.
    const skill = await read(tree, SKILL);
    expect(skill).not.toContain("auto-discovery does not resolve exactly one candidate");
    // Coarse on purpose: pinning a whole sentence passes again the moment the
    // carve-out is reworded. "scope is ambiguous" was the condition this file
    // removed — the document defines no criterion for it, so a run could claim
    // either answer and be right.
    expect(skill).not.toContain("scope is ambiguous");
    expect(skill).not.toContain("so it is not a required input");
  });

  it("keeps the two branches auto-discovery cannot settle asking", async () => {
    // Narrowing the hard-required entry to what this flow cannot settle only
    // holds while the flow still stops on the two cases it cannot: several
    // candidates, and none.
    const skill = await read(tree, SKILL);
    expect(skill).toContain("Multiple specs: display the candidates and require the user");
    expect(skill).toContain("Zero specs: stop and ask the user to provide the target spec");
  });

  it("defines hard-required where the buckets' other home already is", async () => {
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("## User Questions (AskUserQuestion Protocol)");
    expect(baseline).toContain(
      "`hard-required` — no default is possible, so the value comes from the user rather than from the agent",
    );
    expect(baseline).toContain(
      "A repository-side derivation may narrow the candidates; it never settles the value on the agent's own authority",
    );
  });

  it("defines the two sibling buckets in the same breath", async () => {
    // A definition of one bucket alone would not separate it from `auto-decide`,
    // which is the distinction the collision turned on.
    const baseline = await read(tree, BASELINE);
    expect(baseline).toContain("`auto-decide` — the skill settles it without asking.");
    expect(baseline).toContain("`ask-user` — the skill asks before acting.");
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

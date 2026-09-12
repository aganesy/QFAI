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
 * possible and the value is supplied before proceeding. Spec Auto-Discovery narrows
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

import { beforeAll, describe, expect, it } from "vitest";

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
  // Read once per tree rather than once per case: every case below asserts on
  // the same two files, and re-reading them is the only I/O this file does.
  let skill = "";
  let baseline = "";

  beforeAll(async () => {
    [skill, baseline] = await Promise.all([read(tree, SKILL), read(tree, BASELINE)]);
  });

  it("keeps the hard-required entry at full strength and points at the protocol", () => {
    expect(skill).toContain("`primarySpecId` (when absent from inputs");
    // The entry has to keep naming the protocol and what it does. Shortened to
    // the condition alone, it reads as an exemption for whatever that protocol
    // resolves — the reading this file exists to close.
    expect(skill).toContain("Spec Auto-Discovery narrows the candidates but does not settle");
    expect(skill).toContain(
      "a single candidate is announced for the user to confirm, rather than proceeded on automatically)",
    );
  });

  it("gives one answer for a single candidate, in both places that state it", () => {
    // The bucket and the selection flow are the two statements a bare
    // invocation reads, and they answered the same question differently: one
    // said a lone candidate never settles the value, the other that it does.
    // Whichever answer is taken, a reader must not be able to find the other.

    expect(skill).toContain(
      "Single spec: announce the detected spec and require the user to confirm it before the first TDD item",
    );
    expect(skill).toContain(
      "Spec Auto-Discovery narrows the candidates; it does not supply the value",
    );
    expect(skill).toContain("a single candidate does not mean the user named it");
  });

  it("leaves no carve-out that lets auto-discovery settle the value alone", () => {
    // The collision was textual: whichever section the agent read last won.
    expect(skill).not.toContain("auto-discovery does not resolve exactly one candidate");
    // Coarse on purpose: pinning a whole sentence passes again the moment the
    // carve-out is reworded. "scope is ambiguous" was the condition this file
    // removed — the document defines no criterion for it, so a run could claim
    // either answer and be right.
    expect(skill).not.toContain("scope is ambiguous");
    expect(skill).not.toContain("so it is not a required input");
  });

  it("keeps the two branches auto-discovery cannot settle asking", () => {
    // Narrowing the hard-required entry to what this flow cannot settle only
    // holds while the flow still stops on the two cases it cannot: several
    // candidates, and none.
    expect(skill).toContain("Multiple specs: display the candidates and require the user");
    expect(skill).toContain("Zero specs: stop and ask the user to provide the target spec");
  });

  it("defines hard-required where the buckets' other home already is", () => {
    expect(baseline).toContain("## User Questions (AskUserQuestion Protocol)");
    expect(baseline).toContain(
      "`hard-required` — no default is possible, so a run may not proceed on a guess",
    );
    // Both halves, because either alone is a rule that breaks a skill. "The
    // user supplies it" stops `/qfai-configure --auto` settling a
    // `testFileGlobs` proposal it can check against real files; "evidence
    // settles it" lets a lone candidate stand in for the choice of which spec
    // to work.
    expect(baseline).toContain(
      "The value is either supplied by the user or read off evidence that settles it",
    );
    expect(baseline).toContain("a glob either matches real files or it does not");
    expect(baseline).toContain(
      "a single candidate does not settle it — which spec to work on is a choice",
    );
  });

  it("defines the two sibling buckets in the same breath", () => {
    // A definition of one bucket alone would not separate it from `auto-decide`,
    // which is the distinction the collision turned on.
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
        "**hard-required** (no default possible; must be supplied before proceeding): brand intent, `primarySpecId` when absent",
      );
      // `companyName` was retired from the bucket: no shipped file read it, so
      // the entry spent a prompt out of a 0-1 budget and read nothing back.
      expect(doc).not.toContain("must be supplied before proceeding): `companyName`");
    }
  });
});

/**
 * What the buckets classify, now that a grilling session exists.
 *
 * The `ask-user` bucket is a closed list of four categories, and the grilling
 * rule puts a design, an approach, a scope boundary or a trade-off to the user —
 * none of them. Read as a classification of every question an invocation can
 * utter, the policy asked for a question it could not classify and could not
 * gain a category for without opening the list the spec closed.
 *
 * So the subject is narrowed rather than the list opened: the buckets classify
 * the operations a skill performs, and a session's question is the session's.
 */
describe("the autopilot buckets classify operations, not interview questions", () => {
  const SCOPE = "the **operations the skill performs**";

  for (const tree of QFAI_TREES) {
    it(`${tree}: the operating baseline scopes the buckets`, async () => {
      const text = flat(
        await readFile(
          path.join(repoRoot, tree, "assistant/constitution/shared-skill-operating-baseline.md"),
          "utf-8",
        ),
      );
      expect(text).toContain("say who settles a decision **the skill performs**");
      expect(text).toContain("A **frontier decision** put inside a grilling session is not one");
      expect(text).toContain("`.agents/rules/grilling.md` owns which of those are asked");
      // A mandatory approval and a hard-required input are classified by their
      // subject wherever they are asked. Carved out with the rest, an --auto run
      // would guess a value it is required to stop for.
      expect(text).toContain("Two things stay classified by their subject wherever they are asked");
      expect(text).toContain("still stops a run that cannot get it, rather than being guessed");
      // The interview skills are the exception the narrowing needs, or their own
      // frontier questions fall outside every bucket.
      expect(text).toContain("Where the interview is what the skill performs, the asking stays in");
      expect(text).toContain("the category DR-0269 Amendment 4 opens for it");
    });
  }

  it("the business rule carries the scope the baseline states", async () => {
    // The rule, not the acceptance criterion: the criterion states what the
    // gate checks — the section is present and populated — and that is
    // unchanged. What the buckets are about is the rule's.
    const text = flat(
      await readFile(path.join(repoRoot, ".qfai/specs/spec-0015/04_Business-Rules.md"), "utf-8"),
    );
    expect(text).toContain(SCOPE);
    expect(text).toContain(
      "A **frontier decision** put inside a grilling session is not one of those",
    );
    expect(text).toContain("owns which of those are asked and in what order");
    // The closed list gains the entry the interview skills already ship, or a
    // conforming review has to reject the policy this scope says to keep.
    expect(text).toContain("a decision a declared grilling session puts to the user");
    expect(text).toContain("available only to a skill whose own operation is the interview");
  });
});

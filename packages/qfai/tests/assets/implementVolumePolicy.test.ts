import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const SKILL = "assistant/skills/qfai-implement/SKILL.md";
const REFERENCE = "assistant/skills/qfai-implement/references/volume-policy.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement scales its ceremony to ledger volume", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the skill keeps a pointer to the full rules`, async () => {
      const skill = await read(tree, SKILL);
      expect(skill).toContain("## Volume Policy (MUST)");
      expect(skill).toContain("references/volume-policy.md");
      expect(skill).toContain("risk tier");
    });
  }

  for (const tree of QFAI_TREES) {
    it(`${tree}: defines risk tiers with a stated default`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).not.toBe("");
      expect(section).toContain("## Risk tier (derive per row)");
      expect(section).toContain("T1 — standard");
      expect(section).toContain("T2 — elevated");
      expect(section).toContain("T3 — surface");
      // An unrecorded tier must not silently become the cheapest one.
      expect(section).toContain("A row with no recorded tier is treated as **T2**");
    });

    it(`${tree}: permits batched review with a bounded unit`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Batched review");
      expect(section).toContain("coherent group");
      expect(section).toContain("a `REVISE` on the group blocks every member");
      expect(section).toContain("a T2 or T3 row is always reviewed alone");
    });

    it(`${tree}: allows a sequential multi-spec queue without enabling parallelism`, async () => {
      const content = await read(tree, SKILL);
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Multi-spec queue");
      expect(section).toContain("This is a queue, not parallelism");
      // Auto-discovery must no longer say "at most one spec".
      expect(content).not.toContain("Auto-discovery selects at most one spec");
      expect(content).toContain("does NOT enable multi-spec parallel execution");
    });

    it(`${tree}: makes the gate-cycle cost visible before processing`, async () => {
      const section = await read(tree, REFERENCE);
      expect(section).toContain("## Cost visibility");
      expect(section).toContain("rows × gate cycles");
    });

    it(`${tree}: T1 rebatches the mandatory gates instead of dropping them`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      // agent-routing.yml keeps qa-gatekeeper mandatory+blocking, so T1 must not
      // claim "no live gatekeeper turn".
      expect(section).not.toContain("no live gatekeeper turn");
      expect(section).toContain("### Routing is unchanged");
      expect(section).toContain("scales **how often** a gate runs, never **whether** it runs");
      expect(section).toContain(
        "`qa-gatekeeper` confirms RED/GREEN once per coherent group instead of once per row",
      );
      // The handoff contract and the 11-point gate carry the same tier rule.
      expect(skill).toContain("the submitted unit in steps 2-4 is the coherent group");
      expect(skill).toContain(
        "items 3, 5, 7 and 8 are satisfied by the confirmation covering the row's coherent group; they are never waived",
      );
    });

    it(`${tree}: group formation has a review-start condition and no new lifecycle edge`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      expect(section).toContain("### Group formation (states and transitions)");
      expect(section).toContain("adds **no** status value and **no** lifecycle edge");
      expect(section).toContain("this is the review-start condition");
      expect(section).toContain("Members still move `refactor -> done`, only together");
      // Parking a row in `refactor` must be reconciled with one-item-at-a-time.
      expect(section).toContain("at most one row is in `red` or `green` at any moment");
      expect(skill).toContain(
        "A T1 row parked in `refactor` waiting for its review group (see Volume Policy) does not violate this",
      );
      expect(skill).toContain("stays in `refactor` until the group closes");
    });

    it(`${tree}: criticality forces T2 regardless of layer`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      expect(section).toContain("### Criticality outranks connectedness");
      expect(section).toContain("**T2 regardless of layer**");
      for (const critical of [
        "an authorization or authentication decision",
        "cryptographic verification",
        "money or accounting arithmetic",
        "data-integrity or safety-critical logic",
      ]) {
        expect(section).toContain(critical);
      }
      expect(section).toContain("When it is arguable whether a row is critical, it is critical");
    });

    it(`${tree}: the multi-spec queue defines how it advances and when it exits`, async () => {
      const section = unwrap(await read(tree, REFERENCE));
      const skill = unwrap(await read(tree, SKILL));
      expect(section).toContain("### Advancing the queue");
      expect(section).toContain("**Empty -> exit.**");
      expect(section).toContain('"Report and exit" in CRITICAL CONSTRAINTS applies per ledger');
      expect(section).toContain("Exit only after the last queued spec");
      // The constraint that used to end the run at the first finished ledger.
      expect(skill).not.toContain('When all items are `done`, report "nothing to do" and exit.');
      expect(skill).toContain(
        'report "nothing to do" for that spec, then advance to the next spec of a confirmed queue',
      );
      expect(skill).toContain("announce the next queued spec and restart at Phase: Red");
    });
  }
});

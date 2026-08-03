/**
 * Drift Protocol severity tiers (#378).
 *
 * The protocol used to recognise exactly one kind of drift and prescribe one
 * response: STOP, write a CR carrying "options (at least 3) and
 * recommendation", wait for approval. An upstream artifact that is objectively
 * broken has exactly one correct fix, so the second and third options exist
 * only because the template demands them — and the cheapest compliant path for
 * a one-token fix costs more than ignoring the protocol.
 *
 * These tests pin the two-class split, and pin that the split did NOT weaken
 * the ownership boundary: both classes still STOP, raise a CR and wait.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const DRIFT = "assistant/constitution/drift-protocol.md";
const TEMPLATE = "assistant/skills/qfai-sdd/templates/change-request.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("drift protocol distinguishes intent drift from defect drift", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: both classes are named and defined`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain("## Drift classes");
      expect(drift).toContain(
        "**Intent drift** — the upstream artifact states something downstream disagrees with",
      );
      expect(drift).toContain(
        "**Defect drift** — the upstream artifact is internally inconsistent, unreachable, or contradicts its own declared behaviour",
      );
    });

    it(`${tree}: defect drift is claimed by a reproduction, not by assertion`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain("demonstrated by a reproduction");
      // Without this, `Class: defect` becomes a self-served exemption from the
      // options requirement.
      expect(drift).toContain(
        "A CR that declares `Class: defect` without a reproduction — a command plus its verbatim output",
      );
      expect(drift).toContain("must be treated as incomplete");
      // Cheapness is the reason the protocol was routed around; it must not
      // become the reason a change is reclassified.
      expect(drift).toContain("Cost is not a classifier");
    });

    it(`${tree}: the three-option requirement is scoped to intent drift`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain(
        "options (at least 3) and recommendation — **intent drift only**; for defect drift record the single correct fix instead",
      );
      expect(drift).toContain(
        "reproduction (command + verbatim output, or the two contradicting excerpts) — **required for defect drift**",
      );
    });

    it(`${tree}: the class does not waive STOP, the CR, or the approval wait`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain(
        "It does **not** decide whether a Change Request is needed: both classes STOP, both raise a CR, both wait for approval, both are applied by the owner skill",
      );
      // The ownership boundary is the whole point of the protocol; a severity
      // axis that softened it would be a regression, not a fix.
      expect(drift).toContain("Downstream skills must not patch upstream SSOT directly.");
      // Step 1 still opens with the STOP. Its *scope* was narrowed to the
      // affected artifact and its dependents (#444), which is why this asserts
      // the opening rather than the whole sentence — what matters here is that
      // a drift class cannot skip the halt.
      expect(drift).toContain("1. STOP downstream editing");
    });

    it(`${tree}: the CR template carries Class and a Reproduction section`, async () => {
      const template = await read(tree, TEMPLATE);

      expect(template).toContain("- Class: `intent`");
      expect(template).toContain("intent | defect");
      expect(template).toContain("constitution/drift-protocol.md#drift-classes");
      expect(template).toContain("## Reproduction");
      expect(flat(template)).toContain("REQUIRED when Class is `defect`");
      expect(flat(template)).toContain(
        "Class `intent` only — delete this section when Class is `defect`",
      );
    });

    it(`${tree}: Approved option stays "-" for a defect CR`, async () => {
      const [drift, template] = await Promise.all([read(tree, DRIFT), read(tree, TEMPLATE)]);

      expect(flat(drift)).toContain(
        "A defect-drift CR has no option set, so `Approved option` stays `-`",
      );
      expect(flat(template)).toContain("stays `-` when Class is defect");
    });

    it(`${tree}: the Context heading no longer presumes an external conflict`, async () => {
      const template = await read(tree, TEMPLATE);

      // A `.sql` contract that raises on its own declared code path conflicts
      // with nothing — it contradicts only itself.
      expect(template).toContain("## Context\n");
      expect(template).not.toContain("## Context (what conflicts)");
      expect(flat(template)).toContain(
        "A defect conflicts with nothing external — say what it contradicts in itself.",
      );
    });
  }
});

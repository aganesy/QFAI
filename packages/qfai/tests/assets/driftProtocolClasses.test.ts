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
const SDD_SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const CONTRACT_RULES = "assistant/skills/qfai-sdd/references/contract-artifact-rules.md";

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

/**
 * A discussion pack is non-normative reference material for `/qfai-sdd` (#1070).
 *
 * The pack used to be classified upstream, which forced an SDD run to repair or
 * re-run a transient discovery artifact before it could write the artifacts that
 * actually govern behaviour — inverting the ownership boundary, since
 * `.qfai/specs/**` is the behaviour and design SSOT and the pack is provenance.
 *
 * These assertions pin the reclassification AND pin that it did not widen into a
 * general licence to edit upstream: a genuine upstream artifact is still repaired
 * upstream-first.
 */
describe("discussion packs are non-normative for /qfai-sdd", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the upstream list no longer sweeps in discussion outputs`, async () => {
      const drift = flat(await read(tree, DRIFT));

      // The old bullet folded three stages into one line, and the pack came
      // along with the two that belong there.
      expect(drift).not.toContain("outputs of discussion/sdd/review stages");
      expect(drift).toContain("outputs of the sdd and review stages");
    });

    it(`${tree}: the drift protocol says a pack is NOT upstream SSOT`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain("A **discussion pack is NOT upstream SSOT**");
      expect(drift).toContain("non-normative discovery material");
      // The ownership statement, so a later edit cannot reclassify the pack
      // as an oversight: the pack feeds the SSOT, it is not the SSOT.
      expect(drift).toContain("`.qfai/specs/**` is the behaviour and design SSOT it feeds");
      // The longer rationale lives in the skill, which has the room for it.
      const skill = flat(await read(tree, SDD_SKILL));
      expect(skill).toContain("optional, non-normative reference material");
    });

    it(`${tree}: the carve-out is classification only, not a licence to edit upstream`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain("This reclassifies ONLY the pack");
      expect(drift).toContain("genuine upstream is still repaired upstream-first");
      // The skill carries the contract-first instance of the same rule, where
      // there is room to state it.
      const rules = flat(await read(tree, CONTRACT_RULES));
      expect(rules).toContain(
        "A contradiction between a pack and a contract is resolved in the contract",
      );
      // And the core rule itself is untouched.
      expect(drift).toContain(
        "Do not edit upstream SSOT artifacts unless explicit user approval exists.",
      );
    });

    it(`${tree}: qfai-sdd Stage 0 does not hard-stop on pack completeness or a blocking OQ`, async () => {
      const skill = flat(await read(tree, SDD_SKILL));

      expect(skill).not.toContain(
        "Stop if the latest discussion-pack is missing, incomplete, or has blocking OQ.",
      );
      expect(skill).toContain(
        "an incomplete pack, a contradictory one, or a blocking discussion OQ does not by itself stop this stage",
      );
      // Stopping is still possible — when there is nothing to work from at all.
      expect(skill).toContain("Stop only when there is no usable source at all");
    });

    it(`${tree}: qfai-sdd forbids editing the pack to make its own gate pass`, async () => {
      const skill = flat(await read(tree, SDD_SKILL));

      expect(skill).toContain(
        "Do NOT edit, repair or re-run a pack to make this stage's gate pass",
      );
      expect(skill).toContain("the correction belongs in the SDD-owned spec, policy or contract");
      // A product decision still goes to the user, and the answer lands in SDD
      // artifacts rather than being written back into the pack.
      expect(skill).toContain("rather than back-propagated into the pack");
    });

    it(`${tree}: the pack is a reference input, and provenance citation survives`, async () => {
      const skill = flat(await read(tree, SDD_SKILL));

      expect(skill).toContain("**reference and provenance input, not normative**");
      // `Source: <pack>#<id>` stays supported — the point is that citing is not
      // the same as being bound by the cited text.
      expect(skill).toContain("Cite it as `Source: <pack>#<id>`");
      expect(skill).toContain("citing it does not make the cited text binding");
    });

    it(`${tree}: the contract artifact rules call discussion files non-normative`, async () => {
      const rules = flat(await read(tree, CONTRACT_RULES));

      expect(rules).not.toContain("Discussion UI/UX files are upstream discovery artifacts.");
      expect(rules).toContain("**non-normative** discovery / reference artifacts");
      expect(rules).toContain("not upstream SSOT");
    });
  }
});

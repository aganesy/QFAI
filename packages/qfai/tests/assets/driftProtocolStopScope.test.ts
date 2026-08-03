/**
 * The Drift Protocol STOP has a blast radius, and CRs compose (#379).
 *
 * The protocol said "STOP downstream editing immediately" with no object,
 * "Resume downstream work" with no scope, and "stay in STOP state" with no
 * bound. Read literally, the first Change Request halts every downstream phase
 * in the repository until a human answers. It also never said whether more than
 * one CR may be open at once — "Create *a* Change Request", singular, was the
 * entire multiplicity model.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const DRIFT = "assistant/constitution/drift-protocol.md";
const WORKFLOW = "assistant/constitution/workflow.md";
const TEMPLATE = "assistant/skills/qfai-sdd/templates/change-request.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("the drift STOP names what it stops", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: step 1 scopes the halt to the dependent set`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain(
        "STOP downstream editing **of the affected upstream artifact and of every downstream item that depends on it**",
      );
      expect(drift).toContain("Unaffected items continue.");
      // Without a definition of "depends", each CR hand-derives its own blocked
      // set from scratch — which is exactly what the observed project did.
      expect(drift).toContain(
        "A dependent item is one whose `TC-Refs` / `US-Refs` / `CON-API-Refs` names an obligation the CR would change",
      );
      expect(drift).toContain("when the dependency is arguable, it is dependent");
      expect(drift).toContain("The halt is not repository-wide");
    });

    it(`${tree}: resume and the STOP state are per-CR, not global`, async () => {
      const drift = flat(await read(tree, DRIFT));

      expect(drift).toContain("Resume the **blocked set of this CR** only after");
      expect(drift).toContain(
        "an item on two blocked sets resumes when both release, and an item on neither never stopped",
      );
      expect(drift).toContain(
        "stay in STOP state **for that CR's blocked set** and report blockers",
      );
      expect(drift).toContain(
        "an unanswered decision is not a reason to stop what it does not touch",
      );
    });

    it(`${tree}: concurrent Change Requests have a composition rule`, async () => {
      const drift = await read(tree, DRIFT);
      const flattened = flat(drift);

      expect(drift).toContain("### Multiple open Change Requests");
      expect(flattened).toContain("More than one Change Request may be open at once.");
      expect(flattened).toContain("They are **independent** unless they name the same upstream");
      // Folding a new defect into an open CR would widen an approval the
      // operator already gave.
      expect(flattened).toContain(
        "A defect found while a CR is open is raised as **its own CR**, not folded into the open one.",
      );
      expect(flattened).toContain(
        "Two CRs naming the same upstream artifact are **ordered**: the second states which one it assumes has landed",
      );
      expect(flattened).toContain(
        "The effective halt is the **union** of the open CRs' blocked sets.",
      );
    });

    it(`${tree}: the blocked set is a required CR field`, async () => {
      const drift = flat(await read(tree, DRIFT));
      const template = await read(tree, TEMPLATE);

      expect(drift).toContain(
        "blocked downstream items — the enumerated set the halt in step 1 covers",
      );
      expect(drift).toContain("an item not on the list is not blocked by this CR");

      expect(template).toContain("## Blocked downstream items");
      expect(flat(template)).toContain(
        "an item not listed here is not blocked by this CR and continues",
      );
      expect(template).toContain("- Not blocked by this CR:");
      expect(template).toContain("- Overlapping open CRs:");
    });

    it(`${tree}: workflow.md does not restate the halt unscoped`, async () => {
      const workflow = flat(await read(tree, WORKFLOW));

      // The unscoped restatement was the third of the three STOP lines in the
      // constitution; leaving it would make the scoping ambiguous by omission.
      expect(workflow).toContain(
        "The STOP is scoped: it halts the affected upstream artifact and every downstream item that depends on it",
      );
      expect(workflow).toContain("Unaffected items continue");
      expect(workflow).toContain("drift-protocol.md#multiple-open-change-requests");
    });

    it(`${tree}: scoping the halt did not soften the ownership rule`, async () => {
      const drift = await read(tree, DRIFT);

      expect(drift).toContain("Downstream skills must not patch upstream SSOT directly.");
      expect(drift).toContain(
        "- Do not edit upstream SSOT artifacts unless explicit user approval exists.",
      );
      // A dependent item may still not be completed against a disputed
      // obligation — the scope narrows what stops, not what is permitted.
      expect(flat(drift)).toContain(
        "a dependent item may not be completed against an obligation known to be under revision",
      );
    });
  }
});

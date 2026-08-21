/**
 * The `UI-affecting` gate trigger has to be defined once (#701).
 *
 * Item 9 of `qfai-implement`'s completion gate blocks `done` on "UI-affecting
 * items have prototype parity PASS", but the shipped tree never defined the
 * term. Where the skill stated the qualifying condition instead of reusing the
 * bare word, it stated it four different ways ("touches UI or critique-driven
 * behavior", "changes surface behavior", "affects UI behavior or rendered
 * output", "before closing any UI-affecting item"), and `agent-routing.yml`
 * listed `product-surface-reviewer` under `conditional_agents` with no
 * condition anywhere in the file. The actor deciding whether item 9 applies is
 * the actor the gate exists to check, and skipping it left no artifact behind.
 *
 * These tests pin the single mechanical definition, its use at every site, and
 * the `n/a` record that makes a skipped item 9 auditable.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const IMPLEMENT = "assistant/skills/qfai-implement";
const SKILL = `${IMPLEMENT}/SKILL.md`;
const DEFINITION = `${IMPLEMENT}/references/ui-affecting.md`;
const POLICY = `${IMPLEMENT}/references/parallelization-policy.md`;
const ROUTING = "assistant/manifest/agent-routing.yml";

/** How every site names the definition. One string, checked everywhere. */
const REFERENCE = "references/ui-affecting.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Prose lines using the term — headings and table rows excluded. */
const usageLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .filter((line) => line.includes("UI-affecting"))
    .filter((line) => !line.startsWith("#"));

describe("UI-affecting is defined once and referenced everywhere", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the definition is a shipped reference file`, async () => {
      // It cannot live inline in SKILL.md: that file sits one line under the
      // asset line ceiling, and the ceiling's design rule is that detail goes
      // to references/ (tests/helpers/skillBudget.ts).
      const definition = await read(tree, DEFINITION);

      expect(definition).toContain("# UI-affecting items (definition)");
      expect(definition).toContain("the **only** definition");
    });

    it(`${tree}: the definition is mechanical, not a judgement call`, async () => {
      const definition = await read(tree, DEFINITION);

      // Every clause is keyed to a ledger column or a declared path, and the
      // `Owning module` clause is guarded because that column is optional.
      expect(definition).toContain("`Layer` is `Component`");
      expect(definition).toContain("`Owning module`");
      expect(definition).toContain("`Test file`");
      expect(definition).toContain("catalog/structure.md");
      expect(definition).toContain(".qfai/contracts/ui/*.yaml");
      expect(definition).toContain("only when the ledger declares one");

      // No clause is waivable, which is the property the four rival phrasings
      // did not have.
      expect(definition).toContain("waivable");
      expect(definition).toContain("Nothing outside those four clauses");
    });

    it(`${tree}: a row that skips item 9 still leaves an artifact`, async () => {
      const definition = await read(tree, DEFINITION);
      const skill = await read(tree, SKILL);

      // Without this, "not UI-affecting" is indistinguishable afterwards from
      // "had a UI surface and declined to say so".
      expect(definition).toContain("`n/a (not UI-affecting)`");

      // And the skill's evidence contract has to accept that value.
      const evidenceLine = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("- `Prototype parity`"));
      expect(evidenceLine).toBeDefined();
      expect(evidenceLine).toContain("n/a (not UI-affecting)");
      expect(evidenceLine).toContain(REFERENCE);
      expect(evidenceLine).toContain("Never blank");
    });

    it(`${tree}: gate item 9 names the definition it depends on`, async () => {
      const skill = await read(tree, SKILL);
      const item9 = skill
        .split(/\r?\n/)
        .find((line) => line.startsWith("9. UI-affecting items have prototype parity PASS"));

      expect(item9).toBeDefined();
      expect(item9).toContain(REFERENCE);
      expect(item9).toContain("not the implementer's judgement call");
    });

    it(`${tree}: every use of the term in the skill points at the definition`, async () => {
      const skill = await read(tree, SKILL);
      const uses = usageLines(skill);

      expect(uses.length).toBeGreaterThan(3);
      expect(uses.filter((line) => !line.includes(REFERENCE))).toEqual([]);
    });

    it(`${tree}: the four rival phrasings are gone`, async () => {
      const skill = await read(tree, SKILL);

      expect(skill).not.toContain("critique-driven");
      expect(skill).not.toContain("when the item changes surface behavior");
      expect(skill).not.toContain("affects UI behavior or rendered output");
      expect(skill).not.toContain("touches UI or");
    });

    it(`${tree}: "critique-driven behavior" is retired tree-wide`, async () => {
      // It occurred exactly once in the whole assistant tree, in a read-order
      // bullet, while carrying gate-trigger weight.
      for (const rel of [SKILL, POLICY, DEFINITION]) {
        expect(await read(tree, rel)).not.toContain("critique-driven");
      }
    });

    it(`${tree}: the parallelization policy reads the same predicate`, async () => {
      const policy = await read(tree, POLICY);
      const uses = usageLines(policy);

      expect(uses.length).toBeGreaterThan(0);
      expect(uses.filter((line) => !line.includes("ui-affecting.md"))).toEqual([]);
    });

    it(`${tree}: agent-routing.yml names the condition it routes on`, async () => {
      const routing = await read(tree, ROUTING);
      const implement = routing.slice(
        routing.indexOf("- skill: qfai-implement"),
        routing.indexOf("- skill: qfai-atdd"),
      );

      // `conditional_agents: [product-surface-reviewer]` said "conditional" and
      // stopped — no `condition` key existed anywhere in the file. The
      // predicate lives in the skill; the manifest must say where.
      expect(implement).toContain("conditional_agents: [product-surface-reviewer]");
      expect(implement).toContain(`skills/qfai-implement/${REFERENCE}`);
    });
  }
});

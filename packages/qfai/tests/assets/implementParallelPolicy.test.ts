import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const REFERENCE = "assistant/skills/qfai-implement/references/parallelization-policy.md";

/** The full rules live in a reference file; the skill keeps the summary. */
const policy = (tree: string): Promise<string> => read(tree, REFERENCE);

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which prettier happened to break the line.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

describe("qfai-implement states one parallelization policy", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: separates cross-spec (barred) from item-level (governed)`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("Parallel execution across multiple **specs** simultaneously");
      expect(skill).toContain("Cross-spec parallelism is barred");
      expect(skill).toContain("it is not approvable");
      expect(skill).toContain("Item-level parallelism inside one spec");
      expect(skill).toContain("references/parallelization-policy.md");
    });

    it(`${tree}: states precedence between the technical and consent gates`, async () => {
      const skill = await read(tree, "assistant/skills/qfai-implement/SKILL.md");
      expect(skill).toContain("**both must hold**");
      expect(skill).toContain("User approval cannot");
      expect(skill).toContain("override a technical DENY.");
      expect(skill).toContain("sole authority");
    });

    it(`${tree}: conditions are write conflicts, not existence of shared things`, async () => {
      const section = await policy(tree);
      expect(section).toContain("concurrent write conflicts");
      expect(section).toContain("per-worker schema isolation");
      // A DI container's mere existence must no longer be a blanket deny.
      expect(section).not.toContain(
        "No shared state (no shared database, global variable, singleton, or DI container)",
      );
      expect(section).not.toContain(
        "Shared fixture, shared mock, shared DI container, shared global setup",
      );
    });

    it(`${tree}: defines coordinated parallel ledger ownership`, async () => {
      const section = await policy(tree);
      expect(section).toContain("## Coordinated parallel mode (ledger ownership)");
      expect(section).toContain("owns every `test-list.md` write");
      expect(section).toContain("Item 10 of the 11-point gate is satisfied by the orchestrator");
    });

    it(`${tree}: agent-routing.yml documents what parallel_groups means`, async () => {
      const routing = await read(tree, "assistant/manifest/agent-routing.yml");
      expect(routing).toContain("describes ROLE FAN-OUT within a phase, not item");
    });

    it(`${tree}: worktree separation is adjudicated outside the all-must-be-true list`, async () => {
      const section = await policy(tree);
      expect(section).toContain("## Isolation requirement (worktree separation)");
      expect(section).toContain('Adjudicated separately from the "all must be true" list');
      // Three evaluable outcomes, so `delivery-planner` is never left guessing.
      expect(section).toContain("nothing to record");
      expect(section).toContain("**declared degraded mode**");
      expect(section).toContain("no declared degraded mode recorded -> **DENY**");
      // The allow-condition list must no longer carry the unevaluable bullet.
      expect(section).not.toContain("**Recommendation, not a hard allow-condition**");
      expect(section).not.toContain("`constitution/workflow.md` Concurrency rules");
    });

    it(`${tree}: a write/read overlap between items is a conflict`, async () => {
      const section = unwrap(await policy(tree));
      expect(section).toContain(
        "No item **writes** a module that another concurrently dispatched item's test or implementation **reads**",
      );
      expect(section).toContain("become timing-dependent");
      expect(section).toContain("resolves the importers reachable from the other items");
    });

    it(`${tree}: worker evidence blocks carry the whole per-item contract`, async () => {
      const section = unwrap(await policy(tree));
      for (const field of [
        "`TDD-ID`",
        "`TC-ref`",
        "RED command and result",
        "GREEN command and result",
        "Refactor verify command and result",
        "`Spec review`",
        "`Code quality review`",
        "`Prototype parity`",
        "`DR-ID`",
      ]) {
        expect(section).toContain(field);
      }
      expect(section).toContain("A block missing any contract field does not satisfy item 10");
    });
  }
});

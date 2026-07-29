import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Returns the `## Parallelization Policy` body. */
function policy(content: string): string {
  // Anchor on the heading LINE — the phrase also appears as a cross-reference
  // inside CRITICAL CONSTRAINTS.
  const start = content.indexOf("\n## Parallelization Policy\n");
  if (start === -1) {
    return "";
  }
  const rest = content.slice(start + 1);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

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
      expect(skill).toContain("User approval cannot
  override a technical DENY.");
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

    it(`${tree}: worktree separation is a recommendation, not an unmeetable allow-condition`, async () => {
      const section = await policy(tree);
      expect(section).toContain("Recommendation, not a hard\n  allow-condition");
    });
  }
});

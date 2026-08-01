/**
 * The two agents that own the TDD gate did not know they owned it.
 *
 * `qfai-implement` delegates its entire per-item gate to `delivery-planner`
 * ("enforces Red-Green-Refactor ordering") and `qa-gatekeeper` ("sole authority
 * for validating RED/GREEN observation evidence"). Neither shipped role card
 * carried accept/reject criteria for a RED or a GREEN, and neither listed
 * `tdd/test-list.md` or `.qfai/evidence/implement-<spec-id>.md` among "Inputs
 * you must read" — while both are told to stop when "target artifacts are
 * missing", a condition not checkable against an artifact the role was never
 * told to open.
 *
 * A routed reviewer reads its own agent file as its brief, so the gate degraded
 * to whatever the calling work order happened to say.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const flat = (s: string): string => s.replace(/\s+/g, " ");

async function roleCard(tree: string, agent: string): Promise<string> {
  return flat(
    await readFile(path.join(repoRoot, tree, "assistant", "agents", `${agent}.md`), "utf-8"),
  );
}

async function catalogEntry(
  tree: string,
  agent: string,
): Promise<{ instructions: string; tags: string[] }> {
  const raw = await readFile(
    path.join(repoRoot, tree, "assistant", "manifest", "agent-catalog.yml"),
    "utf-8",
  );
  const parsed = parseYaml(raw) as {
    agents?: Array<{
      id?: string;
      developer_instructions?: string;
      specialization_tags?: string[];
    }>;
  };
  const entry = parsed.agents?.find((a) => a.id === agent);
  expect(entry, `${tree}: no catalog entry for ${agent}`).toBeDefined();
  return {
    instructions: flat(entry?.developer_instructions ?? ""),
    tags: entry?.specialization_tags ?? [],
  };
}

describe.each(TREES)("%s", (tree) => {
  describe("qa-gatekeeper carries the gate it is the sole authority over", () => {
    it("states accept criteria for a RED", async () => {
      const card = await roleCard(tree, "qa-gatekeeper");
      expect(card).toContain("## RED/GREEN Observation Gate (MUST)");
      expect(card).toContain("the test module loaded");
      expect(card).toContain("inside the row's own `Selector`");
      expect(card).toContain("each entry's failure was observed separately");
    });

    it("states accept criteria for a GREEN", async () => {
      // Distinct from RED: a full-suite pass is the easy substitute.
      const card = await roleCard(tree, "qa-gatekeeper");
      expect(card).toContain(
        "A full-suite pass that does not name the row's selector is not a GREEN for that row",
      );
    });

    it("names what may never substitute for a captured failing run", async () => {
      // The observed real-project failure was an aggregate narrative in the
      // implementing agent's own commit message.
      const card = await roleCard(tree, "qa-gatekeeper");
      expect(card).toContain("**Never accept as a substitute**");
      expect(card).toContain("commit message written by the implementing agent");
      expect(card).toContain("a load error standing in for an assertion failure");
      expect(card).toContain("evidence copied from a previous round or a sibling row");
    });

    it("keeps the one legitimate absence routed, not open-ended", async () => {
      const card = await roleCard(tree, "qa-gatekeeper");
      expect(card).toContain("_RED not observable_ path");
      expect(card).toContain("never both forms, never neither");
    });

    it("must read the artifacts it adjudicates", async () => {
      const card = await roleCard(tree, "qa-gatekeeper");
      expect(card).toContain("`.qfai/specs/spec-*/tdd/test-list.md`");
      expect(card).toContain("`.qfai/evidence/implement-<spec-id>.md`");
    });

    it("mirrors both into the catalog copy, which is what routing hands the agent", async () => {
      const { instructions, tags } = await catalogEntry(tree, "qa-gatekeeper");
      expect(instructions).toContain("## RED/GREEN Observation Gate (MUST)");
      expect(instructions).toContain("`.qfai/specs/spec-*/tdd/test-list.md`");
      expect(instructions).toContain("`.qfai/evidence/implement-<spec-id>.md`");
      expect(tags).toContain("tdd");
    });
  });

  describe("delivery-planner can open the ledger it sequences", () => {
    it("lists test-list.md among its inputs", async () => {
      const card = await roleCard(tree, "delivery-planner");
      expect(card).toContain("`.qfai/specs/spec-*/tdd/test-list.md`");
      expect(card).toContain("Red-Green-Refactor ordering it enforces");
    });

    it("mirrors it into the catalog copy", async () => {
      const { instructions } = await catalogEntry(tree, "delivery-planner");
      expect(instructions).toContain("`.qfai/specs/spec-*/tdd/test-list.md`");
    });
  });
});

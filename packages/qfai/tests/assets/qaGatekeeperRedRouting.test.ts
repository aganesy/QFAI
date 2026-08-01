/**
 * `qa-gatekeeper` had no phase in which a RED state still existed.
 *
 * `qfai-implement`'s handoff contract puts the RED confirmation *between* RED
 * and GREEN, per ledger row, and completion-gate items 3 and 5 require the
 * gatekeeper to "watch it fail" and "watch it pass". The routing manifest the
 * skill delegates through gave the whole skill four once-per-invocation phases
 * and listed `qa-gatekeeper` only in the terminal `review` phase, with
 * `blocking_agents: []` on `build`.
 *
 * By the time the gatekeeper was routed, production code existed and RED had
 * been destroyed, so the gate could only adjudicate the implementer's own
 * written account — the self-attestation it exists to prevent. In a real
 * project this produced four bulk evidence backfills reconstructing per-item
 * RED/GREEN after the fact, and a completion review that ruled the gate
 * retroactively unsatisfiable for all 36 items.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const ROUTING_FILES = [
  "packages/qfai/assets/init/.qfai/assistant/manifest/agent-routing.yml",
  ".qfai/assistant/manifest/agent-routing.yml",
];

const SKILL_FILES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-implement/SKILL.md",
  ".qfai/assistant/skills/qfai-implement/SKILL.md",
];

type Phase = {
  id?: string;
  iteration?: string;
  mandatory_agents?: string[];
  blocking_agents?: string[];
};

async function implementPhases(rel: string): Promise<Phase[]> {
  const raw = await readFile(path.join(repoRoot, rel), "utf-8");
  const parsed = parseYaml(raw) as { routing?: Array<{ skill?: string; phases?: Phase[] }> };
  const route = parsed.routing?.find((r) => r.skill === "qfai-implement");
  expect(route, `${rel} has no qfai-implement route`).toBeDefined();
  return route?.phases ?? [];
}

describe.each(ROUTING_FILES)("%s — qfai-implement routing", (rel) => {
  it("routes qa-gatekeeper into a phase where no production code exists yet", async () => {
    const phases = await implementPhases(rel);
    const red = phases.find((p) => p.id === "red");
    expect(red, "no `red` phase: the RED observation has nowhere to happen").toBeDefined();
    expect(red?.mandatory_agents ?? []).toContain("qa-gatekeeper");
    // Mandatory-but-not-blocking is the state `build` was already in, and it is
    // what let the row proceed to Green with RED unconfirmed.
    expect(red?.blocking_agents ?? []).toContain("qa-gatekeeper");
  });

  it("orders `red` before `build`, or the RED phase observes nothing", async () => {
    const ids = (await implementPhases(rel)).map((p) => p.id);
    // Both asserted present before comparing. A missing `build` makes
    // `indexOf` return -1, so the comparison would fail with "0 is not less
    // than -1" instead of naming the phase that disappeared.
    const red = ids.indexOf("red");
    const build = ids.indexOf("build");
    expect(red, "no `red` phase").toBeGreaterThanOrEqual(0);
    expect(build, "no `build` phase").toBeGreaterThanOrEqual(0);
    expect(red).toBeLessThan(build);
  });

  it("makes qa-gatekeeper blocking in `build` for the GREEN observation", async () => {
    const build = (await implementPhases(rel)).find((p) => p.id === "build");
    expect(build?.mandatory_agents ?? []).toContain("qa-gatekeeper");
    expect(build?.blocking_agents ?? []).toContain("qa-gatekeeper");
  });

  it("declares the micro-cycle phases as per-ledger-item, not per-invocation", async () => {
    const phases = await implementPhases(rel);
    for (const id of ["red", "build", "test", "review"]) {
      const phase = phases.find((p) => p.id === id);
      expect(phase?.iteration, `phase ${id}`).toBe("per-ledger-item");
    }
    // `plan` genuinely runs once: `delivery-planner` selects from the whole
    // ledger. Marking it per-item would be a different, equally wrong claim.
    expect(phases.find((p) => p.id === "plan")?.iteration).toBe("per-invocation");
  });
});

describe.each(SKILL_FILES)("%s — the skill says where the gate runs", (rel) => {
  it("tells Phase: Red to obtain confirmation before production code exists", async () => {
    const skill = await readFile(path.join(repoRoot, rel), "utf-8");
    const flat = skill.replace(/\s+/g, " ");
    expect(flat).toContain(
      "Submit that run to `qa-gatekeeper` and obtain confirmation **before** any production code exists",
    );
  });

  it("states the routing phases run per row", async () => {
    const skill = await readFile(path.join(repoRoot, rel), "utf-8");
    expect(skill.replace(/\s+/g, " ")).toContain("iteration: per-ledger-item");
  });

  it("splits the handoff contract into a RED and a GREEN submission", async () => {
    const skill = await readFile(path.join(repoRoot, rel), "utf-8");
    const flat = skill.replace(/\s+/g, " ");
    expect(flat).toContain(
      "submits the RED run to `qa-gatekeeper` **while no production code exists**",
    );
    // The old text asked for one combined "RED/GREEN execution evidence"
    // submission, which is only satisfiable after the fact.
    expect(flat).not.toContain("Implementation agent submits RED/GREEN execution evidence");
  });
});

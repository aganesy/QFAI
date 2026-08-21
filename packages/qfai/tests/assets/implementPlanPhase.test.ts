/**
 * The routed `plan` phase appeared nowhere in `qfai-implement`'s skill body.
 *
 * `agent-routing.yml` opens the skill's phase list with `plan`: mandatory for
 * `delivery-planner` and `test-design-analyst`, blocking on the first, and the
 * only phase carrying `iteration: per-invocation`. `SKILL.md` named four
 * phases in its Roster, gave Required Process four headings, and mentioned
 * `test-design-analyst` exactly once — in the frontmatter `roles:` list.
 *
 * Both readings were bad. Following the skill body skipped a blocking phase on
 * every invocation; following the manifest dispatched a mandatory agent into a
 * phase with no task definition, no inputs, no output contract and no exit
 * criterion, so the run could not proceed without a verdict from a role that
 * had never been told what it was judging.
 *
 * The guard is the general one: a routed agent that is mandatory or blocking
 * for this skill must be documented in the skill body, not only declared in
 * the frontmatter.
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

/** The agents whose absence from a phase stops the run: mandatory or blocking. */
async function requiredAgents(): Promise<string[]> {
  const phases = await implementPhases(ROUTING_FILES[0] ?? "");
  const names = new Set<string>();
  for (const phase of phases) {
    for (const agent of [...(phase.mandatory_agents ?? []), ...(phase.blocking_agents ?? [])]) {
      names.add(agent);
    }
  }
  return [...names];
}

/**
 * Everything after the YAML frontmatter. A `roles:` declaration is not a task
 * definition, so the frontmatter must not count as documenting an agent.
 */
function skillBody(raw: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(raw);
  return match === null ? raw : raw.slice(match[0].length);
}

describe.each(ROUTING_FILES)("%s — qfai-implement `plan` phase", (rel) => {
  it("routes `plan` first, once per invocation", async () => {
    const phases = await implementPhases(rel);
    expect(phases[0]?.id, "`plan` must open the phase list").toBe("plan");
    // Per-invocation is the claim the skill body now makes about it; a
    // per-ledger-item `plan` would frame nothing and re-plan every row.
    expect(phases[0]?.iteration).toBe("per-invocation");
  });

  it("keeps both planning roles mandatory and `delivery-planner` blocking", async () => {
    const plan = (await implementPhases(rel)).find((p) => p.id === "plan");
    expect(plan?.mandatory_agents ?? []).toContain("delivery-planner");
    expect(plan?.mandatory_agents ?? []).toContain("test-design-analyst");
    expect(plan?.blocking_agents ?? []).toContain("delivery-planner");
    // Not blocking: every finding it can raise is repaired upstream, so a
    // block here would stop rows that are themselves well-formed.
    expect(plan?.blocking_agents ?? []).not.toContain("test-design-analyst");
  });
});

describe.each(SKILL_FILES)("%s — the skill body owns the `plan` phase", (rel) => {
  it("gives Required Process a step bound to routing phase `plan`", async () => {
    const body = skillBody(await readFile(path.join(repoRoot, rel), "utf-8"));
    // The skill states its routing bindings literally ("routing phase `red`",
    // "routing phase `build`"); `plan` gets the same line, and the phase is
    // named in the heading of the stage it runs in so it is findable.
    expect(/^### Phase:.*\bPlan\b.*$/m.test(body), "no Required Process heading names Plan").toBe(
      true,
    );
    const step = /^\d+\. .*routing phase `plan`.*$/m.exec(body);
    expect(step, "no Required Process step routes the `plan` phase").not.toBeNull();
    // The step names both routed roles and points at the topic file that
    // carries their inputs, outputs and exit criterion.
    expect(step?.[0]).toContain("delivery-planner");
    expect(step?.[0]).toContain("test-design-analyst");
    expect(step?.[0]).toContain("references/plan-phase.md");
  });

  it("ships the topic file the step points at", async () => {
    const reference = rel.replace(/SKILL\.md$/, "references/plan-phase.md");
    const detail = await readFile(path.join(repoRoot, reference), "utf-8");
    // The two facts the manifest declares and the skill body would otherwise
    // leave undefined: who blocks, and how often the phase runs.
    expect(detail).toContain("per-invocation");
    expect(detail).toContain("delivery-planner");
    expect(detail).toContain("test-design-analyst");
  });

  it("documents every mandatory or blocking routed agent outside the frontmatter", async () => {
    const body = skillBody(await readFile(path.join(repoRoot, rel), "utf-8"));
    const missing = (await requiredAgents()).filter((agent) => !body.includes(agent));
    expect(missing, "routed with no task definition in the skill body").toEqual([]);
  });

  it("counts `plan` among the routed phases in the Formal Sub-agent Roster", async () => {
    const body = skillBody(await readFile(path.join(repoRoot, rel), "utf-8"));
    const roster = body.slice(body.indexOf("### Formal Sub-agent Roster"));
    expect(roster, "no Formal Sub-agent Roster section").not.toBe("");
    // The paragraph that enumerates the phases: it used to name four and draw
    // the per-row / per-invocation distinction that `plan` is the sole
    // instance of on the wrong side of the line.
    const intro = roster.slice(0, roster.indexOf("\n- "));
    expect(intro).toContain("`plan`");
    expect(intro).toContain("per-invocation");
    expect(intro).toContain("per-ledger-item");
  });

  it("gives `test-design-analyst` a Roster bullet, not just a `roles:` entry", async () => {
    const body = skillBody(await readFile(path.join(repoRoot, rel), "utf-8"));
    const roster = body.slice(body.indexOf("### Formal Sub-agent Roster"));
    expect(roster).toContain("- `test-design-analyst`");
  });
});

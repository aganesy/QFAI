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

import { parse as parseToml } from "smol-toml";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Collapse markdown soft wraps so an assertion pins wording, not a column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

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

  it("scopes the analyst's missing-row check to the row-producing class", async () => {
    // `/qfai-sdd` Phase 2b seeds a row per coverage-target `TC-*` only, so a
    // first-run ledger holds zero `E2E` / `API` rows legitimately. Comparing
    // `US-*` / `CON-API-*` against rows would turn that normal state into a
    // dropped-obligation finding and a handoff neither upstream skill can
    // satisfy — they are discharged by the acceptance tests' annotations.
    const reference = rel.replace(/SKILL\.md$/, "references/plan-phase.md");
    const detail = await readFile(path.join(repoRoot, reference), "utf-8");
    expect(detail).toContain("coverage-target `TC-*`");
    expect(detail).toContain("not row-producing obligations");
    expect(detail).toContain("QFAI-ATDD-111");
  });

  it("routes around a preserved `failed-agents-only` manifest", async () => {
    // `init --force` keeps `assistant/manifest/**`, so an installed project can
    // take this file without the routing change it documents. The phase has to
    // read the project's own policy and name the merge that repairs it.
    const reference = rel.replace(/SKILL\.md$/, "references/plan-phase.md");
    const detail = await readFile(path.join(repoRoot, reference), "utf-8");
    expect(detail).toContain("failed-agents-only");
    expect(detail).toContain("stale-manifest.md");
  });

  it("states the cross-spec bar as one spec at a time, not per invocation", async () => {
    // The `plan` phase is per-queue; "one spec per invocation" read literally
    // contradicted that. The bar is about concurrency, so both carriers of it
    // say "at a time" and the queue is explicitly not a breach.
    const parallel = rel.replace(/SKILL\.md$/, "references/parallelization-policy.md");
    for (const target of [rel, parallel]) {
      const text = await readFile(path.join(repoRoot, target), "utf-8");
      expect(text, `${target} keeps the non-goal`).toContain("Cross-spec parallelism is barred");
      expect(text, `${target} still says "per invocation"`).not.toContain(
        "One spec per invocation",
      );
      expect(text).toContain("One spec **at a time**");
      expect(text).toContain("multi-spec-queue");
    }
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

  it("re-validates the plan's frame at every queue transition", async () => {
    // The `plan` phase frames a whole queue in one pass, before the first row
    // of the first spec moves. The specs ahead of a queued one then write
    // production code and can open Change Requests, so reusing that plan
    // unconditionally starts a later spec against a `CR-*` nothing reset and
    // lets its parallel-dispatch decision stand over an import graph the
    // earlier specs already changed.
    const volume = rel.replace(/SKILL\.md$/, "references/volume-policy.md");
    const queue = unwrap(await readFile(path.join(repoRoot, volume), "utf-8"));
    expect(queue).toContain("re-validate the frame before loading its ledger");
    expect(queue).toContain("change-request-reset.md#the-mandatory-preflight");
    expect(queue).toContain("evidence-revision.md#the-field");
    expect(queue).toContain("re-enter Stage 0 step 2 and `plan`");
    // Over-correction pin: the phase stays per-invocation. An unmoved frame
    // re-enters nothing — this is a guard, not a per-spec re-plan.
    expect(queue).toContain("re-enters neither Stage 0 nor `plan`");
    expect(queue).toContain("`iteration: per-invocation`");
  });

  it("points the other carriers of the non-re-entry claim at that check", async () => {
    // Three files state "a queue transition does not re-enter `plan`". A guard
    // written into only one of them leaves the other two licensing the
    // unconditional reuse it exists to stop.
    for (const target of [rel, rel.replace(/SKILL\.md$/, "references/plan-phase.md")]) {
      const text = unwrap(await readFile(path.join(repoRoot, target), "utf-8"));
      expect(text, `${target} does not name the frame check`).toContain(
        "volume-policy.md#advancing-the-queue",
      );
    }
  });
});

/**
 * `test-design-analyst` is a shared role card: `qfai-sdd`'s `design` phase
 * routes it as mandatory and `qfai-atdd`'s `coverage` phase as mandatory AND
 * blocking. Listing `.qfai/contracts/api/**` among its unconditional "Inputs
 * you must read" therefore reaches far past the `qfai-implement` `plan` phase
 * that needs it: a fresh install ships no `.qfai/contracts/api/` at all and a
 * spec with no API surface is normal, so the card's own Stop condition
 * ("required source artifacts are missing") could halt a blocking agent on a
 * perfectly good non-API project.
 */
describe("`.qfai/contracts/api/**` is a conditional input on the shared role card", () => {
  const AGENT_CARD = "assistant/agents/test-design-analyst.md";
  const CATALOG = "assistant/manifest/agent-catalog.yml";

  /** Every shipped copy of the card body: canonical MD, catalog, codex TOML. */
  async function roleCardBodies(): Promise<Array<[string, string]>> {
    const bodies: Array<[string, string]> = [];
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      bodies.push([
        `${tree}/${AGENT_CARD}`,
        await readFile(path.join(repoRoot, tree, AGENT_CARD), "utf-8"),
      ]);
      const raw = await readFile(path.join(repoRoot, tree, CATALOG), "utf-8");
      const catalog = parseYaml(raw) as {
        agents?: Array<{ id?: string; developer_instructions?: string }>;
      };
      const entry = catalog.agents?.find((agent) => agent.id === "test-design-analyst");
      const instructions = entry?.developer_instructions;
      expect(instructions, `${tree}/${CATALOG} carries no test-design-analyst body`).toBeTypeOf(
        "string",
      );
      bodies.push([`${tree}/${CATALOG}`, instructions ?? ""]);
    }
    const codexPath = ".codex/agents/test-design-analyst.toml";
    const codex = parseToml(await readFile(path.join(repoRoot, codexPath), "utf-8")) as {
      developer_instructions?: string;
    };
    expect(codex.developer_instructions, `${codexPath} carries no body`).toBeTypeOf("string");
    bodies.push([codexPath, codex.developer_instructions ?? ""]);
    return bodies;
  }

  it("marks the input conditional in every SSOT copy", async () => {
    for (const [label, body] of await roleCardBodies()) {
      const text = unwrap(body);
      expect(text, `${label}: the Inputs entry is unconditional`).toContain(
        "(CON-API) — **conditional**",
      );
      expect(text, `${label}: does not scope the read`).toContain(
        "joins that obligation set **only where it applies**",
      );
    }
  });

  it("denies the Stop condition an absent contracts directory would trip", async () => {
    for (const [label, body] of await roleCardBodies()) {
      const text = unwrap(body);
      expect(text, `${label}: absence still reads as a missing input`).toContain(
        "its absence is **not** a missing required source artifact",
      );
      expect(text, `${label}: names no phase the exemption covers`).toContain(
        "`qfai-atdd`'s blocking `coverage` phase",
      );
      expect(text, `${label}: Stop conditions still say every listed input`).toContain(
        "**Required means required for the phase being run**",
      );
    }
  });

  it("keeps the row-independent obligation read the analyst was given it for", async () => {
    // Over-correction pin. Scoping the API contracts must not undo the earlier
    // finding: `TC-*` / `US-*` are still read in full, independently of the
    // ledger rows, and the `plan` phase still reads `CON-API-*` where it has
    // any — the fix narrows one input's *requiredness*, not the check.
    for (const [label, body] of await roleCardBodies()) {
      const text = unwrap(body);
      expect(text, `${label}: derives the obligation set from the rows`).toContain(
        "independently of whichever rows an execution ledger happens to hold",
      );
      expect(text, `${label}: no longer reads CON-API in the plan phase`).toContain(
        "in `qfai-implement`'s `plan` phase",
      );
    }
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const detail = unwrap(
        await readFile(
          path.join(repoRoot, tree, "assistant/skills/qfai-implement/references/plan-phase.md"),
          "utf-8",
        ),
      );
      expect(detail, `${tree}: the plan phase stopped naming the contracts`).toContain(
        "`.qfai/contracts/api/**` for `CON-API-*`",
      );
      expect(detail, `${tree}: an absent contracts dir still reads as missing`).toContain(
        "**empty, not missing**",
      );
    }
  });
});

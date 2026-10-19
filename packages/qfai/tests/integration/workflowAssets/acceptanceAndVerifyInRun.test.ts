/**
 * Integration: which steps `/qfai-verify` runs when a route plans it.
 *
 * Reads the shipped operating baseline that states the skill's behaviour inside a route.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseAgentFrontmatter } from "../../../src/core/agentFrontmatter.js";
import { defaultConfig } from "../../../src/core/config.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  SHIPPED_ASSISTANT,
  flat,
  readShipped,
  rowOf,
  sectionOf,
  shippedExists,
} from "../../helpers/shippedAssistant.js";

const OPERATING = "rule/shared-skill-operating-baseline.md";
const VERIFY_SKILL = "skill/qfai-verify/SKILL.md";
const VERIFY_CONTEXT = "step/verify-context/STEP.md";
const AGENT_SELECTION = "rule/agent-selection.md";

/** Every file `/qfai-verify` reads as text: its skill directory and its steps. */
async function verifyAssets(): Promise<string[]> {
  const skillDir = path.join(SHIPPED_ASSISTANT, "skill", "qfai-verify");
  const skillFiles = (await readdir(skillDir, { recursive: true })).filter((name) =>
    /\.(md|ya?ml)$/i.test(name),
  );
  const steps = (await readdir(path.join(SHIPPED_ASSISTANT, "step"))).filter((name) =>
    name.startsWith("verify-"),
  );
  return [
    ...skillFiles.map((name) => path.join(skillDir, name)),
    ...steps.map((name) => path.join(SHIPPED_ASSISTANT, "step", name, "STEP.md")),
  ];
}

async function section(file: string, heading: string): Promise<string> {
  const text = flat(sectionOf(await readShipped(file), heading));
  expect(text, `${file} has ${heading}`).not.toBe("");
  return text;
}

describe("qfai-verify in a workflow run", () => {
  // QFAI:AC-0001-0208-06
  // QFAI:EX-0001-0208-07
  it("runs only the work order's gates and hands over a request with no work order", async () => {
    const entry = sectionOf(await readShipped(OPERATING), "## Workflow Run Entry Check");
    expect(rowOf(entry, "| `pass-on`")).toMatch(/Edit nothing\. Pass the request to `qfai-run`/);
    expect(rowOf(entry, "| `step`")).toMatch(/Do only that step.s work/);
    const steps = await section(OPERATING, "### A plan's steps");
    expect(steps).toMatch(
      /runs the steps of the plan `npx qfai workflow plan` returned, stage by stage, and no other/i,
    );
  });
});

describe("qfai-verify loads its inputs from the shipped assistant tree", () => {
  // QFAI:AC-0001-0158-03
  // QFAI:EX-0001-0158-03
  it("reads the rows of decisions.md, cites the ones it relied on and treats a REJECTED row as a rejected option", async () => {
    const reads = await section(VERIFY_CONTEXT, "## Reads");
    expect(reads).toContain(
      '`.qfai/spec/decisions.md`. When no decision applies, say "not applicable".',
    );
    const completion = await section(VERIFY_SKILL, "## Completion");
    expect(completion).toContain('the decision IDs referenced, or "none" when no decision applies');
    expect(completion).toContain("confirmation that no rejected option was reintroduced");
    expect(flat(await readShipped(VERIFY_SKILL))).toContain(
      "Every step follows `.qfai/assistant/rule/shared-skill-operating-baseline.md`",
    );
    const guard = await section(OPERATING, "## Rejected Option Guard");
    expect(guard).toContain(
      "Do not reintroduce an option whose row in `<paths.specsDir>/decisions.md` has Status `REJECTED`.",
    );
    expect(guard).toContain("append a new `DEC-NNNN` row");
    for (const file of await verifyAssets()) {
      expect(await readFile(file, "utf-8"), file).not.toMatch(/0[78]_Decisions/);
    }
  });

  // QFAI:AC-0001-0159-03
  // QFAI:EX-0001-0159-03
  it("loads the constitution from the rule directory and cites no constitution directory", async () => {
    const files = await verifyAssets();
    for (const file of files) {
      expect(await readFile(file, "utf-8"), file).not.toContain(".qfai/assistant/constitution/");
    }
    const contextLoad = path.join(
      SHIPPED_ASSISTANT,
      "skill",
      "qfai-verify",
      "references",
      "context-load.md",
    );
    expect(await readFile(contextLoad, "utf-8")).toContain(".qfai/assistant/rule/constitution.md");
    expect(shippedExists("rule/constitution.md")).toBe(true);
    expect(shippedExists("constitution")).toBe(false);
  });

  // QFAI:AC-0001-0159-03
  // QFAI:EX-0001-0159-04
  it("takes routing and review profiles from the package defaults with the overrides applied, and an agent's entry from its card", async () => {
    expect(await section(VERIFY_CONTEXT, "## Delegation")).toContain(
      "Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.",
    );
    const selection = flat(await readShipped(AGENT_SELECTION));
    expect(selection).toContain(
      "A `qfai.config.yaml` `routing:` or `reviewProfiles:` entry replaces the matching default entry as a whole; a new key adds an entry.",
    );
    expect(selection).toContain("Do not keep another copy of its definition in a routing file.");

    const defaults = await readEffectiveRouting(defaultConfig);
    const overridden = await readEffectiveRouting({
      routing: [
        {
          step: "verify-context",
          phases: [{ id: "plan", mandatory_agents: ["qa-strategist"] }],
        },
      ],
    });
    expect(stepReview(defaults, "verify-context").requiredAgents).toEqual([
      "delivery-planner",
      "qa-strategist",
    ]);
    expect(stepReview(overridden, "verify-context").requiredAgents).toEqual(["qa-strategist"]);
    const names = [...(defaults.routing?.keys() ?? [])];
    expect(names.length).toBeGreaterThan(1);
    for (const name of names.filter((entry) => entry !== "verify-context")) {
      expect(stepReview(overridden, name), name).toEqual(stepReview(defaults, name));
    }
    expect([...(overridden.profiles?.keys() ?? [])]).toEqual([
      ...(defaults.profiles?.keys() ?? []),
    ]);

    const card = parseAgentFrontmatter(
      await readFile(path.join(SHIPPED_ASSISTANT, "agent", "qa-strategist.md"), "utf-8"),
    );
    if (!card.ok) throw new Error(card.error);
    expect(["worker", "reviewer"]).toContain(card.frontmatter.kind);
    expect(card.frontmatter.owned_artifacts.length).toBeGreaterThan(0);
    expect(card.frontmatter.tool_profile).not.toBe("");
    expect(card.frontmatter.permission_profile).not.toBe("");
    expect(card.frontmatter.specialization_tags.length).toBeGreaterThan(0);
    const assistantFiles = await readdir(SHIPPED_ASSISTANT, { recursive: true });
    expect(assistantFiles.filter((name) => path.basename(name) === "agent-catalog.yml")).toEqual(
      [],
    );
  });
});

describe("acceptance scaffold evidence in the human report", () => {
  const repoGate = "step/verify-repo-gate/STEP.md";
  const reportHeading = "### Acceptance evidence and follow-up";
  const outputContract = "skill/qfai-verify/references/verify-output-contract.md";

  // QFAI:AC-0001-0233-01
  // QFAI:EX-0001-0233-01
  it("requires five separate evidence fields when acceptance bodies are in scope", async () => {
    const report = sectionOf(await readShipped(repoGate), reportHeading);
    expect(report).not.toBe("");
    const condition =
      report
        .split(/\r?\n\s*\r?\n/u)
        .map(flat)
        .find((part) => part.startsWith("When ")) ?? "";
    for (const term of [
      "implementation",
      "verification",
      "handoff",
      "scope",
      "acceptance scaffolds",
      "unfinished BF/AC acceptance bodies",
      "human report",
    ]) {
      expect(condition).toContain(term);
    }

    const annotation = rowOf(report, "| Annotation proof");
    expect(annotation).toContain("BF/AC annotation IDs");
    expect(annotation).toContain("test files");
    expect(annotation).toMatch(/inspection or validation result/u);

    const bodies = rowOf(report, "| Acceptance bodies");
    expect(bodies).toMatch(/Empty, implemented and unclassified body counts/iu);
    expect(bodies).toContain("counting unit");
    expect(bodies).toContain("file references");
    expect(bodies).toMatch(/BF test bodies and AC test bodies separate/u);
    expect(bodies).toMatch(/test bodies are not unique obligations/u);

    const assertions = rowOf(report, "| Asserted behavior and runs");
    expect(assertions).toMatch(/actual assertion.*BF or AC/u);
    expect(assertions).toMatch(/actual run results.*evidence references/u);
    expect(assertions).toMatch(/annotation alone does not establish.*assertion.*execution/u);
    expect(rowOf(report, "| Observed outcomes")).toMatch(/logs or evidence references/u);

    const remaining = rowOf(report, "| Remaining work");
    for (const term of [
      "unfinished BF/AC bodies",
      "files",
      "owner",
      "completion criteria",
      "next route",
      "write-acceptance-tests",
    ]) {
      expect(remaining).toContain(term);
    }
    const implementation = await section("skill/qfai-implement/SKILL.md", "## Steps");
    expect(implementation).toContain("verify-repo-gate/STEP.md#acceptance-evidence-and-follow-up");
  });

  // QFAI:AC-0001-0233-01
  // QFAI:EX-0001-0233-03
  it("keeps unknown counts and owners explicit and execution outcomes distinct", async () => {
    const report = sectionOf(await readShipped(repoGate), reportHeading);
    expect(report).not.toBe("");
    const bodies = rowOf(report, "| Acceptance bodies");
    expect(bodies).toMatch(/UNKNOWN, not zero.*inspection did not establish/u);
    const remaining = rowOf(report, "| Remaining work");
    expect(remaining).toMatch(/actual owner or UNASSIGNED/u);
    expect(remaining).toMatch(/BF\/AC bodies and files.*completion criteria.*next route/u);
    const unknowns =
      report
        .split(/\r?\n\s*\r?\n/u)
        .map(flat)
        .find((part) => part.includes("If inspection")) ?? "";
    expect(unknowns).toMatch(/inspection has not established the count.*UNKNOWN/u);
    expect(unknowns).toMatch(/no owner has been assigned.*UNASSIGNED/u);
    expect(unknowns).toMatch(/do not invent an assignment or a successful run/u);

    const outcomes = rowOf(report, "| Observed outcomes");
    for (const outcome of ["PASS", "FAIL", "skipped", "UNRUN", "pending"]) {
      expect(outcomes).toContain(outcome);
    }
    expect(outcomes).toMatch(/logs or evidence references/u);
    expect(outcomes).toMatch(/Only an actual run supplies an execution result/u);
    const exemptions =
      report
        .split(/\r?\n\s*\r?\n/u)
        .map(flat)
        .find((part) => part.includes("Legitimate empty bodies")) ?? "";
    expect(exemptions).toMatch(/actual required-check FAIL remains FAIL/u);
  });

  // QFAI:AC-0001-0233-02
  // QFAI:EX-0001-0233-02
  it("does not infer completed acceptance bodies from passing totals or unrelated proof", async () => {
    const report = await section(repoGate, reportHeading);
    expect(report).toMatch(/Do not derive completed ACs by subtracting empty bodies.*pass total/u);
    expect(report).toMatch(/another EX does not complete an empty AC body/u);
    expect(report).toMatch(/Zero validation errors do not prove BF\/AC behavior/u);
    expect(report).toMatch(/Guidance fixtures prove.*guidance.*not an adopter.s actual behavior/u);
    expect(report).toMatch(/Legitimate empty bodies keep their existing exemption/u);
    expect(report).toMatch(/actual required-check FAIL remains FAIL/u);
    expect(report).toMatch(/acceptance-writing completion gate is unchanged/u);
    expect(
      rowOf(sectionOf(await readShipped(repoGate), reportHeading), "| Observed outcomes"),
    ).toMatch(/passing empty body establishes no behavioral proof/u);

    const acceptanceGate = await section("step/implement-acceptance/STEP.md", "## Gate");
    expect(acceptanceGate).toMatch(/every test in scope has a body that asserts its BF or AC/u);
    expect(acceptanceGate).toMatch(/keeps its annotation and file, passes/u);
    expect(acceptanceGate).toContain("validate --profile atdd --flow BF-NNNN --fail-on error");
  });

  // QFAI:AC-0001-0233-02
  // QFAI:EX-0001-0233-04
  it("keeps the optional summary short and preserves the closed verdict contract", async () => {
    const report = await section(repoGate, reportHeading);
    expect(report).toMatch(/lint-only scope without these bodies needs no acceptance report/u);
    expect(report).toMatch(/optional `verify\.json` summary.*one or two short sentences/u);
    expect(report).toMatch(/remaining work.*owner or UNASSIGNED.*detailed report reference/u);
    expect(report).toMatch(
      /table in the human report, without new JSON fields, statuses, scopes, gates or routes/u,
    );

    const contract = await readShipped(outputContract);
    const summary =
      contract
        .split(/\r?\n\s*\r?\n/u)
        .map(flat)
        .find((part) => part.startsWith("When the scope includes acceptance scaffolds")) ?? "";
    expect(summary).toMatch(/unfinished BF\/AC acceptance bodies/u);
    expect(summary).toMatch(/optional `summary`.*one or two short sentences/u);
    expect(summary).toMatch(/remaining work.*owner or UNASSIGNED.*human-report reference/u);
    expect(summary).toMatch(/five-field detail.*`verify-repo-gate`.*`## Report`/u);
    expect(summary).toMatch(/not a new JSON field or table inside `summary`/u);
    const fields =
      contract.split(/\r?\n\s*\r?\n/u).find((part) => part.startsWith("| Field")) ?? "";
    expect([...fields.matchAll(/^\|\s*`([^`]+)`\s*\|/gmu)].map((match) => match[1])).toEqual([
      "status",
      "scope",
      "flowId",
      "recordedAt",
      "summary",
      "gates",
    ]);
    expect(rowOf(fields, "| `summary`")).toMatch(/string\s*\|\s*no/u);
    const closedStatus =
      contract
        .split(/\r?\n\s*\r?\n/u)
        .map(flat)
        .find((part) => part.startsWith("`status` is a closed")) ?? "";
    expect(closedStatus).toContain('two-value enum: `"PASS"` / `"FAIL"`');
    const scopes =
      contract.split(/\r?\n\s*\r?\n/u).find((part) => part.startsWith("| `scope`")) ?? "";
    expect([...scopes.matchAll(/^\|\s*`([^`]+)`\s*\|/gmu)].map((match) => match[1])).toEqual([
      "scope",
      "prototyping",
      "atdd",
      "full",
    ]);
  });
});

describe("the run report recipe in the human report", () => {
  const repoGate = "step/verify-repo-gate/STEP.md";
  const recipeHeading = "### Run report";

  // QFAI:AC-0001-0208-08
  // QFAI:EX-0001-0208-09
  it("lists what a run report records and keeps it apart from semantic coverage", async () => {
    const recipe = sectionOf(await readShipped(repoGate), recipeHeading);
    expect(recipe).not.toBe("");
    expect(rowOf(recipe, "| Revision and run")).toMatch(/commit.*run ID.*attempt.*deployed/u);
    expect(rowOf(recipe, "| Counts per layer")).toMatch(
      /each layer.*runner.*command.*collected, passed, failed and skipped.*report/u,
    );
    expect(rowOf(recipe, "| Skips")).toMatch(/skipped case.*reason.*intended/u);
    expect(rowOf(recipe, "| Fresh or cached")).toMatch(
      /restored from a cache.*not reported as a fresh execution/u,
    );
    expect(rowOf(recipe, "| Retries")).toMatch(/retried case counts once.*final outcome/u);
    expect(rowOf(recipe, "| Support cases")).toMatch(/Setup, teardown.*apart from/u);
    const unknown = rowOf(recipe, "| UNKNOWN and UNRUN");
    expect(unknown).toMatch(/UNKNOWN/u);
    expect(unknown).toMatch(/report is missing.*collected no cases.*UNRUN/u);
    expect(unknown).toMatch(/physical device/u);
    expect(unknown).toMatch(/Neither is a pass/u);

    const coverage = flat(recipe);
    expect(coverage).toMatch(
      /annotation, an assertion and a passing case do not prove every clause of a requirement/u,
    );
    expect(coverage).toMatch(/semantic coverage.*apart from the run report/u);
    expect(coverage).toMatch(/no JSON field, gate status, parser or runner/u);
  });
});

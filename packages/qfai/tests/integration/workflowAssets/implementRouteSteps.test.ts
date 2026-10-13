/**
 * Integration: the `qfai-implement` steps the routes add, the diagnosis verdicts, and the surface
 * alignment `implement-tdd` takes on.
 *
 * Reads the shipped `STEP.md` files, the skill that lists them and the routing defaults. What the
 * workflow core accepts from a result is not this module's.
 */
import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../src/core/config.js";
import { readEffectiveRouting, stepReview } from "../../../src/core/validators/agentDefinition.js";
import {
  flat,
  frontMatterOf,
  readShipped,
  rowOf,
  sectionOf,
  shippedExists,
  skillSteps,
} from "../../helpers/shippedAssistant.js";

/** Each step the routes add to `qfai-implement`, with the review profile it carries: none of its own. */
const ROUTE_STEPS: Record<string, string> = {
  "implement-bisect": "default",
  "implement-revert": "default",
  "implement-minimize": "default",
  "implement-stress-harness": "default",
  "implement-oracle-parity": "default",
  "implement-benchmark": "default",
  "implement-refactor": "default",
  "implement-retire": "default",
  "implement-sweep": "default",
  "implement-quarantine": "default",
  "implement-dep-bump": "default",
  "implement-tooling": "default",
  "implement-backport": "default",
};

const VERDICTS = [
  "missing-test",
  "defective-test",
  "regression",
  "expectation-differs",
  "as-specified",
  "not-ours",
  "duplicate",
  "needs-info",
  "surface-conflict",
  "check-gap",
  "product-race",
];

async function stepText(name: string): Promise<string> {
  const text = await readShipped(`step/${name}/STEP.md`);
  expect(text, `${name} is shipped`).not.toBe("");
  return text;
}

describe("the steps the routes add to qfai-implement", () => {
  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("lists each one, owned by qfai-implement, with its review profile routed", async () => {
    const owned = await skillSteps("qfai-implement");
    const skill = await readShipped("skill/qfai-implement/SKILL.md");
    const effective = await readEffectiveRouting(defaultConfig);
    for (const [name, profile] of Object.entries(ROUTE_STEPS)) {
      expect(owned, name).toContain(name);
      expect(rowOf(skill, `| \`${name}\``), name).toContain(`.qfai/assistant/step/${name}/STEP.md`);
      const front = frontMatterOf(await stepText(name));
      expect([front.name, front.owner, front["routing-profile"]], name).toEqual([
        name,
        "qfai-implement",
        profile,
      ]);
      expect(stepReview(effective, name).profile, name).toBe(profile);
    }
  });

  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  it("changes no tracked file in the steps that only observe", async () => {
    for (const name of ["implement-bisect", "implement-minimize", "implement-benchmark"]) {
      const written = flat(sectionOf(await stepText(name), "## What it writes"));
      expect(written, name).toMatch(/the step changes no file git tracks/i);
      expect(written, name).toMatch(/the stage report holds/i);
    }
    for (const name of ["implement-stress-harness", "implement-oracle-parity"]) {
      expect(flat(await stepText(name)), name).toMatch(/the step changes no production code/i);
    }
  });

  // QFAI:AC-0001-0200-02
  // QFAI:EX-0001-0200-02
  // QFAI:AC-0001-0224-09
  // QFAI:AC-0001-0224-10
  // QFAI:EX-0001-0224-14
  it("states each step's own obligation", async () => {
    const bisect = flat(await stepText("implement-bisect"));
    expect(bisect).toMatch(/report `branch: \{ outcome: "revert" \}` when all three hold/i);
    expect(bisect).toMatch(/run `git bisect reset`/i);

    const refactor = flat(await stepText("implement-refactor"));
    expect(refactor).toMatch(/adds no example and runs no RED/i);
    expect(refactor).toMatch(/what a test asserts does not change/i);
    expect(refactor).toMatch(/outcome: "behaviour-change", route: "change-compatibility"/);

    const retire = flat(await stepText("implement-retire"));
    expect(retire).toMatch(/add no test asserting that the mechanism is gone/i);

    const sweep = flat(await stepText("implement-sweep"));
    expect(sweep).toMatch(/record it in the check's baseline with the reason/i);
    expect(sweep).toMatch(/under `gate:user`, put the list of findings/i);

    const quarantine = flat(await stepText("implement-quarantine"));
    expect(quarantine).toMatch(/a recorded number of consecutive passing runs/i);
    expect(quarantine).toMatch(
      /When all of at least five recorded runs fail, nothing is quarantined/i,
    );
    expect(quarantine).toMatch(/report the outcome `failing-consistently` with an extraction/i);

    const bump = flat(await stepText("implement-dep-bump"));
    expect(bump).toMatch(/such as the `engines` field/i);
    expect(bump).toMatch(/never edit a lockfile by hand/i);
    expect(bump).toMatch(/when the dependency is `qfai` itself/i);
    expect(bump).toMatch(/`init --force`, the retired files the release notes list/i);

    const toolingStep = await stepText("implement-tooling");
    const tooling = flat(toolingStep);
    expect(tooling).toMatch(/where the project ships CI to others, record one disposition/i);
    expect(tooling).toMatch(/record it as unverified until the next release/i);
    const externalParagraphs = sectionOf(toolingStep, "### External actions")
      .split(/\r?\n\s*\r?\n/u)
      .map(flat);
    const authority =
      externalParagraphs.find((paragraph) => /specific target.*action/i.test(paragraph)) ?? "";
    expect(authority).toMatch(/login.*permission grants.*authority expansion.*person-only/i);
    expect(authority).toMatch(/human-run.*triage handoff.*never executes.*user/i);
    expect(authority).toMatch(
      /settings.*credential installation.*require prior authority.*specific target.*action.*host.*actual.*allowed safe channel/i,
    );
    expect(authority).toMatch(/connector availability alone.*not proof/i);
    expect(authority).toMatch(/credential.*account.*project.*scope.*expiry.*ownership/i);
    expect(authority).toMatch(/one-time permission.*no continuing access/i);
    expect(authority).toMatch(/third-party credentials.*separate authority/i);
    expect(authority).toMatch(/no secrets.*chat.*logs.*tracked files/i);

    const result = externalParagraphs.find((paragraph) => /host denial/i.test(paragraph)) ?? "";
    expect(result).toMatch(
      /absent or unknown authority.*safe handling.*host denial.*stops.*dependent action/i,
    );
    expect(result).toMatch(
      /manual steps.*evidence.*read-only check.*confirm.*never bypass.*denial/i,
    );
    expect(result).toMatch(/repository changes.*external effects separately/i);
    expect(result).toMatch(
      /host access.*CI start.*authorization.*credential installation.*CI.*merge.*publication/i,
    );
    expect(result).toMatch(/each.*effect.*confirmed.*pending.*unverified.*not requested/i);
    expect(result).toMatch(
      /target.*exact.*(?:revision|head).*evidence URL.*blocker.*resume condition/i,
    );
    expect(result).toMatch(/green CI.*not proof.*merge.*publication/i);
    expect(flat(sectionOf(toolingStep, "## What it writes"))).toMatch(
      /each command run.*result.*stage report/i,
    );
    expect(flat(sectionOf(toolingStep, "## Gate"))).toMatch(
      /every part that can run here ran and passed.*cannot run.*check.*waits/i,
    );

    const backport = flat(await stepText("implement-backport"));
    expect(backport).toMatch(
      /`git cherry-pick -n -x`. It changes the working tree and commits nothing/,
    );
    expect(backport).toMatch(/do not push, merge, tag or publish/i);

    const benchmark = flat(await stepText("implement-benchmark"));
    expect(benchmark).toMatch(/a difference inside the measured spread is no difference/i);
  });
});

describe("implement-diagnose", () => {
  // QFAI:AC-0001-0215-01
  // QFAI:EX-0001-0215-01
  it("gives exactly one verdict from the eleven", async () => {
    const text = await stepText("implement-diagnose");
    for (const verdict of VERDICTS) {
      expect(rowOf(sectionOf(text, "## Procedure"), `| \`${verdict}\``), verdict).not.toBe("");
    }
    const listed = VERDICTS.map((verdict) => `\`${verdict}\``).join(", ");
    expect(flat(text)).toContain(
      `exactly one verdict in \`diagnosis.verdict\`, one of: ${listed};`,
    );
  });

  // QFAI:AC-0001-0215-01
  it("changes no tracked file in read-only mode", async () => {
    const text = await stepText("implement-diagnose");
    const readOnly = flat(sectionOf(text, "## Read-only mode"));
    expect(readOnly).toMatch(/reproduces only by reading and by commands that change nothing/i);
    expect(readOnly).toMatch(/not the operation the request asks a person to run/i);
    expect(flat(sectionOf(text, "## What it writes"))).toMatch(
      /elsewhere, and in read-only mode, the step changes no file git tracks/i,
    );
  });
});

describe("implement-tdd", () => {
  it("aligns the surfaces that do not own the truth and regenerates what is generated", async () => {
    const text = await stepText("implement-tdd");
    const align = flat(sectionOf(text, "## Align the other surfaces"));
    expect(align).toMatch(/assistant text the project ships to others/i);
    expect(align).toMatch(/move each test that pins the old wording or value to the new one/i);
    expect(align).toMatch(/run the project's generation or synchronisation command/i);
    expect(align).toMatch(/change nothing on the surface that owns the truth/i);
  });
});

async function procedureText(): Promise<string> {
  expect(shippedExists("step/implement-procedure/STEP.md")).toBe(true);
  return readShipped("step/implement-procedure/STEP.md");
}

describe("the route-only procedure writer", () => {
  // QFAI:AC-0001-0224-13
  // QFAI:EX-0001-0224-49
  it("has a real doc-steward owner while named business-flow implementation skips it", async () => {
    expect(await skillSteps("qfai-implement")).toContain("implement-procedure");
    const text = await procedureText();
    const front = frontMatterOf(text);
    expect([front.name, front.owner, front["routing-profile"], front.roles]).toEqual([
      "implement-procedure",
      "qfai-implement",
      "default",
      ["doc-steward"],
    ]);
    const effective = await readEffectiveRouting(defaultConfig);
    expect(effective.routing?.has("implement-procedure")).toBe(true);
    expect(effective.routing?.get("implement-procedure")?.agents.get("doc-steward")).toBe(
      "required",
    );
    const skill = await readShipped("skill/qfai-implement/SKILL.md");
    const routeOnly = flat(sectionOf(skill, "## Route-only procedure authoring"));
    expect(routeOnly).toMatch(/(?:only|when).*plan.*names.*implement-procedure/iu);
    expect(routeOnly).toMatch(
      /invocation.*business[ -]flow.*skip|business[ -]flow.*invocation.*skip/iu,
    );
    expect(routeOnly).toMatch(/existing.*flow.*steps|flow.*steps.*above/iu);
    expect(routeOnly).toContain(".qfai/assistant/step/implement-procedure/STEP.md");
  });

  // QFAI:AC-0001-0224-13
  // QFAI:EX-0001-0224-47
  it("authors only the authorized procedure scope without fabricating implementation deliverables", async () => {
    const text = await procedureText();
    const reads = flat(sectionOf(text, "## Reads"));
    expect(reads).toMatch(/work order/iu);
    expect(reads).toMatch(/(?:authorized|write).*scope/iu);
    const procedure = flat(sectionOf(text, "## Procedure"));
    for (const term of [
      "inputs",
      "actions",
      "commands",
      "required values",
      "order",
      "failure",
      "recovery",
    ]) {
      expect(procedure).toContain(term);
    }
    expect(procedure).toMatch(/existing.*policy/iu);
    expect(procedure).toMatch(/(?:only|nothing outside).*authorized.*(?:documents|scope)/iu);
    const scope = flat(sectionOf(text, "## What this is for"));
    expect(scope).toMatch(/(?:do not|never|no).*?(?:fabricat|invent).*business[ -]flow/iu);
    expect(scope).toMatch(/code.*tests.*(?:specification|spec).*contract/iu);
    const checks = flat(sectionOf(text, "## Gate"));
    expect(checks).toMatch(/lint.*link/iu);
    expect(checks).toContain("common-gate-run");
  });

  // QFAI:AC-0001-0224-13
  // QFAI:EX-0001-0224-48
  // QFAI:EX-0001-0224-45
  it("stops protected edits before writing and preserves maintenance's semantic refusal", async () => {
    const text = await procedureText();
    const boundary = flat(sectionOf(text, "## Before writing"));
    for (const term of ["policy", "story", "contract", "assistant"])
      expect(boundary).toContain(term);
    expect(boundary).toMatch(/stop.*before.*(?:edit|writ)/iu);
    expect(boundary).toMatch(/(?:owning|owner).*stage/iu);
    expect(boundary).toMatch(
      /Markdown.*(?:does not|never).*owner|(?:does not|never).*owner.*Markdown/iu,
    );
    const maintenance = flat(
      sectionOf(await readShipped("step/maintain-edit/STEP.md"), "## The edit"),
    );
    expect(maintenance).toMatch(/semantic effect.*stop before.*editing/iu);
    expect(maintenance).toMatch(/do not make the edit/iu);
  });

  // QFAI:AC-0001-0224-13
  // QFAI:EX-0001-0224-52
  it("separates authored instructions from execution and reports missing facts or checks honestly", async () => {
    const text = await procedureText();
    const boundary = flat(sectionOf(text, "## Before writing"));
    expect(boundary).toMatch(/(?:missing.*(?:required|facts)|(?:required|facts).*missing).*stop/iu);
    expect(boundary).toMatch(/(?:invent|guess).*values|values.*(?:invent|guess)/iu);
    const actions = flat(sectionOf(text, "## Action authority"));
    expect(actions).toMatch(/(?:authoring|writing).*does not.*(?:authorize|authority)/iu);
    for (const term of ["publication", "deletion", "login", "permission"])
      expect(actions).toContain(term);
    expect(actions).toMatch(
      /(?:perform|execute).*no|no.*(?:perform|execute)|do not.*(?:perform|execute)/iu,
    );
    const report = flat(sectionOf(text, "## Stage report"));
    expect(report).toMatch(/changed.*paths/iu);
    expect(report).toMatch(
      /(?:not executed|unobserved).*procedure|procedure.*(?:not executed|unobserved)/iu,
    );
    expect(report).toContain("UNRUN");
    expect(report).toMatch(/(?:unavailable|missing).*checks|checks.*(?:unavailable|missing)/iu);
  });
});

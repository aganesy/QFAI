/**
 * Integration: the two entry skills a workflow run adds, `qfai-run` and `qfai-maintain`, and their
 * routing entries in the package defaults.
 *
 * Reads the shipped skill files and `assets/defaults/`, and runs the role and routing validators over
 * them. What the workflow core does with a proposal is not this module's.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { defaultConfig } from "../../../src/core/config.js";
import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  assistantLineCeiling,
} from "../../../src/core/doctor/assetLineBudget.js";
import { validateAgentDefinition } from "../../../src/core/validators/agentDefinition.js";
import { WORKFLOW_ROUTES } from "../../../src/core/workflow/routes.js";
import {
  PACKAGE_DEFAULTS,
  SHIPPED_ASSISTANT,
  defaultRoutingEntries,
  flat,
  frontMatterOf,
  readDefault,
  readShipped,
  rowOf,
  sectionOf,
} from "../../helpers/shippedAssistant.js";

const RUN = "skill/qfai-run/SKILL.md";
const PLAN = "skill/qfai-run/references/plan.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const EXTRACTION = "skill/qfai-run/references/extraction.md";
const STAGE_POINTS = "skill/qfai-run/references/stage-points.md";
const MAINTAIN = "skill/qfai-maintain/SKILL.md";
const MAINTAIN_EDIT = "step/maintain-edit/STEP.md";

const PROFILES = ["architecture-heavy", "default", "runtime-heavy"];

const AGENT_FIELDS = ["mandatory_agents", "conditional_agents"] as const;

type Phase = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function phaseAgents(phase: Phase): string[] {
  const grouped = Array.isArray(phase.parallel_groups)
    ? phase.parallel_groups.flatMap(strings)
    : [];
  return [...AGENT_FIELDS.flatMap((field) => strings(phase[field])), ...grouped];
}

async function routingEntry(
  name: string,
  key: "skill" | "step" = "skill",
): Promise<Record<string, unknown> | undefined> {
  const routing = await defaultRoutingEntries();
  return routing.filter(isRecord).find((entry) => entry[key] === name);
}

async function profiles(): Promise<Record<string, unknown>> {
  const file: unknown = parse(await readDefault("review-profiles.yml"));
  return isRecord(file) && isRecord(file.profiles) ? file.profiles : {};
}

function phasesOf(entry: Record<string, unknown> | undefined): Phase[] {
  return entry && Array.isArray(entry.phases) ? entry.phases.filter(isRecord) : [];
}

// The closed vocabulary of each extraction field, as the workflow contract states it.
const EXTRACTION_VOCABULARIES: Record<string, string[]> = {
  intent: [
    "question-how",
    "question-why",
    "question-help",
    "question-hosted",
    "no-work",
    "defect",
    "defect-regression",
    "defect-silent",
    "defect-crash",
    "defect-conformance",
    "performance",
    "security",
    "surface-contradiction",
    "model-gap",
    "unenforced",
    "stale-record",
    "feature",
    "design",
    "epic",
    "behaviour-change",
    "deprecation",
    "refactor",
    "docs",
    "flaky-test",
    "test-defect",
    "ci",
    "dependency",
    "release",
    "order",
    "follow-up",
  ],
  entryFlags: [
    "repro",
    "cause",
    "fix",
    "expect",
    "decision",
    "upstream",
    "bundle",
    "vague",
    "last-good",
    "env",
    "intermittent",
    "trace",
    "bot",
    "measured",
    "stale",
  ],
  qualifiers: [
    "docs-answerable",
    "known-duplicate",
    "mixed-bundle",
    "human-run",
    "distribution-incident",
    "settled-design",
    "red-since-change",
    "check-misses",
    "mechanism-inert",
    "removal-requested",
    "visual-open",
    "prototype-requested",
  ],
  signals: [
    "approved-record-task",
    "grilling-required",
    "decide-by-change-request",
    "disabled-test",
    "flaky-label",
    "backport",
    "release-notes",
    "test-plan",
    "acceptance-bodies",
  ],
  risks: ["security", "data-loss", "silent", "breaking", "upgrade", "performance"],
  artifacts: [
    "code",
    "tests",
    "spec",
    "contract",
    "ui",
    "docs",
    "config",
    "ci",
    "deps",
    "data",
    "release",
    "assistant",
  ],
  confidence: ["high", "medium", "low"],
};

// The section of the extraction reference that defines each field's values.
const EXTRACTION_SECTIONS: Record<string, string> = {
  intent: "## Intent",
  entryFlags: "## Entry flags",
  qualifiers: "## Qualifiers",
  signals: "## Signals",
  risks: "## Risks",
  artifacts: "## Artifacts",
  confidence: "## Confidence and alternatives",
};

// The code-spanned value opening each table row of a section, sorted.
function firstCells(section: string): string[] {
  return section
    .split("\n")
    .map((line) => /^\| `([^`]+)` /.exec(line)?.[1])
    .filter((value): value is string => value !== undefined)
    .sort();
}

// The extraction example the plan reference shows.
function extractionExample(reference: string): Record<string, unknown> {
  const block = reference.split("## Extraction")[1]?.split("```json\n")[1]?.split("```")[0];
  const example: unknown = JSON.parse(block ?? "null");
  return isRecord(example) ? example : {};
}

// Each `field: value` of an extraction that its field's vocabulary does not hold.
function outsideVocabulary(extraction: Record<string, unknown>): string[] {
  return Object.entries(extraction).flatMap(([field, value]) => {
    const allowed = EXTRACTION_VOCABULARIES[field] ?? [];
    const values = Array.isArray(value) ? value : [value];
    return values
      .filter((each) => !(typeof each === "string" && allowed.includes(each)))
      .map((each) => `${field}: ${String(each)}`);
  });
}

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe("qfai-run", () => {
  // QFAI:AC-0001-0194-05
  // QFAI:EX-0001-0194-13
  it("keeps its SKILL.md within 150 lines", async () => {
    const lines = (await readShipped(RUN)).replace(/\n$/, "").split("\n");
    expect(lines.length).toBeLessThanOrEqual(150);
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-35
  it("defines every extraction value, shows an extraction with no route, and names no route", async () => {
    const reference = await readShipped(EXTRACTION);
    const defined = Object.fromEntries(
      Object.entries(EXTRACTION_SECTIONS).map(([field, heading]) => [
        field,
        firstCells(sectionOf(reference, heading)),
      ]),
    );
    expect(defined).toEqual(
      Object.fromEntries(
        Object.entries(EXTRACTION_VOCABULARIES).map(([field, values]) => [
          field,
          [...values].sort(),
        ]),
      ),
    );

    const extraction = extractionExample(await readShipped(PLAN));
    expect(Object.keys(extraction).sort()).toEqual(Object.keys(EXTRACTION_VOCABULARIES).sort());
    expect(outsideVocabulary(extraction)).toEqual([]);

    const skill = flat(await readShipped(RUN));
    expect(skill).toMatch(
      /choose a route, which the cli's decision rules take from the extraction/i,
    );
    const routes = (await readdir(path.join(PACKAGE_DEFAULTS, "workflows")))
      .filter((file) => file.endsWith(".yml"))
      .map((file) => file.replace(/\.yml$/, ""));
    const files = await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-run"));
    const naming: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      for (const route of routes) {
        if (new RegExp(`(?<![\\w-])${route}(?![\\w-])`).test(text)) {
          naming.push(`${path.basename(file)}: ${route}`);
        }
      }
    }
    expect([...routes].sort()).toEqual([...WORKFLOW_ROUTES].sort());
    expect(naming).toEqual([]);
  });

  // QFAI:AC-0001-0222-06
  // QFAI:EX-0001-0222-11
  // QFAI:EX-0001-0222-12
  it("puts the candidates as one single-select question, plans the choice by name, and takes the first under a no-question mode", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(/when `plan` returns `candidates`, put one single-select question/i);
    expect(work).toMatch(/each option saying in the user's words what that route will do/i);
    expect(work).toMatch(/`npx qfai workflow plan --route <route>` for the chosen one/);
    const screens = await readShipped(SCREENS);
    const row = rowOf(sectionOf(screens, "## Questions"), "| The candidate question");
    expect(row).toMatch(/with no route identifier/i);
    expect(flat(sectionOf(screens, "## Questions"))).toMatch(
      /the recommendation, the main reading, stands on a line of its own/i,
    );
    const quiet = flat(sectionOf(await readShipped(RUN), "## Under a no-question mode"));
    expect(quiet).toMatch(
      /the plan's narrowest scope, or the first candidate and its narrowest scope, is taken and reported as an assumption/i,
    );
  });

  // QFAI:AC-0001-0224-01
  // QFAI:EX-0001-0224-01
  it("announces the goal, the stages and the files before the first stage, then runs every step in order", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /before the first stage, give the goal, the chosen stages in order in plain words, and the files the work may change\. ask nothing/i,
    );
    expect(work).toMatch(/run each stage in plan order, and each of its steps in order/i);
    const announcement = flat(sectionOf(await readShipped(SCREENS), "## The announcement"));
    expect(announcement).toMatch(/\basks nothing\b.*\blists no skipped stage\b/i);
    expect(announcement).toMatch(
      /\bcontinue\b.*\bpolicy check\b.*\bfirst stage\b.*\bsame turn\b.*\bwithout waiting for a reply\b/i,
    );
    expect(flat(await readShipped(RUN))).toMatch(/add, drop or reorder a step the plan names/i);
  });

  // QFAI:AC-0001-0229-02
  // QFAI:AC-0001-0229-03
  // QFAI:AC-0001-0229-04
  // QFAI:AC-0001-0229-05
  // QFAI:EX-0001-0229-05
  // QFAI:EX-0001-0229-06
  // QFAI:EX-0001-0229-07
  // QFAI:EX-0001-0229-08
  // QFAI:EX-0001-0229-11
  // QFAI:EX-0001-0229-12
  // QFAI:EX-0001-0229-14
  // QFAI:EX-0001-0229-15
  // QFAI:EX-0001-0229-16
  // QFAI:EX-0001-0229-17
  // QFAI:EX-0001-0229-18
  // QFAI:EX-0001-0229-23
  it("asks which scope to run before the first stage, runs only its stages, and never calls a narrower run done", async () => {
    const run = await readShipped(RUN);
    const scopeInstruction = flat(
      sectionOf(run, "## The work").split("**Scope.**")[1]?.split("**Announce.**")[0] ?? "",
    );
    expect(scopeInstruction).toContain("`references/operator-screens.md`");
    expect(scopeInstruction).toMatch(
      /\btwo or more scopes\b.*\bask which (?:scope )?to run\b.*\brun only (?:its|the chosen scope's) stages\b/i,
    );
    expect(scopeInstruction).toMatch(
      /\bone scope\b.*\bno scopes\b.*\bbranch destination's plan\b.*\bask nothing\b.*\brun every stage\b/i,
    );
    expect(flat(run)).toMatch(/or run a stage outside the scope/i);
    const screens = await readShipped(SCREENS);
    const scope = flat(sectionOf(screens, "## The scope question"));
    expect(scope).toMatch(/the plan's, or the chosen candidate's after the candidate question/i);
    expect(scope).toMatch(
      /one option per scope, narrowest first and recommended, each naming the stages it runs in plain words/i,
    );
    expect(scope).toMatch(
      /a free-text answer runs the stages up to the last one it names, followed by the verify stages the narrowest scope would add to them/i,
    );
    expect(scope).toMatch(/stops the work before the first stage, naming that work/i);
    expect(scope).toMatch(
      /one scope, a plan with no scopes, and a branch destination's plan, however it was taken, ask nothing and run every stage/i,
    );
    expect(scope).toMatch(/a release point is asked only when the chosen scope holds its step/i);
    expect(scope).toMatch(/when the chosen scope leaves stages out, ask before every branch move/i);
    expect(flat(sectionOf(run, "## Under a no-question mode"))).toMatch(
      /a third branch move, or one from a scope that leaves stages out, stops the work/i,
    );
    expect(flat(sectionOf(await readShipped(STAGE_POINTS), "## Branch point"))).toMatch(
      /from a scope that leaves stages out, ask before any move/i,
    );
    expect(flat(sectionOf(screens, "## The announcement"))).toMatch(/the chosen stages in order/i);
    expect(rowOf(sectionOf(screens, "## Final report"), "| At the chosen scope")).toMatch(
      /the stages not chosen.*never that a change is done/i,
    );
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-40
  // QFAI:EX-0001-0211-41
  // QFAI:EX-0001-0211-44
  it("marks a behaviour change as a prototype request only when it asks to change the prototype", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(rowOf(sectionOf(reference, "## Qualifiers"), "| `prototype-requested`")).toMatch(
      /\| `behaviour-change` +\| the request explicitly asks to change the prototype\. a request to implement the change in the product does not set it/i,
    );
    expect(rowOf(sectionOf(reference, "## Entry flags"), "| `decision`")).toMatch(
      /on a `behaviour-change` that explicitly asks to change the prototype, only when a choice is left open/i,
    );
    expect(flat(sectionOf(reference, "## Entry flags"))).toMatch(
      /acceptance is shown when .* the user asks for the change in the session and names it and its effect/i,
    );
  });

  // QFAI:AC-0001-0229-06
  // QFAI:EX-0001-0229-10
  it("lists code and tests only when the request asks for the change to be implemented", async () => {
    const artifacts = flat(sectionOf(await readShipped(EXTRACTION), "## Artifacts"));
    expect(artifacts).toMatch(
      /list `code` and `tests` only when the request asks for the change to be implemented: a request that ends at the specification or a prototype lists neither/i,
    );
    expect(artifacts).not.toMatch(/whenever behaviour changes/i);
    expect(flat(await readShipped(EXTRACTION))).toMatch(
      /6. list the `artifacts` the request asks to change./i,
    );
  });

  // QFAI:AC-0001-0224-02
  // QFAI:EX-0001-0224-02
  it("writes artifacts itself, delegates only parallel parts and reviews, and never reviews its own work", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(/write any artifact yourself/i);
    expect(work).toMatch(
      /give a part to a sub-agent only to run independent parts in parallel, or for a review/i,
    );
    expect(work).toMatch(/whose `review` is `spec`, `requirements-reviewer` reviews/);
    expect(work).toMatch(/no agent reviews its own work/i);
  });

  // QFAI:AC-0001-0224-04
  // QFAI:EX-0001-0224-05
  it("moves at a branch point by planning the destination, and asks before the third move", async () => {
    const work = flat(sectionOf(await readShipped(STAGE_POINTS), "## Branch point"));
    expect(work).toMatch(
      /take the destination's plan with `npx qfai workflow plan --route <route>`/i,
    );
    expect(work).toMatch(
      /before the third move and every one after it, ask the user, naming the destination in plain words; `stop` ends the work/i,
    );
  });

  // QFAI:AC-0001-0223-03
  // QFAI:EX-0001-0223-05
  it("handles each release, decision and branch point at its step, inside the step loop", async () => {
    const work = sectionOf(await readShipped(RUN), "## The work");
    const loop = flat(work.split("5. **Run the stages.**")[1]?.split("6. **Review.**")[0] ?? "");
    expect(loop).toMatch(/at each step, handle the points the plan names for it/i);
    for (const point of ["release point", "decision point", "branch point"]) {
      expect(loop.toLowerCase()).toContain(`**${point}.**`);
    }
    expect(flat(sectionOf(await readShipped(STAGE_POINTS), "## Branch point"))).toMatch(
      /at once: no later step of this route runs/i,
    );
  });

  // QFAI:AC-0001-0224-05
  // QFAI:EX-0001-0224-06
  it("stops on a finding no stage serves, naming the skill to invoke", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /a finding no stage serves\.\*\* stop, and name the finding, its owner and the stage skill to invoke by name/i,
    );
  });

  // QFAI:AC-0001-0224-06
  // QFAI:EX-0001-0224-07
  // QFAI:EX-0001-0224-08
  it("plans under active, writes nothing under shadow, plans nothing under off, and reads no key as active", async () => {
    const mode = sectionOf(await readShipped(RUN), "## Mode");
    expect(flat(mode)).toMatch(
      /read `workflow\.mode` in `qfai\.config\.yaml` first\. no key means `active`/i,
    );
    expect(rowOf(mode, "| `shadow`")).toMatch(/write nothing, and say that nothing was written/i);
    expect(rowOf(mode, "| `off`")).toMatch(
      /plan nothing\. the user invokes the stage skills by name/i,
    );
  });

  // QFAI:AC-0001-0223-01
  // QFAI:EX-0001-0223-01
  // QFAI:EX-0001-0223-02
  it("asks each critical decision at a decision point before anything that depends on it changes", async () => {
    const work = flat(sectionOf(await readShipped(STAGE_POINTS), "## Decision point"));
    expect(work).toMatch(
      /at a step `decisionPoints` names, put each critical decision to the user through the structured question tool before changing anything that depends on it/i,
    );
    expect(work).toMatch(
      /critical when it contradicts a specification, a contract or a recorded decision, cannot be taken back, or rests on product intent nothing written states/i,
    );
    const row = rowOf(
      sectionOf(await readShipped(SCREENS), "## Questions"),
      "| A critical decision",
    );
    expect(row).toMatch(/naming the specification, contract or recorded decision it touches/i);
  });

  // QFAI:AC-0001-0223-02
  // QFAI:EX-0001-0223-03
  it("takes every other decision itself and lists it with its reason in the final report", async () => {
    const work = flat(sectionOf(await readShipped(STAGE_POINTS), "## Decision point"));
    expect(work).toMatch(
      /take every other decision yourself, ask nothing, and list it with its reason in the final report/i,
    );
    const report = flat(sectionOf(await readShipped(SCREENS), "## Final report"));
    expect(report).toMatch(/every decision taken without the user, with its reason/i);
    expect(report).toMatch(/the report ends with a question listing the next actions/i);
  });

  // QFAI:AC-0001-0223-03
  // QFAI:EX-0001-0223-04
  // QFAI:EX-0001-0223-05
  it("asks for release approval at the release point, and the approval authorizes no push or publication", async () => {
    const work = flat(sectionOf(await readShipped(STAGE_POINTS), "## Release point"));
    expect(work).toMatch(
      /before a step `releasePoint` names runs, ask the user to approve the release; where it is `end`, ask once the last stage's gates have passed/i,
    );
    expect(work).toMatch(
      /nothing after it runs without the approval, which authorizes no push, merge, tag or publication/i,
    );
  });

  // QFAI:AC-0001-0223-04
  // QFAI:EX-0001-0223-06
  // QFAI:EX-0001-0223-08
  it("records each approval as one decisions row, and no row for a decision taken without the user", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    const release = flat(sectionOf(await readShipped(STAGE_POINTS), "## Release point"));
    expect(work).toMatch(
      /each approval of a specification change, a critical decision or a release is one `decisions\.md` row: what was approved, who approved it, when, and the chosen option's label/i,
    );
    expect(work).toMatch(/a decision you took appends no row/i);
    expect(release).toMatch(/which authorizes no push, merge, tag or publication/i);
  });

  // QFAI:AC-0001-0223-05
  // QFAI:EX-0001-0223-07
  it("under a no-question mode records a critical decision as an open question and stops before it", async () => {
    const quiet = flat(sectionOf(await readShipped(RUN), "## Under a no-question mode"));
    expect(quiet).toMatch(/nothing is asked/i);
    expect(quiet).toMatch(
      /a critical decision or a release point becomes one `open-questions\.md` row, the step stops before the change that depends on it, and the report lists the decision as open/i,
    );
  });

  // QFAI:AC-0001-0188-05
  // QFAI:EX-0001-0188-07
  it("asks once for the one missing value that blocks the plan, as a value with no recommendation", async () => {
    const questions = sectionOf(await readShipped(SCREENS), "## Questions");
    expect(rowOf(questions, "| A missing fact")).toMatch(/no recommendation/i);
    expect(flat(questions)).toMatch(
      /when one missing value is all that blocks the plan, ask for it once, then plan/i,
    );
  });

  it("stops before a step only a person can take, naming the action, its evidence and the read-only check", async () => {
    const screens = await readShipped(SCREENS);
    const step = flat(sectionOf(screens, "## A step only a person can take"));
    expect(step).toMatch(/what the user must do/i);
    expect(step).toMatch(/what shows it was done/i);
    expect(step).toMatch(/what the agent will read to check it, which changes nothing/i);
    expect(step).toMatch(/never types a password, token or key/i);
    expect(step).toMatch(/never changes an account or service setting/i);
    const extraction = flat(await readShipped(EXTRACTION));
    expect(extraction).toMatch(
      /takes the intent of the repository change, with the entry flag `env`/i,
    );
  });

  // QFAI:AC-0001-0194-05
  // QFAI:EX-0001-0194-17
  it("The operator-screens reference relays CLI strings in the user's working language", async () => {
    const text = flat(sectionOf(await readShipped(SCREENS), "## Every screen"));
    expect(text).toMatch(
      /relay it in the user's working language\. the cli's strings are english/i,
    );
  });
});

describe("qfai-maintain", () => {
  // QFAI:AC-0001-0191-01
  // QFAI:EX-0001-0191-02
  it("edits only non-normative text in the write scope and returns the four receipts", async () => {
    const skill = await readShipped(MAINTAIN_EDIT);
    expect(frontMatterOf(await readShipped(MAINTAIN)).steps).toEqual(["maintain-edit"]);
    expect(flat(sectionOf(skill, "## What this is for"))).toMatch(
      /alters what a reader reads and nothing a person, program or agent does/i,
    );
    expect(flat(sectionOf(skill, "## The edit"))).toMatch(/edit nothing outside it/i);
    const returns = flat(sectionOf(skill, "## What the stage returns"));
    for (const receipt of [
      /the diff/i,
      /the no-behaviour-change judgement/i,
      /the independent review's verdict/i,
      /the lint and link checks run/i,
    ]) {
      expect(returns).toMatch(receipt);
    }
  });

  // QFAI:AC-0001-0191-02
  it("stops before an edit with a semantic effect and leaves the run blocked on the owner", async () => {
    const skill = await readShipped(MAINTAIN_EDIT);
    const edit = flat(sectionOf(skill, "## The edit"));
    expect(edit).toMatch(/judge whether each planned edit has a semantic effect/i);
    expect(edit).toMatch(/stop before editing as \[A semantic effect\]/i);
    expect(edit).toMatch(/do not make the edit/i);
    // Invoked by name, the step stops and says so; in a run, it also says what the stage returns.
    const effect = flat(sectionOf(skill, "## A semantic effect"));
    expect(effect).toMatch(/is not a maintenance edit\. nothing is edited/i);
    expect(effect).toMatch(/stop, and report that the change is not a maintenance edit/i);
    expect(effect).toMatch(
      /no stage of the route serves the finding's owner, so the run is `blocked`, naming the finding and the owner skill to invoke by name/i,
    );
    expect(effect).not.toMatch(/reclassified/i);
  });
});

describe("the entry skills' routing entries", () => {
  // QFAI:AC-0001-0161-05
  // QFAI:EX-0001-0161-06
  it("routes qfai-run to the orchestrator only, and qfai-maintain to an author and no reviewer", async () => {
    const run = await routingEntry("qfai-run");
    expect(run, "the routing defaults have a qfai-run entry").toBeDefined();
    const runPhases = phasesOf(run);
    expect(runPhases.length, "qfai-run has a phase").toBeGreaterThan(0);
    expect([...new Set(runPhases.flatMap(phaseAgents))]).toEqual(["orchestrator"]);
    expect(run?.review_profile, "qfai-run names no review profile").toBeUndefined();

    const maintain = await routingEntry("maintain-edit", "step");
    expect(maintain?.review_profile).toBe("default");
    const maintainPhases = phasesOf(maintain);
    const authors = maintainPhases.flatMap(phaseAgents);
    expect(authors.length, "qfai-maintain has an authoring phase").toBeGreaterThan(0);
    expect(
      authors.filter((agent) => agent.endsWith("-reviewer") || agent === "qa-gatekeeper"),
      "no reviewer is routed here",
    ).toEqual([]);
    expect(maintainPhases.some((phase) => phase.id === "review")).toBe(false);

    expect(Object.keys(await profiles()).sort()).toEqual(PROFILES);

    const shippedRoot = path.dirname(path.dirname(SHIPPED_ASSISTANT));
    expect(await validateAgentDefinition(shippedRoot, defaultConfig)).toEqual([]);
  });
});

describe("shipped text the workflow adds", () => {
  it("keeps every entry-skill file and plan within the line and width ceilings", async () => {
    const files = [
      ...(await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-run"))),
      ...(await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-maintain"))),
      ...(await filesUnder(path.join(SHIPPED_ASSISTANT, "step", "maintain-edit"))),
      ...(await filesUnder(path.join(PACKAGE_DEFAULTS, "workflows"))),
    ];
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const file of files) {
      const rel = path.relative(path.dirname(PACKAGE_DEFAULTS), file);
      const lines = (await readFile(file, "utf-8")).split("\n");
      expect(lines.length, rel).toBeLessThanOrEqual(assistantLineCeiling(file));
      const widest = Math.max(...lines.map((line) => line.length));
      expect(widest, rel).toBeLessThanOrEqual(ASSISTANT_ASSET_MAX_LINE_CHARS);
    }
  });

  // QFAI:EX-0001-0194-16
  it("names the command as npx qfai workflow wherever the shipped tree mentions it", async () => {
    const files = [
      ...(await filesUnder(SHIPPED_ASSISTANT)),
      ...(await filesUnder(PACKAGE_DEFAULTS)),
    ].filter((file) => /\.(md|ya?ml)$/.test(file));
    const bare: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      if (/(?<!npx )qfai workflow/.test(text)) {
        bare.push(path.relative(path.dirname(PACKAGE_DEFAULTS), file));
      }
    }
    expect(bare).toEqual([]);
  });
});

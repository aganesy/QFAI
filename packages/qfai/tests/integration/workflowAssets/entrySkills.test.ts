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
  ASSISTANT_ASSET_MAX_LINES,
  ASSISTANT_ASSET_MAX_LINE_CHARS,
} from "../../../src/core/doctor/assetLineBudget.js";
import { validateAgentDefinition } from "../../../src/core/validators/agentDefinition.js";
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
const MAINTAIN = "skill/qfai-maintain/SKILL.md";
const MAINTAIN_EDIT = "step/maintain-edit/STEP.md";

const PROFILES = [
  "architecture-heavy",
  "default",
  "heavy",
  "implementation-heavy",
  "requirements-heavy",
  "runtime-heavy",
  "ui-bearing",
];

const AGENT_FIELDS = ["mandatory_agents", "conditional_agents", "blocking_agents"] as const;

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
    "contradicts-record",
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
  ],
  risks: ["security", "data-loss", "silent", "breaking", "upgrade", "performance"],
  gate: ["none", "decide", "approve", "external"],
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
  gate: "## Gate",
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
    expect(routes.length).toBeGreaterThan(0);
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
    expect(quiet).toMatch(/the first candidate is taken and reported as an assumption/i);
  });

  // QFAI:AC-0001-0224-01
  // QFAI:EX-0001-0224-01
  it("announces the goal, the stages and the files before the first stage, then runs every step in order", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /before the first stage, give the goal, the stages in order in plain words, and the files the work may change\. ask nothing/i,
    );
    expect(work).toMatch(
      /for each stage in order, read the `path` of each step and run the step, in order/i,
    );
    const announcement = flat(sectionOf(await readShipped(SCREENS), "## The announcement"));
    expect(announcement).toMatch(/it asks nothing and lists no skipped stage/i);
    expect(flat(await readShipped(RUN))).toMatch(/add, drop or reorder a step the plan names/i);
  });

  // QFAI:AC-0001-0224-02
  // QFAI:EX-0001-0224-02
  it("writes artifacts itself, delegates only parallel parts and reviews, and never reviews its own work", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(/write any artifact yourself/i);
    expect(work).toMatch(
      /give a part to a sub-agent only to run independent parts in parallel, or for a review/i,
    );
    expect(work).toMatch(/`review: spec` is done by `requirements-reviewer`/);
    expect(work).toMatch(/no agent reviews its own work/i);
  });

  // QFAI:AC-0001-0224-04
  // QFAI:EX-0001-0224-05
  it("moves at a branch point by planning the destination, and asks before the third move", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /take the destination's plan with `npx qfai workflow plan --route <route>`/i,
    );
    expect(work).toMatch(
      /before the third move and every one after it, ask the user, naming the destination in plain words; `stop` ends the work/i,
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
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
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
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
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
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /where `releasePoint` names a step, ask the user to approve the release before that step runs; where it is `end`, after the last stage/i,
    );
    expect(work).toMatch(
      /nothing after it runs without the approval, and the approval authorizes no push, merge, tag or publication/i,
    );
  });

  // QFAI:AC-0001-0223-04
  // QFAI:EX-0001-0223-06
  it("records each approval as one decisions row, and no row for a decision taken without the user", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /each approval the user gives, of a specification change, a critical decision or a release, is one `decisions\.md` row naming what was approved, who approved it, when, and the label of the option chosen/i,
    );
    expect(work).toMatch(/a decision you took yourself appends no row/i);
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
      /alters what a reader reads and nothing a program or an agent does/i,
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
  // QFAI:EX-0001-0191-04
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
    expect(effect).toMatch(/the outcome is `needs_repair`, and `changedFiles` is empty/i);
    expect(effect).toMatch(/`debts` holds one entry for the finding/i);
    expect(effect).toMatch(/`findingCode` is `maintain-semantic-effect`/);
    expect(effect).toMatch(/`owningFlow` is `null`, because an `edit-text` run binds no flow/i);
    expect(effect).toMatch(/`detectingCommand` names the review or the command that found it/i);
    expect(effect).toMatch(
      /`resolvingOwner` is the skill that owns that kind of change, never one the `edit-text` plan names/i,
    );
  });
});

describe("the entry skills' routing entries", () => {
  // QFAI:AC-0001-0161-05
  // QFAI:EX-0001-0161-06
  // QFAI:AC-0001-0185-05
  // QFAI:EX-0001-0185-16
  it("routes qfai-run to the orchestrator only, and qfai-maintain to an author and an independent reviewer", async () => {
    const run = await routingEntry("qfai-run");
    expect(run, "the routing defaults have a qfai-run entry").toBeDefined();
    const runPhases = phasesOf(run);
    expect(runPhases.length, "qfai-run has a phase").toBeGreaterThan(0);
    expect([...new Set(runPhases.flatMap(phaseAgents))]).toEqual(["orchestrator"]);
    expect(run?.review_profile, "qfai-run names no review profile").toBeUndefined();

    const maintain = await routingEntry("maintain-edit", "step");
    expect(maintain?.review_profile).toBe("default");
    const maintainPhases = phasesOf(maintain);
    const authors = maintainPhases
      .filter((phase) => !strings(phase.mandatory_agents).includes("completion-reviewer"))
      .flatMap(phaseAgents);
    expect(authors.length, "qfai-maintain has an authoring phase").toBeGreaterThan(0);
    const reviewing = maintainPhases.filter((phase) =>
      strings(phase.blocking_agents).includes("completion-reviewer"),
    );
    expect(reviewing.length, "qfai-maintain has a blocking reviewer phase").toBeGreaterThan(0);
    expect(authors, "the reviewer is not an author").not.toContain("completion-reviewer");

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
      expect(lines.length, rel).toBeLessThanOrEqual(ASSISTANT_ASSET_MAX_LINES);
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

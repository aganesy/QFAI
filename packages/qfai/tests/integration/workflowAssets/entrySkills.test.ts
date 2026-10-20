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
import { approachProblems } from "../../../src/core/validators/storyTreeStructure.js";
import type { WorkflowExtraction } from "../../../src/core/workflow/extraction.js";
import { extractionFaults, isExtraction } from "../../../src/core/workflow/extractionShape.js";
import { routingOutcome } from "../../../src/core/workflow/routeDecision.js";
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
import { extraction } from "../../helpers/workflowExtraction.js";

const RUN = "skill/qfai-run/SKILL.md";
const PLAN = "skill/qfai-run/references/plan.md";
const SCREENS = "skill/qfai-run/references/operator-screens.md";
const EXTRACTION = "skill/qfai-run/references/extraction.md";
const STAGE_POINTS = "skill/qfai-run/references/stage-points.md";
const MAINTAIN = "skill/qfai-maintain/SKILL.md";
const MAINTAIN_EDIT = "step/maintain-edit/STEP.md";
const SDD_TRIAGE = "skill/qfai-sdd/references/sdd-triage.md";

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
    "procedure",
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
    "release-delegated",
    "settled-design",
    "red-since-change",
    "check-misses",
    "mechanism-inert",
    "removal-requested",
    "visual-open",
    "prototype-requested",
    "owned-temporary-cleanup",
    "meaning-preserving",
    "session-answerable",
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

// The code-spanned value opening each list item or table row of a section, sorted.
function firstCells(section: string): string[] {
  return section
    .split("\n")
    .map((line) => /^(?:- |\| )`([^`]+)`[ :,]/.exec(line)?.[1])
    .filter((value): value is string => value !== undefined)
    .sort();
}

// The list item of a section that defines a value.
function itemOf(section: string, value: string): string {
  return section.split("\n").find((line) => line.startsWith(`- \`${value}\``)) ?? "";
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

  // QFAI:EX-0001-0216-08
  it("points stage execution at the step rules and explains pass-through work without skipping its review", async () => {
    const [run, screens, baseline] = await Promise.all([
      readShipped(RUN),
      readShipped(SCREENS),
      readShipped("rule/shared-skill-operating-baseline.md"),
    ]);
    const loop = flat(
      sectionOf(run, "## The work").split("**Run the stages.**")[1]?.split("**Review.**")[0] ?? "",
    );
    expect(baseline).toContain("## Running Steps (Mandatory)");
    expect(loop).toContain(
      ".qfai/assistant/rule/shared-skill-operating-baseline.md#running-steps-mandatory",
    );
    expect(loop).toMatch(
      /\b(?:if|when|as needed)\b.*operator-screens\.md|operator-screens\.md.*\b(?:if|when|as needed)\b/i,
    );

    const guide = flat(screens);
    expect(guide).toContain("`STEP.md`");
    expect(guide).toMatch(/\b(?:follow|run|execute)\b.*\bprocedure\b/i);
    expect(guide).toMatch(/\bonly\b.*\b(?:declared|listed|named)\b.*\bcommands?\b/i);
    expect(guide).toMatch(/\b(?:pass|satisfy)\b.*\bgate\b/i);
    expect(guide).toContain("`passThrough`");
    expect(guide).toMatch(/\bPasses when\b/i);
    expect(guide).toMatch(/\breason\b.*\bstage report\b|\bstage report\b.*\breason\b/i);
    expect(guide).toMatch(/\b(?:not|never|do not)\b.*\bskip\b/i);
    expect(guide).toMatch(/\b(?:independent|independently)\b.*\breview\b/i);
    expect(guide).toMatch(
      /\b(?:planned|required|declared|plan's)\b.*\breview\b.*\b(?:still|always)\b/i,
    );
  });

  // QFAI:AC-0001-0196-14
  it("requires launcher preflight before planning and directs a missing install to project recovery", async () => {
    const [run, screens] = await Promise.all([readShipped(RUN), readShipped(SCREENS)]);
    const intro = run.split("## What this skill never does")[0] ?? "";
    const extract = sectionOf(run, "## The work")
      .split("**Extract.**")[1]
      ?.split("**Candidates.**")[0];
    const launcherInstructions = flat(`${intro} ${extract ?? ""}`);

    expect(launcherInstructions).toContain(
      ".qfai/assistant/rule/shared-skill-operating-baseline.md#canonical-qfai-launcher-mandatory",
    );
    expect(launcherInstructions).toMatch(
      /\bpreflight\b.*\bbefore\b.*\bplan(?:ning)?\b|\bbefore\b.*\bplan(?:ning)?\b.*\bpreflight\b/i,
    );
    expect(launcherInstructions).toMatch(
      /\b(?:if|when)\b.*\b(?:missing|fails?|unavailable|no local)\b.*operator-screens\.md/i,
    );
    // The step that calls `plan` runs the preflight itself, so `plan` cannot come first.
    expect(flat(extract ?? "")).toContain(
      "Then run the launcher preflight above; after it passes, hand the extraction to `npx qfai workflow plan --in <file>`",
    );

    const guide = flat(screens);
    expect(guide).toMatch(/\b(?:missing|no local)\b.*\b(?:install|dependency|dependencies)\b/i);
    expect(guide).toMatch(/\bproject(?:'s)?\b.*\b(?:package manager|install command)\b/i);
    expect(guide).toMatch(/\b(?:rerun|repeat|again)\b.*\bpreflight\b|\bpreflight\b.*\bagain\b/i);
    expect(guide).toMatch(/\b(?:do not|never|no)\b[^.]*\b(?:published|remote)\b/i);
    expect(guide).toMatch(/\b(?:do not|never|no)\b[^.]*\b(?:cache|cached)\b/i);
    expect(guide).not.toMatch(
      /\bSessionStart`?\s+(?:automatically installs?|installs? automatically)\b/i,
    );
  });

  // QFAI:EX-0001-0196-43
  it("resumes a waiting step for its requested reply and plans an independent new request", async () => {
    const kinds = flat(sectionOf(await readShipped(RUN), "## Request kinds"));
    expect(kinds).toMatch(/\brepl(?:y|ies)\b.*\brequested\b.*\bresult\b/i);
    expect(kinds).toMatch(/\bresumes?\b.*\b(?:same|waiting) step\b/i);
    expect(kinds).toMatch(
      /\b(?:no|not|without|never|rather than)\b.*\b(?:fresh|new|another) invocation\b/i,
    );
    expect(kinds).toMatch(/\b(?:independent|separate) new request\b.*\bplan(?:ned)?\b/i);
    expect(kinds).toContain("`references/operator-screens.md`");
    expect(kinds).toContain(
      "An automated notice (task, wake-up, CI) is no request; one that delivers a requested result resumes the waiting step.",
    );
  });

  // QFAI:EX-0001-0196-43
  it("keeps uncertain replies unconfirmed and permits only the planned branch from a closed information request", async () => {
    const screens = flat(await readShipped(SCREENS));
    expect(screens).toMatch(/\b(?:ambiguous|uncertain|unclear) repl(?:y|ies)\b/i);
    expect(screens).toMatch(
      /\b(?:do not|never)\b.*\b(?:assume|infer|take|treat)\b.*\b(?:success|completion)\b.*\bapproval\b/i,
    );
    expect(screens).toMatch(/\b(?:no|without|do not)\b.*\b(?:new|fresh) plan\b/i);
    expect(screens).toMatch(
      /\b(?:no|without|do not)\b.*\b(?:skill invocation|invoke (?:another|a new) skill)\b/i,
    );
    expect(screens).toMatch(/\b(?:closed|completed) request for information\b/i);
    expect(screens).toMatch(
      /\b(?:plan's branch|branch (?:the )?plan (?:names|gives)|branch (?:as|by|per) (?:the )?plan)\b/i,
    );
  });

  // QFAI:EX-0001-0196-43
  // QFAI:EX-0001-0196-59
  it("accepts requested free text as an answer and separates independent or mixed instructions", async () => {
    const replies = flat(sectionOf(await readShipped(SCREENS), "## Replies to a waiting step"));
    expect(replies).toMatch(
      /free text supplying the requested value.*answer to that waiting step/i,
    );
    expect(replies).toMatch(/even if it does not repeat an option label/i);
    expect(replies).toMatch(/independent new request.*planned/i);
    expect(replies).toMatch(
      /if a reply also contains one.*resume the waiting step with its answer.*plan the independent request separately/i,
    );
    expect(replies).toMatch(/never treat an unrelated instruction as selection or approval/i);
    expect(replies).toMatch(/no new plan and no skill invocation/i);
  });

  // QFAI:EX-0001-0196-58
  it("does not infer an answer from dismissal and continues only previously authorized work", async () => {
    const replies = flat(sectionOf(await readShipped(SCREENS), "## Replies to a waiting step"));
    expect(replies).toMatch(/dismissal or no response is not an answer or permission/i);
    expect(replies).toMatch(/routine choice only under authorization the user already gave/i);
    for (const boundary of [
      /hard-required fact/i,
      /uncovered mandatory approval/i,
      /cancellation/i,
      /explicit tool block/i,
    ])
      expect(replies).toMatch(boundary);
    expect(replies).toMatch(/only independent work that remains authorized/i);
  });

  // QFAI:EX-0001-0196-57
  it("reports background waiting with evidence and a resume condition without promising restart", async () => {
    const replies = flat(sectionOf(await readShipped(SCREENS), "## Replies to a waiting step"));
    expect(replies).toMatch(/background waiting needs no question/i);
    expect(replies).toMatch(/current state, awaited evidence or result and resume condition/i);
    expect(replies).toMatch(/promise no automatic restart unless the host provides it/i);
    expect(replies).toMatch(/user-questions\.md.*§ 6.*when an answer is needed/i);
    expect(replies).toMatch(/completion-only final report needs no question/i);
  });

  // QFAI:EX-0001-0196-57
  it.each([
    MAINTAIN,
    ...["implement", "sdd", "prototyping", "triage", "verify"].map(
      (skill) => `skill/qfai-${skill}/SKILL.md`,
    ),
  ])("%s asks after completion only when another step requires an answer", async (skill) => {
    const text = flat(await readShipped(skill));
    expect(text).toMatch(
      /ask (?:for|about) .*only when proceeding requires the user's answer|when the next step needs the user's answer,? ask a question listing the next actions/i,
    );
    expect(text).toMatch(
      /(?:completion|closure)-only reports? (?:needs? no question|ask nothing)/i,
    );
    expect(text).toMatch(/under a no-question mode, list (?:any )?remaining actions instead/i);
    expect(text).not.toMatch(/the report ends with a question listing the next actions/i);
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
    expect(work).toMatch(
      /`npx qfai workflow plan --route <route>` for the chosen one, keeping the candidate's `decisionPoints`/,
    );
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
    expect(itemOf(sectionOf(reference, "## Qualifiers"), "prototype-requested")).toMatch(
      /with `behaviour-change`: the request explicitly asks to change the prototype\. a request to implement the change in the product does not set it/i,
    );
    expect(itemOf(sectionOf(reference, "## Entry flags"), "decision")).toMatch(
      /on a `behaviour-change` that explicitly asks to change the prototype, only when a choice is left open/i,
    );
    expect(flat(sectionOf(reference, "## Entry flags"))).toMatch(
      /acceptance is shown when .* the user asks for the change in the session and names it and its effect/i,
    );
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-51
  it("extracts a question the session can answer and an operation from the skill file alone", async () => {
    const extract = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(extract).toMatch(/neither needs a reference/i);
    expect(extract).toContain("qualifiers: [session-answerable]");
    expect(extract).toContain("`{ intent: order, artifacts: [] }`");
    expect(extract).toContain(
      "The session-run operation that deletes nothing, read above as `{ intent: order, artifacts: [] }`, goes to `npx qfai workflow plan --order` instead, with no file; an order read through `references/extraction.md` keeps `--in`.",
    );
    expect(extract).toMatch(/read any other request as `references\/extraction\.md`/i);
    expect(extract).toMatch(/every other field is empty, with `confidence: high`/i);
    const full = (fields: Partial<WorkflowExtraction>) =>
      ({
        ...extraction({ artifacts: [], confidence: "high" }),
        ...fields,
      }) satisfies WorkflowExtraction;
    const shapes = [
      full({ intent: "question-why", qualifiers: ["session-answerable"] }),
      full({ intent: "order" }),
    ];
    // The same check `plan` runs before routing: a missing field would be refused here.
    expect(shapes.map((each) => extractionFaults(each))).toEqual([[], []]);
    const routed = shapes.map((each) => routingOutcome(each));
    expect(routed.map((each) => ("taken" in each ? each.taken.route : undefined))).toEqual([
      "answer-in-session",
      "run-operation",
    ]);
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-53
  it("plans the delivery the user asks for after a change plan as an operation", async () => {
    const commit = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(commit).toMatch(/`verify-commit` runs last, after any release point; never pushes\./);
    expect(commit).toMatch(
      /A push, pull request, merge or branch update the user asks for after the plan ends is planned next as `\{ intent: order, artifacts: \[\] \}` with `npx qfai workflow plan --order`, and its `triage-operate` delivers it/,
    );
    const outcome = routingOutcome({
      ...extraction({ intent: "order", artifacts: [], confidence: "high" }),
    });
    expect("taken" in outcome ? outcome.taken.route : undefined).toBe("run-operation");
  });

  // QFAI:AC-0001-0211-05
  it("reads no reference up front, and says when each one is read", async () => {
    const skill = await readShipped(RUN);
    const head = skill.slice(0, skill.indexOf("## What this skill never does"));
    expect(head).toMatch(/read no reference up front/i);
    const pointers = head.split("\n").filter((line) => /^- `references\//.test(line));
    expect(pointers.map((line) => /`references\/([\w-]+)\.md`/.exec(line)?.[1])).toEqual([
      "extraction",
      "plan",
      "operator-screens",
      "stage-points",
    ]);
    expect(head).toContain(
      "`references/plan.md`: for a plan field this file does not name, or a refused plan.",
    );
    for (const line of pointers) expect(line).toMatch(/`: (?:for|when|at) /);
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-52
  it("keeps person-only operations and deletions on the extraction reference", async () => {
    const extract = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(extract).toMatch(
      /an operation on finished work, or on a device or system the session reaches, that the session runs itself and that deletes nothing is `\{ intent: order, artifacts: \[\] \}`/i,
    );
    const qualifiers = sectionOf(await readShipped(EXTRACTION), "## Qualifiers");
    expect(itemOf(qualifiers, "human-run")).toMatch(/with `order`: only a person can run/i);
    expect(itemOf(qualifiers, "owned-temporary-cleanup")).toMatch(/with `order`: .*deleting/i);
    const order = (qualifier: WorkflowExtraction["qualifiers"][number]) =>
      routingOutcome({
        ...extraction({ intent: "order", artifacts: [], confidence: "high" }),
        qualifiers: [qualifier],
      });
    expect(
      [order("human-run"), order("owned-temporary-cleanup")].map((each) =>
        "taken" in each ? each.taken.route : undefined,
      ),
    ).toEqual(["hand-off-operation", "run-owned-cleanup"]);
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-58
  it("reads a release the user's quoted instruction delegates as a delegated release, and a bare release as none", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(itemOf(sectionOf(reference, "## Qualifiers"), "release-delegated")).toContain(
      "with `release`: The user's own instruction for this run, quoted word for word with its source, has the agent carry out the release, its preparation up to an open release pull request, or its version edit, for a version the user named. A request only for a release, a version with no one named to carry it out, a branch name or a project policy delegates nothing.",
    );
    const line = sectionOf(reference, "## Examples")
      .split("\n")
      .find((each) =>
        each.startsWith(
          '- "Release 2.4.0. You run the preparation and merge the release pull request; I only approve the publish." → ',
        ),
      );
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({
      intent: "release",
      qualifiers: ["release-delegated"],
      artifacts: ["release"],
      confidence: "high",
    });
    const pinned: unknown = { ...extraction(), ...(isRecord(parsed) ? parsed : {}) };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const routeOf = (outcome: ReturnType<typeof routingOutcome>) =>
      "taken" in outcome ? outcome.taken.route : undefined;
    expect([
      routeOf(routingOutcome(pinned)),
      routeOf(routingOutcome({ ...pinned, qualifiers: [] })),
    ]).toEqual(["run-release", "hand-off-operation"]);
  });

  // QFAI:AC-0001-0211-05
  it("reads an explicit request to file follow-up issues as an operation, not leftovers to sort", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(flat(sectionOf(reference, "## Intent"))).toContain(
      "A request that explicitly asks for issues to be filed, such as follow-up issues for what finished work left over or feedback on the tools it used, names an operation the session carries out: extract it as `order` with no artifacts. Feedback on the tools is still drafted and approved as `.agents/rules/session-feedback.md` sets out: the user chooses which drafts are filed. Leftovers to sort again, with no request to file them, stay `follow-up`.",
    );
    const line = sectionOf(reference, "## Examples")
      .split("\n")
      .find((each) => each.startsWith('- "File issues for everything this task left over." → '));
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({ intent: "order", artifacts: [], confidence: "high" });
    const pinned: unknown = { ...extraction(), ...(isRecord(parsed) ? parsed : {}) };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const routeOf = (outcome: ReturnType<typeof routingOutcome>) =>
      "taken" in outcome ? outcome.taken.route : undefined;
    expect([
      routeOf(routingOutcome(pinned)),
      routeOf(routingOutcome(extraction({ intent: "follow-up", artifacts: [] }))),
    ]).toEqual(["run-operation", "retriage-bundle"]);
  });

  // QFAI:AC-0001-0211-05
  it("reads a device operation the session runs itself, with no repository change, as an operation", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(flat(sectionOf(reference, "## Intent"))).toContain(
      "An operation the session runs on a device or system outside the repository, such as restarting an app on a connected phone, changes no tracked file: extract it as `order` with no artifacts. One that deletes something there needs the user's explicit instruction first. A request only to read that device's state is a question: `question-why` with `session-answerable`.",
    );
    const line = sectionOf(reference, "## Examples")
      .split("\n")
      .find((each) =>
        each.startsWith(
          '- "Restart the app on the test phone connected to this machine", which the session runs itself and which deletes nothing → ',
        ),
      );
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({ intent: "order", artifacts: [], confidence: "high" });
    const pinned: unknown = { ...extraction(), ...(isRecord(parsed) ? parsed : {}) };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const routeOf = (outcome: ReturnType<typeof routingOutcome>) =>
      "taken" in outcome ? outcome.taken.route : undefined;
    expect([
      routeOf(routingOutcome(pinned)),
      routeOf(routingOutcome({ ...pinned, qualifiers: ["human-run"] })),
    ]).toEqual(["run-operation", "hand-off-operation"]);
  });

  // QFAI:AC-0001-0211-05
  it("reads a request to read a device's state as a question the session answers", async () => {
    const line = sectionOf(await readShipped(EXTRACTION), "## Examples")
      .split("\n")
      .find((each) =>
        each.startsWith(
          '- "Which app version is installed on the test phone connected to this machine?", which the session can read itself → ',
        ),
      );
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({
      intent: "question-why",
      qualifiers: ["session-answerable"],
      confidence: "high",
    });
    const pinned: unknown = { ...extraction(), ...(isRecord(parsed) ? parsed : {}) };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const outcome = routingOutcome(pinned);
    expect("taken" in outcome ? outcome.taken.route : undefined).toBe("answer-in-session");
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-35
  it("reads a request to raise qfai itself as a dependency change, whose step carries the upgrade", async () => {
    const intents = sectionOf(await readShipped(EXTRACTION), "## Intent");
    expect(itemOf(intents, "dependency")).toMatch(/update `qfai` itself and run `init`/i);
    expect(itemOf(intents, "dependency")).toMatch(
      /including a contract edit the updated checks then call for/i,
    );
    const outcome = routingOutcome(
      extraction({ intent: "dependency", artifacts: ["deps"], confidence: "high" }),
    );
    expect("taken" in outcome ? outcome.taken.route : undefined).toBe("bump-dependency");
    expect(flat(await readShipped("step/implement-dep-bump/STEP.md"))).toMatch(
      /when the dependency is `qfai` itself/i,
    );
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-35
  it("reads an alert whose intent depends on unread facts as an investigation question", async () => {
    const reference = await readShipped(EXTRACTION);
    const procedure = flat(sectionOf(reference, "## Procedure"));
    expect(procedure).toMatch(
      /alert or a notice whose intent depends on facts not yet read, such as a failed deploy or a red job with no named change, is an investigation: extract it as `question-why`/i,
    );
    expect(procedure).toContain("Read nothing beyond what step 2 reads to choose another intent.");
    expect(procedure).toMatch(
      /names the job's change or its flakiness, `ci` and `flaky-test` still apply/i,
    );
    expect(procedure).toContain(
      "An alert that already holds the failure's evidence and asserts a product defect is a defect; `env` applies as below.",
    );
    expect(procedure).toMatch(
      /finds a defect, it reports the outcome `defect-found` with a new extraction of the request as a defect report/i,
    );
    expect(flat(await readShipped("step/triage-investigate/STEP.md"))).toMatch(
      /report the outcome `defect-found` with an extraction of the request as a defect report/i,
    );
    const line = sectionOf(reference, "## Examples")
      .split("\n")
      .find((each) => each.startsWith('- "Last night\'s deploy failed.", with no cause given → '));
    const parsed: unknown = parse(/→ `(\{.*\})`$/.exec(line ?? "")?.[1] ?? "null");
    expect(parsed).toEqual({ intent: "question-why", confidence: "high" });
    const pinned: unknown = {
      ...extraction({ artifacts: [] }),
      ...(isRecord(parsed) ? parsed : {}),
    };
    if (!isExtraction(pinned)) throw new Error("the pinned example is not an extraction");
    const outcome = routingOutcome(pinned);
    expect("taken" in outcome ? outcome.taken.route : undefined).toBe("answer-question");
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

  it("files shipped seed and sample data under data, and lets triage pass a change no story sets", async () => {
    const artifacts = flat(sectionOf(await readShipped(EXTRACTION), "## Artifacts"));
    expect(artifacts).toMatch(
      /- `data`: persisted user data or state, stored formats, migrations, shipped seed and sample data\..*a fixture that only a test reads stays under `tests`, not `data`\./i,
    );
    const completion = flat(sectionOf(await readShipped(SDD_TRIAGE), "## Completion of triage"));
    expect(completion).toMatch(
      /the one exception: a change to shipped seed or sample data whose values no story, br or contract sets changes no story-tree file\. triage states that in one line of its report and passes with no operation and no decision row, and the later sdd steps then have nothing to write/i,
    );
  });

  it("routes an env-bound defect without repro to fix-env-bound, says what that adds, and reads a diagnostics-only change", async () => {
    const reference = await readShipped(EXTRACTION);
    expect(flat(sectionOf(reference, "## Entry flags"))).toMatch(
      /a defect with `env` and without `repro` takes the environment-bound fix route unless an earlier rule applies, .* that route adds a stage before diagnosis that asks the reporter .* and a stage after verification that confirms the fix there/i,
    );
    const outcome = routingOutcome(
      extraction({
        intent: "defect",
        entryFlags: ["env"],
        artifacts: ["code"],
        confidence: "high",
      }),
    );
    expect("taken" in outcome ? outcome.taken.route : undefined).toBe("fix-env-bound");
    const intents = flat(sectionOf(reference, "## Intent"));
    expect(intents).toMatch(
      /a change that only adds or corrects diagnostic output, .* is `defect` when the missing or wrong output is what the request reports, and `feature` when it asks for new output and reports nothing wrong/i,
    );
  });

  it("separates a changed default on a published surface from one no published surface exposes", async () => {
    const intents = flat(sectionOf(await readShipped(EXTRACTION), "## Intent"));
    expect(intents).toContain(
      "A changed default is `deprecation` when the default belongs to a published surface, such as a public API, a CLI flag or a configuration key, and `behaviour-change` otherwise, when it changes a default that no published surface exposes.",
    );
  });

  // QFAI:AC-0001-0224-02
  // QFAI:EX-0001-0224-02
  it("writes artifacts itself, delegates only parallel parts and reviews, and never reviews its own work", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(/write (?:any )?artifacts? yourself/i);
    expect(work).toMatch(/delegate independent parallel work or review/i);
    expect(work).toMatch(/whose `review` is `spec`, `requirements-reviewer` reviews/);
    expect(work).toMatch(/no agent reviews its own work/i);
  });

  it("runs each step that starts a finder, griller or reviewer at the orchestrator", async () => {
    const work = flat(sectionOf(await readShipped(RUN), "## The work"));
    expect(work).toMatch(
      /a worker starts no finder, griller or reviewer: run each step that starts one yourself/i,
    );
    const protocol = flat(
      sectionOf(
        await readShipped("rule/shared-skill-delegation-baseline.md"),
        "### Orchestrator Protocol",
      ),
    );
    expect(protocol).toMatch(
      /the orchestrator runs every step that starts a finder, griller or reviewer, and starts those agents itself/i,
    );
    for (const step of [
      "sdd-cycle",
      "common-review-cycle",
      "prototyping-grill",
      "prototyping-loop",
    ]) {
      expect(protocol).toContain("`" + step + "`");
    }
    expect(protocol).toMatch(
      /any step that holds a\s+delegated grilling session, such as a pre-draft grilling checkpoint/i,
    );
    expect(protocol).toMatch(/starts no finder, griller or reviewer/i);
    expect(protocol).toMatch(/a finder is a review someone other than the author has to do/i);
    const owners: ReadonlyArray<readonly [string, RegExp]> = [
      ["step/sdd-cycle/STEP.md", /the orchestrator starts it, never a stage worker/i],
      ["step/sdd-triage/STEP.md", /the orchestrator starts the griller, never a stage worker/i],
      [
        "step/common-review-cycle/STEP.md",
        /sends each reviewer a work order in the\s+shared template, never a stage worker/i,
      ],
      [
        "step/prototyping-grill/STEP.md",
        /the orchestrator starts the griller, never a stage worker/i,
      ],
      [
        "step/prototyping-loop/STEP.md",
        /the orchestrator starts every role in the table below, the generator included, and never a stage worker/i,
      ],
      [
        "skill/qfai-sdd/references/sdd-pre-draft-grilling.md",
        /the orchestrator starts the griller; a stage worker starts none/i,
      ],
      [
        "skill/qfai-sdd/references/concrete-abstract-cycle.md",
        /the orchestrator starts it; a stage worker starts none/i,
      ],
      [
        "skill/qfai-sdd/references/sdd-execution-playbook.md",
        /started by the orchestrator and never by a stage worker/i,
      ],
    ];
    for (const [file, owner] of owners) {
      expect(flat(await readShipped(file)), file).toMatch(owner);
    }
  });

  // QFAI:AC-0001-0224-04
  // QFAI:AC-0001-0224-10
  // QFAI:EX-0001-0224-05
  // QFAI:EX-0001-0224-14
  it("moves at a branch point by planning the destination, and asks before the third move", async () => {
    const branch = sectionOf(await readShipped(STAGE_POINTS), "## Branch point");
    const work = flat(branch);
    expect(work).toMatch(
      /take the destination's plan with `npx qfai workflow plan --route <route>`/i,
    );
    expect(work).toMatch(
      /before the third move and every one after it, ask the user, naming the destination in plain words; `stop` ends the work/i,
    );
    const repairAuthority = flat(
      branch
        .split(/\r?\n\s*\r?\n/u)
        .find(
          (paragraph) => /question-only/i.test(paragraph) && /tracked[- ]files?/i.test(paragraph),
        ) ?? "",
    );
    expect(repairAuthority, "the question-only branch needs its own repair authority rule").toMatch(
      /explicit.*repair.*(?:authority|authori[sz]ation)/i,
    );
    expect(repairAuthority).toMatch(/same[- ]target/i);
    expect(repairAuthority).toMatch(/(?:request|user).*project policy/i);
    expect(repairAuthority).toMatch(
      /(?:existing|standing|prior|reuse).*without.*(?:duplicate|another|again).*question/i,
    );
    expect(repairAuthority).toMatch(
      /(?:otherwise|(?:without|absent|no).*authority).*ask.*repair.*report.*stop/i,
    );
    expect(repairAuthority).toMatch(
      /no-question.*(?:without|no).*authority.*report.*stop.*target/i,
    );
    expect(repairAuthority).toMatch(
      /\bno tracked\b[^.]*?(?:open[- ]question|`open-questions\.md`)|\b(?:do not|never)\b[^.]*\b(?:write|record)\b[^.]*\btracked\b[^.]*?(?:open[- ]question|`open-questions\.md`)/i,
    );
    expect(repairAuthority).toMatch(/no-question.*alone.*(?:no|not).*repair.*authority/i);
    const repairChoice = flat(
      sectionOf(await readShipped(SCREENS), "## Repair found by a question-only stage"),
    );
    expect(repairChoice).toMatch(/(?:defect|finding).*evidence|evidence.*(?:defect|finding)/i);
    expect(repairChoice).toMatch(/scope/i);
    expect(repairChoice).toMatch(/planned.*checks|checks.*planned/i);
    expect(repairChoice).toMatch(/Repair.*Report and stop/i);
    expect(repairChoice).toMatch(
      /(?:no|not|never).*(?:edit|write).*(?:before|until).*answer|(?:edit|write) nothing.*(?:before|until).*answer|before.*answer.*(?:edit|write) nothing/i,
    );
  });

  // QFAI:AC-0001-0223-03
  // QFAI:EX-0001-0223-05
  it("handles each release, decision and branch point at its step, inside the step loop", async () => {
    const work = sectionOf(await readShipped(RUN), "## The work");
    const loop = flat(work.split("5. **Run the stages.**")[1]?.split("6. **Review.**")[0] ?? "");
    expect(loop).toMatch(/at a step the plan marks with a point, follow/i);
    expect(loop).toContain("`references/stage-points.md`");
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
  // QFAI:EX-0001-0196-57
  it("takes every other decision itself and lists it with its reason in the final report", async () => {
    const work = flat(sectionOf(await readShipped(STAGE_POINTS), "## Decision point"));
    expect(work).toMatch(
      /take every other decision yourself, ask nothing, and list it with its reason in the final report/i,
    );
    const report = flat(sectionOf(await readShipped(SCREENS), "## Final report"));
    expect(report).toMatch(/every decision taken without the user, with its reason/i);
    expect(report).toMatch(
      /ask for the next action only when proceeding requires the user's answer/i,
    );
    expect(report).toMatch(
      /(?:completion-only.*report|report that only states completion) needs no question/i,
    );
    expect(report).toMatch(/under a no-question mode.*remaining actions without asking/i);
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
    expect(work).toMatch(/, in the `qfai-sdd` decisions template's form\./i);
    expect(work).toMatch(
      /when the release change is produced outside this run \(by a release workflow or bot\), record its approval in the final report with the same four items and list the row as a pending follow-up; the next change that touches `decisions\.md` appends the row, and a `qfai-run` that writes `decisions\.md` appends any pending approval row first/i,
    );
    // The template's release-approval example is a valid Approach cell as it stands.
    const template = await readShipped("skill/qfai-sdd/templates/spec/decisions.md");
    const example = template.split("\n").find((line) => line.startsWith("- Evidence:"));
    expect(example).toBeDefined();
    expect(approachProblems(example ?? "")).toEqual([]);
    expect(release).toMatch(/which authorizes no push, merge, tag or publication/i);
    expect(release).toMatch(
      /record the approval as step 7 of `SKILL\.md` says: a `decisions\.md` row the run writes, or, when the release change is produced outside this run, the final report, with the row appended by the next change that touches `decisions\.md`/i,
    );
    expect(release).toMatch(
      /after approval at a handoff release point, `qfai-run` records the approval as step 7 says before `triage-handoff` runs/i,
    );
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

  // QFAI:AC-0001-0224-10
  // QFAI:EX-0001-0224-14
  it("stops before person-only actions and permits only covered external actions through a safe host channel", async () => {
    const screens = await readShipped(SCREENS);
    const step = flat(sectionOf(screens, "## A step only a person can take"));
    expect(step).toMatch(/what the user must do/i);
    expect(step).toMatch(/what shows it was done/i);
    expect(step).toMatch(/what the agent will read to check it, which changes nothing/i);
    expect(step).toMatch(/interactive login.*new permission.*expansion.*authority/i);
    expect(step).toMatch(
      /user completes.*login.*permission grants.*authority expansion.*service's own page/i,
    );
    expect(step).toMatch(/human-run.*triage handoff.*never.*user's operation.*behalf/i);
    expect(step).toMatch(/no-question mode.*nothing is asked.*does not depend.*goes on.*not done/i);

    const paragraphs = sectionOf(screens, "## Authorized external actions")
      .split(/\r?\n\s*\r?\n/u)
      .map(flat);
    const authority =
      paragraphs.find((paragraph) => /specific target.*action/i.test(paragraph)) ?? "";
    expect(authority).toMatch(
      /only when.*prior user instructions.*project policy.*specific target.*action/i,
    );
    expect(authority).toMatch(/host.*allowed.*safe channel/i);
    expect(authority).toMatch(/connector.*availability alone.*neither authority nor access/i);
    expect(authority).toMatch(/reuse.*covering authority.*without.*new permission grant/i);

    const credential =
      paragraphs.find((paragraph) => /credential.*account.*scope.*expiry/i.test(paragraph)) ?? "";
    expect(credential).toMatch(
      /actual credential.*account.*project.*scope.*expiry.*fit.*authority/i,
    );
    expect(credential).toMatch(/one-time permission.*not continuing access/i);
    expect(credential).toMatch(
      /third-party.*ownership.*own authority.*permission.*project.*does not supply/i,
    );
    expect(credential).toMatch(/only.*host's actual safe channel.*credential installation/i);
    expect(credential).toMatch(
      /never.*password.*token.*key.*chat.*logs.*tracked files.*ask.*paste/i,
    );
    expect(credential).toMatch(/login.*permission grants.*authority expansion.*person-only/i);

    const refusal = paragraphs.find((paragraph) => /host denies/i.test(paragraph)) ?? "";
    expect(refusal).toMatch(
      /authority.*credential ownership.*safe channel.*absent or unknown.*host denies.*stop.*dependent action/i,
    );
    expect(refusal).toMatch(/manual steps.*evidence.*confirm.*read-only.*check/i);
    expect(refusal).toMatch(
      /do not bypass.*denial.*infer missing authority.*generic request.*proceed/i,
    );
    expect(refusal).toMatch(
      /human-run.*triage handoff.*handoff.*authorized independent work.*continue/i,
    );

    const report = paragraphs.find((paragraph) => /existing stage report/i.test(paragraph)) ?? "";
    expect(report).toMatch(
      /host access.*CI start.*authorization.*credential installation.*CI results.*merge.*publication.*separately/i,
    );
    expect(report).toMatch(/each.*effect.*confirmed.*pending.*unverified.*not requested/i);
    expect(report).toMatch(
      /target.*exact.*(?:revision|head).*evidence URL.*blocker.*resume condition/i,
    );
    expect(report).toMatch(/missing evidence.*unverified/i);
    expect(report).toMatch(/green CI.*neither merge nor publication/i);
    expect(report).toMatch(/repository change.*separately.*unverified external effects/i);
    const extraction = flat(await readShipped(EXTRACTION));
    expect(extraction).toMatch(
      /takes the intent of the repository change, with the entry flag `env`/i,
    );
    expect(extraction).toMatch(/`human-run`.*request that is only the operation/i);
    expect(flat(await readShipped("step/triage-handoff/STEP.md"))).toMatch(
      /run none of the operation here.*no push.*publication.*tag.*account/i,
    );
    expect(await readDefault("workflows/hand-off-operation.yml")).toMatch(
      /releasePoint: triage-handoff/,
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

describe("qfai-sdd pending test annotations", () => {
  async function guidance(): Promise<string> {
    const text = flat(sectionOf(await readShipped(SDD_TRIAGE), "## Decision and question rows"));
    expect(text).not.toBe("");
    return text;
  }

  // QFAI:AC-0001-0207-07
  // QFAI:EX-0001-0207-08
  it("permits an explicit pending annotation only with specification authority and approved test deferral", async () => {
    const text = await guidance();
    expect(text).toMatch(/annotations?.*pending|pending.*annotations?/i);
    expect(text).toContain("Test exception:");
    expect(text).toMatch(/exact AC\b/i);
    expect(text).toMatch(/\bDONE\b/);
    expect(text).toMatch(/(?:authority|permission|approval).*(?:change|edit).*spec/i);
    expect(text).toMatch(
      /(?:approval|authorization).*defer.*test|test deferral.*(?:approved|authorized)/i,
    );
  });

  // QFAI:AC-0001-0207-07
  // QFAI:EX-0001-0207-08
  it("records the reason, untested scope, owner, next decision date and annotation restoration condition", async () => {
    const text = await guidance();
    for (const field of [
      /reason/i,
      /untested scope/i,
      /owner/i,
      /next decision date/i,
      /restor.*annotation.*condition|condition.*restor.*annotation/i,
    ])
      expect(text).toMatch(field);
  });

  // QFAI:AC-0001-0207-07
  // QFAI:EX-0001-0207-08
  it("keeps DONE approval distinct from test completion and limits the exception to its exact AC", async () => {
    const text = await guidance();
    expect(text).toMatch(
      /\bDONE\b.*(?:does not|never|not).*test.*(?:completion|complete|passed|done)/i,
    );
    expect(text).toMatch(/exact AC\b/i);
    expect(text).toMatch(/(?:never|does not|no).*exempt.*descendant/i);
    expect(text).toMatch(/(?:EX|examples).*BR|BR.*(?:EX|examples)/i);
  });

  // QFAI:AC-0001-0207-07
  // QFAI:EX-0001-0207-09
  it("opens an Unadjudicated record and halts dependent changes when specification permission is absent", async () => {
    const text = await guidance();
    expect(text).toMatch(
      /spec.*(?:forbidden|not permitted|not authorized)|(?:no|missing).*permission.*spec/i,
    );
    expect(text).toContain("Unadjudicated:");
    for (const field of [
      /expected/i,
      /actual/i,
      /\bIDs\b/i,
      /evidence/i,
      /owner/i,
      /required permission/i,
    ])
      expect(text).toMatch(field);
    expect(text).toMatch(/(?:stop|halt).*dependent.*\bAC\b.*\bEX\b.*\bBR\b/i);
    expect(text).toMatch(
      /independent.*(?:authorized|permitted).*work.*(?:continue|proceed)|(?:authorized|permitted).*independent.*work.*(?:continue|proceed)/i,
    );
  });

  // QFAI:AC-0001-0207-07
  // QFAI:EX-0001-0207-10
  it("uses the date for manual follow-up without promising automatic expiry or warnings", async () => {
    const text = await guidance();
    expect(text).toMatch(/date.*manual|manual.*date/i);
    expect(text).toMatch(/(?:no|not|never|does not).*automatic.*expir/i);
    expect(text).toMatch(/(?:no|not|never|does not).*automatic.*warning/i);
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
    const returns = flat(sectionOf(skill, "## Stage report"));
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

  // QFAI:EX-0001-0220-53
  it("lets the resolve-conflicts route keep each side's records and stops on content neither side had", async () => {
    const skill = await readShipped(MAINTAIN_EDIT);
    expect(flat(sectionOf(skill, "## Non-goals"))).toMatch(
      /except as \[Resolving conflicts\]\(#resolving-conflicts\) allows/i,
    );
    const resolving = flat(sectionOf(skill, "## Resolving conflicts"));
    expect(resolving).toMatch(/in the `resolve-conflicts` route/i);
    expect(resolving).toContain(
      "Fetch the base (`git fetch`), then on a clean tree, before the merge, renumber every `decisions.md` row the branch added, from the lowest one whose ID the fetched base now declares upward, lowest first, by the `npx qfai sdd renumber-decision` procedure in `.qfai/assistant/skill/qfai-sdd/references/sdd-triage.md` (two branches taking the same ID), and commit after each run.",
    );
    expect(resolving).toContain(
      "When a merge has already stopped with conflicts, run `git merge --abort`, renumber, and merge again.",
    );
    expect(resolving).toContain("Start or resume the merge with `git merge --no-commit <base>`.");
    expect(resolving).toContain(
      "The base's item keeps its ID; never rename it. An item the branch added whose ID collides takes the next free ID of its scope, with every citation of it.",
    );
    expect(resolving).toContain("Every other edit only keeps what one side already had");
    expect(resolving).toContain("Content neither side had is a semantic effect.");
    expect(resolving).toContain(
      "When both sides changed the same record, keeping both is a semantic effect: stop.",
    );
    expect(resolving).toContain(
      "An ID that two records already share on one history before this merge, carried in by an earlier merge, is a semantic effect: stop.",
    );
    expect(resolving).toContain("A conflict in code, or in a file listed under");
    expect(resolving).toContain("such as a generated file or a lockfile, stops");
    expect(flat(sectionOf(skill, "## Never a maintenance edit"))).toContain(
      "SQL, generated files and lockfiles;",
    );
    expect(flat(sectionOf(skill, "## The edit"))).toContain(
      "except a renumber [Resolving conflicts](#resolving-conflicts) allows",
    );
    expect(flat(sectionOf(skill, "## Stage report"))).toContain(
      "the base, each renumber as old → new, and the combined diff of each resolved path, taken with `git diff` before it is staged, and `git diff` of every path the renumbers touched. Every added line is inside one side's text, except the ID changes that list names.",
    );
    expect(flat(sectionOf(skill, "## Gate"))).toContain(
      "The combined diff passes the added-line check before `verify-commit` commits.",
    );
    const commit = flat(await readShipped("step/verify-commit/STEP.md"));
    expect(commit).toContain(
      "first confirm that the combined diff in the stage report passed the added-line check, then stage the resolved paths and conclude the merge in progress with `git commit` and a message that names the base and gives each renumber as old → new with the renamed record's subject or path.",
    );
    expect(commit).not.toContain("--no-edit");
    expect(commit).toContain("3. Otherwise, commit with a message in the project's convention");
    expect(flat(sectionOf(await readShipped("step/verify-commit/STEP.md"), "## Writes"))).toContain(
      "In the `resolve-conflicts` route, also each renumber commit the run made, including one left after `git reset --merge ORIG_HEAD`.",
    );
    expect(flat(sectionOf(await readShipped("step/verify-commit/STEP.md"), "## Gate"))).toContain(
      "The final report names each renumber commit the run made, including one left after `git reset --merge ORIG_HEAD`.",
    );
    expect(commit).toContain(
      "Record `git show --remerge-diff` of that commit in the stage report.",
    );
    expect(commit).toContain(
      "A check that fails after the commit undoes it with `git reset --merge ORIG_HEAD`, which is allowed before a push, and the run stops.",
    );
    expect(commit).toContain(
      "except concluding the merge in progress of the `resolve-conflicts` route",
    );
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

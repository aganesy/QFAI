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
const PAYLOADS = "skill/qfai-run/references/payloads.md";
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

// The proposal of the routing result example the payload reference shows.
function routingProposal(payloads: string): Record<string, unknown> {
  const block = payloads.split("## Routing result")[1]?.split("```json\n")[1]?.split("```")[0];
  const result: unknown = JSON.parse(block ?? "null");
  return isRecord(result) && isRecord(result.proposal) ? result.proposal : {};
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

  // QFAI:AC-0001-0190-01
  // QFAI:EX-0001-0190-01
  it("starts a run only for a routed request, a question included, and serves every other kind another way", async () => {
    const text = flat(sectionOf(await readShipped(RUN), "## Request kinds"));
    expect(text).toMatch(/only `routed` calls `start`/i);
    expect(text).toMatch(/`routed`: a change, a question, a proposal to decide or a report/i);
    expect(text).toMatch(/a question runs a route that answers it and changes nothing/i);
    expect(text).toMatch(/`resume`, or `continue` on a run in progress: call `resume`/i);
    expect(text).toMatch(/`cancel`: call `decision` with `stop`/i);
    expect(text).toMatch(/`explicit_stage`, `verify_only`: invoke the stage skill by name/i);
    const everyFile = await Promise.all(
      (await filesUnder(path.join(SHIPPED_ASSISTANT, "skill", "qfai-run"))).map((file) =>
        readFile(file, "utf-8"),
      ),
    );
    expect(everyFile.join("\n")).not.toMatch(/read_only|plan_only/);
  });

  // QFAI:AC-0001-0211-05
  // QFAI:EX-0001-0211-35
  it("defines every extraction value, shows a routing result with an extraction and no route, and names no route", async () => {
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

    const proposal = routingProposal(await readShipped(PAYLOADS));
    const extraction = isRecord(proposal.extraction) ? proposal.extraction : {};
    expect(Object.keys(proposal)).not.toContain("candidateRoute");
    expect(Object.keys(proposal)).not.toContain("route");
    expect(Object.keys(extraction).sort()).toEqual(Object.keys(EXTRACTION_VOCABULARIES).sort());
    expect(outsideVocabulary(extraction)).toEqual([]);

    const skill = flat(await readShipped(RUN));
    expect(skill).toMatch(
      /choose a route\. the cli's decision rules choose it from the extraction/i,
    );
    expect(skill).toMatch(/write the routing result around it, naming no route/i);
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
    expect(routes.length).toBe(39);
    expect(naming).toEqual([]);
  });

  // QFAI:AC-0001-0213-06
  // QFAI:EX-0001-0213-06
  it("relays the route question with plain options, the recommendation apart, and answers it with the first option under a no-question mode", async () => {
    const questions = sectionOf(await readShipped(SCREENS), "## Questions");
    const row = rowOf(questions, "The route question");
    expect(row).toMatch(/one option per reading of the request, two or three/i);
    expect(row).toMatch(
      /a short label and one sentence on what that route will change and check, with no route identifier/i,
    );
    expect(row).toMatch(/the recommendation stands on a line of its own/i);
    expect(row).toMatch(/the question says one may be chosen/i);
    const text = flat(questions);
    expect(text).toMatch(
      /its options come in the order the decision rules reach them, and it recommends the main reading/i,
    );
    expect(text).toMatch(
      /`qfai-run` chooses nothing between the readings while a question can be put/i,
    );
    expect(text).toMatch(
      /under a no-question mode `qfai-run` answers it itself with `decision` and the first option/i,
    );
    expect(text).toMatch(/the completion report lists that choice as an assumption/i);
    expect(flat(sectionOf(await readShipped(RUN), "## The run"))).toMatch(
      /under `--auto` the route question is not put: answer it with `decision` and its first option/i,
    );
    expect(
      flat(sectionOf(await readShipped(EXTRACTION), "## Confidence and alternatives")),
    ).toMatch(
      /never raise it to avoid a question or lower it to cause one, under `--auto` included/i,
    );
  });

  // QFAI:AC-0001-0192-01
  // QFAI:EX-0001-0192-02
  it("writes nothing under shadow and starts no run under off", async () => {
    const mode = sectionOf(await readShipped(RUN), "## Mode");
    expect(flat(mode)).toMatch(/read the mode from `npx qfai workflow status` first/i);
    expect(rowOf(mode, "`shadow`")).toMatch(
      /call no write operation, and say that nothing was written/i,
    );
    expect(rowOf(mode, "`off`")).toMatch(
      /start no run\. the operator invokes the stage skills by name/i,
    );
  });

  // QFAI:AC-0001-0185-13
  // QFAI:EX-0001-0185-40
  it("names the narrowest write areas per stage kind, and never a stage's own records", async () => {
    const text = sectionOf(await readShipped(PAYLOADS), "## Routing result");
    expect(rowOf(text, "`sdd`")).toMatch(
      /the story and contract files of the bound flow it changes/i,
    );
    expect(rowOf(text, "| `sdd` ")).toMatch(/the new story's directory or the new flow's/i);
    expect(rowOf(text, "| `sdd` ")).toMatch(/and `DESIGN\.md` for a UI-bearing flow/i);
    expect(rowOf(text, "`discussion`")).toMatch(/\| Its tracked records +\|/);
    expect(rowOf(text, "`triage` and `diagnose`")).toMatch(/\| Nothing +\|/);
    const flatText = flat(text);
    expect(flatText).toMatch(
      /never names `\.git\/`, `\.qfai\/run\/`, `\.qfai\/evidence\/workflow\/`, `\.qfai\/evidence\/decision\/`/,
    );
    expect(flatText).toMatch(/`decisions\.md` or `open-questions\.md` under `paths\.specsDir`/);
  });

  it("proposes flows and new stories, never spec packs", async () => {
    const text = flat(await readShipped(PAYLOADS));
    expect(text).toMatch(/"affectedFlowIds": \["BF-0002"\]/);
    expect(text).toMatch(/"newStories": \[\]/);
    expect(text).toMatch(/`newStories` holds `\{ goal, covers, excludes, evidence, flowId \}`/);
    expect(text).not.toMatch(/affectedSpecIds|newCapabilities|spec-id|\.qfai\/runs\//);
  });

  // QFAI:AC-0001-0189-06
  // QFAI:EX-0001-0189-14
  it("offers recovery as a reverse diff of the run's own paths only", async () => {
    const text = flat(sectionOf(await readShipped(SCREENS), "## Halt notice"));
    expect(text).toMatch(/recovery is a reverse diff limited to the paths the run wrote/i);
    expect(text).toMatch(/never offer a reset, a stash, a branch switch or a worktree removal/i);
  });

  // QFAI:AC-0001-0194-05
  // QFAI:EX-0001-0194-17
  it("The operator-screens reference relays CLI strings in the operator's working language", async () => {
    const text = flat(sectionOf(await readShipped(SCREENS), "## Every screen"));
    expect(text).toMatch(
      /relay it in the operator's working language\. the cli's strings are english/i,
    );
  });

  // QFAI:EX-0001-0185-07
  it("announces the checked plan in plain words, naming no route or stage identifier and asking nothing", async () => {
    const screens = await readShipped(SCREENS);
    expect(flat(sectionOf(screens, "## Every screen"))).toMatch(
      /no route identifier, stage kind or internal id/i,
    );
    expect(flat(sectionOf(screens, "## The announcement"))).toMatch(/it asks nothing/i);
  });

  // QFAI:AC-0001-0185-05
  // QFAI:EX-0001-0185-55
  it("ends a run at finish or at a stop, and never on an answer already given", async () => {
    const text = flat(sectionOf(await readShipped(RUN), "## The run"));
    expect(text).toMatch(/a run ends at `finish`, or at `decision` with `stop`/i);
    expect(text).toMatch(/an answer already given does not end it/i);
    expect(text).toMatch(/when the session must end first, stop the run and say so/i);
  });

  // QFAI:AC-0001-0214-07
  // QFAI:EX-0001-0214-10
  it("runs a review only when the work order names reviewers, and a question as one work order", async () => {
    const text = flat(sectionOf(await readShipped(RUN), "## The run"));
    expect(text).toMatch(
      /one review, by `requiredreviewerroles`, and none when the work order names none/i,
    );
    expect(text).toMatch(
      /a question is one work order, run by one sub-agent with no separate reviewer/i,
    );
  });

  // QFAI:AC-0001-0185-17
  // QFAI:EX-0001-0185-54
  it("ends the completion report with the next actions, and asks nothing under a no-question mode", async () => {
    const text = flat(sectionOf(await readShipped(SCREENS), "## Completion report"));
    expect(text).toMatch(
      /the report ends with a question listing the next actions, the recommended one first/i,
    );
    expect(text).toContain("`.agents/rules/user-questions.md` § 6");
    expect(text).toMatch(/under a no-question mode it lists them instead/i);
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

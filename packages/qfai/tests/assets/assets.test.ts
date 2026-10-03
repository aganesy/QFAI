import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit, SHIPPED_WORKFLOW_NAMES } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { defaultConfig } from "../../src/core/config.js";
import { PROTOTYPING_SUPPORTED_SURFACES } from "../../src/core/review/prototyping.js";
import { parseAllMarkdownTables } from "../../src/core/specPackParsers.js";
import { readImplementFlowSteps } from "../helpers/implementSteps.js";
import { findTableArityMismatches } from "../helpers/markdownTableArity.js";
import { validateSkillDocReferences } from "../../src/core/validators/skillDocReferences.js";
import {
  findRepositoryAttribution,
  formatAttributionOffender,
  isBinary,
  listShippedAssistantFiles,
} from "../helpers/repositoryAttribution.js";
import {
  classifyHardRequiredEntries,
  collectHardRequiredEntries,
  HARD_REQUIRED_COMMON_ENTRIES,
  RETIRED_HARD_REQUIRED_ENTRIES,
} from "../../src/core/validators/autopilotPolicy.js";
import {
  ASSISTANT_ASSET_MAX_LINE_CHARS,
  countLines,
  LINE_BUDGET_EXEMPT,
  SKILL_MD_MAX_LINES,
  WIDTH_BACKLOG_PATHS,
  WIDTH_BUDGET_BACKLOG,
  widestMeasurableLine,
} from "../helpers/skillBudget.js";
import { readDiscussionSkill } from "../helpers/discussionSteps.js";
import { readDefaultRoutingText } from "../helpers/shippedAssistant.js";
import { shapeValueLiterals } from "../integration/shippedWorkflowShape.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateRootDir = path.join(templateRoot, "root");
const templateQfaiDir = path.join(templateRoot, ".qfai");
const assistantDir = path.join(templateQfaiDir, "assistant");
const defaultsDir = path.join(repoRoot, "packages", "qfai", "assets", "defaults");

/** The prototyping skill's shipped files: the parent and every `prototyping-*` step. */
async function prototypingProcedureFiles(): Promise<string[]> {
  const files = await fg(["skill/qfai-prototyping/SKILL.md", "step/prototyping-*/STEP.md"], {
    cwd: assistantDir,
    absolute: true,
  });
  return files.sort();
}

/** The prototyping skill as an agent reads it, parent and steps in one text. */
async function readPrototypingProcedure(): Promise<string> {
  const files = await prototypingProcedureFiles();
  return (await Promise.all(files.map((file) => readFile(file, "utf-8")))).join("\n");
}

// --- shipped iteration-budget vocabulary -----------------------------------
// `qfai-discussion` owns no iteration budget and may not print a number for
// one at all.
const BUDGET_NOUN = String.raw`(?:cycles?|iterations?)`;
const BUDGET_CAP = String.raw`(?:cap(?:ped|s)?|budget|limit(?:ed|s)?|max(?:imum)?|total|at\s+most|up\s+to)`;
// Gaps stay inside one clause (no `.`, `;` or newline) so
// `Iteration count cap is 10; ... reaching cycle 9 ...` yields 10, not 9.
const BUDGET_GAP = String.raw`[^.;\n]{0,24}?`;

type BudgetLiteralPattern = {
  readonly label: string;
  readonly re: RegExp;
};

const BUDGET_LITERAL_PATTERNS: readonly BudgetLiteralPattern[] = [
  {
    label: "terminal index",
    re: /(?:cycles?\s+1\.\.|\bC1\.\.|index\s*===\s*)(\d+)/gi,
  },
  {
    label: "count before the noun",
    re: /\b(\d+)(?:\s+(?:cycles|iterations)|-(?:cycle|iteration))\b/gi,
  },
  {
    // `Iteration count cap is 10`, `cycle limit: 10`, `max-iterations: 10`.
    // A cap word is required: without it every `--cycle 0` would be flagged.
    label: "count after the noun",
    re: new RegExp(
      String.raw`\b(?:${BUDGET_NOUN}${BUDGET_GAP}${BUDGET_CAP}|${BUDGET_CAP}${BUDGET_GAP}${BUDGET_NOUN})${BUDGET_GAP}\b(\d+)\b`,
      "gi",
    ),
  },
];

// No number near the noun at all, cap word or not.
const BUDGET_RESTATEMENT_PATTERNS: readonly { readonly label: string; readonly re: RegExp }[] = [
  ...BUDGET_LITERAL_PATTERNS.map(({ label, re }) => ({ label, re })),
  {
    label: "bare count adjacent to the noun",
    re: new RegExp(String.raw`\b${BUDGET_NOUN}\b[^.\n]{0,40}?\b\d+\b`, "gi"),
  },
  { label: "loose range", re: /\b(?:C|cycles?|iterations?)\s*\d+\s*\.\.\s*\d+/gi },
];

/** Any numeric restatement of the budget, for surfaces that must only point at it. */
function findBudgetRestatements(content: string): string[] {
  return BUDGET_RESTATEMENT_PATTERNS.flatMap(({ label, re }) =>
    [...content.matchAll(re)].map((match) => `${match[0]} [${label}]`),
  );
}

// --- hard-coded versions in shipped documents ------------------------------
// A shipped document must not pin the version of anything it runs on: the
// number goes stale in the adopter's tree, where nobody is watching it.
//
// A published standard's clause number has the same shape and none of that
// problem — `WCAG 3.3.2` will mean the same thing for as long as the standard
// exists. What separates them is not the digits but whether something names
// the number as a version, so that is what the patterns below require: a
// leading `v`, or a name in front of it.

/** Names whose number is a version of something this repository ships or runs on. */
const VERSION_BEARING = [
  "qfai",
  "node\\.js",
  "node",
  "pnpm",
  "npm",
  "typescript",
  "vitest",
  "tsup",
  "eslint",
  "prettier",
  "version",
].join("|");

const VERSION_SHAPES: readonly RegExp[] = [
  // `v2.0.1`, `v1.11` — the prefix says it is a version on its own.
  /\bv\d+\.\d+(?:\.\d+)?\b/g,
  // `qfai 1.11.1`, `pnpm@9.12.3`, `version: 1.4.0` — the name says it.
  new RegExp(String.raw`\b(?:${VERSION_BEARING})[\s@:]+v?\d+\.\d+(?:\.\d+)?\b`, "gi"),
];

// A number a contract requires a document to state. It names a fixed thing
// rather than something the adopter runs on, so it does not go stale. Each
// entry is one file and one exact match: any other version in that file fails.
const REQUIRED_VERSION_MENTIONS: readonly { readonly file: string; readonly version: string }[] = [
  // The value the review artifact contract fixes for `summary.json`.
  { file: "review-artifact-layout.md", version: "version 2.0" },
  // The release the migration guide is about. The migration contract requires
  // the guide to name it, without a `v`.
  {
    file: "qfai-migration-v1-to-v2/references/migration-guide.md",
    version: "QFAI 2.0.0",
  },
];

function isRequiredVersionMention(filePath: string, version: string): boolean {
  const normalized = filePath.split(path.sep).join("/");
  return REQUIRED_VERSION_MENTIONS.some(
    (entry) => normalized.endsWith(`/${entry.file}`) && version === entry.version,
  );
}

/** Every version a document pins, as written. Empty means it pins none. */
function hardCodedVersions(markdown: string): string[] {
  return VERSION_SHAPES.flatMap((shape) => [...markdown.matchAll(shape)].map((match) => match[0]));
}

describe("assets guardrails", () => {
  it("checks relative path references in markdown", async () => {
    const markdownFiles = await fg(
      ["README.md", "docs/**/*.md", "packages/qfai/assets/init/**/*.md"],
      {
        cwd: repoRoot,
        absolute: true,
      },
    );

    const missing: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      const refs = extractPathReferences(content);
      for (const ref of refs) {
        if (shouldSkipReference(ref)) {
          continue;
        }
        const candidates = buildCandidates(filePath, ref);
        if (!candidates.some((candidate) => existsSync(candidate))) {
          missing.push(`${ref} (${path.relative(repoRoot, filePath)})`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("ensures skills include completion contract and navigation sections", async () => {
    // The prototyping skill is read as its parent and its steps together:
    // the parent states completion, the steps carry the process and the
    // loop's critical constraints.
    const lower = (await readPrototypingProcedure()).toLowerCase();
    const required = ["critical constraints", "process", "completion"];
    expect(required.filter((section) => !lower.includes(section))).toEqual([]);
  });

  it("ensures canonical skills include delegation guardrails", async () => {
    const canonicalDir = path.join(templateQfaiDir, "assistant", "skill");
    const canonical = await fg(["*/SKILL.md"], {
      cwd: canonicalDir,
      absolute: true,
    });

    expect(canonical.length).toBeGreaterThan(0);

    const delegated = new Set([
      "qfai-atdd",
      "qfai-implement",
      "qfai-migration-v1-to-v2",
      "qfai-sdd",
    ]);
    const missing = (
      await Promise.all(
        canonical
          .filter((filePath) => delegated.has(path.basename(path.dirname(filePath))))
          .map(async (filePath) => {
            const content = await readFile(filePath, "utf-8");
            return content.includes("rule/shared-skill-delegation-baseline.md")
              ? null
              : path.relative(repoRoot, filePath);
          }),
      )
    ).filter((result): result is string => result !== null);

    expect(
      canonical.filter((filePath) => delegated.has(path.basename(path.dirname(filePath)))),
    ).toHaveLength(delegated.size);

    expect(missing).toEqual([]);
  });

  it("ensures shared delegation baseline defines hard-stop payload and capability probe contract", async () => {
    const baselinePath = path.join(
      templateQfaiDir,
      "assistant",
      "rule",
      "shared-skill-delegation-baseline.md",
    );
    const baseline = await readFile(baselinePath, "utf-8");
    const requiredHardStopPayload = [
      "Attempt the first required delegation at stage start using the platform's native delegation mechanism.",
      "Treat that first real delegation attempt as the capability check. Do not gate execution on preflight availability questions or synthetic probe-only checks.",
      // Delegation failure splits into unavailable vs saturated, so the
      // response is class-dependent; the invariant that survives is that a
      // failure is never answered by simulating roles or self-executing.
      "If the delegation fails, classify the failure first",
      "Never simulate roles and never continue with self-execution",
      "Delegation failure:",
      "Attempted role:",
      "Attempted task:",
      "Why stopped: QFAI requires real sub-agent delegation in this environment.",
      "User action needed:",
      "Retry condition: rerun after the required delegation succeeds",
    ];

    for (const phrase of requiredHardStopPayload) {
      expect(baseline).toContain(phrase);
    }
  });

  it("ensures shared operating baseline defines gate failure autorepair protocol", async () => {
    const baselinePath = path.join(
      templateQfaiDir,
      "assistant",
      "rule",
      "shared-skill-operating-baseline.md",
    );
    const baseline = await readFile(baselinePath, "utf-8");
    const requiredPhrases = [
      "## Gate Failure Autorepair Protocol",
      "validate, doctor, test, lint, typecheck, build, capture, or report gates fail",
      "inspect exit code, logs, `validate.json`, and cited files before reporting",
      "skill-owned artifact, upstream spec/contract, code/test defect, environment/tooling, or user decision",
      "fix skill-owned artifacts and code/test defects autonomously",
      "rerun the same failing gate after each fix batch",
      "do not weaken profiles, lower `--fail-on`, waive errors, invent evidence, or skip required reviewers",
      // A second stop condition (reviewer round count) means the
      // list is not exhaustive, so "only" does not appear.
      // The stop list includes `**any upstream spec/contract finding**` so it
      // is closed over the five-class classification; the routing
      // itself is pinned in `gateFailureClassRouting.test.ts`.
      "stop for destructive changes, **any upstream spec/contract finding**, ambiguous product/spec decisions, missing permissions/tools, or repeated no-progress failures",
      // The work counts matter: an agent that can report "21 complete,
      // 5 blocked" has a credible alternative to repairing upstream.
      "cause, attempted fixes, remaining blocker, user action, retry gate, and **the work counts",
    ];

    for (const phrase of requiredPhrases) {
      expect(baseline).toContain(phrase);
    }
  });

  it("ensures gate-running QFAI skills reference the autorepair protocol", async () => {
    const requiredBySkill = new Map([
      ["qfai-discussion", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
      ["qfai-sdd", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
      ["qfai-implement", "rule/shared-skill-operating-baseline.md"],
      ["qfai-verify", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
      ["qfai-configure", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
    ]);

    // A split skill runs its gates in its steps, so the skill body and the
    // steps it owns are read together.
    const stepFiles = await fg(["*/STEP.md"], {
      cwd: path.join(assistantDir, "step"),
      absolute: true,
    });
    const steps = await Promise.all(stepFiles.map((file) => readFile(file, "utf-8")));
    const ownedBy = (skill: string): string[] =>
      steps.filter((step) => new RegExp(`^owner: ${skill}$`, "m").test(step));
    const missing = (
      await Promise.all(
        [...requiredBySkill].map(async ([skill, requiredPhrase]) => {
          const skillPath = path.join(templateQfaiDir, "assistant", "skill", skill, "SKILL.md");
          const content = [await readFile(skillPath, "utf-8"), ...ownedBy(skill)].join("\n");
          return content.includes(requiredPhrase) ? null : skill;
        }),
      )
    ).filter((skill): skill is string => skill !== null);

    expect(missing).toEqual([]);
  });

  it("ensures canonical skills avoid deprecated simulation fallback wording", async () => {
    const canonicalDir = path.join(templateQfaiDir, "assistant", "skill");
    const canonical = await fg(["*/SKILL.md"], {
      cwd: canonicalDir,
      absolute: true,
    });

    const forbiddenPhrases = [
      "### Simulation mode (Opt-in only)",
      "Simulation mode allowed",
      "This workflow assumes the environment _may_ support subagents",
      "### If subagents are NOT supported",
      "Task(",
    ];

    const offenders = (
      await Promise.all(
        canonical.map(async (filePath) => {
          const content = await readFile(filePath, "utf-8");
          const found = forbiddenPhrases.filter((phrase) => content.includes(phrase));
          if (found.length === 0) {
            return null;
          }
          return `${path.relative(repoRoot, filePath)}: ${found.join(", ")}`;
        }),
      )
    ).filter((result): result is string => result !== null);

    expect(offenders).toEqual([]);
  });

  it("ensures shipped assistant prose never attributes a concrete artifact id to this repository", async () => {
    // Every file under assistant/ is copied verbatim by `qfai init`, so
    // "this repository" resolves to the consuming project. Pairing that phrase
    // with a concrete `spec-NNNN` / `TC-NNNN-NNNN` / `API-NNNN` id
    // therefore asserts a fact about an artifact the consumer does not have.
    //
    // The matcher, the soft-wrap normalizer and the file list live in
    // `tests/helpers/repositoryAttribution.ts`; what stays here is the scan of
    // the shipped tree. `tests/assets/repositoryAttributionGuard.test.ts`
    // covers the matcher's own behaviour, so the two cannot drift.
    const assistantDir = path.join(templateQfaiDir, "assistant");
    const files = await listShippedAssistantFiles(assistantDir);

    const offenders = (
      await Promise.all(
        files.map(async (filePath) => {
          const raw = await readFile(filePath);
          if (isBinary(raw)) {
            return null;
          }
          const found = findRepositoryAttribution(raw.toString("utf-8"));
          return found === null ? null : formatAttributionOffender(repoRoot, filePath, found);
        }),
      )
    ).filter((result): result is string => result !== null);

    expect(offenders).toEqual([]);
  });

  it("ensures configure and verify delegation order follows routing SSOT", async () => {
    const configurePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-configure",
      "SKILL.md",
    );
    const verifyPath = path.join(assistantDir, "step", "verify-context", "STEP.md");

    const [routing, configure, verify] = await Promise.all([
      readDefaultRoutingText(),
      readFile(configurePath, "utf-8"),
      readFile(verifyPath, "utf-8"),
    ]);

    expect(routing).toContain("skill: qfai-configure");
    expect(routing).toContain("mandatory_agents: [delivery-planner, qa-strategist]");
    expect(routing).toContain("step: verify-context");
    expect(routing).toContain("mandatory_agents: [delivery-planner, qa-strategist]");
    expect(existsSync(path.join(assistantDir, "manifest"))).toBe(false);

    expect(configure).toContain(
      "Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.",
    );
    expect(configure).toContain(
      "First required delegation / Capability Probe: `delivery-planner` in the `analysis` phase.",
    );
    expect(configure).toContain(
      "Then follow routed phases in order: `analysis` (`delivery-planner`, `qa-strategist`) -> `config` (`devops-ci-engineer`) -> `review` (`completion-reviewer`, `qa-gatekeeper`).",
    );
    expect(configure).toContain(
      "Do not prepend non-routed roles before the first required delegation attempt.",
    );

    expect(verify).toContain("Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.");
    expect(verify).toContain(
      "First required delegation / Capability Probe: `delivery-planner` in the `plan` phase.",
    );
    expect(verify).toContain(
      "Then follow routed phases in order: `plan` (`delivery-planner`, `qa-strategist`) -> `execution` (`devops-ci-engineer`) -> `review` (`qa-gatekeeper`, `completion-reviewer`, optional `implementation-reviewer` when code fixes are in scope).",
    );
    expect(verify).toContain(
      "Do not prepend non-routed roles before the first required delegation attempt.",
    );
  });

  it("keeps qfai-verify fix-until-PASS contract", async () => {
    const stepPath = path.join(assistantDir, "step", "verify-repo-gate", "STEP.md");
    const content = await readFile(stepPath, "utf-8");

    expect(content).toContain("Fix until PASS.");
    expect(content).toContain("If failing, produce an actionable fix list");
  });

  it("keeps qfai-verify evidence summary contract", async () => {
    const stepPath = path.join(assistantDir, "step", "verify-repo-gate", "STEP.md");
    const content = (await readFile(stepPath, "utf-8")).replace(/\s+/g, " ");

    expect(content).toContain("concise evidence summary (copy‑paste for PR)");
    expect(content).toContain("Change Classification (Primary/Tags)");
    expect(content).toContain("Run listed commands and record outputs.");
    expect(content).toContain("the next actions included");
  });

  it("ensures qfai-prototyping v2.0 SKILL.md preserves drift protocol and 4 references", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    // Drift protocol marker (anti-improvisation guardrail) survives v2.0.
    expect(await readFile(skillPath, "utf-8")).toContain("[DRIFT-PROTOCOL:MANDATORY]");

    // The 4 v2.0 references must all be cited by the steps that use them.
    const content = await readPrototypingProcedure();
    expect(content).toContain("references/iteration-loop.md");
    expect(content).toContain("references/generator-prompt.md");
    expect(content).toContain("references/reviewer-prompt.md");
    expect(content).toContain("references/handoff.md");
  });

  it("keeps every file the prototyping loop writes under .qfai/prototype", async () => {
    const content = await readPrototypingProcedure();

    expect(content).toContain("<contractsDir>/ui/");
    expect(content).toContain("DESIGN.md");
    expect(content).toContain(".qfai/prototype/iter-NN/index.html");
    expect(content).toContain(".qfai/prototype/final/handoff.json");
    expect(content).not.toContain(".qfai/evidence/");
  });

  it("ensures qfai-prototyping v2.0 references exist", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-prototyping");

    const [iterRef, generatorRef, reviewerRef, handoffRef] = await Promise.all([
      readFile(path.join(skillDir, "references", "iteration-loop.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "generator-prompt.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "reviewer-prompt.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "handoff.md"), "utf-8"),
    ]);

    // iteration-loop.md says the user's confirmation ends the loop.
    expect(iterRef).toMatch(/the loop ends when the user confirms the prototype/i);

    // generator-prompt.md grants pivot permission.
    expect(generatorRef).toMatch(/scrap and reimagine|pivot/);

    // reviewer-prompt.md ships the layout anti-pattern (lap-*) list and
    // the IA-cap rule that replaced the legacy originality cap.
    expect(reviewerRef).toMatch(/lap-\d{3}/);
    expect(reviewerRef).toMatch(/cap/i);

    // handoff.md records the handoff in its own file with its three keys.
    expect(handoffRef).toContain(".qfai/prototype/final/handoff.json");
    expect(handoffRef).toContain('"finalArtifact": ".qfai/prototype/final/index.html"');
    expect(handoffRef).toContain('"procurement": {');
    expect(handoffRef).toContain('"implementationNotes":');
  });

  it("states the procurement posture in the generator prompt", async () => {
    // What the single-file envelope cannot carry is a runtime dependency. Put
    // as a ban on component libraries, the constraint also refused a
    // transposed catalogue block, which installs nothing and is an ordinary
    // way to build a screen.
    for (const tree of [templateQfaiDir, path.join(repoRoot, ".qfai")]) {
      const generatorRef = await readFile(
        path.join(
          tree,
          "assistant",
          "skill",
          "qfai-prototyping",
          "references",
          "generator-prompt.md",
        ),
        "utf-8",
      );
      expect(generatorRef).not.toContain("No component library");
      expect(generatorRef).toContain("No runtime dependency beyond");
      expect(generatorRef).toContain("Markup is not a dependency");
      // CSS behind a `<link>` is outside the reviewed file, so the authoring
      // side is the only place it can be refused.
      expect(generatorRef).toContain('`<link rel="stylesheet">`');
    }
  });

  it("keeps qfai-prototyping SKILL.md concise enough for agent execution", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    // Same ceiling as every other skill; the trailing `project_memory:` block
    // and the skill's own `## Default Autopilot Policy` section fit inside it.
    expect(content.split(/\r?\n/).length).toBeLessThanOrEqual(SKILL_MD_MAX_LINES);
  });

  it("ensures ui contract guidance defines mockable prototype and copy-ready example", async () => {
    const contractRulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "references",
      "contract-artifact-rules.md",
    );
    // v2.0 (spec-0012 v2.0 absorbed): the v1.x ui-0001-order-mockable.yaml example
    // was removed alongside the funnel; ui-contract guidance is now
    // owned by qfai-sdd's ui-contract.sample.yaml only.
    const uiContractTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "contracts",
      "ui-contract.sample.yaml",
    );

    const [rules, template] = await Promise.all([
      readFile(contractRulesPath, "utf-8"),
      readFile(uiContractTemplatePath, "utf-8"),
    ]);

    expect(rules).toContain("mockable");
    expect(rules).toContain("mockPaths");
    expect(rules).toContain("markers");

    expect(template).toContain("prototype:");
    expect(template).toContain("required:");
    expect(template).toContain("validations:");
  });

  it("ensures prototyping v2.0 references explain the iteration loop", async () => {
    const iterationLoopPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-prototyping",
      "references",
      "iteration-loop.md",
    );
    const content = await readFile(iterationLoopPath, "utf-8");

    expect(content).toMatch(/iter-NN/);
    expect(content).toMatch(/review\.json/);
    expect(content).toMatch(/the loop ends when the user confirms the prototype/i);
    expect(content).toMatch(/best-of-history is gone/i);
  });

  it("keeps the prototyping iteration budget out of qfai-discussion surfaces", async () => {
    const discussionDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-discussion");
    const files = [
      path.join(discussionDir, "references", "discussion-artifact-rules.md"),
      path.join(discussionDir, "templates", "prototyping.yaml"),
    ];

    // qfai-discussion neither owns nor enforces the prototyping budget;
    // restating it there is what produced a third value. Matching the exact
    // sentence that was deleted would only forbid one spelling: `15
    // iterations`, `fixed 15-cycle budget` and `cycles 1..15` all say the same
    // thing and would all have passed. BUDGET_RESTATEMENT_PATTERNS rejects a
    // number *anywhere near* a cycle/iteration word instead — in these two
    // files there is no legitimate reason for one, since the budget is stated
    // by pointer.
    for (const filePath of files) {
      const content = await readFile(filePath, "utf-8");
      const rel = path.relative(repoRoot, filePath);
      expect(findBudgetRestatements(content), `${rel} restates the budget`).toEqual([]);
      expect(content).toContain(".qfai/assistant/step/prototyping-loop/STEP.md");
    }

    // The matcher itself is the deliverable here, so pin what it rejects:
    // a guard that only ever sees clean files proves nothing about its reach.
    for (const restated of [
      "up to 15 iterations",
      "a fixed 15-cycle budget",
      "cycles 1..15",
      "C1..15",
      "iteration count is capped globally to 15",
      "Iteration count cap is 15",
      "max-iterations: 15",
      "the loop runs 10 cycles",
    ]) {
      expect(findBudgetRestatements(restated), `must reject: ${restated}`).not.toEqual([]);
    }
    // …and what it must not reject: the pointer form these files actually use.
    for (const allowed of [
      "The single-thread evolution loop owns its iteration budget; see the skill.",
      "# budget is owned by `.qfai/assistant/step/prototyping-loop/STEP.md`.",
    ]) {
      expect(findBudgetRestatements(allowed), `must allow: ${allowed}`).toEqual([]);
    }
  });

  it("placeholder for removed v1.x test (ships ui contract sample) — replaced by ui-contract.sample.yaml direct check above", () => {
    expect(true).toBe(true);
  });

  it("placeholder for retired evidence-requirements asset", () => {
    // The legacy evidence-requirements.md asset has been replaced by
    // qfai-prototyping/references/iteration-loop.md (covered by the
    // dedicated iteration-loop test above).
    expect(true).toBe(true);
  });

  it("ships qa-gatekeeper agent card", async () => {
    const agentPath = path.join(templateQfaiDir, "assistant", "agent", "qa-gatekeeper.md");
    const content = await readFile(agentPath, "utf-8");

    expect(content).toContain("QA Gatekeeper");
    expect(content).toContain("validation");
    expect(content).toContain("runtime-proof");
    expect(content).toContain("prototyping evidence");
  });

  // TC-0003 (static) — workflow template exists in init tree
  it("ships the qfai-validate GitHub Actions workflow template (spec-0003)", async () => {
    const workflowPath = path.join(templateRootDir, ".github", "workflows", "qfai-validate.yml");
    const content = await readFile(workflowPath, "utf-8");

    expect(content).toContain("name: qfai validate");
    // The lane's subcommand / --profile value / --fail-on threshold used to be
    // asserted here as one ad-hoc string. Subsumed and replaced (DTC-26) by the
    // declared shape's dimension-5 pins in
    // tests/integration/shippedWorkflowShapeGate.test.ts, which is now their one
    // oracle; this it keeps its TC-0003 annotation for the static checks that
    // remain.
    expect(content).toContain("QFAI-TEST-001");
    // DTC-26 co-change (TC-0003-0030): the shipped set is SHA-pinned, so the
    // former floating-major expectations are subsumed by pin-form assertions.
    // The exact-SHA membership oracle lives in the shipped-workflow pins
    // suite; this static check keeps asserting the two actions are present.
    expect(content).toMatch(/actions\/checkout@[0-9a-f]{40}\b/);
    expect(content).toMatch(/actions\/setup-node@[0-9a-f]{40}\b/);

    // The comment justifying the Node pin must quote the floor the package
    // actually publishes, not one qfai stopped shipping releases ago.
    const packageJsonText = await readFile(
      path.join(repoRoot, "packages", "qfai", "package.json"),
      "utf-8",
    );
    const nodeEngine = /"engines"\s*:\s*\{[^}]*"node"\s*:\s*"([^"]+)"/.exec(packageJsonText)?.[1];
    expect(nodeEngine).toBeTruthy();
    expect(content).toContain(`\`engines: "${nodeEngine}"\``);
    expect(content).not.toContain('">=18.0.0"');
  });

  it("documents the pnpm precondition the validate lane stops closed on", async () => {
    // The pnpm setup action resolves its version from
    // `package.json#packageManager` and from nowhere else, so a repository
    // holding a `pnpm-lock.yaml` and nothing else cannot install. Passing a
    // `version:` input instead is not the fix — it would override the version
    // the adopter declared — so the lane stops CLOSED with an annotation
    // naming the file and the fix rather than reporting a validate result it
    // never computed. The behavioural oracle is TC-0003-0044 in
    // tests/integration/shippedWorkflowPortability.test.ts; what is checked
    // here is that the shipped file and both READMEs agree with it.
    const workflowPath = path.join(templateRootDir, ".github", "workflows", "qfai-validate.yml");
    const content = await readFile(workflowPath, "utf-8");

    expect(content).toContain("Resolve the package manager (pnpm route fails closed)");
    // No `version:` input anywhere, on any step: a declared packageManager is
    // the only source, so nothing may override it.
    expect([...content.matchAll(/^\s*version: \S/gm)]).toHaveLength(0);

    // …and neither README may promise a lockfile alone is enough.
    for (const readmePath of [
      path.join(repoRoot, "README.md"),
      path.join(repoRoot, "packages", "qfai", "README.md"),
    ]) {
      const readme = await readFile(readmePath, "utf-8");
      expect(readme, readmePath).toContain("package.json#packageManager");
    }
  });

  // Both READMEs used to claim qfai generates no GitHub Actions workflow while
  // `qfai init` copied `root/.github/workflows/` into every initialized
  // repository. The set is read from SHIPPED_WORKFLOW_NAMES rather than spelled
  // out here, so shipping a further workflow fails this test until the prose
  // names it too — which is how the denial went stale in the first place.
  it("documents every CI workflow `qfai init` installs in both READMEs", async () => {
    const readmePaths = [
      path.join(repoRoot, "README.md"),
      path.join(repoRoot, "packages", "qfai", "README.md"),
    ];

    expect(SHIPPED_WORKFLOW_NAMES.size).toBeGreaterThan(0);
    const invocations = shapeValueLiterals();
    expect(
      invocations.length,
      "the declared shape exposes no invocation to check for",
    ).toBeGreaterThan(0);

    for (const readmePath of readmePaths) {
      const readme = await readFile(readmePath, "utf-8");
      const label = path.relative(repoRoot, readmePath);

      expect(readme, `${label} must not deny the shipped workflows`).not.toContain(
        "It does not generate GitHub Actions workflows.",
      );
      for (const name of SHIPPED_WORKFLOW_NAMES) {
        expect(readme, `${label} must name .github/workflows/${name}`).toContain(
          `.github/workflows/${name}`,
        );
      }
      // Derived, never restated. The declared shape is the one oracle for the
      // lane's subcommand / profile / threshold (the contract's DTC-5), so
      // spelling the invocation here would make this a second one — and would
      // go stale silently the day the shape changed it.
      for (const invocation of invocations) {
        expect(readme, `${label} must state the gate a shipped workflow runs`).toContain(
          invocation,
        );
      }
    }
  });

  it("prevents legacy completion-gate remnants in assistant markdown", async () => {
    const targets = await fg(["assistant/**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const forbiddenPatterns = [
      {
        label: "must: check Coverage Ledger is 100%",
        pattern: /must:\s*check\s*coverage\s*ledger\s*is\s*100%/i,
      },
      {
        label: "Ledger missing or not 100% implemented",
        pattern: /ledger\s*missing\s*or\s*not\s*100%\s*implemented/i,
      },
      {
        label: "Coverage ledger is 100% implemented",
        pattern: /coverage\s*ledger\s*is\s*100%\s*implemented/i,
      },
      {
        label: "scenario.feature is required",
        pattern: /scenario\.feature\s*is\s*required/i,
      },
    ];

    const matches: string[] = [];
    for (const filePath of targets) {
      const content = await readFile(filePath, "utf-8");
      const relativePath = path.relative(templateQfaiDir, filePath);
      for (const forbidden of forbiddenPatterns) {
        if (forbidden.pattern.test(content)) {
          matches.push(`${relativePath}: ${forbidden.label}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });

  it("prevents legacy spec.md/delta.md references in assistant markdown", async () => {
    const targets = await fg(["assistant/**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const forbiddenPatterns = [
      {
        label: ".qfai/specs/spec-*/spec.md",
        pattern: /\.qfai\/specs\/spec-(?:\\\*|\*)\/spec\.md/i,
      },
      {
        label: ".qfai/specs/spec-*/delta.md",
        pattern: /\.qfai\/specs\/spec-(?:\\\*|\*)\/delta\.md/i,
      },
      {
        label: ".qfai/specs/<spec-id>/spec.md",
        pattern: /\.qfai\/specs\/<spec-id>\/spec\.md/i,
      },
      {
        label: ".qfai/specs/<spec-id>/delta.md",
        pattern: /\.qfai\/specs\/<spec-id>\/delta\.md/i,
      },
      {
        label: ".qfai/specs/_policies/delta.md",
        pattern: /\.qfai\/specs\/_policies\/delta\.md/i,
      },
    ];

    const matches: string[] = [];
    for (const filePath of targets) {
      const content = await readFile(filePath, "utf-8");
      const relativePath = path.relative(templateQfaiDir, filePath);
      for (const forbidden of forbiddenPatterns) {
        if (forbidden.pattern.test(content)) {
          matches.push(`${relativePath}: ${forbidden.label}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });

  it("prevents retired design contract references in assistant markdown", async () => {
    const targets = await fg(["assistant/**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const retiredContracts = ["anchor-selection.yaml", "evaluation-axes.yaml"];
    const matches: string[] = [];

    for (const filePath of targets) {
      const content = await readFile(filePath, "utf-8");
      const relativePath = path.relative(templateQfaiDir, filePath);
      for (const contractName of retiredContracts) {
        if (content.includes(contractName)) {
          matches.push(`${relativePath}: ${contractName}`);
        }
      }
    }

    expect(matches).toEqual([]);
  });

  it("ensures contract artifact rules have no legacy acceptance wording", async () => {
    const contractRulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "references",
      "contract-artifact-rules.md",
    );
    const content = await readFile(contractRulesPath, "utf-8");
    const bannedPhrases = ["accepted for backward compatibility", "backward compatibility"];
    for (const phrase of bannedPhrases) {
      expect(content).not.toContain(phrase);
    }
    expect(content).not.toMatch(/primary truth.*discussion/i);
    expect(content).toMatch(/downstream execution truth/i);
  });

  // .npmignore files removed — gitignore entries now live in root .gitignore
  // (see ensureRootGitignoreEntries in init.ts)

  it("does not ship review_archive gitignore in init template", () => {
    const reviewArchiveIgnorePath = path.join(templateQfaiDir, "review_archive", ".gitignore");
    expect(existsSync(reviewArchiveIgnorePath)).toBe(false);
  });

  it("does not ship .qfai artifact README or seed placeholder files", async () => {
    const forbidden = await fg(
      [
        "**/README.md",
        "specs/spec-XXXX/**",
        "spec/spec-XXXX/**",
        "assistant/skills.local/**",
        "assistant/skill.local/**",
        "evidence/calibration.yaml",
      ],
      {
        cwd: templateQfaiDir,
        absolute: false,
        dot: true,
      },
    );

    const artifactOnly = forbidden.filter((relativePath) => !relativePath.startsWith("assistant/"));
    const deprecatedAssistantOnly = forbidden.filter(
      (relativePath) =>
        relativePath.startsWith("assistant/skill.local/") ||
        relativePath.startsWith("assistant/skills.local/"),
    );

    expect([...artifactOnly, ...deprecatedAssistantOnly].sort()).toEqual([]);
  });

  // review .gitignore removed — entries now in root .gitignore managed block
  // (see ensureRootGitignoreEntries in init.ts)

  it("keeps init template docs free of hard-coded versions", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });

    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const found = hardCodedVersions(await readFile(filePath, "utf-8")).filter(
        (version) => !isRequiredVersionMention(filePath, version),
      );
      if (found.length > 0) {
        matches.push(`${path.relative(repoRoot, filePath)}: ${found.join(", ")}`);
      }
    }

    expect(matches, "a shipped document pins a version that will go stale").toEqual([]);
  });

  // The guard reads a version, not every triple of numbers. Both columns are
  // asserted because narrowing it is only safe if a real pin still fails.
  it("tells a version from a standard's clause number", () => {
    for (const pinned of [
      "requires qfai 1.11.1",
      "install v2.0.1",
      "node 20.19.0 or later",
      "`pnpm@9.12.3`",
      "version: 1.4.0",
    ]) {
      expect(hardCodedVersions(pinned), pinned).not.toEqual([]);
    }

    for (const cited of [
      "WCAG 3.3.2 requires a label for every form input",
      "RFC 2119 section 1.2.3",
      "ISO 9241-210 clause 6.5.1",
      "the ratio is 4.5:1",
    ]) {
      expect(hardCodedVersions(cited), cited).toEqual([]);
    }
  });

  it("keeps init template markdown free of Japanese characters except approved files", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
    const approvedJapanesePaths = new Set([
      path.resolve(templateQfaiDir, "assistant", "rule", "research-first-protocol.md"),
    ]);
    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      const normalizedPath = path.resolve(filePath);
      if (approvedJapanesePaths.has(normalizedPath)) {
        continue;
      }
      if (japanesePattern.test(content)) {
        matches.push(path.relative(repoRoot, filePath));
      }
    }

    expect(matches).toEqual([]);
  });

  it("keeps story-tree skeleton and waivers template guardrails", async () => {
    const storyTemplate = await readFile(
      path.join(
        assistantDir,
        "skill",
        "qfai-sdd",
        "templates",
        "spec",
        "02_business-flow",
        "business-flow-NNNN",
        "user-story-NNNN-NNNN",
        "01_User-story.md",
      ),
      "utf-8",
    );
    expect(storyTemplate).toContain("# US-0001-0001:");
    expect(storyTemplate).toContain("## User Story");
    expect(existsSync(path.join(assistantDir, "skill", "qfai-sdd", "templates", "specs"))).toBe(
      false,
    );

    const waiversTemplatePath = path.join(templateQfaiDir, "waivers.yml");
    const waiversTemplate = await readFile(waiversTemplatePath, "utf-8");
    expect(waiversTemplate).toContain("version: 1");
    expect(waiversTemplate).toContain("waivers: []");
    expect(waiversTemplate).toContain("rule:");
    expect(waiversTemplate).not.toContain("COMPAT-");
    expect(waiversTemplate).toContain("expires:");
    expect(waiversTemplate).toContain("evidence:");
  });

  it("keeps root init assets free of wrapper directories", () => {
    // `.claude` / `.codex` must be absent entirely (generated by init symlink step).
    for (const removedDir of [".claude", ".codex"]) {
      expect(existsSync(path.join(templateRootDir, removedDir))).toBe(false);
    }
    // `.github` in the init template may exist ONLY to ship CI workflows
    // (spec-0003: qfai-validate.yml). Wrapper dirs under it
    // (instructions/, agents/, skills/, commands/, prompts/) must not appear.
    const githubDir = path.join(templateRootDir, ".github");
    if (existsSync(githubDir)) {
      const forbidden = ["instructions", "agents", "skills", "commands", "prompts"];
      for (const name of forbidden) {
        expect(
          existsSync(path.join(githubDir, name)),
          `root init assets must not ship .github/${name}`,
        ).toBe(false);
      }
    }
  });

  it("ships a root .gitattributes that pins the SSOT file types to LF", async () => {
    // The Drift Protocol makes the diff of the shipped SSOT markdown a review
    // artifact, and every one of those files is LF. Without an attributes file
    // in the consumer repo, one whole-file rewrite on Windows flips a blob's
    // line endings and the review degrades to "every line changed".
    const attributesPath = path.join(templateRootDir, ".gitattributes");
    expect(existsSync(attributesPath), "root init assets must ship .gitattributes").toBe(true);

    const bytes = await readFile(attributesPath);
    // The file that declares the repository LF must itself be LF.
    expect(bytes.includes(0x0d), ".gitattributes must not contain CR").toBe(false);

    const text = bytes.toString("utf-8");

    // Attributes never rewrite a blob that is already in the index, so a
    // repository that adopts QFAI with protected files already committed as
    // CRLF stays CRLF until it renormalises once. Seeding the rules without
    // saying so leaves that project believing it is LF-normalised when it is
    // not, and the all-lines-changed diff simply waits for the next save.
    expect(text).toContain("git add --renormalize .qfai");

    const rules = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    // Every rule must be scoped to a path QFAI owns. A repository-wide `*`
    // rule reaches product files the framework never wrote: in a project that
    // committed them as CRLF, dropping this file in reports untouched sources
    // as fully rewritten, which is the exact noise the seed exists to prevent.
    for (const rule of rules) {
      const pattern = rule.split(/\s+/)[0] ?? "";
      expect(
        pattern.startsWith(".qfai/") || pattern.startsWith("/"),
        `.gitattributes rule '${rule}' must be scoped to a QFAI-owned path`,
      ).toBe(true);
    }

    for (const pattern of [".qfai/**", "/qfai.config.yaml", "/DESIGN.md"]) {
      expect(
        rules.some((rule) => rule.startsWith(`${pattern} `) && rule.endsWith("eol=lf")),
        `.gitattributes must pin ${pattern} to eol=lf`,
      ).toBe(true);
    }
    // Windows-only scripts are the documented exception: forcing LF on them
    // breaks the interpreter that reads them.
    for (const pattern of [".qfai/**/*.bat", ".qfai/**/*.cmd"]) {
      expect(
        rules.some((rule) => rule.startsWith(`${pattern} `) && rule.endsWith("eol=crlf")),
        `.gitattributes must keep ${pattern} at eol=crlf`,
      ).toBe(true);
    }
  });

  it("states the LF line-ending policy in the Drift Protocol", async () => {
    // The attributes file is create-only, so a project that already had one
    // keeps it and can still produce an EOL-flipped diff. The protocol has to
    // tell the reviewer adjudicating that diff how to read it.
    const protocolPath = path.join(templateQfaiDir, "assistant", "rule", "drift-protocol.md");
    const protocol = await readFile(protocolPath, "utf-8");

    expect(protocol).toContain(".gitattributes");
    expect(protocol).toContain("--ignore-cr-at-eol");
    // Adopting the seed is not the whole migration for a repository whose
    // protected blobs are already CRLF; the protocol has to name the one-time
    // renormalisation too.
    expect(protocol).toContain("--renormalize");
  });

  it("keeps npm README onboarding consistent", async () => {
    const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const readme = await readFile(readmePath, "utf-8");
    const sanitized = stripUrls(readme);

    expect(readme).toContain("npx qfai init");
    expect(readme).toContain("npx qfai validate");
    expect(readme).toContain("npx qfai report");
    expect(readme).toContain("npx qfai doctor");
    expect(readme).toContain("validate.json");
    expect(readme).toContain("report.json");
    expect(readme).toContain("doctor.json");
    expect(sanitized).not.toContain("docs/schema");
    expect(sanitized).not.toContain("docs/examples");
  });

  it("documents every qfai init flag in both READMEs", async () => {
    const readmes = await Promise.all(
      [path.join(repoRoot, "README.md"), path.join(repoRoot, "packages", "qfai", "README.md")].map(
        (readmePath) => readFile(readmePath, "utf-8"),
      ),
    );

    // Backticked tokens only: prose mentions such as `npx qfai init --force`
    // do not count as documenting the flag. `--dir <path>` is documented with
    // its value placeholder inside the same span, so a trailing space closes
    // the token just as a backtick does.
    const documentsFlag = (readme: string, flag: string): boolean =>
      readme.includes(`\`${flag}\``) || readme.includes(`\`${flag} `);

    for (const readme of readmes) {
      // `--upgrade-assistant-tree` is the remedy the deprecation finding
      // prints at operators, and the migration copies instead of deleting.
      expect(readme).toContain("D-DEPRECATED-PATH");
      expect(readme).toContain("without deleting a source or overwriting a destination");
    }

    // SSOT drift guard: the documented set is DERIVED from the actual flag
    // registration, not hand-maintained. `main.ts` decides which parsed
    // options `runInit` receives, and `args.ts` decides which `--flag`
    // writes each of those options — so a new init flag added to the parser
    // and wired into `runInit` fails this test until both READMEs list it,
    // whether or not the CLI ever prints guidance mentioning it.
    const mainSource = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "main.ts"),
      "utf-8",
    );
    const argsSource = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "lib", "args.ts"),
      "utf-8",
    );

    // 1. Which ParsedArgs options does the `init` command consume?
    const initCase = /case "init":([\s\S]*?)\breturn;/.exec(mainSource);
    expect(initCase, 'main.ts must keep a `case "init":` dispatch block').not.toBeNull();
    const initOptionKeys = collectOptionKeys(initCase?.[1] ?? "");
    expect(initOptionKeys.size).toBeGreaterThan(0);

    // 1b. `qfai init --help` never reaches the switch: main.ts answers the
    //     common help flags in the guard above the dispatch, so scanning only
    //     `case "init":` would let both READMEs drop `--help` / `-h` while the
    //     test name still promises "every qfai init flag". Derive that guard's
    //     options too — they apply to every command, `init` included.
    const preDispatch = mainSource.slice(0, mainSource.indexOf("switch (command) {"));
    expect(preDispatch.length, "main.ts must keep a `switch (command) {` dispatch").toBeGreaterThan(
      0,
    );
    const commonOptionKeys = collectOptionKeys(preDispatch);

    // 1c. Options the PARSER folds into an init option after the switch.
    //     `main.ts`'s `case "init":` hands `runInit` its `dir` and never names
    //     `options.root`, so an alias args.ts resolves on its own —
    //     `options.dir = options.root` under a `command === "init"` guard — is
    //     invisible to a derivation that reads main.ts alone. `--root` then
    //     decides where `qfai init` writes while this test, whose name promises
    //     "every qfai init flag", still calls it undocumented.
    for (const key of collectInitAliasSources(argsSource, initOptionKeys)) {
      initOptionKeys.add(key);
    }

    // 2. Which flag writes each of those options in the parser? Short aliases
    //    (`-h`) and fall-through label groups (`case "--help": case "-h":`)
    //    both count, so the help flags resolve to a real registration.
    const flagsByOption = mapCliFlagsToOptions(argsSource);

    // 3. Every flag that can set an init option must be documented in both
    //    READMEs. An init option with no flag at all means the derivation
    //    broke and is failed rather than skipped.
    const expectDocumented = (flag: string, why: string): void => {
      for (const readme of readmes) {
        expect(
          documentsFlag(readme, flag),
          `README must document the init flag ${flag} (${why})`,
        ).toBe(true);
      }
    };
    for (const key of initOptionKeys) {
      const flags = flagsByOption.get(key);
      expect(flags, `args.ts must register a --flag that sets options.${key}`).toBeDefined();
      expect((flags?.size ?? 0) > 0).toBe(true);
      for (const flag of flags ?? []) {
        expectDocumented(flag, `sets options.${key}`);
      }
    }

    // 3b. The pre-dispatch guard also reads parser-internal state that no flag
    //     writes (`options.invalidExitCode`), so only the flag-backed keys are
    //     required here — and at least one must survive, or the derivation rotted.
    const commonFlags = new Set<string>();
    for (const key of commonOptionKeys) {
      for (const flag of flagsByOption.get(key) ?? []) {
        commonFlags.add(flag);
      }
    }
    expect(
      commonFlags.size,
      "main.ts's pre-dispatch guard must resolve to at least one registered flag",
    ).toBeGreaterThan(0);
    for (const flag of commonFlags) {
      expectDocumented(flag, "handled before the init dispatch");
    }

    // Drift guard: any `qfai init --<flag>` the tool prints at operators must
    // be documented in both READMEs.
    const sources = await Promise.all(
      [
        path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "init.ts"),
        path.join(
          repoRoot,
          "packages",
          "qfai",
          "src",
          "core",
          "validators",
          "assistantTreeMigration.ts",
        ),
      ].map((sourcePath) => readFile(sourcePath, "utf-8")),
    );
    const printedFlags = new Set<string>();
    for (const source of sources) {
      for (const match of source.matchAll(/qfai init (--[a-z][a-z-]+)/g)) {
        const flag = match[1];
        if (flag !== undefined) {
          printedFlags.add(flag);
        }
      }
    }
    expect(printedFlags.size).toBeGreaterThan(0);
    for (const flag of printedFlags) {
      for (const readme of readmes) {
        expect(
          documentsFlag(readme, flag),
          `README must document the init flag ${flag} that the CLI prints`,
        ).toBe(true);
      }
    }
  });

  it("keeps package README aligned with discussion completion contract", async () => {
    const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    // Line breaks read as spaces: the README wraps a sentence the skill keeps on one line.
    const readme = (await readFile(readmePath, "utf-8")).replace(/\s*\n\s*/g, " ");

    // W-3: README must express canonical discussion completion contract
    expect(readme).toContain(
      "Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it.",
    );
    expect(readme).toContain(
      "Run `/qfai-discussion` and `/qfai-sdd` to fill the seeded story tree",
    );
  });

  it("keeps npm README release posture aligned with v2.0 prototyping contract", async () => {
    const npmReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const npmReadme = await readFile(npmReadmePath, "utf-8");

    const normalizedNpm = normalizeReadme(stripUrls(npmReadme));
    expect(normalizedNpm).toMatch(/until the user confirms the\s+prototype/);
    expect(normalizedNpm).toContain(".qfai/prototype/");
  });

  it("keeps root copilot-instructions aligned with skill symlink guidance", async () => {
    const copilotInstructionsPath = path.join(repoRoot, ".github", "copilot-instructions.md");
    const content = await readFile(copilotInstructionsPath, "utf-8");

    expect(content).toContain(".github/skills/");
    expect(content).not.toContain(".github/prompts/");
  });

  it("runs init -> validate -> report smoke", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await runValidate({
        root,
        strict: false,
        failOn: "never",
        format: "text",
      });
      await runReport({ root, format: "md" });

      for (const file of ["agent-routing.yml", "review-profiles.yml", "agent-catalog.yml"]) {
        expect(existsSync(path.join(root, ".qfai", "assistant", "manifest", file))).toBe(false);
      }

      const validatePath = path.join(root, ".qfai", "report", "validate.json");
      const reportPath = path.join(root, ".qfai", "report", "report.md");
      await expect(readFile(validatePath, "utf-8")).resolves.toContain('"toolVersion"');
      await expect(readFile(reportPath, "utf-8")).resolves.toContain("# QFAI Report");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates skill symlinks for prototyping with accessible SKILL.md", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-wrapper-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      await expectSkillSymlinkPointsToCanonical(root, ".claude", "qfai-prototyping");
      await expectSkillSymlinkPointsToCanonical(root, ".codex", "qfai-prototyping");
      await expectSkillSymlinkPointsToCanonical(root, ".github", "qfai-prototyping");
      const agentsSkill = await expectSkillSymlinkPointsToCanonical(
        root,
        ".agents",
        "qfai-prototyping",
      );

      // SKILL.md is accessible through symlinks
      const skillMd = await readFile(path.join(agentsSkill, "SKILL.md"), "utf-8");
      expect(skillMd.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("creates skill symlinks for sdd with accessible SKILL.md", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-wrapper-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      await expectSkillSymlinkPointsToCanonical(root, ".claude", "qfai-sdd");
      await expectSkillSymlinkPointsToCanonical(root, ".codex", "qfai-sdd");
      await expectSkillSymlinkPointsToCanonical(root, ".github", "qfai-sdd");
      const agentsSkill = await expectSkillSymlinkPointsToCanonical(root, ".agents", "qfai-sdd");

      // SKILL.md is accessible through symlinks
      const skillMd = await readFile(path.join(agentsSkill, "SKILL.md"), "utf-8");
      expect(skillMd.length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ensures old tdd skills are abolished (not shipped)", () => {
    for (const skillId of ["qfai-tdd-red", "qfai-tdd-green", "qfai-tdd-refactor"]) {
      expect(
        existsSync(path.join(templateQfaiDir, "assistant", "skill", skillId, "SKILL.md")),
      ).toBe(false);
    }
  });

  it("ensures the qfai-implement flow steps carry the required content", async () => {
    const content = await readImplementFlowSteps(path.join(templateQfaiDir, "assistant"));

    expect(content).toContain("Work one EX at a time by default");
    expect(content).toContain("Observe the assertion fail for the intended behavior");
    expect(content).toContain("Write the minimum production code that makes this test pass");
    expect(content).toContain("QFAI:EX-NNNN-NNNN-NN");
    expect(content).toContain("--flow BF-NNNN");
    expect(content).not.toContain("test-list.md");
    expect(content).not.toContain("qfai-tdd-red");
    expect(content).not.toContain("qfai-tdd-green");
    expect(content).not.toContain("qfai-tdd-refactor");
    expect(content).not.toContain("write all tests first");
    expect(content).not.toContain("implement later");
  });

  it("ensures qfai-sdd contract sample templates exist", async () => {
    const contractsTemplatesDir = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "contracts",
    );
    const templates = await fg(["*.*"], {
      cwd: contractsTemplatesDir,
      absolute: false,
    });

    // Root DESIGN.md is the brand SSOT; no brand contract template ships here.
    expect(templates.sort()).toEqual(
      ["api-contract.sample.yaml", "db-contract.sample.sql", "ui-contract.sample.yaml"].sort(),
    );

    const stepPath = path.join(templateQfaiDir, "assistant", "step", "sdd-contract", "STEP.md");
    const stepContent = await readFile(stepPath, "utf-8");
    expect(stepContent).toContain("references/contract-artifact-rules.md");
  });

  it("ensures qfai-discussion skill contains required coverage topics", async () => {
    const content = await readDiscussionSkill(assistantDir);

    expect(content).toMatch(/concept, scope, stakeholders, and constraints/i);
    expect(content).toMatch(/REQ, NFR, glossary, constraints, and policies/i);
    expect(content).toMatch(/exploration-first sidecar family/i);
    expect(content).toContain("02_Inception-Deck.md");
    expect(content).toMatch(/HTML\+CSS/i);
    expect(content).toContain(".qfai/discussion/discussion-");

    // W-5: canonical discussion pack wording guardrail
    expect(content).toContain("15-file discussion pack");
    expect(content).toContain("prototyping.yaml");
  });

  it("ensures qfai-discussion skill and artifact rules use canonical pack wording", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const packageReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");

    const [skill, rules, packageReadme] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(rulesPath, "utf-8"),
      readFile(packageReadmePath, "utf-8"),
    ]);

    // All three must express the canonical completion contract wording
    const canonicalPhrase =
      "Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it.";
    // The README wraps the phrase, so its line breaks read as spaces.
    expect(packageReadme.replace(/\s*\n\s*/g, " ")).toContain(canonicalPhrase);
    expect(rules).toContain(canonicalPhrase);
    expect(skill).toContain(canonicalPhrase);
  });

  it("ensures qfai-discussion hands off to /qfai-sdd through the next-action question", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(discussPromptPath, "utf-8");

    expect(content).toContain("## Completion Message & Next Actions (MUST)");
    expect(content).toContain(
      "End the turn with a question listing the next actions, `/qfai-sdd` recommended",
    );
  });

  it("ensures qfai-discussion template packs exist", async () => {
    const discussionTemplatesDir = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "templates",
    );

    const discussionTemplates = await fg(["*.md"], {
      cwd: discussionTemplatesDir,
      absolute: false,
    });

    expect(discussionTemplates.sort()).toEqual(
      [
        "01_Context.md",
        "02_Inception-Deck.md",
        "03_Story-Workshop.md",
        "04_Sources.md",
        "05_Scope.md",
        "06_REQ.md",
        "07_NFR.md",
        "08_Glossary.md",
        "09_Constraints.md",
        "10_Policy.md",
        "11_OQ-Register.md",
        "12_OQ-Resolution-Log.md",
        "13_Deferred.md",
        "14_Review-Request.md",
        "99_delta.md",
      ].sort(),
    );
  });

  it("keeps discussion handoff references on the story tree", async () => {
    const discussionDir = path.join(assistantDir, "skill", "qfai-discussion");
    const documents = await fg(["**/*.md"], { cwd: discussionDir, absolute: true });
    expect(documents.length).toBeGreaterThan(15);
    for (const file of documents) {
      const content = await readFile(file, "utf-8");
      expect(content, file).not.toMatch(/\.qfai\/(?:specs|contracts)\//);
      expect(content, file).not.toContain("Phase 0");
    }
    const skill = await readFile(path.join(discussionDir, "SKILL.md"), "utf-8");
    expect(skill).toContain("<paths.specsDir>/02_business-flow/**");
    expect(skill).toContain("<paths.contractsDir>/**");
  });

  it("keeps 01_Context.md prototyping-surface guidance aligned with the execution surface set", async () => {
    const contextTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "templates",
      "01_Context.md",
    );
    const content = await readFile(contextTemplatePath, "utf-8");

    const noteLine = content
      .split(/\r?\n/)
      .find((line) => line.includes("prototyping.yaml") && line.includes("|"));
    expect(noteLine).toBeDefined();

    // Every pipe-separated surface enumeration attributed to `prototyping.yaml`
    // must be the execution set, never the wider classification set.
    // Narrowed rather than asserted: `noUncheckedIndexedAccess` makes a capture group
    // `string | undefined`, and the group is optional to the type system even though this
    // pattern always fills it. A `!` or an `as string` would type-check by claiming
    // something the regex engine does not promise.
    const enumerations = [...(noteLine ?? "").matchAll(/`([a-z-]+(?:\|[a-z-]+)+)`/g)]
      .map((match) => match[1])
      .filter((value): value is string => value !== undefined);
    expect(enumerations).toContain(PROTOTYPING_SUPPORTED_SURFACES.join("|"));
    for (const enumeration of enumerations) {
      expect(enumeration.split("|")).not.toContain("cli");
      expect(enumeration.split("|")).not.toContain("non-ui");
    }

    expect(content).toContain(
      "`cli` and `non-ui` are classification-only values and never appear in `prototyping.yaml`.",
    );

    // The classification bullet keeps `cli` as a UI-bearing classification value.
    expect(content).toContain("`cli` is a UI-bearing surface");
    expect(content).toContain(
      "`primary_surface` is a classification field. Valid values: `web|mobile|desktop|cli|mixed|non-ui`.",
    );
  });

  it("ensures qfai-discussion templates include visuals guidance", async () => {
    const inceptionTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "templates",
      "02_Inception-Deck.md",
    );
    const storyTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "templates",
      "03_Story-Workshop.md",
    );
    const [inceptionTemplate, storyTemplate] = await Promise.all([
      readFile(inceptionTemplatePath, "utf-8"),
      readFile(storyTemplatePath, "utf-8"),
    ]);

    expect(inceptionTemplate).toContain("```mermaid");
    expect(storyTemplate).toMatch(/Screen Mock.*Optional Fallback.*HTML\+CSS/i);
    expect(storyTemplate).toContain("```html");
    expect(storyTemplate).toContain("```css");
  });

  it("ships agent cards and package routing defaults without project manifests", async () => {
    for (const directory of ["rule", "skill", "agent", "prompt"]) {
      expect(existsSync(path.join(assistantDir, directory)), directory).toBe(true);
    }
    expect(existsSync(path.join(assistantDir, "catalog"))).toBe(false);
    const layers = await readFile(path.join(assistantDir, "rule", "test-layers.md"), "utf-8");
    expect(layers).toContain("# Test Layers Policy");
    expect(existsSync(path.join(assistantDir, "catalog", "test-layers.md"))).toBe(false);
    for (const retired of ["manifest", "process", "constitution", "skills", "agents"]) {
      expect(existsSync(path.join(assistantDir, retired)), retired).toBe(false);
    }

    const cardDir = path.join(assistantDir, "agent");
    const cards = await fg(["*.md"], { cwd: cardDir });
    expect(cards).toHaveLength(19);
    expect(existsSync(path.join(cardDir, "agent-catalog.yml"))).toBe(false);
    for (const file of cards) {
      const card = await readFile(path.join(cardDir, file), "utf-8");
      const frontmatter = card.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(frontmatter, file).not.toBeNull();
      const parsed: unknown = parseYaml(frontmatter?.[1] ?? "");
      expect(parsed, file).toMatchObject({ name: path.basename(file, ".md") });
      for (const key of [
        "kind",
        "domain",
        "mission",
        "replaces",
        "owned_artifacts",
        "tool_profile",
        "permission_profile",
        "specialization_tags",
      ]) {
        expect(parsed, `${file}: ${key}`).toHaveProperty(key);
      }
    }

    const routing = await readDefaultRoutingText();
    const profiles = await readFile(path.join(defaultsDir, "review-profiles.yml"), "utf-8");
    expect(routing).toContain("routing:");
    expect(profiles).toContain("profiles:");
    for (const file of ["agent-routing.yml", "review-profiles.yml", "agent-catalog.yml"]) {
      expect(existsSync(path.join(assistantDir, file)), file).toBe(false);
      expect(existsSync(path.join(assistantDir, "manifest", file)), file).toBe(false);
    }
  });

  it("keeps discussion and SDD review templates at their skill paths", async () => {
    const sddGatePath = path.join(templateQfaiDir, "assistant", "step", "sdd-gate", "STEP.md");
    const legacyRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "templates",
      "rcp_footer.md",
    );
    const sddGate = await readFile(sddGatePath, "utf-8");
    expect(existsSync(legacyRcpFooterPath)).toBe(false);
    expect(sddGate).toContain("## Review");
    expect(sddGate).toContain("BF-NNNN");
    expect(sddGate).toContain(".qfai/evidence/sdd-BF-NNNN.md");

    const skillIds = ["qfai-discussion"];
    for (const skillId of skillIds) {
      const reviewTemplateDir = path.join(
        templateQfaiDir,
        "assistant",
        "skill",
        skillId,
        "templates",
        "review",
      );
      const templates = await fg(["*.*"], {
        cwd: reviewTemplateDir,
        absolute: false,
      });
      expect(templates.sort()).toEqual(
        ["review_request.md", "Rxx_reviewer.md", "summary.json"].sort(),
      );
    }
  });

  it("keeps review playbooks aligned with validator target kinds", async () => {
    const sddPlaybookPath = path.join(
      templateQfaiDir,
      "assistant",
      "step",
      "common-review-cycle",
      "STEP.md",
    );
    const sddPlaybook = await readFile(sddPlaybookPath, "utf-8");

    expect(sddPlaybook).toMatch(
      /\|\s*`qfai-discussion`\s*\|\s*`discussion`\s*\|\s*`discussion`\s*\|\s*`\.qfai\/discussion\/discussion-YYYYMMDDhhmmssSSS`/,
    );
    expect(sddPlaybook).toMatch(
      /\|\s*`qfai-sdd`\s*\|\s*`sdd`\s*\|\s*`flow`\s*\|\s*`<paths\.specsDir>\/02_business-flow\/business-flow-NNNN`/,
    );
  });

  it("pins the discussion review-pack write paths to the shared review tree", async () => {
    const discussionSkillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-discussion");
    const discussionPlaybookPath = path.join(
      templateQfaiDir,
      "assistant",
      "step",
      "common-review-cycle",
      "STEP.md",
    );
    const reviewRequestTemplatePath = path.join(
      discussionSkillDir,
      "templates",
      "14_Review-Request.md",
    );
    const skillPath = path.join(discussionSkillDir, "SKILL.md");
    const [discussionPlaybook, reviewRequestTemplate, discussionSkill] = await Promise.all([
      readFile(discussionPlaybookPath, "utf-8"),
      readFile(reviewRequestTemplatePath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);

    // `validateReviewArtifacts` lists `^review-(\d{17})$` and nothing else, so the placeholder
    // the playbook prints must expand to exactly 17 digits. A pack written under any other
    // spelling is not enumerated, and an empty review tree only warns — the cycle would pass
    // `--fail-on error` unreviewed.
    const packDirName = "review-YYYYMMDDhhmmssSSS";
    expect(packDirName.slice("review-".length)).toHaveLength(17);

    expect(discussionPlaybook).toContain(`.qfai/review/${packDirName}/`);
    for (const artifact of ["review_request.md", "R01_<reviewer>.md", "summary.json"]) {
      expect(discussionPlaybook).toContain(`\`${artifact}\``);
    }
    expect(reviewRequestTemplate).toContain(`.qfai/review/${packDirName}/review_request.md`);

    // The skill body must actually route the run through the review step: a write-path rule
    // the skill never opens does not reach the reviewer step that writes the pack.
    expect(discussionSkill).toContain(".qfai/assistant/step/common-review-cycle/STEP.md");

    // The discussion tree must name the review-pack directory exactly one way, so that a
    // pack lands where `validateReviewArtifacts` looks for it. Both spellings are checked:
    // a pack path under the review tree, and any leftover `<...>` placeholder that would
    // leave the timestamp shape to the model's discretion.
    const discussionMarkdown = await fg(["**/*.md"], {
      cwd: discussionSkillDir,
      absolute: true,
    });
    const strayNames: string[] = [];
    for (const filePath of discussionMarkdown) {
      const content = await readFile(filePath, "utf-8");
      const matches = [
        ...(content.match(/\.qfai\/review\/review-[^/\s`)]*/g) ?? []).map((match) =>
          match.slice(".qfai/review/".length),
        ),
        ...(content.match(/review-<[^>]+>/g) ?? []),
      ];
      for (const match of matches) {
        if (match !== packDirName) {
          strayNames.push(`${match} (${path.relative(discussionSkillDir, filePath)})`);
        }
      }
    }
    expect(strayNames).toEqual([]);
  });

  it("ensures qfai-sdd no longer ships legacy spec-pack templates", () => {
    const legacySpecPackDir = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "spec-pack",
    );

    expect(existsSync(legacySpecPackDir)).toBe(false);
  });

  it("ensures removed split sdd wrappers are not shipped", () => {
    const removedSkills = ["qfai-sdd-planning", "qfai-sdd-refinement"];
    for (const skillId of removedSkills) {
      expect(
        existsSync(path.join(templateQfaiDir, "assistant", "skill", skillId, "SKILL.md")),
      ).toBe(false);
    }
  });

  it("ensures qfai-sdd templates include discussion-pack preflight summary", async () => {
    for (const skillId of ["qfai-sdd"]) {
      const reportTemplatePath = path.join(
        templateQfaiDir,
        "assistant",
        "skill",
        skillId,
        "templates",
        "report",
        "preflight_summary.md",
      );
      const reportTemplate = await readFile(reportTemplatePath, "utf-8");
      expect(reportTemplate).toContain("status:");
      expect(reportTemplate).toContain("/qfai-sdd");
      expect(reportTemplate).toContain("run id:");
    }

    // The evidence section the completion reviewer grades must resolve to one
    // preflight. `.qfai/report/preflight_summary.md` is rewritten by every
    // rerun, so citing it makes every spec's evidence print the same constant.
    const evidenceTemplate = await readFile(
      path.join(
        templateQfaiDir,
        "assistant",
        "skill",
        "qfai-sdd",
        "templates",
        "evidence",
        "sdd-flow.md",
      ),
      "utf-8",
    );
    // The run id, and not a path, is what the record carries. A committed record
    // naming a path the tree does not have is refused, and the report tree is not
    // committed — so the shape this asserted was one no evidence file could land.
    // The id satisfies the same obligation more exactly: it names the one run,
    // where the rewritten pointer names whichever ran last.
    const provenanceSection = sectionOf(evidenceTemplate, "## Inputs and provenance");
    expect(provenanceSection).toContain("Discussion requirement or import source");

    const sddTriage = await readFile(
      path.join(templateQfaiDir, "assistant", "step", "sdd-triage", "STEP.md"),
      "utf-8",
    );
    expect(sddTriage).toContain("`npx qfai sdd preflight` and use its `selectedInputPath`");

    const businessFlowTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "spec",
      "02_business-flow",
      "business-flow-NNNN",
      "business-flow.md",
    );
    const businessFlowTemplate = await readFile(businessFlowTemplatePath, "utf-8");
    expect(businessFlowTemplate).toContain("```mermaid");
    expect(businessFlowTemplate).toMatch(/flowchart|sequenceDiagram/);

    const contractsTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "spec",
      "03_contract",
      "contracts.md",
    );
    const contractsTemplate = await readFile(contractsTemplatePath, "utf-8");
    expect(contractsTemplate).toContain("## Contract Index");
  });

  it("keeps the story-tree contract index table well formed", async () => {
    const contractsTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "templates",
      "spec",
      "03_contract",
      "contracts.md",
    );
    const contractsTemplate = await readFile(contractsTemplatePath, "utf-8");
    expect(findTableArityMismatches(contractsTemplate)).toEqual([]);
    const [table] = parseAllMarkdownTables(contractsTemplate);
    expect(table?.headers).toEqual([
      "ID",
      "Title",
      "File",
      "Depends On",
      "Reconciled With",
      "Purpose",
    ]);
  });

  it("keeps qfai-sdd scoped to business flows", async () => {
    const stepFiles = await fg(["sdd-*/STEP.md"], {
      cwd: path.join(templateQfaiDir, "assistant", "step"),
      absolute: true,
    });
    const workflowPath = path.join(templateQfaiDir, "assistant", "rule", "workflow.md");
    const [workflow, ...steps] = await Promise.all([
      readFile(workflowPath, "utf-8"),
      ...[
        path.join(templateQfaiDir, "assistant", "skill", "qfai-sdd", "SKILL.md"),
        ...stepFiles,
      ].map((file) => readFile(file, "utf-8")),
    ]);
    const skill = steps.join("\n");

    expect(skill).toContain("01_policy/");
    expect(skill).toContain("02_business-flow/");
    expect(skill).toContain("03_contract/");
    expect(skill).toContain("--flow BF-NNNN");
    expect(skill).not.toContain("No-argument batch delegation");
    expect(skill).not.toContain("--spec <spec-id>");
    expect(workflow).not.toContain(".qfai/specs/_policies/03_Capabilities.md");
  });

  it("keeps every shipped assistant asset inside the line ceiling", async () => {
    // One ceiling for every file (see SKILL_MD_MAX_LINES). The per-skill
    // numbers this replaced disagreed with each other about the same file and
    // had to be raised one at a time; the ceiling is a backstop, and the design
    // rule is that detail lives in the skill's references/ topic files.
    //
    // Globbed, not a hardcoded skill list: the previous version named four
    // skill IDs and only checked SKILL.md, so `qfai-verify/SKILL.md` reached
    // 596 lines without failing anything, and no reference/template file was
    // covered at all — which is where a thin SKILL.md moves its bulk.
    const assetFiles = await fg(["assistant/**/*.{md,yml,yaml}"], {
      cwd: templateQfaiDir,
      absolute: false,
    });
    expect(assetFiles.length, "no shipped assets matched — the glob is wrong").toBeGreaterThan(50);

    const oversized: string[] = [];
    for (const relativePath of assetFiles.sort()) {
      if (LINE_BUDGET_EXEMPT.has(relativePath)) {
        continue;
      }
      const content = await readFile(path.join(templateQfaiDir, relativePath), "utf-8");
      const lineCount = countLines(content);
      if (lineCount > SKILL_MD_MAX_LINES) {
        oversized.push(`${relativePath} (${lineCount})`);
      }
    }

    // Reported together: fixing them one failure at a time hides how much of
    // the surface is over budget.
    expect(oversized, `over ${SKILL_MD_MAX_LINES} lines — move a topic into references/`).toEqual(
      [],
    );
  });

  it("keeps every shipped assistant asset inside the width ceiling it is held to", async () => {
    // The line ceiling above bounds reading cost only while a line is a roughly
    // constant unit of reading, and packing broke that: one line in the tree
    // runs 9,104 characters and costs the count one unit. This is the other
    // half, and the two are read together — width alone permits a thin file of
    // a thousand short lines, the count alone permits a packed one.
    // Case-insensitive, because the runtime scan lowercases the extension
    // before testing it. A `.MD` asset is measured by `qfai doctor` and would
    // not have been matched here, so a wide line in one could reach the package
    // and then warn on a tree its author never edited.
    const assetFiles = await fg(["assistant/**/*.{md,yml,yaml}"], {
      cwd: templateQfaiDir,
      absolute: false,
      caseSensitiveMatch: false,
    });
    expect(assetFiles.length, "no shipped assets matched — the glob is wrong").toBeGreaterThan(50);

    const tooWide: string[] = [];
    for (const relativePath of assetFiles.sort()) {
      // No exemption skip here, unlike the line ceiling above. `LINE_BUDGET_EXEMPT`
      // excuses a roster from having its LENGTH counted; nothing in that reason
      // is about how wide one line may be, and skipping it here would leave the
      // one shipped file this rule cannot reach.
      const content = await readFile(path.join(templateQfaiDir, relativePath), "utf-8");
      const widest = widestMeasurableLine(content);
      const allowed = WIDTH_BUDGET_BACKLOG.get(relativePath) ?? ASSISTANT_ASSET_MAX_LINE_CHARS;
      if (widest > allowed) {
        tooWide.push(`${relativePath} (${widest} > ${allowed})`);
      }
    }

    expect(
      tooWide,
      `a line is wider than the ceiling that applies to it. A file in WIDTH_BUDGET_BACKLOG is ` +
        `held at its recorded width and may not grow past it; every other file is held at ` +
        `${ASSISTANT_ASSET_MAX_LINE_CHARS}. Wrap the prose — a table row and a fenced block are ` +
        `not measured, because neither can be wrapped.`,
    ).toEqual([]);
  });

  it("holds the narrowed workflow baselines and skill bodies to the default width", async () => {
    for (const relativePath of [
      "assistant/rule/shared-skill-delegation-baseline.md",
      "assistant/rule/shared-skill-operating-baseline.md",
      "assistant/skill/qfai-atdd/SKILL.md",
      "assistant/skill/qfai-discussion/SKILL.md",
      "assistant/skill/qfai-sdd/SKILL.md",
    ]) {
      expect(WIDTH_BUDGET_BACKLOG.has(relativePath), relativePath).toBe(false);
      const content = await readFile(path.join(templateQfaiDir, relativePath), "utf-8");
      expect(widestMeasurableLine(content), relativePath).toBeLessThanOrEqual(
        ASSISTANT_ASSET_MAX_LINE_CHARS,
      );
    }
    const issues = await validateSkillDocReferences(templateRoot, defaultConfig);
    expect(issues.filter((entry) => entry.rule === "skillDocReferences.projectMemory")).toEqual([]);
    const atdd = await readFile(
      path.join(templateQfaiDir, "assistant/skill/qfai-atdd/SKILL.md"),
      "utf-8",
    );
    const atddMemory = atdd.split(/^project_memory:\s*$/m)[1] ?? "";
    expect(atddMemory).toContain("BF maps to E2E; AC maps to integration or API");
    expect(atddMemory).toContain("EX tests belong to implement");
    expect(atddMemory).toContain(
      "Placeholders and unasserted annotations discharge no obligation.",
    );
    expect(atddMemory).not.toMatch(/TC-|TDD-ID|test-list\.md/);
    const sdd = await readFile(
      path.join(templateQfaiDir, "assistant/skill/qfai-sdd/SKILL.md"),
      "utf-8",
    );
    const sddMemory = sdd.split(/^project_memory:\s*$/m)[1] ?? "";
    expect(sddMemory).toMatch(/business.flow|BF-/i);
    expect(sddMemory).toContain("--flow BF-NNNN");
    expect(sddMemory).not.toMatch(/TC-|TDD-ID|test-list\.md|06_Test-Cases\.md/);
  });

  it("pins every width backlog entry to the file's real width", async () => {
    // A recorded backlog is only a ratchet while its numbers track the files.
    // An entry merely ABOVE the real width is a licence: reflow a file from 900
    // to 500, leave the 900, and it may grow back to 900 with nothing to say so.
    // So each entry must equal what the file measures — narrowing one is an edit
    // that lowers its number in the same change.
    // The paths and not their count: narrowing one file while widening another
    // leaves the total unmoved, so a count lets a newly wide file take the
    // vacated slot with nothing in the diff naming it.
    expect(
      [...WIDTH_BUDGET_BACKLOG.keys()].sort(),
      "the width backlog may only shrink — remove the path you fixed, and never add one to " +
        "admit a newly widened file",
    ).toEqual([...WIDTH_BACKLOG_PATHS].sort());

    const stale: string[] = [];
    const loose: string[] = [];
    const drifted: string[] = [];
    for (const [relativePath, allowed] of WIDTH_BUDGET_BACKLOG) {
      const absolute = path.join(templateQfaiDir, relativePath);
      if (!existsSync(absolute)) {
        stale.push(relativePath);
        continue;
      }
      // An entry at or below the floor is not a backlog entry at all: the file
      // would pass on the real ceiling, so the line only weakens it.
      if (allowed <= ASSISTANT_ASSET_MAX_LINE_CHARS) {
        loose.push(`${relativePath} (${allowed})`);
        continue;
      }
      const widest = widestMeasurableLine(await readFile(absolute, "utf-8"));
      if (widest !== allowed) {
        drifted.push(`${relativePath} (recorded ${allowed}, measures ${widest})`);
      }
    }

    expect(stale, "width backlog names a file that is not shipped").toEqual([]);
    expect(
      loose,
      `at or under ${ASSISTANT_ASSET_MAX_LINE_CHARS} the entry grants nothing — remove it`,
    ).toEqual([]);
    expect(
      drifted,
      "a backlog entry must be the file's measured width. Lower it to what the file now " +
        "measures (and delete the entry once that is at or under the ceiling); a number left " +
        "above the real width is room to grow back into.",
    ).toEqual([]);
  });

  it("states the same ceiling in the shipped baseline authors read", async () => {
    // The number is owned by `src/core/doctor/assetLineBudget.ts` and quoted in
    // prose that ships to a `qfai init` project. Nothing tied the two together,
    // so the constant could move while the baseline went on telling authors a
    // different number - and for a project that has only the published package
    // that prose is the only copy of the rule it can read.
    const baseline = await readFile(
      path.join(templateQfaiDir, "assistant", "rule", "shared-skill-operating-baseline.md"),
      "utf-8",
    );
    expect(baseline).toContain(`**${SKILL_MD_MAX_LINES} lines per assistant asset file**`);
    // The width ceiling ships the same way and for the same reason: for a
    // project that has only the published package, this prose is the only copy
    // of the rule it can read.
    expect(baseline).toContain(
      `**A width ceiling makes the count honest: ${ASSISTANT_ASSET_MAX_LINE_CHARS} characters per line.**`,
    );
  });

  it("justifies every line-budget exemption and keeps it live", () => {
    // An exemption that no longer matches a shipped file is a stale licence:
    // it would silently cover a future file that happens to take the path.
    for (const [relativePath, reason] of LINE_BUDGET_EXEMPT) {
      expect(
        existsSync(path.join(templateQfaiDir, relativePath)),
        `exempt path does not exist: ${relativePath}`,
      ).toBe(true);
      expect(reason.length, `exemption for ${relativePath} has no stated reason`).toBeGreaterThan(
        40,
      );
    }
  });

  it("ships the complete story-tree templates for sdd", async () => {
    const expected = [
      "01_policy/constraint.md",
      "01_policy/glossary.md",
      "01_policy/initiative.md",
      "01_policy/objective.md",
      "01_policy/principle.md",
      "02_business-flow/business-flows.md",
      "02_business-flow/business-flow-NNNN/business-flow.md",
      "02_business-flow/business-flow-NNNN/user-stories.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/02_Acceptance-Criteria.md",
      "02_business-flow/business-flow-NNNN/user-story-NNNN-NNNN/03_Example.md",
      "03_contract/cli/cli-NNNN-title.md",
      "03_contract/contracts.md",
      "03_contract/tech.md",
      "decisions.md",
      "open-questions.md",
    ].sort();

    for (const skillId of ["qfai-sdd"]) {
      const templatesDir = path.join(
        templateQfaiDir,
        "assistant",
        "skill",
        skillId,
        "templates",
        "spec",
      );
      const files = await fg(["**/*.*"], {
        cwd: templatesDir,
        absolute: false,
      });
      expect(files.sort()).toEqual(expected);
    }
  });

  it("ensures solution-architect agent contains required contract constraints", async () => {
    const agentPath = path.join(templateQfaiDir, "assistant", "agent", "solution-architect.md");
    const content = await readFile(agentPath, "utf-8");

    expect(content).toMatch(/architecture boundaries/i);
    expect(content).toMatch(/UI, API, and DB contracts/i);
    expect(content).toMatch(/rejected options/i);

    expect(content).toContain("## Stop conditions");
    expect(content).toContain("## Sign-off");
  });

  // W5: SSOT alignment tests
  it("discussion artifact rules declare prototyping.yaml as classification-aware", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toMatch(
      /discussion packs with a visual prototyping surface \(`web`, `mobile`, `desktop`, `mixed`\) may include `prototyping\.yaml`/i,
    );
    expect(content).toMatch(/cli-only packs omit it/i);
    expect(content).toMatch(/ui_bearing:\s*false[\s\S]*typically omit `prototyping\.yaml`/i);
    expect(content).toContain("prototyping.yaml");
  });

  it("discussion artifact rules include prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toContain("prototyping.yaml");
  });

  it("discussion artifact rules and SKILL.md use consistent OQ Gate enum", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );

    const [readmeContent, skillContent] = await Promise.all([
      readFile(rulesPath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);

    const canonicalGates = ["discussion", "sdd", "atdd", "tdd", "ops"];

    expect(skillContent).toContain("11_OQ-Register.md");
    expect(skillContent).toContain("open count is zero");

    expect(readmeContent).not.toMatch(/`discuss`.*`require`.*`sdd`/);
    for (const gate of canonicalGates) {
      expect(readmeContent).toContain(gate);
    }
  });

  it("discussion README and SKILL.md agree on prototyping.yaml optionality", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("prototyping.yaml");
    expect(content).toMatch(
      /discussion packs with a visual prototyping surface \(`web`, `mobile`, `desktop`, `mixed`\) may include `prototyping\.yaml`/i,
    );
    expect(content).toMatch(/non-ui discussion packs typically omit it/i);
  });

  it("discussion artifact rules contain prototyping: namespaced example", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    // v2.0 (spec-0012 v2.0 absorbed): mode/recommended_mode/allowed_modes removed.
    expect(content).toContain("prototyping:");
    expect(content).toContain("surface:");
  });

  it("discussion artifact rules say namespaced schema applies when present", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toMatch(/when `prototyping\.yaml` is present/i);
  });

  it("discussion artifact rules do not contain legacy-permissive wording", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).not.toContain("legacy keys ignored");
    expect(content).not.toContain("legacy keys may be ignored");
    expect(content).not.toContain("accepted with warning");
  });

  it("discussion artifact rules enforce current-only posture for prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    // Must express optional artifact / planner-first posture
    expect(content).toMatch(/optional recommendation artifact/i);
    expect(content).toMatch(/planner-first|exploration-first/i);
    expect(content).toMatch(
      /must not choose a single winner|must not choose a single visual winner/i,
    );

    // Forbidden wording (compatibility context)
    expect(content).not.toContain("backward compatible");
  });

  it("SKILL.md does not contain legacy-permissive wording", async () => {
    const content = await readDiscussionSkill(assistantDir);

    expect(content).not.toContain("legacy keys ignored");
    expect(content).not.toContain("legacy keys may be ignored");
    expect(content).not.toContain("accepted with warning");
    expect(content).not.toMatch(/\bone option\b/i);
    expect(content).not.toContain("backward compatible");

    expect(content).toMatch(/planner-first|exploration-first/i);
    // Planner-first governs the screen explorations, which the prototype loop
    // ranks by iterating. It never governed the brand direction: the user picks
    // the theme here because no later stage asks them, and a rule reading "no
    // visual winner" without that carve-out forbids the one ask that exists.
    expect(content).toMatch(/carry the screen explorations unranked/i);
    expect(content).toMatch(/brand direction is the exception/i);
  });

  // QFAI:EX-0001-0015-01
  it("artifact rules and SKILL.md share namespaced-only semantics for prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );

    const [readme, skill] = await Promise.all([
      readFile(rulesPath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);

    // Both must mention planner-first / exploration-first semantics
    expect(readme).toMatch(/planner-first|exploration-first/i);
    expect(skill).toMatch(/planner-first|exploration-first/i);

    // README owns the canonical schema fields; SKILL owns optional artifact semantics and planner guidance.
    // v2.0 (spec-0012 v2.0 absorbed): recommended_mode field removed.
    expect(readme).toContain("prototyping.yaml");
    expect(skill).toContain("prototyping.yaml");

    expect(readme).toMatch(
      /ui-bearing.*may include.*prototyping\.yaml|optional recommendation artifact/i,
    );
    expect(skill).toMatch(
      /discussion packs with a visual prototyping surface \(`web`, `mobile`, `desktop`, `mixed`\) may include `prototyping\.yaml`/i,
    );
  });

  it("discussion artifact rules declare current non-blocking behavior for prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toMatch(/does not block on missing `prototyping\.yaml`/i);
    expect(content).toMatch(/when `prototyping\.yaml` is present/i);
  });

  it("pins the hard-required autopilot bucket to exactly the entries a shipped asset consumes", async () => {
    // `hard-required` is defined as "no default possible; must be supplied
    // before proceeding", so every entry costs a guaranteed prompt out of the
    // 0-1 budget the same section opens by declaring. `companyName` bought
    // nothing: no template slot, no artifact section and no reference file in
    // the shipped tree ever read it, so the prompt had no consumer. Pin the
    // bucket to the entries that do have one — `brand intent` (routed to root
    // DESIGN.md front-matter by qfai-discussion) and `primarySpecId`.
    //
    // A skill may hard-require an input only it
    // reads — declared per skill, so adding one is a reviewed change. What it
    // may not do is carry an entry nothing declares.
    //
    // Membership is decided by `classifyHardRequiredEntries`, the SAME matcher
    // `validateAutopilotPolicy` emits from, rather than by a test written out
    // again here: two copies of this rule are how one hole reaches both at once.
    const skillDocs = await fg(["assistant/skill/qfai-*/SKILL.md"], {
      cwd: templateQfaiDir,
      absolute: false,
    });
    expect(skillDocs.length, "no shipped qfai-* SKILL.md matched").toBeGreaterThan(5);

    const offenders: string[] = [];
    for (const relativePath of skillDocs.sort()) {
      const content = await readFile(path.join(templateQfaiDir, relativePath), "utf-8");
      const entries = collectHardRequiredEntries(content);
      const skillId = path.basename(path.dirname(relativePath));
      const classified = classifyHardRequiredEntries(entries, skillId);
      offenders.push(
        ...[...classified.retired, ...classified.unknown].map(
          (entry) => `${relativePath}: ${entry}`,
        ),
      );
    }

    expect(offenders, "hard-required entry with no consumer in the shipped tree").toEqual([]);
  });

  it("ends the bucket at a sibling bullet however it is indented", () => {
    // Markdown admits up to three spaces before a top-level bullet, so the
    // next bucket can open at column three and still be a sibling. A collector
    // anchored at column zero read that line, and every item under it, as more
    // hard-required entries — which reports `QFAI-AUTOPILOT-001` against a
    // policy that says nothing wrong, and fails validate once the window
    // closes.
    for (const indent of ["", " ", "  ", "   "]) {
      const policy = [
        "- hard-required:",
        "  - brand intent",
        `${indent}- ask-user:`,
        "  - which surface to prototype",
        "",
      ].join("\n");

      expect(
        collectHardRequiredEntries(policy),
        `a bucket opening at ${indent.length} spaces`,
      ).toEqual(["brand intent"]);
    }
  });

  it("keeps a blank line, a comment and prose inside the bucket", () => {
    // The other half of the boundary. Only a sibling or a heading closes it,
    // so a formatting edit cannot hide the entries below itself.
    const policy = [
      "- hard-required:",
      "  - brand intent",
      "",
      "<!-- the two the run cannot infer -->",
      "  prose that belongs to the entry above",
      "  - a usable requirement source",
      "## Next section",
      "  - never reached",
      "",
    ].join("\n");

    expect(collectHardRequiredEntries(policy)).toEqual([
      "brand intent prose that belongs to the entry above",
      "a usable requirement source",
    ]);
  });

  it("rejects a retired entry smuggled in beside a pinned one", () => {
    // The hole the shared matcher closes. Each bullet writes the retired name
    // beside a live one, so an equality test sees neither; the word match
    // inside the normalized bullet sees the retired one.
    for (const smuggled of [
      "brand intent / companyName",
      "brand intent, companyName",
      "a usable requirement source + companyName",
    ]) {
      expect(
        classifyHardRequiredEntries([smuggled, "brand intent"]).retired,
        `a bullet naming two entries must be reported: ${smuggled}`,
      ).toContain(smuggled);
    }

    // Current SDD inputs are skill-specific. A selectable UI contract is not
    // a hard-required input because the resolver can select one from inventory.
    expect(
      classifyHardRequiredEntries(
        [
          "brand intent",
          "a usable requirement source",
          "an identifiable affected flow or an explicit decision to create one",
        ],
        "qfai-sdd",
      ),
    ).toEqual({ retired: [], unknown: [] });
    expect(classifyHardRequiredEntries(["`primarySpecId`"], "qfai-prototyping").retired).toEqual([
      "`primarySpecId`",
    ]);
    expect(classifyHardRequiredEntries(["primaryUiContract"], "qfai-prototyping").unknown).toEqual([
      "primaryUiContract",
    ]);

    // A narrowed bucket is lawful and reports nothing.
    expect(classifyHardRequiredEntries(["brand intent"])).toEqual({ retired: [], unknown: [] });
    // A skill-specific input is lawful for the skill that declares it, and for
    // no other — which is what makes it a declaration rather than a hole.
    const own = ["a `testFileGlobs` proposal that matches at least one real file"];
    expect(classifyHardRequiredEntries(own, "qfai-configure").unknown).toEqual([]);
    expect(classifyHardRequiredEntries(own, "qfai-verify").unknown).toEqual(own);
    // And an entry nothing declares is reported wherever it appears.
    expect(classifyHardRequiredEntries(["unreviewedSecret"], "qfai-configure").unknown).toEqual([
      "unreviewedSecret",
    ]);
    // The same smuggling the retired search closes, one set over: another
    // skill's declared input written beside a common one. The allowed test
    // asks only whether *some* permitted name is in the bullet, so the first
    // half of each of these answers for the second.
    for (const smuggled of [
      "brand intent / `testFileGlobs`",
      "brand intent, testFileGlobs",
      "brand intent — a `testFileGlobs` proposal",
    ]) {
      expect(
        classifyHardRequiredEntries([smuggled], "qfai-verify").unknown,
        `a bullet carrying another skill's input must be reported: ${smuggled}`,
      ).toEqual([smuggled]);
      // And lawful for the skill that declares it, which is what keeps this a
      // declaration rather than a ban.
      expect(classifyHardRequiredEntries([smuggled], "qfai-configure").unknown).toEqual([]);
    }
    expect(HARD_REQUIRED_COMMON_ENTRIES).toEqual(["brand intent"]);
    expect(RETIRED_HARD_REQUIRED_ENTRIES).toEqual(["companyname", "primaryspecid"]);
  });
});

/** Body of `heading` up to the next `## ` heading, so a sibling section cannot satisfy the assertion. */
function sectionOf(content: string, heading: string): string {
  const start = content.indexOf(`${heading}\n`);
  expect(start, `${heading} is missing`).toBeGreaterThanOrEqual(0);
  const rest = content.slice(start + heading.length);
  const end = rest.indexOf("\n## ");
  return end === -1 ? rest : rest.slice(0, end);
}

/** Every `options.<key>` the given slice of CLI source touches. */
function collectOptionKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const match of source.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)/g)) {
    const key = match[1];
    if (key !== undefined) {
      keys.add(key);
    }
  }
  return keys;
}

/** A token `args.ts` can register as a CLI flag: `--long` or a `-s` alias. */
const CLI_FLAG_TOKEN = /^-{1,2}[A-Za-z][A-Za-z0-9-]*$/;

/**
 * Flag alias sets `args.ts` declares as named constants, e.g.
 * `const HELP_FLAGS: ReadonlySet<string> = new Set(["--help", "-h"])`.
 *
 * The parser tests these with `.has(...)` where it once carried switch labels,
 * so a derivation that reads only `case` labels resolves no flag at all for
 * the options such a guard writes.
 */
function collectFlagAliasSets(argsSource: string): Map<string, string[]> {
  const sets = new Map<string, string[]>();
  for (const declaration of argsSource.matchAll(
    /\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\b[^=\n]*=\s*new Set\(\s*\[([^\]]*)\]/g,
  )) {
    const name = declaration[1];
    const literals = declaration[2];
    if (name === undefined || literals === undefined) {
      continue;
    }
    const flags = [...literals.matchAll(/"([^"]+)"/g)]
      .map((literal) => literal[1])
      .filter((flag): flag is string => flag !== undefined && CLI_FLAG_TOKEN.test(flag));
    if (flags.length > 0) {
      sets.set(name, flags);
    }
  }
  return sets;
}

/** Net brace balance a single line contributes. */
function braceBalance(line: string): number {
  return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
}

/**
 * The option keys the parser copies INTO an init option under a
 * `command === "init"` guard — i.e. the sources of init's own aliases.
 *
 * `collectOptionKeys` reads `main.ts`, which is only half the derivation:
 * `args.ts` resolves `--root` into `options.dir` for `init` before `main.ts`
 * ever sees it, so the flag that decides where `qfai init` writes never
 * appears in the `case "init":` block. Following the assignment is what keeps
 * "every qfai init flag" true of aliases as well as of direct registrations.
 *
 * Restricted to assignments whose TARGET is already a known init option, so an
 * unrelated `command === "init"` guard cannot widen the documented set.
 */
function collectInitAliasSources(
  argsSource: string,
  initOptionKeys: ReadonlySet<string>,
): Set<string> {
  const sources = new Set<string>();
  for (const guard of argsSource.matchAll(
    /if\s*\(\s*command === "init"[\s\S]*?\)\s*\{([\s\S]*?)\n\s*\}/g,
  )) {
    for (const assignment of (guard[1] ?? "").matchAll(
      /options\.([A-Za-z][A-Za-z0-9]*)\s*=\s*options\.([A-Za-z][A-Za-z0-9]*)/g,
    )) {
      const target = assignment[1];
      const source = assignment[2];
      if (target !== undefined && source !== undefined && initOptionKeys.has(target)) {
        sources.add(source);
      }
    }
  }
  return sources;
}

/**
 * Map `options.<key>` -> the CLI flags that write it, read straight out of
 * `args.ts`. Two registration shapes count, because the parser uses both:
 * consecutive `case` labels sharing the body they fall through into
 * (`case "--help": case "-h":`), and a named alias set tested in a guard
 * (`if (arg !== undefined && HELP_FLAGS.has(arg)) {`). Short aliases are kept
 * in both, so a flag is only missing here when the parser really does not
 * register it.
 */
function mapCliFlagsToOptions(argsSource: string): Map<string, Set<string>> {
  const flagsByOption = new Map<string, Set<string>>();
  const aliasSets = collectFlagAliasSets(argsSource);
  let pendingFlags: string[] = [];
  let sawBody = false;
  // The alias set an enclosing guard is matching, and the depth at which its
  // block closes. Attribution is scoped to that block so a set cannot leak
  // onto the assignments that follow it.
  let guardFlags: readonly string[] = [];
  let guardDepth = 0;

  const record = (line: string, flags: readonly string[]): void => {
    if (flags.length === 0) {
      return;
    }
    for (const assignment of line.matchAll(/options\.([A-Za-z][A-Za-z0-9]*)\s*=[^=]/g)) {
      const key = assignment[1];
      if (key === undefined) {
        continue;
      }
      const bucket = flagsByOption.get(key) ?? new Set<string>();
      for (const flag of flags) {
        bucket.add(flag);
      }
      flagsByOption.set(key, bucket);
    }
  };

  for (const line of argsSource.split("\n")) {
    if (guardFlags.length > 0) {
      record(line, guardFlags);
      guardDepth += braceBalance(line);
      if (guardDepth <= 0) {
        guardFlags = [];
      }
      continue;
    }
    // A single-line `if (... NAME.has(token)) {` guard over a known alias set.
    // Requiring the brace on the same line keeps the scan off `.has(...)` uses
    // that are not guards at all, such as the positional-token predicate.
    const guard =
      /^\s*(?:\}\s*else\s+)?if\s*\(.*\b([A-Za-z_][A-Za-z0-9_]*)\.has\(.*\)\s*\{\s*$/.exec(line);
    const guarded = guard === null ? undefined : aliasSets.get(guard[1] ?? "");
    if (guarded !== undefined) {
      guardFlags = guarded;
      guardDepth = 1;
      continue;
    }
    // A label line, with or without the block brace prettier keeps on it.
    const label = /^\s*(?:case "([^"]*)"|default)\s*:\s*\{?\s*$/.exec(line);
    if (label !== null) {
      if (sawBody) {
        pendingFlags = [];
        sawBody = false;
      }
      const flag = label[1];
      if (flag !== undefined && CLI_FLAG_TOKEN.test(flag)) {
        pendingFlags.push(flag);
      }
      continue;
    }
    if (line.trim().length === 0) {
      continue;
    }
    sawBody = true;
    record(line, pendingFlags);
  }

  return flagsByOption;
}

function extractPathReferences(content: string): Set<string> {
  const refs = new Set<string>();
  const sanitized = stripUrls(content);
  const pattern =
    /(?:^|[^A-Za-z0-9@])([./A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.(?:md|feature|yml|yaml|json|sql|ts|tsx|js|jsx))/g;
  for (const match of sanitized.matchAll(pattern)) {
    const ref = match[1];
    if (!ref) {
      continue;
    }
    refs.add(ref);
  }
  if (sanitized.includes("qfai.config.yaml")) {
    refs.add("qfai.config.yaml");
  }
  return refs;
}

function stripUrls(content: string): string {
  return content.replace(/https?:\/\/\S+/g, "");
}

function normalizeReadme(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function shouldSkipReference(ref: string): boolean {
  if (ref.startsWith("#") || ref.includes("://")) {
    return true;
  }
  if (ref.startsWith("/")) {
    return true;
  }
  if (ref.includes("*") || ref.includes("{") || ref.includes("}")) {
    return true;
  }
  if (ref.includes(".qfai/report/") || ref.includes(".qfai/evidence/")) {
    return true;
  }
  // Written by `qfai init` into the ADOPTER's tree, so it is nameable in the
  // README (the reader has to know to commit it) and absent from this one —
  // the same class as the `.qfai/report/` outputs above, pinned to the single
  // filename rather than a directory because that is the whole of the class.
  if (ref === ".qfai/install-provenance.json") {
    return true;
  }
  // A path inside the installed package. Naming a file under it is how the
  // README tells an adopter where the packaged copy of a shipped file sits in
  // THEIR tree. Whether it exists here depends only on whether this checkout
  // has been installed, so the walk does not judge it.
  if (ref.startsWith("node_modules/")) {
    return true;
  }
  // Same carve-out, same reason: `.qfai/state.json` is written by
  // `qfai discussion use` at runtime and is `.gitignore`d, so it is never in a
  // checkout for this walk to find. Documenting the pointer a command reads is
  // not a broken path reference.
  if (ref === ".qfai/state.json") {
    return true;
  }
  if (!ref.includes("/") && !ref.includes("\\")) {
    if (ref === "report.json" || ref === "report.md" || ref === "validate.json") {
      return true;
    }
  }
  return false;
}

function buildCandidates(baseFile: string, ref: string): string[] {
  const baseDir = path.dirname(baseFile);
  if (path.isAbsolute(ref)) {
    return [ref];
  }
  return [
    path.resolve(baseDir, ref),
    path.resolve(repoRoot, ref),
    path.resolve(templateRoot, ref),
    path.resolve(templateRootDir, ref),
    path.resolve(templateQfaiDir, ref),
  ];
}

async function expectSkillSymlinkPointsToCanonical(
  root: string,
  integration: ".agents" | ".claude" | ".codex" | ".github",
  skillId: string,
): Promise<string> {
  const integrationSkill = path.join(root, integration, "skills", skillId);
  const canonicalSkill = path.join(root, ".qfai", "assistant", "skill", skillId);
  const integrationStat = await lstat(integrationSkill);

  expect(integrationStat.isSymbolicLink()).toBe(true);
  expect(await realpath(integrationSkill)).toBe(await realpath(canonicalSkill));

  return integrationSkill;
}

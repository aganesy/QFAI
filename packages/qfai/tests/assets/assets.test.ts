import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
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
import { readRule } from "../helpers/ruleWithReferences.js";

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

    const delegated = new Set(["qfai-implement", "qfai-migration-v1-to-v2", "qfai-sdd"]);
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
      "No delegation attempt is required at the start of a stage.",
      "When it does, the real delegation attempt is the capability check.",
      // Delegation failure splits into unavailable vs saturated, so the
      // response is class-dependent; the invariant that survives is that a
      // failure is never answered by simulating a role.
      "If the delegation fails, classify the failure first",
      "Never simulate a role.",
      "Delegation failure:",
      "Attempted role:",
      "Attempted task:",
      "Why stopped: this review needs a reviewer that did not author the work.",
      "User action needed:",
      "Retry condition: rerun after the review delegation succeeds",
    ];

    for (const phrase of requiredHardStopPayload) {
      expect(baseline).toContain(phrase);
    }
  });

  it("ensures shared delegation baseline lets the orchestrator work while a delegation runs", async () => {
    const baselinePath = path.join(
      templateQfaiDir,
      "assistant",
      "rule",
      "shared-skill-delegation-baseline.md",
    );
    const baseline = await readFile(baselinePath, "utf-8");
    const start = baseline.indexOf("### Orchestrator Protocol");
    const end = baseline.indexOf("### Capability Probe (MUST)");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const protocol = baseline.slice(start, end).replace(/\s+/g, " ");

    const requiredPhrases = [
      // The permission itself: without it "delegate, then integrate" reads as
      // an order and the orchestrator waits on every delegation.
      "The orchestrator is not required to wait while a sub-agent runs.",
      // The three host capabilities the permission depends on.
      "starts a delegation and returns at once",
      "delivers the finished result later as a message",
      "lets the orchestrator wait for a result on purpose",
      // With all three, the orchestrator works while work remains. Otherwise it waits.
      "carries on with its own work meanwhile and waits only when it has none.",
      "A host without all three keeps the orchestrator waiting.",
      // The work it may do, and the bounds on it.
      "It never repeats the work it handed out.",
      "Starting another delegation needs the independence conditions of `.qfai/assistant/skill/qfai-implement/references/parallelization-policy.md`.",
      "carrying on does not override it.",
    ];

    for (const phrase of requiredPhrases) {
      expect(protocol).toContain(phrase);
    }
  });

  it("ensures shared operating baseline defines gate failure autorepair protocol", async () => {
    const baselinePath = path.join(
      templateQfaiDir,
      "assistant",
      "rule",
      "shared-skill-operating-baseline.md",
    );
    const baseline = await readRule(baselinePath);
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
      "Routed phases, in order: `analysis` (`delivery-planner`, `qa-strategist`) -> `config` (`devops-ci-engineer`) -> `review` (`qa-gatekeeper`).",
    );

    expect(verify).toContain("Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.");
    expect(verify).toContain("Routed phase: `plan` (`delivery-planner`, `qa-strategist`).");
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

    expect(content).not.toContain("Verification Evidence");
    expect(content).toContain("Run listed commands and record outputs.");
    expect(content).toContain("the next actions");
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
    expect(await readFile(skillPath, "utf-8")).toContain("[DRIFT-PROTOCOL:REQUIRED]");

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
    // here is that the shipped file agrees with it.
    const workflowPath = path.join(templateRootDir, ".github", "workflows", "qfai-validate.yml");
    const content = await readFile(workflowPath, "utf-8");

    expect(content).toContain("Resolve the package manager (pnpm route fails closed)");
    // No `version:` input anywhere, on any step: a declared packageManager is
    // the only source, so nothing may override it.
    expect([...content.matchAll(/^\s*version: \S/gm)]).toHaveLength(0);
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
  // (see ensureRootGitignoreEntries in core/init/rootGitignore.ts)

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
  // (see ensureRootGitignoreEntries in core/init/rootGitignore.ts)

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

  // QFAI:EX-0001-0196-52
  it("ships a union merge for the two append-only registers, here and in the seed", async () => {
    for (const file of [
      path.join(templateRootDir, ".gitattributes"),
      path.join(repoRoot, ".gitattributes"),
    ]) {
      const rules = (await readFile(file, "utf-8"))
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      for (const register of ["decisions.md", "open-questions.md"]) {
        expect(rules, file).toContain(`/.qfai/spec/${register} merge=union`);
      }
      expect(
        rules.filter((rule) => rule.includes("merge=")),
        `${file} sets a merge driver only on the two registers`,
      ).toHaveLength(2);
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
    expect(content).toContain("01_Context.md#Inception Deck");
    expect(content).toMatch(/HTML\+CSS/i);
    expect(content).toContain(".qfai/discussion/discussion-");

    // W-5: canonical discussion pack wording guardrail
    expect(content).toContain("nine-file discussion pack");
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

    const [skill, rules] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(rulesPath, "utf-8"),
    ]);

    // Both must express the canonical completion contract wording
    const canonicalPhrase =
      "Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it.";
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
        "03_Story-Workshop.md",
        "04_Sources.md",
        "05_Scope.md",
        "06_REQ.md",
        "07_NFR.md",
        "08_Glossary.md",
        "09_Constraints.md",
        "11_OQ-Register.md",
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
      "01_Context.md",
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
    const implement = await readFile(
      path.join(templateQfaiDir, "assistant/skill/qfai-implement/SKILL.md"),
      "utf-8",
    );
    const implementMemory = implement.split(/^project_memory:\s*$/m)[1] ?? "";
    expect(implementMemory).toContain("BF maps to E2E; AC maps to integration or API");
    expect(implementMemory).not.toMatch(/TC-|TDD-ID|test-list\.md/);
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
    const baseline = await readRule(
      path.join(templateQfaiDir, "assistant", "rule", "shared-skill-operating-baseline.md"),
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

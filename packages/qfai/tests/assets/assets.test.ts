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
import { MAX_ITERATION_INDEX, MAX_ITERATIONS } from "../../src/core/prototyping/iteration.js";
import { PROTOTYPING_SUPPORTED_SURFACES } from "../../src/core/review/prototyping.js";
import { parseAllMarkdownTables } from "../../src/core/specPackParsers.js";
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
import { shapeValueLiterals } from "../integration/shippedWorkflowShape.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateRootDir = path.join(templateRoot, "root");
const templateQfaiDir = path.join(templateRoot, ".qfai");
const assistantDir = path.join(templateQfaiDir, "assistant");
const defaultsDir = path.join(repoRoot, "packages", "qfai", "assets", "defaults");

// --- shipped iteration-budget vocabulary -----------------------------------
// Two skills talk about the same budget under opposite obligations:
// `qfai-prototyping` owns it and may print it, but every number it prints must
// equal the constant; `qfai-discussion` owns nothing here and may not print a
// number at all. Both guards read the patterns below so neither can grow an
// arm the other lacks — the noun-first arm used to exist only on the
// discussion side, which is how `Iteration count cap is 10` shipped unchecked.
const BUDGET_NOUN = String.raw`(?:cycles?|iterations?)`;
const BUDGET_CAP = String.raw`(?:cap(?:ped|s)?|budget|limit(?:ed|s)?|max(?:imum)?|total|at\s+most|up\s+to)`;
// Gaps stay inside one clause (no `.`, `;` or newline) so
// `Iteration count cap is 10; ... reaching cycle 9 ...` yields 10, not 9.
const BUDGET_GAP = String.raw`[^.;\n]{0,24}?`;

type BudgetLiteralPattern = {
  readonly label: string;
  readonly re: RegExp;
  /** `terminal` is compared to MAX_ITERATION_INDEX, `total` to MAX_ITERATIONS. */
  readonly against: "terminal" | "total";
};

const BUDGET_LITERAL_PATTERNS: readonly BudgetLiteralPattern[] = [
  {
    label: "terminal index",
    against: "terminal",
    re: /(?:cycles?\s+1\.\.|\bC1\.\.|index\s*===\s*)(\d+)/gi,
  },
  {
    label: "count before the noun",
    against: "total",
    re: /\b(\d+)(?:\s+(?:cycles|iterations)|-(?:cycle|iteration))\b/gi,
  },
  {
    // `Iteration count cap is 10`, `cycle limit: 10`, `max-iterations: 10`.
    // A cap word is required: without it every `--cycle 0` would be flagged.
    label: "count after the noun",
    against: "total",
    re: new RegExp(
      String.raw`\b(?:${BUDGET_NOUN}${BUDGET_GAP}${BUDGET_CAP}|${BUDGET_CAP}${BUDGET_GAP}${BUDGET_NOUN})${BUDGET_GAP}\b(\d+)\b`,
      "gi",
    ),
  },
];

type BudgetLiteral = {
  readonly label: string;
  readonly text: string;
  readonly value: number;
  readonly expected: number;
};

/** Every budget number a shipped surface states, with the constant it must equal. */
function collectBudgetLiterals(content: string): BudgetLiteral[] {
  const found: BudgetLiteral[] = [];
  for (const { label, re, against } of BUDGET_LITERAL_PATTERNS) {
    for (const match of content.matchAll(re)) {
      found.push({
        label,
        text: match[0],
        value: Number(match[1]),
        expected: against === "terminal" ? MAX_ITERATION_INDEX : MAX_ITERATIONS,
      });
    }
  }
  return found;
}

/** Budget literals whose value has drifted away from the source constant. */
function findStaleBudgetLiterals(content: string): string[] {
  return collectBudgetLiterals(content)
    .filter(({ value, expected }) => value !== expected)
    .map(({ label, text, expected }) => `${text} [${label}] (expected ${expected})`);
}

// Non-owning surfaces are held to a stricter rule: no number near the noun at
// all, cap word or not. That arm cannot be shared with the prototyping guard,
// where `--cycle 0` and `reaching cycle 9` are legitimate.
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
    file: "qfai-migration-spec-to-story/references/migration-guide.md",
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
    const files = [
      path.join(templateQfaiDir, "assistant", "skill", "qfai-prototyping", "SKILL.md"),
    ];

    const missing: string[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf-8");
      const lower = content.toLowerCase();
      // v2.0 (spec-0012 v2.0 absorbed): "reviewer gate" replaced by deterministic
      // `qfai prototyping iterate` exit codes; SKILL.md no longer needs a
      // dedicated section heading. Required v2.0 sections.
      const required = ["critical constraints", "process", "completion"];
      const missingSections = required.filter((section) => !lower.includes(section));
      if (missingSections.length > 0) {
        missing.push(`${path.relative(repoRoot, filePath)}: ${missingSections.join(", ")}`);
      }
    }

    expect(missing).toEqual([]);
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
      "qfai-migration-spec-to-story",
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
      ["qfai-sdd", "gate-failure repair protocol in the shared operating baseline"],
      ["qfai-atdd", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
      ["qfai-implement", "rule/shared-skill-operating-baseline.md"],
      ["qfai-verify", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
      ["qfai-configure", "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol"],
    ]);

    const missing = (
      await Promise.all(
        [...requiredBySkill].map(async ([skill, requiredPhrase]) => {
          const skillPath = path.join(templateQfaiDir, "assistant", "skill", skill, "SKILL.md");
          const content = await readFile(skillPath, "utf-8");
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
    // with a concrete `spec-NNNN` / `TC-NNNN-NNNN` / `CON-API-NNNN` id
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
    const routingPath = path.join(defaultsDir, "agent-routing.yml");
    const configurePath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-configure",
      "SKILL.md",
    );
    const verifyPath = path.join(templateQfaiDir, "assistant", "skill", "qfai-verify", "SKILL.md");

    const [routing, configure, verify] = await Promise.all([
      readFile(routingPath, "utf-8"),
      readFile(configurePath, "utf-8"),
      readFile(verifyPath, "utf-8"),
    ]);

    expect(routing).toContain("skill: qfai-configure");
    expect(routing).toContain("mandatory_agents: [delivery-planner, qa-strategist]");
    expect(routing).toContain("skill: qfai-verify");
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
    const skillPath = path.join(templateQfaiDir, "assistant", "skill", "qfai-verify", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain(
      'description: "Use when invoked by name or handed a QFAI work order. Run and document quality gates (repo + qfai validate/report), fix until PASS."',
    );
    expect(content).toContain("Fix until PASS.");
    expect(content).toContain("If failing, produce an actionable fix list");
  });

  it("keeps qfai-verify evidence summary contract", async () => {
    const skillPath = path.join(templateQfaiDir, "assistant", "skill", "qfai-verify", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("A concise evidence summary exists (copy‑paste for PR).");
    expect(content).toContain("Change Classification (Primary/Tags)");
    expect(content).toContain("Run listed commands and record outputs.");
    expect(content).toContain("command list + pass/fail + next actions");
  });

  it("ensures qfai-prototyping v2.0 SKILL.md preserves drift protocol and 4 references", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-prototyping");
    const skillPath = path.join(skillDir, "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    // Drift protocol marker (anti-improvisation guardrail) survives v2.0.
    expect(content).toContain("[DRIFT-PROTOCOL:MANDATORY]");

    // The 4 v2.0 references must all be cited.
    expect(content).toContain("references/iteration-loop.md");
    expect(content).toContain("references/generator-prompt.md");
    expect(content).toContain("references/reviewer-prompt.md");
    expect(content).toContain("references/handoff.md");
  });

  it("ensures qfai-prototyping v2.0 SKILL.md references the iterate command and 15-iter budget", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/qfai prototyping iterate/);
    expect(content).toMatch(/10 iterations|10 cycles|up to 10/);
    expect(content).toContain("<contractsDir>/ui/*.yaml");
    // Post-rewrite: brand SSOT is root DESIGN.md + lock yaml; legacy
    // per-aspect brand yaml references are dropped from this skill.
    expect(content).toContain("DESIGN.md");
    expect(content).toContain("<contractsDir>/design/DESIGN.md.lock.yaml");
    expect(content).toContain(".qfai/prototype/iter-00/index.html");
    expect(content).toContain("certify --check");
  });

  it("ensures qfai-prototyping v2.0 references and handoff sample exist", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-prototyping");
    const handoffTemplatePath = path.join(
      skillDir,
      "templates",
      "contracts",
      "prototype-handoff.sample.yaml",
    );

    const [iterRef, generatorRef, reviewerRef, handoffRef, handoffTemplate] = await Promise.all([
      readFile(path.join(skillDir, "references", "iteration-loop.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "generator-prompt.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "reviewer-prompt.md"), "utf-8"),
      readFile(path.join(skillDir, "references", "handoff.md"), "utf-8"),
      readFile(handoffTemplatePath, "utf-8"),
    ]);

    // iteration-loop.md describes the deterministic stop conditions.
    expect(iterRef).toMatch(/exit code 0\/64\/65\/2|exit code|`64`|`65`/);

    // generator-prompt.md grants pivot permission.
    expect(generatorRef).toMatch(/scrap and reimagine|pivot/);

    // reviewer-prompt.md ships the layout anti-pattern (lap-*) list and
    // the IA-cap rule that replaced the legacy originality cap.
    expect(reviewerRef).toMatch(/lap-\d{3}/);
    expect(reviewerRef).toMatch(/cap/i);

    // handoff.md describes design-system extraction.
    expect(handoffRef).toMatch(/design-system\.yaml/);

    // handoff sample carries the canonical fields and no legacy preserve/copy concepts.
    expect(handoffTemplate).toContain("finalIterIndex");
    expect(handoffTemplate).toContain("designSystemMirror");
    expect(handoffTemplate).not.toContain("extractedDesignSystem");
    expect(handoffTemplate).not.toContain("mustPreserve");
    expect(handoffTemplate).not.toContain("mustNotCopy");
  });

  it("keeps the per-screen skeleton shape from breaking handoff", async () => {
    // `--emit-skeletons` writes only `<screenId>.html`, never an
    // `index.html`, while handoff.md copies `iter-NN/index.html` into
    // `.qfai/prototypes/final/`. Presenting the per-screen shape as an
    // exclusive alternative left an accepted iteration with nothing for
    // `/qfai-implement` to read.
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
      expect(generatorRef).toContain("Opt-in **seed aid**, not an alternative output shape");
      expect(generatorRef).toContain("Neither writes an `index.html`.");
      expect(generatorRef).toContain("An accepted iteration must still carry `iter-NN/index.html`");
      expect(generatorRef).toContain("before the loop converges");
      // Whitespace-tolerant: the phrase spans a line break today, and a reflow
      // of the surrounding paragraph would otherwise break this assertion
      // without the meaning having changed.
      expect(generatorRef).toMatch(/cycle 1 would otherwise\s+accept it as it stands/);
      expect(generatorRef).not.toContain("mutually exclusive with the single-file envelope");
    }
  });

  it("documents the DESIGN.md compliance gate as non-waivable in both prompts", async () => {
    // The prompts once advertised the findings as "advisory-failing" with
    // "a Reviewer can override when a finding is a known false positive".
    // No override input exists: `prototypingCertify` exits 2 on any
    // violation, `isConverged` requires `designMdViolations.length === 0`,
    // and `recomputeFinalIterDesignMdViolations` re-scans the accepted
    // iteration's HTML, discarding whatever the Reviewer recorded. An
    // operator who believed the promise had no legal way forward.
    for (const tree of [templateQfaiDir, path.join(repoRoot, ".qfai")]) {
      const referencesDir = path.join(tree, "assistant", "skill", "qfai-prototyping", "references");
      const [generatorRef, reviewerRef] = await Promise.all([
        readFile(path.join(referencesDir, "generator-prompt.md"), "utf-8"),
        readFile(path.join(referencesDir, "reviewer-prompt.md"), "utf-8"),
      ]);

      // The retracted promise must not come back on either side.
      expect(generatorRef).not.toContain("advisory-failing");
      expect(generatorRef).not.toMatch(/Reviewer can override/i);
      expect(reviewerRef).not.toMatch(/Reviewer can override/i);

      // Whitespace-tolerant: the statements wrap mid-phrase today and a
      // reflow must not fail this test without the meaning changing.
      expect(generatorRef).toMatch(/hard and\s+non-waivable/);
      expect(generatorRef).toMatch(/there is no\s+Reviewer override/);
      // The reader must also learn why a hand-written `[]` does not work.
      // The re-scan guarantee is scoped to the CONVERGENCE stop:
      // `prototypingIterate` only calls
      // `recomputeFinalIterDesignMdViolations` when `shouldStop()`
      // returned "converged", so a max-iterations stop must not be
      // advertised as re-scanned. `certify` is what closes that path.
      expect(generatorRef).toMatch(/\*\*convergence\*\* stop/);
      expect(generatorRef).toMatch(/re-scanned before the stop\s+is honoured/);
      expect(generatorRef).toMatch(/\*\*max-iterations\*\* stop skips that re-scan/);
      // The stop requires four exceptional scores and three empty arrays. A prompt
      // that named only a subset of the findings would leave the generator unable to
      // explain why a well-reviewed run did not stop, or what to fix next.
      expect(generatorRef).toMatch(/\*\*all three finding arrays empty\*\*/);
      expect(generatorRef).toMatch(
        /`designMdViolations`, `layoutAntiPatternsDetected` and\s+`blockingFindings`/,
      );
      expect(generatorRef).toMatch(/one\s+surviving `lap-\*` keeps the loop\s+running/);
      // And the re-scan is not a proof of inspection.
      // `recomputeFinalIterDesignMdViolations` returns `[]` for an ENOENT
      // directory and `continue`s past a file it cannot stat or read, so an
      // absent or unreadable evidence tree honours the exit-64 stop with
      // nothing examined. Certify is the half that fails closed: it exits 2
      // when the accepted iteration has no readable HTML at all.
      expect(generatorRef).toMatch(/\*\*present and readable\*\*/);
      expect(generatorRef).toMatch(/yields no findings and therefore does not\s+block the stop/);
      expect(generatorRef).toMatch(/refuses to seal\s+at all/);
      expect(generatorRef).toMatch(
        /certify` re-scans every captured HTML file of\s+the accepted iteration unconditionally/,
      );
      // `findIterationHtmlFiles(evidenceRoot, …)` is certify's only scan
      // input, so the guarantee covers the CAPTURE tree and not the
      // authoring `prototypes/` tree the operator actually ships. An
      // unqualified "no certificate is issued over a violation" would
      // over-promise for a literal CAPTURE never rendered.
      expect(generatorRef).toMatch(/the capture evidence\s+shows\*\*/);
      expect(generatorRef).toMatch(/never opens the\s+authoring tree/);
      // No scanner injects `designMdViolations` into an ordinary cycle's
      // review — `recomputeFinalIterDesignMdViolations` runs only on the
      // convergence stop and its result is never written back. The prompt
      // must not tell the generator to expect prior-review findings.
      expect(generatorRef).toMatch(/Ordinary cycles carry no scanner output/);
      expect(generatorRef).toMatch(/stays `\[\]` in every Reviewer report/);
      expect(generatorRef).toMatch(/not\s+written back into the review/);
      // `runPrototypingCertify` branches to `runUpgradeScopeFull` BEFORE
      // the HTML scan, so `--upgrade-scope full` rewrites a sealed
      // certificate without re-scanning. The "unconditional" claim above
      // must therefore be scoped to the issuing path and the carve-out
      // named, with `--check` as the recovery.
      expect(generatorRef).toMatch(/certify --upgrade-scope full` is not an issuing/);
      expect(generatorRef).toMatch(/without\s+re-scanning HTML/);
      expect(generatorRef).toMatch(/certify --check`/);
      expect(reviewerRef).toContain("re-scan result wins over a manually emptied array");
      expect(reviewerRef).toContain("readable HTML is re-scanned on convergence and certification");

      // DESIGN.md is frozen for the run: `evaluateCycleGteOneGate`
      // compares live DESIGN.md / lock / cycle-0 cached sha256 and exits 2
      // on any mismatch, so "widen DESIGN.md" is not a mid-loop escape
      // hatch. The prompt must route a brand change through a refreeze +
      // cycle-0 restart instead.
      expect(generatorRef).toMatch(
        /Do\s+\*\*not\*\* edit `DESIGN\.md` to widen the allowlist mid-loop/,
      );
      expect(generatorRef).toMatch(/exits 2 with a\s+hash mismatch/);
      expect(generatorRef).toMatch(/refreeze the lock via `\/qfai-sdd`/);
      // The restart must be a runnable command: the prior loop always left
      // an `iter-00` behind, and the cycle-0 destructive-rerun gate in
      // `prototypingIterate` exits 2 without `--force`. A bare `--cycle 0`
      // hint cannot recover the run.
      expect(generatorRef).toMatch(
        /restart the loop with\s+`npx qfai prototyping iterate --cycle 0 --target-url <url> --force`/,
      );
      expect(generatorRef).toMatch(/`--force` is not optional here/);
      // The cycle-0 `--force` backup in `prototypingIterate` renames
      // `PROTOTYPING_EVIDENCE_REL/iter-00` only; `.qfai/prototypes/iter-00`
      // is left in place and the next cycle-0 write clobbers it. The
      // prompt must name the tree that is backed up and the one that is
      // not, or "iter-00 is renamed" promises recoverability it lacks.
      expect(generatorRef).toMatch(
        /`\.qfai\/evidence\/prototyping\/iter-00` is renamed to\s+`iter-00\.backup-<ISO>`/,
      );
      expect(generatorRef).toMatch(/Only the \*\*evidence\*\* tree is\s+backed up/);
      expect(generatorRef).toMatch(/copy that\s+directory aside yourself/);
    }
  });

  it("keeps the DESIGN.md scanner doc in sync with the non-waivable prompt wording", async () => {
    // `designMdViolations.ts` and `generator-prompt.md` are an SSOT-sync
    // pair (scripts/check-prompt-scanner-pair.mjs). The gate's posture is
    // stated on both halves so a future edit to one is visibly unpaired.
    const scanner = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "prototyping",
        "designMdViolations.ts",
      ),
      "utf-8",
    );
    // Match against the prose with the JSDoc `*` gutter and line wrapping
    // removed, so a re-wrap of the block comment cannot fail this test
    // without the statement itself changing.
    const scannerProse = scanner.replace(/^\s*\*\s?/gm, "").replace(/\s+/g, " ");
    expect(scannerProse).toContain("hard and non-waivable");
    expect(scannerProse).toContain("there is no Reviewer override");
    // Same scoping as the prompt half: the iterate-side re-scan covers the
    // convergence stop only; certify is the unconditional backstop.
    expect(scannerProse).toContain("CONVERGENCE stop");
    expect(scannerProse).toContain("`max-iterations` stop skips that re-scan");
    expect(scannerProse).toContain("unconditionally");
    // And the same capture-tree scoping both prompts now carry.
    expect(scannerProse).toContain("accepted iteration's captured HTML");
    expect(scannerProse).toContain("the capture evidence shows");
    // And the same two carve-outs the prompt now carries: no per-cycle
    // injection, and `--upgrade-scope full` does not re-scan.
    expect(scannerProse).toContain("stays `[]`");
    expect(scannerProse).toContain("not written back into `prototyping.json`");
    expect(scannerProse).toContain("`certify --upgrade-scope full`");
    // And the readability scoping the two prompts now carry: the iterate-side
    // re-scan returns `[]` for an ENOENT directory and skips a file it cannot
    // stat or read, so an empty result is not evidence of inspection.
    expect(scannerProse).toContain("PRESENT AND READABLE");
    expect(scannerProse).toContain("skips a file it cannot stat or read");
  });

  it("states the procurement posture on both halves of the same pair", async () => {
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
      // The load-bearing half stays: CSS behind a `<link>` is outside the
      // scan, so the authoring side is the only place it can be refused.
      expect(generatorRef).toContain('`<link rel="stylesheet">`');
    }

    // The scanner half says why the permission is safe — it judges the values
    // a document states, and has no way to read where the markup came from.
    const scanner = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "prototyping",
        "designMdViolations.ts",
      ),
      "utf-8",
    );
    const scannerProse = scanner.replace(/^\s*\*\s?/gm, "").replace(/\s+/g, " ");
    expect(scannerProse).toContain("never their provenance");
    expect(scannerProse).toContain("transposed from a component catalogue");
    expect(scannerProse).toContain("a stylesheet behind a `<link>`");
  });

  it("keeps the generator's --auto-serve routing guidance in step with the server", async () => {
    // `--auto-serve` gained an SPA route fallback: a document request that
    // matches no file on disk is served `index.html`. generator-prompt.md is
    // injected into the generator sub-agent every cycle, so a stale "no SPA
    // fallback" claim there makes the generator declare hash routes and avoid
    // the parameterized contract routes the fallback exists to make capturable.
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

      // The stale claims must be gone.
      expect(generatorRef).not.toContain("it has no SPA fallback");
      expect(generatorRef).not.toContain("they will 404 under `--auto-serve`");
      expect(generatorRef).not.toContain("so a `/settings` route 404s while");

      // The behaviour the server actually implements must be stated.
      expect(generatorRef).toContain("`index.html` instead of 404");
      expect(generatorRef).toContain("`text/html`");
      expect(generatorRef).toContain("/pairs/:instrument");

      // The two genuine non-fallback cases stay documented.
      expect(generatorRef).toContain("Sub-resource requests");
      expect(generatorRef).toContain("path-traversal 403 guard");

      // The third one: the fallback needs an index.html to fall back TO.
      // `resolveServablePath` returns null when the served directory has
      // none, so a skeleton-only cycle-0 tree still 404s path routes and
      // loses that screen's evidence. Saying the fallback is unconditional
      // would send the generator into exactly that hole.
      expect(generatorRef).toContain("The fallback needs an `index.html` to fall back _to_");
      expect(generatorRef).toMatch(/skeleton-only cycle-0 tree[\s\S]{0,120}still \*\*404s\*\*/);
    }

    // generator-prompt.md is one half of an SSOT-sync pair; the scanner it is
    // paired with documents which screens ever reach it, which is exactly what
    // the routing shape decides. Assert the scanner half states the same
    // fallback contract so the pair cannot drift back apart.
    const scannerSource = await readFile(
      path.join(
        repoRoot,
        "packages",
        "qfai",
        "src",
        "core",
        "prototyping",
        "designMdViolations.ts",
      ),
      "utf-8",
    );
    expect(scannerSource).toContain("`index.html` to a document request");
    expect(scannerSource).toContain("parameterized contract routes");
    expect(scannerSource).toContain("path-traversal 403 guard");

    // The operator-facing half of the same contract. certify's missing-HTML
    // recovery text is what an operator reads after a capture gap, and it is
    // inside the same CLI as the prompt above: if it keeps advising "the
    // server 404s path routes, use hash routes", the operator rewrites the
    // contract routes the generator was told to keep.
    const certifySource = await readFile(
      path.join(repoRoot, "packages", "qfai", "src", "cli", "commands", "prototypingCertify.ts"),
      "utf-8",
    );
    expect(certifySource).not.toContain("use hash routes or point --target-url");
    expect(certifySource).toContain("serves index.html to any document ");
    expect(certifySource).toContain("Do not reshape contract routes into hash ");
    expect(certifySource).toContain("has nothing to fall back to and still 404s");
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
    // and the mandatory `## Default Autopilot Policy` section fit inside it.
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

    // v2.0: per-iter evidence is screenshot + html + review.json (no
    // command-log / a11y snapshot mandate). Stop conditions are
    // deterministic exit codes (0/64/65/2).
    expect(content).toMatch(/iter-NN/);
    expect(content).toMatch(/screenshot|\.png/);
    expect(content).toMatch(/review\.json/);
    expect(content).toMatch(/exit code|`64`|`65`/);
    expect(content).toMatch(/best-of-history is gone/i);
  });

  it("keeps shipped prototyping cycle literals aligned with the iteration budget", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-prototyping");
    const files = await fg(["SKILL.md", "references/*.md"], { cwd: skillDir, absolute: true });

    expect(files.length).toBeGreaterThan(0);

    // Two families of free-text restatement drift independently, so
    // BUDGET_LITERAL_PATTERNS scans both. Three divergent values once
    // circulated here.
    //   - terminal: the last legal cycle index ("cycles 1..9", "C1..9") — must
    //     equal MAX_ITERATION_INDEX.
    //   - total: the size of the budget, written either number-first ("up to
    //     10 cycles", "fixed 10-cycle budget") or noun-first ("Iteration count
    //     cap is 10") — must equal MAX_ITERATIONS. These are the user-facing
    //     headline numbers; a missing arm leaves them stale and green.
    const mismatches: string[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf-8");
      const relPath = path.relative(repoRoot, filePath);
      for (const stale of findStaleBudgetLiterals(content)) {
        mismatches.push(`${relPath}: ${stale}`);
      }
    }

    expect(
      mismatches,
      `cycle literals must equal MAX_ITERATION_INDEX (${MAX_ITERATION_INDEX}) ` +
        `or MAX_ITERATIONS (${MAX_ITERATIONS})`,
    ).toEqual([]);

    // The scan is the deliverable, so pin its reach in both directions: a
    // guard that only ever reads correct files proves nothing. The noun-first
    // phrasing is the one SKILL.md actually ships, and the number-first-only
    // arm read straight past it.
    const staleValue = MAX_ITERATIONS + 5;
    for (const phrasing of [
      `Iteration count cap is ${staleValue}`,
      `iteration count is capped globally to ${staleValue}`,
      `cycle limit: ${staleValue}`,
      `max-iterations: ${staleValue}`,
      `up to ${staleValue} cycles`,
      `a fixed ${staleValue}-cycle budget`,
      `Cycles 1..${staleValue}`,
    ]) {
      expect(findStaleBudgetLiterals(phrasing), `must flag: ${phrasing}`).not.toEqual([]);
    }

    // …and what it must not flag: this skill is full of legitimate per-cycle
    // indices, so requiring a cap word is what keeps the guard usable.
    for (const legitimate of [
      "npx qfai prototyping iterate --cycle 0 --target-url <url>",
      "reaching cycle 9 on a non-converged iteration set exits 65 directly",
      "commit `prototyping: iter-09`",
      "200..500 word critique",
    ]) {
      expect(findStaleBudgetLiterals(legitimate), `must not flag: ${legitimate}`).toEqual([]);
    }
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
      expect(content).toContain(".qfai/assistant/skill/qfai-prototyping/SKILL.md");
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
      "# budget is owned by `.qfai/assistant/skill/qfai-prototyping/SKILL.md`.",
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
    const mandatoryDiscussSentence =
      "ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。";
    const discussSkillPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const discussionRcpFooterPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "rcp_footer.md",
    );
    const sddRcpFooterPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "references",
      "rcp_footer.md",
    );
    const approvedJapanesePaths = new Set([
      path.resolve(
        templateQfaiDir,
        "assistant",
        "skill",
        "qfai-atdd",
        "references",
        "test-case-depth-checklist.md",
      ),
      path.resolve(templateQfaiDir, "assistant", "rule", "research-first-protocol.md"),
    ]);
    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      const normalizedPath = path.resolve(filePath);
      if (normalizedPath === discussionRcpFooterPath || normalizedPath === sddRcpFooterPath) {
        continue;
      }
      if (approvedJapanesePaths.has(normalizedPath)) {
        continue;
      }
      const sanitized =
        normalizedPath === discussSkillPath
          ? content.replaceAll(mandatoryDiscussSentence, "")
          : content;
      if (japanesePattern.test(sanitized)) {
        matches.push(path.relative(repoRoot, filePath));
      }
    }

    const discussContent = await readFile(discussSkillPath, "utf-8");
    expect(discussContent).toContain(mandatoryDiscussSentence);
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
    // v2.0 (spec-0012 v2.0 absorbed): replaced v1.x phrasing with single-thread loop language.
    expect(normalizedNpm).toMatch(/single-thread evolution loop|qfai prototyping iterate/);
    expect(normalizedNpm).toMatch(/per-iteration evidence[\s\S]*?review\.json/i);
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

  it("ensures qfai-implement skill body exists with required content", async () => {
    const implementPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-implement",
      "SKILL.md",
    );
    const content = await readFile(implementPath, "utf-8");

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

    // Per-aspect brand yaml contracts were removed; root DESIGN.md +
    // DESIGN.md.lock.yaml are the brand SSOT.
    expect(templates.sort()).toEqual(
      [
        "api-contract.sample.yaml",
        "db-contract.sample.sql",
        "design-md-lock.sample.yaml",
        "ui-contract.sample.yaml",
      ].sort(),
    );

    const skillPath = path.join(templateQfaiDir, "assistant", "skill", "qfai-sdd", "SKILL.md");
    const skillContent = await readFile(skillPath, "utf-8");
    expect(skillContent).toContain("references/contract-artifact-rules.md");
  });

  it("ensures qfai-discussion skill contains required coverage topics", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(discussPromptPath, "utf-8");

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

  it("ensures qfai-discussion includes localized completion handoff guidance", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(discussPromptPath, "utf-8");
    const requiredSentence =
      "ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。";

    expect(content).toContain("## Completion Message & Next Actions (MUST)");
    expect(content).toContain(requiredSentence);
    expect(content).toMatch(/active user language/i);
    expect(content).toContain("`/qfai-sdd`");
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

    const routing = await readFile(path.join(defaultsDir, "agent-routing.yml"), "utf-8");
    const profiles = await readFile(path.join(defaultsDir, "review-profiles.yml"), "utf-8");
    expect(routing).toContain("routing:");
    expect(profiles).toContain("profiles:");
    for (const file of ["agent-routing.yml", "review-profiles.yml", "agent-catalog.yml"]) {
      expect(existsSync(path.join(assistantDir, file)), file).toBe(false);
      expect(existsSync(path.join(assistantDir, "manifest", file)), file).toBe(false);
    }
  });

  it("keeps discussion and SDD review templates at their skill paths", async () => {
    const discussionRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "rcp_footer.md",
    );
    const sddRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "references",
      "rcp_footer.md",
    );
    const legacyRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "templates",
      "rcp_footer.md",
    );
    const [discussionRcpFooter, sddRcpFooter] = await Promise.all([
      readFile(discussionRcpFooterPath, "utf-8"),
      readFile(sddRcpFooterPath, "utf-8"),
    ]);
    expect(existsSync(legacyRcpFooterPath)).toBe(false);
    expect(discussionRcpFooter).toContain("Review Target（固定）");
    expect(discussionRcpFooter).toContain("discussion-<YYYYMMDDhhmmssSSS>");
    expect(sddRcpFooter).toContain("Review Cycle");
    expect(sddRcpFooter).toContain("BF-NNNN");
    expect(sddRcpFooter).toContain(".qfai/evidence/sdd-BF-NNNN.md");

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
    const discussionPlaybookPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "references",
      "review-cycle-playbook.md",
    );
    const sddPlaybookPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-sdd",
      "references",
      "review-cycle-playbook.md",
    );
    const [discussionPlaybook, sddPlaybook] = await Promise.all([
      readFile(discussionPlaybookPath, "utf-8"),
      readFile(sddPlaybookPath, "utf-8"),
    ]);

    expect(discussionPlaybook).toContain('target.kind` must be `"discussion"`');
    expect(sddPlaybook).toContain("target.kind: flow");
    expect(sddPlaybook).toContain("target.path for the business-flow-NNNN directory");
    expect(sddPlaybook).toContain("producer is sdd");
  });

  it("pins the discussion review-pack write paths to the shared review tree", async () => {
    const discussionSkillDir = path.join(templateQfaiDir, "assistant", "skill", "qfai-discussion");
    const discussionPlaybookPath = path.join(
      discussionSkillDir,
      "references",
      "review-cycle-playbook.md",
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

    for (const artifact of ["review_request.md", "R01_<reviewer>.md", "summary.json"]) {
      expect(discussionPlaybook).toContain(`.qfai/review/${packDirName}/${artifact}`);
    }
    expect(reviewRequestTemplate).toContain(`.qfai/review/${packDirName}/review_request.md`);

    // The skill body must actually route the run through the playbook: a write-path rule the
    // Required Process never opens does not reach the reviewer step that writes the pack.
    expect(discussionSkill).toContain("references/review-cycle-playbook.md");

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

    const sddSkill = await readFile(
      path.join(templateQfaiDir, "assistant", "skill", "qfai-sdd", "SKILL.md"),
      "utf-8",
    );
    expect(sddSkill).toContain("`npx qfai sdd preflight` and use its `selectedInputPath`");

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
      "Short ID",
      "Entity",
      "Declared ID",
      "File",
      "Depends On",
      "Reconciled With",
      "Purpose",
    ]);
  });

  it("keeps qfai-sdd scoped to business flows", async () => {
    const skillPath = path.join(templateQfaiDir, "assistant", "skill", "qfai-sdd", "SKILL.md");
    const workflowPath = path.join(templateQfaiDir, "assistant", "rule", "workflow.md");
    const [skill, workflow] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(workflowPath, "utf-8"),
    ]);

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
    expect(sddMemory).toContain("03_contract/tech.md");
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
      "03_contract/cli/command.md",
      "03_contract/contracts.md",
      "03_contract/structure.md",
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
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skill",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

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
    // A skill may narrow this bucket, and may hard-require an input only it
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
  // A path inside the installed package. This repository ships that package
  // and never installs it — `scripts/check-not-a-dependency.mjs` refuses an
  // install that would create one — so no checkout of this tree holds the
  // directory. Naming a file under it is how the README tells an adopter where
  // the packaged copy of a shipped file sits in THEIR tree.
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

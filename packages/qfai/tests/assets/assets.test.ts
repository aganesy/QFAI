import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";
import { countLines, LINE_BUDGET_EXEMPT, SKILL_MD_MAX_LINES } from "../helpers/skillBudget.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const templateRoot = path.join(repoRoot, "packages", "qfai", "assets", "init");
const templateRootDir = path.join(templateRoot, "root");
const templateQfaiDir = path.join(templateRoot, ".qfai");

describe("assets guardrails", { timeout: 30000 }, () => {
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
      path.join(templateQfaiDir, "assistant", "skills", "qfai-prototyping", "SKILL.md"),
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
    const canonicalDir = path.join(templateQfaiDir, "assistant", "skills");
    const canonical = await fg(["*/SKILL.md"], {
      cwd: canonicalDir,
      absolute: true,
    });

    expect(canonical.length).toBeGreaterThan(0);

    // v2.0 (spec-0012 v2.0 absorbed): qfai-prototyping no longer ships the v1.x
    // delegation guardrail block. The shared baseline (referenced by
    // gate-failure-autorepair-protocol assertion below) covers cross-
    // skill delegation contracts. Apply the v1.x guardrail to all
    // skills *except* qfai-prototyping.
    const requiredPhrases = [
      "## Sub-agent Delegation (MANDATORY)",
      "### Orchestrator Protocol (MUST)",
      "### Capability Probe (MUST)",
      "### Delegation Failure (Hard Stop)",
      "Do not simulate roles",
      "## Work Orders Summary",
      // #248 review: the reviewer-budget branch mandates recording an
      // un-runnable gate as `PENDING`, so the status vocabulary each skill
      // declares has to admit it. `PASS/REVISE` is now a prefix of the
      // required value rather than the whole of it.
      "Status (PASS/REVISE/PENDING)",
      "### Reviewer Gate (MUST)",
      "Reviewer",
      "PASS",
      "REVISE",
    ];

    const missing = (
      await Promise.all(
        canonical
          .filter((p) => !p.includes("qfai-prototyping"))
          .map(async (filePath) => {
            const content = await readFile(filePath, "utf-8");
            const missingPhrases = requiredPhrases.filter((phrase) => !content.includes(phrase));
            if (missingPhrases.length === 0) {
              return null;
            }
            return `${path.relative(repoRoot, filePath)}: ${missingPhrases.join(", ")}`;
          }),
      )
    ).filter((result): result is string => result !== null);

    expect(missing).toEqual([]);
  });

  it("ensures shared delegation baseline defines hard-stop payload and capability probe contract", async () => {
    const baselinePath = path.join(
      templateQfaiDir,
      "assistant",
      "constitution",
      "shared-skill-delegation-baseline.md",
    );
    const baseline = await readFile(baselinePath, "utf-8");
    const requiredHardStopPayload = [
      "Attempt the first required delegation at stage start using the platform's native delegation mechanism.",
      "Treat that first real delegation attempt as the capability check. Do not gate execution on preflight availability questions or synthetic probe-only checks.",
      // #248 splits delegation failure into unavailable vs saturated, so the
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
      "constitution",
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
      // #231 added a second stop condition (reviewer round count), so the
      // list is no longer exhaustive and "only" was dropped.
      // #381 inserted `**any upstream spec/contract finding**` into the stop
      // list so it is closed over the five-class classification; the routing
      // itself is pinned in `gateFailureClassRouting.test.ts`.
      "stop for destructive changes, **any upstream spec/contract finding**, ambiguous product/spec decisions, missing permissions/tools, or repeated no-progress failures",
      // #381 appended the work counts: an agent that can report "21 complete,
      // 5 blocked" has a credible alternative to repairing upstream.
      "cause, attempted fixes, remaining blocker, user action, retry gate, and **the work counts",
    ];

    for (const phrase of requiredPhrases) {
      expect(baseline).toContain(phrase);
    }
  });

  it("ensures gate-running QFAI skills reference the autorepair protocol", async () => {
    // v2.0 (spec-0012 v2.0 absorbed): qfai-prototyping replaces the autorepair-protocol
    // reference with deterministic `qfai prototyping iterate` exit codes
    // (0/64/65/2). Apply the legacy reference to other gate-running skills.
    const skills = [
      "qfai-discussion",
      "qfai-sdd",
      "qfai-atdd",
      "qfai-implement",
      "qfai-verify",
      "qfai-configure",
    ];
    const requiredPhrase = "shared-skill-operating-baseline.md#gate-failure-autorepair-protocol";

    const missing = (
      await Promise.all(
        skills.map(async (skill) => {
          const skillPath = path.join(templateQfaiDir, "assistant", "skills", skill, "SKILL.md");
          const content = await readFile(skillPath, "utf-8");
          return content.includes(requiredPhrase) ? null : skill;
        }),
      )
    ).filter((skill): skill is string => skill !== null);

    expect(missing).toEqual([]);
  });

  it("ensures canonical skills avoid deprecated simulation fallback wording", async () => {
    const canonicalDir = path.join(templateQfaiDir, "assistant", "skills");
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

  it("ensures configure and verify delegation order follows routing SSOT", async () => {
    const routingPath = path.join(templateQfaiDir, "assistant", "manifest", "agent-routing.yml");
    const configurePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-configure",
      "SKILL.md",
    );
    const verifyPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-verify", "SKILL.md");

    const [routing, configure, verify] = await Promise.all([
      readFile(routingPath, "utf-8"),
      readFile(configurePath, "utf-8"),
      readFile(verifyPath, "utf-8"),
    ]);

    expect(routing).toContain("skill: qfai-configure");
    expect(routing).toContain("mandatory_agents: [delivery-planner, qa-strategist]");
    expect(routing).toContain("skill: qfai-verify");
    expect(routing).toContain("mandatory_agents: [delivery-planner, qa-strategist]");

    expect(configure).toContain(
      "Use `.qfai/assistant/manifest/agent-routing.yml` as the routing SSOT.",
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

    expect(verify).toContain(
      "Use `.qfai/assistant/manifest/agent-routing.yml` as the routing SSOT.",
    );
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

  // QFAI:SPEC-0014:TC-0014-0003
  it("keeps qfai-verify fix-until-PASS contract", async () => {
    const skillPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-verify", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain(
      'description: "Run and document quality gates (repo + qfai validate/report), fix until PASS."',
    );
    expect(content).toContain("Fix until PASS.");
    expect(content).toContain("If failing, produce an actionable fix list");
  });

  // QFAI:SPEC-0014:TC-0014-0007
  it("keeps qfai-verify evidence summary contract", async () => {
    const skillPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-verify", "SKILL.md");
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("A concise evidence summary exists (copy‑paste for PR).");
    expect(content).toContain("Change Classification (Primary/Tags)");
    expect(content).toContain("Run listed commands and record outputs.");
    expect(content).toContain("command list + pass/fail + next actions");
  });

  it("ensures qfai-prototyping v2.0 SKILL.md preserves drift protocol and 4 references", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skills", "qfai-prototyping");
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
      "skills",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/qfai prototyping iterate/);
    expect(content).toMatch(/10 iterations|10 cycles|up to 10/);
    expect(content).toContain(".qfai/contracts/ui/*.yaml");
    // Post-rewrite: brand SSOT is root DESIGN.md + lock yaml; legacy
    // per-aspect brand yaml references are dropped from this skill.
    expect(content).toContain("DESIGN.md");
    expect(content).toContain(".qfai/contracts/design/DESIGN.md.lock.yaml");
    expect(content).toContain(".qfai/prototypes/iter-00/index.html");
    expect(content).toContain("certify --check");
  });

  it("ensures qfai-prototyping v2.0 references and handoff sample exist", async () => {
    const skillDir = path.join(templateQfaiDir, "assistant", "skills", "qfai-prototyping");
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
          "skills",
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
          "skills",
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
      "skills",
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
      "skills",
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
      "skills",
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
      "skills",
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
    const agentPath = path.join(templateQfaiDir, "assistant", "agents", "qa-gatekeeper.md");
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

  it("ensures product.md has no backward compatibility posture", async () => {
    const productPath = path.join(templateQfaiDir, "assistant", "catalog", "product.md");
    const content = await readFile(productPath, "utf-8");
    const bannedPhrases = [
      "Maintain backward compatibility",
      "Breaking changes deferred until v2.0",
      "Migration guide required",
      "Migration guide (docs/migrations/) required",
      "deferred to v2.0",
      "legacy deprecation",
      "reconsidered in v2.0",
      "accepted for backward compatibility",
    ];
    for (const phrase of bannedPhrases) {
      expect(content, `product.md must not contain "${phrase}"`).not.toContain(phrase);
    }
    expect(content).not.toMatch(/deferred\s+to\s+v2/i);
  });

  it("ensures manifest.md has no v2.0 defer or migration guide posture", async () => {
    const manifestPath = path.join(templateQfaiDir, "assistant", "catalog", "manifest.md");
    const content = await readFile(manifestPath, "utf-8");
    const bannedPhrases = [
      "Breaking changes deferred until v2.0",
      "Migration guide required",
      "deferred to v2.0",
      "legacy deprecation",
      "reconsidered in v2.0",
      "accepted for backward compatibility",
    ];
    for (const phrase of bannedPhrases) {
      expect(content, `manifest.md must not contain "${phrase}"`).not.toContain(phrase);
    }
    expect(content).not.toMatch(/reconsidered\s+in\s+v2/i);
  });

  it("ensures contract artifact rules have no legacy acceptance wording", async () => {
    const contractRulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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

  it("does not ship review_archive gitignore in init template", async () => {
    const reviewArchiveIgnorePath = path.join(templateQfaiDir, "review_archive", ".gitignore");
    expect(existsSync(reviewArchiveIgnorePath)).toBe(false);
  });

  it("does not ship .qfai artifact README or seed placeholder files", async () => {
    const forbidden = await fg(
      [
        "**/README.md",
        "specs/spec-XXXX/**",
        "assistant/skills.local/**",
        "evidence/calibration.yaml",
      ],
      {
        cwd: templateQfaiDir,
        absolute: false,
        dot: true,
      },
    );

    const artifactOnly = forbidden.filter((relativePath) => !relativePath.startsWith("assistant/"));
    const deprecatedAssistantOnly = forbidden.filter((relativePath) =>
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
    const versionPattern = /\b(?:v)?\d+\.\d+\.\d+\b/;
    const approvedVersionedDocs = new Set([
      path.resolve(templateQfaiDir, "assistant", "constitution", "agent-selection.md"),
    ]);

    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      if (approvedVersionedDocs.has(path.resolve(filePath))) {
        continue;
      }
      if (versionPattern.test(content)) {
        matches.push(path.relative(repoRoot, filePath));
      }
    }

    expect(matches).toEqual([]);
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
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const discussionRcpFooterPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "references",
      "rcp_footer.md",
    );
    const sddRcpFooterPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "references",
      "rcp_footer.md",
    );
    const approvedJapanesePaths = new Set([
      path.resolve(templateQfaiDir, "assistant", "constitution", "agent-selection.md"),
      path.resolve(
        templateQfaiDir,
        "assistant",
        "skills",
        "qfai-atdd",
        "references",
        "test-case-depth-checklist.md",
      ),
      path.resolve(templateQfaiDir, "assistant", "catalog", "cli-ux-guidelines.md"),
      path.resolve(templateQfaiDir, "assistant", "constitution", "research-first-protocol.md"),
      path.resolve(templateQfaiDir, "assistant", "catalog", "ui-definition-protocol.md"),
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

  it("keeps 09_delta and waivers template guardrails", async () => {
    const deltaTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "specs",
      "spec",
      "09_delta.md",
    );
    const deltaTemplate = await readFile(deltaTemplatePath, "utf-8");
    expect(deltaTemplate).toContain("# 09 Delta");
    expect(deltaTemplate).toContain("## Change Summary");
    expect(deltaTemplate).toContain("## Rationale");
    expect(deltaTemplate).toContain("## Candidates Considered");
    expect(deltaTemplate).toContain("## Adopted");
    expect(deltaTemplate).toContain("## Rejected");
    expect(deltaTemplate).toContain("## Impact");
    expect(deltaTemplate).toContain("## Follow-ups");
    expect(deltaTemplate).toContain("DO NOT");
    expect(deltaTemplate).toContain("Temptation");

    const waiversTemplatePath = path.join(templateQfaiDir, "waivers.yml");
    const waiversTemplate = await readFile(waiversTemplatePath, "utf-8");
    expect(waiversTemplate).toContain("version: 1");
    expect(waiversTemplate).toContain("waivers: []");
    // The worked example must name a rule some validator actually emits, in the
    // spelling `validate.json` prints. `COMPAT-003` was neither (issue #398).
    expect(waiversTemplate).toContain("rule: TDDLIST_UNKNOWN_LEVEL");
    expect(waiversTemplate).not.toContain("COMPAT-");
    expect(waiversTemplate).toContain("expires:");
    expect(waiversTemplate).toContain("evidence:");
  });

  it("keeps root init assets free of wrapper directories", async () => {
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
      expect(readme).toContain("copied, never deleted");
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
    const readme = await readFile(readmePath, "utf-8");

    // W-3: README must express canonical discussion completion contract
    expect(readme).toContain(
      "UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.",
    );
    expect(readme).toContain(
      "`qfai init` does not seed `.qfai` workflow artifacts such as specs, discussions,",
    );
  });

  it("keeps npm README release posture aligned with v2.0 prototyping contract", async () => {
    const npmReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const npmReadme = await readFile(npmReadmePath, "utf-8");

    const normalizedNpm = normalizeReadme(stripUrls(npmReadme));
    // v2.0 (spec-0012 v2.0 absorbed): replaced v1.x phrasing with single-thread loop language.
    expect(normalizedNpm).toMatch(/single-thread evolution loop|qfai prototyping iterate/);
    expect(normalizedNpm).toMatch(/per-iter evidence|screenshot.*html.*review\.json/i);
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

  it("keeps example outputs relative", async () => {
    const fixturesDir = path.join(repoRoot, "packages", "qfai", "tests", "fixtures", "examples");
    const reportExample = await readFile(path.join(fixturesDir, "report.md"), "utf-8");
    expect(reportExample).toContain("- ルート: .");
    expect(reportExample).toContain("- 設定: qfai.config.yaml");

    const validateExamplePath = path.join(fixturesDir, "validate.json");
    const validateRaw = await readFile(validateExamplePath, "utf-8");
    const validate = JSON.parse(validateRaw) as {
      issues: Array<{ file?: string }>;
      traceability: { sc: { refs: Record<string, string[]> } };
    };

    const files = [
      ...validate.issues.map((issue) => issue.file).filter(Boolean),
      ...Object.values(validate.traceability.sc.refs).flat(),
    ];
    for (const file of files) {
      expect(path.isAbsolute(file)).toBe(false);
    }
  });

  it("ensures old tdd skills are abolished (not shipped)", async () => {
    for (const skillId of ["qfai-tdd-red", "qfai-tdd-green", "qfai-tdd-refactor"]) {
      expect(
        existsSync(path.join(templateQfaiDir, "assistant", "skills", skillId, "SKILL.md")),
      ).toBe(false);
    }
  });

  it("ensures qfai-implement skill body exists with required content", async () => {
    const implementPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-implement",
      "SKILL.md",
    );
    const content = await readFile(implementPath, "utf-8");

    expect(content).toContain("one test at a time");
    expect(content).toContain("failing test");
    expect(content).toContain("watch it fail");
    expect(content).toContain("watch it pass");
    expect(content).toContain("test-list.md");
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
      "skills",
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

    const skillPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-sdd", "SKILL.md");
    const skillContent = await readFile(skillPath, "utf-8");
    expect(skillContent).toContain("templates/contracts");
  });

  it("ensures qfai-discussion skill contains required coverage topics", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.";
    expect(packageReadme).toContain(canonicalPhrase);
    expect(rules).toContain(canonicalPhrase);
    expect(skill).toContain(canonicalPhrase);
  });

  it("ensures qfai-discussion includes localized completion handoff guidance", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "skills",
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

  it("ensures qfai-discussion templates include visuals guidance", async () => {
    const inceptionTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "templates",
      "02_Inception-Deck.md",
    );
    const storyTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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

  it("ensures review gate rules and review templates exist", async () => {
    const rulesPath = path.join(templateQfaiDir, "assistant", "catalog", "review-gate.rules.yml");
    const rules = await readFile(rulesPath, "utf-8");
    expect(rules).toContain("required:");
    expect(rules).toContain("optional:");
    expect(rules).toContain("reviewers:");
    expect(rules).toContain("agent-routing.yml");
    expect(rules).toContain("review-profiles.yml");

    const catalogPath = path.join(templateQfaiDir, "assistant", "manifest", "agent-catalog.yml");
    const routingPath = path.join(templateQfaiDir, "assistant", "manifest", "agent-routing.yml");
    const profilesPath = path.join(templateQfaiDir, "assistant", "manifest", "review-profiles.yml");
    const [catalog, routing, profiles] = await Promise.all([
      readFile(catalogPath, "utf-8"),
      readFile(routingPath, "utf-8"),
      readFile(profilesPath, "utf-8"),
    ]);
    expect(catalog).toContain("schema_version:");
    expect(catalog).toContain("agents:");
    expect(routing).toContain("routing:");
    expect(profiles).toContain("profiles:");

    const discussionRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "references",
      "rcp_footer.md",
    );
    const sddRcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
    expect(sddRcpFooter).toContain(".qfai/specs/spec-");

    const skillIds = ["qfai-discussion"];
    for (const skillId of skillIds) {
      const reviewTemplateDir = path.join(
        templateQfaiDir,
        "assistant",
        "skills",
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
      "skills",
      "qfai-discussion",
      "references",
      "review-cycle-playbook.md",
    );
    const sddPlaybookPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "references",
      "review-cycle-playbook.md",
    );
    const [discussionPlaybook, sddPlaybook] = await Promise.all([
      readFile(discussionPlaybookPath, "utf-8"),
      readFile(sddPlaybookPath, "utf-8"),
    ]);

    expect(discussionPlaybook).toContain('target.kind` must be `"discussion"`');
    expect(sddPlaybook).toContain('target.kind` must be `"spec"`');
    expect(`${discussionPlaybook}\n${sddPlaybook}`).not.toContain("require");
  });

  it("ensures qfai-sdd no longer ships legacy spec-pack templates", async () => {
    const legacySpecPackDir = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "spec-pack",
    );

    expect(existsSync(legacySpecPackDir)).toBe(false);
  });

  it("ensures removed split sdd wrappers are not shipped", async () => {
    const removedSkills = ["qfai-sdd-planning", "qfai-sdd-refinement"];
    for (const skillId of removedSkills) {
      expect(
        existsSync(path.join(templateQfaiDir, "assistant", "skills", skillId, "SKILL.md")),
      ).toBe(false);
    }
  });

  it("ensures qfai-sdd templates include discussion-pack preflight summary", async () => {
    for (const skillId of ["qfai-sdd"]) {
      const reportTemplatePath = path.join(
        templateQfaiDir,
        "assistant",
        "skills",
        skillId,
        "templates",
        "report",
        "preflight_summary.md",
      );
      const reportTemplate = await readFile(reportTemplatePath, "utf-8");
      expect(reportTemplate).toContain("status:");
      expect(reportTemplate).toContain("/qfai-sdd");
    }

    const businessFlowTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "specs",
      "_policies",
      "04_Business-Flow.md",
    );
    const businessFlowTemplate = await readFile(businessFlowTemplatePath, "utf-8");
    expect(businessFlowTemplate).toContain("```mermaid");
    expect(businessFlowTemplate).toMatch(/flowchart|sequenceDiagram/);

    const contractsTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "specs",
      "_policies",
      "05_Contracts.md",
    );
    const contractsTemplate = await readFile(contractsTemplatePath, "utf-8");
    expect(contractsTemplate).toContain("```mermaid");
    expect(contractsTemplate).toContain("erDiagram");
  });

  it("ensures qfai-sdd no-argument mode uses all-spec batch delegation", async () => {
    const skillPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-sdd", "SKILL.md");
    const workflowPath = path.join(templateQfaiDir, "assistant", "constitution", "workflow.md");
    const [skill, workflow] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(workflowPath, "utf-8"),
    ]);

    // #373 added the contract-scoped target the Drift Protocol's rerun step
    // names; the two existing modes are unchanged.
    expect(skill).toContain('argument-hint: "[<spec-id-or-name>] [--contract <CON-ID>] [--auto]"');
    expect(skill).toContain("## Arguments and Target Selection (Mandatory)");
    expect(skill).toContain(
      "Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.",
    );
    expect(skill).toContain("### No-argument batch delegation (MUST)");
    expect(skill).toContain("Delegate Slice in parallel per spec");
    expect(skill).toContain(
      "Validate gate and Review gate run once at batch tail after all target specs are integrated.",
    );

    expect(workflow).toContain("Stage 3 (`/qfai-sdd`) target policy:");
    expect(workflow).toContain(
      "Without argument (`/qfai-sdd`): scope is all capabilities from `.qfai/specs/_policies/03_Capabilities.md` in order.",
    );
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

  it("justifies every line-budget exemption and keeps it live", async () => {
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

  it("ensures v1.4.36 layered spec templates exist for sdd", async () => {
    const expected = [
      // #394 added the four _policies templates and spec/10_Plan.md that were
      // Mandatory Outputs with no shipped skeleton. Coverage against the
      // required-file registry is pinned in sddTemplateCoverage.test.ts.
      "_policies/01_Objective.md",
      "_policies/02_Initiative.md",
      "_policies/03_Capabilities.md",
      "_policies/04_Business-Flow.md",
      "_policies/05_Contracts.md",
      "_policies/06_Glossary.md",
      "_policies/07_Constraints.md",
      "_policies/08_Decisions.md",
      "_policies/09_Open-questions.md",
      "_policies/10_delta.md",
      "_policies/11_Slice-Policy.md",
      "spec/01_Spec.md",
      "spec/02_User-stories.md",
      "spec/03_Acceptance-Criteria.md",
      "spec/04_Business-Rules.md",
      "spec/05_Examples.md",
      "spec/06_Test-Cases.md",
      "spec/07_Decisions.md",
      "spec/08_Open-questions.md",
      "spec/09_delta.md",
      "spec/10_Plan.md",
      // The TDD execution ledger `/qfai-implement` selects from (#223).
      "spec/tdd/test-list.md",
      // The traceability ledger QFAI-TRACE-001 requires (#271).
      "spec/16_Traceability-ledger.md",
    ].sort();

    for (const skillId of ["qfai-sdd"]) {
      const templatesDir = path.join(
        templateQfaiDir,
        "assistant",
        "skills",
        skillId,
        "templates",
        "specs",
      );
      const files = await fg(["**/*.*"], {
        cwd: templatesDir,
        absolute: false,
      });
      expect(files.sort()).toEqual(expected);
    }
  });

  it("ensures solution-architect agent contains required contract constraints", async () => {
    const agentPath = path.join(templateQfaiDir, "assistant", "agents", "solution-architect.md");
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
      "skills",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toMatch(/ui-bearing discussion pack/i);
    expect(content).toMatch(/ui_bearing:\s*false[\s\S]*typically omit `prototyping\.yaml`/i);
    expect(content).toContain("prototyping.yaml");
  });

  it("discussion artifact rules include prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "skills",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    expect(content).toContain("prototyping.yaml");
    expect(content).toMatch(/ui-bearing discussion packs may include `prototyping\.yaml`/i);
    expect(content).toMatch(/non-ui discussion packs typically omit it/i);
  });

  it("discussion artifact rules contain prototyping: namespaced example", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
      "skills",
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
      "skills",
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
      "skills",
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
      "skills",
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
    expect(content).toMatch(/do not select a single visual winner/i);
  });

  it("artifact rules and SKILL.md share namespaced-only semantics for prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
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
    expect(skill).toMatch(/ui-bearing discussion packs may include `prototyping\.yaml`/i);
  });

  it("discussion artifact rules declare current non-blocking behavior for prototyping.yaml", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "references",
      "discussion-artifact-rules.md",
    );
    const content = await readFile(rulesPath, "utf-8");

    expect(content).toMatch(/does not block on missing `prototyping\.yaml`/i);
    expect(content).toMatch(/when `prototyping\.yaml` is present/i);
  });
});

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
  const canonicalSkill = path.join(root, ".qfai", "assistant", "skills", skillId);
  const integrationStat = await lstat(integrationSkill);

  expect(integrationStat.isSymbolicLink()).toBe(true);
  expect(await realpath(integrationSkill)).toBe(await realpath(canonicalSkill));

  return integrationSkill;
}

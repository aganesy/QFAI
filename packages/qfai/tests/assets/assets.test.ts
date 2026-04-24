import { existsSync } from "node:fs";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { runReport } from "../../src/cli/commands/report.js";
import { runValidate } from "../../src/cli/commands/validate.js";

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
      const required = ["critical constraints", "reviewer gate", "completion contract"];
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

    const requiredPhrases = [
      "## Sub-agent Delegation (MANDATORY)",
      "### Orchestrator Protocol (MUST)",
      "### Capability Probe (MUST)",
      "### Delegation Failure (Hard Stop)",
      "Do not simulate roles",
      "## Work Orders Summary",
      "Status (PASS/REVISE)",
      "### Reviewer Gate (MUST)",
      "Reviewer",
      "PASS",
      "REVISE",
    ];

    const missing = (
      await Promise.all(
        canonical.map(async (filePath) => {
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
      "instructions",
      "shared-skill-delegation-baseline.md",
    );
    const baseline = await readFile(baselinePath, "utf-8");
    const requiredHardStopPayload = [
      "Attempt the first required delegation at stage start using the platform's native delegation mechanism.",
      "Treat that first real delegation attempt as the capability check. Do not gate execution on preflight availability questions or synthetic probe-only checks.",
      "If the delegation fails, stop the stage immediately. Do not simulate roles and do not continue with self-execution.",
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
    const routingPath = path.join(templateQfaiDir, "assistant", "steering", "agent-routing.yml");
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
      "Use `.qfai/assistant/steering/agent-routing.yml` as the routing SSOT.",
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
      "Use `.qfai/assistant/steering/agent-routing.yml` as the routing SSOT.",
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

  it("ensures canonical skills include drift/test-layer reviewer gate guardrails", async () => {
    const files = [
      path.join(templateQfaiDir, "assistant", "skills", "qfai-prototyping", "SKILL.md"),
    ];

    expect(files.length).toBeGreaterThan(0);

    const missing = (
      await Promise.all(
        files.map(async (filePath) => {
          const content = await readFile(filePath, "utf-8");
          const missingPhrases: string[] = [];
          if (!content.includes("[DRIFT-PROTOCOL:MANDATORY]")) {
            missingPhrases.push("[DRIFT-PROTOCOL:MANDATORY]");
          }
          if (!content.includes("### Reviewer Gate (MUST)")) {
            missingPhrases.push("### Reviewer Gate (MUST)");
          }
          if (!/Drift Protocol/i.test(content)) {
            missingPhrases.push("Drift Protocol");
          }
          if (!/test-layers\.md/i.test(content)) {
            missingPhrases.push("test-layers.md");
          }
          if (!/\bnot gates?\b/i.test(content) && !/\bsignals?\b/i.test(content)) {
            missingPhrases.push("not gates/signals");
          }
          if (missingPhrases.length === 0) {
            return null;
          }
          return `${path.relative(repoRoot, filePath)}: ${missingPhrases.join(", ")}`;
        }),
      )
    ).filter((result): result is string => result !== null);

    expect(missing).toEqual([]);
  });

  it("ensures qfai-prototyping keeps all-spec evidence hard gate guardrails", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-prototyping",
      "SKILL.md",
    );
    const content = await readFile(skillPath, "utf-8");

    expect(content).toMatch(/ALL specs/i);
    expect(content).toContain(".qfai/contracts/design/evaluation-rubric.yaml");
    expect(content).toContain(".qfai/contracts/ui/*.yaml");
    expect(content).toContain(".qfai/evidence/prototyping/");
    expect(content).toContain("DONE is forbidden");
    expect(content).toMatch(/evaluation reviewer|l1/i);
    expect(content).toContain("REVISE");
  });

  it("ensures ui contract docs define mockable prototype and copy-ready example", async () => {
    const uiReadmePath = path.join(templateQfaiDir, "contracts", "ui", "README.md");
    const uiExamplePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-prototyping",
      "templates",
      "contracts",
      "ui-0001-order-mockable.yaml",
    );
    const uiContractTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "contracts",
      "ui-contract.sample.yaml",
    );

    const [readme, example, template] = await Promise.all([
      readFile(uiReadmePath, "utf-8"),
      readFile(uiExamplePath, "utf-8"),
      readFile(uiContractTemplatePath, "utf-8"),
    ]);

    expect(readme).toContain("prototype");
    expect(readme).toContain("mockPaths");
    expect(readme).toContain("markers");
    expect(readme).toContain("elements");
    expect(readme).toContain("actions");
    expect(readme).toContain("elements[].id");
    expect(readme).toContain("inspection-target text");
    expect(readme).toContain("L2 `actions[]` minimum set");
    expect(readme).toContain("FAQ");
    expect(readme).toContain("QFAI-PROT-238");

    expect(example).toContain("QFAI-CONTRACT-ID");
    expect(example).toContain("prototype:");
    expect(example).toContain("mockPaths:");
    expect(example).toContain("markers:");

    expect(template).toContain("prototype:");
    expect(template).toContain("required:");
    expect(template).toContain("validations:");
    expect(template).toContain("kind:");
    expect(template).toContain("effect:");
  });

  it("ships docs examples for ui contract and uiFidelity evidence", async () => {
    const docsUiContractPath = path.join(repoRoot, "docs", "examples", "ui-contract.good.yaml");
    const docsUiFidelityPath = path.join(
      repoRoot,
      "docs",
      "examples",
      "prototyping-ui-fidelity.good.json",
    );
    const packageJsonPath = path.join(repoRoot, "packages", "qfai", "package.json");
    const [uiContract, uiFidelity] = await Promise.all([
      readFile(docsUiContractPath, "utf-8"),
      readFile(docsUiFidelityPath, "utf-8"),
    ]);
    const packageJsonRaw = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonRaw) as { version?: unknown };
    const currentVersion =
      typeof packageJson.version === "string" ? packageJson.version : "unknown";

    expect(uiContract).toContain("QFAI-CONTRACT-ID");
    expect(uiContract).toContain("prototype:");
    expect(uiContract).toContain("mockPaths:");
    expect(uiContract).toContain("actions:");

    expect(uiFidelity).toContain('"uiFidelity"');
    expect(uiFidelity).toContain('"uiContractId"');
    expect(uiFidelity).toContain('"mockPaths"');
    expect(uiFidelity).toContain(`"toolVersion": "${currentVersion}"`);
  });

  it("ensures evidence readme documents uiFidelity mode requirements", async () => {
    const evidenceReadmePath = path.join(templateQfaiDir, "evidence", "README.md");
    const content = await readFile(evidenceReadmePath, "utf-8");

    // spec-0017 replaces "full-harness only" with unified mode invariant where
    // only maxCycles differs across modes, and replaces render.json with the
    // per-cycle Playwright CLI artifacts.
    expect(content).toContain("uiFidelity");
    expect(content).toMatch(/Mode [Ii]nvariant|full-harness.*only|only.*full-harness/);
    expect(content).toContain("interactive");
    expect(content).toMatch(/playwright-commands\.json|\.qfai\/evidence\/render\.json/);
    expect(content).toContain("mockPaths");
    expect(content).toMatch(/concrete (render\/browser QA\/spec refs|artifact|evidence)/i);
  });

  it("ships qa-gatekeeper agent card", async () => {
    const agentPath = path.join(templateQfaiDir, "assistant", "agents", "qa-gatekeeper.md");
    const content = await readFile(agentPath, "utf-8");

    expect(content).toContain("QA Gatekeeper");
    expect(content).toContain("validation");
    expect(content).toContain("runtime-proof");
    expect(content).toContain("prototyping evidence");
  });

  // TC-0017-0031 (static) — workflow template exists in init tree
  it("ships the qfai-validate GitHub Actions workflow template (spec-0017 REQ-0009)", async () => {
    const workflowPath = path.join(
      templateRootDir,
      ".github",
      "workflows",
      "qfai-validate.yml",
    );
    const content = await readFile(workflowPath, "utf-8");

    expect(content).toContain("name: qfai validate");
    expect(content).toContain("qfai validate --profile full --fail-on error");
    expect(content).toContain("QFAI-TEST-0001");
    expect(content).toMatch(/actions\/checkout@v4/);
    expect(content).toMatch(/actions\/setup-node@v4/);
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

  it("ensures product.md has no backward compatibility posture", async () => {
    const productPath = path.join(templateQfaiDir, "assistant", "steering", "product.md");
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
    const manifestPath = path.join(templateQfaiDir, "assistant", "steering", "manifest.md");
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

  it("ensures contracts/ui/README.md has no legacy acceptance wording", async () => {
    const uiReadmePath = path.join(templateQfaiDir, "contracts", "ui", "README.md");
    const content = await readFile(uiReadmePath, "utf-8");
    const bannedPhrases = ["accepted for backward compatibility", "backward compatibility"];
    for (const phrase of bannedPhrases) {
      expect(content).not.toContain(phrase);
    }
    expect(content).not.toMatch(/primary truth.*discussion/i);
    expect(content).toMatch(/downstream execution truth/i);
  });

  // .npmignore files removed — gitignore entries now live in root .gitignore
  // (see ensureRootGitignoreEntries in init.ts)

  it("ships review_archive gitignore in init template", async () => {
    const reviewArchiveIgnorePath = path.join(templateQfaiDir, "review_archive", ".gitignore");
    const content = await readFile(reviewArchiveIgnorePath, "utf-8");

    expect(content).toContain("*");
    expect(content).toContain("!.gitignore");
    expect(content).toContain("!README.md");
  });

  // review .gitignore removed — entries now in root .gitignore managed block
  // (see ensureRootGitignoreEntries in init.ts)

  it("keeps init template docs free of hard-coded versions", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const versionPattern = /\b(?:v)?\d+\.\d+\.\d+\b/;
    const templateReadmePath = path.resolve(templateQfaiDir, "README.md");
    const approvedVersionedDocs = new Set([
      path.resolve(templateQfaiDir, "assistant", "instructions", "agent-selection.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "manifest.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "product.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "tech.md"),
      path.resolve(templateQfaiDir, "evidence", "README.md"),
      path.resolve(templateQfaiDir, "contracts", "ui", "README.md"),
    ]);

    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      if (approvedVersionedDocs.has(path.resolve(filePath))) {
        continue;
      }
      if (versionPattern.test(content)) {
        if (path.resolve(filePath) === templateReadmePath) {
          const lines = content.split(/\r?\n/);
          const disallowed = lines.some((line) => {
            if (!versionPattern.test(line)) {
              return false;
            }
            return !/^Template version:\s*(?:v)?\d+\.\d+\.\d+\s*$/.test(line.trim());
          });
          if (!disallowed) {
            continue;
          }
        }
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
      path.resolve(templateQfaiDir, "assistant", "instructions", "agent-selection.md"),
      path.resolve(
        templateQfaiDir,
        "assistant",
        "skills",
        "qfai-atdd",
        "references",
        "test-case-depth-checklist.md",
      ),
      path.resolve(templateQfaiDir, "assistant", "steering", "cli-ux-guidelines.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "product.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "research-first-protocol.md"),
      path.resolve(templateQfaiDir, "assistant", "steering", "ui-definition-protocol.md"),
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
    expect(waiversTemplate).toContain("rule: COMPAT-003");
    expect(waiversTemplate).toContain("expires:");
    expect(waiversTemplate).toContain("evidence:");
  });

  it("keeps root init assets free of wrapper directories", async () => {
    // `.claude` / `.codex` must be absent entirely (generated by init symlink step).
    for (const removedDir of [".claude", ".codex"]) {
      expect(existsSync(path.join(templateRootDir, removedDir))).toBe(false);
    }
    // `.github` in the init template may exist ONLY to ship CI workflows
    // (spec-0017 REQ-0009: qfai-validate.yml). Wrapper dirs under it
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

  it("keeps package README aligned with discussion completion contract", async () => {
    const readmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const readme = await readFile(readmePath, "utf-8");

    // W-3: README must express canonical discussion completion contract
    expect(readme).toContain(
      "UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.",
    );
    expect(readme).toMatch(/discussion-YYYYMMDDhhmmssSSS[\s\S]*prototyping\.yaml/);
  });

  it("keeps npm README release posture aligned with package contract", async () => {
    const npmReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const npmReadme = await readFile(npmReadmePath, "utf-8");

    const normalizedNpm = normalizeReadme(stripUrls(npmReadme));
    expect(normalizedNpm).toContain("measurement-driven iteration accumulation");
    expect(normalizedNpm).toContain("mandatory per screen in full-harness");
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

  it("keeps docs/examples outputs relative", async () => {
    const reportExample = await readFile(
      path.join(repoRoot, "docs", "examples", "report.md"),
      "utf-8",
    );
    expect(reportExample).toContain("- ルート: .");
    expect(reportExample).toContain("- 設定: qfai.config.yaml");

    const validateExamplePath = path.join(repoRoot, "docs", "examples", "validate.json");
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

    expect(templates.sort()).toEqual(
      [
        "api-contract.sample.yaml",
        "db-contract.sample.sql",
        "design-system.sample.yaml",
        "evaluation-rubric.sample.yaml",
        "evaluator-calibration.sample.yaml",
        "exploration-brief.sample.yaml",
        "selected-direction.sample.yaml",
        "ui-contract.sample.yaml",
      ].sort(),
    );

    const skillPath = path.join(templateQfaiDir, "assistant", "skills", "qfai-sdd", "SKILL.md");
    const skillContent = await readFile(skillPath, "utf-8");
    expect(skillContent).toContain("templates/contracts");
  });

  it("ensures evaluator-calibration sample uses validator-aligned keys", async () => {
    const samplePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "contracts",
      "evaluator-calibration.sample.yaml",
    );
    const content = await readFile(samplePath, "utf-8");

    expect(content).toContain("good_critique_examples:");
    expect(content).toContain("too_lenient_examples:");
    expect(content).toContain("blandness_fail_examples:");
    expect(content).toContain("originality_fail_examples:");
    expect(content).not.toContain("good_critique:");
    expect(content).not.toContain("too_lenient:");
    expect(content).not.toContain("blandness_fail:");
    expect(content).not.toContain("originality_fail:");
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

  it("ensures qfai-discussion skill and discussion README use canonical pack wording", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );
    const readmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const packageReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");

    const [skill, readme, packageReadme] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(readmePath, "utf-8"),
      readFile(packageReadmePath, "utf-8"),
    ]);

    // All three must express the canonical completion contract wording
    const canonicalPhrase =
      "UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.";
    expect(packageReadme).toContain(canonicalPhrase);
    expect(readme).toContain(canonicalPhrase);
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
    const rulesPath = path.join(templateQfaiDir, "assistant", "steering", "review-gate.rules.yml");
    const rules = await readFile(rulesPath, "utf-8");
    expect(rules).toContain("required:");
    expect(rules).toContain("optional:");
    expect(rules).toContain("reviewers:");
    expect(rules).toContain("agent-routing.yml");
    expect(rules).toContain("review-profiles.yml");

    const catalogPath = path.join(templateQfaiDir, "assistant", "steering", "agent-catalog.yml");
    const routingPath = path.join(templateQfaiDir, "assistant", "steering", "agent-routing.yml");
    const profilesPath = path.join(templateQfaiDir, "assistant", "steering", "review-profiles.yml");
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

  it("keeps review README schema examples aligned with validator target kinds", async () => {
    const reviewReadmePath = path.join(templateQfaiDir, "review", "README.md");
    const content = await readFile(reviewReadmePath, "utf-8");

    expect(content).toContain('"kind": "spec|discussion"');
    expect(content).not.toContain('"kind": "spec|require|discussion"');
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
    const workflowPath = path.join(templateQfaiDir, "assistant", "instructions", "workflow.md");
    const [skill, workflow] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(workflowPath, "utf-8"),
    ]);

    expect(skill).toContain('argument-hint: "[<spec-id-or-name>] [--auto]"');
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

  it("keeps qfai-sdd and qfai-discussion SKILL.md compact enough for progressive disclosure", async () => {
    const targets = [
      ["qfai-sdd", 360],
      ["qfai-discussion", 400],
    ] as const;

    for (const [skillId, maxLines] of targets) {
      const skillPath = path.join(templateQfaiDir, "assistant", "skills", skillId, "SKILL.md");
      const content = await readFile(skillPath, "utf-8");
      const lineCount = content.split(/\r?\n/).length;
      expect(lineCount).toBeLessThanOrEqual(maxLines);
    }
  });

  it("ensures v1.4.36 layered spec templates exist for sdd", async () => {
    const expected = [
      "_policies/03_Capabilities.md",
      "_policies/04_Business-Flow.md",
      "_policies/05_Contracts.md",
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
  it("discussion README declares prototyping.yaml as classification-aware", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).toMatch(/ui-bearing discussion pack/i);
    expect(content).toMatch(/ui_bearing:\s*false[\s\S]*typically omit `prototyping\.yaml`/i);
    expect(content).toContain("prototyping.yaml");
  });

  it("workspace README directory map includes prototyping.yaml", async () => {
    const workspaceReadmePath = path.join(templateQfaiDir, "README.md");
    const content = await readFile(workspaceReadmePath, "utf-8");

    expect(content).toContain("prototyping.yaml");
  });

  it("discussion README and SKILL.md use consistent OQ Gate enum", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );

    const [readmeContent, skillContent] = await Promise.all([
      readFile(discussionReadmePath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);

    // README should expose the canonical gate enum in the OQ Register table.
    const canonicalGates = ["discussion", "sdd", "atdd", "tdd", "ops"];

    expect(skillContent).toContain("11_OQ-Register.md");
    expect(skillContent).toContain("open count is zero");

    // README should NOT use deprecated discuss|require|sdd
    expect(readmeContent).not.toMatch(/`discuss`.*`require`.*`sdd`/);
    // README should include canonical gates
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

  it("discussion README contains prototyping: namespaced example", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).toContain("prototyping:");
    expect(content).toContain("recommended_mode:");
    expect(content).toContain("rationale:");
    expect(content).toContain("allowed_modes:");
    expect(content).toContain("surface:");
  });

  it("discussion README says namespaced schema applies when present", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).toMatch(/namespaced schema \(when present\)/i);
  });

  it("discussion README does not contain legacy-permissive wording", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).not.toContain("legacy keys ignored");
    expect(content).not.toContain("legacy keys may be ignored");
    expect(content).not.toContain("accepted with warning");
  });

  it("discussion README enforces current-only posture for prototyping.yaml", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

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

  it("README and SKILL.md share namespaced-only semantics for prototyping.yaml", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discussion",
      "SKILL.md",
    );

    const [readme, skill] = await Promise.all([
      readFile(discussionReadmePath, "utf-8"),
      readFile(skillPath, "utf-8"),
    ]);

    // Both must mention planner-first / exploration-first semantics
    expect(readme).toMatch(/planner-first|exploration-first/i);
    expect(skill).toMatch(/planner-first|exploration-first/i);

    // README owns the canonical schema fields; SKILL owns optional artifact semantics and planner guidance
    expect(readme).toContain("recommended_mode");
    expect(skill).toContain("prototyping.yaml");

    expect(readme).toMatch(
      /ui-bearing.*may include.*prototyping\.yaml|optional recommendation artifact/i,
    );
    expect(skill).toMatch(/ui-bearing discussion packs may include `prototyping\.yaml`/i);
  });

  it("discussion README declares recommended_mode should be included in allowed_modes", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).toMatch(/recommended_mode.*should be included in.*allowed_modes/i);
  });

  it("discussion README declares current non-blocking behavior for prototyping.yaml", async () => {
    const discussionReadmePath = path.join(templateQfaiDir, "discussion", "README.md");
    const content = await readFile(discussionReadmePath, "utf-8");

    expect(content).toMatch(/does not block on missing `prototyping\.yaml`/i);
    expect(content).toMatch(
      /when `prototyping\.yaml` is present, prefer the canonical namespaced schema/i,
    );
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

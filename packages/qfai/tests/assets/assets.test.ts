import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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

describe("assets guardrails", { timeout: 15000 }, () => {
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
    const skillsDir = path.join(templateQfaiDir, "assistant", "skills");
    const files = await fg(["*/SKILL.md"], {
      cwd: skillsDir,
      absolute: true,
    });

    const missing: string[] = [];
    for (const filePath of files) {
      const content = await readFile(filePath, "utf-8");
      const required = [
        "CRITICAL CONSTRAINTS (Read First)",
        "Completion Contract (Shared)",
        "Evidence (MANDATORY)",
        "FINAL CHECKLIST (Check Last)",
        "Completion Checklist (MUST)",
        "Completion Message & Next Actions (MUST)",
      ];
      const missingSections = required.filter(
        (section) => !content.includes(section),
      );
      const completionMessageSection =
        content.split("## Completion Message & Next Actions (MUST)")[1] ?? "";
      if (
        completionMessageSection.length > 0 &&
        !completionMessageSection.includes("Action:")
      ) {
        missingSections.push("Action:");
      }
      if (missingSections.length > 0) {
        missing.push(
          `${path.relative(repoRoot, filePath)}: ${missingSections.join(", ")}`,
        );
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
      "### Simulation mode (Opt-in only)",
      "Simulation mode allowed",
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
          const missingPhrases = requiredPhrases.filter(
            (phrase) => !content.includes(phrase),
          );
          if (missingPhrases.length === 0) {
            return null;
          }
          return `${path.relative(repoRoot, filePath)}: ${missingPhrases.join(", ")}`;
        }),
      )
    ).filter((result): result is string => result !== null);

    expect(missing).toEqual([]);
  });

  it("ensures canonical skills include drift/test-layer reviewer gate guardrails", async () => {
    const skillsDir = path.join(templateQfaiDir, "assistant", "skills");
    const files = await fg(["*/SKILL.md"], {
      cwd: skillsDir,
      absolute: true,
    });

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
          if (
            !/\bnot gates?\b/i.test(content) &&
            !/\bsignals?\b/i.test(content)
          ) {
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
    expect(content).toContain("Coverage Matrix");
    expect(content).toContain("markdown + json");
    expect(content).toContain("`.qfai/evidence/`");
    expect(content).toContain("DONE is forbidden");
    expect(content).toContain("404");
  });

  it("ships prototyping coverage auditor agent card", async () => {
    const agentPath = path.join(
      templateQfaiDir,
      "assistant",
      "agents",
      "prototyping-coverage-auditor.md",
    );
    const content = await readFile(agentPath, "utf-8");

    expect(content).toContain("Prototyping Coverage Auditor");
    expect(content).toContain("STOP");
    expect(content).toContain("markdown evidence artifact");
    expect(content).toContain("json evidence artifact");
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
        label: ".qfai/specs/_shared/delta.md",
        pattern: /\.qfai\/specs\/_shared\/delta\.md/i,
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

  it("ships evidence gitignore in init template", async () => {
    const evidenceIgnorePath = path.join(
      templateQfaiDir,
      "evidence",
      ".gitignore",
    );
    const content = await readFile(evidenceIgnorePath, "utf-8");

    expect(content).toContain("*");
    expect(content).toContain("!.gitignore");
    expect(content).toContain("!README.md");
  });

  it("ships review gitignore in init template", async () => {
    const reviewIgnorePath = path.join(templateQfaiDir, "review", ".gitignore");
    const content = await readFile(reviewIgnorePath, "utf-8");

    expect(content).toContain("*");
    expect(content).toContain("!.gitignore");
    expect(content).toContain("!README.md");
  });

  it("ships report gitignore in init template", async () => {
    const reportIgnorePath = path.join(templateQfaiDir, "report", ".gitignore");
    const content = await readFile(reportIgnorePath, "utf-8");

    expect(content).toContain("*");
    expect(content).toContain("!.gitignore");
    expect(content).toContain("!README.md");
  });

  it("keeps init template docs free of hard-coded versions", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const versionPattern = /\b(?:v)?\d+\.\d+\.\d+\b/;
    const templateReadmePath = path.resolve(templateQfaiDir, "README.md");

    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      if (versionPattern.test(content)) {
        if (path.resolve(filePath) === templateReadmePath) {
          const lines = content.split(/\r?\n/);
          const disallowed = lines.some((line) => {
            if (!versionPattern.test(line)) {
              return false;
            }
            return !/^Template version:\s*(?:v)?\d+\.\d+\.\d+\s*$/.test(
              line.trim(),
            );
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

  it("keeps init template markdown free of Japanese characters except mandated discuss completion sentence", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
    const mandatoryDiscussSentence =
      "質問が完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-require』と入力してください。";
    const discussSkillPath = path.resolve(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discuss",
      "SKILL.md",
    );
    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      const normalizedPath = path.resolve(filePath);
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
    for (const removedDir of [".claude", ".codex", ".github"]) {
      expect(existsSync(path.join(templateRootDir, removedDir))).toBe(false);
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

  it("keeps root README aligned with npm README", async () => {
    const rootReadmePath = path.join(repoRoot, "README.md");
    const npmReadmePath = path.join(repoRoot, "packages", "qfai", "README.md");
    const [rootReadme, npmReadme] = await Promise.all([
      readFile(rootReadmePath, "utf-8"),
      readFile(npmReadmePath, "utf-8"),
    ]);

    const normalizedRoot = normalizeReadme(stripUrls(rootReadme));
    const normalizedNpm = normalizeReadme(stripUrls(npmReadme));
    expect(normalizedRoot).toBe(normalizedNpm);
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
      await expect(readFile(validatePath, "utf-8")).resolves.toContain(
        '"toolVersion"',
      );
      await expect(readFile(reportPath, "utf-8")).resolves.toContain(
        "# QFAI Report",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("generates prototyping wrappers with all-spec scope reminder", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-wrapper-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const githubWrapper = await readFile(
        path.join(root, ".github", "prompts", "qfai-prototyping.prompt.md"),
        "utf-8",
      );
      const agentsWrapper = await readFile(
        path.join(root, ".agents", "skills", "qfai-prototyping", "SKILL.md"),
        "utf-8",
      );

      expect(githubWrapper).toContain("ALL specs");
      expect(githubWrapper).toContain(".qfai/specs/spec-*");
      expect(agentsWrapper).toContain("ALL specs");
      expect(agentsWrapper).toContain(".qfai/specs/spec-*");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("generates sdd wrappers with all-spec batch reminder", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assets-wrapper-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const githubWrapper = await readFile(
        path.join(root, ".github", "prompts", "qfai-sdd.prompt.md"),
        "utf-8",
      );
      const agentsWrapper = await readFile(
        path.join(root, ".agents", "skills", "qfai-sdd", "SKILL.md"),
        "utf-8",
      );

      expect(githubWrapper).toContain(
        "Scope reminder checklist (`/qfai-sdd`):",
      );
      expect(githubWrapper).toContain(
        "No argument means ALL specs from `.qfai/specs/_shared/03_Capabilities.md`",
      );
      expect(githubWrapper).toContain(
        "Slice/Plan/Delta are delegated in parallel per spec.",
      );
      expect(githubWrapper).toContain(
        "`qfai validate` and RCP review run once at batch tail after integration.",
      );

      expect(agentsWrapper).toContain(
        "Scope reminder checklist (`/qfai-sdd`):",
      );
      expect(agentsWrapper).toContain(
        "No argument means ALL specs from `.qfai/specs/_shared/03_Capabilities.md`",
      );
      expect(agentsWrapper).toContain(
        "Slice/Plan/Delta are delegated in parallel per spec.",
      );
      expect(agentsWrapper).toContain(
        "`qfai validate` and RCP review run once at batch tail after integration.",
      );
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

    const validateExamplePath = path.join(
      repoRoot,
      "docs",
      "examples",
      "validate.json",
    );
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

  it("ensures qfai-tdd-red skill is deprecated wrapper", async () => {
    const tddRedPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-tdd-red",
      "SKILL.md",
    );
    const content = await readFile(tddRedPromptPath, "utf-8");

    expect(content).toContain("Deprecated Wrapper");
    expect(content).toContain("This command is deprecated.");
    expect(content).toContain("/qfai-atdd");
    expect(content).toContain("/qfai-verify");
    expect(content).toContain("qfai validate --fail-on error");
  });

  it("ensures qfai-tdd-green skill is deprecated wrapper", async () => {
    const tddGreenPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-tdd-green",
      "SKILL.md",
    );
    const content = await readFile(tddGreenPromptPath, "utf-8");

    expect(content).toContain("Deprecated Wrapper");
    expect(content).toContain("This command is deprecated.");
    expect(content).toContain("/qfai-atdd");
    expect(content).toContain("/qfai-verify");
    expect(content).toContain("qfai validate");
  });

  it("ensures qfai-tdd-refactor skill is deprecated wrapper", async () => {
    const tddRefactorPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-tdd-refactor",
      "SKILL.md",
    );
    const content = await readFile(tddRefactorPromptPath, "utf-8");

    expect(content).toContain("Deprecated Wrapper");
    expect(content).toContain("This command is deprecated.");
    expect(content).toContain("/qfai-atdd");
    expect(content).toContain("/qfai-verify");
    expect(content).toContain("qfai validate --fail-on error");
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
        "ui-contract.sample.yaml",
      ].sort(),
    );

    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "SKILL.md",
    );
    const skillContent = await readFile(skillPath, "utf-8");
    expect(skillContent).toContain("templates/contracts");
  });

  it("ensures qfai-discuss skill contains required coverage topics", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discuss",
      "SKILL.md",
    );
    const content = await readFile(discussPromptPath, "utf-8");

    // Required coverage topics
    expect(content).toMatch(/product concept/i);
    expect(content).toMatch(/non-functional/i);
    expect(content).toMatch(/nfr/i);
    expect(content).toMatch(/performance/i);
    expect(content).toMatch(/security/i);
    expect(content).toContain(".qfai/discuss/discuss-");
  });

  it("ensures qfai-discuss includes localized completion handoff guidance", async () => {
    const discussPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discuss",
      "SKILL.md",
    );
    const content = await readFile(discussPromptPath, "utf-8");
    const requiredSentence =
      "質問が完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-require』と入力してください。";

    expect(content).toContain("## Completion Message & Next Actions (MUST)");
    expect(content).toContain(requiredSentence);
    expect(content).toMatch(/active user language/i);
    expect(content).toContain("Non-Japanese output:");
    expect(content).toContain("`/qfai-require`");
  });

  it("ensures qfai-discuss and qfai-require template packs exist", async () => {
    const discussTemplatesDir = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-discuss",
      "templates",
    );
    const requireTemplatesDir = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-require",
      "templates",
    );

    const discussTemplates = await fg(["*.md"], {
      cwd: discussTemplatesDir,
      absolute: false,
    });
    const requireTemplates = await fg(["*.md"], {
      cwd: requireTemplatesDir,
      absolute: false,
    });

    expect(discussTemplates.sort()).toEqual(
      [
        "01_Context.md",
        "02_Hearing.md",
        "03_Config-Hearing.md",
        "04_Deep-Dive.md",
        "05_OQ-Register.md",
        "06_OQ-Resolution-Log.md",
        "07_Deferred.md",
        "08_Review-Request.md",
        "09_delta.md",
      ].sort(),
    );
    expect(requireTemplates.sort()).toEqual(
      [
        "01_Sources.md",
        "02_Scope.md",
        "03_REQ.md",
        "04_NFR.md",
        "05_Glossary.md",
        "06_Constraints.md",
        "07_Policy.md",
        "08_OQ.md",
        "09_delta.md",
      ].sort(),
    );
  });

  it("ensures review gate rules and review templates exist", async () => {
    const rulesPath = path.join(
      templateQfaiDir,
      "assistant",
      "steering",
      "review-gate.rules.yml",
    );
    const rules = await readFile(rulesPath, "utf-8");
    expect(rules).toContain("required:");
    expect(rules).toContain("optional:");
    expect(rules).toContain("reviewers:");
    expect(rules).toContain("review-roster.yml");

    const rosterPath = path.join(
      templateQfaiDir,
      "assistant",
      "steering",
      "review-roster.yml",
    );
    const roster = await readFile(rosterPath, "utf-8");
    expect(roster).toContain("schema_version:");
    expect(roster).toContain("roster:");

    const rcpFooterPath = path.join(
      templateQfaiDir,
      "assistant",
      "templates",
      "rcp_footer.md",
    );
    const rcpFooter = await readFile(rcpFooterPath, "utf-8");
    expect(rcpFooter).toContain("Review Cycle Protocol");
    expect(rcpFooter).toContain("review-roster.yml");

    const skillIds = ["qfai-discuss", "qfai-require"];
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
        existsSync(
          path.join(
            templateQfaiDir,
            "assistant",
            "skills",
            skillId,
            "SKILL.md",
          ),
        ),
      ).toBe(false);
    }
  });

  it("ensures qfai-sdd templates include require-pack preflight summary", async () => {
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
      expect(reportTemplate).toContain("/qfai-require");
      expect(reportTemplate).toContain("/qfai-discuss");
    }

    const businessFlowTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "specs",
      "_shared",
      "04_Business-Flow.md",
    );
    const businessFlowTemplate = await readFile(
      businessFlowTemplatePath,
      "utf-8",
    );
    expect(businessFlowTemplate).toContain("```mermaid");
    expect(businessFlowTemplate).toMatch(/flowchart|sequenceDiagram/);

    const contractsTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "specs",
      "_shared",
      "05_Contracts.md",
    );
    const contractsTemplate = await readFile(contractsTemplatePath, "utf-8");
    expect(contractsTemplate).toContain("```mermaid");
    expect(contractsTemplate).toContain("erDiagram");
  });

  it("ensures qfai-sdd no-argument mode uses all-spec batch delegation", async () => {
    const skillPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "SKILL.md",
    );
    const workflowPath = path.join(
      templateQfaiDir,
      "assistant",
      "instructions",
      "workflow.md",
    );
    const [skill, workflow] = await Promise.all([
      readFile(skillPath, "utf-8"),
      readFile(workflowPath, "utf-8"),
    ]);

    expect(skill).toContain('argument-hint: "[<spec-id-or-name>] [--auto]"');
    expect(skill).toContain("## Arguments and Target Selection (Mandatory)");
    expect(skill).toContain(
      "Without argument (`/qfai-sdd`): target all capabilities listed in `_shared/03_Capabilities.md`.",
    );
    expect(skill).toContain("### No-argument batch delegation (MUST)");
    expect(skill).toContain("Delegate Slice in parallel per spec");
    expect(skill).toContain(
      "Validate gate and Review gate run once at batch tail after all target specs are integrated.",
    );

    expect(workflow).toContain("Stage 3 (`/qfai-sdd`) target policy:");
    expect(workflow).toContain(
      "Without argument (`/qfai-sdd`): scope is all capabilities from `.qfai/specs/_shared/03_Capabilities.md` in order.",
    );
  });

  it("ensures v1.4.33 layered spec templates exist for sdd", async () => {
    const expected = [
      "_shared/03_Capabilities.md",
      "_shared/04_Business-Flow.md",
      "_shared/05_Contracts.md",
      "_shared/08_Decisions.md",
      "_shared/09_Open-questions.md",
      "_shared/10_delta.md",
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

  it("ensures contract-designer agent contains required constraints", async () => {
    const agentPath = path.join(
      templateQfaiDir,
      "assistant",
      "agents",
      "contract-designer.md",
    );
    const content = await readFile(agentPath, "utf-8");

    // Required deliverables
    expect(content).toMatch(/ui contracts/i);
    expect(content).toMatch(/api contracts/i);
    expect(content).toMatch(/db contracts/i);

    // Prohibitions
    expect(content).toMatch(/do not.*infra/i);
    expect(content).toMatch(/do not.*markdown.*yaml/i);
    expect(content).toContain("QFAI-CONTRACT-ID");
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
  if (ref.includes(".qfai/report/")) {
    return true;
  }
  if (!ref.includes("/") && !ref.includes("\\")) {
    if (
      ref === "report.json" ||
      ref === "report.md" ||
      ref === "validate.json"
    ) {
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

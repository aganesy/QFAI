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

  it("keeps 18_delta and waivers template guardrails", async () => {
    const deltaTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "spec-pack",
      "18_delta.md",
    );
    const deltaTemplate = await readFile(deltaTemplatePath, "utf-8");
    expect(deltaTemplate).toContain("# 18 Delta");
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

  it("ensures qfai-tdd-red skill contains required guardrail phrases", async () => {
    const tddRedPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-tdd-red",
      "SKILL.md",
    );
    const content = await readFile(tddRedPromptPath, "utf-8");

    expect(content).toMatch(/tests only/i);
    expect(content).toMatch(/do not implement/i);
    expect(content).toMatch(/production/i);
    expect(content).toContain("/qfai-tdd-green");
  });

  it("ensures qfai-tdd-green skill contains required guardrail phrases", async () => {
    const tddGreenPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-tdd-green",
      "SKILL.md",
    );
    const content = await readFile(tddGreenPromptPath, "utf-8");

    expect(content).toMatch(/runnable/i);
    expect(content).toMatch(/do not write new tests/i);
    expect(content).toContain("qfai validate");
    expect(content).toContain("/qfai-tdd-refactor");
    expect(content).toContain("Implementation Scope Table");
    expect(content).toContain("Stage Gates");
    expect(content).toContain("tdd-green-<spec-id>");
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
        "00_Summary.md",
        "01_Objective.md",
        "02_Initiative.md",
        "03_Capabilities.md",
        "04_Business-flow.md",
        "05_Policy.md",
        "06_Stakeholders.md",
        "07_Open-questions.md",
      ].sort(),
    );
    expect(requireTemplates.sort()).toEqual(
      [
        "01_sources.md",
        "02_requirement-index.md",
        "03_open-questions.md",
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

    const skillIds = [
      "qfai-discuss",
      "qfai-require",
      "qfai-sdd-refinement",
      "qfai-sdd-planning",
    ];
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

  it("ensures qfai-sdd template pack contains 01..18", async () => {
    const sddTemplatesDir = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd",
      "templates",
      "spec-pack",
    );
    const sddTemplates = await fg(["*.*"], {
      cwd: sddTemplatesDir,
      absolute: false,
    });

    expect(sddTemplates.sort()).toEqual(
      [
        "01_Spec.md",
        "02_Objective.md",
        "03_Initiative.md",
        "04_Capability.md",
        "05_Business-flow.feature",
        "06_User-stories.md",
        "07_Acceptance-criteria.md",
        "08_Business-rules.md",
        "09_Examples.feature",
        "10_Test-cases.md",
        "11_Contracts.md",
        "12_Glossary.md",
        "13_Constraints.md",
        "14_Decisions.md",
        "15_Open-questions.md",
        "16_Traceability-ledger.md",
        "17_Plan.md",
        "18_delta.md",
      ].sort(),
    );
  });

  it("ensures qfai-sdd templates include import-lite evidence and preflight summary", async () => {
    for (const skillId of [
      "qfai-sdd",
      "qfai-sdd-refinement",
      "qfai-sdd-planning",
    ]) {
      const evidenceTemplatePath = path.join(
        templateQfaiDir,
        "assistant",
        "skills",
        skillId,
        "templates",
        "evidence",
        "import-lite.md",
      );
      const evidence = await readFile(evidenceTemplatePath, "utf-8");
      expect(evidence).toContain("entrypoint: import-lite");
      expect(evidence).toContain("pointer artifact");

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
      expect(reportTemplate).toContain("Selected source:");
      expect(reportTemplate).toContain("review-exempt");
    }

    const businessFlowTemplatePath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-sdd-refinement",
      "templates",
      "specs",
      "_shared",
      "04_Business-flow.md",
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
      "qfai-sdd-refinement",
      "templates",
      "specs",
      "_shared",
      "05_Contracts.md",
    );
    const contractsTemplate = await readFile(contractsTemplatePath, "utf-8");
    expect(contractsTemplate).toContain("```mermaid");
    expect(contractsTemplate).toContain("erDiagram");
  });

  it("ensures v1.4.18 layered spec templates exist for sdd and refinement", async () => {
    const expected = [
      "_shared/03_Capabilities.md",
      "_shared/04_Business-flow.md",
      "_shared/05_Contracts.md",
      "spec/01_Spec.md",
      "spec/02_User-stories.md",
      "spec/03_Acceptance-criteria.md",
      "spec/04_Business-rules.md",
      "spec/05_Examples.feature",
      "spec/06_Test-cases.md",
      "spec/07_Decisions.md",
      "spec/08_Open-questions.md",
      "spec/09_delta.md",
    ].sort();

    for (const skillId of ["qfai-sdd", "qfai-sdd-refinement"]) {
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

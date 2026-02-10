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

  it("keeps canonical skills and wrappers aligned", async () => {
    const canonicalSkills = await listCanonicalSkillIds();
    const copilot = await listCopilotWrapperIds();
    const claude = await listClaudeWrapperIds();
    const codex = await listCodexWrapperIds();

    const diffs = {
      missing: {
        copilot: diffIds(canonicalSkills, copilot),
        claude: diffIds(canonicalSkills, claude),
        codex: diffIds(canonicalSkills, codex),
      },
      orphan: {
        copilot: diffIds(copilot, canonicalSkills),
        claude: diffIds(claude, canonicalSkills),
        codex: diffIds(codex, canonicalSkills),
      },
    };

    expect(diffs).toEqual({
      missing: { copilot: [], claude: [], codex: [] },
      orphan: { copilot: [], claude: [], codex: [] },
    });
  });

  it("ensures skills include completion contract sections", async () => {
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
      ];
      const missingSections = required.filter(
        (section) => !content.includes(section),
      );
      if (missingSections.length > 0) {
        missing.push(
          `${path.relative(repoRoot, filePath)}: ${missingSections.join(", ")}`,
        );
      }
    }

    expect(missing).toEqual([]);
  });

  it("ensures skills include delegation guardrails for canonical and wrappers", async () => {
    const canonicalDir = path.join(templateQfaiDir, "assistant", "skills");
    const claudeDir = path.join(templateRootDir, ".claude", "skills");
    const githubDir = path.join(templateRootDir, ".github", "skills");
    const codexDir = path.join(templateRootDir, ".codex", "skills");

    const [canonical, claude, github, codex] = await Promise.all([
      fg(["*/SKILL.md"], { cwd: canonicalDir, absolute: true }),
      fg(["*/SKILL.md"], { cwd: claudeDir, absolute: true }),
      fg(["*/SKILL.md"], { cwd: githubDir, absolute: true }),
      fg(["*/SKILL.md"], { cwd: codexDir, absolute: true }),
    ]);

    const files = [...canonical, ...claude, ...github, ...codex];

    const requiredPhrases = [
      "## Sub-agent Delegation (MANDATORY)",
      "### Orchestrator Protocol (MUST)",
      "### Capability Probe (MUST)",
      "### Simulation mode (Opt-in only)",
      "## Work Orders Summary",
      "Status (PASS/REVISE)",
      "### Reviewer Gate (MUST)",
      "Reviewer",
      "PASS",
      "REVISE",
    ];

    const missing = (
      await Promise.all(
        files.map(async (filePath) => {
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

  it("keeps init template markdown free of Japanese characters", async () => {
    const markdownFiles = await fg(["**/*.md"], {
      cwd: templateQfaiDir,
      absolute: true,
    });
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

    const matches: string[] = [];
    for (const filePath of markdownFiles) {
      const content = await readFile(filePath, "utf-8");
      if (japanesePattern.test(content)) {
        matches.push(path.relative(repoRoot, filePath));
      }
    }

    expect(matches).toEqual([]);
  });

  it("keeps delta v1 template and PR template guardrails", async () => {
    const deltaTemplatePath = path.join(
      templateQfaiDir,
      "templates",
      "spec",
      "delta.md",
    );
    const deltaTemplate = await readFile(deltaTemplatePath, "utf-8");
    expect(deltaTemplate).toContain("# Delta");
    expect(deltaTemplate).toContain("## Update History");
    expect(deltaTemplate).toContain("## Decision Log");
    expect(deltaTemplate).toContain("#### Meta");
    expect(deltaTemplate).toContain("```yaml");
    expect(deltaTemplate).toContain("primary:");
    expect(deltaTemplate).toContain("tags:");
    expect(deltaTemplate).toContain("compat:");
    expect(deltaTemplate).toContain("#### Rejected");
    expect(deltaTemplate).toContain("#### Migration / Follow-ups");
    expect(deltaTemplate).toContain("- No migration required.");
    expect(deltaTemplate).toContain("#### Verification");
    expect(deltaTemplate).toContain("### Plan");
    expect(deltaTemplate).toContain("level:");
    expect(deltaTemplate).toContain("owner:");
    expect(deltaTemplate).toContain("expected:");
    expect(deltaTemplate).toContain("### Evidence (optional)");
    expect(deltaTemplate).toMatch(/do_not\s*:/i);
    expect(deltaTemplate).toMatch(/temptation\s*:/i);

    const prTemplatePath = path.join(
      templateRootDir,
      ".github",
      "PULL_REQUEST_TEMPLATE.md",
    );
    const prTemplate = await readFile(prTemplatePath, "utf-8");
    expect(prTemplate).toContain("## Change Type (Primary)");
    expect(prTemplate).toContain("## Tags");
    expect(prTemplate).toContain("## Compatibility (compat)");
    expect(prTemplate).toContain("## Waivers (optional)");
    expect(prTemplate).toContain("## delta.md");
    expect(prTemplate).toContain("## Verification (delta.md)");
    expect(prTemplate).toContain("## Review Focus (auto by type)");
    expect(prTemplate).toContain("- [ ] Initial");
    expect(prTemplate).toContain("- [ ] @api");
    expect(prTemplate).toContain("- [ ] Bug-for-bug");
    expect(prTemplate).toContain("If compat=Change:");
    expect(prTemplate).toContain("Verification.Plan");
    expect(prTemplate).toContain("DL-YYYYMMDD-XX");

    const waiversTemplatePath = path.join(templateQfaiDir, "waivers.yml");
    const waiversTemplate = await readFile(waiversTemplatePath, "utf-8");
    expect(waiversTemplate).toContain("version: 1");
    expect(waiversTemplate).toContain("waivers: []");
    expect(waiversTemplate).toContain("rule_id: COMPAT-003");
    expect(waiversTemplate).toContain("expires_on:");
  });

  it("keeps init workflow free of dependency cache settings", async () => {
    const workflowPath = path.join(
      templateRootDir,
      ".github",
      "workflows",
      "qfai.yml",
    );
    const workflow = await readFile(workflowPath, "utf-8");

    expect(workflow).toContain("npx qfai validate");
    expect(workflow).not.toContain("cache:");
    expect(workflow).not.toContain("cache-dependency-path");
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

  it("ensures qfai-spec skill is a deprecated alias to refinement", async () => {
    const specPromptPath = path.join(
      templateQfaiDir,
      "assistant",
      "skills",
      "qfai-spec",
      "SKILL.md",
    );
    const content = await readFile(specPromptPath, "utf-8");

    expect(content).toContain("Deprecated Alias");
    expect(content).toContain("/qfai-sdd-refinement");
    expect(content).toContain("Do NOT treat this file as SSOT");
    expect(content).toContain("FINAL CHECKLIST (Check Last)");
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
    expect(content).toContain("discussions/discuss-");
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
  if (ref === ".github/copilot-instructions.md") {
    return true;
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

async function listCanonicalSkillIds(): Promise<string[]> {
  const skillsDir = path.join(templateQfaiDir, "assistant", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: true });
  const ids = files
    .map((file) => path.basename(path.dirname(file)))
    .filter((id) => id !== "README");
  return toSortedUnique(ids);
}

async function listCopilotWrapperIds(): Promise<string[]> {
  const skillsDir = path.join(templateRootDir, ".github", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: true });
  return toSortedUnique(files.map((file) => path.basename(path.dirname(file))));
}

async function listClaudeWrapperIds(): Promise<string[]> {
  const skillsDir = path.join(templateRootDir, ".claude", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: true });
  return toSortedUnique(files.map((file) => path.basename(path.dirname(file))));
}

async function listCodexWrapperIds(): Promise<string[]> {
  const skillsDir = path.join(templateRootDir, ".codex", "skills");
  const files = await fg(["*/SKILL.md"], { cwd: skillsDir, absolute: true });
  return toSortedUnique(files.map((file) => path.basename(path.dirname(file))));
}

function diffIds(source: string[], target: string[]): string[] {
  const targetSet = new Set(target);
  return source.filter((id) => !targetSet.has(id));
}

function toSortedUnique(ids: string[]): string[] {
  return Array.from(new Set(ids)).sort();
}

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pkgDir = path.join(root, "packages", "qfai");
const tmpDir = path.join(root, "tmp", "pack");
const sandboxDir = path.join(tmpDir, "sandbox");
const outputDir = path.join(sandboxDir, "out");
const reportPath = path.join(outputDir, ".qfai", "report", "report.md");

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const packOutput = execFileSync("npm", ["pack"], {
  cwd: pkgDir,
  encoding: "utf-8",
}).trim();
const packLines = packOutput.split(/\r?\n/).filter(Boolean);
const tarballName = packLines[packLines.length - 1];
if (!tarballName) {
  throw new Error("npm pack failed to produce a tarball name.");
}

const tarballPath = path.join(pkgDir, tarballName);
execFileSync("tar", ["-xzf", tarballPath, "-C", tmpDir], {
  stdio: "inherit",
});

const packageRoot = path.join(tmpDir, "package");
const licensePath = path.join(packageRoot, "LICENSE");
if (!existsSync(licensePath)) {
  throw new Error("LICENSE is missing from the packed artifact.");
}
const readmePath = path.join(packageRoot, "README.md");
if (!existsSync(readmePath)) {
  throw new Error("README.md is missing from the packed artifact.");
}
const assetsDir = path.join(packageRoot, "assets", "init");
if (!existsSync(assetsDir)) {
  throw new Error("assets/init is missing from the packed artifact.");
}
const templateDir = path.join(assetsDir, ".qfai");
if (!existsSync(templateDir)) {
  throw new Error("assets/init/.qfai is missing from the packed artifact.");
}
const templateReportGitignore = path.join(templateDir, "report", ".gitignore");
if (!existsSync(templateReportGitignore)) {
  throw new Error("assets/init/.qfai/report/.gitignore is missing.");
}
const rootAssetsDir = path.join(assetsDir, "root");
if (!existsSync(rootAssetsDir)) {
  throw new Error("assets/init/root is missing from the packed artifact.");
}

const requiredSkills = [
  "qfai-configure",
  "qfai-discussion",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-prototyping",
  "qfai-tdd-red",
  "qfai-tdd-green",
  "qfai-tdd-refactor",
  "qfai-verify",
];

for (const skillId of requiredSkills) {
  const canonicalSkillPath = path.join(templateDir, "assistant", "skills", skillId, "SKILL.md");
  if (!existsSync(canonicalSkillPath)) {
    throw new Error(
      `assets/init/.qfai/assistant/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }
}

for (const removedDir of [".claude", ".codex", ".github"]) {
  if (existsSync(path.join(rootAssetsDir, removedDir))) {
    throw new Error(`assets/init/root/${removedDir} must not exist.`);
  }
}

rmSync(sandboxDir, { recursive: true, force: true });
mkdirSync(sandboxDir, { recursive: true });
execFileSync("npm", ["init", "-y"], { cwd: sandboxDir, stdio: "inherit" });
execFileSync("npm", ["install", tarballPath], {
  cwd: sandboxDir,
  stdio: "inherit",
});

rmSync(tarballPath, { force: true });
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const cliPath = path.join(sandboxDir, "node_modules", "qfai", "dist", "cli", "index.mjs");
execFileSync("node", [cliPath, "init", "--dir", outputDir], {
  stdio: "inherit",
});

const rootConfig = path.join(outputDir, "qfai.config.yaml");
if (!existsSync(rootConfig)) {
  throw new Error("init did not generate root qfai.config.yaml.");
}

const qfaiDir = path.join(outputDir, ".qfai");
if (!existsSync(qfaiDir)) {
  throw new Error("init did not generate .qfai directory.");
}
const reportGitignore = path.join(qfaiDir, "report", ".gitignore");
if (!existsSync(reportGitignore)) {
  throw new Error("init did not generate .qfai/report/.gitignore.");
}

const skillsDir = path.join(qfaiDir, "assistant", "skills");
if (!existsSync(skillsDir)) {
  throw new Error("init did not generate .qfai/assistant/skills directory.");
}
for (const skillId of requiredSkills) {
  const generatedSkillPath = path.join(skillsDir, skillId, "SKILL.md");
  if (!existsSync(generatedSkillPath)) {
    throw new Error(`init did not generate .qfai/assistant/skills/${skillId}/SKILL.md.`);
  }
}

const skillsLocalDir = path.join(qfaiDir, "assistant", "skills.local");
if (!existsSync(skillsLocalDir)) {
  throw new Error("init did not generate .qfai/assistant/skills.local directory.");
}

const legacyPromptsDir = path.join(qfaiDir, "assistant", "prompts");
if (existsSync(legacyPromptsDir)) {
  throw new Error("init generated deprecated .qfai/assistant/prompts directory.");
}

const syntheticSpecDir = path.join(outputDir, ".qfai", "specs", "spec-0000");
mkdirSync(syntheticSpecDir, { recursive: true });
const syntheticDeltaPath = path.join(syntheticSpecDir, "18_delta.md");
writeFileSync(
  syntheticDeltaPath,
  [
    "# Delta",
    "",
    "## Decision Guardrails",
    "",
    "### DG-0001: Synthetic guardrail for verify-pack",
    "- Type: trade-off",
    "- Scope: specs/*",
    "- Guardrail: Do not implement the rejected synthetic option.",
    "- Reason: verify-pack smoke test entry",
    "- Reconsider: never",
    "- Keywords: synthetic, verify-pack",
    "",
  ].join("\n"),
);
execFileSync(
  "node",
  [cliPath, "guardrails", "extract", "--path", syntheticDeltaPath, "--max", "20"],
  { stdio: "inherit" },
);
rmSync(syntheticSpecDir, { recursive: true, force: true });

const claudeCommandsDir = path.join(outputDir, ".claude", "commands");
const claudeAgentsDir = path.join(outputDir, ".claude", "agents");
const githubPromptsDir = path.join(outputDir, ".github", "prompts");
const githubAgentsDir = path.join(outputDir, ".github", "agents");
const codexSkillsDir = path.join(outputDir, ".codex", "skills");

if (!existsSync(claudeCommandsDir)) {
  throw new Error("init did not generate .claude/commands directory.");
}
if (!existsSync(claudeAgentsDir)) {
  throw new Error("init did not generate .claude/agents directory.");
}
if (!existsSync(githubPromptsDir)) {
  throw new Error("init did not generate .github/prompts directory.");
}
if (!existsSync(githubAgentsDir)) {
  throw new Error("init did not generate .github/agents directory.");
}
if (!existsSync(codexSkillsDir)) {
  throw new Error("init did not generate .codex/skills directory.");
}

for (const skillId of requiredSkills) {
  const claudeCommand = path.join(claudeCommandsDir, `${skillId}.md`);
  const githubPrompt = path.join(githubPromptsDir, `${skillId}.prompt.md`);
  const codexSkill = path.join(codexSkillsDir, skillId, "SKILL.md");
  if (!existsSync(claudeCommand)) {
    throw new Error(`init did not generate ${path.relative(outputDir, claudeCommand)}.`);
  }
  if (!existsSync(githubPrompt)) {
    throw new Error(`init did not generate ${path.relative(outputDir, githubPrompt)}.`);
  }
  if (!existsSync(codexSkill)) {
    throw new Error(`init did not generate ${path.relative(outputDir, codexSkill)}.`);
  }
}

for (const deprecatedSkillId of [
  "qfai-spec",
  "qfai-implement",
  "qfai-pr",
  "qfai-scenario-test",
  "qfai-unit-test",
  "qfai-sdd-refinement",
  "qfai-sdd-planning",
]) {
  const deprecatedPaths = [
    path.join(claudeCommandsDir, `${deprecatedSkillId}.md`),
    path.join(githubPromptsDir, `${deprecatedSkillId}.prompt.md`),
    path.join(codexSkillsDir, deprecatedSkillId, "SKILL.md"),
  ];
  for (const deprecatedPath of deprecatedPaths) {
    if (existsSync(deprecatedPath)) {
      throw new Error(
        `init generated deprecated wrapper ${path.relative(outputDir, deprecatedPath)}.`,
      );
    }
  }
}

if (!existsSync(path.join(claudeAgentsDir, "facilitator.md"))) {
  throw new Error("init did not generate .claude/agents/facilitator.md.");
}
if (!existsSync(path.join(githubAgentsDir, "facilitator.agent.md"))) {
  throw new Error("init did not generate .github/agents/facilitator.agent.md.");
}

// Empty scaffold init omits generated discussion-pack files.
// Seed a minimal discussion-pack so pack-time validate has realistic inputs.
const discussionDir = path.join(outputDir, ".qfai", "discussion");
const seededDiscussionPackDir = path.join(discussionDir, "discussion-20260216000000000");
mkdirSync(seededDiscussionPackDir, { recursive: true });

const seededDiscussionPackFiles = {
  "01_Context.md": [
    "# 01 Context",
    "",
    "Project context for verify-pack smoke validation.",
    "- Context: this is a packaging validation fixture.",
    "- Stakeholders: release automation.",
    "- Captured at: 2026-02-16.",
    "- Purpose: provide stable evidence for seeded discussion.",
    "",
  ],
  "02_Inception-Deck.md": [
    "# 02 Inception Deck",
    "",
    "This seeded discussion-pack is for packaging validation only and ensures",
    "the readiness gate has concrete non-placeholder content.",
    "",
    "Elevator Pitch:",
    "A packaging smoke test that validates the discussion pack gate.",
    "",
  ],
  "03_Story-Workshop.md": [
    "# 03 Story Workshop",
    "",
    "```mermaid",
    "sequenceDiagram",
    "  participant CI",
    "  participant Validator",
    "  CI->>Validator: BF-0001-S01 run validate",
    "```",
    "",
    "Workshop outcomes for packaging smoke test.",
    "",
  ],
  "04_Sources.md": [
    "# 04 Sources",
    "",
    "Source register for verify-pack smoke validation.",
    "- Source ID: SRC-0001",
    "- Type: process note",
    "- Location: verify-pack seeded fixture",
    "- Captured at: 2026-02-16",
    "- Owner: release automation",
    "- Confidence: high",
    "- Rationale: provide stable evidence for seeded discussion.",
    "",
  ],
  "05_Scope.md": [
    "# 05 Scope",
    "",
    "In scope:",
    "- Validate that a latest discussion-pack exists with all mandatory files.",
    "- Keep smoke data deterministic across environments.",
    "",
    "Out of scope:",
    "- Product feature behavior changes.",
    "",
  ],
  "06_REQ.md": [
    "# 06 REQ",
    "",
    "## REQ-0001",
    "The packaging smoke flow shall include a complete discussion-pack so",
    "qfai validate can execute with fail-on error in verify-pack.",
    "",
    "## REQ-0002",
    "The seeded artifacts shall remain deterministic and easy to inspect.",
    "",
  ],
  "07_NFR.md": [
    "# 07 NFR",
    "",
    "- NFR-0001 Reliability: the seeded pack must be reproducible in CI and local.",
    "- NFR-0002 Maintainability: file content should be concise but explicit.",
    "- NFR-0003 Observability: failures should point to actionable file names.",
    "",
  ],
  "08_Glossary.md": [
    "# 08 Glossary",
    "",
    "- Discussion-pack: a timestamped set of discussion documents under `.qfai/discussion`.",
    "- Smoke validation: lightweight end-to-end check for packed artifacts.",
    "- Readiness gate: validation criteria that block packaging on errors.",
    "",
  ],
  "09_Constraints.md": [
    "# 09 Constraints",
    "",
    "- Use markdown-only fixtures to avoid runtime dependencies.",
    "- Keep each required file longer than minimal validation thresholds.",
    "- Avoid placeholder-only statements to satisfy content checks.",
    "- Keep naming aligned with the 15-file discussion pack structure.",
    "",
  ],
  "10_Policy.md": [
    "# 10 Policy",
    "",
    "- Policy-0001: verify-pack must fail when required artifacts are absent.",
    "- Policy-0002: seeded files are test inputs and not product commitments.",
    "- Policy-0003: content should remain stable unless gate rules change.",
    "",
  ],
  "11_OQ-Register.md": [
    "# 11 OQ Register",
    "",
    "| OQ-ID | Question | Status | Gate |",
    "| --- | --- | --- | --- |",
    "| OQ-0001 | Should smoke data mirror full production templates? | deferred | discussion |",
    "",
  ],
  "12_OQ-Resolution-Log.md": [
    "# 12 OQ Resolution Log",
    "",
    "## OQ-0001",
    "- Question: Should smoke data mirror full production templates?",
    "- Disposition: deferred",
    "- Gate: discussion",
    "- Note: minimal deterministic content is currently sufficient for gate coverage.",
    "",
  ],
  "13_Deferred.md": [
    "# 13 Deferred",
    "",
    "- Deferred items: none currently blocking.",
    "- All OQs resolved or deferred at non-blocking gates.",
    "",
  ],
  "14_Review-Request.md": [
    "# 14 Review Request",
    "",
    "- Review type: automated packaging smoke validation.",
    "- Reviewer: CI pipeline.",
    "- Status: pending automated gate execution.",
    "",
  ],
  "99_delta.md": [
    "# 99 delta",
    "",
    "## Change Summary",
    "- Added deterministic discussion-pack seed used by verify-pack smoke validation.",
    "- Aligned filenames with readiness validator expectations.",
    "- Ensured OQ state is non-blocking for fail-on error execution.",
    "",
  ],
};

for (const [fileName, lines] of Object.entries(seededDiscussionPackFiles)) {
  writeFileSync(path.join(seededDiscussionPackDir, fileName), lines.join("\n"));
}

// Regression check: `.qfai/assistant/skills.local/**` must be overlay-only and never overwritten,
// even when init is re-run with --force.
const skillsLocalReadmePath = path.join(skillsLocalDir, "README.md");
const skillsLocalCustomPath = path.join(skillsLocalDir, "custom.md");
const skillsLocalReadmeContent = "# local overrides\n";
const skillsLocalCustomContent = "custom\n";
writeFileSync(skillsLocalReadmePath, skillsLocalReadmeContent);
writeFileSync(skillsLocalCustomPath, skillsLocalCustomContent);

execFileSync("node", [cliPath, "init", "--dir", outputDir, "--force"], {
  stdio: "inherit",
});

if (readFileSync(skillsLocalReadmePath, "utf-8") !== skillsLocalReadmeContent) {
  throw new Error("init overwrote .qfai/assistant/skills.local/README.md (must be protected).");
}
if (!existsSync(skillsLocalCustomPath)) {
  throw new Error("init removed .qfai/assistant/skills.local/custom.md (must be preserved).");
}
if (readFileSync(skillsLocalCustomPath, "utf-8") !== skillsLocalCustomContent) {
  throw new Error("init overwrote .qfai/assistant/skills.local/custom.md (must be protected).");
}

execFileSync(
  "node",
  [cliPath, "validate", "--root", outputDir, "--fail-on", "error", "--format", "github"],
  {
    stdio: "inherit",
  },
);

execFileSync("node", [cliPath, "report", "--root", outputDir, "--out", reportPath], {
  stdio: "inherit",
});

if (!existsSync(reportPath)) {
  throw new Error("report did not generate .qfai/report/report.md.");
}

execFileSync("node", [cliPath, "doctor", "--root", outputDir, "--fail-on", "error"], {
  stdio: "inherit",
});

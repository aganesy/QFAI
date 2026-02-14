import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
const rootAssetsDir = path.join(assetsDir, "root");
if (!existsSync(rootAssetsDir)) {
  throw new Error("assets/init/root is missing from the packed artifact.");
}

const requiredSkills = [
  "qfai-configure",
  "qfai-discuss",
  "qfai-require",
  "qfai-spec",
  "qfai-sdd",
  "qfai-atdd",
  "qfai-scenario-test",
  "qfai-unit-test",
  "qfai-implement",
  "qfai-pr",
  "qfai-prototyping",
  "qfai-tdd-red",
  "qfai-tdd-green",
  "qfai-tdd-refactor",
  "qfai-verify",
];

for (const skillId of requiredSkills) {
  const canonicalSkillPath = path.join(
    templateDir,
    "assistant",
    "skills",
    skillId,
    "SKILL.md",
  );
  if (!existsSync(canonicalSkillPath)) {
    throw new Error(
      `assets/init/.qfai/assistant/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }
}

const copilotInstructionsPath = path.join(
  rootAssetsDir,
  ".github",
  "copilot-instructions.md",
);
if (!existsSync(copilotInstructionsPath)) {
  throw new Error(
    "assets/init/root/.github/copilot-instructions.md is missing from the packed artifact.",
  );
}

for (const skillId of requiredSkills) {
  const copilotSkillPath = path.join(
    rootAssetsDir,
    ".github",
    "skills",
    skillId,
    "SKILL.md",
  );
  if (!existsSync(copilotSkillPath)) {
    throw new Error(
      `assets/init/root/.github/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }

  const claudeSkillPath = path.join(
    rootAssetsDir,
    ".claude",
    "skills",
    skillId,
    "SKILL.md",
  );
  if (!existsSync(claudeSkillPath)) {
    throw new Error(
      `assets/init/root/.claude/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }

  const codexSkillPath = path.join(
    rootAssetsDir,
    ".codex",
    "skills",
    skillId,
    "SKILL.md",
  );
  if (!existsSync(codexSkillPath)) {
    throw new Error(
      `assets/init/root/.codex/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }
}

const codexReadmePath = path.join(rootAssetsDir, ".codex", "README.md");
if (!existsSync(codexReadmePath)) {
  throw new Error(
    "assets/init/root/.codex/README.md is missing from the packed artifact.",
  );
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

const cliPath = path.join(
  sandboxDir,
  "node_modules",
  "qfai",
  "dist",
  "cli",
  "index.mjs",
);
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

const skillsDir = path.join(qfaiDir, "assistant", "skills");
if (!existsSync(skillsDir)) {
  throw new Error("init did not generate .qfai/assistant/skills directory.");
}
for (const skillId of requiredSkills) {
  const generatedSkillPath = path.join(skillsDir, skillId, "SKILL.md");
  if (!existsSync(generatedSkillPath)) {
    throw new Error(
      `init did not generate .qfai/assistant/skills/${skillId}/SKILL.md.`,
    );
  }
}

const skillsLocalDir = path.join(qfaiDir, "assistant", "skills.local");
if (!existsSync(skillsLocalDir)) {
  throw new Error(
    "init did not generate .qfai/assistant/skills.local directory.",
  );
}

const legacyPromptsDir = path.join(qfaiDir, "assistant", "prompts");
if (existsSync(legacyPromptsDir)) {
  throw new Error(
    "init generated deprecated .qfai/assistant/prompts directory.",
  );
}

const legacyClaudeCommandsDir = path.join(outputDir, ".claude", "commands");
if (existsSync(legacyClaudeCommandsDir)) {
  throw new Error("init generated deprecated .claude/commands directory.");
}

const legacyGithubPromptsDir = path.join(outputDir, ".github", "prompts");
if (existsSync(legacyGithubPromptsDir)) {
  throw new Error("init generated deprecated .github/prompts directory.");
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
  [
    cliPath,
    "guardrails",
    "extract",
    "--path",
    syntheticDeltaPath,
    "--max",
    "20",
  ],
  { stdio: "inherit" },
);
rmSync(syntheticSpecDir, { recursive: true, force: true });

const workflowPath = path.join(outputDir, ".github", "workflows", "qfai.yml");
if (!existsSync(workflowPath)) {
  throw new Error("init did not generate .github/workflows/qfai.yml.");
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
  throw new Error(
    "init overwrote .qfai/assistant/skills.local/README.md (must be protected).",
  );
}
if (!existsSync(skillsLocalCustomPath)) {
  throw new Error(
    "init removed .qfai/assistant/skills.local/custom.md (must be preserved).",
  );
}
if (readFileSync(skillsLocalCustomPath, "utf-8") !== skillsLocalCustomContent) {
  throw new Error(
    "init overwrote .qfai/assistant/skills.local/custom.md (must be protected).",
  );
}

execFileSync(
  "node",
  [
    cliPath,
    "validate",
    "--root",
    outputDir,
    // init now creates an empty scaffold. validate findings are expected
    // until users generate require/spec artifacts.
    "--fail-on",
    "never",
    "--format",
    "github",
  ],
  {
    stdio: "inherit",
  },
);

execFileSync(
  "node",
  [cliPath, "report", "--root", outputDir, "--out", reportPath],
  {
    stdio: "inherit",
  },
);

if (!existsSync(reportPath)) {
  throw new Error("report did not generate .qfai/report/report.md.");
}

execFileSync(
  "node",
  [cliPath, "doctor", "--root", outputDir, "--fail-on", "error"],
  {
    stdio: "inherit",
  },
);

import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function normalizeForComparison(p) {
  const n = path.normalize(p);
  return process.platform === "win32" ? n.toLowerCase() : n;
}

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
execFileSync(
  "tar",
  ["-xzf", toPosix(path.relative(root, tarballPath)), "-C", toPosix(path.relative(root, tmpDir))],
  {
    cwd: root,
    stdio: "inherit",
  },
);

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
// .gitignore files removed from subdirectories; entries now live in root .gitignore
// (see ensureRootGitignoreEntries in init.ts)
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
  "qfai-implement",
  "qfai-verify",
];
const deprecatedSkillIds = [
  "qfai-spec",
  "qfai-tdd-red",
  "qfai-tdd-green",
  "qfai-tdd-refactor",
  "qfai-pr",
  "qfai-scenario-test",
  "qfai-unit-test",
  "qfai-sdd-refinement",
  "qfai-sdd-planning",
];

for (const skillId of requiredSkills) {
  const canonicalSkillPath = path.join(templateDir, "assistant", "skills", skillId, "SKILL.md");
  if (!existsSync(canonicalSkillPath)) {
    throw new Error(
      `assets/init/.qfai/assistant/skills/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }
}

for (const removedDir of [".claude", ".codex"]) {
  if (existsSync(path.join(rootAssetsDir, removedDir))) {
    throw new Error(`assets/init/root/${removedDir} must not exist.`);
  }
}

// `qfai init` ships
// `.github/workflows/qfai-validate.yml` to downstream consumers, so the
// `.github` subtree itself is required (not optional). The previous
// `if (existsSync(rootGithubDir))` wrapper would have silently allowed
// a packed artifact missing `assets/init/root/.github` entirely.
// Allow-list the immediate children of `.github` (only `workflows/`) so
// misplaced files such as `dependabot.yml`, `ISSUE_TEMPLATE/`, or any
// other future GitHub config directory cannot accidentally be packed —
// runInit synthesizes those wrappers via symlinks at init time, not
// from the packed tarball.
const rootGithubDir = path.join(rootAssetsDir, ".github");
if (!existsSync(rootGithubDir)) {
  throw new Error("assets/init/root/.github must exist.");
}
// Confirm `.github` itself is a directory before iterating; otherwise
// readdirSync would surface as an ENOTDIR stack trace and obscure the
// real packaging defect.
if (!lstatSync(rootGithubDir).isDirectory()) {
  throw new Error("assets/init/root/.github must be a directory (got non-directory entry).");
}
const allowedRootGithubEntries = new Set(["workflows"]);
const githubEntries = readdirSync(rootGithubDir);
// workflows/ is required, not just allowed. An empty .github/ would
// silently strip the qfai-validate.yml shipping path
// on downstream init consumers, so reject it here.
if (!githubEntries.includes("workflows")) {
  throw new Error("assets/init/root/.github must contain workflows/.");
}
for (const entry of githubEntries) {
  if (!allowedRootGithubEntries.has(entry)) {
    throw new Error(
      `assets/init/root/.github/${entry} must not exist (only workflows/ is permitted).`,
    );
  }
  // Allow-list passes only if the entry is a real directory. A regular file
  // or broken symlink at .github/workflows would corrupt downstream `qfai
  // init` consumers, so reject anything that is not a directory.
  const entryPath = path.join(rootGithubDir, entry);
  if (!lstatSync(entryPath).isDirectory()) {
    throw new Error(
      `assets/init/root/.github/${entry} must be a directory (got non-directory entry).`,
    );
  }
}
// Confirm the actual workflow file ships. workflows/ existing without
// qfai-validate.yml inside it is the same downstream regression as a
// missing workflows/ — the file is the contract, not just the folder.
const workflowFile = path.join(rootGithubDir, "workflows", "qfai-validate.yml");
if (!existsSync(workflowFile) || !lstatSync(workflowFile).isFile()) {
  throw new Error(
    "assets/init/root/.github/workflows/qfai-validate.yml must exist as a regular file.",
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
mkdirSync(path.join(outputDir, "src"), { recursive: true });
mkdirSync(path.join(outputDir, "tests"), { recursive: true });
// Per-directory .gitignore removed; entries now appended to root .gitignore
const rootGitignore = path.join(outputDir, ".gitignore");
if (!existsSync(rootGitignore)) {
  throw new Error("init did not generate root .gitignore.");
}
const rootGitignoreContent = readFileSync(rootGitignore, "utf-8");
const requiredGitignorePatterns = [
  "QFAI managed",
  ".qfai/report/*",
  ".qfai/evidence/*",
  ".qfai/review/*",
  ".qfai/discussion/*",
];
const missingPatterns = requiredGitignorePatterns.filter(
  (pattern) => !rootGitignoreContent.includes(pattern),
);
if (missingPatterns.length > 0) {
  throw new Error(
    "init did not append complete QFAI entries to root .gitignore. Missing: " +
      missingPatterns.join(", "),
  );
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
if (existsSync(skillsLocalDir)) {
  throw new Error("init generated deprecated .qfai/assistant/skills.local directory.");
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

// Symlink-based integration directories (v1.5.4+)
const skillIntegrationDirs = [
  [".claude/skills", path.join(outputDir, ".claude", "skills")],
  [".agents/skills", path.join(outputDir, ".agents", "skills")],
  [".codex/skills", path.join(outputDir, ".codex", "skills")],
  [".github/skills", path.join(outputDir, ".github", "skills")],
];
const claudeAgentsDir = path.join(outputDir, ".claude", "agents");
const githubAgentsDir = path.join(outputDir, ".github", "agents");
const copilotInstructionsPath = path.join(outputDir, ".github", "copilot-instructions.md");

for (const [label, dir] of skillIntegrationDirs) {
  if (!existsSync(dir)) {
    throw new Error(`init did not generate ${label} directory.`);
  }
}
if (!existsSync(claudeAgentsDir)) {
  throw new Error("init did not generate .claude/agents directory.");
}
if (!existsSync(githubAgentsDir)) {
  throw new Error("init did not generate .github/agents directory.");
}
if (!existsSync(copilotInstructionsPath)) {
  throw new Error("init did not generate .github/copilot-instructions.md.");
}
const copilotInstructions = readFileSync(copilotInstructionsPath, "utf-8");
if (!copilotInstructions.includes(".github/skills/")) {
  throw new Error(".github/copilot-instructions.md must reference .github/skills/.");
}
if (copilotInstructions.includes(".github/prompts/")) {
  throw new Error(".github/copilot-instructions.md must not reference .github/prompts/.");
}

// Verify each required skill is accessible through all integration dirs
for (const skillId of requiredSkills) {
  const canonicalSkillDir = path.join(skillsDir, skillId);
  const resolvedCanonicalSkillDir = realpathSync(canonicalSkillDir);
  for (const [, dir] of skillIntegrationDirs) {
    const skillDir = path.join(dir, skillId);
    const skillPath = path.join(skillDir, "SKILL.md");
    if (!existsSync(skillPath)) {
      throw new Error(`init did not generate ${path.relative(outputDir, skillPath)}.`);
    }

    const skillStat = lstatSync(skillDir);
    if (!skillStat.isSymbolicLink()) {
      throw new Error(`${path.relative(outputDir, skillDir)} must be a symlink.`);
    }

    const resolvedSkillDir = realpathSync(skillDir);
    if (
      normalizeForComparison(resolvedSkillDir) !== normalizeForComparison(resolvedCanonicalSkillDir)
    ) {
      throw new Error(
        `${path.relative(outputDir, skillDir)} must resolve to ${path.relative(outputDir, canonicalSkillDir)}.`,
      );
    }
  }
}

// Legacy commands/prompts wrappers must NOT exist for any qfai skill id.
for (const skillId of [...requiredSkills, ...deprecatedSkillIds]) {
  const legacyWrapperPaths = [
    path.join(outputDir, ".claude", "commands", `${skillId}.md`),
    path.join(outputDir, ".github", "prompts", `${skillId}.prompt.md`),
  ];
  for (const legacyWrapperPath of legacyWrapperPaths) {
    if (existsSync(legacyWrapperPath)) {
      throw new Error(
        `init generated deprecated wrapper ${path.relative(outputDir, legacyWrapperPath)}.`,
      );
    }
  }
}

// Deprecated skill directories must NOT exist in integration dirs.
for (const deprecatedSkillId of deprecatedSkillIds) {
  const deprecatedSkillDirs = skillIntegrationDirs.map(([, dir]) =>
    path.join(dir, deprecatedSkillId),
  );
  for (const deprecatedSkillDir of deprecatedSkillDirs) {
    try {
      const stat = lstatSync(deprecatedSkillDir);
      throw new Error(
        `init generated deprecated wrapper directory ${path.relative(outputDir, deprecatedSkillDir)} (isSymlink=${stat.isSymbolicLink()}).`,
      );
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
}

// Agent symlinks
if (!existsSync(path.join(claudeAgentsDir, "delivery-planner.md"))) {
  throw new Error("init did not generate .claude/agents/delivery-planner.md.");
}
if (!existsSync(path.join(githubAgentsDir, "delivery-planner.agent.md"))) {
  throw new Error("init did not generate .github/agents/delivery-planner.agent.md.");
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
    "## Classification",
    "",
    "- ui_bearing: false",
    "- primary_surface: non-ui",
    "- secondary_surfaces: []",
    "- classification_rationale: Packaging validation fixture — no user-facing UI.",
    "",
  ],
  "02_Inception-Deck.md": [
    "# 02 Inception Deck",
    "",
    "This seeded discussion-pack is for packaging validation only and ensures",
    "the readiness gate has concrete non-placeholder content.",
    "",
    "```mermaid",
    "flowchart TD",
    "  Package[Packed artifact] --> Validate[Smoke validation]",
    "```",
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
    // The research-first protocol stores its output here, and the gate now
    // requires the section on the current pack — a seeded pack without it is
    // QFAI-RESEARCH-016. That code rides the `researchSummarySchemaFields`
    // promotion window, so while the window is open it is a `warning` and the
    // `--fail-on error` run below reports it without failing; from
    // the release the window names it is an `error` and the run stops. Seeded
    // either way, so this fixture does not start failing on the promotion.
    "## Research Summary",
    "",
    "```yaml",
    "research_summary:",
    "  sources:",
    "    - id: SRC-0001",
    "      title: QFAI packaging smoke fixture note",
    "      url: https://example.com/qfai/verify-pack",
    "      published: 2026-02-16",
    "  best_practices:",
    "    - id: BP-0001",
    "      category: packaging",
    "      title: Seed a realistic discussion pack before packing",
    "      description: Give the pack-time validate gate concrete inputs.",
    "      source_id: SRC-0001",
    "  anti_patterns:",
    "    - id: AP-0001",
    "      category: packaging",
    "      title: Validate against an empty scaffold",
    "      description: An empty pack lets every discussion gate pass vacuously.",
    "      source_id: SRC-0001",
    "  reflection:",
    "    - source_id: SRC-0001",
    "      finding: The smoke fixture has to carry the research storage slot.",
    "      action: apply",
    "      reason: Pack-time validate gates the current pack on that section.",
    "```",
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
    "| OQ-ID   | Title                                      | Gate    | Disposition | Owner  | Rationale                                         | Options                                           | Recommendation | Next-Decision-Point      | Due        | Evidence         |",
    "| ------- | ------------------------------------------ | ------- | ----------- | ------ | ------------------------------------------------- | ------------------------------------------------- | -------------- | ------------------------ | ---------- | ---------------- |",
    "| OQ-0001 | Should smoke data mirror full production templates? | discuss | deferred    | CI     | minimal deterministic content is currently sufficient | Option A: keep minimal / Option B: mirror full     | Option A       | before release candidate | 2026-06-01 | Conversation log |",
    "",
  ],
  "12_OQ-Resolution-Log.md": [
    "# 12 OQ Resolution Log",
    "",
    "## OQ-0001",
    "- Question: Should smoke data mirror full production templates?",
    "- Disposition: deferred",
    "- Gate: discuss",
    "- Note: minimal deterministic content is currently sufficient for gate coverage.",
    "",
  ],
  "13_Deferred.md": [
    "# 13 Deferred",
    "",
    "| OQ-ID   | Title                                      | Gate    | Deferred-Reason                                     | Deferred-Until           | Owner  | Due        | Severity | Impact                                  | Mitigation                  | Evidence         |",
    "| ------- | ------------------------------------------ | ------- | --------------------------------------------------- | ------------------------ | ------ | ---------- | -------- | --------------------------------------- | --------------------------- | ---------------- |",
    "| OQ-0001 | Should smoke data mirror full production templates? | discuss | minimal deterministic content is currently sufficient | before release candidate | CI     | 2026-06-01 | low      | smoke test coverage only                | keep current minimal seed   | Conversation log |",
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

// prototyping.yaml is only required for UI-bearing packs (v1.7.14).
// This fixture is ui_bearing: false / primary_surface: non-ui, so omit it.

for (const [fileName, lines] of Object.entries(seededDiscussionPackFiles)) {
  writeFileSync(path.join(seededDiscussionPackDir, fileName), lines.join("\n"));
}

const seededReviewPackDir = path.join(outputDir, ".qfai", "review", "review-20260216000000000");
mkdirSync(seededReviewPackDir, { recursive: true });
writeFileSync(
  path.join(seededReviewPackDir, "review_request.md"),
  [
    "# Review Request",
    "",
    "Target: .qfai/discussion/discussion-20260216000000000",
    "Purpose: verify-pack smoke validation.",
    "",
  ].join("\n"),
);
writeFileSync(
  path.join(seededReviewPackDir, "R01_completion-reviewer.md"),
  [
    "# R01 Completion Reviewer",
    "",
    "- Status: PASS",
    "- Feedback count: 0",
    "- Scope: packaging smoke validation fixture.",
    "",
  ].join("\n"),
);
writeFileSync(
  path.join(seededReviewPackDir, "summary.json"),
  JSON.stringify(
    {
      version: "2.0",
      // Which contract wrote this pack. Required, and this fixture is written
      // by the current one.
      revision_form: "content-hash",
      // Declaring the contract means the tree has to be named too.
      revision: "0000000000000000000000000000000000000000",
      created_at: "2026-02-16T00:00:00.000Z",
      target: {
        kind: "discussion",
        path: ".qfai/discussion/discussion-20260216000000000",
      },
      routing_profile: "completion",
      reviewers: [{ reviewer: "completion-reviewer", status: "PASS", feedback_count: 0 }],
      conditional_reviewers: [],
      overall_status: "PASS",
    },
    null,
    2,
  ) + "\n",
);

execFileSync("node", [cliPath, "init", "--dir", outputDir, "--force"], {
  stdio: "inherit",
});

if (existsSync(skillsLocalDir)) {
  throw new Error("init --force generated deprecated .qfai/assistant/skills.local directory.");
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

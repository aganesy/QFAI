import { execFileSync } from "node:child_process";
// `console` is a global at runtime, but the lane's `no-undef` does not know
// that in a module. `node:console` exports the same instance as its default.
import console from "node:console";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

import {
  BASELINE_PATH,
  UPDATE_ENV,
  diffFingerprints,
  fingerprintReport,
  formatDiff,
  parseValidateReport,
  readBaseline,
  writeBaseline,
} from "./fresh-init-findings.mjs";
import { explainNpmInstallFailure } from "./lib/npm-failure.mjs";
import { assertPackagedGithubTopology } from "./lib/pack-github-topology.mjs";

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function normalizeForComparison(p) {
  const n = path.normalize(p);
  return process.platform === "win32" ? n.toLowerCase() : n;
}

function runNpm(args, options) {
  if (process.platform !== "win32") return execFileSync("npm", args, options);
  const npmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  if (!existsSync(npmCli)) {
    throw new Error(`npm CLI was not found beside Node at ${npmCli}.`);
  }
  return execFileSync(process.execPath, [npmCli, ...args], options);
}

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pkgDir = path.join(root, "packages", "qfai");
const tmpDir = path.join(root, "tmp", "pack");
const sandboxDir = path.join(tmpDir, "sandbox");
const outputDir = path.join(sandboxDir, "out");
const reportPath = path.join(outputDir, ".qfai", "report", "report.md");

function removePackTree(target) {
  const absolute = path.resolve(target);
  const relative = path.relative(tmpDir, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Refusing recursive removal outside ${tmpDir}: ${absolute}`);
  }

  let walked = root;
  for (const segment of path.relative(root, absolute).split(path.sep)) {
    walked = path.join(walked, segment);
    try {
      if (lstatSync(walked).isSymbolicLink()) {
        throw new Error(`Refusing recursive removal through linked path: ${walked}`);
      }
    } catch (error) {
      if (error?.code === "ENOENT") break;
      throw error;
    }
  }
  rmSync(absolute, { recursive: true, force: true });
}

function hasEntry(target) {
  try {
    lstatSync(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

removePackTree(tmpDir);
mkdirSync(tmpDir, { recursive: true });

const packOutput = runNpm(["pack", "--pack-destination", tmpDir], {
  cwd: pkgDir,
  encoding: "utf-8",
}).trim();
const packLines = packOutput.split(/\r?\n/).filter(Boolean);
const tarballName = packLines[packLines.length - 1];
if (!tarballName || path.basename(tarballName) !== tarballName) {
  throw new Error("npm pack failed to produce a tarball name.");
}

const tarballPath = path.join(tmpDir, tarballName);
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
// (see ensureRootGitignoreEntries in core/init/rootGitignore.ts)
const rootAssetsDir = path.join(assetsDir, "root");
if (!existsSync(rootAssetsDir)) {
  throw new Error("assets/init/root is missing from the packed artifact.");
}

const requiredSkills = [
  "qfai-configure",
  "qfai-discussion",
  "qfai-sdd",
  "qfai-prototyping",
  "qfai-implement",
  "qfai-verify",
  "qfai-triage",
  "qfai-migration-v1-to-v2",
];
const deprecatedSkillIds = [
  "qfai-atdd",
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
  const canonicalSkillPath = path.join(templateDir, "assistant", "skill", skillId, "SKILL.md");
  if (!existsSync(canonicalSkillPath)) {
    throw new Error(
      `assets/init/.qfai/assistant/skill/${skillId}/SKILL.md is missing from the packed artifact.`,
    );
  }
}

for (const layer of ["skill", "step", "agent", "rule", "prompt"]) {
  const packed = path.join(templateDir, "assistant", layer);
  if (!existsSync(packed) || !lstatSync(packed).isDirectory()) {
    throw new Error(`assets/init/.qfai/assistant/${layer} must be a directory.`);
  }
}
for (const legacy of ["skills", "agents", "rules", "prompts", "catalog"]) {
  if (hasEntry(path.join(templateDir, "assistant", legacy))) {
    throw new Error(`assets/init/.qfai/assistant/${legacy} must not ship.`);
  }
}

for (const removedDir of [".claude", ".codex"]) {
  if (existsSync(path.join(rootAssetsDir, removedDir))) {
    throw new Error(`assets/init/root/${removedDir} must not exist.`);
  }
}

const rootGithubDir = path.join(rootAssetsDir, ".github");
assertPackagedGithubTopology(rootGithubDir);

removePackTree(sandboxDir);
mkdirSync(sandboxDir, { recursive: true });
runNpm(["init", "-y"], { cwd: sandboxDir, stdio: "inherit" });
try {
  runNpm(["install", tarballPath], {
    cwd: sandboxDir,
    stdio: ["ignore", "inherit", "pipe"],
    encoding: "utf8",
  });
} catch (error) {
  const stderr = typeof error?.stderr === "string" ? error.stderr : "";
  process.stderr.write(stderr);
  const cause = explainNpmInstallFailure(stderr);
  if (cause !== null) console.error(cause);
  throw error;
}

rmSync(tarballPath, { force: true });
removePackTree(outputDir);
mkdirSync(outputDir, { recursive: true });

const cliPath = path.join(sandboxDir, "node_modules", "qfai", "dist", "cli", "index.mjs");
// Package checks run the installed CLI; acquisition uses the same strict fixture as legacy init.
// Native graph installation is verified separately from these distribution checks.
const initPreload = pathToFileURL(
  path.join(pkgDir, "tests", "helpers", "legacyInitProcess.mjs"),
).href;
execFileSync("node", ["--import", initPreload, cliPath, "init", "--dir", outputDir], {
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

const assistantDir = path.join(qfaiDir, "assistant");
for (const layer of ["skill", "step", "agent", "rule", "prompt"]) {
  const generated = path.join(assistantDir, layer);
  if (!existsSync(generated) || !lstatSync(generated).isDirectory()) {
    throw new Error(`init did not generate .qfai/assistant/${layer} directory.`);
  }
}
for (const legacy of ["skills", "agents", "rules", "prompts", "catalog"]) {
  if (hasEntry(path.join(assistantDir, legacy))) {
    throw new Error(`init generated deprecated .qfai/assistant/${legacy} directory.`);
  }
}

const skillsDir = path.join(assistantDir, "skill");
if (!existsSync(skillsDir)) {
  throw new Error("init did not generate .qfai/assistant/skill directory.");
}
for (const skillId of requiredSkills) {
  const generatedSkillPath = path.join(skillsDir, skillId, "SKILL.md");
  if (!existsSync(generatedSkillPath)) {
    throw new Error(`init did not generate .qfai/assistant/skill/${skillId}/SKILL.md.`);
  }
}

const skillsLocalDir = path.join(qfaiDir, "assistant", "skills.local");
if (hasEntry(skillsLocalDir)) {
  throw new Error("init generated deprecated .qfai/assistant/skills.local directory.");
}

const specDir = path.join(qfaiDir, "spec");
const specTemplateDir = path.join(
  templateDir,
  "assistant",
  "skill",
  "qfai-sdd",
  "templates",
  "spec",
);
for (const relative of [
  "decisions.md",
  "open-questions.md",
  "01_policy/glossary.md",
  "01_policy/constraint.md",
  "02_business-flow/business-flows.md",
  "03_contract/contracts.md",
]) {
  const seeded = path.join(specDir, relative);
  const template = path.join(specTemplateDir, relative);
  if (!existsSync(seeded) || readFileSync(seeded, "utf-8") !== readFileSync(template, "utf-8")) {
    throw new Error(`init did not seed .qfai/spec/${relative} from its packed template.`);
  }
}
for (const kind of ["api", "db", "ui", "cli"]) {
  const contractDir = path.join(specDir, "03_contract", kind);
  if (!existsSync(contractDir) || !lstatSync(contractDir).isDirectory()) {
    throw new Error(`init did not generate .qfai/spec/03_contract/${kind} directory.`);
  }
}
if (hasEntry(path.join(qfaiDir, "specs")) || hasEntry(path.join(qfaiDir, "contracts"))) {
  throw new Error("init generated an obsolete spec or contract directory.");
}

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

// Steps are read by their parent skill, never offered to a host as skills.
const stepsDir = path.join(assistantDir, "step");
for (const stepId of readdirSync(stepsDir)) {
  if (!existsSync(path.join(stepsDir, stepId, "STEP.md"))) {
    throw new Error(`init did not generate .qfai/assistant/step/${stepId}/STEP.md.`);
  }
  for (const [label, dir] of skillIntegrationDirs) {
    if (hasEntry(path.join(dir, stepId))) {
      throw new Error(`init linked step ${stepId} into ${label}.`);
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
if (!existsSync(path.join(claudeAgentsDir, "fullstack-engineer.md"))) {
  throw new Error("init did not generate .claude/agents/fullstack-engineer.md.");
}
if (!existsSync(path.join(githubAgentsDir, "fullstack-engineer.agent.md"))) {
  throw new Error("init did not generate .github/agents/fullstack-engineer.agent.md.");
}

const seededReviewPackName = "review-20260216000000000";
const seededReviewPackDir = path.join(outputDir, ".qfai", "review", seededReviewPackName);
mkdirSync(seededReviewPackDir, { recursive: true });

/**
 * The commit this run is gating, named by the seeded pack's `revision`.
 *
 * The sandbox lives under this repository's own work tree, so the check behind
 * that field resolves the value against this repository. A placeholder resolves
 * to nothing and reports a warning on every release run — one no change to the
 * product can remove, in the list a reader scans before shipping — and the
 * branch that runs when a revision *does* resolve never runs at all.
 *
 * `HEAD` is also what the pack means: its verdict describes the tree being
 * validated, and that tree is this checkout.
 */
function headCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(
      "git rev-parse HEAD failed, so the seeded review pack cannot name the commit this run " +
        "is gating. Run verify-pack from a git checkout.",
    );
  }
}
const seededRevision = headCommit();
writeFileSync(
  path.join(seededReviewPackDir, "review_request.md"),
  ["# Review Request", "", "Target: .qfai/spec", "Purpose: verify-pack smoke validation.", ""].join(
    "\n",
  ),
);
writeFileSync(
  path.join(seededReviewPackDir, "R01_implementation-reviewer.md"),
  [
    "# R01 Implementation Reviewer",
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
      revision: seededRevision,
      created_at: "2026-02-16T00:00:00.000Z",
      target: {
        kind: "sdd",
        path: ".qfai/spec",
      },
      reviewers: [{ reviewer: "implementation-reviewer", status: "PASS", feedback_count: 0 }],
      conditional_reviewers: [],
      overall_status: "PASS",
    },
    null,
    2,
  ) + "\n",
);

execFileSync("node", ["--import", initPreload, cliPath, "init", "--dir", outputDir, "--force"], {
  stdio: "inherit",
});

if (hasEntry(skillsLocalDir)) {
  throw new Error("init --force generated deprecated .qfai/assistant/skills.local directory.");
}

// Stand in for the `/qfai-configure` run a project makes before it gates.
// The contract policy file ships as placeholders, and gating without filling
// it measures the fixture rather than the package.
const policyFiles = [path.join(outputDir, ".qfai", "spec", "03_contract", "tech.md")];
for (const policyFile of policyFiles) {
  if (!existsSync(policyFile)) {
    // An `ENOENT` here names the path and nothing else, and the reader's next
    // question is whether the file was renamed or whether init stopped writing
    // it — which is what decides whether the fill or the package is wrong.
    throw new Error(
      `init --force wrote no ${policyFile}. Policy files are what a project fills ` +
        `before it gates, so this fill has nothing to stand in for.`,
    );
  }
  const before = readFileSync(policyFile, "utf-8");
  // One value for each placeholder text, so two slots that name different
  // things, such as two architecture layers, stay different once filled. Every
  // TODO and TBD shares one value.
  const fixtureValues = new Map();
  const fixtureValue = (placeholder) => {
    if (!fixtureValues.has(placeholder)) {
      fixtureValues.set(placeholder, `verify-pack fixture value ${fixtureValues.size + 1}`);
    }
    return fixtureValues.get(placeholder);
  };
  const after = before
    // The Surface row takes one value from a closed set, so it is filled with
    // a member of that set rather than with free text.
    .replace(/^(\|[ \t]*Surface[ \t]*\|[ \t]*`)<[^<>\n]+>`/m, "$1cli`")
    .replace(/<(?!\/|!)[^<>\n]+>/g, fixtureValue)
    .replace(/\b(?:TODO|TBD)\b/g, () => fixtureValue("TODO"));
  if (after === before) {
    throw new Error(
      `${policyFile} carries no placeholder to fill. The shipped policy files are what this stands ` +
        `in for, so a copy with none means the fixture is measuring nothing.`,
    );
  }
  writeFileSync(policyFile, after);
}

execFileSync(
  "node",
  [cliPath, "validate", "--root", outputDir, "--fail-on", "error", "--format", "github"],
  {
    stdio: "inherit",
  },
);

// Three questions of the same report, asked of the file rather than the
// console: `--fail-on error` lets a warning past, so the run stays green while
// the list a reader scans before shipping moves underneath it.
//
// The seeded review pack must not be the reason for a finding about itself.
//
// And the finding set as a whole is compared against what was recorded, in
// both directions — a new warning on a tree the tool wrote is a decision, and
// a finding that is gone should stay gone.
const validateJsonPath = path.join(outputDir, ".qfai", "report", "validate.json");
if (!existsSync(validateJsonPath)) {
  throw new Error(
    `validate wrote no ${validateJsonPath}. The checks below read the findings that run ` +
      `produced, so they have nothing to read without it.`,
  );
}
const validateReport = parseValidateReport(
  readFileSync(validateJsonPath, "utf-8"),
  validateJsonPath,
);
// Stated rather than defaulted to an empty list. A report whose `issues` is
// not a list is one these checks cannot read, and reading it as "no findings"
// gives the answer they exist to withhold — the pass would then mean the file
// was unreadable, and nothing would say so.
if (!Array.isArray(validateReport.issues)) {
  throw new Error(
    `${validateJsonPath} has no \`issues\` array. These checks read that list, so a report ` +
      `without one is unreadable rather than clean.`,
  );
}
const selfInflicted = validateReport.issues.filter(
  (issue) => typeof issue?.file === "string" && issue.file.includes(seededReviewPackName),
);
if (selfInflicted.length > 0) {
  throw new Error(
    "the seeded review pack produced findings about itself:\n" +
      selfInflicted
        .map((issue) => `  ${issue.severity} ${issue.code} ${issue.file}: ${issue.message}`)
        .join("\n"),
  );
}
const freshFindings = fingerprintReport(validateReport, validateJsonPath);

if (process.env[UPDATE_ENV] === "1") {
  writeBaseline(freshFindings);
  console.log(
    `Recorded ${freshFindings.length} findings in ${toPosix(path.relative(root, BASELINE_PATH))}.`,
  );
}

// Held rather than thrown at the comparison. `report` and `doctor` read the
// same sandbox, and their output is what a reader opens to see why the set
// moved — so failing before them costs the run the evidence it was collecting.
// Printed here as well, because a later step can fail first and this has to
// survive that.
let baselineDiff = null;
if (process.env[UPDATE_ENV] !== "1") {
  const findingsDiff = diffFingerprints(freshFindings, readBaseline());
  if (findingsDiff.added.length > 0 || findingsDiff.missing.length > 0) {
    baselineDiff = formatDiff(findingsDiff);
    console.error(baselineDiff);
  } else {
    console.log(`A fresh init validates to the recorded ${freshFindings.length} findings.`);
  }
}

execFileSync("node", [cliPath, "report", "--root", outputDir, "--out", reportPath], {
  stdio: "inherit",
});

if (!existsSync(reportPath)) {
  throw new Error("report did not generate .qfai/report/report.md.");
}

execFileSync("node", [cliPath, "doctor", "--root", outputDir, "--fail-on", "error"], {
  stdio: "inherit",
});

// The exit code, not a second copy. The diff was printed where it was found,
// and throwing it here would repeat every line and wrap them in a stack trace
// of this file — which says nothing about a finding set that moved.
if (baselineDiff !== null) {
  process.exitCode = 1;
}

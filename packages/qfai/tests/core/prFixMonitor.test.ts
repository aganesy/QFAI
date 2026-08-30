import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const prFixScriptPath = path.join(
  repoRoot,
  ".agents",
  "skills",
  "pr-fix",
  "scripts",
  "run-pr-fix.ps1",
);
const claudeSkillPath = path.join(repoRoot, ".claude", "skills", "pr-fix", "SKILL.md");
const agentsSkillPath = path.join(repoRoot, ".agents", "skills", "pr-fix", "SKILL.md");
const codexSkillPath = path.join(repoRoot, ".codex", "skills", "pr-fix", "SKILL.md");
const githubSkillPath = path.join(repoRoot, ".github", "skills", "pr-fix", "SKILL.md");

type FakeCheck = {
  __typename: "CheckRun";
  completedAt: string;
  conclusion: string;
  detailsUrl: string;
  name: string;
  startedAt: string;
  status: string;
  workflowName: string;
};

type FakePrView = {
  baseRefName: string;
  body: string;
  headRefName: string;
  number: number;
  statusCheckRollup: FakeCheck[];
  title: string;
  url: string;
};

type FakeThread = {
  comments: {
    nodes: Array<{
      author: { login: string };
      body: string;
      databaseId: number;
      path: string;
      url: string;
    }>;
  };
  id: string;
  isOutdated: boolean;
  isResolved: boolean;
};

type FakeScenario = {
  branch: string;
  changedFiles: string[];
  changelog: string;
  headSha: string;
  packageVersion: string;
  packageScripts: Record<string, string>;
  prViews: FakePrView[];
  repoView: {
    defaultBranchRef: { name: string };
    name: string;
    owner: { login: string };
    url: string;
  };
  transientGraphqlFailures: number;
  threads: FakeThread[][];
  threadPageInfos?: FakePageInfo[];
  worktreeStatus: string[];
};

type FakePageInfo = {
  endCursor: null | string;
  hasNextPage: boolean;
};

type RunResult = {
  code: number | null;
  repoDir: string;
  stderr: string;
  stdout: string;
};

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) {
      continue;
    }
    await removeTempTree(dir);
  }
});

describe("pr-fix wrapper docs", () => {
  it("keeps pr-fix skill docs aligned across integrations", async () => {
    const [claudeSkill, agentsSkill, codexSkill, githubSkill] = await Promise.all([
      readFile(claudeSkillPath, "utf-8"),
      readFile(agentsSkillPath, "utf-8"),
      readFile(codexSkillPath, "utf-8"),
      readFile(githubSkillPath, "utf-8"),
    ]);

    expect(normalizeNewlines(claudeSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(codexSkill)).toBe(normalizeNewlines(agentsSkill));
    expect(normalizeNewlines(agentsSkill)).toBe(normalizeNewlines(githubSkill));
    expect(agentsSkill).toContain("`-SleepSeconds` の既定値は `60`");
    expect(agentsSkill).toContain("`-RequiredZeroStreak` の既定値は `30`");
    expect(agentsSkill).toContain("live 監視モード（`-DryRun` なし）");
    expect(agentsSkill).toContain("`tmp/pr-fix/`");
    expect(agentsSkill).toContain("`^.+/v(\\d+\\.\\d+\\.\\d+)(?:[-_].*)?$`");
  });
});

describe("run-pr-fix strict monitor", { timeout: 120000 }, () => {
  it("extracts version markers from non-feature branch prefixes and blocks mismatches", async () => {
    const branch = "topic/v1.8.5";
    const result = await runPrFix({
      extraArgs: ["-DryRun", "-SleepSeconds", "0", "-RequiredZeroStreak", "1"],
      scenario: makeScenario({
        branch,
        packageVersion: "1.8.4",
        prViews: [makePrView([successCheck()], { headRefName: branch })],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Branch version marker resolved v1.8.5");
    expect(combinedOutput(result)).toContain(
      "Version alignment is required before pr-fix can continue.",
    );

    const versionCheck = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-version-check.json"),
    );
    expect(versionCheck.ExpectedVersion).toBe("1.8.5");
    expect(versionCheck.PackageVersion).toBe("1.8.4");
    expect(versionCheck.Status).toBe("mismatch");
    expect(versionCheck.ChangelogSectionPresent).toBe(false);
  });

  it("accepts aligned topic/vX.Y.Z branches", async () => {
    const branch = "topic/v1.8.5";
    const result = await runPrFix({
      extraArgs: ["-DryRun", "-SleepSeconds", "0", "-RequiredZeroStreak", "1"],
      scenario: makeScenario({
        branch,
        changelog: changelogWithVersion("1.8.5"),
        packageVersion: "1.8.5",
        prViews: [makePrView([successCheck()], { headRefName: branch })],
      }),
    });

    expect(result.code).toBe(0);
    expect(combinedOutput(result)).toContain(
      "Version alignment check passed for branch marker v1.8.5.",
    );
  });

  it("ignores non-version work suffixes after branch version markers", async () => {
    const branch = "feature/v1.8.5-dds-validator";
    const result = await runPrFix({
      extraArgs: ["-DryRun", "-SleepSeconds", "0", "-RequiredZeroStreak", "1"],
      scenario: makeScenario({
        branch,
        changelog: changelogWithVersion("1.8.5"),
        packageVersion: "1.8.5",
        prViews: [makePrView([successCheck()], { headRefName: branch })],
      }),
    });

    expect(result.code).toBe(0);
    expect(combinedOutput(result)).toContain(
      "Version alignment check passed for branch marker v1.8.5.",
    );

    const versionCheck = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-version-check.json"),
    );
    expect(versionCheck.ExpectedVersion).toBe("1.8.5");
  });

  it("rejects live overrides for SleepSeconds and RequiredZeroStreak", async () => {
    const result = await runPrFix({
      extraArgs: ["-SleepSeconds", "5", "-RequiredZeroStreak", "2"],
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain(
      "Live monitor mode fixes SleepSeconds=60 and RequiredZeroStreak=30",
    );
  });

  it("writes CI failure artifacts and exits non-zero", async () => {
    const result = await runPrFix({
      scenario: makeScenario({
        prViews: [makePrView([failureCheck()])],
        threads: [[]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Non-green check: build (COMPLETED/FAILURE)");

    const monitorStatus = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-monitor-status.json"),
    );
    expect(monitorStatus.State).toBe("action_required_ci_failure");
    expect(monitorStatus.BlockingArtifact).toBe("pr-checks.json");

    const checksPath = path.join(result.repoDir, "tmp", "pr-fix", "pr-checks.json");
    expect(existsSync(checksPath)).toBe(true);
  });

  it("writes unresolved-thread artifacts and exits non-zero", async () => {
    const result = await runPrFix({
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[makeThread()]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Unresolved thread:");

    const monitorStatus = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-monitor-status.json"),
    );
    expect(monitorStatus.State).toBe("action_required_threads");
    expect(monitorStatus.BlockingArtifact).toBe("pr-review-threads.json");

    const threadsPath = path.join(result.repoDir, "tmp", "pr-fix", "pr-review-threads.json");
    expect(existsSync(threadsPath)).toBe(true);
  });

  it("detects outdated but unresolved threads", async () => {
    const outdatedThread = makeThread();
    outdatedThread.isOutdated = true;
    const result = await runPrFix({
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[outdatedThread]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Unresolved thread [outdated]:");

    const monitorStatus = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-monitor-status.json"),
    );
    expect(monitorStatus.State).toBe("action_required_threads");
  });

  it("treats empty status checks as waiting, not clean", async () => {
    const result = await runPrFix({
      mockSleep: true,
      scenario: makeScenario({
        prViews: [makePrView([]), makePrView([]), makePrView([successCheck()])],
        threads: [[], [makeThread()]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain(
      "CI checks are pending/in-progress or not yet reported. Resetting clean streak to 0.",
    );

    const handoffPath = path.join(result.repoDir, "tmp", "pr-fix", "pr-166-handoff.json");
    expect(existsSync(handoffPath)).toBe(false);
  });

  it("resets the streak when CI is pending/in-progress", async () => {
    const cleanView = makePrView([successCheck()]);
    const pendingView = makePrView([pendingCheck()]);
    const emptyThreads = Array.from({ length: 31 }, () => []);
    const result = await runPrFix({
      mockSleep: true,
      scenario: makeScenario({
        prViews: [
          cleanView,
          ...Array.from({ length: 29 }, () => cleanView),
          pendingView,
          cleanView,
        ],
        threads: [...emptyThreads, [makeThread()]],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Clean PR poll 29/30");
    expect(combinedOutput(result)).toContain(
      "CI checks are pending/in-progress or not yet reported. Resetting clean streak to 0.",
    );
    expect(combinedOutput(result)).toContain("Clean PR poll 1/30");

    const handoffPath = path.join(result.repoDir, "tmp", "pr-fix", "pr-166-handoff.json");
    expect(existsSync(handoffPath)).toBe(false);
  });

  it("produces handoff only after 30 consecutive clean polls", async () => {
    const result = await runPrFix({
      mockSleep: true,
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[]],
      }),
    });

    expect(result.code).toBe(0);
    expect(combinedOutput(result)).toContain("Clean PR poll 30/30");
    expect(combinedOutput(result)).toContain("PR handoff ready for PR #166");

    const handoff = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-handoff.json"),
    );
    expect(handoff.CleanStreak).toBe(30);
    expect(handoff.UnresolvedThreads).toBe(0);
    expect(handoff.Checks).toBe("green");

    const monitorStatus = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-monitor-status.json"),
    );
    expect(monitorStatus.State).toBe("handoff_ready");
    expect(monitorStatus.CurrentStreak).toBe(30);
    expect(monitorStatus.EffectiveSleepSeconds).toBe(60);
    expect(monitorStatus.EffectiveRequiredZeroStreak).toBe(30);
  });

  it("retries transient gh graphql failures during live monitoring", async () => {
    const result = await runPrFix({
      mockSleep: true,
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[]],
        transientGraphqlFailures: 1,
      }),
    });

    expect(result.code).toBe(0);
    expect(combinedOutput(result)).toContain("Transient gh failure on attempt 1/3");
    expect(combinedOutput(result)).toContain("PR handoff ready for PR #166");
  });

  it("prefers ci:local when ci:gate is absent during PR body repair", async () => {
    const result = await runPrFix({
      extraArgs: ["-DryRun", "-SleepSeconds", "0", "-RequiredZeroStreak", "1"],
      scenario: makeScenario({
        changedFiles: ["README.md"],
        packageScripts: { "ci:local": "pnpm ci:local" },
        prViews: [
          makePrView([successCheck()], {
            body: "## 1. Summary\n\n- Missing required PR template sections.\n",
          }),
        ],
        threads: [[]],
      }),
    });

    expect(result.code).toBe(0);

    const preview = await readFile(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-body-repaired.md"),
      "utf-8",
    );
    expect(preview).toContain("- Repo CI command: `pnpm ci:local`");
  });

  it("renders pnpm ci:gate when the repo defines a long ci:gate script", async () => {
    const result = await runPrFix({
      extraArgs: ["-DryRun", "-SleepSeconds", "0", "-RequiredZeroStreak", "1"],
      scenario: makeScenario({
        changedFiles: ["README.md"],
        packageScripts: {
          "ci:gate": "pnpm format:check && pnpm lint && pnpm check-types && pnpm verify:pack",
        },
        prViews: [
          makePrView([successCheck()], {
            body: "## 1. Summary\n\n- Missing required PR template sections.\n",
          }),
        ],
        threads: [[]],
      }),
    });

    expect(result.code).toBe(0);

    const preview = await readFile(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-body-repaired.md"),
      "utf-8",
    );
    expect(preview).toContain("- Repo CI command: `pnpm ci:gate`");
    expect(preview).not.toContain("pnpm verify:pack");
  });
});

describe("run-pr-fix strict monitor pagination", { timeout: 120000 }, () => {
  it("detects unresolved threads across paginated GraphQL responses within a single poll", async () => {
    const thread1 = makeThread();
    const thread2: FakeThread = { ...makeThread(), id: "PRRT_kwDOQuL-page2" };
    const result = await runPrFix({
      scenario: makeScenario({
        prViews: [makePrView([successCheck()])],
        threads: [[thread1], [thread2]],
        threadPageInfos: [
          { hasNextPage: true, endCursor: "cursor_page1" },
          { hasNextPage: false, endCursor: null },
        ],
      }),
    });

    expect(result.code).not.toBe(0);
    expect(combinedOutput(result)).toContain("Unresolved thread:");

    const monitorStatus = await readJson(
      path.join(result.repoDir, "tmp", "pr-fix", "pr-166-monitor-status.json"),
    );
    expect(monitorStatus.State).toBe("action_required_threads");
  });
});

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function combinedOutput(result: RunResult): string {
  return `${result.stdout}\n${result.stderr}`;
}

function makeScenario(overrides: Partial<FakeScenario>): FakeScenario {
  return {
    branch: "feature/pr-fix-strict",
    changedFiles: [],
    changelog: defaultChangelog(),
    headSha: "023b4c2bece7a5e3d0ed53d5ebeff027e95bc2d5",
    packageVersion: "1.8.4",
    packageScripts: { "ci:gate": "pnpm ci:gate" },
    prViews: [makePrView([successCheck()])],
    repoView: {
      defaultBranchRef: { name: "main" },
      name: "QFAI",
      owner: { login: "aganesy" },
      url: "https://github.com/aganesy/QFAI",
    },
    transientGraphqlFailures: 0,
    threads: [[]],
    worktreeStatus: [],
    ...overrides,
  };
}

function makePrView(
  statusCheckRollup: FakeCheck[],
  overrides: Partial<FakePrView> = {},
): FakePrView {
  return {
    baseRefName: "main",
    body: compliantPrBody(),
    headRefName: "feature/pr-fix-strict",
    number: 166,
    statusCheckRollup,
    title: "docs: tighten pr-fix monitor",
    url: "https://github.com/aganesy/QFAI/pull/166",
    ...overrides,
  };
}

function compliantPrBody(): string {
  return [
    "## Change Type (Primary)",
    "",
    "- [x] Ops",
    "",
    "## Tags",
    "",
    "- [x] @docs",
    "",
    "## Compatibility (compat)",
    "",
    "- [x] Improvement",
    "",
    "## Review Focus (auto by type)",
    "",
    "- If Ops: no product behavior change? CI/templates/docs consistent?",
    "",
    "## 1. Summary",
    "",
    "### Review Language",
    "",
    "- Review Language: ja",
    "",
    "## 4. Tests",
    "",
    "- Command: `pnpm ci:gate`",
    "- Result: PASS",
    "",
    "## Open Questions / Follow-ups",
    "",
    "- None",
  ].join("\n");
}

function defaultChangelog(): string {
  return [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    "### Added",
    "",
    "- なし",
    "",
    "### Changed",
    "",
    "- なし",
    "",
    "### Removed",
    "",
    "- なし",
    "",
    "## [1.8.4] - 2026-04-27",
    "",
    "- Previous release notes.",
  ].join("\n");
}

function changelogWithVersion(version: string): string {
  return [
    "# Changelog",
    "",
    "## [Unreleased]",
    "",
    "### Added",
    "",
    "- なし",
    "",
    "### Changed",
    "",
    "- なし",
    "",
    "### Removed",
    "",
    "- なし",
    "",
    `## [${version}] - 2026-04-28`,
    "",
    "- Release notes.",
  ].join("\n");
}

function successCheck(): FakeCheck {
  return {
    __typename: "CheckRun",
    completedAt: "2026-03-12T00:00:10Z",
    conclusion: "SUCCESS",
    detailsUrl: "https://github.com/aganesy/QFAI/actions/runs/1/job/1",
    name: "build",
    startedAt: "2026-03-12T00:00:00Z",
    status: "COMPLETED",
    workflowName: "CI",
  };
}

function pendingCheck(): FakeCheck {
  return {
    __typename: "CheckRun",
    completedAt: "",
    conclusion: "",
    detailsUrl: "https://github.com/aganesy/QFAI/actions/runs/1/job/1",
    name: "build",
    startedAt: "2026-03-12T00:00:00Z",
    status: "IN_PROGRESS",
    workflowName: "CI",
  };
}

function failureCheck(): FakeCheck {
  return {
    __typename: "CheckRun",
    completedAt: "2026-03-12T00:00:10Z",
    conclusion: "FAILURE",
    detailsUrl: "https://github.com/aganesy/QFAI/actions/runs/1/job/1",
    name: "build",
    startedAt: "2026-03-12T00:00:00Z",
    status: "COMPLETED",
    workflowName: "CI",
  };
}

function makeThread(): FakeThread {
  return {
    comments: {
      nodes: [
        {
          author: { login: "copilot-pull-request-reviewer" },
          body: "Please fix this review thread.",
          databaseId: 123456789,
          path: ".github/workflows/ci.yml",
          url: "https://github.com/aganesy/QFAI/pull/166#discussion_r123456789",
        },
      ],
    },
    id: "PRRT_kwDOQuL-785ztTTw",
    isOutdated: false,
    isResolved: false,
  };
}

async function runPrFix(options: {
  extraArgs?: string[];
  mockSleep?: boolean;
  scenario: FakeScenario;
}): Promise<RunResult> {
  const root = await makeTempDir("qfai-pr-fix-");
  const repoDir = path.join(root, "repo");
  const binDir = path.join(root, "bin");
  const scenarioPath = path.join(root, "scenario.json");
  const statePath = path.join(root, "state.json");

  await mkdir(repoDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await createMinimalRepo(
    repoDir,
    options.scenario.changelog,
    options.scenario.packageVersion,
    options.scenario.packageScripts,
  );
  await writeFile(scenarioPath, JSON.stringify(options.scenario), "utf-8");
  await writeFile(
    statePath,
    JSON.stringify({ graphqlFailures: 0, pageInfoCount: 0, prViewCount: 0, threadsCount: 0 }),
    "utf-8",
  );
  await writeCommand(binDir, "git", gitStubScript());
  await writeCommand(binDir, "gh", ghStubScript());

  const args = ["-PrNumber", "166", ...(options.extraArgs ?? [])];
  const pwshArgs = options.mockSleep
    ? [
        "-NoProfile",
        "-Command",
        [
          "function Start-Sleep { param([int]$Seconds) }",
          `& ${psQuote(prFixScriptPath)} ${args.map(toPowerShellToken).join(" ")}`,
        ].join("; "),
      ]
    : ["-NoProfile", "-File", prFixScriptPath, ...args];

  const result = await spawnCommand("pwsh", pwshArgs, {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
    QFAI_FAKE_REPO_ROOT: repoDir,
    QFAI_FAKE_SCENARIO_PATH: scenarioPath,
    QFAI_FAKE_STATE_PATH: statePath,
  });

  return { ...result, repoDir };
}

function toPowerShellToken(value: string): string {
  if (value.startsWith("-")) {
    return value;
  }
  return psQuote(value);
}

function psQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function createMinimalRepo(
  repoDir: string,
  changelog: string,
  packageVersion: string,
  packageScripts: Record<string, string>,
): Promise<void> {
  await mkdir(path.join(repoDir, ".github", "workflows"), { recursive: true });
  await mkdir(path.join(repoDir, "packages", "qfai"), { recursive: true });
  await writeFile(
    path.join(repoDir, ".github", "PULL_REQUEST_TEMPLATE.md"),
    "# Template\n",
    "utf-8",
  );
  await writeFile(path.join(repoDir, ".github", "workflows", "ci.yml"), "name: CI\n", "utf-8");
  await writeFile(path.join(repoDir, "CHANGELOG.md"), changelog, "utf-8");
  await writeFile(
    path.join(repoDir, "package.json"),
    JSON.stringify({ scripts: packageScripts }, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(repoDir, "packages", "qfai", "package.json"),
    JSON.stringify({ name: "qfai", version: packageVersion }, null, 2),
    "utf-8",
  );
}

async function writeCommand(binDir: string, name: string, scriptBody: string): Promise<void> {
  const modulePath = path.join(binDir, `${name}.mjs`);
  await writeFile(modulePath, scriptBody, "utf-8");

  if (process.platform === "win32") {
    const wrapperPath = path.join(binDir, `${name}.cmd`);
    const wrapper = `@echo off\r\nnode "%~dp0\\${name}.mjs" %*\r\n`;
    await writeFile(wrapperPath, wrapper, "utf-8");
    return;
  }

  const wrapperPath = path.join(binDir, name);
  const wrapper = `#!/usr/bin/env sh\nnode "$(dirname "$0")/${name}.mjs" "$@"\n`;
  await writeFile(wrapperPath, wrapper, "utf-8");
  await chmod(wrapperPath, 0o755);
}

function gitStubScript(): string {
  return [
    'import fs from "node:fs";',
    "",
    "const scenarioPath = process.env.QFAI_FAKE_SCENARIO_PATH;",
    'const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));',
    "const repoRoot = process.env.QFAI_FAKE_REPO_ROOT;",
    "const args = process.argv.slice(2);",
    "",
    'if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {',
    "  process.stdout.write(`${repoRoot}\\n`);",
    "  process.exit(0);",
    "}",
    'if (args[0] === "status" && args[1] === "--short") {',
    '  process.stdout.write(`${(scenario.worktreeStatus ?? []).join("\\n")}${scenario.worktreeStatus?.length ? "\\n" : ""}`);',
    "  process.exit(0);",
    "}",
    'if (args[0] === "branch" && args[1] === "--show-current") {',
    "  process.stdout.write(`${scenario.branch}\\n`);",
    "  process.exit(0);",
    "}",
    'if (args[0] === "rev-parse" && args[1] === "HEAD") {',
    "  process.stdout.write(`${scenario.headSha}\\n`);",
    "  process.exit(0);",
    "}",
    'process.stderr.write(`unsupported git args: ${args.join(" ")}\\n`);',
    "process.exit(1);",
  ].join("\n");
}

function ghStubScript(): string {
  return [
    'import fs from "node:fs";',
    "",
    "const scenarioPath = process.env.QFAI_FAKE_SCENARIO_PATH;",
    "const statePath = process.env.QFAI_FAKE_STATE_PATH;",
    'const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));',
    "const args = process.argv.slice(2);",
    "const state = fs.existsSync(statePath)",
    '  ? JSON.parse(fs.readFileSync(statePath, "utf8"))',
    "  : { pageInfoCount: 0, prViewCount: 0, threadsCount: 0 };",
    "",
    "function saveState() {",
    '  fs.writeFileSync(statePath, JSON.stringify(state), "utf8");',
    "}",
    "",
    "function next(sequence, key, fallback) {",
    "  if (!Array.isArray(sequence) || sequence.length === 0) {",
    "    return fallback;",
    "  }",
    "  const index = Math.min(state[key] ?? 0, sequence.length - 1);",
    "  state[key] = (state[key] ?? 0) + 1;",
    "  saveState();",
    "  return sequence[index];",
    "}",
    "",
    'if (args[0] === "auth" && args[1] === "status") {',
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "repo" && args[1] === "view") {',
    "  process.stdout.write(JSON.stringify(scenario.repoView));",
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "pr" && args[1] === "view") {',
    "  const prView = next(scenario.prViews, 'prViewCount', null);",
    "  process.stdout.write(JSON.stringify(prView));",
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "api" && args[1] === "--paginate") {',
    '  process.stdout.write(`${(scenario.changedFiles ?? []).join("\\n")}`);',
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "api" && args[1] === "graphql") {',
    "  if ((scenario.transientGraphqlFailures ?? 0) > (state.graphqlFailures ?? 0)) {",
    "    state.graphqlFailures = (state.graphqlFailures ?? 0) + 1;",
    "    saveState();",
    '    process.stderr.write("HTTP 502: 502 Bad Gateway (https://api.github.com/graphql)\\n");',
    "    process.exit(1);",
    "  }",
    "  const threads = next(scenario.threads, 'threadsCount', []);",
    "  const payload = {",
    "    data: {",
    "      repository: {",
    "        pullRequest: {",
    "          reviewThreads: {",
    "            pageInfo: next(scenario.threadPageInfos, 'pageInfoCount', { hasNextPage: false, endCursor: null }),",
    "            nodes: threads,",
    "          },",
    "        },",
    "      },",
    "    },",
    "  };",
    "  process.stdout.write(JSON.stringify(payload));",
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "pr" && args[1] === "edit") {',
    "  process.exit(0);",
    "}",
    "",
    'process.stderr.write(`unsupported gh args: ${args.join(" ")}\\n`);',
    "process.exit(1);",
  ].join("\n");
}

async function spawnCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stderr, stdout });
    });
  });
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, unknown>;
}

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

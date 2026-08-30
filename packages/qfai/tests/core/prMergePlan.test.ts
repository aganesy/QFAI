import { spawn } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { removeTempTree } from "../helpers/tempTree.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const prMergeScriptPath = path.join(
  repoRoot,
  ".agents",
  "skills",
  "pr-merge",
  "scripts",
  "run-pr-merge.ps1",
);

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
  headRefName: string;
  isDraft: boolean;
  number: number;
  state: string;
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

type FakePageInfo = {
  endCursor: null | string;
  hasNextPage: boolean;
};

type FakeScenario = {
  branch: string;
  headSha: string;
  packageScripts: Record<string, string>;
  prView: FakePrView;
  repoView: {
    defaultBranchRef: { name: string };
    name: string;
    owner: { login: string };
    url: string;
  };
  threads: FakeThread[];
  threadPages?: FakeThread[][];
  threadPageInfos?: FakePageInfo[];
  worktreeStatus: string[];
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

describe("run-pr-merge plan", { timeout: 30000 }, () => {
  it("renders pnpm ci:gate when the repo defines a long ci:gate script", async () => {
    const result = await runPrMerge({
      scenario: makeScenario({
        packageScripts: {
          "ci:gate": "pnpm format:check && pnpm lint && pnpm check-types && pnpm verify:pack",
        },
      }),
    });

    expect(result.code).toBe(0);

    const plan = await readJson(
      path.join(result.repoDir, "tmp", "pr-merge", "pr-166-merge-plan.json"),
    );
    expect(plan.CiCommand).toBe("pnpm ci:gate");
  });

  it("prefers ci:local when ci:gate is absent", async () => {
    const result = await runPrMerge({
      scenario: makeScenario({
        packageScripts: { "ci:local": "pnpm ci:local" },
      }),
    });

    expect(result.code).toBe(0);

    const plan = await readJson(
      path.join(result.repoDir, "tmp", "pr-merge", "pr-166-merge-plan.json"),
    );
    expect(plan.CiCommand).toBe("pnpm ci:local");
    expect(plan.ReadyToMerge).toBe(true);
  });
});

describe("run-pr-merge pagination", { timeout: 30000 }, () => {
  it("detects unresolved threads split across multiple GraphQL pages", async () => {
    const thread1 = makeThread();
    const thread2: FakeThread = { ...makeThread(), id: "PRRT_kwDOQuL-page2" };
    const result = await runPrMerge({
      scenario: makeScenario({
        threadPages: [[thread1], [thread2]],
      }),
    });

    // the script throws after saving the plan when there are blockers
    expect(result.code).not.toBe(0);
    const plan = await readJson(
      path.join(result.repoDir, "tmp", "pr-merge", "pr-166-merge-plan.json"),
    );
    expect(plan.ReadyToMerge).toBe(false);
    expect(plan.UnresolvedThreads).toBe(2);
  });

  it("fails fast when pagination reports next page without endCursor", async () => {
    const result = await runPrMerge({
      scenario: makeScenario({
        threadPages: [[makeThread()]],
        threadPageInfos: [{ hasNextPage: true, endCursor: null }],
      }),
    });

    expect(result.code).not.toBe(0);
  });
});

function makeScenario(overrides: Partial<FakeScenario>): FakeScenario {
  return {
    branch: "feature/pr-merge-plan",
    headSha: "023b4c2bece7a5e3d0ed53d5ebeff027e95bc2d5",
    packageScripts: { "ci:gate": "pnpm ci:gate" },
    prView: {
      baseRefName: "main",
      headRefName: "feature/pr-merge-plan",
      isDraft: false,
      number: 166,
      state: "OPEN",
      statusCheckRollup: [successCheck()],
      title: "docs: tighten pr-merge plan",
      url: "https://github.com/aganesy/QFAI/pull/166",
    },
    repoView: {
      defaultBranchRef: { name: "main" },
      name: "QFAI",
      owner: { login: "aganesy" },
      url: "https://github.com/aganesy/QFAI",
    },
    threads: [],
    worktreeStatus: [],
    ...overrides,
  };
}

function makeThread(): FakeThread {
  return {
    comments: {
      nodes: [
        {
          author: { login: "reviewer" },
          body: "Please fix this.",
          databaseId: 123456789,
          path: "src/example.ts",
          url: "https://github.com/aganesy/QFAI/pull/166#discussion_r123456789",
        },
      ],
    },
    id: "PRRT_kwDOQuL-page1",
    isOutdated: false,
    isResolved: false,
  };
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

async function runPrMerge(options: { scenario: FakeScenario }): Promise<RunResult> {
  const root = await makeTempDir("qfai-pr-merge-");
  const repoDir = path.join(root, "repo");
  const binDir = path.join(root, "bin");
  const scenarioPath = path.join(root, "scenario.json");
  const statePath = path.join(root, "state.json");

  await mkdir(repoDir, { recursive: true });
  await mkdir(binDir, { recursive: true });
  await createMinimalRepo(repoDir, options.scenario.packageScripts);
  await writeFile(scenarioPath, JSON.stringify(options.scenario), "utf-8");
  await writeFile(statePath, JSON.stringify({ graphqlCallCount: 0 }), "utf-8");
  await writeCommand(binDir, "git", gitStubScript());
  await writeCommand(binDir, "gh", ghStubScript());

  const result = await spawnCommand(
    "pwsh",
    ["-NoProfile", "-File", prMergeScriptPath, "-PrNumber", "166", "-DryRun"],
    {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
      QFAI_FAKE_REPO_ROOT: repoDir,
      QFAI_FAKE_SCENARIO_PATH: scenarioPath,
      QFAI_FAKE_STATE_PATH: statePath,
    },
  );

  return { ...result, repoDir };
}

async function createMinimalRepo(
  repoDir: string,
  packageScripts: Record<string, string>,
): Promise<void> {
  await mkdir(path.join(repoDir, "packages", "qfai"), { recursive: true });
  await writeFile(
    path.join(repoDir, "package.json"),
    JSON.stringify({ scripts: packageScripts }, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(repoDir, "packages", "qfai", "package.json"),
    JSON.stringify({ version: "1.5.3" }, null, 2),
    "utf-8",
  );
  await writeFile(path.join(repoDir, "CHANGELOG.md"), "## [1.5.3]\n\n- Test entry\n", "utf-8");
  await writeFile(path.join(repoDir, "RELEASE.md"), "# Release\n", "utf-8");
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
    'if (args[0] === "ls-remote" && args[1] === "--tags") {',
    '  process.stdout.write("");',
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
    "",
    "const state = statePath && fs.existsSync(statePath)",
    '  ? JSON.parse(fs.readFileSync(statePath, "utf8"))',
    "  : { graphqlCallCount: 0 };",
    "function saveState() {",
    "  if (!statePath) return;",
    '  fs.writeFileSync(statePath, JSON.stringify(state), "utf8");',
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
    "  process.stdout.write(JSON.stringify(scenario.prView));",
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "api" && args[1] === "graphql") {',
    "  const pages = scenario.threadPages;",
    "  let nodes, pageInfo;",
    "  if (Array.isArray(pages) && pages.length > 0) {",
    "    const idx = Math.min(state.graphqlCallCount ?? 0, pages.length - 1);",
    "    const isLast = idx >= pages.length - 1;",
    "    nodes = pages[idx];",
    "    const defaultPageInfo = isLast",
    "      ? { hasNextPage: false, endCursor: null }",
    "      : { hasNextPage: true, endCursor: `cursor_${idx + 1}` };",
    "    const explicitPageInfo = Array.isArray(scenario.threadPageInfos) ? scenario.threadPageInfos[idx] : null;",
    "    pageInfo = explicitPageInfo ?? defaultPageInfo;",
    "    state.graphqlCallCount = (state.graphqlCallCount ?? 0) + 1;",
    "    saveState();",
    "  } else {",
    "    nodes = scenario.threads;",
    "    pageInfo = { hasNextPage: false, endCursor: null };",
    "  }",
    "  const payload = { data: { repository: { pullRequest: { reviewThreads: { pageInfo, nodes } } } } };",
    "  process.stdout.write(JSON.stringify(payload));",
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

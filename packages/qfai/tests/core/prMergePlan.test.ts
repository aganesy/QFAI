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
  body: string;
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
  finalPrBody?: string;
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
  ghState: Record<string, unknown>;
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

/**
 * Deliberately no `{ timeout: … }` here, and none on the pagination block below.
 *
 * Both declared 30 s, a quarter of the project's `testTimeout`, on a file that
 * genuinely spawns: its four `runPrMerge` calls each `spawn("pwsh", …)` to drive
 * the `run-pr-merge` script. `vitest.knobs.ts` raised that value to
 * 120 s over the same class of cost — its measurement is of the qfai binary
 * rather than of `pwsh`, but its conclusion is the one that applies: "15 s was
 * never a budget for this workload. It was a budget for in-process tests,
 * applied to a suite that is subprocess-bound."
 *
 * Observed, one full `core` run on a clean tree:
 *
 * ```text
 * ❯ tests/core/prMergePlan.test.ts (4 tests | 1 failed) 91079ms
 *   FAIL run-pr-merge pagination
 *          > detects unresolved threads split across multiple GraphQL pages
 *     → Test timed out in 30000ms.
 * ```
 *
 * `30000ms` is this block's own number rather than the project's, which is what
 * identifies the override as the cause. One of the cases that PASSED in the same
 * run took 22231 ms, so the file was sitting at three quarters of its ceiling
 * while green — the margin was gone before anything failed.
 *
 * `prFixMonitor.test.ts` is the same harness — 14 `runPrFix` calls through the
 * same `spawnCommand("pwsh", …)` — and declares `{ timeout: 120000 }`. The more
 * spawn-heavy of the pair took the project's value; this one took a quarter of
 * it, and nothing marks either as considered. Inheriting reaches the same number
 * without a second copy to update when `CR-20260823-0001` lets the knobs file
 * lower it.
 */
describe("run-pr-merge plan", () => {
  it.each(
    ["---", "==="].flatMap((underline) =>
      ["Adoption bar", "Adoption\nbar"].map((title) => [underline, title] as const),
    ),
  )("blocks an empty removal answer before Setext %s / %j", async (underline, title) => {
    const baseline = makeScenario({});
    const body = `## What this change made unnecessary\n\n${title}\n${underline}\nKeep publication approval.\n`;
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).not.toBe(0);
    expect(result.ghState.prMergeCount ?? 0).toBe(0);
  });

  it.each([
    ["absent", ""],
    ["Markdown-only", "## What this change made unnecessary\n\n---\n"],
    ...["---", "==="].map((underline) => [
      `reference paragraph becomes Setext ${underline}`,
      `## What this change made unnecessary\n\n[Nothing]: /url "Title\n${underline}\nNothing"\n`,
    ]),
    ["None marker", "## What this change made unnecessary\n\nNone.\n"],
    ["N/A marker", "## What this change made unnecessary\n\nN/A\n"],
    ["named space entity", "## What this change made unnecessary\n\n&nbsp;\n"],
    ["numeric space entity", "## What this change made unnecessary\n\n&#160;\n"],
    ["TODO prefix", "## What this change made unnecessary\n\nTODO: fill this in\n"],
    ["TBD prefix", "## What this change made unnecessary\n\nTBD: list the removals\n"],
    ["FIXME prefix", "## What this change made unnecessary\n\nFIXME: list the removals\n"],
    ["HACK placeholder", "## What this change made unnecessary\n\nHACK\n"],
    ["HTML empty block", "## What this change made unnecessary\n\n<div>\n</div>\n"],
    [
      "link-reference definition",
      "## What this change made unnecessary\n\n[Nothing]: https://example.com\n",
    ],
    ...[
      "[Nothing]:\n   https://example.com\n",
      '[Nothing]: https://example.com "Title\nwith a line break"\n',
      "[Nothing]: <https://example.com/space here>\n",
      "[Nothing]: https://example.com/a(b)c\n",
      "[Nothing]: https://example.com\r\n",
      "[\u00a0]: https://example.com\n",
    ].map((definition) => [
      `reference boundary ${JSON.stringify(definition)}`,
      `## What this change made unnecessary\n\n${definition}`,
    ]),
    ...[
      ["1000 ASCII bytes", `[${"a".repeat(1000)}]: /url\n`],
      ["1000 emoji bytes", `[${"😀".repeat(250)}]: /url\n`],
      ["1000 accented bytes", `[${"é".repeat(500)}]: /url\n`],
      ["CRLF label", `[${"a".repeat(996)}\r\nok]: /url\r\n`],
      ["32 nested parentheses", `[Nothing]: /${"(".repeat(32)}a${")".repeat(32)}\n`],
      ["optional title before a heading", '[Nothing]: /url\n"\n## Adoption bar\nNothing"\n'],
      ...["+", "2. Nothing", "<span>", "    ## Adoption bar"].map((line) => [
        `non-interrupting title line ${line}`,
        `[Nothing]: /url "Title\n${line}\nNothing"\n`,
      ]),
    ].map(([name, definition]) => [
      `hidden reference ${name}`,
      `## What this change made unnecessary\n\n${definition}`,
    ]),
    ...[
      '[](https://example.com "\nNothing\n")',
      "[](https://example.com '\nNothing\n')",
      "[](https://example.com (\nNothing\n))",
      '[ ](https://example.com "\nNothing\n")',
      '[](<https://example.com> "\nNothing\n")',
      '[](https://example.com/a(b)c "\nNothing\n")',
    ].map((link) => [
      `empty multiline link ${JSON.stringify(link)}`,
      `## What this change made unnecessary\n\n${link}\n`,
    ]),
    ["tab-indented fence closer", "~~~\n\t~~~\n## What this change made unnecessary\n\nNothing.\n"],
    ...["[](/url))", "[](/url(a)))", "[]())"].map((link) => [
      `empty link with trailing parenthesis ${link}`,
      `## What this change made unnecessary\n\n${link}\n`,
    ]),
    [
      "multiline HTML tag",
      '## What this change made unnecessary\n\n<div\nclass="Nothing">\n</div>\n',
    ],
    [
      "quoted HTML attribute",
      '## What this change made unnecessary\n\n<span\ntitle="Nothing > never">\n</span>\n',
    ],
    ...[1, 2, 3].flatMap((indent) =>
      ["#", "##"].map((level) => [
        `indented next heading ${indent}/${level}`,
        `## What this change made unnecessary\n\n${" ".repeat(indent)}${level} Adoption bar\n\nKeep publication approval.\n`,
      ]),
    ),
    [
      "HTML comment only",
      "## What this change made unnecessary\n\n<div>\n<!-- Nothing. -->\n</div>\n",
    ],
    ["HTML entity only", "## What this change made unnecessary\n\n<p>&nbsp;</p>\n"],
    ["HTML placeholder only", "## What this change made unnecessary\n\n<p>TODO</p>\n"],
    ...["pre", "script", "style", "textarea"].map((tag) => [
      `literal HTML answer ${tag}`,
      `## What this change made unnecessary\n\n<${tag}>\nNothing.\n</${tag}>\n`,
    ]),
    ["fenced", "```md\n## What this change made unnecessary\n\nNothing.\n````\n"],
    ...["pre", "script", "style", "textarea", "div", "table"].map((tag) => [
      `raw HTML ${tag}`,
      `<${tag}>\n## What this change made unnecessary\nNothing.\n</${tag}>\n`,
    ]),
    [
      "raw HTML processing instruction",
      "<?qfai\n## What this change made unnecessary\nNothing.\n?>\n",
    ],
    ["raw HTML declaration", "<!DOCTYPE\n## What this change made unnecessary\nNothing.\n>\n"],
    ["raw HTML CDATA", "<![CDATA[\n## What this change made unnecessary\nNothing.\n]]>\n"],
    [
      "raw HTML standalone inline tag",
      "<span>\n## What this change made unnecessary\nNothing.\n</span>\n",
    ],
  ])("blocks a %s removal answer without a handoff or merge", async (_name, body) => {
    const baseline = makeScenario({});
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("authored removal-list answer");
    expect(result.ghState.prMergeCount ?? 0).toBe(0);
  });

  it("rechecks the body immediately before merging without trusting a handoff", async () => {
    const result = await runPrMerge({ live: true, scenario: makeScenario({ finalPrBody: "" }) });
    expect(result.code).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("authored removal-list answer");
    expect(result.ghState.prViewCount).toBe(2);
    expect(result.ghState.prMergeCount ?? 0).toBe(0);
  });

  it("allows an authored answer without requiring a handoff", async () => {
    const result = await runPrMerge({ live: true, scenario: makeScenario({}) });
    expect(result.code).toBe(0);
    expect(result.ghState.prViewCount).toBe(2);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it.each([
    ...[
      "## Adoption bar",
      "~~~",
      "> Nothing",
      "- Nothing",
      "01. Nothing",
      "<![cdata[",
      "<div>",
    ].map((block) => [
      `title interrupted by ${block}`,
      `[Nothing]: /url "Title\n${block}\nNothing"\n`,
    ]),
    ["label interrupted by a heading", "[Nothing\n## Adoption bar\nNothing]: /url\n"],
    ["destination interrupted by HTML", "[Nothing]:\n<div>\n"],
    ["1001 ASCII bytes", `[${"a".repeat(1001)}]: /url\n`],
    ["1004 emoji bytes", `[${"😀".repeat(251)}]: /url\n`],
    ["1002 accented bytes", `[${"é".repeat(501)}]: /url\n`],
    ["33 nested parentheses", `[Nothing]: /${"(".repeat(33)}a${")".repeat(33)}\n`],
    ["empty anchor then a literal reference", "[](/url)\n[Nothing]: /target\n"],
    ["escaped multiline link", '\\[](https://example.com "\nNothing\n")\n'],
    ["literal HTML link", "<div>\n[](https://example.com)\n</div>\n"],
    ["literal inline code link", "`[](https://example.com)`\n"],
    ["escaped single-line link", "\\[](https://example.com)\n"],
  ])("preserves visible reference-like text: %s", async (_name, answer) => {
    const baseline = makeScenario({});
    const body = `## What this change made unnecessary\n\n${answer}`;
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it.each([
    ...[
      "## What this change made unnecessary ##",
      " ## What this change made unnecessary",
      "  ## What a change made unnecessary ###",
      "   ## What this change made unnecessary",
    ].map((heading) => [heading, `${heading}\n\nA removed pin.\n`]),
    ...["\t", " \t"].flatMap((indent) =>
      ["```", "~~~", "<pre>"].map((opener) => [
        `indented code ${JSON.stringify(indent + opener)}`,
        `${indent}${opener}\n## What this change made unnecessary\n\nA removed pin.\n`,
      ]),
    ),
    ["multiline visible link", '[A removed pin](https://example.com "\nNothing\n")\n'],
    ["literal link with a blank title line", '[](https://example.com "\n\nNothing\n")\n'],
    ["literal link with an unquoted title", "[](https://example.com \nNothing\n)\n"],
  ])("accepts rendered Markdown: %s", async (_name, section) => {
    const baseline = makeScenario({});
    const body = section.includes("## What")
      ? section
      : `## What this change made unnecessary\n\n${section}`;
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it.each([
    ["inline code", "Use `<!--` literally.\n\n"],
    ["fence info", "~~~ <!--\nExample\n~~~\n\n"],
    ["similar ordinary word", ""],
    ["paragraph inline tag", "Paragraph text\n<span>\n"],
    ["invalid custom tag", "<span title=>\n"],
    ["lowercase CDATA lookalike", "<![cdata[\n"],
  ])("allows an authored answer after %s", async (_name, prefix) => {
    const baseline = makeScenario({});
    const body = `${prefix}## What this change made unnecessary\n\nHACKathon-specific duplicate setup is gone.\n`;
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it("accepts a visible removal heading that interrupts a backtick paragraph", async () => {
    const baseline = makeScenario({});
    const body = "`\n## What this change made unnecessary\nNothing.\n`\n";
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prViewCount).toBe(2);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it.each([
    "<p>Nothing.</p>",
    "<div>\nNothing.\n</div>",
    "<span>\nNothing.\n</span>",
    "<div>\n<!--\n## Example -->\nNothing.\n</div>",
    "<div>\n[Nothing]: https://example.com\n</div>",
  ])("preserves a visible authored HTML answer %s", async (answer) => {
    const baseline = makeScenario({});
    const body = `## What this change made unnecessary\n\n${answer}\n`;
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prMergeCount).toBe(1);
  });

  it("accepts a real heading after a first-line indented HTML example", async () => {
    const baseline = makeScenario({});
    const body = "    <pre>\n## What this change made unnecessary\nNothing.\n";
    const result = await runPrMerge({
      live: true,
      scenario: makeScenario({ prView: { ...baseline.prView, body } }),
    });
    expect(result.code).toBe(0);
    expect(result.ghState.prMergeCount).toBe(1);
  });

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

describe("run-pr-merge pagination", () => {
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
      body: "## What this change made unnecessary\n\nNothing.\n",
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

async function runPrMerge(options: { live?: boolean; scenario: FakeScenario }): Promise<RunResult> {
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
    [
      "-NoProfile",
      "-File",
      prMergeScriptPath,
      "-PrNumber",
      "166",
      options.live ? "-NoTag" : "-DryRun",
    ],
    {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ""}`,
      QFAI_FAKE_REPO_ROOT: repoDir,
      QFAI_FAKE_SCENARIO_PATH: scenarioPath,
      QFAI_FAKE_STATE_PATH: statePath,
    },
  );

  return { ...result, ghState: await readJson(statePath), repoDir };
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
    "  const final = (state.prViewCount ?? 0) > 0;",
    "  state.prViewCount = (state.prViewCount ?? 0) + 1;",
    "  saveState();",
    "  const prView = { ...scenario.prView, ...(final && scenario.finalPrBody !== undefined ? { body: scenario.finalPrBody } : {}) };",
    "  const fields = args[args.indexOf('--json') + 1].split(',');",
    "  process.stdout.write(JSON.stringify(Object.fromEntries(fields.map(field => [field, prView[field]]))));",
    "  process.exit(0);",
    "}",
    "",
    'if (args[0] === "pr" && args[1] === "merge") {',
    "  state.prMergeCount = (state.prMergeCount ?? 0) + 1;",
    "  saveState();",
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

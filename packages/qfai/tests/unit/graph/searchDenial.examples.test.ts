import { expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runInstalledGraphHook } from "../../../src/cli/graphHook.js";
import { installedGraphHookResult } from "../../helpers/graphCli.js";
import {
  classifyGraphExploration,
  decodeGraphHookEvent,
  graphHookOutput,
} from "../../../src/core/graph/hooks.js";

// QFAI:EX-0001-0235-01
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies rg exploration and redirects code structure with recovery"
it("denies rg exploration and redirects code structure with recovery", () => {
  const result = classifyGraphExploration({ tool: "Bash", command: "rg auth packages/" });
  expect(result.decision).toBe("deny");
  expect(result.operation).toBe("rg");
  expect(result.target).toBe("packages/");
  expect(result.domain).toBe("code");
  expect(result.message).toContain("rg");
  expect(result.message).toContain("CodeGraph");
  expect(result.message).toContain("Prepare");
  expect(result.message).toContain("AI-decided");
  expect(result.message).toContain('node .qfai/tools/graph-cli.mjs code "<question>"');
  expect(result.message).toContain("fallback --attempt-id");
  expect(result.message).not.toMatch(/codegraph_explore|query_graph|request_search_fallback|MCP/);
});

// QFAI:EX-0001-0235-28
// Mutation: packages/qfai/src/core/graph/hooks.ts `path.resolve(directory, target) !== directory` -> `true` fails "keeps the fallback for a cd to the observed worktree and withholds it for any other move"
it("keeps the fallback for a cd to the observed worktree and withholds it for any other move", () => {
  const root = path.resolve("project-root");
  for (const event of [
    { tool: "Bash", cwd: root, command: `cd '${root}' && rg auth packages/` },
    { tool: "Bash", cwd: root, command: "cd . && rg auth packages/" },
    { tool: "Bash", cwd: root, command: `bash -lc "cd '${root}' && rg auth packages/"` },
    { tool: "Bash", cwd: root, command: `command cd '${root}/' && rg auth packages/` },
    { tool: "PowerShell", cwd: root, command: `Set-Location '${root}'; rg auth packages/` },
    {
      tool: "exec_command",
      cwd: path.dirname(root),
      workdir: "project-root",
      command: "cd . && rg auth packages/",
    },
  ]) {
    const result = classifyGraphExploration(event);
    expect(result.decision, event.command).toBe("deny");
    expect(result.target, event.command).toBe("packages/");
    expect(result.exceptionEligible, event.command).toBe(true);
    expect(result.fallbackUnavailable, event.command).toBeUndefined();
  }
  for (const event of [
    { tool: "Bash", cwd: root, command: `cd '${path.join(root, "packages")}' && rg auth src/` },
    { tool: "Bash", cwd: root, command: "cd .. && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "cd && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "cd - && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "cd $HOME && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "cd ~ && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "pushd . && popd && rg auth packages/" },
    {
      tool: "Bash",
      cwd: root,
      command: "cd() { builtin cd /elsewhere; }; cd . && rg auth packages/",
    },
    { tool: "Bash", cwd: root, command: "alias cd=pushd; cd . && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "CDPATH=/outside cd nested/.. && rg auth packages/" },
    { tool: "Bash", cwd: root, command: "set -P; cd link/.. && rg auth packages/" },
    {
      tool: "Bash",
      cwd: root,
      command: `cd '${path.join(root, "packages")}/..' && rg auth packages/`,
    },
    { tool: "Bash", command: `cd '${root}' && rg auth packages/` },
  ]) {
    const result = classifyGraphExploration(event);
    expect(result.decision, event.command).toBe("deny");
    expect(result.fallbackUnavailable, event.command).toBe(true);
    expect(result.message, event.command).toContain("changes its working directory");
  }
});

// QFAI:EX-0001-0235-14
// Mutation: packages/qfai/src/core/graph/hooks.ts `state: "outside-boundary",` -> `state: "configured",` fails "reports hidden scripts aliases and continuing input outside the proven boundary"
it("reports hidden scripts aliases and continuing input outside the proven boundary", () => {
  for (const event of [
    { tool: "Bash", command: "./private-search.sh auth" },
    { tool: "PowerShell", command: "Search-Repository authorize" },
    { tool: "write_stdin", command: "rg auth packages/" },
    { tool: "Bash", command: "bash ./private-search.sh" },
  ]) {
    const result = classifyGraphExploration(event);
    expect(result.decision).toBe("allow");
    expect(result.state).toBe("outside-boundary");
    expect(result.message).toContain("not verified");
  }
});

// QFAI:EX-0001-0235-13
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook("depth");` -> `if (depth >= 0) return failedGraphHook("depth");` fails "allows graph engine commands whose native implementations search internally"
it("allows graph engine commands whose native implementations search internally", () => {
  for (const command of [
    "node .qfai/tools/runtimes/codegraph/node_modules/@colbymchenry/codegraph/npm-shim.js context authorize --path .qfai/tools/analysis/codegraph",
    ".qfai/tools/runtimes/graphify/Scripts/python.exe -m graphify query policy --graph .qfai/tools/analysis/graphify/graphify-out/graph.json",
    "env GRAPHIFY_QUERY_LOG_DISABLE=1 python -m graphify query policy",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("allow");
    expect(result.operation).toBeUndefined();
  }
});

// QFAI:EX-0001-0235-12
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook("depth");` -> `if (depth >= 0) return failedGraphHook("depth");` fails "allows quality commands whose ordinary implementations search internally"
it("allows quality commands whose ordinary implementations search internally", () => {
  for (const command of [
    "pnpm test",
    "corepack pnpm build",
    "env CI=true pnpm lint",
    "bash -lc 'pnpm test'",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("allow");
    expect(result.operation).toBeUndefined();
  }
});

// QFAI:EX-0001-0235-11
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook("depth");` -> `if (depth >= 0) return failedGraphHook("depth");` fails "allows exact known-file reads without graph exploration"
it("allows exact known-file reads without graph exploration", () => {
  for (const command of [
    "cat packages/qfai/src/core/index.ts",
    "Get-Content -LiteralPath packages/qfai/src/core/index.ts",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("allow");
    expect(result.operation).toBeUndefined();
  }
});

// QFAI:EX-0001-0235-10
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook("depth");` -> `if (depth >= 0) return failedGraphHook("depth");` fails "allows quoted search words printed without invoking search"
it("allows quoted search words printed without invoking search", () => {
  for (const command of [
    "echo 'grep'",
    'printf "%s\\n" grep',
    'Write-Output "grep | rg"',
    'echo "a\\" b"',
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("allow");
    expect(result.operation).toBeUndefined();
  }
});

// QFAI:EX-0001-0235-09
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies separate exploration following a quality command"
it("denies separate exploration following a quality command", () => {
  for (const command of [
    "pnpm test; rg auth packages/",
    "pnpm test && rg auth packages/",
    "pnpm lint\nrg auth packages/",
    'echo "a\\" b"; rg auth packages/',
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("deny");
    expect(result.operation).toBe("rg");
    expect(result.target).toBe("packages/");
  }
  expect(
    classifyGraphExploration({
      tool: "PowerShell",
      command: 'Write-Output "a`" b"; rg auth packages/',
    }).decision,
  ).toBe("deny");
});

// QFAI:EX-0001-0235-08
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies direct exploration inside supported command wrappers"
it("denies direct exploration inside supported command wrappers", () => {
  const commands = [
    "LC_ALL=C grep -R policy .qfai/spec",
    "LC_ALL=C LANG=C command grep -R policy .qfai/spec",
    "builtin grep -R policy .qfai/spec",
    "env LC_ALL=C grep -R policy .qfai/spec",
    "command grep -R policy .qfai/spec",
    "bash -lc 'grep -R policy .qfai/spec'",
    'pwsh -NoProfile -Command "Select-String -Pattern policy -Path .qfai/spec/*.md"',
    'cmd /d /c "findstr /S policy .qfai\\spec\\*.md"',
  ];
  for (const command of commands) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("deny");
    expect(result.domain).toBe("documents");
    expect(result.message).toContain("Graphify");
  }
});

// QFAI:EX-0001-0235-07
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies exploration at any pipeline position before a formatter"
it("denies exploration at any pipeline position before a formatter", () => {
  for (const command of ["rg auth packages/ | sort", "echo start | rg auth packages/ | sort"]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision).toBe("deny");
    expect(result.operation).toBe("rg");
    expect(result.target).toBe("packages/");
  }
});

// QFAI:EX-0001-0235-06
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies native search events through host-specific pre-tool responses"
it("denies native search events through host-specific pre-tool responses", async () => {
  const events = [
    { tool_name: "Grep", tool_input: { pattern: "authorize", path: "packages/" } },
    { toolName: "grep", toolArgs: JSON.stringify({ pattern: "policy", path: ".qfai/spec" }) },
    { tool_name: "grep_search", tool_input: { query: "authorize", includePattern: "packages/**" } },
    { tool_name: "rg", tool_input: { pattern: "authorize", path: "packages/" } },
  ];
  for (const event of events) {
    const decoded = decodeGraphHookEvent(event);
    expect(decoded).toBeDefined();
    if (!decoded) throw new Error("Expected a supported native pre-tool event");
    const decision = classifyGraphExploration(decoded);
    expect(decision.decision).toBe("deny");
    expect(decision.target).toBe(
      event === events[1] ? ".qfai/spec" : event === events[2] ? "packages/**" : "packages/",
    );
    expect(graphHookOutput(event === events[1] ? "copilot" : "vscode", decision)).toMatchObject(
      event === events[1]
        ? { permissionDecision: "deny" }
        : { hookSpecificOutput: { permissionDecision: "deny", hookEventName: "PreToolUse" } },
    );
  }
  expect(
    decodeGraphHookEvent({
      toolName: "grep",
      toolArgs: JSON.stringify({ pattern: "policy", path: "docs/" }),
      sessionId: "native-copilot-session",
      cwd: "/project",
    })?.session,
  ).toBe("native-copilot-session");
  expect(
    decodeGraphHookEvent({
      tool_name: "Grep",
      tool_input: { pattern: "auth", path: ["packages/", "private/"] },
    }),
  ).toBeUndefined();
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-native-hook-wire-"));
  try {
    await mkdir(path.join(root, ".qfai", "tools"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "tools", "graph-enforcement.json"),
      JSON.stringify({ kind: "graph-enforcement", denyExploration: true }),
    );
    for (const input of events.slice(0, 2)) {
      let output = "";
      let failed = false;
      await runInstalledGraphHook(root, ["shared"], {
        read: () => input,
        output: (text) => {
          output += text;
        },
        error: () => {},
        fail: () => {
          failed = true;
        },
      });
      expect(failed).toBe(false);
      expect(output).toContain("Search fallback unavailable:");
      expect(output).not.toContain("fallback --attempt-id");
      expect(JSON.parse(output)).toMatchObject(
        input === events[1]
          ? { permissionDecision: "deny" }
          : { hookSpecificOutput: { permissionDecision: "deny" } },
      );
    }
    for (const identity of [
      { fields: { cwd: root }, reason: "session and worktree" },
      { fields: { session_id: "wire-session" }, reason: "session and worktree" },
      {
        fields: { session_id: "wire-session", cwd: path.resolve("other-worktree") },
        reason: "worktree differs",
      },
    ]) {
      const denied = await installedGraphHookResult(root, { ...events[0], ...identity.fields });
      expect(denied.output).toContain(identity.reason);
      expect(denied.output).not.toContain("fallback --attempt-id");
      expect(denied.output).not.toContain("Observed attempt:");
    }
    expect(
      (
        await installedGraphHookResult(root, {
          tool_name: "Bash",
          tool_input: { command: "cat packages/qfai/src/core/index.ts" },
        })
      ).output,
    ).toBe("");
    const mixed = {
      tool_name: "Grep",
      tool_input: { pattern: "auth", path: "packages/" },
      toolName: "read",
      toolArgs: { path: "checkout.ts" },
    };
    expect(decodeGraphHookEvent(mixed)).toBeUndefined();
    let failed = false;
    await runInstalledGraphHook(root, ["shared"], {
      read: () => mixed,
      output: () => {},
      error: () => {},
      fail: () => {
        failed = true;
      },
    });
    expect(failed).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0235-05
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies findstr exploration over project source"
it("denies findstr exploration over project source", () => {
  const result = classifyGraphExploration({
    tool: "PowerShell",
    command: "findstr /S authorize packages\\*.ts",
  });
  expect(result.decision).toBe("deny");
  expect(result.operation).toBe("findstr");
  expect(result.target).toBe("packages\\*.ts");
});

// QFAI:EX-0001-0235-04
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies PowerShell Select-String over project source"
it("denies PowerShell Select-String over project source", () => {
  const result = classifyGraphExploration({
    tool: "PowerShell",
    command: "Select-String -Pattern authorize -Path packages/**/*.ts",
  });
  expect(result.decision).toBe("deny");
  expect(result.operation).toBe("Select-String");
  expect(result.target).toBe("packages/**/*.ts");
  expect(result.domain).toBe("code");
});

// QFAI:EX-0001-0235-04
// Mutation: packages/qfai/src/core/graph/hooks.ts `? ["Select-String", ...words.slice(1)]` -> `? words` fails "denies the PowerShell alias sls as Select-String over project source"
it("denies the PowerShell alias sls as Select-String over project source", () => {
  for (const [tool, command] of [
    ["PowerShell", "sls -Pattern authorize -Path packages/**/*.ts"],
    ["PowerShell", "SLS -Pattern authorize -Path packages/**/*.ts"],
    ["PowerShell", "pwsh -Command 'sls -Pattern authorize -Path packages/**/*.ts'"],
    ["Bash", "pwsh -Command 'sls -Pattern authorize -Path packages/**/*.ts'"],
  ] as const) {
    const result = classifyGraphExploration({ tool, command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("Select-String");
    expect(result.target, command).toBe("packages/**/*.ts");
  }
});

// QFAI:EX-0001-0235-14
// Mutation: packages/qfai/src/core/graph/hooks.ts `return shell === "powershell" && words[0]?.toLowerCase() === "sls"` -> `return words[0]?.toLowerCase() === "sls"` fails "leaves sls outside PowerShell to the program it names"
it("leaves sls outside PowerShell to the program it names", () => {
  for (const command of ["sls deploy --stage prod", "sls offline"]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
    expect(result.state, command).toBe("outside-boundary");
  }
});

// QFAI:EX-0001-0235-26
// Mutation: packages/qfai/src/core/graph/hooks.ts `? ["Select-String", ...words.slice(1)]` -> `? words` fails "allows git output piped to the PowerShell alias sls with no path"
it("allows git output piped to the PowerShell alias sls with no path", () => {
  const result = classifyGraphExploration({
    tool: "PowerShell",
    command: "git ls-files | sls -Pattern hooks",
  });
  expect(result.decision).toBe("allow");
  // Without the alias, sls is an unknown program: still allowed, but outside the boundary.
  expect(result.state).toBe("configured");
});

// QFAI:EX-0001-0235-03
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies git grep exploration before execution"
it("denies git grep exploration before execution", () => {
  const result = classifyGraphExploration({ tool: "Bash", command: "git grep authorize" });
  expect(result.decision).toBe("deny");
  expect(result.operation).toBe("git grep");
  expect(result.target).toBe(".");
  expect(result.message).toContain("CodeGraph");
});

// QFAI:EX-0001-0235-02
// Mutation: packages/qfai/src/core/graph/hooks.ts `function denyExploration(operation: string, target: string): GraphHookDecision {` -> `function denyExploration(operation: string, target: string): GraphHookDecision { return { decision: "allow", state: "configured", operation, target, message: "Exploration allowed." };` fails "denies recursive grep over specifications and redirects document rationale"
it("denies recursive grep over specifications and redirects document rationale", () => {
  const result = classifyGraphExploration({ tool: "Bash", command: "grep -R policy .qfai/spec" });
  expect(result.decision).toBe("deny");
  expect(result.operation).toBe("grep");
  expect(result.target).toBe(".qfai/spec");
  expect(result.domain).toBe("documents");
  expect(result.message).toContain("Graphify");
  expect(result.message).toContain("Prepare");
  expect(result.message).toContain("AI-decided");
  expect(result.message).toContain('node .qfai/tools/graph-cli.mjs documents "<question>"');
  expect(result.message).toContain("fallback --attempt-id");
  expect(result.message).not.toMatch(/codegraph_explore|query_graph|request_search_fallback|MCP/);
});

// QFAI:EX-0001-0235-26
// Mutation: packages/qfai/src/core/graph/hooks.ts `function pipeFilter(words: string[]): boolean {` -> `function pipeFilter(words: string[]): boolean { return false;` fails "allows a search tool with no file operand that filters piped text"
it("allows a search tool with no file operand that filters piped text", () => {
  for (const [tool, command] of [
    ["Bash", "git ls-files | grep auth"],
    ["Bash", "git ls-files | grep '\\.ts$'"],
    ["Bash", "pnpm test 2>&1 | grep -v passed"],
    ["Bash", "git log --oneline | grep -iE 'fix|feat'"],
    ["Bash", "git status |& grep -e modified -e deleted -"],
    ["Bash", "git ls-files |\ngrep auth"],
    ["Bash", "git ls-files | sort | grep -v test | grep -c auth"],
    ["Bash", "git ls-files | grep -A3 --color=never auth"],
    ["Bash", "git diff | rg -n authorize"],
    ["Bash", 'bash -c "git ls-files | grep auth"'],
    ["PowerShell", 'git ls-files | findstr /I /C:"auth flow"'],
    ["PowerShell", "git ls-files | Select-String auth"],
    ["PowerShell", "git ls-files | Select-String -Pattern auth -SimpleMatch"],
  ] as const) {
    expect(classifyGraphExploration({ tool, command }).decision, command).toBe("allow");
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `function printsText(command: ShellCommand | undefined): boolean {` -> `function printsText(command: ShellCommand | undefined): boolean { return true;` fails "denies piped searches that still read project files"
it("denies piped searches that still read project files", () => {
  for (const [tool, command, operation] of [
    ["Bash", "git ls-files | grep -r auth", "grep"],
    ["Bash", "git ls-files | grep --recur auth", "grep"],
    ["Bash", "git ls-files | grep --dir=recurse auth", "grep"],
    ["Bash", "git ls-files | grep auth packages", "grep"],
    ["Bash", "git ls-files | grep -e auth packages", "grep"],
    ["Bash", "git ls-files | grep --color auth packages/index.ts", "grep"],
    ["Bash", "git ls-files | rg --files", "rg"],
    ["Bash", "git ls-files | grep auth < packages/index.ts", "grep"],
    ["Bash", "git ls-files | grep auth<packages/index.ts", "grep"],
    ["Bash", "git ls-files | grep -i<packages/index.ts auth", "grep"],
    ["Bash", "git ls-files | grep auth 2>&1 packages/index.ts", "grep"],
    ["Bash", "git ls-files | grep auth &>/dev/null packages/index.ts", "grep"],
    ["Bash", "git ls-files | grep auth >| out.txt packages/index.ts", "grep"],
    ["Bash", "git ls-files | grep $PATTERN", "grep"],
    ["Bash", "git status || grep auth", "grep"],
    ["Bash", "cat packages/qfai/src/**/*.ts | grep -n authorize", "grep"],
    ["Bash", "find packages -name '*.ts' -exec cat {} + | grep -n authorize", "grep"],
    ["Bash", 'echo "$(cat packages/index.ts)" | grep auth', "grep"],
    ["Bash", "pnpm exec cat packages/index.ts | grep auth", "grep"],
    ["PowerShell", "Get-ChildItem -Recurse packages | Select-String auth", "Select-String"],
    [
      "PowerShell",
      "gci packages | Where-Object Length -gt 0 | Select-String auth",
      "Select-String",
    ],
    ["PowerShell", "(Get-ChildItem -Recurse packages) | Select-String auth", "Select-String"],
    [
      "PowerShell",
      "Get-ChildItem -Recurse packages | Get-Content | Select-String auth",
      "Select-String",
    ],
    ["PowerShell", "git ls-files | Select-String auth packages/index.ts", "Select-String"],
    ["PowerShell", "git ls-files | Select-String auth -Path:packages/index.ts", "Select-String"],
    ["PowerShell", "git ls-files | Select-String -Pattern:auth packages/index.ts", "Select-String"],
    ["Bash", "echo \\>|grep -r auth .", "grep"],
    ["Bash", "echo a\\>&grep -r auth .", "grep"],
    ["Bash", "echo x | grep $'\\055rie\\x73ecret'", "grep"],
    ["Bash", "(cat packages/index.ts; echo ) | grep auth", "grep"],
    ["Bash", "pnpm --filter qfai exec cat packages/index.ts | grep auth", "grep"],
    ["Bash", "npm -w qfai exec -- cat packages/index.ts | grep auth", "grep"],
    ["Bash", "pnpm cat packages/index.ts | grep auth", "grep"],
    ["Bash", "git -c alias.c='!cat packages/index.ts' c | grep auth", "grep"],
    ["Bash", "git show HEAD:packages/index.ts | grep auth", "grep"],
    ["Bash", "printf 'packages/index.ts\\0' | sort --files0-from=- | grep auth", "grep"],
    ["Bash", "git log | RIPGREP_CONFIG_PATH=cfg rg auth", "rg"],
    ["Bash", "echo packages/* | grep auth", "grep"],
    [
      "PowerShell",
      "Write-Output (Get-Content packages/index.ts) | Select-String auth",
      "Select-String",
    ],
    ["PowerShell", "@(Get-ChildItem -Recurse; git log) | Select-String auth", "Select-String"],
    ["PowerShell", "echo `>|Select-String auth -Path packages/index.ts", "Select-String"],
    ["Bash", "git ls-files | grep {auth,packages/index.ts}", "grep"],
    ["Bash", "git ls-files | rg *", "rg"],
    ["Bash", "git ls-files | grep -n ?*", "grep"],
    ["Bash", "git diff --no-index /dev/null packages/index.ts | grep auth", "grep"],
    ["PowerShell", "$a = '-r','auth','packages'; git ls-files | grep @a", "grep"],
    ["PowerShell", "git ls-files | grep -e auth -e (gci)", "grep"],
    ["PowerShell", "git ls-files | rg -e auth -e @(gci)", "rg"],
    [
      "PowerShell",
      "$a = Get-Content packages/index.ts; echo @a | Select-String auth",
      "Select-String",
    ],
    ["PowerShell", "git ls-files | findstr -g:packages\\x.ts", "findstr"],
    ["Bash", "X=/echo cat packages/index.ts | grep auth", "grep"],
    ["Bash", "X=/git diff /dev/null packages/index.ts | grep auth", "grep"],
    ["Bash", "git diff /dev/null packages/index.ts | grep auth", "grep"],
    ["Bash", "./git status | grep auth", "grep"],
    ["Bash", "git(){ cat packages/index.ts; }; git status | grep auth", "grep"],
    ["Bash", "export RIPGREP_CONFIG_PATH=cfg; git status | rg -e auth", "rg"],
    ["Bash", "git diff HEAD:../x HEAD:y | grep auth", "grep"],
    ["Bash", "git diff -- :/x | grep auth", "grep"],
    ["Bash", "git tag -l -n9999 t | grep auth", "grep"],
    ["Bash", "filter grep { rg auth packages }; git status | grep auth", "grep"],
    ["Bash", "git status | ./grep auth", "grep"],
    ["Bash", "builtin alias grep='rg -n auth packages'; git status | grep x", "grep"],
    [
      "Bash",
      "grep() { cat packages/index.ts; }; export -f grep; bash -c 'git status | grep x'",
      "grep",
    ],
    ["Bash", ">/dev/null hash -p /bin/cat grep; git status | grep .env", "grep"],
    ["Bash", "command >/dev/null alias grep='cat .env #'; git status | grep x", "grep"],
    ["Bash", ">/dev/null PATH=.; git status | grep x", "grep"],
    ["Bash", ">&- hash -p /usr/bin/xargs grep; echo authorize packages | grep rg", "grep"],
    [
      "Bash",
      "{fd}>/dev/null hash -p /usr/bin/xargs grep; echo authorize packages | grep rg",
      "grep",
    ],
    ["Bash", "time hash -p /usr/bin/xargs grep; echo authorize packages | grep rg", "grep"],
    ["Bash", "read PATH <<< /tmp/x; echo authorize packages | grep rg", "grep"],
    ["PowerShell", "git ls-files | findstr /S auth", "findstr"],
    ["PowerShell", "git ls-files | findstr auth<packages\\index.ts", "findstr"],
  ] as const) {
    const result = classifyGraphExploration({ tool, command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe(operation);
  }
  const escaped = classifyGraphExploration({
    tool: "exec_command",
    shell: "cmd.exe",
    command: "echo a ^>|findstr /s auth *",
  });
  expect(escaped.decision).toBe("deny");
  expect(escaped.operation).toBe("findstr");
  for (const command of [
    "rg&>out.txt auth packages",
    "rg>out.txt auth packages",
    "X=1>out rg auth packages",
    "env -i>out rg auth packages",
    ">out rg auth packages",
    "<input.txt rg auth packages",
    "3<> input.txt rg auth packages",
  ]) {
    const attached = classifyGraphExploration({ tool: "Bash", command });
    expect(attached.decision, command).toBe("deny");
    expect(attached.operation, command).toBe("rg");
  }
  for (const command of ["grep</dev/null -r foo src", "grep<&3 -r foo ."]) {
    const attached = classifyGraphExploration({ tool: "Bash", command });
    expect(attached.decision, command).toBe("deny");
    expect(attached.operation, command).toBe("grep");
  }
  for (const command of ['rg auth "&>" /etc/passwd', "rg auth packages &> out.txt"]) {
    const redirected = classifyGraphExploration({ tool: "Bash", command });
    expect(redirected.decision, command).toBe("deny");
    expect(redirected.exceptionEligible, command).toBe(false);
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `!/^(?:\d*|\{[A-Za-z_][A-Za-z0-9_]*\})$/.test(word) &&` -> `!/^\d*$/.test(word) &&` fails "denies a search behind a named descriptor redirection"
it("denies a search behind a named descriptor redirection", () => {
  for (const command of [
    "{fd}<file grep -r foo src",
    "{fd}< file grep -r foo src",
    "{out}>log.txt rg auth packages",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe(command.includes("rg") ? "rg" : "grep");
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `for (const classify of substitutions) {` -> `for (const classify of substitutions.slice(0, 0)) {` fails "denies a search inside a command or process substitution"
it("denies a search inside a command or process substitution", () => {
  for (const [tool, command, operation] of [
    ["Bash", "echo $(grep -r foo src)", "grep"],
    ["Bash", 'echo "$(grep -r foo src)"', "grep"],
    ["Bash", "cat <(grep -r foo src)", "grep"],
    ["Bash", "tee >(rg auth packages) < /dev/null", "rg"],
    ["Bash", "echo `grep -r foo src`", "grep"],
    ["Bash", "echo $(echo $(rg auth packages))", "rg"],
    ["Bash", "bash -c 'echo $(grep -r foo src)'", "grep"],
    [
      "PowerShell",
      "Write-Output $(Select-String -Pattern auth -Path packages/index.ts)",
      "Select-String",
    ],
    ["PowerShell", "Write-Output @(rg auth packages)", "rg"],
  ] as const) {
    const result = classifyGraphExploration({ tool, command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe(operation);
  }
  for (const command of [
    "echo '$(grep -r foo src)'",
    String.raw`echo \$(grep -r foo src)`,
    "echo $((1 + 2))",
    'echo "$(git status)"',
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
  }
  const quotedGroup = 'Write-Output "@(rg auth packages)"';
  expect(classifyGraphExploration({ tool: "PowerShell", command: quotedGroup }).decision).toBe(
    "allow",
  );
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `const command = shell === "posix" ? heredocData(text) : text;` -> `const command = text;` fails "reads a here-document body as data, not as substitutions"
it("reads a here-document body as data, not as substitutions", () => {
  const message = [
    "Deny the search",
    "",
    "Searches such as `grep -r foo src` and $(rg auth packages) are now denied.",
    "rg auth packages is the shape the hook reads.",
  ].join("\n");
  for (const command of [
    `git commit -m "$(cat <<'EOF'\n${message}\nEOF\n)"`,
    `git commit -m "$(cat <<"EOF"\n${message}\nEOF\n)"`,
    `git commit -m "$(cat <<-EOF\n${message}\n\tEOF\n)"`,
    `gh pr create --body "$(cat <<'EOF'\n${message}\nEOF\n)" --title x`,
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
  }
  // A body a shell reads is a script, and a `<<` the shell does not read as an
  // operator starts no body, so a search after either is still a search.
  for (const command of [
    "echo $(bash <<'EOF'\ngrep -r foo src\nEOF\n)",
    'echo "<<X"\necho $(grep -r foo src)\nX',
    "echo hi # <<X\necho $(grep -r foo src)\nX",
    "echo $((1<<2))\necho $(grep -r foo src)\n2",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
  }
  // Nesting past the depth limit still fails closed.
  const deep = `${"echo $(".repeat(20)}grep -r foo src${")".repeat(20)}`;
  expect(classifyGraphExploration({ tool: "Bash", command: deep }).decision).toBe("deny");
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `} else if (character === "#" && !word.length && startsComment(command, index, shell)) {` -> `} else if (false) {` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (!quote && atWordStart && character === "#" && shell === "posix") {` -> `if (false) {` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (!quote && atWordStart && character === "#" && shell === "posix") {` -> `if (!quote && character === "#" && shell === "posix") {` fails "ends a # comment at its line so a quote inside it hides no later search"
it("ends a # comment at its line so a quote inside it hides no later search", () => {
  for (const command of [
    "echo # '\nrg auth packages/",
    'echo hi # "\nrg auth packages/',
    "# it's a note\nrg auth packages/",
    "true;# '\nrg auth packages/",
    "echo # '\necho $(rg auth packages/)",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
  // The shape the report gave: the quote a later line closes is a syntax
  // error only after the search on the line between has run.
  const reported = "echo # '\nrg auth packages/\n'";
  expect(classifyGraphExploration({ tool: "Bash", command: reported }).decision).toBe("deny");
  // A `#` inside a word starts no comment: after other characters, inside
  // quotes, after an escaped separator, or right after a closed substitution.
  for (const command of [
    "echo a#b && rg auth packages/",
    "echo '#' && rg auth packages/",
    "echo \\ #$(rg auth packages/)",
    "echo a\\;#$(rg auth packages/)",
    "echo a\\|#`rg auth packages/`",
    "echo $(true)#$(rg auth packages/)",
    "cat <(true)#$(rg auth packages/)",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
  // A search that exists only inside a comment is never run.
  for (const command of ["echo hi # rg auth packages/", "echo hi # $(rg auth packages/)"]) {
    expect(classifyGraphExploration({ tool: "Bash", command }).decision, command).toBe("allow");
  }
  // PowerShell comments are not read, so a `#` there hides no substitution.
  for (const command of ["<# x #> $(rg auth packages/)", "echo @(1)#$(rg auth packages/)"]) {
    const result = classifyGraphExploration({ tool: "PowerShell", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
});

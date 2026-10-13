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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook();` -> `if (depth >= 0) return failedGraphHook();` fails "allows graph engine commands whose native implementations search internally"
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook();` -> `if (depth >= 0) return failedGraphHook();` fails "allows quality commands whose ordinary implementations search internally"
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook();` -> `if (depth >= 0) return failedGraphHook();` fails "allows exact known-file reads without graph exploration"
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (depth > 16) return failedGraphHook();` -> `if (depth >= 0) return failedGraphHook();` fails "allows quoted search words printed without invoking search"
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

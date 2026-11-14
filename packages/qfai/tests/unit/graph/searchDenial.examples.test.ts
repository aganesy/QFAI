import { afterEach, expect, it, vi } from "vitest";
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (location === "observed" && directory === scope.directory) return "observed";` -> `` fails "keeps the fallback for a cd to the observed worktree and withholds it for any other move"
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

afterEach(() => {
  vi.unstubAllEnvs();
});

// QFAI:EX-0001-0235-28
// Mutation: packages/qfai/src/core/graph/hooks.ts `command.join === "||" ||` -> `` fails "rebases the search target after an && chain into a project subdirectory and withholds the fallback otherwise"
it("rebases the search target after an && chain into a project subdirectory and withholds the fallback otherwise", () => {
  vi.stubEnv("CDPATH", "");
  const root = path.resolve("project-root");
  const rebased: [command: string, target: string, tool?: string][] = [
    [`cd '${path.join(root, "packages")}' && rg auth src/`, "packages/src"],
    ["cd ./packages && rg auth src/", "packages/src"],
    ["cd packages && rg auth", "packages"],
    ["cd packages && cd qfai && rg auth src/", "packages/qfai/src"],
    ["cd packages && echo start && rg auth src/", "packages/src"],
    ['cd packages && bash -c "rg auth src/"', "packages/src"],
    ["Set-Location packages && rg auth src/", "packages/src", "PowerShell"],
  ];
  for (const [command, target, tool = "Bash"] of rebased) {
    const result = classifyGraphExploration({ tool, cwd: root, command });
    expect(result.decision, command).toBe("deny");
    expect(result.target, command).toBe(target);
    expect(result.exceptionEligible, command).toBe(true);
    expect(result.fallbackUnavailable, command).toBeUndefined();
  }
  for (const command of [
    "cd packages || rg auth src/",
    "cd packages; rg auth src/",
    "cd packages & rg auth src/",
    "cd packages | rg auth src/",
    "echo packages | cd packages && rg auth src/",
    "cd packages && echo start; rg auth src/",
    "cd packages && echo start || rg auth src/",
    "cd packages\nrg auth src/",
    "true || cd packages && rg auth src/",
    "pushd packages && pushd +1 && rg auth src/",
    `cd '${path.dirname(root)}' && rg auth src/`,
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", cwd: root, command });
    expect(result.decision, command).toBe("deny");
    expect(result.fallbackUnavailable, command).toBe(true);
    expect(result.message, command).toContain("changes its working directory");
  }
  const provider = classifyGraphExploration({
    tool: "PowerShell",
    cwd: root,
    command: "Set-Location env: && rg auth src/",
  });
  expect(provider.fallbackUnavailable).toBe(true);
  expect(provider.message).toContain("changes its working directory");
  const parent = classifyGraphExploration({
    tool: "Bash",
    cwd: root,
    command: "cd packages && rg auth ../docs",
  });
  expect(parent.fallbackUnavailable).toBe(true);
  expect(parent.message).toContain("has a .. segment after a directory change");
  const escaping = classifyGraphExploration({
    tool: "Bash",
    cwd: root,
    command: `cd packages && rg auth '${path.join(path.dirname(root), "outside")}'`,
  });
  expect(escaping.fallbackUnavailable).toBe(true);
  expect(escaping.message).toContain("resolves outside this project worktree");
  vi.stubEnv("CDPATH", "/elsewhere");
  expect(
    classifyGraphExploration({ tool: "Bash", cwd: root, command: "cd packages && rg auth src/" })
      .fallbackUnavailable,
  ).toBe(true);
  expect(
    classifyGraphExploration({ tool: "Bash", cwd: root, command: "cd ./packages && rg auth src/" })
      .target,
  ).toBe("packages/src");
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

// QFAI:EX-0001-0235-29
// Mutation: packages/qfai/src/core/graph/hooks.ts `heredocs.push({ delimiter, stripTabs, data });` -> `heredocs.push({ delimiter, stripTabs, data: false });` fails "allows here-document bodies that hold an apostrophe or a search word"
it("allows here-document bodies that hold an apostrophe or a search word", () => {
  for (const command of [
    "cat > notes.md <<'EOF'\nThe hook doesn't search.\nEOF\ngh issue create --body-file notes.md",
    "cat <<'EOF' > a.txt\ngrep -R policy .qfai/spec\nEOF",
    'cat <<-"END" > b.txt\n\tIt\'s data.\n\tEND\necho done',
    "cat<<'EOF'\nIt's data.\nEOF",
    "tee out.txt <<'EOF' >/dev/null\nIt's data.\nEOF",
    "cat > a.md <<'EOF'\nIt's $x (a).\nEOF\ncat > b.md <<'EOF'\nIt's b.\nEOF\ngh issue create --body-file a.md",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
    expect(result.state, command).not.toBe("failed");
  }
  for (const command of [
    "cat > a.txt <<'EOF'\nIt's data.\nEOF\nrg auth packages/",
    "cat <<'EOF' && rg auth packages/\ndata\nEOF",
    // A `<<` that is not an operator registers no body.
    "echo '<<' EOF\nrg auth packages/",
    'echo "<<x"\nrg auth packages/',
    "echo hi # <<EOF\nrg auth packages/",
    "echo $((1 << 2))\nrg auth packages/",
    "cat <<<x\nrg auth packages/",
    // An empty quoted delimiter ends the body at the first empty line.
    "cat <<'' x\nbody\n\nrg auth packages/\nx",
    "echo $[1<<2]\nrg auth packages/",
    "echo ${x:-<<EOF}\nrg auth packages/",
    "(true)#<<EOF\nrg auth packages/",
    "for ((i=0; i<1<<2; i++)); do :; done\nrg auth packages/",
    // A delimiter that is not literal text is not read as Bash reads it.
    "cat <<$'EOF'\nx\nEOF\nrg auth packages/",
    // A body with no delimiter line is not skipped.
    "cat <<EOF\nrg auth packages/",
    // Only a body that cat or tee reads, and that reaches no pipe, is data.
    "bash <<'EOF'\nrg auth packages/\nEOF",
    "'bash' <<EOF\nrg auth packages/\nEOF",
    "bash.exe <<EOF\nrg auth packages/\nEOF",
    ". /dev/stdin <<EOF\nrg auth packages/\nEOF",
    "cat <<'EOF' | sh\nrg auth packages/\nEOF",
    "cat <<EOF |\nrg auth packages/\nEOF\nbash",
    "exec 0<<EOF\nrg auth packages/\nEOF\nbash",
    "x=$(cat <<EOF\nrg auth packages/\nEOF\n)",
    "bash <<B; cat <<A\nrg auth packages/\nB\nx\nA",
    // Nothing earlier may redefine cat or open a reader of what it writes.
    "cat(){ bash; }; cat <<EOF\nrg auth packages/\nEOF",
    "alias cat=bash\ncat <<EOF\nrg auth packages/\nEOF",
    "exec 3> >(bash)\ncat <<EOF >&3\nrg auth packages/\nEOF",
    "mkfifo p; bash < p & cat <<EOF > p\nrg auth packages/\nEOF",
    "cat <<EOF > /dev/fd/3\nrg auth packages/\nEOF",
    "cat <<EOF &\nrg auth packages/\nEOF",
    // Only a whole line that writes files, after only such lines, skips its body.
    "{\ncat <<EOF\nrg auth packages/\nEOF\n} | bash",
    "if true\nthen\ncat <<EOF\nrg auth packages/\nEOF\nfi | sh",
    'bash -c "cat <<EOF\nrg auth packages/\nEOF" | bash',
    "tee 'x\ny' <<EOF | bash\nrg auth packages/\nEOF",
    "\\hash -p /bin/bash cat\ncat <<EOF\nrg auth packages/\nEOF",
    "printf -v PATH /tmp/e\ncat <<EOF\nrg auth packages/\nEOF",
    "cat <<EOF\rx\nhi\nEOF\rx\nrg auth packages/\nEOF",
    'cat <<"E\\\\F"\nhi\nE\\F\nrg auth packages/\nE\\\\F',
    "cat > /dev/fd/3 <<EOF\nrg auth packages/\nEOF",
    // An unquoted delimiter lets Bash expand and join body lines; a carriage return is
    // an ordinary character to Bash. Neither body is skipped.
    "cat > f.sh <<EOF\nx=$(\nrg auth packages/\n)\nEOF",
    "cat > c.txt <<'EOF'\r\nrg auth packages/\r\nEOF\r\n",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `shell === "posix" ? heredocData(text) : { text, expanded: [] };` -> `{ text, expanded: [] };` fails "reads a here-document body as data, not as substitutions"
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
    `git commit -m "$(cat <<-'EOF'\n${message}\n\tEOF\n)"`,
    `git commit -m "$(cat <<\\EOF\n${message}\nEOF\n)"`,
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
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (cases.at(-1) === depth) continue;` -> `if (false) continue;` fails "denies a search in a case arm, a subshell, a group or zsh process substitution"
it("denies a search in a case arm, a subshell, a group or zsh process substitution", () => {
  for (const [tool, command, operation] of [
    ["Bash", "echo $(case x in x) grep -r foo src;; esac)", "grep"],
    ["Bash", "echo $(case x in (x) grep -r foo src;; esac)", "grep"],
    ["Bash", "case x in x) grep -r foo src;; esac", "grep"],
    ["Bash", "case x in\n  y) echo y;;\n  *) rg auth packages;;\nesac", "rg"],
    ["Bash", "cat =(grep -r foo src)", "grep"],
    ["Bash", "(grep -r foo src)", "grep"],
    ["Bash", "( cd sub && rg auth packages )", "rg"],
    ["Bash", "{ grep -r foo src; }", "grep"],
    ["PowerShell", "Write-Output (rg auth packages)", "rg"],
    ["Bash", "echo $(case x in x) echo $(case y in y) grep -r foo src;; esac);; esac)", "grep"],
    ["Bash", 'case x in\n"a b") grep -r foo src;;\nesac', "grep"],
    ["Bash", "arr=($(grep -r foo src))", "grep"],
  ] as const) {
    const result = classifyGraphExploration({ tool, command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe(operation);
  }
  // A `case` or `esac` that is an argument, not a command, opens or closes no case.
  for (const command of [
    "echo $(ls test/case) $(grep -r foo src)",
    "echo $(echo $case); (grep -r foo src)",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
  }
  for (const command of [
    'echo "(grep -r foo src)"',
    "echo '(grep -r foo src)'",
    "echo $(case x in x) echo hi;; esac)",
    "{ echo hi; }",
    "arr=(a b c)",
    "tools=(rg grep)",
    "pnpm build # (grep found nothing)",
    "echo $(date; hostname) rg",
    "[[ $c =~ ^(grep|rg) ]]",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `for (const body of expanded) bodies.push(...expandedSubstitutions(body));` -> `` fails "denies a search an unquoted here-document body expands"
it("denies a search an unquoted here-document body expands", () => {
  for (const command of [
    "cat <<EOF\n$(grep -r foo src)\nEOF",
    "cat <<EOF\nfound: `rg auth packages`\nEOF",
    "cat <<-EOF\n\t$(grep -r foo src)\n\tEOF",
    "cat <<EOF\ndon't $(grep -r foo src)\nEOF",
    'git commit -m "$(cat <<EOF\nSee $(grep -r foo src)\nEOF\n)"',
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
  }
  for (const command of [
    "cat <<'EOF'\n$(grep -r foo src)\nEOF",
    'cat <<"EOF"\n$(grep -r foo src)\nEOF',
    "cat <<\\EOF\n$(grep -r foo src)\nEOF",
    "cat <<EOF\n\\$(grep -r foo src) and $((1 + 2))\nEOF",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("allow");
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `index = (end === -1 ? command.length : end) - 1;` -> `index += 0;` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `!quotedWord &&` -> `true &&` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `const WORD_BREAK = /[ \t\n;&|()]/;` -> `const WORD_BREAK = /[\s;&|()]/;` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `atWordStart &&` -> `true &&` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `return /`|\$\{|\$\[|\$'|\(\(|[?*+@!]\(/.test(command.slice(0, index));` -> `return false;` fails "ends a # comment at its line so a quote inside it hides no later search"
// Mutation: packages/qfai/src/core/graph/hooks.ts `return /`|\$\{|\$\[|\$'|\(\(|[?*+@!]\(/.test(command.slice(0, index));` -> `return /`|\$\{|\(\(/.test(command.slice(0, index));` fails "ends a # comment at its line so a quote inside it hides no later search"
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
  // In an ANSI-C `$'...'` string `\'` does not close it, so the `#` after it
  // is not a comment and the quote it leaves open still fails closed.
  const ansiC = "echo $'a\\' #'; rg auth packages/";
  expect(classifyGraphExploration({ tool: "Bash", command: ansiC }).decision).toBe("deny");
  // A `#` inside a word starts no comment: after other characters, inside
  // quotes, after an empty quote and a line continuation, after a character
  // the shell does not treat as a blank, after an escaped separator, or right
  // after a closed substitution.
  for (const command of [
    "echo a#b && rg auth packages/",
    "echo '#' && rg auth packages/",
    "echo ''\\\n#x; rg auth packages/",
    "echo a\r#x; rg auth packages/",
    "echo a #$(rg auth packages/)",
    "echo \\ #$(rg auth packages/)",
    "echo a\\;#$(rg auth packages/)",
    "echo a\\|#`rg auth packages/`",
    "echo $(true)#$(rg auth packages/)",
    "cat <(true)#$(rg auth packages/)",
    // A `${...}`, `((...))`, `$[...]` or backtick context before the `#`
    // keeps it text.
    "echo $[ 1 #$(rg auth packages/) ]",
    "echo ${x:- #$(rg auth packages/)}",
    "echo ${x:- #}; rg auth packages/",
    "(( 1 # )); rg auth packages/",
    "echo `echo #`; rg auth packages/",
  ]) {
    const result = classifyGraphExploration({ tool: "Bash", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
  // A search that exists only inside a comment is never run.
  for (const command of ["echo hi # rg auth packages/", "echo hi # $(rg auth packages/)"]) {
    expect(classifyGraphExploration({ tool: "Bash", command }).decision, command).toBe("allow");
  }
  // A PowerShell block comment ends at its `#>`, and a `#` inside a word
  // starts no comment, so neither hides a later substitution.
  for (const command of ["<# x #> $(rg auth packages/)", "echo @(1)#$(rg auth packages/)"]) {
    const result = classifyGraphExploration({ tool: "PowerShell", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
});

// QFAI:EX-0001-0235-27
// Mutation: packages/qfai/src/core/graph/hooks.ts `index = end + 1;` -> `index = command.length;` fails "reads PowerShell line and block comments so a command after either is classified"
// Mutation: packages/qfai/src/core/graph/hooks.ts `if (end === -1) return undefined;` -> `if (end === -1) break;` fails "reads PowerShell line and block comments so a command after either is classified"
// Mutation: packages/qfai/src/core/graph/hooks.ts `wordStarted = !POWERSHELL_BREAK.test(character);` -> `wordStarted = false;` fails "reads PowerShell line and block comments so a command after either is classified"
it("reads PowerShell line and block comments so a command after either is classified", () => {
  for (const command of [
    // The report: a block comment before a search, and a quote in a line
    // comment before a search on the next line.
    "<# x #> rg auth packages/",
    "Write-Output x # '\nrg auth packages/",
    "<# it's a note #> rg auth packages/",
    "<# a\n' b #>\nrg auth packages/",
    "# it's a note\nrg auth packages/",
    "Write-Output x; # '\nrg auth packages/",
    "Write-Output x | <# ' #> rg auth packages/",
    // Where the start of a token is not certain, the comment markers separate
    // commands, so what lies between and after them is still read.
    "Write-Output a<# x #>rg auth packages/",
    "$(<# x #> rg auth packages/)",
    "Write-Output @(1) <# x #> rg auth packages/",
    "Write-Output @(1)<#; rg auth packages/; #>",
    // In a here-string a comment marker is data.
    '@"\n<#\n"@\nrg auth packages/ #>',
    '@"\n# \n"@\nrg auth packages/',
    // A `#` inside a word starts no comment.
    "Write-Output a#b; rg auth packages/",
    // After a `$(` that may hold its own quotes inside a string, or a curly
    // quote, where a string ends is not certain, so a `#` there stays text.
    'Write-Output "$(" # ")"; rg auth packages/',
    'Write-Output "$(" <# ")"; rg auth packages/; "$(" #> ")"',
    `Write-Output ${String.fromCharCode(0x2018)} # ${String.fromCharCode(0x2019)}; rg auth packages/`,
    `Write-Output ${String.fromCharCode(0x201c)} # ${String.fromCharCode(0x201d)}; rg auth packages/`,
    `Write-Output ${String.fromCharCode(0x2018)} <# ${String.fromCharCode(0x2019)}; rg auth packages/; ${String.fromCharCode(0x2018)} #> ${String.fromCharCode(0x2019)}`,
  ]) {
    const result = classifyGraphExploration({ tool: "PowerShell", command });
    expect(result.decision, command).toBe("deny");
    expect(result.operation, command).toBe("rg");
  }
  // A block comment with no `#>` leaves the script unparsable: fail closed.
  for (const command of ["<# x rg auth packages/", "Write-Output a<# rg auth packages/"]) {
    const result = classifyGraphExploration({ tool: "PowerShell", command });
    expect(result.decision, command).toBe("deny");
  }
  // A search that exists only inside a comment is never run.
  for (const command of [
    "Write-Output hi # rg auth packages/",
    "Write-Output hi # $(rg auth packages/)",
    "Write-Output hi <# rg auth packages/ #>",
    "Write-Output hi <# $(rg auth packages/) #>",
    "<#\n'\n#> Write-Output hi",
  ]) {
    const result = classifyGraphExploration({ tool: "PowerShell", command });
    expect(result.decision, command).toBe("allow");
  }
});

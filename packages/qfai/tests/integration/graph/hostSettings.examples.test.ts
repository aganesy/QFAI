import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { composeGraphDenialHooks } from "../../../src/core/graph/hostSettings.js";
import { parse } from "smol-toml";
import { prepareGraphIntegration } from "../../../src/core/graph/integration.js";
import { createDoctorData } from "../../../src/core/doctor.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";
import { removeTempTree } from "../../helpers/tempTree.js";

// QFAI:EX-0001-0237-06
// Mutation: packages/qfai/src/core/graph/integration.ts `const entries = await installGraphEntrypoints(root);` -> `const entries = { files: [], conflicts: [] };` fails "prepares a portable CLI without changing unrelated Codex and MCP settings"
it("prepares a portable CLI without changing unrelated Codex and MCP settings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-codex-mcp-"));
  const file = path.join(root, ".codex", "config.toml");
  const original =
    '# Adopter settings\nmodel = "adopter-model"\n[mcp_servers.other]\ncommand = "other"\n';
  try {
    await mkdir(path.dirname(file));
    await writeFile(file, original);
    const common = path.join(root, ".mcp.json");
    const commonText = '{ "mcpServers": { "other": { "command": "other" } } }\n';
    await writeFile(common, commonText);
    const fixture = graphProcessFixture();
    const result = await prepareGraphIntegration(root, fixture.run);
    expect(result.conflicts).toEqual([]);
    const text = await readFile(file, "utf8");
    expect(text).toBe(original);
    expect(await readFile(common, "utf8")).toBe(commonText);
    const parsed = parse(text);
    expect(parsed.mcp_servers).toMatchObject({
      other: { command: "other" },
    });
    const cli = await readFile(path.join(root, ".qfai", "tools", "graph-cli.mjs"), "utf8");
    expect(cli).toContain("runInstalledGraphCli");
    expect(cli).not.toContain("startGraphManager");
    expect((await prepareGraphIntegration(root, fixture.run)).files).toEqual([]);
    expect(await readFile(file, "utf8")).toBe(original);
    expect(await readFile(common, "utf8")).toBe(commonText);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-06
// Mutation: packages/qfai/src/core/graph/integration.ts `const entries = await installGraphEntrypoints(root);` -> `const entries = { files: [], conflicts: [] };` fails "prepares CLI and denial hooks without creating MCP registration"
it("prepares CLI and denial hooks without creating MCP registration", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-settings-"));
  const file = path.join(root, ".mcp.json");
  const existing = { mcpServers: { alpha: { command: "alpha" }, beta: { command: "beta" } } };
  const reminder =
    '{"hooks":{"PreToolUse":[{"matcher":"Read","hooks":[{"command":"existing-reminder"}]}]}}\n';
  try {
    await mkdir(path.join(root, ".claude"));
    await writeFile(path.join(root, ".claude", "settings.json"), reminder);
    const fixture = graphProcessFixture();
    const result = await prepareGraphIntegration(root, fixture.run);
    await expect(readFile(file, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(path.join(root, ".codex", "config.toml"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readFile(path.join(root, ".qfai", "tools", "graph-manager.mjs"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    const settings = JSON.parse(
      await readFile(path.join(root, ".claude", "settings.json"), "utf8"),
    ) as { hooks: { PreToolUse: unknown[] } };
    expect(settings.hooks.PreToolUse[0]).toEqual(JSON.parse(reminder).hooks.PreToolUse[0]);
    const cli = await readFile(path.join(root, ".qfai", "tools", "graph-cli.mjs"), "utf8");
    expect(cli).toContain("runInstalledGraphCli");
    expect(cli).not.toContain("serveStdio");
    expect(result.conflicts).toEqual([]);
    await writeFile(file, JSON.stringify(existing));
    const original = await readFile(file, "utf8");
    expect((await prepareGraphIntegration(root, fixture.run)).files).toEqual([]);
    expect(await readFile(file, "utf8")).toBe(original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-08
// Mutation: packages/qfai/src/core/graph/hostSettings.ts `let next = [...currentGroups, managed];` -> `let next = [managed];` fails "adds a separate denial hook after an unchanged notification reminder"
it("adds a separate denial hook after an unchanged notification reminder", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-reminder-"));
  const file = path.join(root, ".claude", "settings.json");
  const reminder = {
    matcher: "Bash",
    hooks: [{ type: "command", command: "node reminder.mjs", statusMessage: "existing reminder" }],
  };
  try {
    await mkdir(path.dirname(file));
    await writeFile(file, JSON.stringify({ hooks: { PreToolUse: [reminder] } }));
    await mkdir(path.join(root, ".codex"));
    const codexFile = path.join(root, ".codex", "hooks.json");
    await writeFile(codexFile, JSON.stringify({ hooks: { PreToolUse: [reminder] } }));
    await composeGraphDenialHooks(root);
    const settings = JSON.parse(await readFile(file, "utf8")) as {
      hooks: { PreToolUse: unknown[] };
    };
    expect(settings.hooks.PreToolUse).toHaveLength(2);
    expect(settings.hooks.PreToolUse[0]).toEqual(reminder);
    expect(JSON.stringify(settings.hooks.PreToolUse[1])).toContain("graph-hook.mjs");
    expect(JSON.stringify(settings.hooks.PreToolUse[1])).toContain("QFAI graph exploration");
    const codex = JSON.parse(await readFile(codexFile, "utf8"));
    expect(codex.hooks.PreToolUse).toHaveLength(2);
    expect(codex.hooks.PreToolUse[0]).toEqual(reminder);
    expect(JSON.stringify(codex.hooks.PreToolUse[1])).toContain("graph-hook.mjs codex");
    const sharedFile = path.join(root, ".github", "hooks", "qfai-graph.json");
    const shared = JSON.parse(await readFile(sharedFile, "utf8"));
    expect(shared).toMatchObject({ version: 1, hooks: { preToolUse: [{ type: "command" }] } });
    expect(shared.hooks.preToolUse[0].bash).toContain("graph-hook.mjs shared");
    expect(shared.hooks.preToolUse[0].powershell).toContain("graph-hook.mjs shared");
    await composeGraphDenialHooks(root);
    expect(JSON.parse(await readFile(codexFile, "utf8")).hooks.PreToolUse).toHaveLength(2);
    expect(await readFile(sharedFile, "utf8")).toBe(JSON.stringify(shared, null, 2) + "\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-07
// Mutation: packages/qfai/src/core/graph/entrypoints.ts `if (text !== source && text !== previous[name]) return conflict();` -> `if (false) return conflict();` fails "preserves malformed hooks and adopter-edited CLI entrypoints with manual recovery"
it("preserves malformed hooks and adopter-edited CLI entrypoints with manual recovery", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-settings-conflict-"));
  try {
    const fixture = graphProcessFixture();
    await prepareGraphIntegration(root, fixture.run);
    const common = path.join(root, ".mcp.json");
    await writeFile(common, "{ malformed unrelated MCP settings");
    const hook = path.join(root, ".claude", "settings.json");
    await writeFile(hook, "{ malformed hook");
    const malformed = await prepareGraphIntegration(root, fixture.run);
    expect(malformed.conflicts.join("\n")).toContain("Review .claude/settings.json");
    expect(malformed.conflicts.join("\n")).toContain("merge");
    expect(await readFile(hook, "utf8")).toBe("{ malformed hook");
    expect(await readFile(common, "utf8")).toBe("{ malformed unrelated MCP settings");
    const cli = path.join(root, ".qfai", "tools", "graph-cli.mjs");
    const edited = '// Adopter CLI entrypoint\nprocess.stdout.write("adopter");\n';
    await writeFile(cli, edited);
    const result = await prepareGraphIntegration(root, fixture.run);
    expect(await readFile(cli, "utf8")).toBe(edited);
    expect(result.conflicts.join("\n")).toContain("Review .qfai/tools");
    expect(result.conflicts.join("\n")).toContain("Retain edited");
    expect(await readFile(common, "utf8")).toBe("{ malformed unrelated MCP settings");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** One host's graph hook command, as the host runs it: exec form for Claude Code, a shell line otherwise. */
interface GraphHookCommand {
  host: string;
  command: string;
  args?: string[];
}

async function graphHookCommands(root: string): Promise<GraphHookCommand[]> {
  const read = async (...segments: string[]): Promise<unknown> =>
    JSON.parse(await readFile(path.join(root, ...segments), "utf8"));
  const last = (value: unknown, event: string): Record<string, unknown> => {
    const groups = record(record(value).hooks)[event];
    if (!Array.isArray(groups)) throw new Error(`No ${event} groups.`);
    const group = record(groups.at(-1));
    return Array.isArray(group.hooks) ? record(group.hooks[0]) : group;
  };
  const claude = last(await read(".claude", "settings.json"), "PreToolUse");
  const codex = last(await read(".codex", "hooks.json"), "PreToolUse");
  const shared = last(await read(".github", "hooks", "qfai-graph.json"), "preToolUse");
  expect(shared.powershell).toBe(shared.bash);
  const args = claude.args;
  if (!Array.isArray(args) || typeof claude.command !== "string")
    throw new Error("No Claude entry.");
  if (typeof codex.command !== "string" || typeof shared.bash !== "string")
    throw new Error("No shell entry.");
  return [
    {
      host: "claude",
      command: claude.command,
      args: args.map((arg: unknown) => String(arg).replace("${CLAUDE_PROJECT_DIR}", root)),
    },
    { host: "codex", command: codex.command },
    { host: "shared", command: shared.bash },
  ];
}

function runGraphHook(hook: GraphHookCommand, root: string, input: string) {
  const options = { cwd: root, input, encoding: "utf8" as const, timeout: 30000 };
  return hook.args === undefined
    ? spawnSync(hook.command, { ...options, shell: true })
    : spawnSync(hook.command, hook.args, options);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected an object.");
  return Object.fromEntries(Object.entries(value));
}

const MISSING_HOOK_LINE =
  "QFAI graph hook skipped: .qfai/tools/graph-hook.mjs is missing. Run npx qfai init in this checkout.";

// QFAI:EX-0001-0237-23
// Mutation: packages/qfai/src/core/graph/hookCommands.ts `if(s.existsSync(f))` -> `if(true)` fails "passes each host's graph hook with one reminder line where the script is missing"
it("passes each host's graph hook with one reminder line where the script is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-missing-"));
  try {
    expect((await composeGraphDenialHooks(root)).conflicts).toEqual([]);
    const hooks = await graphHookCommands(root);
    for (const hook of hooks) {
      const result = runGraphHook(hook, root, "{}");
      expect(result.error, hook.host).toBeUndefined();
      expect(result.status, hook.host).toBe(0);
      expect(result.stdout, hook.host).toBe("");
      expect(result.stderr.trim().split(/\r?\n/), hook.host).toEqual([MISSING_HOOK_LINE]);
    }
    // Where the script exists, the guard runs it in the same process with its argument, stdin and
    // exit code, so a denial still reaches the host.
    await mkdir(path.join(root, ".qfai", "tools"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "tools", "graph-hook.mjs"),
      'import { readFileSync } from "node:fs";\n' +
        'process.stdout.write(JSON.stringify([process.argv.slice(2), readFileSync(0, "utf8")]));\n' +
        "process.exitCode = 2;\n",
    );
    for (const hook of hooks) {
      const result = runGraphHook(hook, root, '{"tool_name":"Grep"}');
      expect(result.status, hook.host).toBe(2);
      expect(result.stderr, hook.host).toBe("");
      expect(JSON.parse(result.stdout), hook.host).toEqual([[hook.host], '{"tool_name":"Grep"}']);
    }
  } finally {
    await removeTempTree(root);
  }
});

// QFAI:EX-0001-0237-23
// Mutation: packages/qfai/src/core/graph/hookCommands.ts `else{try{s.readFileSync(0)}catch{}` -> `else{` fails "reads a large tool input before it passes where the script is missing"
it("reads a large tool input before it passes where the script is missing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-stdin-"));
  try {
    await composeGraphDenialHooks(root);
    const input = JSON.stringify({ tool_input: { command: "x".repeat(400 * 1024) } });
    for (const hook of await graphHookCommands(root)) {
      const result = runGraphHook(hook, root, input);
      expect(result.error, hook.host).toBeUndefined();
      expect(result.status, hook.host).toBe(0);
      expect(result.stderr.trim().split(/\r?\n/), hook.host).toEqual([MISSING_HOOK_LINE]);
    }
  } finally {
    await removeTempTree(root);
  }
});

// QFAI:EX-0001-0237-23
// Mutation: packages/qfai/src/core/graph/hookCommands.ts `else{try{s.readFileSync(0)}catch{}` -> `else{try{s.readFileSync(0)}catch{}process.stdout.write('$')` fails "keeps each graph hook shell line free of characters a hook shell expands"
it("keeps each graph hook shell line free of characters a hook shell expands", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-shell-"));
  try {
    await composeGraphDenialHooks(root);
    for (const hook of await graphHookCommands(root)) {
      const guard =
        hook.args === undefined ? /^node -e "(.*)" \S+ \S+$/.exec(hook.command)?.[1] : hook.args[1];
      expect(guard, hook.host).toBeDefined();
      expect(guard, hook.host).not.toMatch(/["$`%!\\]/);
    }
  } finally {
    await removeTempTree(root);
  }
});

// QFAI:EX-0001-0237-23
// Mutation: packages/qfai/src/core/graph/hookCommands.ts `else{try{s.readFileSync(0)}catch{}` -> `else{process.exitCode=1;` fails "passes the shared graph hook under Windows PowerShell where the script is missing"
it.runIf(process.platform === "win32")(
  "passes the shared graph hook under Windows PowerShell where the script is missing",
  async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-powershell-"));
    try {
      await composeGraphDenialHooks(root);
      const shared: unknown = JSON.parse(
        await readFile(path.join(root, ".github", "hooks", "qfai-graph.json"), "utf8"),
      );
      const entries = record(record(shared).hooks).preToolUse;
      if (!Array.isArray(entries)) throw new Error("No preToolUse entries.");
      const line = record(entries[0]).powershell;
      if (typeof line !== "string") throw new Error("No PowerShell line.");
      const result = spawnSync("powershell", ["-NoProfile", "-Command", line], {
        cwd: root,
        input: "{}",
        encoding: "utf8",
        timeout: 60000,
      });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr.trim().split(/\r?\n/)).toEqual([MISSING_HOOK_LINE]);
    } finally {
      await removeTempTree(root);
    }
  },
);

// QFAI:EX-0001-0237-24
// Mutation: packages/qfai/src/core/graph/hostSettings.ts `if (existing.length === 1 && isEarlierGraphHookGroup(existing[0]))` -> `if (false)` fails "replaces the graph hook entries an earlier release wrote with the guarded ones"
it("replaces the graph hook entries an earlier release wrote with the guarded ones", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-upgrade-"));
  const reminder = {
    matcher: "Bash",
    hooks: [{ type: "command", command: "node reminder.mjs", statusMessage: "existing reminder" }],
  };
  // The exact entries 2.2.0 wrote, which ran the git-ignored script directly.
  const earlier = {
    claude: {
      matcher: "Bash|PowerShell|Grep",
      hooks: [
        {
          type: "command",
          statusMessage: "QFAI graph exploration",
          command: "node",
          args: ["${CLAUDE_PROJECT_DIR}/.qfai/tools/graph-hook.mjs", "claude"],
        },
      ],
    },
    codex: {
      matcher: "^(Bash|PowerShell|exec_command|Grep|grep|rg|grep_search|search_files|file_search)$",
      hooks: [
        {
          type: "command",
          statusMessage: "QFAI graph exploration",
          command: "node .qfai/tools/graph-hook.mjs codex",
        },
      ],
    },
    shared: {
      type: "command",
      bash: "node .qfai/tools/graph-hook.mjs shared",
      powershell: "node .qfai/tools/graph-hook.mjs shared",
      timeoutSec: 10,
    },
  };
  const files = {
    claude: path.join(root, ".claude", "settings.json"),
    codex: path.join(root, ".codex", "hooks.json"),
    shared: path.join(root, ".github", "hooks", "qfai-graph.json"),
  };
  try {
    for (const file of Object.values(files)) await mkdir(path.dirname(file), { recursive: true });
    const write = (file: string, value: unknown): Promise<void> =>
      writeFile(file, JSON.stringify(value, null, 2) + "\n");
    await write(files.claude, { hooks: { PreToolUse: [reminder, earlier.claude] } });
    await write(files.codex, { hooks: { PreToolUse: [reminder, earlier.codex] } });
    await write(files.shared, { version: 1, hooks: { preToolUse: [earlier.shared] } });
    const result = await composeGraphDenialHooks(root);
    expect(result.conflicts).toEqual([]);
    expect([...result.files].sort()).toEqual([
      ".claude/settings.json",
      ".codex/hooks.json",
      ".github/hooks/qfai-graph.json",
    ]);
    for (const file of [files.claude, files.codex]) {
      const groups: unknown = record(JSON.parse(await readFile(file, "utf8")).hooks).PreToolUse;
      if (!Array.isArray(groups)) throw new Error("No PreToolUse groups.");
      expect(groups).toHaveLength(2);
      expect(groups[0]).toEqual(reminder);
      expect(JSON.stringify(groups[1])).toContain("QFAI graph exploration");
      expect(JSON.stringify(groups[1])).toContain("existsSync");
    }
    const shared: unknown = record(
      JSON.parse(await readFile(files.shared, "utf8")).hooks,
    ).preToolUse;
    if (!Array.isArray(shared)) throw new Error("No preToolUse entries.");
    expect(shared).toHaveLength(1);
    expect(JSON.stringify(shared[0])).toContain("existsSync");
    for (const hook of await graphHookCommands(root))
      expect(runGraphHook(hook, root, "{}").status, hook.host).toBe(0);
    expect(await composeGraphDenialHooks(root)).toEqual({ files: [], conflicts: [] });
  } finally {
    await removeTempTree(root);
  }
});

// QFAI:EX-0001-0237-25
// Mutation: packages/qfai/src/core/graph/presentation.ts `GRAPH_TOOLS_LOCAL_NOTE,` -> `` fails "says in the init summary that the graph tools are local to each checkout"
it("says in the init summary that the graph tools are local to each checkout", () => {
  const output = renderGraphPreparation({
    runtime: "installed",
    code: "code-not-ready",
    documents: "documents-not-ready",
  });
  expect(output.split("\n")).toContain(
    ".qfai/tools/ is local to this checkout: run npx qfai init in each other clone or worktree.",
  );
});

// QFAI:EX-0001-0237-26
// Mutation: packages/qfai/src/core/doctor/graphHook.ts `if (script === true)` -> `if (true)` fails "warns in doctor when committed graph hook entries point at a missing script"
it("warns in doctor when committed graph hook entries point at a missing script", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-doctor-"));
  const check = async () =>
    (await createDoctorData({ startDir: root, rootExplicit: true })).checks.find(
      (entry) => entry.id === "graph.hookScript",
    );
  try {
    expect(await check()).toBeUndefined();
    await composeGraphDenialHooks(root);
    const missing = await check();
    expect(missing?.severity).toBe("warning");
    expect(missing?.message).toContain(".claude/settings.json");
    expect(missing?.message).toContain(".codex/hooks.json");
    expect(missing?.message).toContain(".github/hooks/qfai-graph.json");
    expect(missing?.message).toContain(".qfai/tools/graph-hook.mjs");
    expect(missing?.message).toContain("npx qfai init");
    await mkdir(path.join(root, ".qfai", "tools"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "tools", "graph-hook.mjs"), "\n");
    expect((await check())?.severity).toBe("ok");
  } finally {
    await removeTempTree(root);
  }
});

// QFAI:EX-0001-0237-26
// Mutation: packages/qfai/src/core/doctor/graphHook.ts `if (isEnoent(cause)) return false;` -> `return false;` fails "names the error in doctor when the graph hook script cannot be checked"
// Windows reports a path through a regular file as missing, so the case needs a POSIX `ENOTDIR`.
it.runIf(process.platform !== "win32")(
  "names the error in doctor when the graph hook script cannot be checked",
  async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-hook-doctor-stat-"));
    try {
      await composeGraphDenialHooks(root);
      await mkdir(path.join(root, ".qfai"));
      await writeFile(path.join(root, ".qfai", "tools"), "not a directory\n");
      const check = (await createDoctorData({ startDir: root, rootExplicit: true })).checks.find(
        (entry) => entry.id === "graph.hookScript",
      );
      expect(check?.severity).toBe("warning");
      expect(check?.message).toContain(".qfai/tools/graph-hook.mjs could not be checked");
      expect(check?.message).toContain("ENOTDIR");
    } finally {
      await removeTempTree(root);
    }
  },
);

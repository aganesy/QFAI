import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { composeGraphDenialHooks } from "../../../src/core/graph/hostSettings.js";
import { parse } from "smol-toml";
import { prepareGraphIntegration } from "../../../src/core/graph/integration.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";

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
// Mutation: packages/qfai/src/core/graph/hostSettings.ts `PreToolUse: [...currentGroups, managed]` -> `PreToolUse: [managed]` fails "adds a separate denial hook after an unchanged notification reminder"
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

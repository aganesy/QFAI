import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { parse } from "smol-toml";
import { prepareGraphIntegration } from "../../../src/core/graph/integration.js";
import { renderGraphPreparation } from "../../../src/core/graph/presentation.js";
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
// Mutation: packages/qfai/src/core/graph/integration.ts `const entries = await installGraphEntrypoints(root);` -> `const entries = { files: [], conflicts: [] };` fails "prepares the CLI without creating MCP registration or changing host settings"
it("prepares the CLI without creating MCP registration or changing host settings", async () => {
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
    expect(await readFile(path.join(root, ".claude", "settings.json"), "utf8")).toBe(reminder);
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

// QFAI:EX-0001-0237-07
// Mutation: packages/qfai/src/core/graph/entrypoints.ts `if (text !== source && text !== previous[name]) return conflict();` -> `if (false) return conflict();` fails "preserves malformed MCP settings and adopter-edited CLI entrypoints with manual recovery"
it("preserves malformed MCP settings and adopter-edited CLI entrypoints with manual recovery", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-settings-conflict-"));
  try {
    const fixture = graphProcessFixture();
    await prepareGraphIntegration(root, fixture.run);
    const common = path.join(root, ".mcp.json");
    await writeFile(common, "{ malformed unrelated MCP settings");
    const malformed = await prepareGraphIntegration(root, fixture.run);
    expect(malformed.conflicts).toEqual([]);
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

// QFAI:EX-0001-0237-25
// Mutation: packages/qfai/src/core/graph/presentation.ts `GRAPH_TOOLS_LOCAL_NOTE,` -> `` fails "says in the init summary that the graph tools are local to each checkout"
it("says in the init summary that the graph tools are local to each checkout", () => {
  const output = renderGraphPreparation({
    runtime: "installed",
    code: "code-not-ready",
    documents: "documents-not-ready",
  });
  expect(output.split("\n")).toContain(
    ".qfai/tools/ is local to this checkout: run qfai init in each other clone or worktree.",
  );
});

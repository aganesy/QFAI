import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { graphRuntimePaths, prepareGraphRuntimes } from "../../../src/core/graph/prepare.js";
import { runInit } from "../../../src/cli/commands/init.js";
import { captureStdout } from "../../helpers/stdout.js";
import { graphProcessFixture } from "../../helpers/graphProcess.js";
import { prepareGraphIntegration } from "../../../src/index.js";
import { getInitAssetsDir } from "../../../src/cli/lib/assets.js";

// QFAI:EX-0001-0237-01
// Mutation: packages/qfai/src/core/graph/prepare.ts `return { runtime: "installed", code: "code-not-ready", documents: "documents-not-ready" };` -> `return { runtime: "not-ready", code: "code-not-ready", documents: "documents-not-ready" };` fails "prepares both project-local runtimes"
it("prepares both project-local runtimes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-prepare-"));
  try {
    const fixture = graphProcessFixture();
    const result = await prepareGraphRuntimes(root, fixture.run);
    expect(result.runtime).toBe("installed");
    expect(result.documents).toBe("documents-not-ready");
    expect(fixture.calls.some((call) => call.args.includes("@colbymchenry/codegraph@1.6.2"))).toBe(
      true,
    );
    expect(fixture.calls.some((call) => call.args.includes("graphifyy[ollama]==0.9.86"))).toBe(
      true,
    );
    expect(fixture.calls.some((call) => call.args.some((arg) => arg.includes("[mcp")))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-19
// Mutation: packages/qfai/src/core/graph/integration.ts `const entries = await installGraphEntrypoints(root);` -> `const entries = { files: [], conflicts: [] };` fails "prepares through the package API without overwriting a package-owned assistant tree"
it("prepares through the package API without overwriting a package-owned assistant tree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-dogfood-"));
  const assets = getInitAssetsDir();
  const sourceAssistant = path.join(assets, ".qfai", "assistant");
  const sourceConstitution = path.join(sourceAssistant, "rule", "constitution.md");
  try {
    const before = await readFile(sourceConstitution);
    await mkdir(path.join(root, ".qfai"));
    await symlink(
      sourceAssistant,
      path.join(root, ".qfai", "assistant"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const fixture = graphProcessFixture();
    const result = await prepareGraphIntegration(root, fixture.run);
    expect(result.runtime).toBe("installed");
    for (const file of ["graph-cli.mjs", "graph-hook.mjs", "graph-enforcement.json"])
      await expect(access(path.join(root, ".qfai", "tools", file))).resolves.toBeUndefined();
    await expect(access(path.join(root, ".mcp.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      access(path.join(root, ".qfai", "tools", "graph-manager.mjs")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(path.join(root, ".gitignore"), "utf8")).toContain("/.qfai/tools/");
    expect(
      await readFile(path.join(root, ".qfai", "tools", "graph-enforcement.json"), "utf8"),
    ).toContain('"denyExploration":true');
    expect(await readFile(sourceConstitution)).toEqual(before);
    await expect(
      readFile(path.join(assets, "root", ".agents", "rules", "graph-exploration.md"), "utf8"),
    ).resolves.toContain("CodeGraph");
    await expect(access(graphRuntimePaths(root).codegraph)).resolves.toBeUndefined();
    fixture.calls.length = 0;
    expect((await prepareGraphIntegration(root, fixture.run)).runtime).toBe("installed");
    expect(fixture.calls.some((call) => call.args.includes("install"))).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-13
// Mutation: packages/qfai/src/cli/commands/init.ts `copyTemplatePaths(source, destination, [...STORY_SEED_PATHS], {` -> `((...args: Parameters<typeof copyTemplatePaths>) => copyTemplatePaths(args[0], args[1], args[2], { ...args[3], force: true }))(source, destination, [...STORY_SEED_PATHS], {` fails "retains processing choices and story content during forced initialization"
it("retains processing choices and story content during forced initialization", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-force-"));
  const choices = path.join(root, ".qfai", "graph-processing.json");
  const story = path.join(root, ".qfai", "spec", "01_policy", "glossary.md");
  const selected = '{"backend":"ollama","model":"adopter-selected-model"}\n';
  const storyText = "# Adopter story\n\nKeep the project requirement.\n";
  try {
    await mkdir(path.dirname(story), { recursive: true });
    await writeFile(choices, selected);
    await writeFile(story, storyText);
    const fixture = graphProcessFixture();
    await captureStdout(() =>
      runInit({ dir: root, force: true, dryRun: false, yes: false }, {}, fixture.run),
    );
    expect(await readFile(choices, "utf8")).toBe(selected);
    expect(await readFile(story, "utf8")).toBe(storyText);
    expect(
      fixture.calls.some((call) => call.args.includes("extract") || call.args.includes("serve")),
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-12
// Mutation: packages/qfai/src/core/graph/prepare.ts `result.stdout.trim() === version` -> `result.stdout.trim() !== version` fails "reuses compatible local runtimes when installation is offline"
it("reuses compatible local runtimes when installation is offline", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-offline-"));
  try {
    const fixture = graphProcessFixture();
    await prepareGraphRuntimes(root, fixture.run);
    const attempted: string[][] = [];
    const offline: typeof fixture.run = async (command, args, options) => {
      if (args.includes("install") || args[0] === "venv") {
        attempted.push([...args]);
        return { exitCode: 1, stdout: "" };
      }
      return fixture.run(command, args, options);
    };
    const result = await prepareGraphRuntimes(root, offline);
    expect(result.runtime).toBe("installed");
    expect(attempted).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-11
// Mutation: packages/qfai/src/core/graph/prepare.ts `if (codegraphReady) {` -> `if (false) {` fails "repairs only a missing runtime component and retains unrelated settings"
it("repairs only a missing runtime component and retains unrelated settings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-partial-"));
  try {
    const fixture = graphProcessFixture();
    await prepareGraphRuntimes(root, fixture.run);
    const paths = graphRuntimePaths(root);
    const codegraphBytes = await readFile(paths.codegraph);
    const settings = path.join(root, ".mcp.json");
    const original = '{"mcpServers":{"adopter":{"command":"keep-me"}}}\n';
    await writeFile(settings, original);
    await rm(paths.python);
    fixture.calls.length = 0;
    await expect(prepareGraphRuntimes(root, fixture.run)).resolves.toMatchObject({
      runtime: "installed",
    });
    await expect(access(paths.python)).resolves.toBeUndefined();
    expect(await readFile(paths.codegraph)).toEqual(codegraphBytes);
    expect(await readFile(settings, "utf8")).toBe(original);
    expect(fixture.calls.some((call) => call.args.includes("@colbymchenry/codegraph@1.6.2"))).toBe(
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-10
// Mutation: packages/qfai/src/core/graph/prepare.ts `result.stdout.trim() === version` -> `result.stdout.trim() !== version` fails "reuses complete compatible runtimes on repeated preparation"
it("reuses complete compatible runtimes on repeated preparation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-repeat-"));
  try {
    const fixture = graphProcessFixture();
    await prepareGraphRuntimes(root, fixture.run);
    fixture.calls.length = 0;
    const pending = prepareGraphRuntimes(root, fixture.run);
    await expect(pending).resolves.toMatchObject({ runtime: "installed" });
    expect(
      fixture.calls.some((call) => call.args.includes("install") || call.args[0] === "venv"),
    ).toBe(false);
    expect(
      fixture.calls.some(
        (call) =>
          call.args.includes("extract") ||
          call.args.includes("index") ||
          call.args.includes("serve"),
      ),
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-09
// Mutation: packages/qfai/src/core/graph/prepare.ts `"--ignore-scripts",` -> `"--global",` fails "keeps installation targets project-local and preserves the caller environment"
it("keeps installation targets project-local and preserves the caller environment", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-local-"));
  const prior = process.env.QFAI_TEST_INSTALL_KEY;
  try {
    process.env.QFAI_TEST_INSTALL_KEY = "fixture-install-ambient-credential";
    const environment = { ...process.env };
    const fixture = graphProcessFixture();
    await prepareGraphRuntimes(root, fixture.run);
    expect(fixture.calls.flatMap((call) => call.args)).not.toContain("--global");
    for (const call of fixture.calls.filter((value) => value.args.includes("--prefix"))) {
      expect(
        call.args[call.args.indexOf("--prefix") + 1]?.startsWith(
          path.join(root, ".qfai", "tools") + path.sep,
        ),
      ).toBe(true);
    }
    expect(process.env).toEqual(environment);
    for (const call of fixture.calls) {
      expect(call.env?.QFAI_TEST_INSTALL_KEY).toBeUndefined();
      if (call.args.includes("--version")) expect(call.env?.CODEGRAPH_NO_UPDATE_CHECK).toBe("1");
      if (call.args.includes("-c")) {
        expect(call.env?.GRAPHIFY_ALLOW_LOCAL_PROVIDERS).toBe("0");
        expect(call.args.slice(0, 3)).toEqual(["-I", "-X", "utf8"]);
      }
      if (call.args.includes("--prefix")) expect(call.args).toContain("--ignore-scripts");
    }
  } finally {
    if (prior === undefined) delete process.env.QFAI_TEST_INSTALL_KEY;
    else process.env.QFAI_TEST_INSTALL_KEY = prior;
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-03
// Mutation: packages/qfai/src/cli/commands/init.ts `info(renderGraphPreparation(preparation, preparation.hosts));` -> `info(renderGraphPreparation(preparation, []));` fails "prepares graph tools when an older adopter reruns init"
it("prepares graph tools when an older adopter reruns init", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-upgrade-"));
  try {
    await mkdir(path.join(root, ".qfai"));
    await writeFile(path.join(root, ".qfai", "project-notes.md"), "Keep project notes.\n");
    const output = await captureStdout(() =>
      runInit(
        { dir: root, force: false, dryRun: false, yes: false },
        {},
        graphProcessFixture().run,
      ),
    );
    expect(output).toContain("Graph tools");
    for (const host of ["claude", "codex", "copilot", "vscode"])
      expect(output).toContain(`${host} (`);
    expect(output).toContain("unsupported");
    expect(output).not.toContain("runtime-verified");
    await expect(access(graphRuntimePaths(root).codegraph)).resolves.toBeUndefined();
    await expect(access(graphRuntimePaths(root).python)).resolves.toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0237-02
// Mutation: packages/qfai/src/core/graph/prepare.ts `return { runtime: "installed", code: "code-not-ready", documents: "documents-not-ready" };` -> `return { runtime: "not-ready", code: "code-not-ready", documents: "documents-not-ready" };` fails "prepares pinned tools in a project path containing spaces"
it("prepares pinned tools in a project path containing spaces", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai graph prepare "));
  try {
    const result = await prepareGraphRuntimes(root, graphProcessFixture().run);
    expect(result.runtime).toBe("installed");
    await expect(access(graphRuntimePaths(root).codegraph)).resolves.toBeUndefined();
    await expect(access(graphRuntimePaths(root).python)).resolves.toBeUndefined();
    expect(result.documents).toBe("documents-not-ready");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

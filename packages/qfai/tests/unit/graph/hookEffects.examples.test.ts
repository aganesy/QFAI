import { expect, it, vi } from "vitest";
import { enforceGraphExploration } from "../../../src/core/graph/hooks.js";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { graphEnvironmentKey } from "../../../src/core/graph/layout.js";
import { installedGraphHookResult } from "../../helpers/graphCli.js";

const effects = vi.hoisted(() => ({
  process: vi.fn(),
  network: vi.fn(),
  analysis: vi.fn(),
  documents: vi.fn(),
}));
vi.mock("node:child_process", () => ({
  spawnSync: effects.process,
  spawn: effects.process,
  execFile: effects.process,
  execFileSync: effects.process,
  fork: effects.process,
}));
vi.mock("node:net", () => ({ connect: effects.network, createConnection: effects.network }));
vi.mock("node:http", () => ({ request: effects.network, get: effects.network }));
vi.mock("node:https", () => ({ request: effects.network, get: effects.network }));
vi.mock("../../../src/core/graph/analysis.js", () => ({
  inspectCurrentCodeAnalysis: effects.analysis,
  mirrorGraphCorpus: effects.analysis,
}));
vi.mock("../../../src/core/graph/documents.js", () => ({
  prepareGraphifyCodeAnalysis: effects.documents,
  prepareDocumentAnalysis: effects.documents,
}));
vi.mock("../../../src/core/graph/runner.js", () => ({ queryPreparedGraph: effects.analysis }));

// QFAI:EX-0001-0235-23
// Mutation: packages/qfai/src/core/graph/hooks.ts `export function enforceGraphExploration(input: unknown, configuration: unknown): GraphHookDecision {` -> `import { execFileSync } from "node:child_process"; export function enforceGraphExploration(input: unknown, configuration: unknown): GraphHookDecision { execFileSync(process.execPath, ["--version"]);` fails "denies ordinary exploration without network model or analysis effects"
it("denies ordinary exploration without network model or analysis effects", async () => {
  const result = enforceGraphExploration(
    { tool_name: "Bash", tool_input: { command: "grep -R policy .qfai/spec" } },
    { kind: "graph-enforcement", denyExploration: true },
  );
  expect(result.decision).toBe("deny");
  expect(result.domain).toBe("documents");
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ordinary-graph-hook-"));
  try {
    const tools = path.join(root, ".qfai", "tools");
    await mkdir(tools, { recursive: true });
    await writeFile(
      path.join(tools, "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const denial = await installedGraphHookResult(root, {
      tool_name: "Bash",
      tool_input: { command: "grep -R policy .qfai/spec" },
      cwd: root,
      session_id: "ordinary-hook-session",
    });
    expect(denial.failures).toBe(0);
    expect(denial.errors).toEqual([]);
    expect(denial.output).toContain('"permissionDecision":"deny"');
    expect(denial.output).toContain("Observed attempt:");
    expect((await readdir(tools)).sort()).toEqual(["graph-enforcement.json", "state"]);
    const directory = path.join(tools, "state", graphEnvironmentKey());
    const entries = await readdir(directory);
    expect(entries).toHaveLength(1);
    const pending = entries[0];
    if (!pending) throw new Error("Expected one pending search record.");
    const text = await readFile(path.join(directory, pending), "utf8");
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(32768);
    expect(JSON.parse(text)).toMatchObject({
      kind: "pending",
      domain: "documents",
      target: ".qfai/spec",
      operation: "grep",
      worktree: root,
      session: "ordinary-hook-session",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  for (const effect of Object.values(effects)) expect(effect).not.toHaveBeenCalled();
});

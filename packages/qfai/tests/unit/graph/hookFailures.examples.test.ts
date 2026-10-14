import { expect, it } from "vitest";
import { enforceGraphExploration } from "../../../src/core/graph/hooks.js";
import { runInstalledGraphHook } from "../../../src/cli/graphHook.js";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const configured = { kind: "graph-enforcement", denyExploration: true };

// QFAI:EX-0001-0235-22
// Mutation: packages/qfai/src/core/graph/hooks.ts `configuration.denyExploration !== true` -> `configuration.denyExploration === true` fails "denies invalid classifier input and enforcement configuration with repair guidance"
it("denies invalid classifier input and enforcement configuration with repair guidance", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-hook-configuration-"));
  try {
    await mkdir(path.join(root, ".qfai", "tools"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":false}',
    );
    let output = "";
    await runInstalledGraphHook(root, ["claude"], {
      read: () => ({ tool_name: "Bash", tool_input: { command: "pnpm test" } }),
      output: (text) => {
        output += text;
      },
      error: () => {},
      fail: () => {},
    });
    expect(output).toContain('"permissionDecision":"deny"');
    expect(output).toContain("Repair");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  for (const configuration of [
    null,
    {},
    { kind: "unknown", denyExploration: true },
    { kind: "graph-enforcement", denyExploration: false },
    { ...configured, approved: true },
  ]) {
    const result = enforceGraphExploration(
      { tool_name: "Bash", tool_input: { command: "pnpm test" } },
      configuration,
    );
    expect(result.decision).toBe("deny");
    expect(result.state).toBe("failed");
    expect(result.message).toContain("Repair");
  }
  for (const input of [
    null,
    {},
    { tool_name: "Bash", tool_input: {} },
    { toolName: "bash", toolArgs: {} },
    { toolName: "PowerShell", toolArgs: "invalid-json" },
    { tool_name: "", tool_input: { command: "rg auth packages/" } },
  ]) {
    const result = enforceGraphExploration(input, configured);
    expect(result.decision).toBe("deny");
    expect(result.state).toBe("failed");
    expect(result.message).toContain("Repair");
  }
  expect(
    enforceGraphExploration(
      { tool_name: "Bash", tool_input: { command: "cat packages/source.ts" } },
      configured,
    ).decision,
  ).toBe("allow");
});

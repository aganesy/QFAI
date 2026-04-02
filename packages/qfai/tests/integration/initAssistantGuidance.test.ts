/**
 * Integration tests for init assistant guidance — canonical model alignment.
 *
 * Verifies that distributed init assets do not teach the old DDP worldview
 * or promote HTML mock as a required artifact.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const agentsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "agents",
);
const instructionsDir = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "instructions",
);

describe("init assistant guidance: canonical model alignment", () => {
  it("frontend-engineer.md does not contain DDP as active artifact", async () => {
    const content = await readFile(path.join(agentsDir, "frontend-engineer.md"), "utf-8");
    expect(content).not.toMatch(/\bDDP\b/);
  });

  it("frontend-engineer.md references selected direction and strategy", async () => {
    const content = await readFile(path.join(agentsDir, "frontend-engineer.md"), "utf-8");
    expect(content).toMatch(/selected direction/i);
    expect(content).toMatch(/strategy/i);
    expect(content).toMatch(/screen contracts/i);
  });

  it("frontend-engineer.md treats HTML mock as optional fallback", async () => {
    const content = await readFile(path.join(agentsDir, "frontend-engineer.md"), "utf-8");
    expect(content).toMatch(/optional.*fallback.*HTML/i);
  });

  it("product-experience-architect.md does not contain DDP artifacts", async () => {
    const content = await readFile(
      path.join(agentsDir, "product-experience-architect.md"),
      "utf-8",
    );
    expect(content).not.toMatch(/\bDDP artifacts\b/i);
  });

  it("product-experience-architect.md references sidecar-first inputs", async () => {
    const content = await readFile(
      path.join(agentsDir, "product-experience-architect.md"),
      "utf-8",
    );
    expect(content).toMatch(/selected direction/i);
    expect(content).toMatch(/strategy/i);
    expect(content).toMatch(/screen contracts/i);
    expect(content).toMatch(/evaluation sidecars/i);
  });

  it("agent-selection.md does not contain DDP 整理", async () => {
    const content = await readFile(path.join(instructionsDir, "agent-selection.md"), "utf-8");
    expect(content).not.toMatch(/DDP 整理/);
  });

  it("agent-selection.md references sidecar artifacts", async () => {
    const content = await readFile(path.join(instructionsDir, "agent-selection.md"), "utf-8");
    expect(content).toMatch(/sidecar artifacts/i);
  });
});

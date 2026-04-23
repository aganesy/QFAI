/**
 * E2E: Prototyping skill asset alignment
 *
 * Verifies the shipped package skill reflects the exploration-first harness contract.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = process.cwd();

describe("E2E: prototyping SKILL.md defines mode-aware contract", () => {
  const skillPath = path.join(
    packageRoot,
    "assets",
    "init",
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "SKILL.md",
  );

  let content: string | undefined;
  async function load(): Promise<string> {
    content ??= await readFile(skillPath, "utf-8");
    return content;
  }

  it("contains the exploration-first harness and surface/mode routing contract", async () => {
    const c = await load();
    expect(c).toMatch(/Exploration-First Harness/i);
    expect(c).toMatch(/## Surface \/ Mode/i);
    expect(c).toContain("`standard` is the default");
    expect(c).toContain("`full-harness` is reserved for explicit escalation");
    expect(c).toContain("5->3->2->1");
  });

  it("documents cli and non-ui rejection", async () => {
    const c = await load();
    expect(c).toContain("cli");
    expect(c).toContain("not prototyping execution targets");
    expect(c).toContain("ui_bearing: false");
  });

  it("contains required process section", async () => {
    const c = await load();
    expect(c).toMatch(/## Required process/i);
    expect(c).toContain("qfai validate --fail-on error");
    expect(c).toMatch(/Launch (L1 and L2 Evaluators|Evaluation Reviewers)/);
    expect(c).toContain("Breakthrough Detection");
    expect(c).toContain("selected-direction.yaml");
    expect(c).toContain("design-system.yaml");
  });
});

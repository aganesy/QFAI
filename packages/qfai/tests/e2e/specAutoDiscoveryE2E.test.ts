/**
 * E2E: Prototyping skill asset alignment
 *
 * Verifies the shipped package skill reflects the full-harness-only contract.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = process.cwd();

describe("E2E: prototyping SKILL.md defines full-harness-only contract", () => {
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

  it("contains the full-harness section and obligation matrix", async () => {
    const c = await load();
    expect(c).toMatch(/## Full-harness/);
    expect(c).toMatch(/## Obligation matrix/i);
    expect(c).toContain("web / full-harness");
    expect(c).not.toContain("web / low-cost");
    expect(c).not.toContain("web / standard");
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
    expect(c).toContain("qfai prototyping run --mode full-harness --reviewer <id>");
  });
});

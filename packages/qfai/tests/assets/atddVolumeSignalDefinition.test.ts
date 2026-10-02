import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ASSISTANT = path.join(packageRoot, "assets", "init", ".qfai", "assistant");

const read = (rel: string): Promise<string> => readFile(path.join(ASSISTANT, rel), "utf-8");

/** Collapses every whitespace run to one space, so a reflow is not a regression. */
const flat = (s: string): string => s.replace(/\s+/g, " ");

const SIGNALS = "skill/qfai-atdd/references/volume-signals.md";

describe("the ATDD estimator table's Signal column has a definition", () => {
  it("each share carries a formula, a zero case and a non-gating status", async () => {
    const signals = flat(await read(SIGNALS));
    expect(signals).toContain("| Layer | Raw count | Signal | Notes |");
    expect(signals).toContain("`ATDD total = E2E + API + Integration`");
    expect(signals).toContain("`round(100 × layer count / ATDD total)` with halves rounded up");
    expect(signals).toContain("If total is zero, write `-` for shares");
    expect(signals).toContain("Signals are planning observations, not quality gates.");
  });
});

describe("the layer rule sizes a new test suite without removing coverage", () => {
  it("sizing, process-per-case and scratch each carry a clause", async () => {
    const rule = await read("rule/test-layers.md");
    const section = flat(rule.split("## Test-suite sizing")[1]?.split(/^## /m)[0] ?? "");
    expect(section).toContain(
      "Every source change still carries test coverage, and every obligation still has its test. " +
        "This section sizes that coverage. It never removes any.",
    );
    expect(section).toContain("**Size a new test file like the ones next to it.**");
    expect(section).toContain("roughly one focused test per stated behaviour");
    expect(section).toContain("**Choose a process-per-case suite, never inherit one.**");
    expect(section).toContain("**A scratch check is not a deliverable.**");
    expect(section).toContain("Do not turn a scratch check into a permanent test file.");
    expect(section).toContain(SIGNALS);
    expect(section).toContain(
      "Like the volume signals in `.qfai/assistant/skill/qfai-atdd/references/volume-signals.md`, " +
        "these are review signals. No validator reads them.",
    );
    const headings = rule.match(/^## .+$/gm) ?? [];
    expect(headings[headings.indexOf("## Test-suite sizing") - 1]).toBe(
      "## Selecting a test layer",
    );
  });

  it("every reviewer check links the sizing section and § 4 of the rule", async () => {
    for (const rel of [
      "agent/implementation-reviewer.md",
      "agent/qa-gatekeeper.md",
      "skill/qfai-implement/SKILL.md",
      "skill/qfai-atdd/SKILL.md",
    ]) {
      const body = flat(await read(rel));
      expect(body, rel).toContain(
        "adds test files sized like their neighbours, commits no scratch checks, " +
          "follows § 4 on unrequested fixes, including its exception for a necessary fix " +
          "and reporting requirement, and states any assumption it built on",
      );
      expect(body, rel).toContain(
        "(`.qfai/assistant/rule/test-layers.md#test-suite-sizing`, `.agents/rules/minimal-implementation.md` § 4)",
      );
    }
  });
});

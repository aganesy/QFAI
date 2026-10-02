import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ASSISTANT = path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant");
const HEADING = "## A passing test is not the solution";
const CHECK = "hard-coded to the test's inputs";
const ANCHOR = "rule/test-layers.md#a-passing-test-is-not-the-solution";

/** Collapse markdown soft wraps so assertions pin wording, not line breaks. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const readAssistant = (...parts: string[]): Promise<string> =>
  readFile(path.join(ASSISTANT, ...parts), "utf-8");

/** Returns the body under `heading` up to the next `## ` heading. */
function section(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return "";
  }
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

describe("an example is not met by code written for its test", () => {
  it("test-layers.md states what the code under test may not do", async () => {
    const body = unwrap(section(await readAssistant("rule", "test-layers.md"), HEADING));
    expect(body).not.toBe("");

    expect(body).toContain("The test checks the solution; it does not define it.");
    expect(body).toContain("other valid inputs");
    expect(body).toContain("Do not hard-code a value to match a test case");
    expect(body).toContain("do not branch on a test's own inputs");
    expect(body).toContain("stand in for the standard tools the task calls for");
    expect(body).toContain("Where the task cannot be done as specified");
    expect(body).toContain("a test case is itself wrong, stop and report it");
    expect(body).toContain("Change Request");
    expect(body).toContain("rule/drift-protocol.md");
    expect(body).toContain("Article V");
  });

  it("the Green step measures minimal code against the obligation", async () => {
    const step = unwrap(await readAssistant("step", "implement-tdd", "STEP.md"));
    const green = step.split("**Green:**")[1]?.split("**Refactor:**")[0] ?? "";

    expect(green).toContain(
      "Minimal is measured against the example's obligation, not the test's inputs",
    );
    expect(green).toContain(ANCHOR);
  });

  it("every reviewer check that applies the rule names it", async () => {
    const places = [
      ["agent", "implementation-reviewer.md"],
      ["agent", "qa-gatekeeper.md"],
      ["skill", "qfai-implement", "SKILL.md"],
      ["skill", "qfai-atdd", "SKILL.md"],
    ];
    for (const place of places) {
      const body = unwrap(await readAssistant(...place));
      expect(body, place.join("/")).toContain(CHECK);
      expect(body, place.join("/")).toContain("no branch written only for the test");
      expect(body, place.join("/")).toContain(
        "a wrong test or infeasible task raised as a Change Request, not worked around",
      );
      expect(body, place.join("/")).toContain(ANCHOR);
    }
  });

  it("the review policies and the minimal-implementation rule name it", async () => {
    const read = (rel: string) => readFile(path.join(repoRoot, rel), "utf-8").then(unwrap);

    expect(await read("REVIEW.md")).toContain("a value hard-coded to the test's inputs");
    expect(
      await read("packages/qfai/assets/init/.github/instructions/code-review.instructions.md"),
    ).toContain(CHECK);
    const rule = await read(
      "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md",
    );
    const leavesOut = rule.split("## 4. What a change leaves out")[1]?.split(" ## ")[0] ?? "";
    expect(leavesOut).toContain("Code written only to pass a test");
    expect(leavesOut).toContain(ANCHOR);
  });
});

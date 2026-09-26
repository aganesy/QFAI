import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TREES = ["packages/qfai/assets/init/.qfai/assistant", ".qfai/assistant"];
const HEADING = "## A passing test is not the solution";
const CHECK = "hard-coded to the test's inputs";
const ANCHOR = "catalog/test-layers.md#a-passing-test-is-not-the-solution";

/** Collapse markdown soft wraps so assertions pin wording, not line breaks. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

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

describe("a ledger row is not met by code written for its test", () => {
  for (const tree of TREES) {
    it(`${tree}: test-layers.md states what the code under test may not do`, async () => {
      const content = await readFile(
        path.join(repoRoot, tree, "catalog", "test-layers.md"),
        "utf-8",
      );
      const body = unwrap(section(content, HEADING));
      expect(body).not.toBe("");

      expect(body).toContain("The test checks the solution; it does not define it.");
      expect(body).toContain("Do not hard-code a value to match a test case");
      expect(body).toContain("stand in for the standard tools the task calls for");
      expect(body).toContain("a test case is itself wrong, stop and report it");
      expect(body).toContain("constitution/drift-protocol.md");
      expect(body).toContain("Article V");
    });

    it(`${tree}: the Green phase measures minimal code against the obligation`, async () => {
      const skill = await readFile(
        path.join(repoRoot, tree, "skills", "qfai-implement", "SKILL.md"),
        "utf-8",
      );
      const green = unwrap(
        section(skill.replace(/^### /gm, "## "), "## Phase: Green (Make It Pass)"),
      );

      expect(green).toContain(
        "Minimal is measured against the row's obligation, not the test's inputs",
      );
      expect(green).toContain(ANCHOR);
    });

    it(`${tree}: every reviewer check that applies the rule names it`, async () => {
      const places = [
        ["agents", "implementation-reviewer.md"],
        ["agents", "qa-gatekeeper.md"],
        ["skills", "qfai-implement", "SKILL.md"],
        ["skills", "qfai-atdd", "SKILL.md"],
      ];
      for (const place of places) {
        const body = unwrap(await readFile(path.join(repoRoot, tree, ...place), "utf-8"));
        expect(body, place.join("/")).toContain(CHECK);
        expect(body, place.join("/")).toContain(ANCHOR);
      }
    });
  }

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

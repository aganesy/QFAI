/**
 * The change-classification rule says who reviews a classified change. It
 * names only reviewer cards the package ships under `assistant/agent/`, never
 * a technical role (QA, Architect, Code Reviewer) that no session can start.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const CLASSIFICATION = path.join("assistant", "rule", "change-classification.md");
const AGENT_DIR = path.join("assistant", "agent");
const RULE_DIR = path.join("assistant", "rule");
const RETIRED_ROLES = /\b(?:QA|Architect|Code Reviewer)\b/;

const shippedReviewerCards = async (tree: string): Promise<string[]> => {
  const entries = await readdir(path.join(repoRoot, tree, AGENT_DIR));
  return entries
    .filter((name) => name.endsWith("-reviewer.md"))
    .map((name) => name.slice(0, -".md".length))
    .sort();
};

const reviewFocusLine = (body: string): string => {
  const line = body.split(/\r?\n/).find((candidate) => candidate.startsWith("- Review focus"));
  if (line === undefined) {
    throw new Error("change-classification.md has no `- Review focus` line");
  }
  return line;
};

describe("the change-classification rule names shipped reviewer cards", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the review-focus line names exactly the shipped reviewer cards`, async () => {
      const line = reviewFocusLine(
        await readFile(path.join(repoRoot, tree, CLASSIFICATION), "utf-8"),
      );
      const named = [...line.matchAll(/`([a-z-]+)`/g)]
        .map((match) => match[1])
        .filter((name): name is string => name !== undefined && name !== "review")
        .sort();

      expect(named).toEqual(await shippedReviewerCards(tree));
      expect(line).toContain("`review`");
    });

    it(`${tree}: no rule names QA, Architect or Code Reviewer as a role`, async () => {
      const ruleDir = path.join(repoRoot, tree, RULE_DIR);
      const files = (await readdir(ruleDir, { recursive: true })).filter((name) =>
        name.endsWith(".md"),
      );
      const offenders: string[] = [];
      for (const file of files) {
        const body = await readFile(path.join(ruleDir, file), "utf-8");
        body.split(/\r?\n/).forEach((line, index) => {
          if (RETIRED_ROLES.test(line)) {
            offenders.push(`${file}:${index + 1}: ${line.trim()}`);
          }
        });
      }

      expect(offenders).toEqual([]);
    });
  }
});

/**
 * A workflow step names the rule documents it requires.
 *
 * The entry file holds a table of rules and when to read each, but a table only
 * reaches an agent that goes looking. A step runs at the moment its rules
 * matter, so its `## Reads` section is where a rule that no path scopes and no
 * hook restates is made certain to be read: the commit step reads the rule on
 * how hard an action is to undo, the triage steps read the rule on text the
 * project did not write, and so on.
 *
 * Each rule named here is one the package ships, because the steps ship too
 * and a step cannot point an adopter at a rule the adopter does not have.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/scripts/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const STEPS = path.join(ROOT, "packages", "qfai", "assets", "init", ".qfai", "assistant", "step");
const SHIPPED_RULES = path.join(
  ROOT,
  "packages",
  "qfai",
  "assets",
  "init",
  "root",
  ".agents",
  "rules",
);

/** The rule documents each step requires. */
const REQUIRED: Readonly<Record<string, readonly string[]>> = {
  "common-gate-run": ["temporary-files", "api-budget"],
  "verify-commit": ["action-reversibility"],
  "verify-change-note": ["documentation-clarity"],
  "verify-release-notes": ["documentation-clarity"],
  "verify-external": ["untrusted-content"],
  "maintain-edit": ["documentation-clarity"],
  "discussion-research": ["untrusted-content"],
  "discussion-pack": ["documentation-clarity"],
  "implement-benchmark": ["temporary-files"],
  "implement-dep-bump": ["untrusted-content"],
  "implement-diagnose": ["untrusted-content"],
  "implement-retire": ["action-reversibility"],
  "triage-answer": ["untrusted-content"],
  "triage-cluster": ["untrusted-content"],
  "triage-decompose": ["untrusted-content"],
  "triage-dedupe": ["untrusted-content", "api-budget"],
  "triage-handoff": ["untrusted-content", "action-reversibility"],
  "triage-operate": ["untrusted-content", "action-reversibility", "api-budget"],
  "triage-investigate": ["untrusted-content"],
  "triage-request-info": ["untrusted-content"],
  "triage-security-intake": ["untrusted-content"],
  "sdd-flow": ["document-schema"],
  "sdd-story": ["document-schema", "documentation-clarity"],
  "sdd-contract": ["document-schema"],
};

/** The text of a step's `## Reads` section, up to the next heading. */
function readsOf(step: string): string {
  const start = step.indexOf("\n## Reads");
  if (start === -1) return "";
  const rest = step.slice(start + 1);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("steps name the rule documents they require", () => {
  it.each(Object.entries(REQUIRED).map(([step, rules]) => ({ step, rules })))(
    "$step reads $rules",
    async ({ step, rules }) => {
      const text = await readFile(path.join(STEPS, step, "STEP.md"), "utf-8");
      const reads = readsOf(text);
      for (const rule of rules) {
        expect(reads, `${step} does not read .agents/rules/${rule}.md`).toContain(
          `.agents/rules/${rule}.md`,
        );
        const shipped = await stat(path.join(SHIPPED_RULES, `${rule}.md`)).catch(() => undefined);
        expect(shipped?.isFile(), `${rule}.md is not a shipped rule`).toBe(true);
      }
    },
  );
});

describe("a step cites only rules the package ships", () => {
  it("names no rule an adopter does not have", async () => {
    const missing: string[] = [];
    for (const step of await readdir(STEPS)) {
      const text = await readFile(path.join(STEPS, step, "STEP.md"), "utf-8").catch(() => "");
      for (const match of text.matchAll(/\.agents\/rules\/([\w.-]+\.md)/g)) {
        const shipped = await stat(path.join(SHIPPED_RULES, match[1] ?? "")).catch(() => undefined);
        if (shipped?.isFile() !== true) missing.push(`${step}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

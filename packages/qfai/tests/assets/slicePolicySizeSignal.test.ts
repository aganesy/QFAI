import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const TEMPLATES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
  ".qfai/assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md",
];
/** `qfai-sdd/SKILL.md` sends the agent here for the APPEND-vs-CREATE algorithm. */
const TRIAGE_REFERENCES = [
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md",
  ".qfai/assistant/skills/qfai-sdd/references/sdd-triage.md",
];

/**
 * Collapse markdown soft wraps so assertions pin wording, not the column at
 * which the sentence happened to break.
 */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const ALGORITHM_HEADING = "## APPEND vs CREATE algorithm";

/**
 * Returns the `## APPEND vs CREATE algorithm` body — the text after the
 * heading line, up to the next `## `.
 *
 * The heading itself is excluded. Slicing from `start + 1` instead used to
 * leave a truncated `# APPEND vs CREATE algorithm` at the front of the
 * "body", which is neither the heading nor part of the body.
 */
function algorithm(content: string): string {
  const start = content.indexOf(ALGORITHM_HEADING);
  if (start === -1) {
    return "";
  }
  const rest = content.slice(start + ALGORITHM_HEADING.length);
  const next = rest.indexOf("\n## ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("11_Slice-Policy.md treats item counts as a signal, not a SPLIT trigger", () => {
  for (const relativePath of TEMPLATES) {
    it(`${relativePath}: no algorithm step decides SPLIT on a count alone`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).not.toBe("");

      // Negative checks run on the unwrapped text: pinning the exact
      // `\n   ` soft-wrap meant the banned rule could come back at a
      // different column and this guard would not notice.
      const flat = unwrap(section);
      expect(flat).not.toContain("exceeds the AC/TC thresholds → **SPLIT**");
      expect(flat).not.toContain("Upgrade to **SPLIT**");
      expect(section).toContain("size signal, not an operation");
      expect(section).toContain("capability-ownership review");
    });

    it(`${relativePath}: the algorithm cites the validator that makes a count-split illegal`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).toContain("QFAI-SPLIT-102");
      expect(section).toContain("QFAI-SPLIT-104");
      expect(section).toContain("validateSpecSplitByCapability");
    });

    it(`${relativePath}: the size-signal step is reached even when step 2 already decided`, async () => {
      const section = unwrap(algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8")));
      // "Apply in order" plus an unconditional step 2 let an agent stop before
      // ever reaching the recording obligation for an oversized owner.
      expect(section).toContain("the **first** one that matches wins");
      expect(section).toContain(
        "Step 4 is **not** an alternative branch — it is a recording obligation that always runs afterwards",
      );
      expect(section).toContain("Do not stop at step 2.");
      expect(section).toContain(
        "Continue to step 4: an oversized owner still needs its `Rationale` entry",
      );
      expect(section).toContain("**Always evaluate, whatever step 2/3/5 decided.**");
    });

    it(`${relativePath}: the size check records, it does not rewrite the operation`, async () => {
      const section = unwrap(algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8")));
      // Reading "the operation stays UPDATE:APPEND" after step 3 chose MERGE
      // dropped the MERGE and its approval, and appended onto one of several
      // duplicate owners without resolving the duplication.
      expect(section).toContain(
        "**the operation selected in steps 1-3/5 is unchanged** — MERGE stays MERGE with its approval, APPEND stays APPEND",
      );
      expect(section).toContain("This step never rewrites the operation");
      // A MERGE row targets several specs; all of them are checked.
      expect(section).toContain("A MERGE row targets several specs, so check them all");
    });

    it(`${relativePath}: obligation-conserving re-granulation is named as a non-trigger`, async () => {
      const section = algorithm(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      expect(section).toMatch(/obligation-conserving re-granulation/i);
      expect(section).toContain("zero added and zero removed");
    });

    it(`${relativePath}: the SPLIT trigger stays capability-based in the operation table`, async () => {
      const content = await readFile(path.join(repoRoot, relativePath), "utf-8");
      expect(content).toContain("Existing spec covers >1 capability");
    });
  }

  for (const relativePath of TRIAGE_REFERENCES) {
    it(`${relativePath}: the mandatory triage reference carries the same rule`, async () => {
      const content = unwrap(await readFile(path.join(repoRoot, relativePath), "utf-8"));
      // The old contract sent the agent straight to a count-driven SPLIT.
      expect(content).not.toContain("If the spec is over the size threshold, propose **SPLIT**");
      expect(content).toContain("A spec over the size threshold is a **signal, not an operation**");
      expect(content).toContain("capability-ownership review");
      expect(content).toContain(
        "the operation already selected is unchanged (MERGE stays MERGE, APPEND stays APPEND)",
      );
      expect(content).toContain("for a MERGE row, every breaching target");
      expect(content).toContain("QFAI-SPLIT-102");
      expect(content).toContain("QFAI-SPLIT-104");
      expect(content).toContain("validateSpecSplitByCapability");
      // The operation table's capability-based trigger is unchanged.
      expect(content).toContain("One spec carries >1 capability");
    });
  }
});

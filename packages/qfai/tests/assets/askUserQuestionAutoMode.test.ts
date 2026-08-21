import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`. A runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo, and every read
// below then fails on a path unrelated to what is being asserted.
// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const cache = new Map<string, Promise<string>>();
const read = (tree: string, rel: string): Promise<string> => {
  const key = `${tree}::${rel}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = readFile(path.join(repoRoot, tree, rel), "utf-8");
    cache.set(key, pending);
  }
  return pending;
};

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

const CONSTITUTION = "assistant/constitution/constitution.md";
const COMMUNICATION = "assistant/constitution/communication.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";
const BASELINE_ANCHOR =
  "shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol";

describe("--auto suppresses questions in every copy of the protocol", () => {
  for (const tree of QFAI_TREES) {
    // Article X is the normative statement the other two copies restate.
    it(`${tree}: Article X forbids asking under --auto`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "## Article X — AskUserQuestion MUST");
      expectPhrase(
        content,
        "**`--auto` mode**: When `--auto` flag is active, no questions are asked.",
      );
      expectPhrase(content, "The agent MUST NOT use AskUserQuestion or ask via plain text.");
    });

    // The baseline is what the SKILL.md files are pointed at. A copy missing
    // rule 4 leaves an agent running `--auto` with nothing in its resolved
    // instruction chain that stops it from asking.
    it(`${tree}: the operating baseline carries the --auto rule at MUST level`, async () => {
      const content = await read(tree, OPERATING);
      expectPhrase(content, "## User Questions (AskUserQuestion Protocol)");
      expectPhrase(
        content,
        "- When `--auto` is active, ask nothing: MUST NOT use AskUserQuestion and MUST NOT ask\n  via plain text. Proceed with explicit assumptions and record them in the outputs.",
      );
    });

    // `communication.md` stated rule 4 without the MUST NOT clause, so the
    // three copies differed in strength as well as in content.
    it(`${tree}: communication.md states rule 4 at the same strength`, async () => {
      const content = await read(tree, COMMUNICATION);
      expectPhrase(
        content,
        "4. **`--auto` consistency**: When `--auto` flag is active, no questions are asked.",
      );
      expectPhrase(content, "The agent MUST NOT use AskUserQuestion or ask via plain text.");
      expectPhrase(
        content,
        "The agent MUST proceed with explicit assumptions and MUST record them in outputs.",
      );
    });

    // Every skill that delegates the section to the baseline inherits whatever
    // the baseline says, so the delegation set is what makes the case above
    // load-bearing. Guard it so a new delegating skill cannot silently widen
    // the blast radius without this test noticing the anchor is still cited.
    it(`${tree}: skills delegating the section resolve to that baseline anchor`, async () => {
      const skillsDir = path.join(repoRoot, tree, "assistant", "skills");
      const entries = await readdir(skillsDir, { withFileTypes: true });
      const delegating: string[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        let body: string;
        try {
          body = await readFile(path.join(skillsDir, entry.name, "SKILL.md"), "utf-8");
        } catch {
          continue;
        }
        if (body.includes(BASELINE_ANCHOR)) delegating.push(entry.name);
      }
      expect(delegating).toContain("qfai-verify");
      const baseline = await read(tree, OPERATING);
      expectPhrase(baseline, "## User Questions (AskUserQuestion Protocol)");
      for (const skill of delegating) {
        const body = await readFile(path.join(skillsDir, skill, "SKILL.md"), "utf-8");
        // A delegating skill must not also restate the protocol: the baseline
        // is the copy it inherits, and a second local copy would drift.
        expect(body).toContain(`Follow \`.qfai/assistant/constitution/${BASELINE_ANCHOR}\`.`);
      }
    });
  }
});

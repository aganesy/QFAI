import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];
const DISCUSSION = "assistant/skills/qfai-discussion/references/oq-and-deferred-rules.md";
const SDD = "assistant/skills/qfai-sdd/references/spec-traceability-rules.md";

/** Collapse markdown soft wraps so assertions pin wording, not the wrap column. */
const unwrap = (markdown: string): string => markdown.replace(/\s*\n\s*/g, " ");

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

function expectPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).toContain(unwrap(phrase));
}

describe("a grilling session records into the artifacts that exist", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the discussion pack names both halves`, async () => {
      // Settled and unsettled have different homes, and only the second keeps a
      // stage from closing over a decision nobody took. Naming one without the
      // other leaves a session that can complete with its own open questions
      // recorded nowhere.
      const content = await read(tree, DISCUSSION);
      expectPhrase(content, "## Where a grilling session's outcome goes");
      expectPhrase(content, "`11_OQ-Register.md`, `Disposition: open`");
      expectPhrase(content, "`12_OQ-Resolution-Log.md`");
      expectPhrase(content, "`13_Deferred.md`");
    });

    it(`${tree}: the discussion pack gains no file for it`, async () => {
      // The fifteen-file set is fixed and pinned by mdschema. A new file would
      // reach the schema, the completion matrix and the forbidden-legacy list
      // before it held anything the two existing halves do not.
      const content = await read(tree, DISCUSSION);
      expectPhrase(content, "No new file");
      expectPhrase(content, "a\nthird artifact would hold nothing they do not");
    });

    it(`${tree}: the spec pack names its own two halves`, async () => {
      const content = await read(tree, SDD);
      expectPhrase(content, "## Where a grilling session's outcome goes");
      expectPhrase(content, "`07_Decisions.md`");
      expectPhrase(content, "`08_Open-questions.md`");
      expectPhrase(content, "`_policies/08_Decisions.md`");
    });

    it.each([DISCUSSION, SDD])("%s records the choice, not the session", async (rel) => {
      // A record of how the conversation went is the thing the writing standard
      // keeps out of an artifact, and it costs a later reader the one thing the
      // record is for.
      const content = await read(tree, rel);
      expect(unwrap(content)).toMatch(/what was chosen and why|what was chosen, and why/);
    });
  }
});

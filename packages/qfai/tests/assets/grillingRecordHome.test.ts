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
      // Named files, not a description. "the pack's decision record" matched
      // nothing in the fifteen, so an agent could not tell where to write.
      expectPhrase(content, "`99_delta.md`, under `## Change History`");
      // Readiness reads the register. An answer written only to the log
      // leaves the row open, so the pack stays blocked on a settled question.
      expectPhrase(content, "**The register is what readiness reads.**");
      expectPhrase(content, "moved to `Disposition: resolved`");
      expectPhrase(content, "`12_OQ-Resolution-Log.md`");
      expectPhrase(content, "`13_Deferred.md`");
    });

    it(`${tree}: every disposition change reaches the append-only log`, async () => {
      // The log's own rules say every disposition change is appended and list
      // `created` among the actions, so a question registered without one is
      // missing the first event in its history while every later one is there.
      const content = await read(tree, DISCUSSION);
      expectPhrase(content, "a `created` row in `12_OQ-Resolution-Log.md`");
      for (const action of ["resolved", "deferred", "rejected", "reopened"]) {
        expectPhrase(content, `\`12_OQ-Resolution-Log.md\` as \`${action}\``);
      }
      expectPhrase(content, "moved to `Disposition: rejected`");
      expectPhrase(content, "moved back to `Disposition: open`");
    });

    it(`${tree}: a closure the user asked for is not left open`, async () => {
      // `proceed` / `done` ends the asking, and the rule records what is still
      // open as a labelled assumption. Registering those as open instead blocks
      // the pack on the closure the user asked for, since readiness requires
      // the open count to reach zero.
      const content = await read(tree, DISCUSSION);
      expectPhrase(content, "**A closure the user asked for is not an open question.**");
      expectPhrase(content, "a labelled assumption and no register row");
      // The two kinds the rule never assumes stay open whatever closes the asking.
      expectPhrase(content, "a decision some document requires the user to make and record");
      expectPhrase(content, "an input declared undefaultable");
      // `--auto` is the opposite case: nobody saw the question.
      expectPhrase(content, "the assumption is recorded **and** a register row opened against it");
    });

    it(`${tree}: a rejected visual direction reaches its own section`, async () => {
      // The delta template requires `## Rejected Visual Directions` of a
      // UI-bearing pack and gives it different columns, so routing one to the
      // generic table leaves the required section empty.
      const content = await read(tree, DISCUSSION);
      expectPhrase(content, "`99_delta.md`, under `## Rejected Visual Directions`");
    });

    it(`${tree}: the spec pack says which of its open-question statuses gates`, async () => {
      // A spec pack carries open questions as a matter of course, so nothing
      // requires the file to be empty. What stops a stage is one status on one
      // row, and a reader who takes the whole file for a gate — or for none —
      // will write a decision down and leave it.
      const content = await read(tree, SDD);
      expectPhrase(
        content,
        "**`08_Open-questions.md` is a record, and one of its statuses is a gate.**",
      );
      expectPhrase(content, "goes to the user during the stage");
      expectPhrase(content, "`unadjudicated` | Put to the user, and nobody answered");
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
      // `qfai report` reads the Decision Log alone, so a decision recorded
      // only in `07_Decisions.md` reports as zero entries.
      expectPhrase(content, "a `### DL-NNNN` entry in `09_delta.md`");
      expectPhrase(content, "**Both halves of the first row, or the decision is invisible.**");
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

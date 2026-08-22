/**
 * `--auto` forbade the question Stage 1 required (#537).
 *
 * `qfai-sdd` advertises `--auto`; the constitution's AskUserQuestion rule 4
 * makes `--auto` a no-question mode; Stage 1 makes AskUserQuestion the only way
 * to fill `Approved By` for CREATE / DELETE / SPLIT / MERGE / SUPERSEDE /
 * UPDATE:REMOVE; and an empty or `-` cell is a `QFAI-TRIAGE-005` error, which is
 * the skill's sole stop condition. Asking, writing a placeholder and leaving `-`
 * were all prohibited, so the flag was unusable on any run whose Triage produced
 * such a row. The shipped tree now states the precedence and the repair.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const PLAYBOOK = "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md";
const TRIAGE = "assistant/skills/qfai-sdd/references/sdd-triage.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("`--auto` has a stated precedence against approval-required Triage rows", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: SKILL.md scopes --auto to classification and suspends it per row`, async () => {
      const skill = await read(tree, SKILL);
      const flattened = flat(skill);

      expect(skill).toContain("### `--auto` and approval-required rows");
      expect(flattened).toContain("**`--auto` covers Stage 1 classification only.**");
      // Without the scope boundary the two MUST-level rules stay contradictory.
      expect(flattened).toContain("This is a scope boundary, not an exception to rule 4.");
      expect(flattened).toContain("**Never ask while `--auto` is active.**");
      // Rule 4 binds the whole invocation, so a present operator changes nothing.
      expect(flattened).toContain(
        "Whether an operator is present makes no difference — the no-question contract is what the caller bought with the flag.",
      );
    });

    it(`${tree}: SKILL.md forbids a fabricated approver and names the stop`, async () => {
      const flattened = flat(await read(tree, SKILL));

      expect(flattened).toContain("**Never synthesize an `Approved By` value.**");
      expect(flattened).toContain("an invented approver is a false audit record");
      expect(flattened).toContain("**Stop the stage and hand the run back.**");
      // Awaiting an approval is `consultation-needed`, not a stuck skill.
      expect(flattened).toContain("write a `consultation-needed` work-log entry");
      expect(flattened).toContain("**The kind is `consultation-needed`, not `blocker`.**");
      expect(flattened).toContain("the user's approval releases this stop");
      expect(flattened).not.toContain("write a `blocker` work-log entry");
      // The error is the report of a suspended run, not a gate to route around.
      expect(flattened).toContain(
        "The resulting `QFAI-TRIAGE-005` errors are the reported state of a suspended run",
      );
    });

    it(`${tree}: the ask-user bucket is not narrowed by the new section`, async () => {
      const flattened = flat(await read(tree, SKILL));

      expect(flattened).toContain(
        "the six operations stay in `ask-user`, and `--auto` never moves them to auto-decide",
      );
      expect(flattened).toContain(
        "- CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations",
      );
    });

    it(`${tree}: the playbook Stop Condition carries a repair action`, async () => {
      const flattened = flat(await read(tree, PLAYBOOK));

      expect(flattened).toContain("Triage rows requiring approval but lacking `Approved By`");
      expect(flattened).toContain(
        "Repair: obtain the approval through AskUserQuestion, record the approver in `Approved By`, and rerun the stage.",
      );
      expect(flattened).toContain("`../SKILL.md#--auto-and-approval-required-rows`");
      expect(flattened).toContain("no question may be asked at all");
      expect(flattened).toContain("write a `consultation-needed` work-log entry");
      expect(flattened).toContain("hand the run back for a rerun without `--auto`");
      expect(flattened).toContain("never synthesize an approver");
    });

    it(`${tree}: the triage procedure states the --auto path on both steps`, async () => {
      const flattened = flat(await read(tree, TRIAGE));

      expect(flattened).toContain(
        "Under `--auto` the row leaves `--auto` scope and no question may be asked — not through AskUserQuestion and not in plain text, operator present or not — so stop at step 7 instead.",
      );
      expect(flattened).toContain(
        "the column records who authorized the operation, so an invented approver is a false audit record",
      );
      expect(flattened).toContain("Stopping here is a reportable outcome, not a failure to repair");
      expect(flattened).toContain("write a `consultation-needed` work-log entry");
      expect(flattened).toContain(
        "report the `QFAI-TRIAGE-005` errors as the reason the run stopped",
      );
      expect(flattened).toContain(
        "Under `--auto`, also ask for a rerun without `--auto` so the approvals can be collected.",
      );
    });
  }
});

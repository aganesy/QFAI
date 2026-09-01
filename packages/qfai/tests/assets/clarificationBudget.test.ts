import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root resolves `../..` to the directory ABOVE the repo.
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
const SDD = "assistant/skills/qfai-sdd/SKILL.md";
const CONFIGURE = "assistant/skills/qfai-configure/SKILL.md";

describe("the clarification budget is countable", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article VI names a counting unit and a reset point`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### Counting unit (MUST)");
      expectPhrase(content, "**Five clarifying questions per skill invocation.**");
      expectPhrase(content, "starts at zero when the invocation starts");
      expectPhrase(content, "does **not** reset between stages");
      // Without this a delegating skill multiplies its own budget by fan-out.
      expectPhrase(content, "spends its caller's budget; it does not receive one of its own");
      // Per item, not per call: AskUserQuestion can bundle several items into
      // one call, so counting calls would let 5 calls carry far more questions.
      expectPhrase(content, "**One question item is one question**");
      expectPhrase(content, "bundles N question items spends N, not 1");
      expectPhrase(content, "one numbered choice set is one question");
    });

    it(`${tree}: Article VI says what exhaustion does`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### Exhaustion (MUST)");
      // "Stop condition" must not be readable as "abort the run".
      expectPhrase(content, "Exhaustion stops the questions, not the work");
      expectPhrase(content, "the agent is in **clarification-exhausted mode**");
      expectPhrase(content, "label every assumption in the outputs");
      expectPhrase(content, "Question budget is exhausted → clarification-exhausted mode");
    });

    it(`${tree}: exhaustion is a distinct state, not --auto`, async () => {
      const content = await read(tree, CONSTITUTION);
      // Article X rule 4 bans every question under `--auto`. Equating the two
      // would force the agent to choose between skipping a mandatory approval
      // and violating `--auto`, so exhaustion MUST stay its own state.
      expectPhrase(content, "Clarification-exhausted mode is **not `--auto`**");
      expectPhrase(content, "clarification-exhausted mode silences clarifications only");
      expectPhrase(
        content,
        "mandatory approvals and needed\n`hard-required` inputs MUST still be asked",
      );
      // Article X must say the same thing where the `--auto` ban is declared.
      expectPhrase(content, "**Exhausting the Article VI budget is not `--auto`**");
      expectPhrase(content, "Rule 4 does not apply to it");
      const communication = await read(tree, COMMUNICATION);
      expectPhrase(communication, "**Exhaustion is not `--auto`**");
      expectPhrase(communication, "where rule 4 does not apply");
    });

    it(`${tree}: Article VI keeps an explicit "stop" out of --auto`, async () => {
      const content = await read(tree, CONSTITUTION);
      // Exhaustion continues the work; a user "stop" must end it instead.
      expectPhrase(content, "**“stop” is not exhaustion**");
      expectPhrase(content, "MUST NOT be read as `--auto`");
      expectPhrase(content, "make no further\nfile changes");
      expectPhrase(content, "User says “stop” → abort the invocation");
    });

    it(`${tree}: a user “proceed / done” silences clarifications, not approvals`, async () => {
      const content = await read(tree, CONSTITUTION);
      // Routing the waiver into `--auto` re-creates the contradiction rule 5
      // was added to remove: Article X rule 4 forbids every question under
      // `--auto`, while a /qfai-sdd row classified after the waiver still
      // requires its mandatory approval.
      expectPhrase(content, "**two entry conditions and one meaning**");
      expectPhrase(content, "the user closes it early by answering `proceed` / `done`");
      expectPhrase(content, "User says “proceed / done” → clarification-exhausted mode");
      expectPhrase(content, "It waives clarifications only; it is **not** `--auto`");
      expectPhrase(content, "neither a spent\nbudget nor a `proceed` / `done` answer does");
      expect(unwrap(content)).not.toContain(unwrap("“proceed / done” → `--auto` behaviour"));
      // Both `--auto` declarations must carry the same exclusion.
      expectPhrase(
        content,
        "A user's\n   `proceed` / `done` answer enters that same mode and is likewise not `--auto`",
      );
      const communication = await read(tree, COMMUNICATION);
      expectPhrase(
        communication,
        "A user's `proceed` / `done` answer enters that same mode and is likewise\n   not `--auto`",
      );
      const operating = await read(tree, OPERATING);
      expectPhrase(
        operating,
        "Neither exhaustion nor a user's `proceed` / `done` answer is `--auto`",
      );
      const sdd = await read(tree, SDD);
      expectPhrase(sdd, "A `proceed` / `done`\nanswer to a pre-Stage-1 question does the same");
      expectPhrase(sdd, "it closes the clarifications,\nnot the approvals");
    });

    it(`${tree}: Article VI decides whether approval questions count`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### What does not count (MUST)");
      expectPhrase(content, "**Approval questions are exempt.**");
      expectPhrase(content, "a per-row triage approval in `/qfai-sdd`");
      expectPhrase(content, "shared-skill-delegation-baseline.md#round-budget-must");
      expectPhrase(content, "MUST still be asked after the\n  budget is exhausted");
      expectPhrase(content, "Skipping a mandatory approval to stay under the budget\n  violates");
    });

    it(`${tree}: Article VI never lets exhaustion assume a hard-required input`, async () => {
      const content = await read(tree, CONSTITUTION);
      // Otherwise the budget contradicts every skill's `hard-required` bucket.
      expectPhrase(
        content,
        "**`hard-required` inputs are exempt — but only where the invocation needs\n  them.**",
      );
      expectPhrase(
        content,
        "has no default\n  and MUST NOT be guessed once the budget is exhausted",
      );
      expectPhrase(
        content,
        "When a **needed** input is still\n  missing, stop and name what is blocked",
      );
      expectPhrase(content, "never inputs the skill declares undefaultable");
    });

    it(`${tree}: the hard-required exemption is scoped to what the run consumes`, async () => {
      const content = await read(tree, CONSTITUTION);
      // Every skill's `Default Autopilot Policy` lists the same three entries,
      // so an unscoped rule would make `/qfai-verify` demand `companyName`
      // from a repository that has no brand surface and stop when unanswered.
      expectPhrase(content, "**scoped to the inputs the requested work actually\n  consumes**");
      expectPhrase(
        content,
        "An input the requested\n  path never reads MUST NOT be asked for and MUST NOT block the run",
      );
      expectPhrase(content, "executes its quality\n  gates without ever asking for `companyName`");
      const operating = await read(tree, OPERATING);
      expectPhrase(operating, "**that this invocation actually consumes**");
      expectPhrase(
        operating,
        "input the requested path never reads is neither asked for nor a blocker",
      );
    });

    it(`${tree}: the shared baseline restates the budget for every skill`, async () => {
      const content = await read(tree, OPERATING);
      expectPhrase(content, "**at most 5 per skill invocation**");
      expectPhrase(content, "counted\n  per question item rather than per AskUserQuestion call");
      expectPhrase(content, "proceeds with labelled assumptions instead of asking");
      expectPhrase(content, "Mandatory approval questions and `hard-required` inputs are exempt");
      expectPhrase(content, "if it stays missing, stop instead of\n  guessing");
      expectPhrase(content, "See `constitution.md` Article VI.");
    });

    it(`${tree}: qfai-sdd exempts its unbounded per-row approvals`, async () => {
      const content = await read(tree, SDD);
      expectPhrase(content, "exempt from\nthe Article VI clarification budget");
      expectPhrase(content, "MUST be asked however many rows triage\nproduced");
      // The sixth approval-required row is the case the budget must not eat.
      expectPhrase(
        content,
        "exhausting it enters clarification-exhausted mode rather than `--auto`",
      );
      expectPhrase(content, "`.qfai/assistant/constitution/constitution.md` Article VI");
    });

    it(`${tree}: qfai-configure declares its questions in-budget`, async () => {
      const content = await read(tree, CONFIGURE);
      expectPhrase(content, "count against the Article VI budget");
      expectPhrase(content, "at\nmost 5 per invocation of this skill");
      expectPhrase(content, "taken\nas labelled assumptions");
      expectPhrase(
        content,
        "The `hard-required`\ninputs in Default Autopilot Policy are the exception",
      );
      expectPhrase(content, "a missing one blocks\nthe run until it is provided");
      expectPhrase(content, "but only where this run\nconsumes it");
      expectPhrase(content, "`.qfai/assistant/constitution/constitution.md` Article VI");
    });

    it(`${tree}: qfai-configure never assumes a glob that matches nothing`, async () => {
      // Step 5 says "If zero matches exist, stop and ask for clarification",
      // unconditionally. The budget paragraph said the remaining choices become
      // labelled assumptions once five questions are spent, and zero-match was
      // in no exemption — so a run that exhausted its budget and then hit a
      // zero-match glob had to either break the cap or save a `testFileGlobs`
      // matching no file, which makes every downstream traceability finding a
      // false negative. Classified as `hard-required` so the existing Article VI
      // exemption carries it, rather than inventing a third exemption class.
      const content = await read(tree, CONFIGURE);
      // The budget paragraph the contradiction lived in.
      expectPhrase(
        content,
        "A `testFileGlobs`\nproposal that matches no file is one of those `hard-required` inputs, not a\nclarification to assume",
      );
      expectPhrase(content, "Step 5's zero-match stop therefore outlives an\nexhausted budget");
      // Step 5 itself must say the stop outlives the budget, since that is the
      // step a reader follows.
      expectPhrase(content, "This stop is **not\nsubject to the Article VI budget**");
      expectPhrase(content, "so it survives clarification-exhausted mode");
      expectPhrase(content, "Do not assume a glob\nand do not write the key");
      expectPhrase(content, "report the unresolved glob as the blocker");
      // And the bucket that Article VI's exemption actually reads — without it
      // the two statements above cite an exemption that does not list them.
      expectPhrase(
        content,
        "- a `testFileGlobs` proposal that matches at least one real file (Step 5)",
      );
    });
  }
});

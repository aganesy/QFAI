import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Anchored to this file, not to `process.cwd()`, for the same reason as the
// reviewer round-budget suite: a runner launched from the repo root would
// otherwise resolve `../..` above the repo.
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

function expectNoPhrase(content: string, phrase: string): void {
  expect(unwrap(content)).not.toContain(unwrap(phrase));
}

const CONSTITUTION = "assistant/constitution/constitution.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";

describe("the clarification budget binds a stage", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: Article VI names the unit the budget is spent per`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "## Article VI — Clarification budget (avoid endless Q&A)");
      expectPhrase(content, "**at most 5 clarifying questions per invocation**");
      expectPhrase(content, "The unit is one\n  top-level skill or command invocation");
      // The article binds every non-discussion command, so the unit cannot be a
      // canonical stage: `/qfai-configure` and `/web-research` are neither.
      expectPhrase(content, "`/qfai-configure` or `/web-research`");
      expectPhrase(content, "It is not per session and not per\n  conversation.");
      // "5 clarifying questions total" left the scope open to four readings.
      expectNoPhrase(content, "clarifying questions total");
    });

    it(`${tree}: Article VI says approvals do not spend the budget`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### What spends the budget (MUST)");
      expectPhrase(content, "A **clarification**");
      expectPhrase(content, "does **not** spend budget");
      // The unbounded approval sources are named, so the carve-out is checkable
      // rather than a general escape hatch.
      expectPhrase(content, "`Approved By`");
      // The heading gained "and convergence" upstream; the citation follows it
      // rather than the name it had, which resolved to nothing.
      expectPhrase(
        content,
        "shared-skill-delegation-baseline.md#round-budget-and-convergence-must",
      );
      // A mixed prompt is classified question by question, so one approval
      // cannot carry an unbounded tail of clarifications past the budget.
      expectPhrase(content, "Classify **each question, not the prompt**");
      expectPhrase(content, "spends\n  one unit per clarification it contains");
      expectNoPhrase(content, "A prompt that carries both is an approval");
    });

    it(`${tree}: Article VI defines what exhaustion requires`, async () => {
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "### On exhaustion (MUST)");
      expectPhrase(content, "Do not ask a sixth clarification.");
      expectPhrase(content, "Settle the remaining ambiguity the way `--auto`\ndoes");
      expectPhrase(content, "record them in the\ninvocation's output");
      expectPhrase(content, "as Open\nQuestions when the assumption is still unresolved");
      // Exhaustion must not import Article X's blanket no-question mode, or a
      // required approval would become unaskable and unskippable at once.
      expectPhrase(content, "A **required approval is still asked**");
    });

    it(`${tree}: the operating baseline restates the budget where questions are asked`, async () => {
      const content = await read(tree, OPERATING);
      // Article X reaches every skill through this section; without a line here
      // the budget reaches none of them.
      expectPhrase(content, "## User Questions (AskUserQuestion Protocol)");
      expectPhrase(content, "**at most 5 clarifying questions per invocation**");
      expectPhrase(content, "is an **approval** and spends\n  nothing");
      expectPhrase(content, "bundling one into a prompt does not exempt the clarifications");
      expectPhrase(content, "On exhaustion, do not ask a sixth clarification");
      expectPhrase(content, "a required approval may still be asked");
      expectPhrase(content, "constitution.md#article-vi--clarification-budget-avoid-endless-qa");
    });
  }
});

const COMMUNICATION = "assistant/constitution/communication.md";
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
      // main renamed this section `### On exhaustion (MUST)` while this branch
      // was open, and this branch's paragraphs now sit inside it. Same content,
      // the heading it is under.
      expectPhrase(content, "### On exhaustion (MUST)");
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
      // main renamed that heading to `#round-budget-and-convergence-must`, and
      // pins the new anchor in its own case; a citation cannot be both.
      expectPhrase(
        content,
        "shared-skill-delegation-baseline.md#round-budget-and-convergence-must",
      );
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
      // The baseline says this per *invocation* now — main's wording, pinned by
      // its own case. Same budget, same unit; one sentence states it.
      expectPhrase(content, "**at most 5 clarifying questions per invocation**");
      expectPhrase(content, "counted\n  per question item rather than per AskUserQuestion call");
      expectPhrase(content, "proceeds with labelled assumptions instead of asking");
      expectPhrase(content, "Mandatory approval questions and `hard-required` inputs are exempt");
      expectPhrase(content, "if it stays missing, stop instead of\n  guessing");
      // The Citation Path Form rule landed on main while this branch was open:
      // a constitution document is cited by its full path from the project root,
      // so the bare name this pinned can no longer be written anywhere.
      expectPhrase(content, "See `.qfai/assistant/constitution/constitution.md` Article VI.");
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
      // The budget paragraph names the zero-match glob as a stop, not a
      // clarification. (The sentence also covers the tooling-ambiguity stop;
      // that half is pinned by its own case below.)
      expectPhrase(content, "Step 5's zero-match glob");
      expectPhrase(
        content,
        "are `hard-required` inputs, not clarifications to assume, so\nboth outlive an exhausted budget",
      );
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

    it(`${tree}: the default-policy bullet uses the counting unit it declares`, async () => {
      // "at most 5 ... total" left the scope of the budget unstated while the
      // section immediately below defines it per skill invocation, so the two
      // statements of one rule could be read as two rules.
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "- Ask **at most 5 clarifying questions per invocation**.");
      expectPhrase(content, "**Five clarifying questions per skill invocation.**");
      expectNoPhrase(content, "- Ask **at most 5** clarifying questions total.");
    });

    it(`${tree}: --auto silences the question, it does not authorize the guess`, async () => {
      // Article X rule 4 is a no-question mode and orders the run to proceed on
      // assumptions; the `hard-required` exemption orders it to ask. Under an
      // explicit `--auto` an agent missing a consumed `companyName` therefore
      // had to either break rule 4 or invent an undefaultable value. The ask is
      // what `--auto` removes — the run stops and names the blocker instead.
      const content = await read(tree, CONSTITUTION);
      expectPhrase(content, "**An explicit `--auto` skips the asking, not the rule.**");
      expectPhrase(content, "it stops\nand names it as the blocker");
      expectPhrase(
        content,
        "`--auto` waives the question, never the input: a\nvalue the skill declares undefaultable is not something a run may invent",
      );
      // Stated where `--auto` itself is declared, not only in Article VI.
      expectPhrase(content, "The assumptions it proceeds with are the **defaultable** ones.");
      expectPhrase(
        content,
        "`--auto`\n   silences the question, it does not authorize the guess (Article VI).",
      );
      const baseline = await read(tree, OPERATING);
      expectPhrase(
        baseline,
        "Under an explicit `--auto` the question is not\nasked at all — that run stops and names the missing input instead of inventing\none.",
      );
    });

    it(`${tree}: qfai-configure keeps its tooling-ambiguity stop outside the budget`, async () => {
      // CRITICAL CONSTRAINTS says "MUST stop and escalate if tooling choices or
      // runnable path remain ambiguous", unconditionally, while "configuration
      // decisions" is a listed clarification example that the budget turns into
      // an assumption after five. A run past its budget had to either break the
      // cap or save a config naming a runner nobody chose.
      const content = await read(tree, CONFIGURE);
      expectPhrase(
        content,
        "The stops this\nskill declares — Step 5's zero-match glob, and an ambiguous tooling choice or\nrunnable path — are `hard-required` inputs, not clarifications to assume",
      );
      expectPhrase(
        content,
        "This stop is a `hard-required` input, not a clarification, so it outlives an exhausted Article VI budget",
      );
      expectPhrase(content, "escalate rather than picking a runner");
      expectPhrase(content, "a resolved tooling choice / runnable path (CRITICAL CONSTRAINTS)");
    });
  }
});

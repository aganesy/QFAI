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

/** Body of `## <heading>` up to the next level-2 heading (or end of file). */
function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const rest = markdown.slice(start + heading.length + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

const CONSTITUTION = "assistant/constitution/constitution.md";
const COMMUNICATION = "assistant/constitution/communication.md";
const OPERATING = "assistant/constitution/shared-skill-operating-baseline.md";
const BASELINE_ANCHOR =
  "shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol";
const QUESTIONS_HEADING = "User Questions (AskUserQuestion Protocol)";

// Bullets the baseline owns. A delegating skill that repeats one of them has
// forked the copy it claims to inherit, which is exactly the drift the
// delegation exists to prevent.
const BASELINE_OWNED_RULES = [
  "use AskUserQuestion if the tool is available",
  "prefer structured choices over free-text input",
  "ask the same question in a normal message with explicit numbered choices",
  "Preserve structured choice semantics",
  "State why AskUserQuestion was unavailable",
];

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
        const local = section(body, QUESTIONS_HEADING);
        expect(local.trim(), `${skill}: no "${QUESTIONS_HEADING}" section`).not.toBe("");
        for (const rule of BASELINE_OWNED_RULES) {
          expect(unwrap(local), `${skill} restates a baseline rule`).not.toContain(unwrap(rule));
        }
        // A skill-specific MUST that mandates asking has to say what happens
        // under `--auto`, or the resolved chain tells the agent both to ask and
        // not to ask. Presence of the `Follow` line alone cannot catch that.
        const localAdditions = unwrap(local).replace(
          `Follow \`.qfai/assistant/constitution/${BASELINE_ANCHOR}\`.`,
          "",
        );
        if (/\bMUST\b[^.]*AskUserQuestion/.test(localAdditions)) {
          expect(localAdditions, `${skill} mandates asking without resolving --auto`).toContain(
            "`--auto`",
          );
        }
      }
    });
  }
});

const SDD_SKILL = "assistant/skills/qfai-sdd/SKILL.md";
const SDD_TRIAGE = "assistant/skills/qfai-sdd/references/sdd-triage.md";
const SDD_PLAYBOOK = "assistant/skills/qfai-sdd/references/sdd-execution-playbook.md";
const SLICE_TEMPLATE = "assistant/skills/qfai-sdd/templates/specs/_policies/11_Slice-Policy.md";
const CONFIGURE = "assistant/skills/qfai-configure/SKILL.md";

// Suppressing the question is only half the rule: whatever the question was
// gating must stay ungated too. Each case below pins one write that used to
// happen *before* the approval it depends on.
describe("--auto stops at the gate instead of half-applying it", () => {
  for (const tree of QFAI_TREES) {
    // The CREATE path adds the CAP row to the catalog _first_. Under `--auto`
    // the CREATE row is never approved, so an eager catalog write would leave
    // an orphan CAP behind in a run that is about to stop.
    it(`${tree}: an unapproved CREATE row writes no CAP into the catalog`, async () => {
      expectPhrase(
        await read(tree, SDD_SKILL),
        "write no\n`CAP-NNNN` into `_policies/03_Capabilities.md` for those rows",
      );
      const triage = await read(tree, SDD_TRIAGE);
      expectPhrase(triage, "leave\n   `_policies/03_Capabilities.md` untouched");
      expectPhrase(
        triage,
        "An unapproved CREATE row must never leave\n   a new CAP behind in the catalog.",
      );
      expectPhrase(
        await read(tree, SDD_PLAYBOOK),
        "no `CAP-NNNN` is written to\n   `_policies/03_Capabilities.md` on their behalf",
      );
    });

    // Phase 0 onward is a fixed-order pass over one persisted table, so a batch
    // holding both a CREATE and an UPDATE:APPEND cannot both stop and proceed.
    it(`${tree}: a mixed batch stops whole rather than running its free rows`, async () => {
      expectPhrase(
        await read(tree, SDD_SKILL),
        "Approval-free rows\n(`UPDATE:APPEND` / `UPDATE:MODIFY`) proceed on the labelled\nassumptions only when the batch contains no approval-required row.",
      );
      expectPhrase(await read(tree, SDD_TRIAGE), "One such row stops the whole batch");
    });

    // `_policies/11_Slice-Policy.md` is the runtime SSOT the skill defers to,
    // and it is seeded from this template. Without the same exception there,
    // the resolved chain tells the agent to ask and not to ask at once.
    it(`${tree}: the seeded slice policy carries the same --auto exception`, async () => {
      expectPhrase(
        await read(tree, SLICE_TEMPLATE),
        "Under `--auto` no question is\n   asked and the agent never self-approves",
      );
    });

    // "Proceed on explicit assumptions" has no safe reading when the step has
    // no evidence to assume from; the baseline has to allow a silent stop.
    it(`${tree}: a hard blocker under --auto stops without asking`, async () => {
      expectPhrase(
        await read(tree, OPERATING),
        "when a step has none, it is a hard\n  blocker: stop there and report it as a blocker instead of asking or guessing.",
      );
      const configure = await read(tree, CONFIGURE);
      expectPhrase(
        configure,
        "Under `--auto` do not ask:\n  zero matches leave nothing to assume from",
      );
      expectPhrase(configure, "leave `testFileGlobs` unchanged");
    });
  }
});

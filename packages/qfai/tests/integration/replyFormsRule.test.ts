/**
 * The reply-forms rule: which form a user's answer takes, what carries it, and the text it returns.
 *
 * The rule reshapes questions the shipped rules already put, so its clauses are pinned in both
 * copies of the master, and each rule that puts such a question is held to its pointer.
 */
// QFAI:AC-0001-0239-01
// QFAI:AC-0001-0239-02
// QFAI:AC-0001-0239-03
// QFAI:AC-0001-0239-04
// QFAI:AC-0001-0239-05

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const MASTERS = [
  ".agents/rules/reply-forms.md",
  "packages/qfai/assets/init/root/.agents/rules/reply-forms.md",
];
const SHIPPED_RULES = "packages/qfai/assets/init/root/.agents/rules";

/** Collapse soft wraps and table padding so a clause is pinned by its wording, not its layout. */
const unwrap = (text: string): string => text.replace(/\s*\n\s*/g, " ").replace(/ {2,}/g, " ");

const read = async (rel: string): Promise<string> =>
  unwrap(await readFile(path.join(ROOT, rel), "utf-8"));

// QFAI:EX-0001-0239-01
// QFAI:EX-0001-0239-02
describe.each(MASTERS)("%s picks the form from what is answered", (rel) => {
  it("names one form for each kind of answer", async () => {
    const master = await read(rel);
    for (const row of [
      "| One decision among options that can be listed | choose |",
      "| A draft the user is asked to approve or correct | mark up |",
      "| A set of items, each to be put somewhere | sort |",
      "| A question of taste that talking cannot settle | compare |",
    ]) {
      expect(master).toContain(row);
    }
    expect(master).toContain("two or three variants side by side");
  });

  it("keeps a set the tool carries as one question, sorts a larger one, and never splits a set", async () => {
    const master = await read(rel);
    expect(master).toContain(
      "A set the structured question tool carries in one question stays a multi-select question.",
    );
    expect(master).toContain(
      "A set with more items than the tool's option limit, or with more than two outcomes per item, is one sort.",
    );
    expect(master).toContain("Never split a set into one question per item");
  });
});

// QFAI:EX-0001-0239-03
// QFAI:EX-0001-0239-04
describe.each(MASTERS)("%s orders the carriers", (rel) => {
  it("tries the tool, then the host's private page, then the chat", async () => {
    const master = await read(rel);
    const tool = master.indexOf("1. **The structured question tool**");
    const page = master.indexOf("2. **The host's page publisher**");
    const chat = master.indexOf("3. **Text in the chat**");
    expect(tool).toBeGreaterThan(-1);
    expect(page).toBeGreaterThan(tool);
    expect(chat).toBeGreaterThan(page);
    expect(master).toContain(
      "its page is private to the user by default, such as an Artifact on Claude Code.",
    );
    expect(master).toContain(
      "A set presented as one, such as a grilling round, takes one carrier: the first that carries every member.",
    );
    expect(master).toContain("no secret, credential or personal data");
  });

  it("uses a page not known to be private, a Codex Site included, only under a standing instruction", async () => {
    const master = await read(rel);
    expect(master).toContain(
      "A page whose default audience is not known to be the user alone is used only where a standing instruction covers publishing it. Otherwise the sheet goes to the chat as text, and nothing is asked.",
    );
    expect(master).toContain(
      "Where the agent cannot confirm a page is private, it treats the page as not private.",
    );
    expect(master).toContain(
      "A Site in the Codex app is not known to be private, so it is used only under a standing instruction",
    );
  });
});

// QFAI:EX-0001-0239-05
// QFAI:EX-0001-0239-06
describe.each(MASTERS)("%s fixes the reply text", (rel) => {
  it("gives each form a grammar whose first line names the form", async () => {
    const master = await read(rel);
    for (const form of ["choose", "mark up", "sort", "compare"]) {
      expect(master, form).toContain(`Reply: ${form} <sheet title>`);
    }
    expect(master).toContain(
      "Where a page has a reply control, it produces the same text the chat form asks for",
    );
  });

  it("applies a note to its passage only and puts an unplaced item again", async () => {
    const master = await read(rel);
    expect(master).toContain("A note changes the passage it names and nothing else.");
    expect(master).toContain("Every sort has a column that declines the item");
    expect(master).toContain(
      "An item the reply neither places nor drops is put again in one sort; it is never assumed",
    );
    expect(master).toContain(
      "an item that is a decision some document requires the user to record is still put, and nothing else is put again.",
    );
  });
});

// QFAI:EX-0001-0239-07
describe("the rules that put questions point to the reply forms", () => {
  it.each(["user-questions.md", "grilling.md", "session-feedback.md"])(
    "%s points to the rule",
    async (name) => {
      for (const tree of [".agents/rules", SHIPPED_RULES]) {
        expect(await read(path.join(tree, name)), tree).toContain("`reply-forms.md`");
      }
    },
  );

  it.each([".agents/rules", SHIPPED_RULES])(
    "the fallbacks in %s name the page carrier ahead of chat text",
    async (tree) => {
      expect(await read(path.join(tree, "user-questions.md"))).toContain(
        "The question goes on a page where `reply-forms.md` § 2 sends it.",
      );
      expect(await read(path.join(tree, "grilling.md"))).toContain(
        "including the host page it tries before chat text (`reply-forms.md` § 2)",
      );
    },
  );
});

// QFAI:EX-0001-0239-08
describe.each(MASTERS)("%s adds nothing that waits on the user", (rel) => {
  it("adds no question, step or gate, and is silent under a no-question mode", async () => {
    const master = await read(rel);
    expect(master).toContain("It adds no question, step or gate.");
    expect(master).toContain("Under a no-question mode nothing is published and nothing is asked.");
  });
});

// QFAI:EX-0001-0239-09
describe("the entry points cite the rule", () => {
  it("this repository's AGENTS.md lists the rule in its rule table", async () => {
    expect(await read("AGENTS.md")).toContain("| `reply-forms.md` |");
  });

  it.each([
    ".github/copilot-instructions.md",
    "packages/qfai/assets/init/root/AGENTS.md",
    // The list `qfai init` adds to a project that already has an entry point.
    "packages/qfai/src/cli/commands/init.ts",
  ])("%s cites the rule master", async (rel) => {
    expect(await read(rel)).toContain("`.agents/rules/reply-forms.md`");
  });
});

// QFAI:EX-0001-0239-10
describe.each(MASTERS)("%s stays readable", (rel) => {
  it("holds 500 lines or fewer", async () => {
    const lines = (await readFile(path.join(ROOT, rel), "utf-8")).trimEnd().split("\n").length;
    expect(lines).toBeLessThanOrEqual(500);
  });
});

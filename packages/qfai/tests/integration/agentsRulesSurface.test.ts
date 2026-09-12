import { readdirSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

/**
 * Every rule master, read off the directory.
 *
 * The two cases below used to iterate a list written beside them, which made
 * each of them ask about the rules someone remembered to add rather than the
 * rules that exist: a master registered in neither `README.md` nor
 * `.claude/rules/` had no entry, so nothing asked about it and both passed.
 * Read from disk, a master that skips either step is named by the case that
 * finds it missing.
 *
 * Synchronous because `it.each` needs the names while the file is collected.
 */
const RULE_MASTERS = readdirSync(path.join(ROOT, ".agents/rules"))
  .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
  .sort();

async function readMaybeSymlink(linkPath: string): Promise<string> {
  return readFile(linkPath, "utf-8");
}

async function isSymlinkTo(linkPath: string, masterPath: string): Promise<boolean> {
  const stat = await lstat(linkPath);
  if (!stat.isSymbolicLink()) return false;
  const linkReal = await realpath(linkPath);
  const masterReal = await realpath(masterPath);
  return linkReal === masterReal;
}

describe("cross-AI rules surface (.agents/rules/ master)", () => {
  it("master version-discipline.md exists with required content", async () => {
    const text = await readFile(path.join(ROOT, ".agents/rules/version-discipline.md"), "utf-8");
    for (const term of [
      "ブランチ",
      "package\\.json",
      "chore\\(release\\)",
      "Version Discipline",
      "VERSION_PIN_SKIP",
      "禁止",
    ]) {
      expect(text).toMatch(new RegExp(term));
    }
  });

  it("finds the rule masters it reads the directory for", () => {
    // An empty read passes both cases below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    expect(RULE_MASTERS.length, ".agents/rules holds no rule master").toBeGreaterThan(0);
    expect(RULE_MASTERS, "README.md is the register, not a rule").not.toContain("README.md");
  });

  it(".agents/rules/README.md lists every rule in the directory", async () => {
    const text = await readFile(path.join(ROOT, ".agents/rules/README.md"), "utf-8");
    for (const name of RULE_MASTERS) {
      expect(text, `${name} is a rule master that README.md does not register`).toContain(name);
    }
  });

  it.each(RULE_MASTERS)(".claude/rules/%s resolves to the master", async (fileName) => {
    const link = path.join(ROOT, ".claude/rules", fileName);
    const master = path.join(ROOT, ".agents/rules", fileName);
    if (await isSymlinkTo(link, master)) {
      // Symlink path: the resolved master must equal the master file.
      expect(await realpath(link)).toBe(await realpath(master));
      return;
    }
    // Non-symlink fallback, two shapes:
    //   1. The file was committed as a regular file on a platform that
    //      supports symlinks. Content equality with the master is the
    //      contract.
    //   2. Windows without `core.symlinks=true` / Developer Mode. Git writes
    //      the link as a one-line text file holding the relative target path
    //      (e.g. `../../.agents/rules/version-discipline.md`). Content
    //      equality fails by construction, so the contract is that the path
    //      resolves to the master. `.agents/rules/README.md` documents the
    //      setup.
    const linked = await readMaybeSymlink(link);
    const trimmed = linked.trim();
    const looksLikeRelativePath = /^\.\.\/.+\.md$/.test(trimmed);
    if (looksLikeRelativePath) {
      // Validate the path string actually points at the master.
      const linkDir = path.dirname(link);
      const resolvedTarget = path.resolve(linkDir, trimmed);
      expect(path.resolve(master)).toBe(resolvedTarget);
      return;
    }
    const masterText = await readFile(master, "utf-8");
    expect(linked).toBe(masterText);
  });

  it("AGENTS.md references the master rules directory and version-discipline", async () => {
    const text = await readFile(path.join(ROOT, "AGENTS.md"), "utf-8");
    expect(text).toMatch(/バージョン規律/);
    expect(text).toMatch(/\.agents\/rules\/version-discipline\.md/);
    expect(text).toMatch(/\.agents\/rules\//);
  });

  it(".github/copilot-instructions.md references .agents/rules/", async () => {
    const text = await readFile(path.join(ROOT, ".github/copilot-instructions.md"), "utf-8");
    expect(text).toMatch(/\.agents\/rules\//);
    expect(text).toMatch(/version-discipline/);
  });

  it("CLAUDE.md references the version-discipline rule", async () => {
    const text = await readFile(path.join(ROOT, "CLAUDE.md"), "utf-8");
    expect(text).toMatch(/version-discipline/);
  });

  // A repository-only rule, like `document-schema.md`: it governs what this
  // tree stores, and `packages/qfai/assets/init/root/.agents/rules/` does not
  // carry it. An adopter picks the language of their own repository, and a
  // copy under the shipped masters would both say otherwise and oblige every
  // shipped entry point to cite it.
  describe("repository-language rule", () => {
    const MASTER = ".agents/rules/repository-language.md";

    it("states the scope and both exclusions", async () => {
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/written in English/);
      // One token per clause that no other clause carries, so a clause cannot
      // be dropped while the master still looks complete.
      for (const clause of [
        /CHANGELOG\.md/,
        /communication\.md/,
        /qfai init/,
        /cliMessageLanguage/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    it.each(["AGENTS.md", "CLAUDE.md"])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("repository-language.md");
    });

    it("is not shipped to adopters", async () => {
      const shipped = path.join(
        ROOT,
        "packages/qfai/assets/init/root/.agents/rules/repository-language.md",
      );
      await expect(lstat(shipped)).rejects.toThrow();
    });
  });

  // The writing standard reaches an agent two ways: as a rule master every
  // entry point cites, and as the hook reminder that restates it at the moment
  // it is easiest to skip. Both halves are asserted, in this repository and in
  // the tree `qfai init` writes, because either one alone leaves the other free
  // to drift out of the surface without a test noticing.
  describe("documentation-clarity rule", () => {
    const MASTERS = [
      ".agents/rules/documentation-clarity.md",
      "packages/qfai/assets/init/root/.agents/rules/documentation-clarity.md",
    ];

    it.each(MASTERS)("%s states every clause of the standard", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/documentation-clarity|Documentation Clarity/i);
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [/#123|GH-123/, /git (history|log)/, /PostToolUse/]) {
        expect(text).toMatch(clause);
      }
    });

    // An entry point may summarise the rule or point at it, and a summary that
    // ENUMERATES the forbidden identifiers has to carry the exemption in the
    // same breath. Without it the summary forbids what the master directs — the
    // master puts numbers and links in the pull request, the issue, the commit
    // message and the changelog — and a reader who stops at the summary reports
    // every changelog entry as a violation.
    //
    // Read over the BULLET, not the file. Every one of these documents names
    // the changelog somewhere else (the version-discipline section does), so a
    // whole-file search matches whatever the clause says and the check passes
    // on a summary that contradicts its own master.
    it("no entry point enumerates the identifiers without naming the exemption", async () => {
      const entryPoints = [
        "AGENTS.md",
        "CLAUDE.md",
        ".github/copilot-instructions.md",
        "packages/qfai/assets/init/root/AGENTS.md",
        "packages/qfai/assets/init/root/CLAUDE.md",
      ];
      const enumerates = /issue\/PR 番号|issue 番号 \/ PR 番号|issue or pull request numbers/;
      const contradicting: string[] = [];
      for (const rel of entryPoints) {
        const text = await readFile(path.join(ROOT, rel), "utf-8");
        // The bullet that enumerates, with its continuation lines: from its own
        // `- ` to the next bullet or blank line.
        const bullet = text
          .split(/\r?\n/)
          .reduce<string[]>((blocks, line) => {
            if (/^\s*-\s/.test(line) || line.trim() === "") blocks.push(line);
            else if (blocks.length > 0) blocks[blocks.length - 1] += `\n${line}`;
            return blocks;
          }, [])
          .find((block) => enumerates.test(block));
        if (bullet !== undefined && !/CHANGELOG/i.test(bullet)) contradicting.push(rel);
      }
      expect(
        contradicting,
        "an entry point whose identifier clause does not name the surfaces the master exempts",
      ).toEqual([]);
    });

    it.each(
      [
        ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"],
        ["packages/qfai/assets/init/root/AGENTS.md", "packages/qfai/assets/init/root/CLAUDE.md"],
      ].flat(),
    )("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("documentation-clarity.md");
    });
  });

  // The ladder governs how much code implements a behaviour, which is a
  // question an adopter's repository asks as often as this one — so the master
  // is shipped, and both copies are held to the same clauses.
  describe("minimal-implementation rule", () => {
    const MASTERS = [
      ".agents/rules/minimal-implementation.md",
      "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        /standard library/i,
        /already-installed dependency/i,
        /trust boundary/i,
        /accessibility/i,
        /SIMPLIFIED:/,
        /Lift when:/,
        /Change Request/i,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // The two halves of the marker are one obligation. A ceiling with no
    // lifting condition reads as an oversight, which is the state the marker
    // exists to keep a deliberate shortcut out of — so a master that named only
    // the ceiling would leave the rule saying nothing the reader must do.
    it.each(MASTERS)("%s requires both halves of the marker", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/[Bb]oth halves are required/);
    });

    it.each([
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "packages/qfai/assets/init/root/AGENTS.md",
      "packages/qfai/assets/init/root/CLAUDE.md",
      // The list `qfai init` appends to a project that already has an entry
      // point. A project with its own `AGENTS.md` keeps it, so this is the only
      // rule list that population ever sees.
      "packages/qfai/src/cli/commands/init.ts",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("minimal-implementation.md");
    });

    // The one-line version that stood in `AGENTS.md` said the same thing in a
    // different vocabulary and in a language the repository does not write in,
    // and pointed at a checklist nothing loaded on its own. Two statements of
    // one rule is what this master replaces, so neither comes back beside it.
    //
    // Named by full path. A second checklist under `01_specialties/` is a
    // different document that this rule does not speak for, and a bare filename
    // would claim it.
    it("AGENTS.md carries no second statement of the rule", async () => {
      const text = await readFile(path.join(ROOT, "AGENTS.md"), "utf-8");
      expect(text).not.toMatch(/SOLID\/KISS\/YAGNI\/DRY/);
      expect(text).not.toContain(".instruction/00_universal/development-principles-checklist.md");
    });
  });

  // What may appear on an interface is a question an adopter's product asks
  // more often than this repository does, so the master is shipped and both
  // copies are held to the same clauses.
  describe("interface-clarity rule", () => {
    const MASTERS = [
      ".agents/rules/interface-clarity.md",
      "packages/qfai/assets/init/root/.agents/rules/interface-clarity.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        /surface the mechanism/i,
        /help text to explain the interface/,
        /displaces signal/,
        /One primary purpose per view/,
        /disclosure/,
        /perform every task it declares/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // The rule cuts text off an interface, and the one piece of text it must
    // never cut is the label: WCAG 3.3.2 requires one, and a placeholder
    // standing in for it is a documented failure. A master that stated the
    // cutting without the exemption would trade one defect for an
    // accessibility failure, which is the single way this rule can do harm.
    it.each(MASTERS)("%s protects the label it never removes", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/WCAG 3\.3\.2/);
      expect(text).toMatch(/placeholder/i);
    });

    // A terminal is an interface. Without that sentence the rule reads as a
    // web rule, and a command-line surface — which is the only interface this
    // repository itself has — falls outside the only rule written for it.
    it.each(MASTERS)("%s covers a command-line surface too", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/command-line tool has an interface/);
      expect(text).toMatch(/Terminal output/);
    });

    // Three documents answer three questions about one screen: where a thing
    // comes from, how much code implements it, and what may appear on it. The
    // `## Related` section is what keeps a reader who arrives at one of them
    // from answering a question the other two own.
    it.each(MASTERS)("%s names the neighbouring documents", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      for (const neighbour of [
        "documentation-clarity.md",
        "minimal-implementation.md",
        ".qfai/assistant/catalog/ui-definition-protocol.md",
      ]) {
        expect(text).toContain(neighbour);
      }
    });

    it.each([
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "packages/qfai/assets/init/root/AGENTS.md",
      "packages/qfai/assets/init/root/CLAUDE.md",
      // The list `qfai init` appends to a project that already has an entry
      // point, and the only rule list a populated project ever sees.
      "packages/qfai/src/cli/commands/init.ts",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("interface-clarity.md");
    });

    // The consumers. An entry point makes the rule loadable; these are the
    // places an agent is already reading when it is about to write the
    // sentence, which is where a rule it has not opened still reaches it.
    it.each([
      "packages/qfai/assets/init/.qfai/assistant/catalog/cli-ux-guidelines.md",
      "packages/qfai/assets/init/.qfai/assistant/agents/product-experience-architect.md",
      "packages/qfai/assets/init/.qfai/assistant/agents/frontend-engineer.md",
      "packages/qfai/assets/init/.qfai/assistant/agents/product-surface-reviewer.md",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain(".agents/rules/interface-clarity.md");
    });
  });

  // The form a question arrives in is the same wherever an agent works, so the
  // master ships and both copies are held to the same clauses.
  describe("user-questions rule", () => {
    const MASTERS = [
      ".agents/rules/user-questions.md",
      "packages/qfai/assets/init/root/.agents/rules/user-questions.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries.
      for (const clause of [
        /No exceptions/i,
        /short\s+label/,
        /Recommend/,
        // The whole clause, not the phrase: "numbered list" also appears in
        // the counter-example two paragraphs down, so the short token stays
        // green with the requirement itself deleted.
        /Where\s+there\s+are\s+choices,\s+that\s+is\s+a\s+numbered\s+list\s+keeping\s+every\s+part/,
        /question\s+budget/i,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // An exception is where an agent goes when it would rather not ask, and the
    // question it skips is the one it was least sure of. Stated as a reason
    // rather than a prohibition, because a prohibition invites a search for the
    // case it does not cover.
    it.each(MASTERS)("%s admits no light question", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/no\s+class\s+of\s+question\s+light\s+enough\s+to\s+skip\s+it/);
      expect(text).toMatch(/would\s+rather\s+not\s+ask/);
    });

    // Availability is judged per question, not per host. A tool present but
    // withheld in this mode is the fallback's case; a tool that cannot carry the
    // answer's shape — a multiple-answer question put to exclusive options — is
    // not callable for that question, and forcing it loses the constraint.
    it.each(MASTERS)("%s judges the tool per question", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/at\s+the\s+moment\s+the\s+question\s+is\s+asked/);
      expect(text).toMatch(/Callable\s+for\s+this\s+question,\s+not\s+in\s+general/);
      expect(text).toMatch(/one\s+yes-or-no\s+per\s+option/);
    });

    // A recommendation invented to satisfy a host that requires one is the
    // failure the clause exists to prevent, so the conflict resolves the other
    // way: the cheapest option to reverse goes first, and the description says
    // the choice is close.
    it.each(MASTERS)("%s never invents a recommendation", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Where\s+no\s+option\s+is\s+better,\s+say\s+that\s+too/);
      expect(text).toMatch(/cheapest\s+to\s+reverse/);
    });

    // Reading the limit off the tool is what keeps the rule followable on a host
    // that takes fewer questions than any number written here would assume.
    it.each(MASTERS)("%s reads the host's limit rather than naming one", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Read\s+the\s+limit\s+off\s+the\s+tool/);
      expect(text).toMatch(/Do\s+not\s+hard-code\s+a\s+number/);
      // The three properties a split has to respect, or it becomes a way to ask
      // past a cap, to override a stop, or to act on half a set.
      expect(text).toMatch(/set\s+is\s+fixed\s+before\s+the\s+first\s+call/i);
      expect(text).toMatch(/Read\s+each\s+batch's\s+answers\s+for\s+a\s+stop/);
      expect(text).toMatch(/No\s+answer\s+is\s+acted\s+on\s+until\s+the\s+set\s+is\s+exhausted/);
    });

    // The selection constraint is the part a numbered list loses, and losing it
    // changes the question: "pick one" and "pick all that apply" are different.
    it.each(MASTERS)("%s keeps the selection constraint in the fallback", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/how\s+many\s+options\s+may\s+be\s+chosen/);
      expect(text).toMatch(/Say\s+why\s+the\s+tool\s+was\s+not\s+callable/);
    });

    // The fallback carries the answer's shape, not a list unconditionally. A
    // question whose answer is a name or a number has no choices to enumerate,
    // and requiring a list there has an agent invent two options to fit it —
    // which is the guess the recommendation clause refuses, in another costume.
    it.each(MASTERS)("%s does not force an open answer into a list", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/in\s+the\s+shape\s+the\s+answer\s+has/);
      expect(text).toMatch(/a\s+plain\s+request\s+for\s+the\s+value/);
      expect(text).toMatch(/not\s+the\s+same\s+as\s+"always\s+a\s+list\s+of\s+choices"/);
    });

    // The form and the count are independent. Without this the rule reads as a
    // licence to ask more, and a well-shaped question that should not be asked
    // is still one that should not be asked.
    it.each(MASTERS)("%s says what it is not", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Not\s+a\s+question\s+budget/);
      expect(text).toMatch(/Not\s+a\s+reason\s+to\s+ask\s+more/);
      expect(text).toMatch(/what\s+the\s+environment\s+can\s+settle/);
    });

    it.each([
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "packages/qfai/assets/init/root/AGENTS.md",
      "packages/qfai/assets/init/root/CLAUDE.md",
      "packages/qfai/src/cli/commands/init.ts",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("user-questions.md");
      // Naming the master is not summarising it. These surfaces are where a
      // rule is discovered, and one that still promises numbered choices for
      // every answer sends an agent to invent options for an open value before
      // it ever opens the master.
      expect(text).toMatch(/in\s+the\s+shape\s+its\s+answer\s+has/);
      expect(text).toMatch(/a\s+plain\s+request/);
      expect(text).not.toMatch(/numbered\s+plain-text\s+choices\s+keep\s+the\s+same\s+parts/);
    });

    // The two rules divide one subject: which questions to ask, and what each
    // one looks like. A grilling round is delivered under this rule's § 4, so
    // the pointer is what stops the mechanics being written twice.
    it.each([
      ".agents/rules/grilling.md",
      "packages/qfai/assets/init/root/.agents/rules/grilling.md",
    ])("%s points at the question form", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("user-questions.md");
      // A round can hold a question asking for a fact, and this same rule says
      // such a question carries no options and no recommended answer. A
      // fallback demanding numbered choices for the whole round contradicts
      // that, in the one document that states both.
      expect(text).toMatch(/in\s+the\s+shape\s+each\s+answer\s+has/);
      expect(text).toMatch(
        /a\s+plain\s+request\s+for\s+the\s+value\s+where\s+it\s+asks\s+for\s+a\s+fact/,
      );
    });
  });

  // A decision tree is a thing an adopter's project has as much as this one
  // does, so the master is shipped and both copies are held to the same
  // clauses.
  describe("grilling rule", () => {
    const MASTERS = [
      ".agents/rules/grilling.md",
      "packages/qfai/assets/init/root/.agents/rules/grilling.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        /[Dd]esign tree/,
        /[Ff]rontier/,
        /[Rr]ound/,
        /recommended answer/i,
        /sub-agent/i,
        /throwaway version/i,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // The two halves of the end condition are one obligation. An empty frontier
    // alone is the state an agent reaches by running out of questions, which is
    // the failure this rule exists to name — so a master that stopped at the
    // frontier would license the behaviour it forbids.
    it.each(MASTERS)("%s requires both halves of the end condition", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/frontier\s+is\s+empty/i);
      expect(text).toMatch(/confirms\s+the\s+understanding\s+is\s+shared/i);
    });

    // A cap is the one mechanism that would make the rule self-defeating: it
    // ends a session on a number rather than on the work being done, which is
    // what the rule replaces. Asserted because a later editor reaching for a cap
    // would otherwise find nothing in the way.
    it.each(MASTERS)("%s sets no question cap", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/no\s+question\s+cap/i);
    });

    // Facts and decisions are separated so an agent cannot spend the user's
    // attention on something it could look up, nor settle on their behalf
    // something only they can settle.
    it.each(MASTERS)("%s separates facts from decisions", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(
        /[Nn]ever\s+ask\s+the\s+user\s+for\s+something\s+you\s+could\s+look\s+up/,
      );
      expect(text).toMatch(/answers its own\s+decisions/);
    });

    // Without a fallback the rule has no compliant path on a host that offers
    // no structured question tool: it orders a round asked through one, and an
    // agent that cannot reach it can only skip the session.
    it.each(MASTERS)("%s gives a fallback for a host without the tool", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/no\s+such\s+tool/i);
      expect(text).toMatch(/numbered\s+choices/i);
    });

    // The prototype answers a question talking cannot; it does not hand the
    // agent the answer. A master that stopped at "build it" would let an agent
    // settle a question of taste on the user's behalf, one clause after saying
    // decisions are theirs.
    it.each(MASTERS)("%s returns the prototype to the user", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/put\s+it\s+in\s+front\s+of\s+the\s+user/i);
      expect(text).toMatch(/does\s+not\s+transfer\s+the\s+decision/i);
    });

    // A no-question run is the one place the rule and a no-question mode could
    // deadlock. It resolves toward the open question, which is what stops the
    // work completing over a decision nobody took.
    //
    // The labelled value is allowed beside it, and has to be: a discussion pack
    // under `--auto` takes the conventional design direction, labels it
    // `chosen_by: assumption` and opens the register entry, and the pack cannot
    // complete while that entry is open. Forbidding the value outright would
    // leave that run with no artifact it is permitted to write. What the rule
    // refuses is the assumption standing alone.
    // Without a boundary the trigger reads as "ask whenever a design decision
    // comes up", and every such question then carries the budget exemption with
    // it. The class has to be decidable when the question is asked, which means
    // it turns on whether a session was declared.
    it.each(MASTERS)("%s makes a session a mode, not a posture", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/entered\s+deliberately/);
      expect(text).toMatch(/an\s+ambiguity\s+found\s+while\s+implementing/);
      expect(text).toMatch(/ordinary\s+clarification,\s+capped\s+as\s+one/);
    });

    // A date nobody published, a number only the user knows: no lookup reaches
    // it. Off the frontier, the decision below it waits on a node no round asks,
    // so the frontier never empties and the session cannot end.
    it.each(MASTERS)("%s puts a user-held fact on the frontier", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/[Ff]act\s+only\s+the\s+user\s+holds/);
      expect(text).toMatch(/nothing\s+else\s+can\s+put\s+it\s+there/);
      expect(text).toMatch(/never\s+offered\s+as\s+a\s+choice/);
    });

    // Recommending a value the agent does not hold is a guess, and attaching it
    // to the question invites the user to accept it.
    it.each(MASTERS)("%s recommends nothing on a question for a fact", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/asking\s+for\s+a\s+fact\s+carries\s+no\s+recommended\s+answer/i);
    });

    // The frontier empties while a lookup is in flight, so an end condition
    // reading the frontier alone closes the session before the lookup can raise
    // the questions it was dispatched to answer.
    it.each(MASTERS)("%s holds the end condition open for a running lookup", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/no\s+lookup\s+is\s+still\s+running/);
      expect(text).toMatch(/about\s+the\s+whole\s+tree/);
    });

    // Article VI gives all three answers a meaning. Without them here an agent
    // inside a session has to choose which document to follow, and the rule as
    // written says a session ends on its own terms and no others.
    it.each(MASTERS)("%s gives the user a way to end a session", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/ends\s+it\s+immediately,\s+frontier\s+empty\s+or\s+not/);
      expect(text).toMatch(/ends\s+the\s+asking,\s+not\s+the\s+work/);
      // The two kinds `proceed` never covers, or a waiver would swallow a
      // mandatory approval and an undefaultable input along with the rest.
      expect(text).toMatch(/never\s+assumed\s+when\s+the\s+questions\s+close/);
    });

    // A split that recomputed the frontier, or acted on a batch before the round
    // finished, would be two rounds wearing one name — and a closing answer in
    // an early batch would be read only after the agent had carried on past it.
    it.each(MASTERS)("%s keeps a batched round one round", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/frontier\s+is\s+not\s+recomputed\s+between\s+them/);
      expect(text).toMatch(/read\s+for\s+a\s+closing\s+answer\s+before\s+the\s+next\s+is\s+put/);
      expect(text).toMatch(/it\s+never\s+makes\s+two\s+rounds/);
    });

    // Precision and settledness are different things, and only the second ends
    // the need for a session. A choice between two fully specified options is
    // precise and still open, so an exit keyed on how well the subject can be
    // stated lets an agent skip the interview and then decide for the user.
    it.each(MASTERS)("%s keys the exit on the decision, not on precision", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/the\s+decision\s+being\s+settled,\s+not\s+the\s+subject/);
    });

    // Agreement is not evidence the session was unnecessary: the user's
    // preferences may simply match, and the decisions were still theirs to
    // authorise. Read as a success criterion, it teaches an agent to skip the
    // next interview on the strength of the last one going smoothly.
    it.each(MASTERS)("%s does not read agreement as a wasted session", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Agreeing\s+with\s+every\s+recommendation\s+is\s+a\s+fine/);
      expect(text).not.toMatch(/session\s+that\s+was\s+not\s+needed/);
    });

    it.each(MASTERS)("%s resolves a no-question run to open questions", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/[Uu]nder\s+a\s+no-question\s+mode/);
      expect(text).toMatch(/opens\s+every\s+decision\s+left\s+over\s*\n?\s*as\s+a\s+question/);
      expect(text).toMatch(
        /write\s+the\s+defaulted\s+value\s*\n?\s*and\s+label\s+it\s+an\s+assumption/,
      );
      expect(text).toMatch(/the\s*\n?\s*assumption\s+on\s+its\s+own/);
    });

    it.each([
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "packages/qfai/assets/init/root/AGENTS.md",
      "packages/qfai/assets/init/root/CLAUDE.md",
      // The list `qfai init` appends to a project that already has an entry
      // point. A project with its own `AGENTS.md` keeps it, so this is the only
      // rule list that population ever sees.
      "packages/qfai/src/cli/commands/init.ts",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("grilling.md");
    });
  });
});

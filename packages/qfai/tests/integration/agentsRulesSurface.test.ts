import { readdirSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

describe("excess vocabulary covers code and product surface without adding tags", () => {
  const TAGS = ["delete", "stdlib", "native", "yagni", "shrink"];

  it("the repository definitions cover controls, settings, copy and repository reuse", async () => {
    const text = await readFile(path.join(ROOT, "REVIEW.md"), "utf-8");
    const excess = text.split("## Findings about excess")[1]?.split(/^## /m)[0];
    expect(excess).toBeDefined();
    const tags = Array.from(excess?.matchAll(/^\|\s*`([^`]+)`\s*\|/gm) ?? [], (match) => match[1]);
    expect(tags).toEqual(TAGS);
    expect(excess?.replace(/\s+/g, " ")).toContain("code, controls, settings and explanatory copy");
    expect(excess).toContain("code already present");
    expect(excess).toContain(".agents/rules/interface-clarity.md");
    expect(excess).toContain("§ 2");
  });

  it.each(
    ["packages/qfai/assets/init/.qfai", ".qfai"].flatMap((tree) =>
      [
        "architecture-reviewer",
        "completion-reviewer",
        "implementation-reviewer",
        "product-surface-reviewer",
        "qa-gatekeeper",
        "requirements-reviewer",
      ].map((role) => ({ tree, role })),
    ),
  )("$tree/$role ships the same vocabulary and product scope", async ({ tree, role }) => {
    const text = await readFile(path.join(ROOT, tree, "assistant/agents", `${role}.md`), "utf-8");
    const routes = text.match(/^- File excess .*(?:\r?\n {2}.+)*/gm);
    expect(routes).toHaveLength(1);
    const excess = routes?.[0]?.replace(/\s+/g, " ");
    expect(excess).toBeDefined();
    for (const tag of TAGS) expect(excess).toContain("`" + tag + "`");
    expect(excess).toContain("code, controls, settings and explanatory copy");
    expect(excess).toContain("`delete` also covers replacement by code already present.");
    expect(excess).toContain(".agents/rules/interface-clarity.md");
    expect(excess).toContain("§ 2");
    expect(excess).toContain("`defect:code-quality` against constitution Article VII");
    expect(excess).toContain("Admit it only when it names what to cut and what replaces it.");
    expect(excess).toContain(
      "Refuse it when the cut removes or weakens an obligation in the safety floor",
    );
    expect(excess).toContain(
      "Use this route only where the installed Article VII governs the artifact.",
    );
    expect(excess).toContain("Otherwise report unsupported Article VII excess as advisory");
    expect(text).not.toMatch(/^- Apply .*tag excess/m);
  });
});

describe("the implementation reviewer flags dropped promises, not uncaught propagation", () => {
  it.each(["packages/qfai/assets/init/.qfai", ".qfai"])(
    "%s keeps the correctness class",
    async (tree) => {
      const card = await readFile(
        path.join(ROOT, tree, "assistant/agents/implementation-reviewer.md"),
        "utf-8",
      );
      expect(card.replace(/\s+/g, " ")).toContain("a promise that is neither awaited nor returned");
      expect(card).not.toContain("unhandled async paths");
      const classification = await readFile(
        path.join(
          ROOT,
          tree,
          "assistant/skills/qfai-implement/references/finding-classification.md",
        ),
        "utf-8",
      );
      expect(classification).toContain("defect:correctness");
      expect(classification).toContain("unhandled rejection");
    },
  );
});

describe("reviewer stop conditions distinguish named-rule defects from new product obligations", () => {
  it.each(
    ["packages/qfai/assets/init/.qfai", ".qfai"].flatMap((tree) =>
      ["completion-reviewer", "implementation-reviewer"].map((role) => ({ tree, role })),
    ),
  )("$tree/$role retains the named-rule defect route", async ({ tree, role }) => {
    const text = await readFile(path.join(ROOT, tree, "assistant/agents", `${role}.md`), "utf-8");
    const stop = text.split("## Stop conditions")[1]?.split(/^## /m)[0]?.replace(/\s+/g, " ");
    expect(stop).toBeDefined();
    expect(stop).toContain("The finding would add a product obligation upstream never asked for.");
    expect(stop).toContain("raise it as an advisory finding plus a Change Request proposal");
    expect(stop).toContain("a regression against a named constitution or catalog rule");
    expect(stop).toContain("it stays blocking and traces to its `defect:*` class");
  });
});

describe("repository async guidance agrees with the retained-failure test", () => {
  it.each(["CLAUDE.md", "REVIEW.md", "AGENTS.md"])(
    "%s preserves propagation and the whole floor",
    async (file) => {
      const text = await readFile(path.join(ROOT, file), "utf-8");
      const flat = text.replace(/\s+/g, " ").toLowerCase();
      expect(flat).toContain("await or return every promise");
      expect(flat).toContain(".agents/rules/minimal-implementation.md");
      expect(flat).toContain("§ 2");
      expect(flat).toContain("governs consuming callers, kept failures and callback boundaries");
      expect(flat).not.toContain("returning propagates only when its caller awaits or adopts");
      expect(flat).not.toContain("do not add a catch for a failure that no specification");
      expect(flat).not.toContain("require an adapter that adopts asynchronous work");
      expect(flat).not.toContain("every async path must have explicit error handling");
      if (file === "REVIEW.md") {
        expect(flat).not.toContain("missing error handling or incomplete error messages");
        expect(flat).toContain("incomplete error messages");
        expect(flat).toContain("neither awaited nor returned");
      }
    },
  );
});

describe("the retained-failure test stays under the safety floor", () => {
  it.each([
    ".agents/rules/minimal-implementation.md",
    "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md",
  ])("%s names the criterion, propagation and process boundary", async (relative) => {
    const text = await readFile(path.join(ROOT, relative), "utf-8");
    const failure = text.split("### Which failures are handled here")[1]?.split(/^## /m)[0];
    expect(failure).toBeDefined();
    const flat = failure?.replace(/\s+/g, " ");
    expect(flat).toContain("Subject to the safety floor in this section");
    expect(flat).toContain("no type or schema excludes it");
    expect(flat).toContain("the specification, a contract or an actual observation names it");
    expect(flat).toContain(
      "only when both hold: no type or schema excludes it, and the specification, a contract or an actual observation names it. Other failures propagate to the caller.",
    );
    expect(flat).toContain(
      "Every promise is awaited or returned to a caller that awaits or adopts it, never dropped",
    );
    expect(flat).toContain("callback runtime ignores returned promises");
    expect(flat).toContain(
      "Subject to the same floor, when a callback runtime ignores returned promises, " +
        "use an explicit adapter that adopts the asynchronous result and handles " +
        "rejections at that trust boundary.",
    );
    expect(flat).toContain(
      "Do not make the callback async and assume its ignored outer promise is consumed",
    );
    expect(flat).toContain("<paths.specsDir>/spec-*/06_Test-Cases.md");
    expect(flat).toContain("Resolve `paths.specsDir` from `qfai.config.yaml`");
    expect(flat).toContain("process entry point is a trust boundary");
    expect(flat).toContain("A dropped rejection remains a correctness defect");
    expect(flat).toContain("06_Test-Cases.md");
  });

  it("keeps the operating rule byte-identical to its shipped master", async () => {
    const [master, shipped] = await Promise.all([
      readFile(path.join(ROOT, ".agents/rules/minimal-implementation.md")),
      readFile(
        path.join(ROOT, "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md"),
      ),
    ]);
    expect(master.equals(shipped)).toBe(true);
  });
});

/**
 * Every rule master, read off the directory.
 *
 * The subject is the rules that exist, not the rules a list names. Reading the
 * directory is what makes that true: a master that skips either registration —
 * `README.md` or `.claude/rules/` — is still named by the case that finds it
 * missing, because it reached the case from disk rather than from an entry
 * someone had to add.
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
      "Version Discipline",
      "branch name",
      "packaging manifest",
      "chore\\(release\\)",
      // The default, and the two ways a project says it has decided otherwise.
      "Adoption status: not adopted",
      "supersedes the master",
      // What stays the user's call whatever the branch is named.
      "create or push a release tag",
    ]) {
      expect(text).toMatch(new RegExp(term));
    }
  });

  /**
   * A rule the package ships is read here through its shipped copy.
   *
   * Two files drift, and these did: the local `distributed-surface.md` said
   * every guard follows `package.json#files` while the shipped one did not,
   * and nothing compared them. A link cannot hold two answers.
   */
  it.each(readdirSync(path.join(ROOT, "packages/qfai/assets/init/root/.agents/rules")))(
    ".agents/rules/%s is the shipped master",
    async (fileName) => {
      const local = path.join(ROOT, ".agents/rules", fileName);
      const shipped = path.join(ROOT, "packages/qfai/assets/init/root/.agents/rules", fileName);
      const stat = await lstat(local);
      expect(stat.isSymbolicLink(), `${fileName} must be a symlink to the shipped master`).toBe(
        true,
      );
      expect(await realpath(local)).toBe(await realpath(shipped));
    },
  );

  it("finds the rule masters it reads the directory for", () => {
    // An empty read passes both cases below without asking anything, and the
    // two ways to get one — a moved directory, a filter that matches nothing —
    // look identical to a green run.
    expect(RULE_MASTERS.length, ".agents/rules holds no rule master").toBeGreaterThan(0);
    expect(RULE_MASTERS, "a README is not a rule").not.toContain("README.md");
  });

  /**
   * Each rule says what it is, in its own first heading.
   *
   * A register held in a second file is a list that can go stale: a rule added
   * and not written down was a rule nobody applied, and the list said nothing.
   * Read from the rules themselves there is nothing to keep in step — a rule
   * that cannot name itself is the only failure left, and it is the file's own.
   */
  it.each(RULE_MASTERS)("%s names itself in its first heading", async (fileName) => {
    const text = await readFile(path.join(ROOT, ".agents/rules", fileName), "utf-8");
    const first = text.split(/\r?\n/).find((line) => line.trim() !== "");

    expect(first, `${fileName} is empty`).toBeDefined();
    expect(first ?? "", `${fileName} must open with a level-1 heading naming the rule`).toMatch(
      /^# \S/,
    );
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
  describe("shipped-ci-parity rule", () => {
    const MASTER = ".agents/rules/shipped-ci-parity.md";

    it("names what is watched, what a marker says, and the three dispositions", async () => {
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      // One token per clause that no other clause carries, so a clause cannot
      // be dropped while the master still looks complete.
      for (const clause of [
        /\.github\/workflows/,
        /run-lint-checks\.sh/,
        /SHIPPED-CI:/,
        /transferred/,
        /not-applicable/,
        /deferred/,
        /shipped-ci-dispositions\.md/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // Copilot reads none of the other two, so a rule the master declares for
    // every agent reaches it only through this file.
    it.each(["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"])(
      "%s cites the rule master",
      async (rel) => {
        const text = await readFile(path.join(ROOT, rel), "utf-8");
        expect(text).toContain("shipped-ci-parity.md");
      },
    );

    it("is not shipped to adopters", async () => {
      // The rule compares this repository's CI with the templates it ships. An
      // adopter's repository ships nothing, so there is no comparison to make.
      const shipped = path.join(
        ROOT,
        "packages/qfai/assets/init/root/.agents/rules/shipped-ci-parity.md",
      );
      await expect(lstat(shipped)).rejects.toThrow();
    });
  });

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
    ] as const;

    it.each(MASTERS)("%s protects unit coverage of retained failures in the floor", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      const floor = text.split("## 2. What the ladder never removes")[1]?.split("## 3.")[0];
      expect(floor).toContain("- Unit-level coverage of the failures the code retains.");
    });

    // A sourcing decision is taken at a design stage, and contracts-first
    // freezes it before any source file exists — so a rule reaching the
    // sourcing rungs only from source reaches them after the answer is fixed.
    it.each(MASTERS)("%s reaches the sourcing rungs at the stage that decides", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("Rung 1, and rungs 2 to 5 for a sourcing decision");
      expect(text).toContain("### A sourcing decision reaches rungs 2 to 5");
      // And the restriction the widening must not dissolve.
      expect(text).toMatch(/objection to the behaviour\s+is still a Change Request/);
    });

    it("keeps the operating and shipped minimal-implementation rules byte-identical", async () => {
      const [master, shipped] = await Promise.all([
        readFile(path.join(ROOT, MASTERS[0])),
        readFile(path.join(ROOT, MASTERS[1])),
      ]);
      expect(shipped.equals(master)).toBe(true);
    });

    it.each(MASTERS)("%s gives repository reuse the second of seven rungs", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      const rungs = [...text.matchAll(/^(\d+)\. \*\*(.+?)\*\*/gm)].map((match) => [
        match[1],
        match[2],
      ]);
      expect(rungs).toEqual([
        ["1", "Does this need to exist at all?"],
        ["2", "Is it already in this codebase?"],
        ["3", "Does the standard library do it?"],
        ["4", "Does a native platform feature cover it?"],
        ["5", "Does an already-installed dependency solve it?"],
        ["6", "Can it be one line?"],
        ["7", "Only then"],
      ]);
      expect(text).toMatch(/standard library has one is not a simplification; it is rung 3\./);
      expect(text).toMatch(
        /5\. \*\*Does an already-installed dependency solve it\?\*\* Reach for what the\s+project already carries before adding anything\./,
      );
    });

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        /already in this codebase/i,
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

    it.each([
      "packages/qfai/assets/init/.qfai/assistant/constitution/constitution.md",
      ".qfai/assistant/constitution/constitution.md",
    ])("%s names this repository first among the reuse rungs", async (rel) => {
      const text = (await readFile(path.join(ROOT, rel), "utf-8")).replace(/\s+/g, " ");
      expect(text).toContain(
        "find what already covers the change, in the order the reuse rungs of `.agents/rules/minimal-implementation.md` give: this repository, including a duplicate or overlapping implementation, then the standard library, the platform, and the dependencies already installed",
      );
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
    // question whose answer has no listable set of candidates has none to
    // enumerate, and requiring a list there has an agent invent two options to
    // fit it — which is the guess the recommendation clause refuses, in another
    // costume.
    it.each(MASTERS)("%s does not force an open answer into a list", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/in\s+the\s+shape\s+the\s+answer\s+has/);
      expect(text).toMatch(/a\s+plain\s+request\s+for\s+the\s+value/);
      expect(text).toMatch(/not\s+the\s+same\s+as\s+"always\s+a\s+list\s+of\s+choices"/);
      // The parts differ by shape. An unconditional list of them sends the open
      // path looking for metadata it has none of — what each choice means, and
      // how many may be chosen.
      expect(text).toMatch(/What\s+is\s+being\s+asked,\s+and\s+what\s+depends\s+on\s+the\s+answer/);
      // And what decides is the candidate set, not the value's type: one count
      // out of the four a platform supports is a choice however scalar it looks.
      expect(text).toMatch(/whether\s+a\s+listable\s+set\s+of/);
      expect(text).toMatch(/no\s+listable\s+set\s+of\s+candidates/);
    });

    // Finite is not the same as listable. A port between 1 and 65535 has a
    // bounded set of valid values and is still open, because a list of 65535
    // options is the question made unreadable.
    it.each(MASTERS)("%s bounds the candidate set by what a question can show", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Finite\s+is\s+not\s+the\s+same\s+as\s+listable/);
      expect(text).toMatch(/put\s+in\s+front\s+of\s+someone/);
    });

    // A host that demands a recommendation cannot carry a question for a fact:
    // nothing is being decided, so no candidate is cheaper to reverse and none
    // may be recommended. Without this the two clauses meet and the agent has
    // no compliant move.
    it.each(MASTERS)("%s keeps the host workaround to decisions", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/That\s+workaround\s+is\s+for\s+decisions/);
      expect(text).toMatch(/no\s+option\s+that\s+is\s+cheaper\s+to\s+reverse/);
    });

    // A fact with listable candidates reaches the fallback because the host
    // demanded a recommendation and § 3 forbids one here. Requiring the list to
    // carry a recommendation anyway would leave that question with no
    // compliant shape at all.
    it.each(MASTERS)("%s does not require a recommendation it forbids", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/recommendation\s+\*\*where\s+one\s+is\s+permitted\*\*/);
      expect(text).toMatch(/inventing\s+one\s+to\s+fill\s+the\s*\n?\s*slot/i);
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
      // A round can hold a question the tool cannot carry, so the fallback has
      // to say what shape each answer takes. The classifier is the candidate
      // set: a user-held fact with four supported values both asks for a fact
      // and offers choices, so a fact-based split prescribes both shapes at
      // once for one question.
      expect(text).toMatch(/in\s+the\s+shape\s+each\s+answer\s+has/);
      expect(text).toMatch(/numbered\s+choices\s+where\s+a\s+listable\s+set\s+of\s+candidates/);
      expect(text).toMatch(/not\s+whether\s+the\s+question\s+asks\s+for\s+a\s+fact/);
    });

    // A round is put as a unit, so whether the tool can carry it is judged for
    // the unit. Judged per question, the grilling master's whole-round fallback
    // and this rule's per-question one prescribe two carriers for one round,
    // and no path satisfies both.
    it.each(MASTERS)("%s judges a set presented as one as one", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/A\s+set\s+presented\s+as\s+one/);
      expect(text).toMatch(/Availability\s+is\s+then\s+judged\s+for\s+the\s+unit/);
      expect(text).toMatch(/split\s+across\s+two\s+carriers/);
      // The unit decides the carrier only, never the shape of each answer.
      expect(text).toMatch(/never\s+flattens\s+two\s+shapes\s+into\s+one/);
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
        // The node a sourcing decision opens before its options, and the
        // lookup that answers it. Without them a session enumerates the shapes
        // the repository holds and escalates a choice among them, while the
        // answer somebody else already built sits outside the tree.
        /selects a source opens one node/i,
        /The environment is not only this repository/i,
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
      expect(text).toMatch(/never\s+with\s+a\s+recommended\s+answer/);
    });

    // What a fact never carries is a recommended answer. Whether it arrives as
    // options is decided by the candidate set, so a master saying both keeps an
    // agent from reading "not a choice" as licence to ask for one of four
    // supported regions as free text.
    it.each(MASTERS)("%s separates the recommendation from the answer's shape", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/Whether\s+it\s+arrives\s+as\s+options\s+is\s+a\s+separate\s+question/);
      expect(text).toMatch(/a\s+known\s+few\s+possible\s+values/);
    });

    // Recommending a value the agent does not hold is a guess, and attaching it
    // to the question invites the user to accept it.
    it.each(MASTERS)("%s recommends nothing on a question for a fact", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/asking\s+for\s+a\s+fact\s+carries\s+no\s+recommended\s+answer/i);
    });

    // Three readings sit at that clause and it refuses only one of them by
    // name. An agent that will not invent two candidates is still left choosing
    // between the tool's free-text path and plain text, and the fallback taken
    // where the tool would have carried the question drops the structure for
    // nothing.
    it.each(MASTERS)("%s says where a value with no candidates goes", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/value\s+with\s+no\s+candidates\s+goes\s+through\s+the\s+tool/);
      expect(text).toMatch(/user-questions\.md`\s+§\s+2/);
      // The fallback keeps its own three reasons, all of them about the tool.
      // Written as the host-has-none case alone it would contradict the round
      // section above, where a mode withholding the tool falls back too.
      expect(text).toMatch(/never\s+because\s+the\s+answer\s+is\s+a\s+value/);
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
      // Every node, not every decision: a fact only the user holds cannot be
      // settled from evidence either, and a mode that opens the decisions and
      // drops the facts loses the nodes no lookup could have reached.
      expect(text).toMatch(/opens\s+\*\*every\s+node\s+left\s+over\*\*\s*\n?\s*as\s+a\s+question/);
      expect(text).toMatch(/Every\s+node,\s+not\s+every\s*\n?\s*decision/);
      // An undefaultable fact has no value to write down, so the run stops.
      expect(text).toMatch(/fact\s+declared\s+undefaultable\s+stops\s+the\s+run/);
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

  // An agent in an adopter's repository calls the same API against their own
  // repository, and spends an allowance their other sessions share. So the
  // master ships, and both copies are held to the same clauses.
  describe("api-budget rule", () => {
    const MASTERS = [
      ".agents/rules/api-budget.md",
      "packages/qfai/assets/init/root/.agents/rules/api-budget.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        // The order, and each surface's own reason for its place in it.
        /Ask\s+the\s+cheapest\s+surface\s+that\s+can\s+answer/,
        /\*\*git\.\*\*/,
        /\*\*REST\.\*\*/,
        /\*\*GraphQL\.\*\*\s+A\s+separate\s+allowance,\s+counted\s+in\s+points/,
        // The set, the saved payload, and the interval.
        /One\s+call\s+for\s+the\s+set,\s+not\s+one\s+per\s+member/,
        /A\s+second\s+`grep`\s+is\s+not\s+a\s+second\s+download/,
        /Poll\s+no\s+faster\s+than\s+the\s+thing\s+changes/,
        // The instrument, and the endpoint that misreports it.
        /`rate_limit`\s+is\s+not\s+the\s+budget/,
        /the\s+response\s+to\s+a\s+call\s+that\s+was\s+going\s+to\s+be\s+made\s+anyway/,
        // Whose allowance it is, which is why one agent's habits reach the rest.
        /every\s+session,\s+sub-agent\s+and\s+background\s+task\s+draws\s+on\s+the\s+same/,
        // The command that makes the cheap path the default.
        /scripts\/gh-budget\.mjs/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    // The writing rule keeps its own hook off the shell because a tool-name
    // matcher fires on every compound command. This hook takes that matcher and
    // filters in the program instead. Without the sentence saying so, the next
    // reader cannot tell the two apart from a reversal of that decision.
    it.each(MASTERS)("%s keeps the writing rule's hook decision intact", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(
        /documentation-clarity\.md`\s+keeps\s+its\s+own\s+hook\s+off\s+the\s+shell/,
      );
      expect(text).toMatch(/that\s+decision\s*\n?\s*stands/);
      expect(text).toMatch(
        /filter\s+is\s+in\s+the\s*\n?\s*program\s+rather\s+than\s+in\s+the\s+matcher/,
      );
      // A reminder that could fail the session it is attached to is worse than
      // no reminder, so the three properties every entry keeps are stated here.
      expect(text).toMatch(/no\s+shell\s+and\s+no\s*\n?\s*network/);
      expect(text).toMatch(/Input\s+it\s*\n?\s*does\s+not\s+recognise\s+prints\s+nothing/);
    });

    it("ships to adopters", async () => {
      const shipped = path.join(ROOT, "packages/qfai/assets/init/root/.agents/rules/api-budget.md");
      expect((await lstat(shipped)).isFile()).toBe(true);
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
      expect(text).toContain("api-budget.md");
    });
  });

  // The research protocol promotes what a fetched page says into guidance later
  // stages follow, and a reviewer reads a pull request body its author wrote.
  // Both read text nobody here authored, so the rule ships and the two places
  // that act on such text point at it.
  describe("untrusted-content rule", () => {
    const MASTERS = [
      ".agents/rules/untrusted-content.md",
      "packages/qfai/assets/init/root/.agents/rules/untrusted-content.md",
    ];

    it.each(MASTERS)("%s states every clause", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      for (const clause of [
        // The surfaces that carry text the repository did not author.
        /\|\s*Tool results\s*\|/,
        /\|\s*Fetched pages\s*\|/,
        /\|\s*File contents the repository did not add\s*\|/,
        /Pull\s+request\s+and\s+issue\s+bodies/,
        /\|\s*Text a user pasted\s*\|/,
        // Data, and the one condition under which an instruction there is followed.
        /Read\s+it\s+as\s+data/,
        /followed\s+only\s+where\s+the\s+user's\s+own\s+request\s+asks\s+for\s+it/,
        // Promotion into a rule, and where the research protocol applies it.
        /becomes\s+a\s+rule\s+only\s+through\s+a\s+check/,
        /research-first-protocol\.md/,
        // The marking convention for pasted text.
        /short\s+random\s+id,\s+new\s+for\s+each\s+prompt/,
        /opening\s+and\s+a\s+closing\s+tag\s+carrying\s+that\s+id/,
        /Say\s+in\s+the\s+system\s+prompt\s+what\s+the\s+tags\s+mean/,
        // What the marks are not.
        /one\s+guardrail\s+among\s+several,\s+not\s+a\s+complete\s+defence/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    it("ships to adopters", async () => {
      const shipped = path.join(
        ROOT,
        "packages/qfai/assets/init/root/.agents/rules/untrusted-content.md",
      );
      expect((await lstat(shipped)).isFile()).toBe(true);
    });

    it.each([
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "packages/qfai/assets/init/root/AGENTS.md",
      "packages/qfai/assets/init/root/CLAUDE.md",
      "packages/qfai/src/cli/commands/init.ts",
      // The reviewer that reads a pull request's description.
      "packages/qfai/assets/init/.github/instructions/code-review.instructions.md",
    ])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("untrusted-content.md");
    });

    it.each([
      ".qfai/assistant/constitution/research-first-protocol.md",
      "packages/qfai/assets/init/.qfai/assistant/constitution/research-first-protocol.md",
    ])("%s does not apply an external source on its own strength", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("untrusted-content.md");
      expect(text).toMatch(/not\s+applied\s+on\s+the\s+strength\s+of\s+that\s+source\s+alone/);
      expect(text).toMatch(/verified\s+against\s+the\s+repository/);
    });
  });
});

describe("the question shape has one owner", () => {
  // AGENTS.md carries the template an agent reads at startup, so its rows
  // branch on the answer. The .instruction tree states no rule of its own, so
  // it points instead — a second statement is a copy that drifts, and the drift
  // is invisible until someone follows the copy.
  it("AGENTS.md branches rows 3 and 4 on the answer", async () => {
    const text = await readFile(path.join(ROOT, "AGENTS.md"), "utf-8");
    expect(text).toMatch(/where\s+the\s+answer\s+has\s+a\s+listable\s+set\s+of\s+candidates/);
    expect(text).toMatch(/where\s+a\s+choice\s+is\s+being\s+made/);
    expect(text).toContain("user-questions.md");
  });

  it(".instruction/00_universal/communication.md points at the master", async () => {
    const text = await readFile(
      path.join(ROOT, ".instruction/00_universal/communication.md"),
      "utf-8",
    );
    expect(text).toMatch(/is\s+owned\s+by/);
    expect(text).toContain("user-questions.md");
    // No copy of the form beside the pointer.
    expect(text).not.toMatch(/The\s+recommended\s+one\s+and\s+why/);
  });

  // Every shipped surface that summarises the rule uses the same criterion, so
  // an adopter is not told to enumerate a domain nobody can read.
  it.each(["packages/qfai/assets/init/root/AGENTS.md", "packages/qfai/assets/init/root/CLAUDE.md"])(
    "%s summarises it by what can be listed",
    async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toMatch(/candidates\s+can\s+be\s+listed/);
      expect(text).not.toMatch(/finite\s+candidates/);
    },
  );
});

describe("a no-question run opens every node, on every surface that says so", () => {
  // The master, the article, the operating rule and the shipped primitive all
  // carry this. An agent follows whichever it reaches first, so a copy still
  // saying "every decision" lets a user-held fact disappear while the stage
  // completes over a tree that is not empty.
  it.each([
    ".agents/rules/grilling.md",
    "packages/qfai/assets/init/root/.agents/rules/grilling.md",
    ".qfai/assistant/constitution/constitution.md",
    "packages/qfai/assets/init/.qfai/assistant/constitution/constitution.md",
    ".qfai/assistant/constitution/communication.md",
    "packages/qfai/assets/init/.qfai/assistant/constitution/communication.md",
    ".qfai/assistant/skills/qfai-grilling/SKILL.md",
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-grilling/SKILL.md",
    ".qfai/assistant/constitution/shared-skill-operating-baseline.md",
    "packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md",
  ])("%s opens nodes rather than decisions", async (rel) => {
    const text = await readFile(path.join(ROOT, rel), "utf-8");
    expect(text).toMatch(
      /(?:every|each)\s+\*{0,2}node\*{0,2}\s+(?:left\s+over|it\s+could\s+not\s+settle)/,
    );
    expect(text).not.toMatch(/(?:every|each)\s+decision\s+left\s+over/);
    expect(text).toMatch(/undefaultable/);
  });
});

describe("this repository's pull-request description", () => {
  it("keeps the operative adoption bar in the existing policy and template", async () => {
    const policy = await readFile(path.join(ROOT, "REVIEW.md"), "utf-8");
    const section = policy.split(/^## A pull request that adds a rule, skill or gate\r?\n/m)[1];
    expect(section, "the existing review policy has no adoption bar").toBeDefined();
    expect(section?.split(/^## /m)[0]?.replace(/\s+/g, " ").trim()).toBe(
      "It records three things in its description: 1. **The one-line form**: the proposal reduced to a single line that still carries its operative clause. 2. **What it adds beyond that line.** 3. **The safety-floor items it touches**, from `.agents/rules/minimal-implementation.md` § 2. Where the proposal adds nothing beyond the line, the line is what ships. Where a comparable requirement has already been run, the description cites that run's review round-trips and change size. This binds changes to this repository, not what an adopter builds with it.",
    );
    const template = await readFile(path.join(ROOT, ".github/PULL_REQUEST_TEMPLATE.md"), "utf-8");
    expect(template).toContain("## Adoption bar");
    expect(template).toContain("Required when this PR adds a rule, skill or gate");
    expect(template).toContain("operative clause");
    expect(template).toContain("What goes beyond the line");
    expect(template).toContain("Affected safety-floor items");
    expect(template).toContain("review round-trips and change size");
  });

  it("names removals, explains retained items and states an empty list explicitly", async () => {
    const policy = await readFile(path.join(ROOT, "REVIEW.md"), "utf-8");
    const removalSection = policy.split(/^## What a change made unnecessary\r?\n/m)[1];
    expect(removalSection, "the existing review policy has no removal obligation").toBeDefined();
    const obligation = removalSection?.split(/^## /m)[0]?.replace(/\s+/g, " ").trim();
    expect(obligation).toBe(
      'Every pull request lists, in its description, what the change made unnecessary, and says why anything on the list was kept. An empty list is a complete answer: it is written as "nothing", not left out.',
    );
    const template = await readFile(path.join(ROOT, ".github/PULL_REQUEST_TEMPLATE.md"), "utf-8");
    expect(template).toContain("## What this change made unnecessary");
    expect(template).toContain('write "nothing" for an empty list');
    for (const relative of [
      "AGENTS.md",
      ".github/copilot-instructions.md",
      ".github/instructions/code-review.instructions.md",
    ]) {
      const entry = await readFile(path.join(ROOT, relative), "utf-8");
      if (relative === ".github/instructions/code-review.instructions.md") {
        expect(entry).toContain("Process:\n\nRead `REVIEW.md` if present,");
      } else {
        expect(entry, relative).toContain("Read `REVIEW.md` before reviewing a pull request");
      }
      // And from a revision the pull request's author does not control. A
      // reviewer that reads the policy out of the head is taking it from the
      // work under review, which is the one place it cannot come from.
      // Either spelling of the second half, and either side of a line break.
      // The Copilot instructions file is held to a character budget a size
      // check enforces, so it says the same thing in fewer words than the
      // entry points do, and the line-length rule wraps the longer ones.
      expect(entry, relative).toMatch(
        /from\s+the\s+branch\s+the\s+pull\s+request\s+targets\s+(?:and\s+not\s+from|rather\s+than)\s+its\s+head/,
      );
    }
    const release = await readFile(
      path.join(ROOT, ".github/workflows/prepare-release.yml"),
      "utf-8",
    );
    expect(release).toContain('echo "## What this change made unnecessary"');
    expect(release).toContain("Superseded package version and Unreleased heading");
  });
});

describe("an open fact survives the surfaces that report a session", () => {
  // The wrapper is the only output a `/qfai-grill` run has, and the register is
  // where a stage's unanswered questions land. A fact only the user holds
  // disappears at either one unless both carry it.
  it.each([
    ".qfai/assistant/skills/qfai-grill/SKILL.md",
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-grill/SKILL.md",
  ])("%s reports every open node, not every open decision", async (rel) => {
    const text = await readFile(path.join(ROOT, rel), "utf-8");
    expect(text).toMatch(/every\s+node\s+left\s+open/);
    expect(text).not.toMatch(/every\s+decision\s+left\s+open/);
  });

  it.each([
    ".qfai/assistant/skills/qfai-discussion/templates/11_OQ-Register.md",
    "packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/11_OQ-Register.md",
  ])("%s has a row shape for a question asking for a fact", async (rel) => {
    const text = await readFile(path.join(ROOT, rel), "utf-8");
    expect(text).toMatch(/A\s+question\s+asking\s+for\s+a\s+fact\s+is\s+the\s+exception/);
    expect(text).toMatch(/where\s+one\s+is\s+permitted/);
  });
});

describe("trust boundaries depend on the caller's control", () => {
  it.each([
    ".agents/rules/minimal-implementation.md",
    "packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md",
  ])("%s defines external and internal calls", async (relative) => {
    const text = await readFile(path.join(ROOT, relative), "utf-8");
    const floor = text.split("## 2. What the ladder never removes")[1]?.split(/^## /m)[0];
    expect(floor).toBeDefined();
    const flat = floor?.replace(/\s+/g, " ");
    expect(flat).toContain("caller or a source the code does not control");
    for (const example of [
      "process entry",
      "external input",
      "a received request",
      "a file or database read",
      "an environment variable",
      "user input",
      "a published library's exported function",
      "a plugin or tenant context",
    ]) {
      expect(flat).toContain(example);
    }
    expect(flat).toContain("A call between functions under the code's own control is not one");
    expect(flat).toContain("parsed there into a form that cannot hold an invalid value");
    expect(flat).toContain("the code past it carries no branch for that value");
    expect(flat).toContain("Validation of input crossing a trust boundary");
  });
});

/**
 * The repository-specific halves of four shipped rules.
 *
 * An overlay is read together with the shipped master it extends, so a clause
 * dropped from one is not restated anywhere else. One token per clause, each
 * one that no other clause of the same overlay carries, so deleting a clause
 * fails here while the file still looks complete.
 */
describe("rule overlays", () => {
  const OVERLAYS: ReadonlyArray<{ file: string; clauses: readonly string[] }> = [
    {
      file: "distributed-surface.local.md",
      clauses: [
        // The surface, and which of the three guards reads it.
        "package.json#files",
        "Only the post-build guard follows `files`",
        // The identifier shapes, one token each for the two that no other
        // clause names.
        "CAP-0010",
        "DEC-NNNN-NNNN",
        // The three exceptions: the sample IDs, the manifest version, and the
        // migration memo whose file name the guards neutralise before scanning.
        "spec-0001",
        "is the released version",
        "cannot be renamed",
        // Versions that belong to something else, and the matcher's ceiling.
        "A version that belongs to something else",
        "project-qualified form",
        // The guard layers, and where each of them runs.
        "distributedSurfaceLeakage.test.ts",
        "lint job and in the build job",
        // Where internal IDs are fine.
        "which does not ship",
      ],
    },
    {
      file: "version-discipline.local.md",
      clauses: [
        // The convention is adopted here.
        "has adopted it",
        // What a pin authorizes, and when it is done.
        "chore(release): qfai X.Y.Z",
        "Do this once",
        // The remaining guard's branch-name rule and CI location.
        "exits 1 rather than reading",
        "packages/qfai/scripts/check-branch-version-pin.sh",
        // The override, and the unpinned case.
        "coordinated release",
        "On an unpinned branch",
      ],
    },
    {
      file: "temporary-files.local.md",
      clauses: ["mkdtemp"],
    },
    {
      file: "root-additions-policy.local.md",
      clauses: ["report.<pid>", ".qfai/review/review-<timestamp>/"],
    },
  ];

  it.each(OVERLAYS)("$file keeps every clause", async ({ file, clauses }) => {
    const text = await readFile(path.join(ROOT, ".agents/rules", file), "utf-8");
    for (const clause of clauses) {
      expect(text, `${file} lost the clause marked by ${clause}`).toContain(clause);
    }
  });

  it.each(
    OVERLAYS.flatMap(({ file }) =>
      // Every entry point an agent reads this repository's rules through. A
      // tool whose entry point names only the base master follows a claim the
      // overlay has superseded.
      ["AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md"].map((entry) => ({
        entry,
        file,
      })),
    ),
  )("$entry cites $file", async ({ entry, file }) => {
    const text = await readFile(path.join(ROOT, entry), "utf-8");
    expect(text).toContain(file);
  });
});

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

/**
 * Collapse wrapping so a pin reads the sentence rather than its wrap column.
 *
 * A requirement is the same requirement whichever column the formatter broke it
 * at, and a pin that encodes the break fails on a reflow that changed nothing.
 */
const flatten = (text: string): string => text.replace(/\s*\n\s*/g, " ");

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

  // The method for interrogating a design before it is fixed. Every clause of it
  // is load-bearing on its own: dropping the frontier leaves rounds that ask
  // questions nothing can answer yet, dropping the fact/decision split spends the
  // user's attention on what the repository already states, and dropping the end
  // condition turns the whole rule into advice.
  //
  // Both root entry points cite it, per the procedure in `.agents/rules/README.md`.
  // A master no entry point names is loaded by nothing: Codex reads `AGENTS.md` and
  // Claude Code reads `CLAUDE.md`, and `.claude/rules/` is not a directory either
  // of them walks. The shipped copy is separate — it is asserted where it lands,
  // because `initAgentEntryPointRules.test.ts` requires a shipped master to be
  // cited by the shipped templates, so copy and citation are one change.
  describe("grilling rule", () => {
    const MASTER = ".agents/rules/grilling.md";

    it("states every clause of the method", async () => {
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      // One token per clause that no other clause in the file carries, so a
      // clause cannot be dropped and still leave the master looking complete.
      for (const clause of [
        /design tree/i,
        /prerequisites are all settled/,
        /belongs to a later round/,
        /answerable by number/,
        /dispatch a sub-agent/,
        /question cap/i,
        /Stop grilling and build something to react to/,
      ]) {
        expect(text).toMatch(clause);
      }
    });

    it("requires both halves of the end condition, not either", async () => {
      // The frontier emptying is the agent's own measure, and an agent that
      // treats it as sufficient has finished a grilling nobody agreed was over.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/both required/i);
      expect(text).toMatch(/confirms the understanding is shared/);
      // And the first half is the whole tree, not the frontier. With every
      // remaining decision waiting on a lookup the frontier is empty while the
      // tree still holds open nodes, so "the frontier is empty" alone would
      // complete the session before the lookup could raise its questions.
      // Asserted on the numbered condition, not only on the paragraph under it:
      // narrowing the condition and leaving the paragraph is a document that
      // contradicts itself and an agent that reads the condition.
      expect(text).toMatch(
        /1\. No node is open — the frontier is empty \*\*and\*\* no fact lookup/,
      );
    });

    it("lets the user end the session whatever the frontier holds", async () => {
      // The completion condition is how a session ends on its own, not the only
      // way one ends. Read as the only way, a "stop" answer with the frontier
      // still full directs the agent to keep asking — against the constitution,
      // which aborts the invocation on it.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/ends the session immediately, frontier empty or not/);
      expect(text).toMatch(/reported as open,\s*not assumed/);
      // And the softer close, which ends the asking rather than the work.
      expect(text).toMatch(/ends the asking/);
    });

    it("leaves the reaction artifact to the stage the session runs in", async () => {
      // "Build a prototype" names a stage with its own preconditions — a frozen
      // design document and a spec set — so a session running before those exist
      // would be directed into a stage that cannot start.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/build something to react to/);
      expect(text).toMatch(/belongs to the stage the session is running in/);
      expect(text, "naming a stage puts its preconditions on this rule").not.toMatch(
        /qfai-prototyping/,
      );
    });

    it("never lets a closed question become an unmade authorization", async () => {
      // The dangerous reading. "Every decision still open becomes a labelled
      // assumption" would put a decision some document requires the user to
      // record, and an input declared undefaultable, on the assumption path —
      // so a release, a deletion or a merge could ride a choice nobody made.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/never assumed, whatever the user answered/);
      expect(text).toMatch(/an authorization the user has not given/);
    });

    it("is a mode, not a posture, so it cannot widen a question budget", async () => {
      // Without this the rule reads as "no cap whenever a design is unfixed",
      // which any invocation meeting an ambiguity could claim.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/a mode entered deliberately/);
      expect(text).toMatch(/not a posture an agent adopts/);
      expect(text).toMatch(/an ordinary clarification, under whatever budget governs it/);
    });

    it("is not entered under a no-question mode", async () => {
      // An invocation told not to ask must not be made to ask by this rule.
      const text = await readFile(path.join(ROOT, MASTER), "utf-8");
      expect(text).toMatch(/no-question mode/);
      expect(text).toMatch(/not entered and not continued/);
    });

    it("keeps one round on a host that takes fewer questions than it holds", async () => {
      // "Every question in the round is put at once" is unsatisfiable where the
      // host's tool takes three and the frontier holds five. Read as a flat
      // requirement it makes the rule unfollowable; read as licence to split
      // freely it lets the agent recompute the frontier mid-round and answer
      // the second half from the first half's answers.
      const text = flatten(await readFile(path.join(ROOT, MASTER), "utf-8"));
      expect(text).toMatch(/the round is delivered in host-sized batches/);
      expect(text).toMatch(/the frontier is \*\*not\*\* recomputed between them/);
      expect(text).toMatch(/each batch's answers are read for a stop before the next is put/);
      expect(text).toMatch(/It never makes two rounds/);
    });

    it("treats a fact the environment does not hold as a fact", async () => {
      // An unpublished date or a contractual constraint reaches no lookup. With
      // the agent as a Fact's only settler, such a prerequisite has to be asked
      // as a preference — and a preference is revisable, which a fact is not.
      const text = flatten(await readFile(path.join(ROOT, MASTER), "utf-8"));
      expect(text).toMatch(/or the user, where nothing in the environment holds it/);
      expect(text).toMatch(/A fact the environment does not hold is still a fact/);
      expect(text).toMatch(/Ask for it as the value it is rather than as a choice/);
      expect(text).toMatch(/What it is never is a preference/);
    });

    it("covers a decision a running lookup raises after the questions close", async () => {
      // The tree is recomputed as facts arrive, so a lookup in flight when
      // `proceed` lands can raise a decision that was not open at closure.
      // Without this the rule permits neither asking it, assuming it, nor
      // reporting it.
      const text = flatten(await readFile(path.join(ROOT, MASTER), "utf-8"));
      expect(text).toMatch(/A lookup still running when the questions close is finished/);
      expect(text).toMatch(
        /the closure covers the tree as it finally stands, not only the nodes that were open/,
      );
    });

    it("names the closure path in the scope table, not only the no-question mode", async () => {
      // The row said a user-owned decision is never assumed except under a
      // no-question mode, while § 6 turns every open defaultable decision into
      // a labelled assumption after `proceed`. Two instructions for one normal
      // path.
      const text = flatten(await readFile(path.join(ROOT, MASTER), "utf-8"));
      expect(text).toMatch(
        /Asked, never assumed — except under a no-question mode, or after the user closes the questions/,
      );
    });

    it.each(["AGENTS.md", "CLAUDE.md"])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("grilling.md");
    });

    it("CLAUDE.md does not start a session by meeting an unfixed design", async () => {
      // "Interrogate an unfixed design in the rounds this rule sets out" is an
      // imperative whose trigger is the design, which the master refuses: a
      // session is a mode entered deliberately, and an ambiguity met while
      // implementing stays an ordinary clarification under its own budget.
      const text = flatten(await readFile(path.join(ROOT, "CLAUDE.md"), "utf-8"));
      expect(text).toMatch(/Once a grilling session has been entered deliberately/);
      expect(text).toMatch(/Meeting an unfixed design is not itself entry/);
      expect(text).toMatch(
        /an ambiguity met while implementing is an ordinary clarification under its own budget/,
      );
    });

    // `.github/copilot-instructions.md` is deliberately absent from the pair
    // above, and the reason is a coupling rather than a preference: the file is
    // generated by `buildCopilotInstructions` in `init.ts` from a list of the
    // shipped masters, and `qfai init --force` rewrites it. A citation added by
    // hand is discarded on the next run, and one added to the generator for a
    // master `qfai init` does not write resolves to nothing in every adopter's
    // tree.
    //
    // So the Copilot line is owed, and it is owed at the moment the master is
    // shipped. Both directions are read off the two directories rather than a
    // list here, which is what makes that a check instead of a promise: a
    // master that reaches the shipped set without its Copilot line fails the
    // first assertion, and a Copilot line for a master that is not shipped
    // fails the second.
    it("the Copilot rule list holds exactly the shipped masters", async () => {
      const masters = (dir: string): string[] =>
        readdirSync(path.join(ROOT, dir))
          .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
          .sort();

      const shipped = masters("packages/qfai/assets/init/root/.agents/rules");
      const repositoryOnly = masters(".agents/rules").filter((master) => !shipped.includes(master));
      const copilot = await readFile(path.join(ROOT, ".github/copilot-instructions.md"), "utf-8");
      const cited = (master: string): boolean => copilot.includes(`.agents/rules/${master}`);

      // Both sides non-empty, or an assertion below passes by having nothing to
      // check. Neither names a master: the day `grilling.md` is shipped, the
      // first assertion is what fails, and it names the line that is missing.
      expect(shipped.length).toBeGreaterThan(0);
      expect(repositoryOnly.length).toBeGreaterThan(0);
      expect(
        shipped.filter((master) => !cited(master)),
        "shipped, not cited to Copilot",
      ).toEqual([]);
      expect(
        repositoryOnly.filter(cited),
        "cited to Copilot, but `qfai init` writes no such file",
      ).toEqual([]);
    });
  });

  // The form a question arrives in. Each clause closes one way of asking badly:
  // skipping the tool for a question that felt light, a label whose consequence
  // the user has to infer, withholding the recommendation the agent already has,
  // splitting a set and acting on half of it, and a fallback that drops a part
  // the tool would have carried.
  //
  // Every pin below is on a normative sentence rather than on the paragraph that
  // explains it. The explanations repeat the vocabulary, so a token drawn from
  // one of them survives deleting the requirement it explains — which is a case
  // that passes over a rule that no longer says anything.
  //
  // Both root entry points cite it. A master no entry point names is loaded by
  // nothing — Codex reads `AGENTS.md`, Claude Code reads `CLAUDE.md`, and
  // `.claude/rules/` is not a directory either of them walks. The shipped copy
  // is separate: a shipped master must be cited by the shipped templates, so
  // copy and citation are one change, asserted where they land.
  describe("user-questions rule", () => {
    const MASTER = ".agents/rules/user-questions.md";
    const master = (): Promise<string> => readFile(path.join(ROOT, MASTER), "utf-8");

    it("states the requirement of every clause, not the prose beside it", async () => {
      const text = flatten(await master());
      for (const requirement of [
        // 1: both paths, and nothing outside them.
        /Every question to the user goes through the host's structured question tool where it is callable, and through § 5's fallback where it is not/,
        /No question reaches the user as an unstructured ask/,
        // 2: the description is required, not encouraged.
        /Each option carries two things: a short label, and a description saying what choosing it means/,
        // 3: both halves — say so when one option is better, and say so when none is.
        /Where one option is the better answer on the evidence, say so, and say why/,
        /Where no option is better, say that too/,
        // 4: the limit comes off the tool.
        /Read the limit off the tool/,
        // 5: the fallback carries every part, the selection constraint included.
        /Fall back to numbered plain-text choices, keeping every part the tool would have carried/,
        /Say why the tool was not callable/,
      ]) {
        expect(text).toMatch(requirement);
      }
    });

    it("admits no exception, rather than preferring the tool", async () => {
      // The heading alone does not hold this. "Prefer the tool where the question
      // warrants it" keeps the heading and puts the exception back, and the
      // question an agent judges unwarranted is the one it was least sure of.
      const text = flatten(await master());
      expect(text).toMatch(/no class of question light enough to skip it/);
      expect(text).toMatch(/No question reaches the user as an unstructured ask/);
    });

    it("judges the tool's availability per invocation, not per host", async () => {
      // A host may carry the capability and give this invocation no way to call
      // it — a mode that withholds it, a permission not granted. Read as a
      // property of the host, that state is neither the tool's row nor the
      // fallback's, and a question asked there has no compliant path at all.
      const text = flatten(await master());
      expect(text).toMatch(/The tool is not callable in this invocation/);
      expect(text).toMatch(
        /A host may carry a structured-question capability that this invocation cannot use/,
      );
      expect(text).toMatch(/Judge availability at the moment the question is asked/);
    });

    it("keeps the form separate from the count", async () => {
      // Read as a budget the rule would cap questions, which is a different
      // subject with a different owner. Conflating them is how "ask less" gets
      // justified by a rule that only ever said "ask clearly".
      const text = flatten(await master());
      expect(text).toMatch(/one bounds the count, this bounds the form/);
      expect(text).toMatch(/not improved by being well shaped/);
    });

    it("takes the split threshold off the host rather than naming a number", async () => {
      // A rule that names four is unfollowable on a host that takes three: a set
      // of exactly four is then neither split nor valid as one call.
      const text = flatten(await master());
      expect(text).toMatch(/Do not hard-code a number/);
      expect(text).toMatch(/the capacity differs per host/);
      expect(text, "a fixed threshold is the defect this clause fixes").not.toMatch(
        /More than four questions/,
      );
    });

    it("treats the batches of a split as sequential, and reads each for a stop", async () => {
      // A structured-question call blocks until it is answered, so batch two is
      // issued after batch one is answered. Without that, "every question is
      // asked before the agent acts on any answer" directs the agent to issue
      // the next batch after the user has already said stop.
      const text = flatten(await master());
      expect(text).toMatch(/The batches are sequential, not simultaneous/);
      expect(text).toMatch(/Read each batch's answers for a stop before issuing the next/);
      expect(text).toMatch(/Issuing the next batch after that is the agent overriding the user/);
      // And the honest limit on what a split can deliver.
      expect(text).toMatch(
        /a host-limited split satisfies it to the host's capacity and no further/,
      );
    });

    it("does not let the split ask past a cap", async () => {
      // "Split until the set is exhausted" reads, on its own, as licence to keep
      // calling until every question is asked — so an agent holding six
      // questions under a budget of five could satisfy the split by exceeding
      // the budget. The set is fixed before the first call.
      const text = flatten(await master());
      expect(text).toMatch(/The set is fixed before the first call/);
      expect(text).toMatch(/splitting is never a way to ask past a cap/);
    });

    it("never resolves a host's ranked shape with an invented preference", async () => {
      // Some hosts require a recommended option and offer no unranked choice.
      // Satisfying that by inventing a preference is the one thing the recommend
      // clause forbids, so the rule has to say which side gives way.
      const text = flatten(await master());
      expect(text).toMatch(/put first the option that is cheapest to reverse/);
      expect(text).toMatch(/say in its description that the choice is close/);
      expect(text).toMatch(
        /an invented recommendation is the failure this clause exists to prevent, and the host's formatting requirement does not outrank it/,
      );
    });

    it("keeps the selection constraint in the fallback", async () => {
      // A numbered list carries labels, descriptions and a recommendation and
      // still does not say whether one option may be chosen or several. That
      // changes the answer rather than its presentation.
      const text = flatten(await master());
      expect(text).toMatch(/how many options may be chosen/);
      expect(text).toMatch(/"Pick one" and "pick all that apply" are different questions/);
    });

    it("waives only the clarifications when the questions close mid-split", async () => {
      // "The rest of the set is recorded as assumed" put a mandatory approval
      // and an undefaultable input on the assumption path, so a `proceed` in an
      // early batch could authorize what the user declined to answer.
      const text = flatten(await master());
      expect(text).toMatch(/\*\*Only the clarifications\.\*\*/);
      expect(text).toMatch(
        /closing the questions waives the agent's own uncertainty, never an authorization the user has not given/,
      );
      expect(text).toMatch(
        /where a no-question mode forbids putting them, the run stops and names them/,
      );
    });

    it("treats a tool that cannot carry the answer's shape as not callable", async () => {
      // A question permitting several answers put to a tool whose options are
      // mutually exclusive comes back meaning something narrower than what was
      // asked. Requiring the tool whenever it is callable at all leaves that
      // question no compliant path.
      const text = flatten(await master());
      expect(text).toMatch(
        /A tool that cannot carry the answer's shape is not callable for that question either/,
      );
      expect(text).toMatch(
        /Use the fallback for that question and say which part the tool could not carry/,
      );
      // And the decomposition that looks like a fix but spends the budget.
      expect(text).toMatch(/Do not decompose it into one yes-or-no per option/);
    });

    it.each(["AGENTS.md", "CLAUDE.md"])("%s cites the rule master", async (rel) => {
      const text = await readFile(path.join(ROOT, rel), "utf-8");
      expect(text).toContain("user-questions.md");
    });

    it("CLAUDE.md scopes the budget to clarifications", async () => {
      // "How many questions are worth asking is the budget's subject" counts
      // every question against the cap, and three classes are outside it — so an
      // agent stops at five with a grilling decision or a mandatory approval
      // still unasked.
      const text = flatten(await readFile(path.join(ROOT, "CLAUDE.md"), "utf-8"));
      // Either emphasis marker: which one the file carries is the formatter's
      // choice, and the requirement is that the count is qualified at all.
      expect(text).toMatch(/How many [_*]clarifying[_*] questions are worth asking/);
      expect(text).toMatch(
        /a grilling question, a mandatory approval and a needed `hard-required` input are outside it/,
      );
    });

    it("the sibling rule's round names the one host limit that splits it", async () => {
      // `grilling.md` asks for the whole round at once. A host that takes fewer
      // questions than the round holds cannot deliver that, so the two rules
      // disagree unless the round names the exception and where its mechanics
      // live.
      const text = flatten(await readFile(path.join(ROOT, ".agents/rules/grilling.md"), "utf-8"));
      expect(text).toMatch(
        /A host that takes fewer questions than the round holds is the one exception/,
      );
      // And the pointer, which is what this case is for: the batching mechanics
      // live in the sibling rule, so the round must say where.
      expect(text).toMatch(/`user-questions\.md` § 4 carries the rest of its mechanics/);
    });

    it("the sibling rule points at it, now that it resolves", async () => {
      // `grilling.md` decides which questions a round asks; this one decides the
      // form each arrives in. The pointer waited for this master to exist,
      // because a rule citing a file the tree does not hold is a dead reference.
      const text = await readFile(path.join(ROOT, ".agents/rules/grilling.md"), "utf-8");
      expect(text).toContain("`user-questions.md`");
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
});

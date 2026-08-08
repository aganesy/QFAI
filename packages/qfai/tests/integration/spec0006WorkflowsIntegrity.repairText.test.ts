/**
 * Integration: the repair text carried by the installed shipped-workflow drift
 * advisory (`qfai doctor`).
 *
 * `.qfai/contracts/cli/qfai-doctor.md` — the `workflows.integrity` section,
 * "Required message content" — puts four requirements on the drift message:
 * the repository-relative path of each stale file; the packaged source path to
 * copy from; an explicit statement that QFAI will not overwrite the file
 * itself; and NO imperative naming a `qfai` subcommand as the repair.
 *
 * The fourth is why this row is reviewed on its own. No refresh command ships
 * at this revision, so an advisory naming one would tell every adopter to run
 * something that is not there — and the sibling `skills.integrity` check
 * carries exactly such a `nextActions` string (`qfai init --force`), which is
 * legitimate there because that command really does restore skills. Copying
 * that shape here would ship the defect the contract forbids.
 *
 * Requirement 1 is NOT re-asserted here: the sibling drift suite's first row
 * (`spec0006WorkflowsIntegrity.drift.test.ts`) owns the stale-path clause of
 * the message and asserts it directly. This file owns requirements 2, 3 and 4.
 *
 * Requirements 2 and 3 are each ONE needle over a whole clause, and the two
 * rules they follow are the entire lesson of this row's review rounds:
 *
 *   1. A NEEDLE SPANNING MORE THAN ONE WORD MUST BOUND ITS GAPS IN WORDS
 *      (`(?:\s+\w+){0,N}\s+`), NEVER IN CHARACTERS.
 *   2. IT MUST BIND EVERY OPERAND THE REQUIREMENT NAMES — subject as well as
 *      verb, object as well as instrument.
 *
 * FIVE separately-plausible oracles were each satisfiable by a message asserting
 * the OPPOSITE of the requirement they were written for, in three failure modes:
 *
 *   PRESENCE, not binding — `toContain(packagedDir)` and `/\breplace\b/i`. The
 *     word appears, so the oracle is content with a sentence that denies it.
 *   PROXIMITY, not binding — `/\bnever\b[\s\S]{0,40}overwrit/i` and
 *     `/\breplace\b[^.]{0,80}\bwith\b[^.]{0,60}…/i`. A bounded run of arbitrary
 *     characters holds a comma, a semicolon, a dash or a colon, so the halves
 *     can sit in different clauses saying unrelated things. Rule 1 exists
 *     because a word-bounded gap cannot contain a clause boundary AT ALL, which
 *     makes the bound stop being a length at which the defect returns.
 *   BOUND TO THE WRONG OPERAND — `/\bnever\b(?:\s+\w+){0,3}\s+overwritt/i`.
 *     Word-bounded already, and still green on "The packaged copy is never
 *     overwritten", which says nothing about the adopter's file. Rule 2 exists
 *     because tightening a gap tells you nothing about what is on either side.
 *
 * The cost is symmetric and is stated at each assertion rather than glossed:
 * excluding clause boundaries also excludes benign parentheticals, and binding
 * an operand pins its noun phrase, so compliant rewordings can redden. Both
 * needles are POSITIVE assertions, where that failure direction is RED; the
 * token sweep is negative, where over-breadth is the safe direction. Which side
 * an oracle sits on is what decides how tight to make it.
 *
 * The per-assertion comments carry every witness message that closed a hole,
 * with its measurement.
 *
 * Observed through `createDoctorData` rather than through the reader, matching
 * both sibling suites — the message is composed at the registration site, so a
 * reader-level test could not see it at all.
 *
 * This file grows row by row; each describe block is one ledger row.
 */
// QFAI:SPEC-0006:TC-0006-0030

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { shippedWorkflowsDir } from "../helpers/shippedWorkflowFixtures.js";
import { editShippedWorkflow, useAdopterTreePool } from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/** The installed shipped workflow this row hand-edits to produce the drift. */
const STALE_NAME = "qfai-tests.yml";

/**
 * Escapes a literal for embedding in a `RegExp` source.
 *
 * TEST-LOCAL although `src/core/regex.ts` exports the same one-liner, and the
 * duplication is the point: an escape that stops escaping `.` turns the
 * `.github` segment of the expected path into a match-any-character wildcard,
 * which WIDENS the needle below. That is the false-GREEN direction, so this
 * row's oracle must not be reachable from a production edit. Do not "DRY" it
 * into an import.
 */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `qfai` subcommands as of `src/cli/main.ts`'s dispatch, MINUS three, for the
 * verb token below. TEST-OWNED: when a subcommand is added, add it here.
 *
 * THE EXCLUSION CRITERION, stated because it was twice applied without being
 * named: a token is dropped when its over-fire happens on PROSE A COMPLIANT
 * AUTHOR WOULD WRITE, and kept when the over-fire needs something pathological.
 * That is what makes keeping token 1's over-breadth and dropping three verbs
 * non-contradictory rather than arbitrary — token 1 only over-fires on a
 * checkout path containing a space, which no message author controls or
 * produces, whereas each verb below over-fires on a sentence someone answering
 * a review would plausibly write.
 *
 * The three omissions, all measured:
 *   - `report`: "this check will report the difference" FIRES. Note the shipped
 *     sentence itself says "reports the difference", which `/\breport\b/i` does
 *     NOT match — so the warrant is not a hypothetical rewording but the message
 *     already using this vocabulary ONE INFLECTION away.
 *   - `audit`: "see the audit trail" FIRES.
 *   - `doctor`: "doctor reports the difference and writes nothing" and
 *     "doctor only reports the difference" both FIRE, and both are the most
 *     natural third-person rewording available precisely because `doctor` is the
 *     name of the command emitting the text. The shipped message escapes only by
 *     saying "this finding reports…". Dropping it REMOVES a prose constraint
 *     nobody had written down instead of adding a fourth one to the emission
 *     site, which is the deciding consideration: an unstated constraint is a
 *     trap, and the alternative here was to state one whose only content is
 *     "never name the command that prints this".
 *
 * The residual gap is an imperative naming one of the three WITHOUT the binary.
 * An imperative naming the binary is caught by token 1 (`qfai doctor` fires),
 * and neither `report` nor `audit` restores a workflow, so none of the three is
 * a repair an advisory could plausibly offer bare.
 */
const CLI_SUBCOMMAND_VERBS = [
  "init",
  "validate",
  "guardrails",
  "atdd",
  "handoff",
  "discussion",
  "prototyping",
] as const;

/**
 * Tokens whose presence in the advisory would make it name a command.
 *
 * The bare string `qfai` is deliberately NOT a member, and that omission is
 * load-bearing rather than lax: requirement 2 puts the packaged source path
 * into the message, and in any real install that path runs through
 * `node_modules/qfai/…`, so a `not.toContain("qfai")` oracle would fail on a
 * message that satisfies the contract.
 *
 * `assets/init` is the SAME HAZARD ONE LEVEL DEEPER, and it is the one that
 * matters most here: the packaged path is rooted at `getInitAssetsDir()`, so
 * every message renders `…/assets/init/root/.github/workflows` and a bare
 * `/\binit\b/i` token is PERMANENTLY UNAVAILABLE — not merely inconvenient.
 * `init` is also the subcommand an adopter is most likely to be told to re-run,
 * so the token that cannot be written naively is exactly the token the contract
 * most needs. The verb token resolves it with a separator lookahead rather than
 * by omission: a path occurrence is always followed by `/`, `\`, `.` or `@`
 * (`…/assets/init/root`, `qfai-validate.yml`), an imperative never is. Measured
 * clean against the Windows path, the POSIX path and `qfai-validate.yml`, and
 * FIRING on `re-run init to restore it` — the phrasing that defeats every other
 * token in this list.
 *
 * The other tokens are anchored so that a path SEGMENT BOUNDARY cannot satisfy
 * them — `\s` after `qfai`, a word boundary for the package managers, leading
 * whitespace before a flag. That is narrower than "a path cannot satisfy them",
 * which is false and was measured to be false: a checkout at
 * `…\GitHub\QFAI clone\packages\qfai\…` puts a SPACE inside the path and fires
 * token 1. Harmless in direction (see below) and invisible in CI, which runs a
 * space-free checkout path; recorded so the next reader does not re-derive it.
 * The analogous prediction for token 5 (a ` -dir` segment) did NOT reproduce —
 * a path segment is preceded by a separator, not by whitespace.
 *
 * The first token over-approximates the contract's "no imperative naming a
 * `qfai` subcommand": it also matches ordinary prose such as "QFAI will not
 * overwrite it". That over-approximation is kept on purpose. In a NEGATIVE
 * assertion an over-broad needle can only produce a false RED, never a false
 * GREEN, so tightening it could admit a violation while loosening the prose
 * cannot. The cost is that the message must not put a word straight after the
 * product name; it says "… by QFAI:" instead, and that is measured, not
 * assumed — see the token sweep at the assertion below, whose failure label
 * names this false positive because the label alone would misdescribe it.
 */
const COMMAND_TOKENS: RegExp[] = [
  /\bqfai\s+[a-z]/i, // `qfai init`, `qfai doctor`, `qfai refresh`
  /\bnpx\b/i,
  /\bnpm\s+(?:i|install|run)\b/i,
  /(?:^|\s)--[A-Za-z]/, // long flag
  /(?:^|\s)-[A-Za-z]\b/, // short flag
  // No trailing `\b`: the INFLECTIONS are the dangerous forms. `refreshed` and
  // `refreshes` both escaped `/\brefresh\b/i` (measured), and one of them
  // carried the worst message in this row's history — "the installed file is
  // refreshed in place on your next install", which tells the adopter their
  // hand-edits are about to be destroyed. Measured clean on the shipped message
  // and on both the Windows and POSIX packaged paths.
  /\brefresh/i,
  // A bare CLI verb, separator-anchored. `(?![\\/@.])` is what keeps the
  // packaged path out of it; see the `assets/init` paragraph above.
  new RegExp(`\\b(?:${CLI_SUBCOMMAND_VERBS.join("|")})\\b(?![\\\\/@.])`, "i"),
];

describe(
  "TC-0006-0030 (TDD-0032): the drift message names the manual repair and no command token",
  { timeout: 60000 },
  () => {
    it("names the packaged copy as the source of the manual replacement, and names no command token", async () => {
      const dir = await pool.seedAdopterTree();
      await editShippedWorkflow(dir, STALE_NAME);

      const data = await createDoctorData({ startDir: dir, rootExplicit: true });
      // The finding SET, not the first match. `addCheck` is a bare push with no
      // dedup, so a `find` would hand back one registration while a second one
      // carried different prose, and every assertion below would read the first
      // and pass.
      const findings = data.checks.filter((entry) => entry.id === "workflows.integrity");
      const check = findings[0];

      // GUARD #1-#2 are PRECONDITIONS on the fixture and stay hard. Everything
      // after them is this row's claim and is `expect.soft`.
      //
      // Guard #1 closes the no-emission mode. Not a false-pass mode on its own —
      // `expect(undefined).not.toMatch(/x/)` errors rather than passing — but it
      // is what turns the nine `message`-reading failures labelled
      // `toMatch() expects to receive a string, but got undefined` into one that
      // names the cause.
      //
      // It is also the one assertion in this file for which
      // `expected undefined to be defined` is a NON-degenerate observation, and
      // the distinction is worth keeping so it is not re-litigated: a red is
      // degenerate when the predicate is about a VALUE and the mutant supplies
      // ABSENCE (which is why guard #2's severity red would not count), and
      // admissible when the predicate IS presence. TWO mutations reach it, and
      // both produce genuine absence: an UNRESOLVABLE PACKAGED DIRECTORY (the
      // skip firing spuriously), and FALSIFYING THIS FILE'S OWN GATE CONDITION
      // — `modified.length > 0` inverted, which leaves `status` at `"modified"`
      // so the `ok` else-if is false too and nothing is emitted at all. The
      // second is the better proof of the two, because it lives in the code this
      // row's item owns rather than in a sibling row's reader.
      //
      // What does NOT reach it is forcing the COMPARISON to report no drift:
      // that converts the finding into the content-identical `ok` emission
      // (gated on `comparedCount > 0`, satisfied here), so it lands on guard #2
      // with `expected 'ok' not to be 'ok'`. Measured, after an earlier record
      // claimed the opposite.
      //
      // THAT PAIR IS THE ARGUMENT FOR RECORDING MUTATIONS AS TEXT RATHER THAN AS
      // INTENT, and it is worth naming here because the rule was itself first
      // written down as an intent. "Kill the drift gate" is an intent that two
      // different edits satisfy — one in the reader, one in the gate condition —
      // and they land on two different assertions. A round recorded by intent
      // cannot distinguish them; a round recorded as needle and replacement
      // text cannot fail to.
      //
      // BORROWED PRECONDITION, owner named: "the emission site can fire at all"
      // is established by TDD-0029's first `it`, which drives the same fixture
      // shape through `createDoctorData` and asserts the finding exists. This row
      // re-states it as a guard rather than relying on the sibling silently.
      expect(
        check,
        "the drift advisory must be registered, or there is no message to inspect",
      ).toBeDefined();

      // Guard #2 closes a VACUITY OF THE TOKEN SWEEP AND THE REGISTRATION PIN,
      // and only that — the wider claim this comment used to make ("the real
      // false-pass mode" of the whole row) is measurably too strong. Severity
      // `ok` means the CONTENT-IDENTICAL emission is under inspection, whose
      // message ("… match the packaged copy") contains no command token either
      // and is registered exactly once, so eight assertions pass while nothing
      // about the repair text has been measured.
      //
      // The two CONTENT needles do not need this guard, and that is measured
      // rather than reasoned: disabling this line and forcing the `ok` branch to
      // emit reddens exactly the packaged-repair needle and the no-overwrite
      // needle, and nothing else. So the guard's value is scope, not necessity.
      //
      // `not.toBe("ok")` and deliberately NOT `toBe("info")`. `toBe` is the
      // stronger form and the surplus — the `info`-versus-`warning` distinction —
      // is claimed by TDD-0029 (`severity` asserted as `info`) and by
      // TDD-0031 / TDD-0034 (the exit-code invariance legs). Pinning it here
      // would make this row redden under a mutation it says nothing about and
      // abort its own claim block before the message was ever read. The weak
      // form closes the vacuity mode and nothing more.
      expect(
        check?.severity,
        "the DRIFT emission must be the one under inspection, not the content-identical `ok` one whose message names no command either",
      ).not.toBe("ok");

      const message = check?.message;

      // Every assertion from here down is this row's claim and is `expect.soft`.
      // Under hard asserts only the FIRST failure is observed, so a mutation
      // reddening an earlier assertion aborts the run before the later ones
      // execute and they read as covered while never having been exercised. The
      // token sweep below makes that concrete: one inserted command string
      // reddens three tokens at once, and only `expect.soft` lets all three be
      // seen.
      expect
        .soft(findings, "workflows.integrity must be registered exactly once per doctor run")
        .toHaveLength(1);

      // REQUIREMENT 2 — the packaged source path to copy from — as ONE needle
      // over the whole repair clause: an affirmative `replace`, the drifted files
      // as its object, `with`, then the packaged directory. It replaces two
      // assertions (`toContain(packagedDir)` and a free-standing
      // `/\breplace\b/i`) that were BOTH direction-blind, while TC-0006-0030's
      // Verify (a) is directional in its own words (「install 済み package 内の
      // copy で当該ファイルを置き換える」) and BR-0006-0020 names the packaged
      // copy as the INSTRUMENT. Eleven production-side mutation rounds reach
      // this line; every witness below was GREEN under some earlier form of the
      // needle and is red here:
      //
      //  (i)  `replace the copy of the same name in ${packagedDir} with each
      //       listed file` — tells the operator to overwrite the PACKAGED copy
      //       with their stale file. It repairs nothing, is undone by the next
      //       install, and is the one rewording of this message that can destroy
      //       an operator's data.
      //  (ii) `The packaged copy of each lives in ${packagedDir}. … and nothing
      //       will replace it` — `replace` as a DENIAL. Carries no repair
      //       instruction at all, which is precisely what this row's title
      //       claims to pin, and it is where an implementer strengthening the
      //       no-overwrite sentence naturally lands.
      //  (iii) the packaged path relativized (see the anchor note below).
      //  (iv) `replace the copy in the packaged tree with the stale file, using
      //       ${packagedDir}` — the same reversal as (i), reaching the path
      //       across a COMMA.
      //  (v)  `replace the packaged copy -- not the installed one -- with the
      //       file listed above in ${packagedDir}` — the reversal reaching
      //       across a dash parenthetical, and it even contains the word the
      //       object anchor looks for, on the wrong side of `with`.
      //  (vi) `Do NOT replace each listed file with the copy of the same name in
      //       ${packagedDir}` / `replace your local backup with …` — the
      //       polarity and the LEFT operand, neither of which an ordered phrase
      //       can see.
      //
      // THE GAPS ARE WORD-BOUNDED, NOT LENGTH-BOUNDED, and that is the whole
      // fix for (iv)-(vi). An earlier form used `[^.]{0,80}` / `[^.]{0,60}`,
      // which bounds PROXIMITY: 80 characters of any content hold a comma, a
      // semicolon, a dash or a parenthesis, so the verb, `with` and the path
      // could sit in three different clauses saying three different things. That
      // is the identical defect the requirement-3 needle below was already
      // rewritten to fix — the same reasoning had to be applied here, and the
      // fact that it was not is why (iv)-(vi) existed. `(?:\s+\w+){0,N}\s+`
      // admits only whole words, so no clause boundary can enter a gap at all,
      // and the bound stops being a length at which the defect returns.
      //
      // The three anchors, each with the witness it closes:
      //   - `(?:^|[^\w\s]\s+)` before `replace` — the verb must OPEN its clause,
      //     i.e. be preceded by punctuation rather than by a word. Any negation
      //     of a verb necessarily puts a word in front of it ("do NOT replace",
      //     "nothing will replace", "we never replace"), so this is a STRUCTURAL
      //     sufficient condition for the verb being asserted, needing no
      //     negator vocabulary to maintain.
      //   - `(?:listed|stale|drifted)` between the verb and `with` — the object
      //     must refer back to the enumeration in the first sentence. Closes
      //     `replace your local backup with …`, which is directionally correct
      //     and sends the operator at the wrong file.
      //   - `\s+` immediately before the path — see the anchor note below.
      //
      // The free-standing verb assertion is DELETED rather than kept alongside:
      // it is entailed by this needle, and the standard this slice adopted is
      // "delete when entailed, unless the kept line is the only one whose
      // MESSAGE names the claim" — the label below names the repair, so nothing
      // survives the deletion.
      //
      // The `\s+` immediately before the path is the ANTI-RELATIVIZATION ANCHOR
      // and it is load-bearing on POSIX specifically. `toContain(packagedDir)`
      // was GREEN on ubuntu — all seven `ci.yml` `runs-on` values are
      // `ubuntu-latest` — for a `toRelativePath(root, packagedDir)` tidy-up at
      // the emission site, because `toRelativePath` has no absolute fallback
      // (`src/core/paths.ts`) and the `../..` chain CONTAINS the absolute
      // target: the last `../` supplies the leading `/`. Constructed, since this
      // row cannot run ubuntu from here:
      //
      //   rel      = ../../home/runner/work/QFAI/QFAI/packages/qfai/assets/init/root/.github/workflows
      //   includes = true     ← the hole
      //   anchored = false    ← this needle
      //
      // On Windows the same edit reddens twice over (`C:` and backslashes). The
      // relationship between the anchor and the gap is NOT independence, and an
      // earlier record of mine that called them "independent defenses" or
      // "half-blind without each other" was wrong both ways. Measured, three
      // variants against the relativized message:
      //
      //   `\s+` before the path            → RED on POSIX and Windows
      //   weakened to `\s*`                → RED on POSIX and Windows
      //   replaced by `[\s\S]{0,8}`        → **GREEN on POSIX**, red on Windows
      //
      // So the anchor is the LAST LINK OF THE WORD-BOUNDED CHAIN rather than a
      // second mechanism: what closes the relativization is that no gap in this
      // needle admits a non-word character, and `\s+` is where that property
      // meets the path. Weakening it to `\s*` is harmless; replacing it with any
      // character window reopens the exact ubuntu-only hole this row was reviewed
      // for. Do not "simplify" it in that direction.
      //
      // This is the same standard the sibling suite set when it rejected
      // `toContain` for `toBe` on the title: "substring containment cannot see a
      // suffix being appended to the thing it looks for" — the POSIX case is the
      // PREFIX form of it, and requirement 2 is not allowed to reintroduce bare
      // containment without answering it.
      //
      // The expected value is composed by the TEST, and the split matters. The
      // `root/.github/workflows` join — the part production can get wrong — is
      // stated here through a test-owned helper; the assets-directory prefix is
      // not independently stateable by any test, because it answers "where is
      // this package installed", so `getInitAssetsDir()` is shared and the join
      // is not.
      //
      // What that sharing actually buys is NARROWER than this comment once
      // claimed, and the claim was measured false: dropping `"root"` from the
      // production join, and misspelling it `"rooot"`, each produce exactly ONE
      // failure — guard #2 — which is hard and aborts before this line runs. A
      // wrong join makes every packaged operand ABSENT, absence is not drift, so
      // the reader reports `ok` and the `ok` branch emits; the finding still
      // exists, it is just the wrong one, which is exactly what guard #2 is for.
      // So this needle discriminates "the message carries the packaged
      // directory, on the `with` side, unrelativized"; the COMPOSITION of that
      // directory is pinned by guard #2, not by this assertion. There is no
      // coverage hole, but the sharing is not what makes the join falsifiable.
      //
      // Two DRY edits a later reader will reach for, both of which must be
      // REFUSED, per the convention the sibling row set when it named the
      // `WORKFLOWS_DIR_RELATIVE` import as the edit that restores a
      // coordinated-edit hole:
      //   - importing `resolvePackagedWorkflowsDir`, or exporting
      //     `WORKFLOWS_DIR_SEGMENTS`, from `src/core/doctor/workflowsIntegrity.ts`
      //     to build the expected value. Both are module-private today and must
      //     stay so: they would make this needle agree with whatever production
      //     computes rather than with what the contract requires, and the
      //     `root/.github/workflows` join is the one part production can get
      //     wrong.
      //   - exporting the message's sentences from `src/core/doctor.ts` as
      //     constants and asserting against them. That is the same DRY import in
      //     prose form — it would make every needle in this file tautological,
      //     including the seven negative ones — and it is the edit the previous
      //     round already required be refused for the directory constant.
      // THE COST, stated rather than glossed, on the same accounting the
      // requirement-3 needle uses. This needle pins the SHAPE of the repair
      // clause: verb opens the clause, object refers to the listing, `with`,
      // then the path, all inside one clause. Rewording INSIDE that shape is
      // free and measured to be free — `Manual repair - replace each stale file
      // with the packaged copy of the same name in <dir>` and `To repair,
      // replace the drifted files with the copy of the same name in <dir>` both
      // pass. RESHAPING reddens: `you should replace …` (a word before the verb)
      // and `replace each listed file, one at a time, with …` (a comma inside a
      // gap) both fail on compliant prose. That is the price of excluding clause
      // boundaries — a needle cannot admit a benign parenthetical and reject a
      // meaning-reversing one, since they are the same construction. The failure
      // direction is RED, which is why the price is payable here at all; it is
      // recorded at the emission site so the rewriter meets it before CI does.
      const packagedDirNeedle = escapeForRegExp(shippedWorkflowsDir());
      const directionalRepair = new RegExp(
        `(?:^|[^\\w\\s]\\s+)replace\\b(?:\\s+\\w+){0,3}\\s+(?:listed|stale|drifted)\\b` +
          `(?:\\s+\\w+){0,3}\\s+with\\b(?:\\s+\\w+){0,10}\\s+${packagedDirNeedle}`,
        "i",
      );
      expect
        .soft(
          message,
          "the message must instruct the operator to replace the listed files WITH the packaged copy — one affirmative clause, no clause boundary inside it, the packaged source path unrelativized on the `with` side — per the contract's required message content and BR-0006-0020",
        )
        .toMatch(directionalRepair);

      // REQUIREMENT 3 — an explicit statement that QFAI will not overwrite the
      // file itself. THIS ROW IS ITS SOLE OWNER: `grep -r overwritt
      // packages/qfai/tests/` finds no other assertion on it, so a single
      // noun-phrase edit is enough to drop or invert the one contract item
      // nothing else pins. That is why the needle grew twice.
      //
      // All three of SUBJECT, NEGATION and VERB are bound in one chain, in that
      // order, and each was added because the previous form was green on a
      // message asserting the opposite:
      //
      //  1. `/overwrit/` alone passes "QFAI overwrites the file for you".
      //  2. `/\bnever\b[\s\S]{0,40}overwrit/i` — proximity, not binding — passes
      //     `The installed file is never protected: doctor overwrites it in
      //     place and writes the packaged bytes.` 40 characters of any content
      //     hold a whole clause, so `never` governs something else inside it.
      //  3. `/\bnever\b(?:\s+\w+){0,3}\s+overwritt/i` binds negation to verb but
      //     says nothing about WHOSE file, and passes all three of:
      //       `The packaged copy is never overwritten by QFAI: …` — the message
      //         now makes no statement about the installed file at all, so the
      //         requirement is literally unmet;
      //       `The packaged copy is never overwritten by QFAI; the installed
      //         file is refreshed in place on your next install.` — tells the
      //         adopter their hand-edits WILL be destroyed, against the
      //         contract's own Non-goals (and it escapes `/\brefresh\b/i`, which
      //         is why token 6 lost its trailing `\b`);
      //       `Files that are never overwritten are listed in the provenance
      //         record.` — the sentence deleted outright.
      //     The first of those is MORE plausible than (2)'s witness, because the
      //     preceding round's whole subject was the packaged copy being
      //     clobbered, so an author answering that review lands on it.
      //  4. The form below adds the subject, WORD-BOUNDED like the rest. The
      //     proposal that came in used `[^.]{0,40}` between subject and `never`,
      //     and that would have reproduced defect (2) one level out: measured,
      //     `The installed file is stale, but the packaged copy is never
      //     overwritten by QFAI.` is GREEN under it and RED here. A bounded
      //     any-character gap is never the right instrument in this file.
      //
      // The sentence-gap control is UNCONFOUNDED, which the previous one was
      // not. `never. Three sentences later, doctor overwrites it.` also lacks
      // `overwritt`, so it failed on spelling and proved nothing about binding.
      // The control that isolates it: `The installed file is never touched.
      // Three sentences later, it is overwritten in place.` — GREEN under (2),
      // RED here, and it CONTAINS `overwritten`, so only the binding can be
      // what rejects it.
      //
      // THE COST, on the same accounting as requirement 2: three noun phrases
      // are now pinned, and compliant rewordings redden. Measured — passes:
      // "is never overwritten by QFAI", "will never be overwritten", "is never
      // automatically overwritten". Reddens: "QFAI never overwrites the
      // installed file" (active voice puts the subject after the verb), "The
      // file in your repository is never overwritten" (subject renamed), "The
      // installed file is, in every mode, never overwritten" (comma in a gap).
      // Accepted because this is a POSITIVE assertion, so an over-tight needle
      // fails RED, and because the alternative — leaving the subject unbound —
      // is a false GREEN on a message that inverts the contract.
      expect
        .soft(
          message,
          "the message must state that THE INSTALLED FILE is never overwritten — subject, negation and verb bound in one clause, not merely present in the same sentence — per the contract's required message content",
        )
        .toMatch(/\binstalled\s+file\b(?:\s+\w+){0,3}\s+never\b(?:\s+\w+){0,3}\s+overwritt/i);

      // REQUIREMENT 4 — no imperative naming a `qfai` subcommand as the repair.
      //
      // Swept over `check.message` alone and never over a serialization of the
      // whole check: `details` is a machine surface whose keys and values are
      // owned by other rows, and folding it in would make this row redden on
      // their payloads.
      //
      // Each token is reported with its own source in the label, so a failure
      // names which token fired rather than only that one did. The label admits
      // token 1's known false positive because otherwise it MISDESCRIBES its own
      // failure: on prose that names no command but puts a word straight after
      // the product name, "the repair text must name no command" is a true
      // statement about a message the token has just rejected.
      for (const token of COMMAND_TOKENS) {
        expect
          .soft(
            message,
            `no refresh command exists, so the repair text must name no command — token 1 also fires on a word placed straight after the product name, which is a known false positive, not a violation: token /${token.source}/ matched`,
          )
          .not.toMatch(token);
      }
    });
  },
);

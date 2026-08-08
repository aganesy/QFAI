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
 * Requirements 2 and 3 are each ONE needle that binds a verb to its operand,
 * and that shape is the whole lesson of this row's review rounds. Three
 * separately-plausible oracles — `toContain(packagedDir)`, `/\breplace\b/i`,
 * `/\bnever\b[\s\S]{0,40}overwrit/i` — were each satisfiable by a message
 * asserting the OPPOSITE of the requirement they were written for, because each
 * measured the PRESENCE of a word rather than what the word was bound to. Every
 * needle below therefore names the operand and the ordering in one pattern; the
 * per-assertion comments carry the witness message that closed each hole.
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
 * `qfai` subcommands as of `src/cli/main.ts`'s dispatch, MINUS two, for the
 * verb token below. TEST-OWNED: when a subcommand is added, add it here.
 *
 * `report` and `audit` are the two omissions and they are measured, not
 * guessed. Both are ordinary words in doctor's own vocabulary — "this check
 * will report the difference", "see the audit trail" both FIRE — so including
 * them would redden on compliant prose that names no command at all. The
 * residual gap is an imperative naming one of those two WITHOUT the binary,
 * which is not a repair an advisory could plausibly offer (neither command
 * restores a workflow); an imperative naming the binary is caught by token 1.
 */
const CLI_SUBCOMMAND_VERBS = [
  "init",
  "validate",
  "doctor",
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
  /\brefresh\b/i,
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
      // admissible when the predicate IS presence. The mutation that reaches it
      // is an UNRESOLVABLE PACKAGED DIRECTORY — the skip firing spuriously —
      // whose entire observable consequence is "no `workflows.integrity`
      // finding", so `undefined` is the observation rather than the absence of
      // one.
      //
      // Deliberately NOT the drift gate, and that correction is measured:
      // forcing the comparison to report no drift does NOT remove the finding,
      // it converts it into the content-identical `ok` emission (which is gated
      // on `comparedCount > 0`, satisfied here), so that mutant lands on guard
      // #2 with `expected 'ok' not to be 'ok'` and never reaches this line.
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

      // REQUIREMENT 2 — the packaged source path to copy from — as ONE ordered
      // needle: the repair verb, then `with`, then the packaged directory on the
      // `with` side. It replaces two assertions (`toContain(packagedDir)` and a
      // free-standing `/\breplace\b/i`) that were BOTH direction-blind, while
      // TC-0006-0030's Verify (a) is directional in its own words
      // (「install 済み package 内の copy で当該ファイルを置き換える」) and
      // BR-0006-0020 names the packaged copy as the INSTRUMENT. Three witness
      // messages, each green under the old pair and each red here:
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
      //
      // The free-standing verb assertion is DELETED rather than kept alongside:
      // it is entailed by this needle, and the standard this slice adopted is
      // "delete when entailed, unless the kept line is the only one whose
      // MESSAGE names the claim" — the label below names the repair, so nothing
      // survives the deletion.
      //
      // `[\s(]` before the path is the ANTI-RELATIVIZATION ANCHOR and it is
      // load-bearing on POSIX specifically. `toContain(packagedDir)` was GREEN
      // on ubuntu — all seven `ci.yml` `runs-on` values are `ubuntu-latest` —
      // for a `toRelativePath(root, packagedDir)` tidy-up at the emission site,
      // because `toRelativePath` has no absolute fallback (`src/core/paths.ts`)
      // and the `../..` chain CONTAINS the absolute target: the last `../`
      // supplies the leading `/`. Constructed, since this row cannot run ubuntu
      // from here:
      //
      //   rel      = ../../home/runner/work/QFAI/QFAI/packages/qfai/assets/init/root/.github/workflows
      //   includes = true     ← the hole
      //   anchored = false    ← this needle
      //
      // On Windows the same edit reddens twice over (`C:` and backslashes), and
      // the `[^.]{0,60}` gap cannot span `../../` on either platform, so the
      // anchor and the gap are independent defenses.
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
      const packagedDirNeedle = escapeForRegExp(shippedWorkflowsDir());
      const directionalRepair = new RegExp(
        `\\breplace\\b[^.]{0,80}\\bwith\\b[^.]{0,60}[\\s(]${packagedDirNeedle}`,
        "i",
      );
      expect
        .soft(
          message,
          "the message must instruct the operator to replace the stale file WITH the packaged copy, naming the packaged source path unrelativized on the `with` side, per the contract's required message content and BR-0006-0020",
        )
        .toMatch(directionalRepair);

      // REQUIREMENT 3 — an explicit statement that QFAI will not overwrite the
      // file itself.
      //
      // The negation is BOUND to the verb, not merely near it. A bare
      // `/overwrit/` needle passes on "QFAI overwrites the file for you", which
      // is the exact opposite of the requirement; and the bounded-proximity form
      // `/\bnever\b[\s\S]{0,40}overwrit/i` that replaced it was ALSO green on
      // the opposite claim, because 40 characters of any content hold a whole
      // clause and `never` is free to govern something else inside it:
      //
      //   `The installed file is never protected: doctor overwrites it in place
      //    and writes the packaged bytes.`
      //
      // Proximity is not binding. `(?:\s+\w+){0,3}\s+` admits only up to three
      // intervening WORDS, so no clause boundary can sit between the two: the
      // witness above is rejected because `protected:` is not `\w+`, and a
      // `never` three sentences away is rejected because a `.` is not `\w`.
      //
      // Adopted as proposed by review; the one thing it is NOT is strictly
      // stronger in every dimension, and that is worth stating rather than
      // glossing. `overwritt` (double `t`) admits only the passive
      // ("never overwritten", "never be overwritten", "never automatically
      // overwritten" — all measured green), so an ACTIVE-voice compliant
      // rewording ("QFAI never overwrites the installed file") reddens. Accepted:
      // this is a POSITIVE assertion, so the failure direction of an
      // over-tight needle is RED, and the shipped sentence is passive.
      expect
        .soft(
          message,
          "the message must state that the installed file is never overwritten — with `never` bound to that verb, not merely near it — per the contract's required message content",
        )
        .toMatch(/\bnever\b(?:\s+\w+){0,3}\s+overwritt/i);

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

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
 * Tokens whose presence in the advisory would make it name a command.
 *
 * The bare string `qfai` is deliberately NOT a member, and that omission is
 * load-bearing rather than lax: requirement 2 puts the packaged source path
 * into the message, and in any real install that path runs through
 * `node_modules/qfai/…`, so a `not.toContain("qfai")` oracle would fail on a
 * message that satisfies the contract. Every token below is anchored so that a
 * PATH cannot satisfy it — `\s` after `qfai`, a word boundary for the package
 * managers, and leading whitespace before a flag — because a path segment is
 * followed by a separator, never by a space.
 *
 * The first token over-approximates the contract's "no imperative naming a
 * `qfai` subcommand": it also matches ordinary prose such as "QFAI will not
 * overwrite it". That over-approximation is kept on purpose. In a NEGATIVE
 * assertion an over-broad needle can only produce a false RED, never a false
 * GREEN, so tightening it could admit a violation while loosening the prose
 * cannot. The cost is that the message must not put a word straight after the
 * product name; it says "… by QFAI:" instead, and that is measured, not
 * assumed — see the token sweep at the assertion below.
 */
const COMMAND_TOKENS: RegExp[] = [
  /\bqfai\s+[a-z]/i, // `qfai init`, `qfai doctor`, `qfai refresh`
  /\bnpx\b/i,
  /\bnpm\s+(?:i|install|run)\b/i,
  /(?:^|\s)--[A-Za-z]/, // long flag
  /(?:^|\s)-[A-Za-z]\b/, // short flag
  /\brefresh\b/i,
];

describe(
  "TC-0006-0030 (TDD-0032): the drift message names the manual repair and no command token",
  { timeout: 60000 },
  () => {
    it("names the packaged source path and the manual replacement, and names no command token", async () => {
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
      // is what turns six failures labelled
      // `toMatch() expects to receive a string, but got undefined` into one that
      // names the cause.
      //
      // BORROWED PRECONDITION, owner named: "the emission site can fire at all"
      // is established by TDD-0029's first `it`, which drives the same fixture
      // shape through `createDoctorData` and asserts the finding exists. This row
      // re-states it as a guard rather than relying on the sibling silently.
      expect(
        check,
        "the drift advisory must be registered, or there is no message to inspect",
      ).toBeDefined();

      // Guard #2 closes the real false-pass mode: severity `ok` means the
      // CONTENT-IDENTICAL emission is under inspection, whose message
      // ("… match the packaged copy") contains no command token either. Every
      // token assertion below would then pass while nothing about the repair
      // text had been measured.
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

      // REQUIREMENT 2 — the packaged source path to copy from.
      //
      // The expected value is composed by the TEST, and the split matters. The
      // `root/.github/workflows` join — the part production can get wrong — is
      // stated here through a test-owned helper. The assets-directory prefix is
      // NOT independently stateable by any test: it answers "where is this
      // package installed", which is knowable only by asking, and hardcoding
      // this checkout's layout would pin the harness rather than the behaviour.
      // So `getInitAssetsDir()` is shared and the join is not. That is a
      // narrower sharing than the DRY import the sibling suite refuses (a
      // directory CONSTANT imported from the module under test, where one rename
      // would move both sides together): here a production change to either the
      // `root` segment or the `.github/workflows` segments reddens this line.
      //
      // The path is absolute and host-specific by nature, which is why it is
      // asserted through a computed value rather than a literal.
      expect
        .soft(
          message,
          "the message must name the packaged source path to copy from, per the contract's required message content",
        )
        .toContain(shippedWorkflowsDir());

      // The manual repair itself, per BR-0006-0020 (「install 済み package 内の
      // copy で当該ファイルを置き換える」). Asserted as the repair VERB rather
      // than as the full sentence: the packaged operand is pinned by the
      // assertion above, and pinning the whole phrasing would make any rewording
      // of compliant prose redden. The verb is the part that cannot be reworded
      // away while the clause still names a repair.
      expect
        .soft(message, "the message must name the manual repair, not merely the drift")
        .toMatch(/\breplace\b/i);

      // REQUIREMENT 3 — an explicit statement that QFAI will not overwrite the
      // file itself.
      //
      // The NEGATION is inside the pattern on purpose. A bare `/overwrit/`
      // needle would pass on "QFAI overwrites the file for you", which is the
      // exact opposite of the requirement and of doctor's read-only non-goal.
      // The bounded gap keeps the negation and the verb in one clause, so a
      // "never" three sentences away cannot satisfy it.
      expect
        .soft(
          message,
          "the message must state that the installed file is never overwritten, per the contract's required message content",
        )
        .toMatch(/\bnever\b[\s\S]{0,40}overwrit/i);

      // REQUIREMENT 4 — no imperative naming a `qfai` subcommand as the repair.
      //
      // Swept over `check.message` alone and never over a serialization of the
      // whole check: `details` is a machine surface whose keys and values are
      // owned by other rows, and folding it in would make this row redden on
      // their payloads.
      //
      // Each token is reported with its own source in the label, so a failure
      // names which token fired rather than only that one did.
      for (const token of COMMAND_TOKENS) {
        expect
          .soft(
            message,
            `no refresh command exists, so the repair text must name no command: token /${token.source}/ matched`,
          )
          .not.toMatch(token);
      }
    });
  },
);

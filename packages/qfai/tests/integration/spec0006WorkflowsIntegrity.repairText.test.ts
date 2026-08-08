/**
 * Integration: the repair text carried by the installed shipped-workflow drift
 * advisory (`qfai doctor`).
 *
 * The oracle is the four "Required message content" items of
 * `.qfai/contracts/cli/qfai-doctor.md`'s `workflows.integrity` section, each
 * restated at its own labelled assertion below. THE PRIMARY ORACLE IS EXACT
 * EQUALITY on the whole MESSAGE, composed test-side; the three named needles
 * survive it as labelled restatements. Requirement 1 belongs to the sibling
 * drift suite, but the pin SUBSUMES it, so a change to that clause reddens both
 * rows — accepted: one message, one emission site.
 *
 * Leg (a) of TC-0006-0030 only: leg (b) (an absent shipped name is not drift)
 * is TDD-0038's, leg (c) (an unresolvable packaged copy skips at `info`) is
 * TDD-0039's — both `todo`, neither missing.
 *
 * TWO NEEDLE RULES, cited by number below:
 *   1. A NEEDLE SPANNING MORE THAN ONE WORD MUST BOUND ITS GAPS IN WORDS
 *      (`(?:\s+\w+){0,N}\s+`), NEVER IN CHARACTERS.
 *   2. IT MUST BIND EVERY OPERAND THE REQUIREMENT NAMES — subject as well as
 *      verb, object as well as instrument.
 * A positive needle fails RED when over-tight, a negative sweep when
 * over-broad; which side an oracle sits on decides how tight to make it.
 *
 * Observed through `createDoctorData`, matching both sibling suites: the message
 * is composed at the registration site, so the reader cannot see it. Each
 * describe block is one ledger row; the round-by-round derivation — witnesses,
 * measurements, mutant blobs — is in `.qfai/evidence/implement-spec-0006.md`.
 */
// QFAI:SPEC-0006:TC-0006-0030

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createDoctorData } from "../../src/core/doctor.js";
import { shippedWorkflowsDir } from "../helpers/shippedWorkflowFixtures.js";
import { editShippedWorkflow, useAdopterTreePool } from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

/** The installed shipped workflow this row hand-edits to produce the drift. */
const STALE_NAME = "qfai-tests.yml";

/**
 * How that file is rendered in the message: root-relative, POSIX separators.
 *
 * TEST-OWNED and deliberately not imported from the sibling suite's
 * `ADOPTER_WORKFLOWS_DIR` nor from production's `WORKFLOWS_DIR_RELATIVE`. The
 * equality pin's whole discriminating power is that both sides are stated
 * independently; taking this from the reader would make the pin agree with
 * whatever the reader computes, which is the coordinated-edit hole the sibling
 * row's `toBe` was introduced to close.
 */
const ADOPTER_STALE_PATH = `.github/workflows/${STALE_NAME}`;

/** tests/integration/<this file> -> tests -> packages/qfai */
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLI_MAIN_PATH = path.join(packageRoot, "src", "cli", "main.ts");

/**
 * Escapes a literal for embedding in a `RegExp` source. TEST-LOCAL although
 * `src/core/regex.ts` exports the same one-liner, and the duplication is the
 * point: an escape that stops escaping `.` turns the expected path's `.github`
 * segment into a wildcard, WIDENING the needle below. Do not "DRY" it into an
 * import — that puts this row's oracle within reach of a production edit, in
 * the false-GREEN direction.
 */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Every `qfai` subcommand in `src/cli/main.ts`'s dispatch, with NO omissions —
 * enforced by the second `it` in this row's describe block, because the failure
 * direction of a stale hand-mirror is a FALSE GREEN: a subcommand present in the
 * dispatch and missing here silently narrows tokens 7 and 8. Mirrored rather
 * than imported to keep this row's zero-production-change record; the guard
 * supplies what the import would have. "NO omissions" is that guard's measured
 * reach and not a hope — it holds for every `case ` LINE, including one whose
 * label the extractor cannot parse. Reach per LINE, not per label: the one
 * precondition the guard cannot enforce is recorded at its leg 2 rather than
 * restated here. Both tokens 7 and 8 take the FULL registry; token 8's note
 * carries the constraint that puts on the message.
 */
const CLI_SUBCOMMANDS = [
  "init",
  "validate",
  "report",
  "doctor",
  "guardrails",
  "audit",
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
 * most needs. Token 8 resolves it with a separator LOOKBEHIND, never a
 * lookahead: a path occurrence is always PRECEDED by `/`, `\`, `@`, `.` or `-`
 * (`…/assets/init/root`, `qfai-validate.yml`), an imperative never is. Its
 * lookahead deliberately does NOT exempt `.`, which is the fix rather than an
 * oversight — see the token's own note below. Measured clean on the Windows
 * path, the POSIX path, `qfai-validate.yml` and the pnpm store form
 * (`node_modules/.pnpm/qfai@1.9.0/node_modules/qfai/assets/init/root`); measured
 * FIRING on `re-run init to restore it` and `re-run init.` (tokens 7 AND 8) and
 * on `To repair, validate.` and `If you prefer, init the tree again.` (token 8
 * alone, which is what earns it its place beside token 7).
 *
 * The other tokens are anchored so that a path SEGMENT BOUNDARY cannot satisfy
 * them — `\s` after `qfai`, a word boundary for the package managers, leading
 * whitespace before a flag. That is narrower than "a path cannot satisfy them",
 * which is false and was measured to be false: a checkout path containing a
 * SPACE fires token 1. An over-fire only, in the FALSE-RED direction, and
 * invisible in CI, which runs a space-free checkout path. The derivation is in
 * the evidence file rather than here.
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
  // `refreshes` both escaped `/\brefresh\b/i`, and one carried the worst message
  // in this row's history — "the installed file is refreshed in place on your
  // next install". Measured clean on the shipped message and on both packaged
  // path forms.
  /\brefresh/i,
  // Token 7 — the IMPERATIVE bound to the subcommand, which is the shape the
  // contract forbids. `(?:qfai\s+)?` makes the binary optional, so `run qfai
  // doctor` and the bare `re-run doctor` both fire. No separator guard is needed:
  // a path segment is never preceded by a `run`-class word, which is why binding
  // the operand let the full registry back in.
  new RegExp(
    `(?:^|[^\\w])(?:re-?)?(?:run|execute|invoke|use)\\s+(?:qfai\\s+)?(?:${CLI_SUBCOMMANDS.join("|")})\\b`,
    "i",
  ),
  // Token 8 — the bare verb, for the imperative with no "run"-class word before
  // it. THE LOOKBEHIND IS LOAD-BEARING AND THE LOOKAHEAD MUST STAY NARROW: a
  // form guarding only on the RIGHT has to exempt a full stop so that
  // `qfai-validate.yml` stays clean, and that exemption lets a SENTENCE-FINAL
  // imperative through — measured, `\b(?:…)\b(?![\\/@.])` is GREEN on `re-run
  // init.` and on `To repair, validate.` where the form below reddens both. Do
  // not add `.` back to silence a path false positive; widen the lookbehind.
  //
  // THE FULL REGISTRY, `report` / `audit` / `doctor` included. An earlier form
  // dropped those three because compliant prose MIGHT fire on them ("this check
  // will report the difference") — a narrowing of a NEGATIVE needle to avoid a
  // false RED, which is the one move the rule at the head of this list forbids.
  // The three ALL-GREEN violations that used to be cited as the warrant
  // (`nextActions: ["doctor"]` / `["report"]` / `["audit"]`) were `details`-side
  // and left this row's reach when the rendered-surface sweep was removed; their
  // owner is now named at the pin below. What warrants the full registry HERE is
  // the rule plus the LABEL: on `message` the equality pin is the closure, and
  // this token is a labelled restatement of requirement 4 standing beside it.
  //
  // ITS FALSE-RED RISK IS BOUNDED BY THE EQUALITY PIN, and the bound holds because
  // `message` is now this token's ONLY haystack — that scope is the whole of the
  // argument, so it is stated rather than left to be inferred. The bound is a
  // PROOF, not a measurement: any `message` differing from `expectedMessage`
  // already reddens the pin, and `expectedMessage` itself is token-clean (measured
  // every round), so this token can only ADD a labelled failure beside a red the
  // pin has already raised — never raise a lone one. While the sweep existed the
  // same token object also governed `title` and `details`, which no test pins, and
  // there the bound did NOT hold: a contract-compliant retitle produced exactly
  // that lone false RED.
  //
  // CONSTRAINT ON THE MESSAGE, recorded as token 1's is: it may not use those
  // three as BARE WORDS. The shipped text says "reports", which the trailing `\b`
  // rejects (measured).
  new RegExp(`(?<![\\\\/@.\\w-])(?:${CLI_SUBCOMMANDS.join("|")})\\b(?![\\\\/@])`, "i"),
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

      // GUARD #1-#2 are PRECONDITIONS on the fixture and stay hard; everything
      // after them is this row's claim and is `expect.soft`. Guard #1 collapses
      // the no-emission mode's twelve `got undefined` failures into one that
      // names the cause. BORROWED PRECONDITION, owner named: "the emission site
      // can fire at all" is TDD-0029's first `it`, restated here as a guard
      // rather than relied on silently.
      expect(
        check,
        "the drift advisory must be registered, or there is no message to inspect",
      ).toBeDefined();

      // Guard #2 closes a VACUITY OF THE TOKEN SWEEPS AND THE REGISTRATION PIN,
      // and only that: severity `ok` means the content-identical emission is
      // under inspection, whose message names no command either.
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

      // THE PRIMARY ORACLE — exact equality on the whole message, composed from
      // parts this test owns, so nothing is read from the module under test. Both
      // DRY refusals recorded at requirement 2 apply unchanged, and the second is
      // load-bearing here: exporting the message's sentences would make this the
      // one assertion in the file that a single import hollows out completely.
      //
      // WHY THE THREE NAMED NEEDLES SURVIVE IT, since it entails them all: the
      // pin's failure message names no requirement, and the reflex on a failing
      // equality assertion is to paste in the new string — the one failure mode
      // exact equality has. The named lines make a reflexive update visibly
      // wrong, and that defense is a PROPER SUBSET of the threat, measured in
      // both directions rather than assumed:
      //   - paste in a REVERSED repair and requirement 2's line stays RED and
      //     names the item (prod `599d8b1e` + test `d2af8505`);
      //   - paste the GOVERNING NEGATION into BOTH sides and the row is ALL GREEN
      //     (prod `a4d45b35` + test `c23cba4e`).
      // So the class they miss on re-paste is exactly the governing-negation
      // class that motivated the pin: they reduce the snapshot risk, they do not
      // remove it, and no oracle available to this row does.
      //
      // The pin says nothing about `title` or `details`, AND NEITHER IS SWEPT HERE.
      // TC-0006-0030 clause (a), BR-0006-0020 and the contract's "Required message
      // content" all scope requirement 4 to the message BODY, so an assertion over
      // the other rendered fields is a reviewer-originated obligation — recorded as
      // advisory and routed to the Change Request path, never encoded as a hard
      // assertion. One was carried here for three rounds and removed on
      // measurement: it produced a CLEAN FALSE RED, no legitimate red beside it, on
      // the contract-compliant retitling `"Workflows integrity report (…)"`, while
      // MISSING the `title` vector it had been widened to cover — a title reading
      // `qfai<TAB>report` passes this row whole. Contract widening is routed
      // upstream; nothing here waits on it.
      //
      // WHAT THAT LEAVES, split by OWNER rather than by mechanism:
      //   - `details` is BR-0006-0022's closed four-key payload, TDD-0036's to pin.
      //     Every constructible violation needs an EXTRA key — `nextActions: ["qfai
      //     init --force"]`, the shape `skills.integrity` actually ships, and its
      //     tab-escaped form `["qfai\tinit\t--force"]` alike — so a `toEqual` on the
      //     key set closes the whole class INCLUDING the escaped forms, which no
      //     whitespace-anchored needle can see (`JSON.stringify` writes a backslash
      //     then `t`; `\n` and `\r\n` behave identically — measured). TDD-0036 is
      //     `todo`, so the class is UNCOVERED IN THE INTERVAL: deliberate, and with
      //     a named owner rather than a silent gap.
      //   - `title` is UNOWNED, and naming that is the point of this note. A tab
      //     inside its VALUE carries a command with no key-set change, so TDD-0036's
      //     `toEqual` will not reach it either and no key-set pin can. It is outside
      //     the contract as written, which is why it is recorded and raised upstream
      //     instead of asserted.
      const expectedMessage =
        `installed shipped workflow(s) differ from the packaged copy: ${ADOPTER_STALE_PATH}. ` +
        `Manual repair: replace each listed file with the copy of the same name in ${shippedWorkflowsDir()}. ` +
        `The installed file is never overwritten by QFAI: this finding reports the difference and writes nothing.`;

      // REQUIREMENT 2 — the packaged source path to copy from — as ONE needle
      // over the whole repair clause, directional because TC-0006-0030's Verify
      // (a) is (「install 済み package 内の copy で当該ファイルを置き換える」)
      // and BR-0006-0020 names the packaged copy as the INSTRUMENT. NOT the
      // closure — the pin is — and its limit is that it constrains ADJACENCY, so
      // a negation governing from OUTSIDE the clause it anchors passes it.
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
      // The `\s+` immediately before the path is the ANTI-RELATIVIZATION ANCHOR
      // and it is load-bearing on POSIX specifically. `toContain(packagedDir)`
      // was GREEN on ubuntu — all seven `ci.yml` `runs-on` values are
      // `ubuntu-latest` — for a `toRelativePath(root, packagedDir)` tidy-up at
      // the emission site, because `toRelativePath` has no absolute fallback
      // (`src/core/paths.ts`) and the `../..` chain CONTAINS the absolute
      // target: the last `../` supplies the leading `/`.
      //
      // On Windows the same edit reddens twice over (`C:` and backslashes). The
      // relationship between the anchor and the gap is NOT independence. Three
      // variants against the relativized message — the Windows column EXECUTED, the
      // POSIX column CONSTRUCTED, since this row cannot run ubuntu from this host:
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
      // for. Do not "simplify" it in that direction. The measurement stays beside
      // the rule because a maintainer who reads "never bound a gap in characters"
      // has no reason to believe a character WINDOW is different in kind, and the
      // only lane that would catch it cannot show them.
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
      //     including the eight negative ones — and it is the edit the previous
      //     round already required be refused for the directory constant.
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
      // nothing else pins. That is why the needle grew twice: subject, negation
      // and verb are each bound (rules 1 and 2), because every looser form was
      // GREEN on a message asserting the opposite.
      expect
        .soft(
          message,
          "the message must state that THE INSTALLED FILE is never overwritten — subject, negation and verb bound in one clause, not merely present in the same sentence — per the contract's required message content",
        )
        .toMatch(/\binstalled\s+file\b(?:\s+\w+){0,3}\s+never\b(?:\s+\w+){0,3}\s+overwritt/i);

      // REQUIREMENT 4 — no imperative naming a `qfai` subcommand as the repair —
      // over `message`, the surface the contract scopes it to. Each token's source
      // is in the label, so a failure names which token fired. The label admits
      // token 1's known false positive because otherwise it MISDESCRIBES its own
      // failure: on prose that names no command but puts a word straight after the
      // product name, "must name no command" is a true statement about a message
      // the token just rejected.
      //
      // ITS HAYSTACK IS `findings[0].message` AND NOTHING ELSE, which the label
      // states rather than leaving to be inferred from the code on a red: a SECOND
      // registration's message is swept by nothing in this file. Held by
      // `toHaveLength(1)` above, so there is no false GREEN — measured, a duplicate
      // command-bearing registration yields exactly that one failure and the three
      // token observations are LOST, not silently passed.
      for (const token of COMMAND_TOKENS) {
        expect
          .soft(
            message,
            `no refresh command exists, so the repair text must name no command — this sweep reads findings[0].message ONLY, so a second registration is held by the length assertion above and not by this one; token 1 also fires on a word placed straight after the product name, which is a known false positive, not a violation: token /${token.source}/ matched`,
          )
          .not.toMatch(token);
      }

      // The equality pin, last so the labelled restatements report first.
      expect
        .soft(
          message,
          "the drift message must be EXACTLY the contract-fixed text: the stale path, the manual repair naming the packaged source, and the no-overwrite statement, with nothing added, removed, negated, retracted or reordered",
        )
        .toBe(expectedMessage);
    });

    // COMPLETENESS GUARD ON THIS ROW'S OWN TOKEN LIST, not on production.
    // COVERAGE, not set equality: a member the dispatch has dropped only widens a
    // negative sweep (false RED at worst), while a dispatch label missing from the
    // mirror loses coverage silently. Scanning source TEXT rather than importing a
    // registry keeps this row's zero-production-change record, and it is idiomatic
    // in this slice — `tests/integration/shippedWorkflowOwnership.test.ts`, a
    // sibling inside this row's own refactor closure, asserts over
    // `src/cli/commands/init.ts` text the same way. `main.ts` holds exactly ONE
    // `switch`, so extracting every `case "…":` is unambiguous; a second switch
    // would over-collect, which is again the safe direction.
    it("this row's CLI_SUBCOMMANDS mirror covers every subcommand in the dispatch", async () => {
      const source = await readFile(CLI_MAIN_PATH, "utf-8");
      // `[\w-]+`, not `[a-z][a-z-]*`: the narrow class cannot see a label carrying
      // a DIGIT or an UNDERSCORE. WHAT THE WIDENING BUYS IS NOT DETECTION, and the
      // earlier claim that it was is corrected here: with the count leg below in
      // place, `case "atdd2":` reddens under the NARROW class too, because the
      // label the capture drops is still counted (measured: 1 failure, the count
      // leg alone, `expected 10 to be 11`). It buys the RIGHT LABEL on that red —
      // the count leg reports "not extractable" where the coverage check below
      // reports the actual defect, a dispatched subcommand missing from this
      // mirror — and it avoids a FALSE RED the day a legitimate label carries a
      // digit, which the narrow class would report as an extraction failure
      // forever.
      const dispatched = [...source.matchAll(/^\s*case "([\w-]+)":/gm)].map((match) => match[1]);

      // NON-VACUITY, two legs, neither of which covers the other's failure.
      //
      // Leg 1 — the extraction found the dispatch at all; `[]` would pass the
      // coverage check trivially. `doctor` is the anchor rather than a floor
      // count because it is the command this row's fixture runs, and unlike a
      // floor it cannot go stale when some other subcommand retires.
      expect(dispatched, "the case-label extraction must find the dispatch").toContain("doctor");

      // Leg 2 — the extraction was TOTAL. Leg 1 is blind to a PARTIAL miss,
      // since `doctor` stays found however many other labels the capture drops,
      // so even the widened class leaves a label outside `[\w-]+` (a dot, a
      // space, a computed label) uncovered — measured, prod `b0bc981e`
      // (`case "a.b":`) reaches this leg and nothing else in this row. A COUNT
      // rather than a pinned number, so it cannot go stale when a subcommand
      // retires.
      //
      // "TOTAL" IS TOTAL PER LINE, NOT PER LABEL, and that is a PRECONDITION THIS
      // GUARD DOES NOT ENFORCE: both legs are line-anchored (`^\s*case `), so a
      // single line carrying TWO labels is counted once and captured once and both
      // legs stay green while the second label is dispatched and absent from the
      // mirror. Measured: `case "init": case "zzz":` leaves this row at `2 passed`,
      // exit 0, with `zzz` reachable (prod `0964f3b3`) — a FALSE GREEN, and the one
      // the count leg was supposed to make impossible. ONE `case` LABEL PER LINE is
      // therefore a precondition held by `pnpm format:check`, which rejects that
      // form (measured: `prettier -c src/cli/main.ts` exits 1 on it), and not by
      // anything in this file. Do not restate it as an assertion here: a
      // line-anchored guard cannot see the property it would need to check.
      expect(
        dispatched.length,
        "every `case ` line in src/cli/main.ts's dispatch must be extractable, or this guard covers only the labels it happened to parse",
      ).toBe((source.match(/^\s*case /gm) ?? []).length);

      const missing = dispatched.filter((name) => !CLI_SUBCOMMANDS.some((known) => known === name));
      expect(
        missing,
        "every subcommand in src/cli/main.ts's dispatch must appear in this file's CLI_SUBCOMMANDS, or tokens 7 and 8 silently stop looking for it",
      ).toEqual([]);
    });
  },
);

# Change Request

- ID: `CR-20260923-0001`
- Title: `Six completed spec-0012 ledger rows name a requirement where a test case belongs`
- Raised by: `claude-code`
- Raised at: `2026-09-22T22:30:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-22T22:45:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T11:25:00Z` — see Resolution
- Superseded by: `-`

## Context

Six `done` rows of `.qfai/specs/spec-0012/tdd/test-list.md` hold a requirement
id in `TC-Refs` instead of a test case. `TC-Refs` is the ledger's half of the
Article V chain, so each of these rows traces to nothing.
`packages/qfai/tests/assets/completedRowNamesItsTestCase.test.ts` holds all six
in its backlog, beside `TDD-0420`.

The four requirements, `REQ-0012-0075` to `REQ-0012-0078`, appear in
`01_Spec.md`, `09_delta.md` and `16_Traceability-ledger.md`. No user story,
acceptance criterion, business rule, example or test case names any of them.

Each row's tests exist and pass. What they verify, and whether a case in the
pack already states it:

| Row        | `TC-Refs` today | Test file                                                                                  | What the tests verify                                                                                                                                          | An existing case that states it                                                                                                                                             |
| ---------- | --------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TDD-0496` | `REQ-0012-0077` | `packages/qfai/tests/integration/cli/commands/prototypingIterate.stopReason.test.ts`       | the four `stopReason` values, the validator accepting each, and the CLI writing `license-verify-fail` and exiting 2 on an input error                          | `TC-0012-0463`, which `TDD-0505` already holds on the same file                                                                                                             |
| `TDD-0497` | `REQ-0012-0078` | `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts` | the `--check-convergence` peek: exit 0 or 2, the reason printed, `--cycle` defaulting to 9, nothing written                                                    | None. `TC-0012-0470` pins only the out-of-range hint text that names the flag                                                                                               |
| `TDD-0514` | `REQ-0012-0075` | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts`       | `--capture` parsed from the command line, the default Playwright runner, screens taken from the UI contracts (`.yaml` and `.yml`), and capture URL composition | None. `TC-0012-0440` states default-off, per-screen writes and `htmlSourceCopy` through an injected runner, and `TDD-0467` holds it on `prototypingIterate.capture.test.ts` |
| `TDD-0515` | `REQ-0012-0076` | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`     | `--auto-serve` parsed from the command line, the default server runner, its 2000 ms teardown, and the refusal on a busy port                                   | None. `TC-0012-0442` states the runner contract through an injected runner, and `TDD-0469` holds it on `prototypingIterate.autoServe.test.ts`                               |
| `TDD-0516` | `REQ-0012-0077` | `packages/qfai/tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts`       | how `composeCaptureUrl` joins a screen URL to `--target-url`                                                                                                   | None. Only `.qfai/contracts/cli/qfai-prototyping-iterate.md` states the composition                                                                                         |
| `TDD-0517` | `REQ-0012-0075` | `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`    | the default capture runner refusing a navigation that answers 400 or above, or answers nothing                                                                 | None                                                                                                                                                                        |

**`TDD-0496` is a duplicate row.** `09_delta.md` records `REQ-0012-0077` as
"satisfied in Phase 4 via TC-0012-0463", and the ledger's Phase 4 notes say
`TC-0012-0463` absorbs it. Pointing `TDD-0496` at that case gives two rows on
one test case, one test file and one boundary. `QFAI-TDDLIST-018` names that
shape a duplicate row that belongs in a Change Request, not a second
`Boundary` slug.

**`TC-0012-0440` and `TC-0012-0442` do not state the follow-ups.**
`REQ-0012-0075` and `REQ-0012-0076` exist because those two cases were met
through the `runPrototypingIterate` options while the command line parsed
neither flag and no default runner shipped. Each case already has its own row
on another file. Pointing `TDD-0514` or `TDD-0515` at one of them makes a
split, and `QFAI-TDDLIST-017` then requires each sibling to name a `Boundary`
taken from how the case states it. Neither case states a command-line or a
default-runner boundary.

The criteria above them do state the obligation, from the operator's side.
`AC-0012-0059` says that when `qfai prototyping iterate` is invoked with
`--capture`, iterate MUST drive Playwright and write every `screens[]` entry.
`AC-0012-0060` says the same of `--auto-serve`, and `AC-0012-0061` names all
four `stopReason` values. So the new cases for the capture and serve rows sit
under those criteria, and each follow-up requirement joins its criterion's
`REQ-Refs`. Only the peek has no criterion.

**`16_Traceability-ledger.md` misreads three of the five follow-up
requirements.** Its primary-SUT table, under "CHG-005 Phase 2 follow-up REQs
(REQ-0012-0074..0078)", is shifted against `01_Spec.md`:

| Requirement     | `01_Spec.md`                                                       | `16_Traceability-ledger.md`                                                | The product and `09_delta.md`                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REQ-0012-0074` | the live-loop measurement in `tailwindContractConvergence.test.ts` | `args.ts` parsing of `--capture`, `--auto-serve` and `--check-convergence` | That parsing is the other three requirements' own. The test named is an in-process steady-state guard; no live-loop run exists                                                                               |
| `REQ-0012-0077` | `stopReason` widened to four values                                | `composeCaptureUrl`                                                        | `StopReason` in `packages/qfai/src/core/prototyping/iteration.ts` has four values, and `prototypingEvidence.ts` accepts them through `isStopReason`. `composeCaptureUrl` arrived with the `--capture` wiring |
| `REQ-0012-0078` | `--check-convergence` flag wiring                                  | `.yml` parity in `readUiContractScreenContracts`                           | `args.ts` parses `--check-convergence`, and `runCheckConvergencePeek` answers it. `.yml` parity is tested in block (10) of `cliCapture.test.ts`, under the `--capture` wiring                                |

`01_Spec.md` is the correct reading. The code, the CLI contract and
`09_delta.md` ("satisfied in Phase 4 via TC-0012-0463"; "satisfied 2026-05-26
via TDD-0497") all agree with it. The ledger's `TDD-0516` row and the
`TDD-0516` row of `tdd/test-list.md` carry the same misreading: both cite
`REQ-0012-0077` for URL composition.

**`REQ-0012-0078` names a file the peek does not read.** Its acceptance
signal says the command reads `.qfai/prototypes/iter-09/prototyping.json`.
`runCheckConvergencePeek` reads `.qfai/evidence/prototyping/prototyping.json`,
and so do the CLI contract and `09_delta.md`. A criterion written for the peek
has to state the second path, so the requirement is restated with it.

## Reproduction

From `.qfai/specs/spec-0012/tdd/test-list.md`, `TC-Refs` and `Test file`:

```text
177: TDD-0514 | REQ-0012-0075 (REQ-0109 follow-up) | integration | .../prototypingIterate.cliCapture.test.ts
178: TDD-0515 | REQ-0012-0076 (REQ-0110 follow-up) | integration | .../prototypingIterate.cliAutoServe.test.ts
179: TDD-0516 | REQ-0012-0077 (REQ-0109 follow-up) | unit        | .../prototypingIterate.composeCaptureUrl.test.ts
180: TDD-0517 | REQ-0012-0075 (REQ-0109 follow-up) | unit        | .../defaultCaptureScreen.responseStatus.test.ts
213: TDD-0496 | REQ-0012-0077 (REQ-0117 follow-up) | integration | .../prototypingIterate.stopReason.test.ts
214: TDD-0497 | REQ-0012-0078 (REQ-0129 follow-up) | integration | .../prototypingIterate.checkConvergence.test.ts
227: TDD-0505 | TC-0012-0463                       | integration | .../prototypingIterate.stopReason.test.ts
```

None of the six `Selector` cells appears in its `Test file`; each begins with
the requirement id, which no test title carries.

The chain holds none of the four requirements:

```text
grep -n "REQ-0012-007[5-8]" 02_User-stories.md 03_Acceptance-Criteria.md \
  04_Business-Rules.md 05_Examples.md 06_Test-Cases.md
-> no match
```

From `.qfai/specs/spec-0012/16_Traceability-ledger.md`:

```text
264: | REQ-0012-0074 | `packages/qfai/src/cli/lib/args.ts` (`--capture` / `--auto-serve` / `--check-convergence` flag parsing) | ...cliCapture.test.ts (cycle-0 wiring)
267: | REQ-0012-0077 | `packages/qfai/src/cli/commands/prototypingIterate.ts` (`composeCaptureUrl` URL composition policy) | ...composeCaptureUrl.test.ts (TDD-0516)
268: | REQ-0012-0078 | `packages/qfai/src/core/contracts/screenContracts.ts` (`readUiContractScreenContracts` `.yml` parity) | ...cliCapture.test.ts describe (10)
```

From the source:

```text
packages/qfai/src/core/prototyping/iteration.ts:38
  export type StopReason = "converged" | "max-iterations" | "license-verify-fail" | "input-error";
packages/qfai/src/cli/lib/args.ts:915
  case "--check-convergence": {
packages/qfai/src/core/prototyping/paths.ts:12
  export const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json" as const;
```

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                 | Cost                                                                                                                                      | Risk                                                                                                                                                                                                                                                                                                                                | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Remove the duplicate row. Put new cases under the criteria that already state capture and serve. Write one chain for the peek. Correct the three ledger rows                           | 1 story, 1 criterion, 2 rules, 3 examples, 5 test cases; three `REQ-Refs` extended; one requirement restated; one row removed, five reset | The capture and serve criteria gain requirements their statements already cover, and no statement moves. The peek story brings one `E2E` row at `todo`                                                                                                                                                                              | ✅          |
| 2   | As option 1, but hang the peek criterion from `US-0012-0137` instead of a new story                                                                                                    | One id fewer, and no new `E2E` row                                                                                                        | `US-0012-0137` asks for the out-of-range error and its hint. The peek is its own command, which the sealed-loop refusal also recommends. Its `E2E` row, `TDD-0495`, is `done` and never demonstrated the peek, so it would have to be reset, which costs what option 1's new row costs                                              |             |
| 3   | A full chain, story to test case, for each follow-up requirement                                                                                                                       | 4 stories, 4 criteria, 5 or more rules, examples and cases; four `E2E` rows                                                               | `AC-0012-0059`, `-0060` and `-0061` already state the capture, serve and `stopReason` obligations. A second criterion for each says one thing twice, and the two drift                                                                                                                                                              |             |
| 4   | Point every row at the nearest existing case: `TDD-0514`, `-0516`, `-0517` at `TC-0012-0440`, `TDD-0515` at `TC-0012-0442`, `TDD-0497` at `TC-0012-0470`, `TDD-0496` at `TC-0012-0463` | Smallest. No new id                                                                                                                       | Each row then certifies a case that does not state what its test verifies: `TC-0012-0470` pins a hint, not the peek. It makes four splits that `QFAI-TDDLIST-017` requires `Boundary` slugs for, from statements that name none of those boundaries, and `TDD-0496` repeats `TDD-0505`'s boundary, which `QFAI-TDDLIST-018` rejects |             |

## Proposed change

Option 1. The ids below are the next free ones when this record is applied
first: the pack's last are `US-0012-0142`, `AC-0012-0082`, `BR-0012-0065`,
`EX-0012-0186` and `TC-0012-0483`.

1. **`TDD-0496` is removed.** `TDD-0505` keeps `TC-0012-0463`, and
   `REQ-0012-0077` reaches it through `AC-0012-0061`. The ledger gains a
   `## TDD-ID reservations` section, which it does not have yet, holding the
   tombstone:

   ```markdown
   - ~~TDD-0496~~ — row deleted <YYYY-MM-DD>, duplicate of TDD-0505 on TC-0012-0463, removed by CR-20260923-0001
   ```

   One line is appended to the ledger's "Phase 4 notes", after the note that
   `TC-0012-0463` absorbs `REQ-0012-0077`:

   ```markdown
   - TDD-0496 was removed under CR-20260923-0001 as a duplicate of TDD-0505; its id is tombstoned and not reused.
   ```

2. **Three criteria gain a requirement.** No statement changes.

   | Criterion      | `REQ-Refs` today | `REQ-Refs` after               |
   | -------------- | ---------------- | ------------------------------ |
   | `AC-0012-0059` | `REQ-0012-0061`  | `REQ-0012-0061, REQ-0012-0075` |
   | `AC-0012-0060` | `REQ-0012-0062`  | `REQ-0012-0062, REQ-0012-0076` |
   | `AC-0012-0061` | `REQ-0012-0063`  | `REQ-0012-0063, REQ-0012-0077` |

3. **`REQ-0012-0078` is restated** in `01_Spec.md` with the path the product
   reads. The line is rewritten in English, as a changed line in this
   repository is:

   ```markdown
   - REQ-0012-0078 (REQ-0129 follow-up): `qfai prototyping iterate --check-convergence` MUST report
     the recorded state of the loop without running a cycle. It reads
     `.qfai/evidence/prototyping/prototyping.json`, prints `stopReason`, `acceptedIterationIndex`
     and the number of recorded iterations, writes nothing, and exits 0 only when `stopReason` is
     `converged` and `acceptedIterationIndex` is a non-negative integer. Every other state, and a
     missing or unreadable file, exits 2. `--cycle` may be omitted and then defaults to 9. This is
     the command the `--cycle` out-of-range hint (REQ-0012-0073) recommends.
   ```

4. **`02_User-stories.md`** gains one story after `US-0012-0142`, and one
   catalogue line after the `US-0012-0142` line of `## US Catalog`:

   ```markdown
   - US-0012-0143: `qfai prototyping iterate --check-convergence` to report whether the loop has converged without running a cycle
   ```

   ```markdown
   ## US-0012-0143

   As an `/qfai-prototyping` operator, I want `qfai prototyping iterate --check-convergence` to
   report whether the loop has converged without running a cycle, so that I can choose between
   `certify` and another cycle from the recorded state. (REQ-0012-0078)
   ```

5. **`03_Acceptance-Criteria.md`** gains one criterion after `AC-0012-0082`,
   before `## Completion Gate`:

   ```markdown
   ## AC-0012-0083: `iterate --check-convergence` reports the recorded loop state read-only (REQ-0012-0078)

   - US-Refs: US-0012-0143
   - REQ-Refs: REQ-0012-0078
   - Given a prototyping evidence tree whose `prototyping.json` records a loop state,
   - When `qfai prototyping iterate --check-convergence` runs, with or without `--cycle`,
   - Then it MUST print `stopReason`, `acceptedIterationIndex` and the number of recorded
     iterations, and exit 0 only when `stopReason` is `converged` and `acceptedIterationIndex` is a
     non-negative integer.
   - And every other state, including a missing or unreadable `prototyping.json`, MUST exit 2 and print the reason.
   - And the run MUST write nothing and MUST NOT start a cycle.
   ```

6. **`04_Business-Rules.md`** gains two rules after `BR-0012-0064`, the
   file's last entry:

   ```markdown
   ## BR-0012-0066: `iterate --capture` navigation — the URL opened and the answer accepted (REQ-0012-0075)

   - AC-Refs: AC-0012-0059
   - A `screens[].url` beginning `http://` or `https://` MUST be opened as written. A route-relative
     one MUST be joined to `--target-url` with WHATWG `new URL(route, base)`. A screen with no URL
     falls back to `--target-url`, or to no URL when that is absent.
   - A route-relative `screens[].url` with no `--target-url`, or a pair that does not compose into a URL, MUST fail that screen with a reason naming the screen and `--target-url`, and iterate exits 2.
   - The default capture runner MUST treat a navigation that answers HTTP 400 or above, or answers nothing, as a capture failure for that screen, and MUST NOT take its screenshot.

   ## BR-0012-0067: `iterate --check-convergence` is a read-only peek (REQ-0012-0078)

   - AC-Refs: AC-0012-0083
   - `--check-convergence` MUST read `.qfai/evidence/prototyping/prototyping.json`, and MUST NOT write a file, launch Playwright or start a cycle. It does not require `--target-url`.
   - `--cycle` MAY be omitted under `--check-convergence`, and then defaults to 9. A `--cycle` given is reported back and does not change what is read.
   - Converged means `stopReason` is `converged` and `acceptedIterationIndex` is a non-negative
     integer. That state exits 0. Every other state exits 2 and names why: `max-iterations`,
     `license-verify-fail`, `input-error`, no terminal state yet, a `converged` record with no
     accepted iteration, or no readable `prototyping.json`.
   ```

7. **`05_Examples.md`** gains three examples after `EX-0012-0185`, the file's
   last entry:

   ```markdown
   ## EX-0012-0187: Capture URL Composed From A Route And `--target-url` (REQ-0012-0075)

   - BR-Ref: BR-0012-0066
   - Given `screens[]` declaring `home` at `/`, `settings` at `settings` and `docs` at `https://docs.example.com/start`, and `--target-url http://localhost:5173/app/`,
   - When `qfai prototyping iterate --capture` composes each capture URL,
   - Then `home` opens `http://localhost:5173/`, `settings` opens
     `http://localhost:5173/app/settings`, and `docs` opens `https://docs.example.com/start`
     unchanged. A cycle-1 run with `--capture` and no `--target-url` stops at `home` with a reason
     naming `home` and `--target-url`, and exits 2.

   ## EX-0012-0188: A Screen Answering HTTP 404 Is Not Captured (REQ-0012-0075)

   - BR-Ref: BR-0012-0066
   - Given the default capture runner opening `http://localhost/missing` for screen `missing`, and the server answering 404,
   - When the runner captures `missing`,
   - Then the capture fails with a reason naming `HTTP 404`, and no screenshot is taken. A 204 answer is captured, and a navigation that returns no response fails with `no response`.

   ## EX-0012-0189: Peeking A Loop That Stopped On The Cycle Budget (REQ-0012-0078)

   - BR-Ref: BR-0012-0067
   - Given `.qfai/evidence/prototyping/prototyping.json` recording `stopReason: "max-iterations"` and `acceptedIterationIndex: null`,
   - When `qfai prototyping iterate --check-convergence` runs without `--cycle`,
   - Then it reports cycle 9, `stopReason: max-iterations` and `acceptedIterationIndex: null`,
     prints `Not converged` with the reason, exits 2, and leaves `prototyping.json` byte-for-byte
     unchanged. The same run against a record of `stopReason: "converged"` and
     `acceptedIterationIndex: 3` prints `Converged` and exits 0.
   ```

   `EX-0012-0187` is named once in `.qfai/evidence/sdd-spec-0012.md`, a
   record of a slice purged before this pack's current numbering. It defines
   nothing, so the id is free.

8. **`06_Test-Cases.md`** gains five cases after `TC-0012-0483`, before
   `## Legacy Coverage Continuity`. The two unit cases declare `Level: L1`, as
   the pack's other unit cases do, so their rows stay ledger-owned; the three
   integration cases carry no `Level`, as their neighbours do, so they are
   `/qfai-atdd`'s.

   ```markdown
   ## TC-0012-0484

   - EX-Ref: EX-0012-0168
   - AC-Refs: AC-0012-0059
   - Type: integration
   - Test file: `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts`
   - Verify REQ-0012-0075: `--capture` on the command line turns capture on, and its absence leaves
     it off. With no screens injected, iterate captures every `screens[]` entry of the project's UI
     contracts, whether the contract file ends `.yaml` or `.yml`. With no runner injected, iterate
     uses the default Playwright runner, and a run where Playwright is not installed exits 2 with a
     reason naming Playwright.

   ## TC-0012-0485

   - EX-Ref: EX-0012-0169
   - AC-Refs: AC-0012-0060
   - Type: integration
   - Test file: `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`
   - Verify REQ-0012-0076: `--auto-serve` on the command line turns serving on, and its absence
     starts no server. With no runner injected, iterate uses the default server runner, whose
     teardown resolves within 2000 ms. When the port is already bound, the default runner refuses
     without touching its owner, and iterate exits 2 with a reason saying the port is in use.

   ## TC-0012-0486

   - EX-Ref: EX-0012-0187
   - AC-Refs: AC-0012-0059
   - Type: unit
   - Level: L1
   - Test file: `packages/qfai/tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts`
   - Verify REQ-0012-0075 capture URL composition: `http://` and `https://` screen URLs pass
     unchanged; a route-relative URL, with or without a leading slash, is joined to `--target-url`
     by `new URL(route, base)`; a screen with no URL falls back to `--target-url`, or to none; a
     route-relative URL with no `--target-url`, and a pair that does not compose, fail with a reason
     naming `--target-url`.

   ## TC-0012-0487

   - EX-Ref: EX-0012-0188
   - AC-Refs: AC-0012-0059
   - Type: unit
   - Level: L1
   - Test file: `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`
   - Verify REQ-0012-0075 default runner response guard: a navigation answering 200, 204 or 399 is
     captured; one answering 404 or 500 fails with a reason naming the status, and one returning no
     response fails with `no response`; no failing navigation is screenshotted.

   ## TC-0012-0488

   - EX-Ref: EX-0012-0189
   - AC-Refs: AC-0012-0083
   - Type: integration
   - Test file: `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts`
   - Verify REQ-0012-0078: `--check-convergence` exits 0 and reports `stopReason` and
     `acceptedIterationIndex` for a record of `converged` with a non-negative accepted index; exits
     2 with `Not converged` and the reason for `max-iterations`, `license-verify-fail`, a negative
     accepted index and a missing `prototyping.json`; parses without `--cycle` and reports cycle 9,
     or the cycle given; and leaves `prototyping.json` unchanged, writing no `iter-NN/` directory
     and no `iterate-plan.json`.
   ```

9. **`tdd/test-list.md`**: the five remaining rows are pointed at the new
   cases. `Test file` does not change. Each row names one case, so none is a
   split and `Boundary` stays `-`.

   | Row        | `TC-Refs`      | `Selector`                                                                                                                                                                                                                                                                            | `Status` | `DR-ID`            |
   | ---------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
   | `TDD-0514` | `TC-0012-0484` | `["iterate --capture: (1) CLI flag parses", "iterate --capture: (3) default Playwright runner fallback", "iterate --capture: (8) auto-derive screens from UI contracts", "iterate --capture: (10) auto-derive screens accepts"]`                                                      | `todo`   | `CR-20260923-0001` |
   | `TDD-0515` | `TC-0012-0485` | `["iterate --auto-serve: (1) CLI flag parses", "iterate --auto-serve: (3) default runner fallback", "iterate --auto-serve: (4) no-server default preserved", "iterate --auto-serve: (6) 2-second teardown bound", "iterate --auto-serve: (7) foreign-process refusal on EADDRINUSE"]` | `todo`   | `CR-20260923-0001` |
   | `TDD-0516` | `TC-0012-0486` | `composeCaptureUrl — direct unit coverage`                                                                                                                                                                                                                                            | `todo`   | `CR-20260923-0001` |
   | `TDD-0517` | `TC-0012-0487` | `defaultCaptureScreen — HTTP response-status guard`                                                                                                                                                                                                                                   | `todo`   | `CR-20260923-0001` |
   | `TDD-0497` | `TC-0012-0488` | `--check-convergence CLI flag wiring`                                                                                                                                                                                                                                                 | `todo`   | `CR-20260923-0001` |

   Every entry above appears in its `Test file` as written. **The five rows
   are reset to `todo`.** Their obligation moves from a requirement to a case,
   and their `Selector` changes, so the evidence recorded against the old cell
   no longer describes the row. Phase 2b also seeds the `E2E` row it seeds for
   every new story, `US-0012-0143`, at `todo`; its id is the ledger's next,
   `TDD-0561` when this record is applied first.

10. **`16_Traceability-ledger.md`**:

    - In the table of TDD rows under "CHG-005 Phase 2 follow-ups", the
      `TC-Ref` cells become `TC-0012-0484` (`TDD-0514`), `TC-0012-0485`
      (`TDD-0515`), `TC-0012-0486` (`TDD-0516`) and `TC-0012-0487`
      (`TDD-0517`), and each `Status` becomes `planned` while its row is open.
    - The five follow-up rows of the primary-SUT table read:

      | Requirement     | Primary SUT (Implementation)                                                                                                                                                                                                                           | Primary SUT (Test)                                                                                                                                                                                                                                                                                   |
      | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
      | `REQ-0012-0074` | (no machine SUT yet: the live-loop measurement is deferred)                                                                                                                                                                                            | `packages/qfai/tests/integration/prototyping/tailwindContractConvergence.test.ts` pins the steady state only                                                                                                                                                                                         |
      | `REQ-0012-0075` | `packages/qfai/src/cli/lib/args.ts` (`--capture`) + `packages/qfai/src/cli/commands/prototypingIterate.ts` (`runCapturePath`, `composeCaptureUrl`) + `src/core/prototyping/defaultCaptureScreen.ts` + `src/core/contracts/screenContracts.ts` (`.yml`) | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts` (TDD-0514), `packages/qfai/tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts` (TDD-0516), `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts` (TDD-0517) |
      | `REQ-0012-0076` | `packages/qfai/src/cli/lib/args.ts` (`--auto-serve`) + `packages/qfai/src/cli/commands/prototypingIterate.ts` + `src/core/prototyping/defaultServerRunner.ts`                                                                                          | `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts` (TDD-0515)                                                                                                                                                                                                    |
      | `REQ-0012-0077` | `packages/qfai/src/core/prototyping/iteration.ts` (`StopReason`, `STOP_REASONS`) + `src/core/validators/prototypingEvidence.ts` + `src/cli/commands/prototypingIterate.ts` (license gate)                                                              | `packages/qfai/tests/integration/cli/commands/prototypingIterate.stopReason.test.ts` (TDD-0505)                                                                                                                                                                                                      |
      | `REQ-0012-0078` | `packages/qfai/src/cli/lib/args.ts` (`--check-convergence`) + `src/cli/main.ts` (cycle guard) + `src/cli/commands/prototypingIterate.ts` (`runCheckConvergencePeek`)                                                                                   | `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts` (TDD-0497)                                                                                                                                                                                                |

    - The section's prose and its "Deferred slice closure" checklist name
      `REQ-0012-0074` alone where they name `REQ-0012-0074..0078`: after this
      record the other four have their criteria, rules and examples.

11. **`09_delta.md`** records this Change Request as one row of a
    `## Change Requests` table, which the rerun adds from the template because
    the pack has none. The row names the upstream artifacts this record edits,
    `Mode` `re-derive`. Nothing is recorded as a `## Triage` row.

**What the existing tests already verify of the new cases:**

| Case           | Verified by the row's test file today                                                                                                                                                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TC-0012-0484` | **In part.** Flag on and off, and screens from `.yaml` and `.yml` contracts, are verified. The default runner is not: one test imports the module and checks it is a function, and the Playwright-missing test injects a runner returning that failure. No test lets iterate choose the default runner. The row owes one more test |
| `TC-0012-0485` | **Mostly.** Flag on and off, the 2000 ms teardown and the busy-port refusal are verified, the last two on the runner called directly. The default-runner test runs iterate with no runner injected, but asserts only that the exit code is a number                                                                                |
| `TC-0012-0486` | **Yes.** All eight tests. Block (9) of `cliCapture.test.ts` verifies the same composition through iterate                                                                                                                                                                                                                          |
| `TC-0012-0487` | **Yes.** All six tests. The title of the 399 case says `REJECTS`, and the case asserts acceptance, which is what the case statement says                                                                                                                                                                                           |
| `TC-0012-0488` | **Yes.** All eight tests                                                                                                                                                                                                                                                                                                           |

**The annotation lines owed**, one `// QFAI:SPEC-0012:TC-*` line directly
above each `it(` below. Line numbers are those of the file today.

| Test file                                                                                  | `it(` titles, at line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Annotation                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliCapture.test.ts`       | 130 `parseArgs sets options.prototypingCapture=true when --capture is present`; 141 `parseArgs leaves prototypingCapture undefined when --capture is absent`; 199 `exports defaultCaptureScreen as a function (smoke test on the default runner module)`; 204 `surfaces 'playwright not installed' and exits 2 when the runner reports the missing-dep failure shape (DI-mimicked)`; 405 `derives screens from UI contracts when CLI sets capture=true without DI screens`; 596 ``derives screens from `.yml` UI contracts (extension parity with `.yaml`)`` | `// QFAI:SPEC-0012:TC-0012-0484` |
| `packages/qfai/tests/integration/cli/commands/prototypingIterate.cliAutoServe.test.ts`     | 120 `parseArgs sets options.prototypingAutoServe=true when --auto-serve is present`; 131 `parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent`; 158 `dynamically loads defaultServerRunner; deferred sentinel error is gone`; 194 `does not invoke serverRunner when autoServe flag is absent`; 232 `default runner teardown resolves within 2000ms`; 496 `default runner returns {ok:false, reason:/already in use/i} when port is busy, iterate exits 2`                                                                           | `// QFAI:SPEC-0012:TC-0012-0485` |
| `packages/qfai/tests/unit/cli/commands/prototypingIterate.composeCaptureUrl.test.ts`       | all eight: 33, 38, 43, 48, 57, 75, 80, 85                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `// QFAI:SPEC-0012:TC-0012-0486` |
| `packages/qfai/tests/unit/core/prototyping/defaultCaptureScreen.responseStatus.test.ts`    | all six: 68, 84, 99, 114, 129, 142                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `// QFAI:SPEC-0012:TC-0012-0487` |
| `packages/qfai/tests/integration/cli/commands/prototypingIterate.checkConvergence.test.ts` | all eight: 65, 88, 114, 137, 160, 179, 209, 244                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `// QFAI:SPEC-0012:TC-0012-0488` |

`prototypingIterate.stopReason.test.ts` needs nothing: it carries
`TC-0012-0463` already, and `TDD-0496` leaves the ledger. The other blocks of
`cliCapture.test.ts` and `cliAutoServe.test.ts` are not annotated here. Blocks
(2), (5), (6) and (7) of the capture file restate what `TC-0012-0440` and
`TC-0012-0441` already have tests for, and the path-traversal blocks (7a) and
(7b) of the serve file state an obligation no case in the pack names.

**The product is not edited.** Three disagreements between the pack and the
product are outside what the six rows need, so each is a defect of its own
rather than a step here:

- `REQ-0012-0076`, `AC-0012-0060`, `BR-0012-0048` and `EX-0012-0169` describe
  a spawned server torn down with `tree-kill` or `taskkill`, and a refusal
  naming the PID and command of the port's owner. The default runner is an
  in-process server, as `.qfai/contracts/cli/qfai-prototyping.md` records, and
  its refusal says only that the port is in use. `TC-0012-0485` states what the
  runner does and none of the contradicted clauses.
- `REQ-0012-0077` names a test file,
  `prototypingIterate.stopReasonEnum.test.ts`, that does not exist.
- `16_Traceability-ledger.md` numbers its CHG-005 rows differently from
  `tdd/test-list.md`: it binds `TC-0012-0440` to `TDD-0463` and `TC-0012-0463`
  to `TDD-0470`, where the execution ledger has `TDD-0467` and `TDD-0505`.

## Blocked downstream items

| Item                                                                       | Kind         | Why it depends on the artifact                                           |
| -------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `spec-0012/TDD-0497`                                                       | `ledger-row` | Its `TC-Refs` and `Selector` are what this record rewrites               |
| `spec-0012/TDD-0514`                                                       | `ledger-row` | Same                                                                     |
| `spec-0012/TDD-0515`                                                       | `ledger-row` | Same                                                                     |
| `spec-0012/TDD-0516`                                                       | `ledger-row` | Same                                                                     |
| `spec-0012/TDD-0517`                                                       | `ledger-row` | Same                                                                     |
| `spec-0012/TDD-0496`                                                       | `ledger-row` | This record removes it                                                   |
| The `E2E` row Phase 2b seeds for `US-0012-0143`                            | `ledger-row` | It does not exist until this record is applied                           |
| `spec-0012/16_Traceability-ledger.md`, the follow-up rows named in step 10 | `spec`       | This record rewrites them, so no other rerun may advance them in between |

- Not blocked by this CR: every other `spec-0012` row. `TDD-0505` keeps
  `TC-0012-0463`, `TDD-0467` keeps `TC-0012-0440`, `TDD-0469` keeps
  `TC-0012-0442`, and `TDD-0489` keeps `TC-0012-0470`. The `E2E` rows of
  `US-0012-0125`, `US-0012-0126` and `US-0012-0137` (`TDD-0475`, `TDD-0476`,
  `TDD-0495`) stand, because no criterion under those stories changes a
  statement.
- Overlapping open CRs:
  - `CR-20260912-0003`, `CR-20260913-0002` and `CR-20260913-0030` also edit
    `spec-0012`'s upstream files. None names an id this record allocates,
    removes or rewrites. If one of them is applied first and allocates an id
    in the same range, this record takes the next free id instead, and its
    chain is otherwise unchanged.
  - `CR-20260913-0002` option 1 also refreshes `16_Traceability-ledger.md`
    and migrates the ledger's tables to the template's columns. The rows this
    record rewrites carry into that shape unchanged, whichever lands first.
  - That record reports that the `spec-0012` slice gate,
    `npx qfai validate --profile sdd --spec spec-0012`, fails on `Level` and
    `Boundary` findings older than both records. If that still holds when this
    record's rerun runs, the rerun stops on them as that one does. This record
    adds none of them.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `spec-0012/TDD-0497`, `TDD-0514`, `TDD-0515`, `TDD-0516`, `TDD-0517`
  and the new `E2E` row, against the five test files in
  `## Proposed change`; and
  `packages/qfai/tests/assets/completedRowNamesItsTestCase.test.ts`, whose
  backlog holds the six rows and asserts equality
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/02_User-stories.md`,
  `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md`,
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/16_Traceability-ledger.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

Under `--profile tdd` and `full`, `QFAI-TRACE-001` compares a branch that edits
`03_Acceptance-Criteria.md` or `04_Business-Rules.md` with the implementation
files the ledger's first table links. This record edits both and no product
file. Whether the dogfooding lanes read that comparison was not checked.

## Decision needed from user

Approve option 1: remove `TDD-0496` as a duplicate of `TDD-0505`, put the
capture and serve rows on new cases under `AC-0012-0059` and `AC-0012-0060`,
give the peek a chain of its own, restate `REQ-0012-0078` with the file the
peek reads, and correct the three misattributed rows of
`16_Traceability-ledger.md`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`. It records this Change Request as
   one row in `spec-0012/09_delta.md`'s `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — not as a
   `## Triage` row. It makes the edits in `## Proposed change`, steps 1 to 11,
   and no other upstream edit. Its Phase 2b writes the row pointers in step 9,
   removes `TDD-0496` with its tombstone, and seeds the `E2E` row for
   `US-0012-0143` at `todo`.

2. Downstream ledger sweep: **reset to `todo`**, recording this Change
   Request's ID in `DR-ID`: `spec-0012/TDD-0497`, `TDD-0514`, `TDD-0515`,
   `TDD-0516`, `TDD-0517`. **Removed**: `spec-0012/TDD-0496`. No other row
   resets. The change that lands this sweep strikes the six
   `spec-0012` entries from `KNOWN_WITHOUT_A_TEST_CASE` in
   `packages/qfai/tests/assets/completedRowNamesItsTestCase.test.ts`, leaving
   `TDD-0420`, and rewords that file's opening comment, which quotes
   `REQ-0012-0075 (REQ-0109 follow-up)` as the example of the shape. The
   assertion is an equality, so the ledger change fails it until then.

3. **In this order**, once the rerun above has written the ledger:
   1. `/qfai-implement spec-0012` runs its Change Request preflight. It
      advances none of the reset rows and makes no product edit.
   2. `/qfai-atdd spec-0012` takes up the `Integration` rows `TDD-0497`,
      `TDD-0514` and `TDD-0515`, and the new `E2E` row. It adds the
      annotation lines for `TC-0012-0484`, `-0485` and `-0488` in
      `## Proposed change`, writes the test `TC-0012-0484` still owes for the
      default runner, judges whether `TC-0012-0485`'s default-runner test
      asserts enough, and writes the `US-0012-0143` block of
      `packages/qfai/tests/e2e/spec0012PrototypingRemediationE2E.test.ts`.
      **That invocation is not limited to these rows**: it takes up every
      ATDD-owned `spec-0012` row still owed when it runs that no open Change
      Request blocks, as that stage's ordinary forward work, with its entries
      in `.qfai/evidence/atdd-spec-0012.md`. None of that edits an upstream
      path.
   3. `/qfai-implement spec-0012` resumes from that handover. It takes up the
      `unit` rows `TDD-0516` and `TDD-0517`, whose cases are `L1` and so its
      own, adds their annotation lines, and records fresh evidence for all
      five rows. The implementation predates this record, so the
      falsifiability path applies. This record makes no product edit.

## Resolution

Approved under option 1, the recommendation. It removes the one duplicate row
and puts each of the other five on a case that states what its test verifies,
adding a chain only for the peek, which no criterion states. Option 4 is
smaller but certifies cases that do not state the rows' tests, and option 3
states three obligations twice.

Applied under option 1, with three differences from `## Proposed change`.

- `TC-0012-0485` leaves out the busy-port refusal. `CR-20260923-0002`, applied
  first, states it as `TC-0012-0489`, which `TDD-0561` holds, so the new case
  names that case instead of stating the refusal twice. The `TDD-0515`
  selector proposed in step 9 loses its block (7) entry for the same reason.
- The `E2E` row seeded for `US-0012-0143` is `TDD-0567`. `TDD-0561` to
  `TDD-0564` were taken before this record was applied, and `TDD-0565` and
  `TDD-0566` are taken on a branch not yet merged.
- The five `Selector` cells are left as they were. `Selector` is the owner
  stage's cell, so the stage that takes each reset row up writes it; step 9
  lists the values.

What was written:

- `REQ-0012-0078` is restated with the file the peek reads.
- `US-0012-0143`, `AC-0012-0083`, `BR-0012-0066`, `BR-0012-0067`,
  `EX-0012-0187` to `EX-0012-0189` and `TC-0012-0484` to `TC-0012-0488` are
  added. `AC-0012-0059`, `-0060` and `-0061` gain `REQ-0012-0075`, `-0076` and
  `-0077`.
- `TDD-0496` is removed and tombstoned under `## TDD-ID reservations`.
- `TDD-0497`, `TDD-0514`, `TDD-0515`, `TDD-0516` and `TDD-0517` name their new
  cases and are reset to `todo`, with this record in `DR-ID`. `TDD-0567` is
  seeded at `todo`.
- `16_Traceability-ledger.md` carries the step 10 rows.
- `spec-0012/09_delta.md` records this request.
- `completedRowNamesItsTestCase.test.ts` no longer carries the six rows.

Approved actions step 3, the `/qfai-atdd` and `/qfai-implement` work on the
reset rows, has not run.

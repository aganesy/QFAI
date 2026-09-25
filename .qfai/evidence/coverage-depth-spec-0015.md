# Coverage Depth Matrix — spec-0015

## Scope

This `/qfai-atdd` run scores `TC-0015-0007`'s `legacy-profile-preservation` boundary, carried by ledger row `TDD-0039` (Integration). Its acceptance test is `packages/qfai/tests/integration/agentDelegationSpec0015.test.ts`, selector "preserves adopter profiles on both init paths while emitting the canonical target bound". That is the suite `10_Plan.md` (Test approach) and `09_delta.md` (`VFY-001`) name. The selector runs the real initializer against a temporary project. The same TC's `abstract-only-na` boundary belongs to `TDD-0007` and its own selector; it is not credited here.

The pack also declares 16 active user stories, 35 other test cases and 17 active business rules. This run writes no selector for them, so none is credited by it; their state is listed under "Obligations not scored in this run". Every active business rule owns a row in the business rule table, including rules outside this run's boundary. Carried rows are scored from their ledger state and from reading the tests that exist on this tree. They were not re-run here.

No `CON-API-*` or `CON-DB-*` reference appears in any file of the pack, including `Contract-Refs` and `QFAI-CONTRACT-REF` lines, so no contract failure is mapped. The review-gate catalog and `review-profiles.yml` are shipped configuration assets, not API or DB contracts.

## How the cells are scored

- `✅` — the category has an executable case for this boundary, or a carried rule has a `done` ledger case whose assertions cover it.
- `⚠️` — only part of the obligation has a case, or the covering test exists but its ledger row is `exception` or `todo`. Each partial cell is named below with what is missing.
- `❌` — no executable case asserts the obligation. Each is named below with its justification.
- `n/a` — the category's obligation does not exist for this row. It never stands in for a missing case.

`Status` holds the row verdict and is excluded from every total.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | ------ |
| TC-0015-0007 | ✅                     | ✅          | ✅         | ✅         | n/a             | ✅             | ✅                | ✅            | ✅              | ✅     |

1 row × 9 depth columns = **9 scored cells: ✅ 8 / ⚠️ 0 / ❌ 0**, `n/a` 1.

### Row evidence

TC-0015-0007 (`legacy-profile-preservation`, `TDD-0039`) — the evidence behind each cell:
- Equivalence partitions: catalog current vs. older; prior asset receipt matching vs. not matching the older bytes; ordinary vs. forced reinit; both adopter-owned profile fields (`default_target`, `description`). Each partition has a representative in the selector.
- Normal path: `TC-0015-0007` declares no `Type`, so it owes the normal path. After an adopter edit to `review-profiles.yml`, ordinary reinit leaves the profile and the current catalog byte-identical. An older catalog with a matching receipt is kept by ordinary reinit and refreshed by forced reinit to the shipped bytes, while the profile stays byte-identical on both runs.
- Error path: the boundary's kept failure is declared by the TC — "A mismatching prior catalog receipt prevents forced refresh" — and it is also the safety floor's data-loss handling: a catalog that differs from its recorded receipt, and the adopter profile, must not be overwritten. The final leg re-seeds the older catalog after the receipt has moved to the current bytes, runs forced reinit, and asserts both the catalog ("mismatching receipt: catalog refreshed") and the profile ("mismatching receipt: adopter profiles changed") are unchanged.
- Error path, the failure this boundary does not own: `BR-0015-0007` ("feedback without concrete alternative is invalid and triggers re-judgment") names `AC-0015-0007` in its `AC-Refs`, so the chain reaches `TC-0015-0007`. `AC-0015-0007` is the abstract-only N/A criterion carried by `TDD-0007`, not this boundary's `AC-0015-0009` scenario, and the rule's subject is `AC-0015-0008`. It is recorded as DRIFT under "Findings" and scored `❌` in the business rule table; it is not erased.
- Edge cases: ordinary reinit over an unchanged tree is a byte-level no-op for both files; the older catalog lacks the whole `pattern-doubler` subtree rather than one changed value; after the forced refresh the receipt is rewritten to the current bytes, so re-seeding the old bytes afterwards reads as a local divergence, not a stale file. A concurrent rewrite during the refresh is handled by `replaceGovernedAsset`. No spec-0015 declaration names it, so this row does not own it; unit suites for asset provenance and init races cover it.
- Boundary values `n/a`: the boundary is a named partition, not an ordered or sized domain. `default_target` is a free-text legacy value whose effect is overridden, not a threshold with valid limits.
- Special values: the older catalog has the `pattern-doubler` key absent. The adopter profile carries a numeric-style target (`"2x current ID-bearing items"`) and a replaced description. The refreshed catalog restores the bound without touching either value.
- State transitions: fresh init → adopter edit → ordinary reinit (no change) → older catalog with matching receipt → ordinary reinit (kept) → forced reinit (refreshed, receipt rewritten) → older bytes against the new receipt → forced reinit (kept). Each state's catalog and profile bytes are asserted, including the terminal one.
- Combinatorial: force × catalog age × receipt match is exercised as (ordinary, current, match), (ordinary, older, match), (forced, older, match) and (forced, older, mismatch). These are the combinations the TC and `EX-0015-0004` declare. Two are not exercised, and neither can change the outcome: (forced, current) exits the sync on `currentHash === shippedHash` before force or receipt is read, and (ordinary, older, mismatch) cannot refresh because `refreshable` requires `options.force`. The adopter profile is asserted under both reinit modes.
- Oracle strength: every product assertion has a named production mutation that fails it (next list). Three were run against this selector, as recorded in `.qfai/evidence/atdd-spec-0015.md#tdd-0039`. `force: false` in `runInit`'s `syncGovernedAssistantAssets` call failed at line 356 (`toHaveProperty("pattern-doubler")`). Removing `currentHash === previousHash` from `refreshable` failed at line 379 ("mismatching receipt: catalog refreshed"). Letting the create-only `.qfai/` copy honour `--force` failed at line 347 ("force=true: adopter profiles changed"). `init.ts` was then restored byte-equal and the selector passed, and `qa-gatekeeper` passed both observations. The other mutations in the list are named but were not run.

TC-0015-0007 mutations named for the oracle:
- `init.ts::runInit` passes `force: false` instead of `force: options.force` to `syncGovernedAssistantAssets` — fails `toHaveProperty("pattern-doubler")` and the byte equality to the shipped catalog after the forced run.
- `refreshable` drops its `options.force` condition — fails the ordinary-run assertion that the older catalog is kept.
- `refreshable` drops `currentHash === previousHash` — fails "mismatching receipt: catalog refreshed".
- The refreshed entry records `previousHash` instead of `shippedHash` — fails the receipt assertion `toBe(hashAssistantAssetText(currentCatalog))`, and then the mismatch leg, because the old bytes would match the record again.
- The create-only `.qfai/` copy honours `--force`, so `manifest/` is overwritten — fails "force=true: adopter profiles changed" and "mismatching receipt: adopter profiles changed".
- The shipped `review-gate.rules.yml` loses `numeric_targets: ignored`, `missing_mandatory_pairing: required`, the precedence text, a `required.spec` entry, or the `qa-gatekeeper` default — each fails its own assertion on the refreshed file.
- Two assertions only check the fixture: the seeded catalog lacks `pattern-doubler`, and the seeded receipt reads back as written. They fail only if the fixture is broken, and no cell above is credited to them. No assertion uses truthiness where the value is known, observes a mock, or loops over an empty set; the `for (const force of [false, true])` loop has two members.

## Business rule coverage

All 17 `BR-0015-*` headings in `04_Business-Rules.md` are active (none carries a retiring `Status:`), so each owns a row. `Covering TC` is derived from each rule's `AC-Refs` and from the `BR-Ref` of the examples the test cases cite.

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                                               | Status |
| ------------ | ------------- | ------------- | -------------------- | --------------------------------------------------------- | ------ |
| BR-0015-0001 | ⚠️            | ⚠️            | n/a                  | TC-0015-0001…0003, 0009, 0010, 0013…0016                   | ⚠️     |
| BR-0015-0002 | ✅            | ✅            | n/a                  | TC-0015-0012                                              | ✅     |
| BR-0015-0003 | ✅            | ⚠️            | ⚠️                   | TC-0015-0011                                              | ⚠️     |
| BR-0015-0004 | ⚠️            | ❌            | ❌                   | TC-0015-0004, 0005, 0008                                  | ❌     |
| BR-0015-0005 | ⚠️            | ⚠️            | ⚠️                   | TC-0015-0006, 0007, 0009, 0015, 0016                      | ⚠️     |
| BR-0015-0006 | ❌            | n/a           | n/a                  | TC-0015-0006, 0013                                        | ❌     |
| BR-0015-0007 | ❌            | ❌            | n/a                  | TC-0015-0007, 0014                                        | ❌     |
| BR-0015-0008 | ✅            | ✅            | ⚠️                   | TC-0015-0017, 0018                                        | ⚠️     |
| BR-0015-0009 | ✅            | ⚠️            | ⚠️                   | TC-0015-0019                                              | ⚠️     |
| BR-0015-0010 | ⚠️            | ⚠️            | ⚠️                   | TC-0015-0020, 0021, 0034                                  | ⚠️     |
| BR-0015-0011 | ✅            | ⚠️            | ⚠️                   | TC-0015-0022, 0023                                        | ⚠️     |
| BR-0015-0012 | ✅            | ⚠️            | ⚠️                   | TC-0015-0024, 0025                                        | ⚠️     |
| BR-0015-0013 | ✅            | ✅            | ✅                   | TC-0015-0026, 0027                                        | ✅     |
| BR-0015-0014 | ✅            | n/a           | ⚠️                   | TC-0015-0028, 0029                                        | ⚠️     |
| BR-0015-0015 | ✅            | ✅            | ✅                   | TC-0015-0030, 0031                                        | ✅     |
| BR-0015-0016 | ✅            | ⚠️            | ⚠️                   | TC-0015-0032, 0033                                        | ⚠️     |
| BR-0015-0017 | ⚠️            | ⚠️            | ⚠️                   | TC-0015-0035, 0036                                        | ⚠️     |

17 rows × 3 scored columns = **51 scored cells: ✅ 16 / ⚠️ 24 / ❌ 5**, `n/a` 6.

`n/a` in `Negative case` is used where the rule declares no failure: `BR-0015-0006` states a required section without a declared rejection, and `BR-0015-0014` is a SHOULD-level listing whose empty store is valid. `n/a` in `Conditional branches` marks a rule stated unconditionally.

### Both tables together

| Mark | Matrix | Business rule | Total |
| ---- | ------ | ------------- | ----- |
| ✅   | 8      | 16            | 24    |
| ⚠️   | 0      | 24            | 24    |
| ❌   | 0      | 5             | 5     |
| n/a  | 1      | 6             | 7     |
| Sum  | 9      | 51            | 60    |

## Every ❌ cell, named

| Cell | Why it is not covered | Decision on record |
| ---- | --------------------- | ------------------ |
| BR-0015-0004 Negative case | No case asserts that a bare-negation FAIL is invalid and triggers re-judgment. The `TC-0015-0004` selector asserts only the gate defaults and that optional modes exist; `TC-0015-0008`'s asserts only that `completion-reviewer` is named. The profile fields that carry the rule (`alternative_required`, `bare_negation_invalid`) are read by no test. | `TDD-0004`/`TDD-0008` are `exception` under `DR-0015-0001`, a one-shot backfill of the migrated tests; it records no decision to leave this clause untested. |
| BR-0015-0004 Conditional branches | Neither declared branch has a case: `can_be_na: false` (N/A not allowed) and three consecutive FAILs demoting the reviewer to advisory. The `TC-0015-0005` selector asserts only that `devils-advocate` is a supported mode. | `TDD-0005` is `exception` under `DR-0015-0001`, as above. |
| BR-0015-0006 Positive case | No spec-0015 case checks the Work Orders Summary's six columns. `TC-0015-0013` is a placeholder whose example only asserts that an example exists, and `TDD-0013` has no test file. Asset suites outside this pack (`tests/assets/assets.test.ts`, spec-0008's `atddSkillSpec0008.test.ts`) check that skills mention the section, not its columns, and are not this rule's owned case. | `TDD-0013` cites `DR-0015-0100` ("deferred — no impl yet"), which `07_Decisions.md` does not define. See "Findings". |
| BR-0015-0007 Positive case | No case exercises a reviewer's FAIL carrying a concrete alternative. `TC-0015-0014` is a placeholder, and `TDD-0014` has no test file. The `TC-0015-0008` selector does not read FAIL feedback. | `TDD-0014` cites the undefined `DR-0015-0100`, as above. |
| BR-0015-0007 Negative case | No case rejects reviewer feedback that lacks a concrete alternative. The chain also reaches `TC-0015-0007` through the mis-referenced `AC-0015-0007`; that selector concerns pattern review and does not cover it either. | As above; the `AC-Refs` defect is routed to `/qfai-sdd`. |

These five cells are open obligations, not accepted waivers. None is a safety-floor failure. Covering them needs test work on rows this run does not own: `TDD-0004`/`0005`/`0008` for the devils-advocate and all-reviewer rules, and a real case to replace the `TDD-0013`/`0014` placeholders.

## Every ⚠️ cell, named

| BR ID | Partial cells | What is covered, and what is not |
| ----- | ------------- | -------------------------------- |
| BR-0015-0001 | Positive, Negative | `TDD-0001`…`0003`, `0009` and `0010` are `exception` one-shot rows with static text checks. `TDD-0015`/`0016` (routing rebuild, `full-harness` drop and its routing-config finding) are `todo` with no test file. `TC-0015-0013`/`0014` reach the rule through `AC-0015-0001` and are placeholders. |
| BR-0015-0003 | Negative, Conditional branches | The `done` selector for `TDD-0011` asserts classify-first, no role simulation and the report fields, as contract text. No assertion names the `unavailable` and `saturated` branches, the bounded retry or the "retry budget exhausted" report. |
| BR-0015-0004 | Positive | Only the presence of the `devils-advocate` mode is asserted, by `exception` rows. |
| BR-0015-0005 | Positive, Negative, Conditional branches | This run's selector covers the preserved-manifest clause (catalog overrides `default_target`; init and forced reinit leave the adopter manifest alone) and the mismatching-receipt refusal. Its falsifiability run, two discriminating negative controls, the byte-equal restore and the restored pass are recorded in `.qfai/evidence/atdd-spec-0015.md#tdd-0039`. The concrete-scope/rationale and abstract-only N/A clauses have selectors in the same file, but `TDD-0006`/`0007` were reset to `todo` under `CR-20260913-0007` and are not credited. `qfai init --upgrade-assistant-tree` is not exercised; the pack reads "upgrade" as forced reinit (see "Findings"). |
| BR-0015-0008 | Conditional branches | The `done` rows `TDD-0017`/`0018` cover every scope branch (`atdd`, `full`, `prototyping`, absent file, no prototyping context) and the three parts of the message. The branch where the structural finding is emitted whatever the reviewer's prose says has no case. |
| BR-0015-0009 | Negative, Conditional branches | The `TDD-0019` selector rejects an empty `justification:` and accepts a populated one. Whitespace-only and structurally incomplete (two of three parts) justifications are not exercised. |
| BR-0015-0010 | Positive, Negative, Conditional branches | `TDD-0023` (three buckets pass) and `TDD-0022` (section absent) are `done`. That every shipped SKILL.md carries the section is checked only by asset suites no spec-0015 row owns. The present-but-incomplete branch has a test (`spec0015GovernanceAndHandoff.test.ts`, `TC-0015-0034`), but `TDD-0038` is `todo`. |
| BR-0015-0011 | Negative, Conditional branches | The writer (`TDD-0024`) and the context predicate (`TDD-0025`) are `done`. That a non-envelope question writes no record is asserted on the predicate only, not on the write path. |
| BR-0015-0012 | Negative, Conditional branches | `TDD-0026` covers asymmetric Pair IV edits and `TDD-0027` the conforming and legacy-warning reads. A skill writing a non-conforming handoff file has no case. |
| BR-0015-0014 | Conditional branches | Each filter, `--scope` with `--operator`, ordering, JSON output, the `table` default and the empty store are `done` (`TDD-0030`/`0031`). `--clause` is exercised only on its own, never combined with another filter. |
| BR-0015-0016 | Negative, Conditional branches | Zero stale references and the fixed warning severity are `done` (`TDD-0034`/`0035`). The same-PR rule — a doc-only follow-up PR is the failure — has no executable case. |
| BR-0015-0017 | Positive, Negative, Conditional branches | Tests exist: `tests/integration/validators/hygieneLaneIngestion.test.ts` (annotated `TC-0015-0035`/`0036`, with the enumerated two-code list and the `R-PACK-LOCATION-DRIFT` negative control) and the E2E `spec0015HygieneLaneToReviewerGateE2E.test.ts`. Their ledger rows `TDD-0036`/`0037` are still `todo` and name no test file, so no red or green run is recorded (see "Findings"). |

## Obligations not scored in this run

| Obligation | Ledger state | Reason |
| ---------- | ------------ | ------ |
| US-0015-0001…0016 | `TDD-0020`/`0021` (US-0015-0007/0008) are `done`; the fourteen seeded E2E rows `TDD-0040`…`0053` are `todo`. E2E tests annotated for US-0015-0009…0016 exist but are not bound to those rows. | This run adds no E2E selector. No story is credited by the Integration selector. |
| TC-0015-0001…0006, 0008…0036 | Mixed `exception`, `todo` and `done` | This run owns only `TC-0015-0007`'s legacy-profile boundary. Carried gaps appear in the business rule table. |
| TC-0015-0007 `abstract-only-na` | `TDD-0007` is `todo` under `CR-20260913-0007` | A separate boundary with its own selector; not credited to `TDD-0039`. |

## Findings

These are upstream or ledger defects this run may not edit (Drift Protocol). Each is routed to its owner.

1. **DRIFT — `BR-0015-0006` and `BR-0015-0007` name the wrong criteria.** `BR-0015-0006` (Work Orders Summary) lists `AC-0015-0006` (pattern-review rationale), and `BR-0015-0007` (all-reviewer alternative) lists `AC-0015-0007` (pattern-review N/A). No criterion states the Work Orders rule, and the all-reviewer rule is `AC-0015-0008`. The mis-reference sends `BR-0015-0007`'s failure into `TC-0015-0007`'s chain. Owner: `/qfai-sdd` (`04_Business-Rules.md`).
2. **`DR-0015-0100` is not defined.** `TDD-0013` and `TDD-0014` cite it as the exception decision, but `07_Decisions.md` holds only `DR-0015-0001`…`0006`. Owner: `/qfai-sdd` (`07_Decisions.md`) or the ledger owner.
3. **Ledger rows lag tests that exist.** `TDD-0036`/`0037` name no test file although `hygieneLaneIngestion.test.ts` carries `TC-0015-0035`/`0036`. `TDD-0038` is `todo` although its test exists. The E2E rows `TDD-0046`…`0053` are `todo` with no test file, although E2E tests annotated for US-0015-0009…0016 exist. Owner: `/qfai-implement`.
4. **DRIFT — `TC-0015-0017` states severity error.** `US-0015-0007` states severity info (certify refuses the verdict with exit 2), and `reviewerGateCertifyVerifyCycle.test.ts` asserts info. Owner: `/qfai-sdd` (`06_Test-Cases.md`).
5. **"Upgrade" in `AC-0015-0009` / `BR-0015-0005` is read as forced reinit.** `TC-0015-0007` and `EX-0015-0004` exercise only ordinary and forced reinit. `qfai init --upgrade-assistant-tree` does not walk `manifest/` by design (per `init.ts`), but no spec-0015 case exercises it. If the criterion means that path, it needs a case. Owner: `/qfai-sdd` to confirm the reading.

## Final status

The `TC-0015-0007` legacy-profile boundary has full category coverage and a named mutation for every product assertion. Its falsifiability run and two negative controls failed on their named assertions, and the restored selector passed, as recorded in `.qfai/evidence/atdd-spec-0015.md#tdd-0039`. The business rule table carries five justified `❌` cells on carried rules and five upstream or ledger findings. A spec-wide coverage PASS stays open until those rows get their own test work.

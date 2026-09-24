# Coverage Depth Matrix — spec-0015

## Scope

This `/qfai-atdd` run scores `TC-0015-0007`'s `legacy-profile-preservation` boundary, carried by `TDD-0039`. The dedicated integration selector runs the real initializer. Its falsifiability mutation failed the catalog-refresh assertion, and the restored selector passed. The separate `abstract-only-na` boundary belongs to `TDD-0007` and is not credited to this selector.

The pack also declares 16 active user stories, 35 other test cases and 17 active business rules. This change created no selector for the other user stories or test cases; they are not silently credited here. Their state is listed below. Every active business rule owns a row in the business rule table, including rules outside this run's test boundary. Carried rows are assessed from their declared test cases and ledger state; they were not all re-run here.

No `CON-API-*` or active `CON-DB-*` contract is referenced by this boundary. The affected catalog is a shipped configuration asset, not an API or DB contract.

## How the cells are scored

- `✅` means the category has an executable case for this boundary, or a carried rule has a completed ledger case covering it.
- `⚠️` means there is a test or plan for only part of a carried rule, or its only ledger evidence is `exception` or `todo`. The partial cases are named below.
- `❌` means the declared rule has no executable test case in its ledger row. Each such cell is named below; the gap remains open.
- `n/a` means this boundary or rule declares no obligation in that category. It does not waive a missing case.

## The matrix

| US/TC ID     | Equivalence partitions | Normal path | Error path | Edge cases | Boundary values | Special values | State transitions | Combinatorial | Oracle strength | Status   |
| ------------ | ---------------------- | ----------- | ---------- | ---------- | --------------- | -------------- | ----------------- | ------------- | --------------- | -------- |
| TC-0015-0007 | ✅                     | ✅          | n/a        | ✅         | n/a             | ✅             | ✅                | ✅            | ✅              | refactor |

Totals across the nine scored columns, 9 cells: **✅ 7 / ⚠️ 0 / ❌ 0**, `n/a` 2.

### Row evidence

- Equivalence partitions: current catalog and older catalog; matching and mismatching prior asset receipts; ordinary and forced reinit; both adopter-owned profile fields.
- Normal path: current catalog and adopter profile remain byte-identical after ordinary reinit. An older catalog with a matching receipt is preserved without force and refreshed with force, while the adopter profile remains byte-identical.
- Error path `n/a`: this boundary declares no failed init or rejected input. The mismatched receipt is a valid preservation case, scored under Edge cases.
- Edge cases: with older catalog bytes but a receipt for current bytes, forced reinit leaves the older catalog alone. This is the declared negative control for unsafe replacement.
- Boundary values `n/a`: `default_target` is a preserved legacy string whose numeric demand is ignored. There is no active ordered threshold to test.
- Special values: the older catalog has no pattern-review bound; the adopter profile retains both its numeric target and description. The refreshed catalog restores the bound without erasing either adopter value.
- State transitions: current → older with matching receipt → ordinary reinit preserving old → forced refresh, followed by a mismatched receipt → forced preservation of old.
- Combinatorial: force mode, catalog age and receipt match are exercised in the combinations that change preservation versus refresh. The adopter profile is checked on both reinit modes.
- Oracle strength: `TDD-0039` Round 1 changed only `init.ts::runInit`'s governed-asset `force: options.force` to `force: false`. The selector failed on its refreshed-catalog equality assertion, then passed after byte-equal source restoration. The recorded test manifest did not move.

## Business rule coverage

| BR ID        | Positive case | Negative case | Conditional branches | Covering TC                         | Status  |
| ------------ | ------------- | ------------- | -------------------- | ----------------------------------- | ------- |
| BR-0015-0001 | ⚠️            | ⚠️            | n/a                  | TC-0015-0001…0003, 0009, 0010, 0015, 0016 | carried |
| BR-0015-0002 | ✅            | ⚠️            | n/a                  | TC-0015-0012                        | carried |
| BR-0015-0003 | ✅            | ⚠️            | ⚠️                   | TC-0015-0011                        | carried |
| BR-0015-0004 | ⚠️            | ⚠️            | ⚠️                   | TC-0015-0004, 0005, 0008           | carried |
| BR-0015-0005 | ✅            | ⚠️            | ⚠️                   | TC-0015-0006, 0007                 | current |
| BR-0015-0006 | ❌            | n/a           | n/a                  | TC-0015-0013                        | carried |
| BR-0015-0007 | ❌            | ❌            | n/a                  | TC-0015-0014                        | carried |
| BR-0015-0008 | ✅            | ✅            | ⚠️                   | TC-0015-0017, 0018                 | carried |
| BR-0015-0009 | ✅            | ⚠️            | ⚠️                   | TC-0015-0019                        | carried |
| BR-0015-0010 | ⚠️            | ⚠️            | ⚠️                   | TC-0015-0020, 0021, 0034           | carried |
| BR-0015-0011 | ✅            | ⚠️            | ⚠️                   | TC-0015-0022, 0023                 | carried |
| BR-0015-0012 | ✅            | ⚠️            | ⚠️                   | TC-0015-0024, 0025                 | carried |
| BR-0015-0013 | ✅            | ✅            | ⚠️                   | TC-0015-0026, 0027                 | carried |
| BR-0015-0014 | ✅            | n/a           | ⚠️                   | TC-0015-0028, 0029                 | carried |
| BR-0015-0015 | ✅            | ✅            | ⚠️                   | TC-0015-0030, 0031                 | carried |
| BR-0015-0016 | ✅            | ⚠️            | ⚠️                   | TC-0015-0032, 0033                 | carried |
| BR-0015-0017 | ❌            | ❌            | ❌                   | TC-0015-0035, 0036                 | carried |

Totals across the three scored columns, 51 cells: **✅ 14 / ⚠️ 25 / ❌ 6**, `n/a` 6.

### Every ❌ cell, named

| Cell | Why it remains uncovered |
| ---- | ------------------------ |
| BR-0015-0006 Positive case | `TDD-0013` is `exception` and has no test file. The placeholder `TC-0015-0013` asserts only that an example exists; it does not execute the Work Orders schema. |
| BR-0015-0007 Positive case | `TDD-0014` is `exception` and has no test file. The placeholder `TC-0015-0014` does not exercise a reviewer giving a concrete alternative. |
| BR-0015-0007 Negative case | No executable case rejects reviewer feedback that lacks a concrete alternative. `TDD-0014` has no test file. |
| BR-0015-0017 Positive case | `TDD-0036` and `TDD-0037` remain `todo` with no test files; neither code ingestion path is exercised here. |
| BR-0015-0017 Negative case | No executable case distinguishes these two deferred codes from catalog members that require a justification. `TDD-0036` and `TDD-0037` are still `todo`. |
| BR-0015-0017 Conditional branches | The two hygiene/shape codes and the catalog-member contrast are declared branches, but neither seeded row has a test file. |

These six gaps are recorded as open obligations, not as accepted waivers. No `DR-*` or `CR-*` closes them. They need their own test work before a full spec-level coverage PASS.

### Every ⚠️ cell, named

| BR ID | Partial cells | Reason |
| ----- | ------------- | ------ |
| BR-0015-0001 | Positive, Negative | Early catalog and orchestrator cases are `exception` one-shot evidence; routing cases `TDD-0015/0016` are `todo` with no test file. |
| BR-0015-0002 | Negative | `TDD-0012` is done for the real first delegation; a separate case proving that preflight availability never substitutes for it is not credited here. |
| BR-0015-0003 | Negative, Conditional branches | `TDD-0011` is done, but this run did not re-check both `unavailable` and `saturated` failure classes and every required report field. |
| BR-0015-0004 | Positive, Negative, Conditional branches | The three devils-advocate rows are `exception` one-shot evidence, with no current RED/GREEN or three-failure sequence in this run. |
| BR-0015-0005 | Negative, Conditional branches | `TDD-0039` proves the legacy-profile branch. `TDD-0006/0007` remain `todo` for concrete-only proposals and abstract-only N/A, so this row does not credit those branches. |
| BR-0015-0008 | Conditional branches | The structural failure and control rows are done; the separate justification-part details are not rechecked in this run. |
| BR-0015-0009 | Negative, Conditional branches | The emitter row is done; partial/empty three-part justification rejection is a separate ingestion obligation not verified here. |
| BR-0015-0010 | Positive, Negative, Conditional branches | Two policy tests are done, while `TDD-0038` remains `todo` and the full cross-skill bucket surface was not re-run here. |
| BR-0015-0011 | Negative, Conditional branches | Trigger and schema tests are done, but the full four-context taxonomy and no-record routine path were not re-run here. |
| BR-0015-0012 | Negative, Conditional branches | Schema drift and schema tests are done; legacy warning and asymmetric writer edits were not re-run here. |
| BR-0015-0013 | Conditional branches | Membership and empty-justification tests are done; this run did not re-evaluate all eight detector severities and the deferred timing branch. |
| BR-0015-0014 | Conditional branches | CLI filter/default-format rows are done; this run did not recheck each `--scope`, `--operator`, `--clause` and `--format` combination. |
| BR-0015-0015 | Conditional branches | Upgrade and malformed-input rows are done; this run did not recheck every legacy field and error branch. |
| BR-0015-0016 | Negative, Conditional branches | Zero and warning stale-reference rows are done, but the same-PR rewrite rule across every named document was not rechecked. |

## Obligations not scored in this run

| Obligation | Ledger state | Reason |
| ---------- | ------------ | ------ |
| US-0015-0001…0016 | Fourteen seeded E2E rows `TDD-0040…0053` remain `todo`; older story coverage is outside this change | This run adds no E2E selector. These stories are not counted as covered by the new Integration test. |
| TC-0015-0001…0006, 0008…0036 | Mixed `exception`, `todo` and `done` rows | The current ATDD handoff owns only `TC-0015-0007`'s legacy-profile boundary. The BR table still reports carried gaps from these rows. |

## Final status

The matrix's current boundary has an executable falsifiability proof. Six carried business-rule cells are uncovered, and the full spec has other open user-story and test-case rows. A full spec-level coverage PASS remains open.

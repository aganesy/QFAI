# 10 Plan

## Implementation approach

1. `/qfai-verify` は repo gates と `qfai validate --fail-on error` を必ず実行する
2. downstream quality gate は contract-first validator 群を truth source にする
3. review artifact の `PASS` / `REVISE` と unresolved blocking findings を completion 判定に統合する
4. direct discussion-pack canonical validators は coexist してよいが、repo-root completion path の primary dependency にしない
5. verify summary は fix loop に必要な validate/review/evidence の要点を残す

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes `qfai-verify`'s own
`references/orchestrated-mode.md` in the table format CLI-WFFILE owns.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U2**:

- `qfai-verify/references/orchestrated-mode.md`, holding:
  - the entry check (BR-0014-0031);
  - the Operations table, `verify-full` (BR-0014-0032);
  - `verify.json` named in `artifactRefs` and the qa-gatekeeper verdict in
    `reviewResults` (BR-0014-0026, 0027);
  - outcome apart from observation (BR-0014-0028);
  - the three repair owners (BR-0014-0030);
  - a missing environment as `blocked` (BR-0014-0033).
- One citation line in `qfai-verify/SKILL.md`.
- `verify-output-contract.md` is unchanged (BR-0014-0029).

Left out: the core's report copies and `finish` gates (spec-0018); any
`verify.json` field.

## Test approach

- Unit tests: verify summary formatting, PASS/REVISE interpretation, contract-first issue grouping
- Integration tests: verify executes repo gates and validate in the correct order
- E2E tests: UI-bearing project with missing screenshot/html or missing design contract fails until corrected

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped skill file, so it is `L3`. No code is
written for this spec, so there is no `L1` or `L2` case.

| Layer | What it proves                                                                                                         | Test module, one per BR, under `packages/qfai/tests/integration/verify/orchestrated/` | TCs          |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------ |
| `L3`  | The stage writes this run's `verify.json`, names it in `artifactRefs`, and records the qa-gatekeeper verdict           | `stageResultReceipts.test.ts` (BR-0014-0026)                                          | TC-0014-0037 |
| `L3`  | A `verify.json` from another run, spec or shared location is never named as this stage's                               | `foreignReport.test.ts` (BR-0014-0027)                                                | TC-0014-0038 |
| `L3`  | A gate that did not run is `unrun`, and outcome and observation are reported apart                                     | `unrunGate.test.ts` (BR-0014-0028)                                                    | TC-0014-0039 |
| `L3`  | `verify.json` keeps its six fields and its `status` and `scope` sets                                                   | `verifyJsonUnchanged.test.ts` (BR-0014-0029)                                          | TC-0014-0040 |
| `L3`  | The three repair kinds go to `qfai-sdd`, `qfai-atdd` and `qfai-implement` as `needs_repair`                            | `repairRouting.test.ts` (BR-0014-0030)                                                | TC-0014-0041 |
| `L3`  | The entry check and the one `SKILL.md` citation line                                                                   | `stageSkillHandover.test.ts` (BR-0014-0031)                                           | TC-0014-0042 |
| `L3`  | The Operations table is exactly `verify-full`                                                                          | `operationsTable.test.ts` (BR-0014-0032)                                              | TC-0014-0043 |
| `L3`  | A missing environment returns `blocked`, blocker `stage-blocked`, cleared by `operator`, with no debt                  | `missingEnvironment.test.ts` (BR-0014-0033)                                           | TC-0014-0044 |
| E2E   | The story, discharged by a spec-0018 journey (spec-0018 `10_Plan.md` `### Which journey discharges which stage story`) | the spec-0018 journey modules                                                         | US-0014-0021 |

Each row's ledger `Test file` names its module above, the per-BR split
`catalog/test-layers.md` `## Test-file granularity` asks for.

Cases that stand alone:

- No case here is matrix-shaped. The three repair kinds are held literally in
  one case, and the missing environment has a case of its own, because it is a
  blocker rather than a repair.
- TC-0014-0040 guards a file this change does not edit. Its RED is taken by
  falsifiability, since the rule already holds.
- The kept failures are TC-0014-0038 (a foreign report), TC-0014-0039 (a gate
  that did not run is never a pass) and TC-0014-0044 (a missing environment).

What existing guards hold, so no case is written for it:

- The per-stage copy of `verify.json`, the trust level of each receipt, and
  `finish` reading only this run's copy: spec-0018's FAULT-008 and FAULT-009.
- The core's `verify-foreign` condition at `finish`, and its
  `blocked-repairable` refusal at `accept`.
- `verify.json`'s two readers, `certify` and the reviewer-gate check, keep their
  existing tests. This change gives neither a new value.
- No internal identifier in the shipped reference: the distributed-surface
  guards.

Order: the reference is a tier-2 stage asset, and the E2E row closes at tier 5,
in the order spec-0018 `10_Plan.md` `### Order in which the rows go green` sets.

Findings carried on purpose. Pushes go to one draft pull request that is merged
only when every lane is green, and each push lists its expected findings in the
batch evidence (spec-0018 `10_Plan.md` `### Findings carried on purpose`).

| Finding                                                                                                                                             | Why it is expected                                                                                                                                                                                                                      | Until                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `QFAI-ATDD-111` naming US-0014-0021                                                                                                                 | The journey that discharges it does not exist yet. The finding is project-wide and charged to `.qfai/specs/spec-0001`                                                                                                                   | spec-0018's tier-4 journeys land                                    |
| `QFAI-ATDD-112` naming TC-0014-0037..0044                                                                                                           | The integration tests do not exist yet. Charged the same way                                                                                                                                                                            | ATDD writes them                                                    |
| 15 errors on `tdd/test-list.md`, pinned in `tdd` and `full`: 7 × `QFAI-TDDLIST-007`, 7 × `QFAI-TDDLIST-011`, 1 × `TDDLIST_SELECTOR_UNRESOLVED`      | They are on rows that predate this change, which appends rows only and repairs none of them                                                                                                                                             | A later change                                                      |
| 4 × `QFAI-TRACE-001`, on the rows linking `core/validators/prototypingEvidence.ts` (two), `core/report.ts` and `cli/commands/prototypingCertify.ts` | This change edits `03` and `04` but not those files, and the check flags every linked row. It fires only where `origin/main` is present, so CI skips it (`QFAI-TRACE-003`). The implement and verify stages record it as known (Y1 = A) | The follow-up that narrows the check to rows whose BR or AC changed |
| CR-20260913-0005 proposes `TDD-0037`, which US-0014-0013's E2E row already holds                                                                    | An open CR outside this change. This change's rows start at `TDD-0042`, so they add no clash                                                                                                                                            | That CR's approval, which takes the next free TDD ID                |

## Dependencies

- Requires: `/qfai-sdd` により生成された specs/contracts
- Requires: review artifacts and validate output
- Consumed by: completion gate, PR handoff

## NFR approach

- The legacy floors NFR-0001..NFR-0003 of `01_Spec.md` `## Applicable NFR` are unchanged by the
  intent-driven entry. Inside a run, verify still runs full-scan gates (NFR-0001), and
  `verify.json` keeps its path, fields and values, so its output stays deterministic for the same
  input (NFR-0002). Breach: a field or value in `verify.json` that the output contract does not
  state, which the BR-0014-0029 test cases observe.

### Intent-driven entry (CAP-0018)

- **This run's receipts only.** The gate results verify submits are recorded as agent-reported,
  and `finish` reads only this run's copy of `verify.json`. That trust limit is spec-0018's risk
  row. Met here by naming only the file this stage wrote (BR-0014-0026, BR-0014-0027). Breach: a
  `verify-foreign` condition at `finish`.
- **`discussion-20260923171450572#NFR-0002` and `#NFR-0015` for the new reference and the one
  citation line (730 to 731).** Met by the existing guards. Breach: the asset line-budget check on
  either file, or one of the four distributed-surface guards reporting an internal identifier or a
  private version marker in them.

## Risk mitigation

- historical validator wording に `full-harness` や discussion-side 用語が残る可能性
- mitigation: active path と historical vocabulary を区別し、public guidance では contract-first posture のみを説明する

### Intent-driven entry (CAP-0018)

| Risk                                                                                                                                                                    | Likelihood / impact | Mitigation                                                                                                                                                                                                                 | Trigger to act                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `QFAI-TRACE-001` fires locally on this spec's four ledger rows (`prototypingEvidence.ts` twice, `report.ts`, `prototypingCertify.ts`) at the implement and verify gates | high / low          | Accepted and recorded as known, by the user's answer on 2026-09-24; a follow-up asks to narrow the check to rows whose BR or AC changed. CI's dogfood lanes cannot run the check, because `build` fetches no `origin/main` | The count differs from four, or CI's `build` job gains `origin/main`, which turns the four into CI errors  |
| A `needs_repair` finding reaches no owner                                                                                                                               | low / med           | Each finding carries a `resolvingOwner` that is a skill a plan names, and a missing environment returns `blocked` for the operator instead (BR-0014-0030, BR-0014-0033)                                                    | A `needs_repair` result with a finding whose `resolvingOwner` is absent or names nothing a plan dispatches |
| The open CR-20260913-0005 proposes `TDD-0037`, which the E2E row of US-0014-0013 already holds                                                                          | med / low           | Outside this entry: the CR takes the next free TDD ID when it is approved                                                                                                                                                  | The CR reaching approval with `TDD-0037` still in it                                                       |

## SaaS-Package Certify Scope (REQ-0166 certify side, v1.9.2)

- How: `qfai prototyping certify --scope saas-package` writes `completion-certificate.json` with `scope: "saas-package"` and a non-empty `notes:` field enumerating each skipped gate (the ATDD / implement-class gates that the spec-0004 validate profile skips).
- How: the certify path withholds any field that would assert full DONE while scope is `saas-package`.
- How: `--upgrade-scope full` re-checks every gate named in `notes:`; it rejects with a message naming still-missing gates and upgrades the sealed certificate to full scope only once all PASS.
- How: `/qfai-prototyping` SKILL.md documents `--scope saas-package` as a SaaS-tenant delivery mode.
- Test strategy: integration test for the seal (`scope` + `notes:`, no full-DONE claim) and the `--upgrade-scope full` reject-then-allow boundary; both assert CLI shape (flags, certificate field shape).

# 08 Open Questions

5 items.

## Resolved by cited decisions (CHG-006, 2026-05-27)

- OQ-0160 — Default Autopilot Policy template structure (which categories belong to auto-decide / ask-user / hard-required). RESOLVED by `_policies/08_Decisions.md` DR-0269 (3-bucket template, option C). Realized as AC-0015-0015 / BR-0015-0010.
- OQ-0162 — envelope-deviation `AskUserQuestion` audit trigger taxonomy. RESOLVED by DR-0270 (fixed four-context declared taxonomy, option C pinned). Realized as AC-0015-0016 / BR-0015-0011.
- OQ-0163 — `qfai audit log` CLI shape. RESOLVED by DR-0271 (filtered query + `--format table|json`, table default). Realized as AC-0015-0019 / BR-0015-0014.

## Carry-forward deferred (not resolved here)

- OQ-0119 — Reviewer subagent prompt / tool-augmentation timing for the new finding-code catalog (REQ-0168). Remains carry-forward deferred per upstream; this slice pins severity + justification posture (BR-0015-0013) only and MUST NOT resolve the prompt-augmentation timing.

## Deferred lockstep change (CHG-007, 2026-08-05)

- OQ-0015-0001 — When do `R-WORKFLOW-HYGIENE-DRIFT` and `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` get registered in the closed `JUSTIFICATION_CATALOG`, where the severity-class membership test says they belong? Owner: QFAI maintainers. Due: 2026-11-30. Status: deferred. This is a timing question, not an open design question — DR-0015-0006 records the answer of record as yes. It is deferred because registration extends a closed set and every SSOT below must move in one change, which is a wider slice than the CHG-007 ingestion cascade. Trigger: the next change that already owns the reviewer-gate justification surface. While it is open, AC-0015-0022 / BR-0015-0017 hold the divergence as an explicitly enumerated two-code list. Consumers that must move in the same lockstep change, because each asserts the codes' catalog state: `.qfai/contracts/cli/shipped-workflows.md` §6, `_policies/05_Contracts.md` cross-contract reconciliation row, `spec-0017` BR-0017-0040 / EX-0017-0040 / TC-0017-0049, and `spec-0003` BR-0003-0044 / REQ-0031. All of these were corrected in round 4 to describe the state as deferred rather than permanent; the registration change must revisit each.
  - SSOTs that MUST move together, none of them separately:
    - `packages/qfai/src/core/validators/justificationCatalog.ts` — the `JUSTIFICATION_CATALOG` array **and** its header comment, which states the closed-set size and the lockstep obligation itself.
    - `packages/qfai/src/core/validators/reviewerJustification.ts` — the advisory-failing code set it derives from the catalog, which is what performs the empty-`justification:` rejection.
    - This spec's closed-set criterion and rule (AC-0015-0018 / BR-0015-0013), both of which enumerate the set by name and assert its size.
    - The test cases that pin the count and the rejection path (TC-0015-0026 / TC-0015-0027) and their `tdd/test-list.md` ledger rows.
    - `packages/qfai/tests/unit/core/validators/justificationCatalog.test.ts`, which asserts the member count directly.
    - `.qfai/contracts/cli/shipped-workflows.md` (`CLI-WFSET`) §6 — the SSOT for the codes' catalog status. It now states the severity-class discriminator and records registration as deferred, not waived; the falsified emitter-identity rationale was removed from it in round 4. Not owned by this spec, but it must be revisited by the registration change like every other consumer above.
    - TC-0015-0035 / TC-0015-0036, whose oracles assert today's divergence and are expected to flip on resolution.

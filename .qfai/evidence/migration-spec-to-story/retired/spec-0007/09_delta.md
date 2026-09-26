# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0007 新規作成（旧 spec-0005 の統合）
- Tags: guardrails, drift-prevention, rfc2119, consolidation

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: spec-to-story batch `sdd-batch-20260923100952585`
- Tags: guardrails, story-tree
- Summary: on the story tree guardrails are read from `01_policy/` and the
  contract layer; the guardrail grammar is deferred as OQ-0180. Recorded under
  `## 2026-09-24 — spec-to-story batch record`.

## Migration Record

| Old Spec  | Title           | Key Changes                                                                                                                                 |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| spec-0005 | qfai guardrails | Core functionality retained. IDs renumbered to 0007-XXXX. extract --max and --paths added as explicit requirements. LLM format output added |

## Outdated Content Removed

- 旧 spec-0005 の BR-0005-0009（RFC 2119 検出仕様の重複記述）を DR-0001 に統合
- 旧 spec-0005 の auto-traceability backfill rows（TC-0005-0010, TC-0005-0011）は新 ID 体系では不要のため除外

## Adopted

- Adopted: 旧 spec-0005 を spec-0007 として再番号付け
- Why: v2.0 のスペック番号体系（CAP-0007）に合わせるため

## Rejected

- Candidate: 旧番号（spec-0005）を維持する
- Reason: 新番号体系への統一
- DO NOT: 旧 spec-0005 の番号で参照を残さないこと
- Temptation: 旧番号維持は移行コストが低いが、体系の一貫性を損なう

## 2026-05-06 — CHG-001 — Scope-deferred legacy concept reintroduction guard (decomposition note)

| Op ID  | Op Type       | Target             | Summary                                                                                                                           |
| ------ | ------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope) | Scope-deferral note: legacy concept reintroduction guard (旧 prototyping 概念 sanity grep) は future guardrail extension へ defer |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). The sanity grep guard for v1.x prototyping concepts (`mode` / `full-harness` / `round` / `polish` / `concept-fit`) is recorded as scope-deferred at this spec; existing distributed-surface guard (`check-no-internal-version-leakage.sh`) is unchanged. No AC/BR/EX/TC ID is allocated in this CHG.

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                  | Existing Spec | Operation | Sub-op | Approved By | Rationale                                  | Depends-On |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------ | ---------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005 | Guardrails are read from `01_policy/` and `03_contract/` | spec-0007     | UPDATE    | MODIFY | -           | Slice C; BR-0007-0001 names the old source | OQ-0170    |

## 2026-09-24 — spec-to-story batch record

The record of the `/qfai-sdd` batch run `sdd-batch-20260923100952585` for this
spec, summarised as DELTA-0002 under `## Change Summary`. Its row is under
`## Triage (2026-09-23 spec-to-story)` above, and every decision it applies is
in `.qfai/evidence/sdd-batch-20260923100952585.md`. This spec has no REMOVE
row, so nothing is retired or tombstoned.

### What this run changed

- Added: EX-0007-0012, TC-0007-0012, and ledger row TDD-0015 at `todo`.
- Changed by adding a clause marked "on the story tree" beside the current one
  (ruling X1), and translated to English: BR-0007-0001. Only its source clause
  changed (ruling G3 C1).
- `01_Spec.md`: three lines citing the discussion pack.
- `10_Plan.md`: a `### Story-tree layout` subsection under each heading the
  change touches.
- Unchanged: US-0007-0001, AC-0007-0001, every existing TC and every existing
  ledger row (ruling X2).

### Where the row lands

Delivery is three pull requests (P3-C1 to P3-C3): P1 on its own and merged
first; P2 to P8 in one pull request that also carries `/qfai-atdd` and
`/qfai-implement` with their tests; then the removal of the migration memo's
guard exception. This spec's row lands at P7 in the second.

| Triage row                                               | Operation     | Lands | Items                                               |
| -------------------------------------------------------- | ------------- | ----- | --------------------------------------------------- |
| Guardrails are read from `01_policy/` and `03_contract/` | UPDATE:MODIFY | P7    | BR-0007-0001; EX-0007-0012; TC-0007-0012 (TDD-0015) |

With no `--paths`, `loadDecisionGuardrails` in
`packages/qfai/src/core/decisionGuardrails.ts` scans the Markdown under
`<paths.specsDir>/01_policy/` and `<paths.contractsDir>/` instead of the
literal glob `.qfai/specs/**/18_delta.md`. The entry grammar does not change.

### Co-changes the landing carries

- **P7.**
  - All three callers of `loadDecisionGuardrails` pass both resolved
    directories: `packages/qfai/src/cli/commands/guardrails.ts`,
    `packages/qfai/src/core/doctor.ts` and `packages/qfai/src/core/report.ts`.
    The doctor guardrail check and the report's guardrail section change with
    this row, although spec-0005's and spec-0006's plans do not name it.
  - The landing drops the current clause from BR-0007-0001, leaving the marked
    one (ruling X1, OQ-0170).
  - The existing guardrail tests in `packages/qfai/tests/cli/guardrails.test.ts`
    and `packages/qfai/tests/cli/main.test.ts` name their file explicitly, so
    the new default leaves them unchanged.

### Recorded drift

Found while drafting and left as it is, because no row of this run covers it
(ruling X11).

- The entry grammar disagrees with BR-0007-0001. The rule says guardrails are
  detected by RFC 2119 keywords; the parser reads `DG-NNNN` entries under a
  "Decision Guardrails" heading, in `18_delta.md`, a file neither layout has.
  Deferred as OQ-0180 in `_policies/09_Open-questions.md`, due before the P7
  cutover.
- Until OQ-0180 is answered, the policy and contract files of a migrated
  project carry no block the parser reads, so `qfai guardrails list` prints
  `- (none)`. TC-0007-0012 asserts one entry from each directory, so it cannot
  pass on that empty listing.
- US-0007-0001 and AC-0007-0001 still name `_policies/` and the spec
  directories as the source. Ruling G3 C1 changed only BR-0007-0001. Open.

### Adoption and rejection

- Adopted (ruling G3 C1): only the source clause of BR-0007-0001 changes, and
  the scan roots change apart from the parser, so an answer to OQ-0180 changes
  the parser alone.
- Rejected: settling the guardrail grammar in this change.
  - DO NOT: change the `DG-NNNN` parser, or BR-0007-0001's RFC 2119 wording,
    under the story-tree row.
  - Temptation: the P7 change already opens `decisionGuardrails.ts`, and the
    mismatch is visible there. The mismatch predates the story tree, and no
    requirement or contract states which grammar the story tree uses.

## Triage (2026-09-24 OQ-0180 resolution)

The user selected explicit `DG-NNNN` entries in policy and contract Markdown
for the P7 cutover. DR-0007-0003 supersedes the earlier keyword-detection
decision. This resolves the drift recorded above without discarding historical
evidence.

| Source | Subject | Existing Spec | Operation | Sub-op | Approved By | Rationale | Depends-On |
| ------ | ------- | ------------- | --------- | ------ | ----------- | --------- | ---------- |
| OQ-0180 user answer | Guardrail source and grammar | spec-0007 | UPDATE | MODIFY | User | Update US-0007-0001, AC-0007-0001, BR-0007-0001, EX-0007-0001/0002/0012, and REQ-0040 to use explicit `DG-NNNN` entries under the policy and contract roots. Keep ID, type, rationale, and reconsideration condition. Do not auto-extract RFC 2119 sentences. | P7 guardrails parser and CLI-GUARD |
| OQ-0180 user answer | Public guardrails contract | spec-0007 | UPDATE | APPEND | User | Add `cli/qfai-guardrails.md` as the single command-surface owner and index it in `_policies/05_Contracts.md`. | P7 contract migration |

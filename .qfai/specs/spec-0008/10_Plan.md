# 10 Plan

## Implementation approach

1. Define ATDD skill contract based on SKILL.md SSOT
2. Implement TestVolumeEstimator signal table generation
3. Implement layer-specific test generation (E2E -> US, API -> CON-API, Integration -> TC)
4. Implement annotation validation and forbidden reference enforcement
5. Implement stage gate enforcement (P0-P8)
6. Implement evidence file generation

## Test approach

- Unit tests: annotation parsing, volume estimation logic
- Integration tests: coverage obligation verification, forbidden reference detection
- E2E tests: full ATDD workflow from spec input to evidence output

## Dependencies

- Requires: spec artifacts (US/TC/CON-API declarations) from `/qfai-sdd`
- Consumed by: `/qfai-implement` for unit/component TDD cycle

## Risk mitigation

- Coverage obligation definitions may evolve as contract schema changes
- Mitigation: Use SKILL.md as SSOT and adapt obligation parsing accordingly

## CHG-006 (2026-05-27) — v1.9.2 Second-Wave (atdd scaffold)

- How (REQ-0157 / US-0008-0007): `qfai atdd scaffold --spec spec-NNNN` は spec の test*cases を列挙し、各 TC につき `tests/atdd/spec-NNNN/<TC-ID>.test.*`を生成する。ファイル内容は project の test-framework primitives import +`// TODO: implement assertion for <TC-ID>` + 関連 US-\* / CON-API-\_ の comment 参照。
- Idempotency: 書き込み前に既存ファイルを読み、TODO marker がもう存在しない (= operator が埋めた) 場合は skip。TODO marker が残るか、ファイル不在の場合のみ (再)生成する。
- Placeholder lifecycle: `qfai validate` は TODO marker を grep し `D-SCAFFOLD-PLACEHOLDER` (warning) を emit。validate cycle count を per-placeholder で追跡し、`atdd.scaffoldEscalateCycles` (既定 3 / DR-0272) 到達時に severity を error へ昇格する。

## CHG-007 (2026-08-05) — worker-scoped credential-reuse guidance

- How (REQ-0024 / US-0008-0008): author one reference artifact under the shipped `/qfai-atdd` skill's `references/` directory (sibling of the existing depth checklist) holding the seven session-reuse rules, the companion caller-injected-environment rule, and the credential-class script-naming rule. Cross-link it from the skill entry point so the rules are reachable without reading the whole skill.
- Nothing else is built. There is no validator, no finding-code registration, no config key, no CLI flag and no annotation token in this change — the deliverable is prose. Do not add a `D-*` / `R-*` code to make the rules enforceable; enforcement was not requested and would grow the vocabulary NFR-0015 freezes.
- Backend agnosticism is asserted, not assumed: the test carries a deny-list of browser-backend names plus install-command and version-pin shapes, and includes a planted-name fixture so the zero-match assertion is falsifiable.
- Distributed-surface care: the artifact ships under `assets/`, so it must carry no internal spec / capability / decision / open-question identifier and no version marker beyond the canonical package version. Authoring it only in the repository-root mirror would be reverted by the asset sync.
- Scope containment: the artifact's own scope statement names E2E / API / Integration. It must not describe a unit or component obligation — that boundary is a recorded rejection, not a simplification.

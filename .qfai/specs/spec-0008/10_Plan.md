# 10 Plan

## Implementation Strategy

1. Define ATDD skill contract based on SKILL.md SSOT
2. Implement TestVolumeEstimator signal table generation
3. Implement layer-specific test generation (E2E -> US, API -> CON-API, Integration -> TC)
4. Implement annotation validation and forbidden reference enforcement
5. Implement stage gate enforcement (P0-P8)
6. Implement evidence file generation

## Test Strategy

- Unit tests: annotation parsing, volume estimation logic
- Integration tests: coverage obligation verification, forbidden reference detection
- E2E tests: full ATDD workflow from spec input to evidence output

## Dependencies

- Requires: spec artifacts (US/TC/CON-API declarations) from `/qfai-sdd`
- Consumed by: `/qfai-implement` for unit/component TDD cycle

## Risk

- Coverage obligation definitions may evolve as contract schema changes
- Mitigation: Use SKILL.md as SSOT and adapt obligation parsing accordingly

## CHG-006 (2026-05-27) — v1.9.2 Second-Wave (atdd scaffold)

- How (REQ-0157 / US-0008-0007): `qfai atdd scaffold --spec spec-NNNN` は spec の test*cases を列挙し、各 TC につき `tests/atdd/spec-NNNN/<TC-ID>.test.*`を生成する。ファイル内容は project の test-framework primitives import +`// TODO: implement assertion for <TC-ID>` + 関連 US-\* / CON-API-\_ の comment 参照。
- Idempotency: 書き込み前に既存ファイルを読み、TODO marker がもう存在しない (= operator が埋めた) 場合は skip。TODO marker が残るか、ファイル不在の場合のみ (再)生成する。
- Placeholder lifecycle: `qfai validate` は TODO marker を grep し `D-SCAFFOLD-PLACEHOLDER` (warning) を emit。validate cycle count を per-placeholder で追跡し、`atdd.scaffoldEscalateCycles` (既定 3 / DR-0272) 到達時に severity を error へ昇格する。

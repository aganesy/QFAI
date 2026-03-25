# 09 Delta

## Change Summary

- Change ID: DELTA-0024-0001
- Date: 2026-03-25
- Primary: spec-0024 initial creation
- Tags: CAP-0024, v1.7.1
- Summary: Render Evidence Automation capability specification

## Rationale

- v1.7.1 introduces structured render evidence capture, validation, and degraded-mode handling for `qfai prototyping`

## Candidates Considered

1. Extend `qfai prototyping` with render evidence support while keeping optional renderer behavior (adopted)
2. Introduce a new top-level command for render capture (rejected)

## Adopted

- Adopted: Extend `qfai prototyping` in place
- Why: Preserves the existing user surface and keeps capture logic reusable for future browser QA work without expanding command surface area

## Rejected

- Candidate: New `qfai render` command
- Reason: Splits responsibility unnecessarily and increases migration friction
- DO NOT: Add a separate top-level render command in v1.7.1
- Temptation: "Render capture is visible enough to deserve its own command" but this fragments the prototyping flow and widens the CLI surface.

---

- Change ID: DELTA-0024-0002
- Date: 2026-03-25
- Primary: evidence storage model
- Tags: OQ-0024-0003, OQ-0024-0004
- Summary: Path-only evidence storage with typed outcomes

## Rationale

- JSON should stay diffable and lightweight, while still preserving enough metadata to trace captured/skipped/failed states

## Candidates Considered

1. Path-only metadata with typed outcomes (adopted)
2. Inline screenshot bytes or HTML bodies (rejected)

## Adopted

- Adopted: Path-only metadata
- Why: Keeps bundles lightweight, avoids secret leakage, and makes validation deterministic

## Rejected

- Candidate: Inline base64 or raw body storage
- Reason: Increases payload size and makes review/debugging harder
- DO NOT: Embed raw assets into the JSON evidence bundle
- Temptation: "Inline everything so the evidence is self-contained" but this makes the bundle heavy and obscures the review path.

## Impact

- Affects: `qfai prototyping` command, evidence schema, validators, report guidance, init docs
- Validation: `qfai validate --fail-on error --format github` must remain the review gate

## Follow-ups

- v1.7.2+: browser QA / visual diff / repair-loop discussion if needed
- Owner: team
- Due: next release planning milestone

---

- Change ID: DELTA-0024-0003
- Date: 2026-03-25
- Primary: contracts-first review refresh
- Tags: CAP-0024, DR-0048
- Summary: spec-0024 は external DB/API/UI contract を追加しない判断を再確認

## Rationale

- Render Evidence Automation は既存 CLI の内部 evidence schema / validator / report / docs 変更であり、外部向け stable contract を増やさない。

## Candidates Considered

1. Contract Index を 0 items のまま維持し、none-rationale を明示する (adopted)
2. 内部 evidence schema を DB/API/UI contract に擬似的に写像する (rejected)

## Adopted

- Adopted: Contract Index は 0 items を維持する
- Why: `.qfai/contracts/**` の責務は外部向け stable surface に限定されており、spec-0024 の変更はその対象外だから

## Rejected

- Candidate: internal evidence schema を外部 contract として追加する
- Reason: contract の責務を曖昧にし、実際には存在しない外部 surface を発明してしまう
- DO NOT: internal evidence schema を外部 contract として偽装しない
- Temptation: contracts-first を満たすために何か contract を増やしたくなるが、責務の混線を招く

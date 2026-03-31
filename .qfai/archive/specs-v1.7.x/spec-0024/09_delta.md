# 09 Delta

## Change Summary

- Change ID: DELTA-0024-0001
- Date: 2026-03-25
- Primary: spec-0024 initial creation
- Tags: CAP-0024, v1.7.1
- Summary: Render Evidence Automation capability specification

## Rationale (DELTA-0024-0001)

- v1.7.1 introduces structured render evidence capture, validation, and degraded-mode handling for `qfai prototyping`

## Candidates Considered (DELTA-0024-0001)

1. Extend `qfai prototyping` with render evidence support while keeping optional renderer behavior (adopted)
2. Introduce a new top-level command for render capture (rejected)

## Adopted (DELTA-0024-0001)

- Adopted: Extend `qfai prototyping` in place
- Why: Preserves the existing user surface and keeps capture logic reusable for future browser QA work without expanding command surface area

## Rejected (DELTA-0024-0001)

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

## Rationale (DELTA-0024-0002)

- JSON should stay diffable and lightweight, while still preserving enough metadata to trace captured/skipped/failed states

## Candidates Considered (DELTA-0024-0002)

1. Path-only metadata with typed outcomes (adopted)
2. Inline screenshot bytes or HTML bodies (rejected)

## Adopted (DELTA-0024-0002)

- Adopted: Path-only metadata
- Why: Keeps bundles lightweight, avoids secret leakage, and makes validation deterministic

## Rejected (DELTA-0024-0002)

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

## Rationale (DELTA-0024-0003)

- Render Evidence Automation は既存 CLI の内部 evidence schema / validator / report / docs 変更であり、外部向け stable contract を増やさない。

## Candidates Considered (DELTA-0024-0003)

1. Contract Index を 0 items のまま維持し、none-rationale を明示する (adopted)
2. 内部 evidence schema を DB/API/UI contract に擬似的に写像する (rejected)

## Adopted (DELTA-0024-0003)

- Adopted: Contract Index は 0 items を維持する
- Why: `.qfai/contracts/**` の責務は外部向け stable surface に限定されており、spec-0024 の変更はその対象外だから

## Rejected (DELTA-0024-0003)

- Candidate: internal evidence schema を外部 contract として追加する
- Reason: contract の責務を曖昧にし、実際には存在しない外部 surface を発明してしまう
- DO NOT: internal evidence schema を外部 contract として偽装しない
- Temptation: contracts-first を満たすために何か contract を増やしたくなるが、責務の混線を招く

---

- Change ID: DELTA-0024-0004
- Date: 2026-03-30
- Primary: v1.7.6 remediation — render evidence CLI wiring
- Tags: CAP-0024, v1.7.6, remediation, DR-0081
- Summary: REQ-0024-0008 の未達を修正。render evidence 実装を CLI/skill フローに実配線し、placeholder を排除する。

## Rationale (DELTA-0024-0004)

- v1.7.1 の実装では `renderCritique.ts` の render evidence 一次ソース接続が `prototyping.ts` の CLI フローに貫通しておらず、CLI 出力に placeholder が残っていた。
- v1.7.6 remediation で DR-0081 を採用し、"Wire to CLI" を決定。公開クレームの downgrade は採用しない。

## Candidates Considered (DELTA-0024-0004)

1. render evidence の実配線を完了する（Wire to CLI）（採用）
2. 公開クレームを downgrade してドキュメントを修正する（却下）

## Adopted (DELTA-0024-0004)

- Adopted: Wire to CLI
- Why: 利用者が期待する CLI 出力に実データ（screenshot hash、タイムスタンプ、file path）を提供する。placeholder のままでは公開動作として不誠実。

## Rejected (DELTA-0024-0004)

- Candidate: Downgrade public claim
- Reason: 既存利用者への後退。仕様で約束した動作を提供しないことになる
- DO NOT: render evidence の実配線を避けるためにドキュメントや REQ を後退させない
- Temptation: 配線コストを避けるために REQ-0024-0008 のスコープを縮小したくなる

## Impact (DELTA-0024-0004)

- Affects: `prototyping.ts`（CLI wiring）、`renderCritique.ts`（一次ソース接続の完結）、tests（TC-0024-0018..TC-0024-0023）
- New items: US-0024-0006、AC-0024-0013..0018、BR-0024-0013..0016、EX-0024-0018..0023、TC-0024-0018..0023、DR-0081
- Validation: `qfai validate --fail-on error` must pass with `error=0`

## Follow-ups (DELTA-0024-0004)

- v1.7.7+: 0-byte evidence の自動 retry ポリシーを検討
- Owner: team
- Due: v1.7.6 release

---

- Change ID: DELTA-0024-0005
- Date: 2026-03-31
- Primary: v1.7.11 completion — remove "requested" status, enforce real capture status model
- Tags: CAP-0024, v1.7.11, WS-G, DR-0103
- Summary: REQ-0013/0014/0015 対応。render evidence status vocabulary を captured/skipped/failed の 3 値に制限し、"requested" を廃止。"captured" は actual execution evidence を必須とする。

## Rationale (DELTA-0024-0005)

- "requested" status は実際の capture 結果を反映しておらず、evidence としての信頼性を損なう。DR-0103 により 3 状態モデルを採用し、captured には execution evidence (hash/timestamp/path) を必須とする。

## Candidates Considered (DELTA-0024-0005)

1. "requested" を廃止し captured/skipped/failed の 3 値モデルに統一する（採用）
2. "requested" を維持し "pending" として再定義する（却下）

## Adopted (DELTA-0024-0005)

- Adopted: 3 値モデル (captured/skipped/failed)
- Why: "requested" は capture 実行結果ではなく意図の表明に過ぎず、evidence bundle に不誠実な状態を残す

## Rejected (DELTA-0024-0005)

- Candidate: "requested" を "pending" として再定義
- Reason: pending は完了していない状態を示すが、evidence bundle は最終結果のみを保持すべき
- DO NOT: status vocabulary に "requested" や "pending" を追加しない
- Temptation: 未完了状態を追跡したくなるが、evidence bundle は実行完了後の結果のみを反映する

## Impact (DELTA-0024-0005)

- Affects: evidence validator, render entry schema, prototyping CLI output
- New items: US-0024-0007, AC-0024-0019..0021, BR-0024-0017..0018, EX-0024-0024..0027, TC-0024-0024..0027
- Validation: `qfai validate --fail-on error` must pass with `error=0`

# 07 Decisions

## Decisions

1 decision in this spec (v1.7.6 remediation).

### DR-0081: REQ-0024-0008 解決 — Wire render evidence to CLI (not downgrade)

- Decision: `renderCritique.ts` の render evidence 一次ソース接続を `prototyping.ts` の CLI/skill フローに実配線する (Option A: Wire to CLI)
- Context: v1.7.6 remediation。REQ-0024-0008 が「`renderCritique.ts` は render evidence を一次ソースとして使う」と定義しているが、当初の v1.7.1 実装では CLI 出力への貫通が未完であり、placeholder が残っていた。
- Rationale: CLI の公開動作として render evidence の実データ（screenshot hash、タイムスタンプ、file path）を出力することは必須。Downgrade（公開クレームを下げる）は既存利用者への後退であり採用しない。
- Rejected: Downgrade public claim（REQ-0024-0008 を弱体化してドキュメントを修正する）
  - DO NOT: render evidence の実配線を避けるためにドキュメントや public claim を後退させない
  - Temptation: 配線コストを避けるためにクレームを曖昧化したくなるが、利用者が期待する動作を提供できない
- Adopted: Wire to CLI
  - Why: render evidence は v1.7.1 で既に仕様化されており、CLI 貫通が本来の意図。placeholder のままでは利用者に誤情報を提供する
- Evidence: v1.7.6 remediation discussion、US-0024-0006、BR-0024-0013..BR-0024-0016

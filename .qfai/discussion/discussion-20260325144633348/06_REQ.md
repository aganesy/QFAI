# 06_REQ

## Priority Legend

| Priority | Meaning                            |
| -------- | ---------------------------------- |
| must     | v1.7.1 の完了条件に直結する要件    |
| should   | 推奨だが、同梱判断の余地がある要件 |
| wont     | v1.7.1 では対象外の要件            |

## Requirements

| REQ-ID   | Title                                                         | Description                                                                                                                                                                        | Source                       | Priority | Status |
| -------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ------ |
| REQ-0001 | `qfai prototyping` に render evidence 収集を追加する          | 既存の `qfai prototyping` を拡張し、`--render-evidence` を指定したときのみ render evidence を収集する。新しいトップレベル CLI コマンドは追加しない。                               | SRC-0001, SRC-0002, SRC-0004 | must     | draft  |
| REQ-0002 | CLI フラグは config を上書きする                              | `--render-evidence`、`--viewports`、`--render-out`、`--base-url` は `uiux.renderEvidence` の設定値を上書きし、未指定項目のみ config の既定値を使う。                               | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0003 | viewport の既定値と opt-in を定義する                         | 既定 viewport は `desktop` と `mobile` とし、`tablet` は opt-in にする。viewports の拡張は CLI か config で行う。                                                                  | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0004 | `uiFidelity.screens[].renders[]` を追加する                   | render evidence は `viewport`、`status`、`width`、`height`、`imagePath`、`htmlPath`、`capturedAt`、`skippedReason`、`error` を持つ。`captured/skipped/failed` を明示的に区別する。 | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0005 | evidence は path-only で保存する                              | 画像や HTML の実体は `.qfai/evidence/prototyping/<spec-id>/` 配下のファイルとして保存し、JSON には base64 や本文を埋め込まず、パスとメタデータのみを保持する。                     | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0006 | lazy Playwright 解決と typed outcome を採用する               | render helper は Playwright を dynamic import し、未導入や起動失敗時は throw ではなく `captured / skipped / failed` の型付き結果を返す。                                           | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0007 | `prototypingEvidence.ts` で render evidence を検証する        | `renders[]` の形状、captured での image/html 実体存在、skipped/failed の理由の有無、profile に応じた coverage を検証する。                                                         | SRC-0001, SRC-0002, SRC-0004 | must     | draft  |
| REQ-0008 | `renderCritique.ts` は render evidence を一次ソースとして使う | render evidence が存在する場合は viewport 存在判定の一次ソースに使い、markdown critique がある場合は後方互換の補助入力として読む。                                                 | SRC-0001, SRC-0002, SRC-0004 | must     | draft  |
| REQ-0009 | `designFidelity.ts` と `navigationFlow.ts` は互換的に扱う     | responsive / route coverage の判定は維持しつつ、render evidence 欠落は警告または補助 issue として扱い、legacy markdown-only 既存 pack を壊さない。                                 | SRC-0001, SRC-0002, SRC-0004 | must     | draft  |
| REQ-0010 | `report.ts` は skipped / missing の理由を具体化する           | render evidence が missing / skipped の場合、何が不足しているか、なぜ必要か、次に何をすべきかを報告する。                                                                          | SRC-0001, SRC-0004           | must     | draft  |
| REQ-0011 | init evidence README と example docs を更新する               | `.qfai/evidence/README.md` と例示ファイルは render evidence bundle、degraded mode、path convention を説明する。                                                                    | SRC-0001, SRC-0004, SRC-0006 | must     | draft  |
| REQ-0012 | v1.7.1 のスコープ境界を固定する                               | v1.7.1 は capture と validation までに限定し、browser QA の本格運用、visual diff、repair loop、外部 critique adapter は含めない。                                                  | SRC-0001, SRC-0002           | must     | draft  |

## Work Orders Summary

| Step | Role (sub-agent) | Task title      | Input (refs)                          | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | --------------- | ------------------------------------- | ------------- | -------------------- |
| 1    | worker           | REQ first draft | design memo, README 群, existing pack | `06_REQ.md`   | PASS                 |
| 2    | orchestrator     | REQ integration | worker draft, source normalization    | `06_REQ.md`   | PASS                 |

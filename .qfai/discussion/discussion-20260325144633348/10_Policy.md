# 10_Policy

Discussion pack: discussion-20260325144633348
Version context: QFAI v1.7.1 `Render Evidence Automation`
Last updated: 2026-03-25

## Security Policy

- render evidence はローカル生成物として扱い、外部サービスへ自動送信しない。
- 画像や HTML の内容を markdown 本文に貼り付けない。
- 取得物に秘密情報が含まれうる場合は、共有前に capture 対象を見直すか、skipped に切り替える。
- エラーメッセージには機密そのものではなく、route / viewport / setting 名だけを載せる。

## Compliance Policy

- このリリースは個人データ処理や法令対応を新規に追加しない。
- capture 対象に PII が含まれるなら、運用前に別途 review を行う。
- 監査用に残すのは最小限のメタデータとファイルパスのみとする。

## Development Policy

- 既存の `qfai prototyping` surface を拡張し、別コマンドは作らない。
- Playwright は dynamic import に限定し、必須依存にしない。
- CLI フラグは config より優先する。
- capture / validation / report の責務は分け、巨大な command ファイルに押し込まない。
- 新規 helper / validator / report / docs / tests は同じ PR でまとめる。

## Validation Policy

- `captured` は image と HTML の両方が揃って初めて成立する。
- `skipped` は失敗ではなく、理由を伴う退避状態として扱う。
- `failed` は部分失敗として残し、screen 全体を捨てない。
- 新しい structural check は error を基本とし、互換性を壊す変更だけを blocker にする。
- markdown-only の既存 pack は壊さない。

## Review Policy

- OQ register の `open` は 0 でなければ review に回さない。
- deferred は `13_Deferred.md` と完全一致させる。
- review roster は `.qfai/assistant/steering/review-roster.yml` の順序を固定で使う。
- `qfai validate --fail-on error --format github` は review cycle の前提とする。

## Work Orders Summary

| Step | Role (sub-agent) | Task title         | Input (refs)                               | Output (refs)  | Status (PASS/REVISE) |
| ---- | ---------------- | ------------------ | ------------------------------------------ | -------------- | -------------------- |
| 1    | worker           | Policy first draft | design memo, README 群, roster, rcp footer | `10_Policy.md` | PASS                 |
| 2    | orchestrator     | Policy integration | worker draft, review policy normalization  | `10_Policy.md` | PASS                 |

# 09_Constraints

Discussion pack: discussion-20260325144633348
Version context: QFAI v1.7.1 `Render Evidence Automation`
Last updated: 2026-03-25

## Technical Constraints

### TC-1: 新しいトップレベル CLI コマンドは禁止

v1.7.1 は既存の `qfai prototyping` を拡張するだけに留める。`qfai render` のような別コマンドは追加しない。

### TC-2: Playwright は optional

Playwright は dynamic import とし、未導入でも pack 生成と validation の流れを止めない。capture 不可時は skipped/failed で表現する。

### TC-3: render evidence は path-only

証跡の JSON に画像や HTML の実体を埋め込まない。ファイルパスと最小限のメタデータのみを保持する。

### TC-4: 後方互換を壊さない

markdown-only の critique / legacy pack は v1.7.1 でも動作し続ける。render evidence がないことを理由に既存 pack を不適合にしない。

### TC-5: TypeScript / 既存依存の制約

TypeScript 5.6 系互換を維持し、新しい runtime dependency は追加しない。

## Operational Constraints

### OC-1: same PR で code / docs / tests を出す

helper、validator、report、README、template、test は同じ PR で揃える。分割 PR は不可。

### OC-2: 生成物は evidence ディレクトリに出す

render evidence の保存先は `.qfai/evidence/prototyping/` を基準にする。別ディレクトリへ散らさない。

### OC-3: review gate は `qfai validate --fail-on error --format github`

discussion pack の review 前提はローカル検証の通過であり、validate の error は残さない。

## Security / Compliance Constraints

- この機能はローカル CLI で完結し、外部送信を前提にしない。
- capture 対象に秘密情報や個人情報が含まれる場合は、render evidence を共有用にそのまま使わず、必要なら route 単位で capture を止める。
- markdown には raw HTML 本文や画像バイナリを埋め込まない。

## Budget

- 追加コストはなし。
- Playwright を使う場合のみ、ローカル実行時間とディスク使用量が増える。

## Timeline

- v1.7.1 は v1.7.0 の設計基盤の上に載る。
- browser QA、visual diff、repair loop、外部 critique adapter は v1.7.4 以降へ分離する。
- v1.7.1 の判断は `/qfai-sdd` に進む前に確定しておく。

## Work Orders Summary

| Step | Role (sub-agent) | Task title              | Input (refs)                         | Output (refs)       | Status (PASS/REVISE) |
| ---- | ---------------- | ----------------------- | ------------------------------------ | ------------------- | -------------------- |
| 1    | worker           | Constraints first draft | design memo, README 群, roster       | `09_Constraints.md` | PASS                 |
| 2    | orchestrator     | Constraints integration | worker draft, discussion constraints | `09_Constraints.md` | PASS                 |

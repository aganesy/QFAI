# 10_Policy — 開発・レビューポリシー

---

## 開発ポリシー

### POL-DEV-01: 全4ワークストリームを単一 PR で完結させる

**方針**: WS-1（terminal state machine）・WS-2（canonical screen contract refs）・WS-3（iteration category refs strictness）・WS-4（semantic declaredRef）・WS-5（同期）のすべての変更を1つの PR に含める。

**理由**: 各 WS は相互依存しており（WS-1 の状態機械が WS-3 のバリデータと共有型を持つ等）、分割すると CI で partial failure が発生するリスクがある。

**例外**: なし。

---

### POL-DEV-02: バリデータ + runtime + テスト + docs の同時同期

**方針**: 1つのバリデーションルールを変更した場合、対応する runtime 実装・テスト（happy path + ネガティブフィクスチャ）・README を同一コミット（または同一 PR）で更新する。

**理由**: 実装と検証・ドキュメントが乖離すると、利用者が誤った使い方をするリスクがある。REQ-0008 の完了条件。

**チェックリスト**:
- [ ] バリデーターを変更した → 対応するテストを更新した
- [ ] runtime の出力フォーマットを変更した → バリデーターを更新した
- [ ] 型定義を変更した → `pnpm check-types` が通過する
- [ ] API 挙動を変更した → `README.md` を更新した

---

### POL-DEV-03: warning-only パスの禁止

**方針**: 新規のバリデーションルール・エラーハンドリングはすべて fail-closed で実装する。`console.warn`・`console.log` への silent fallback は禁止。

**理由**: NFR-0002（信頼性）。警告は見落とされ、無効なデータがシステムに流入するリスクがある。

**実施方法**: 制約違反は `throw new ValidationError(...)` または `return { ok: false, errors: [...] }` のいずれかのパターンを使用。どちらのパターンを使用するかは既存コードの慣例に従う。

---

### POL-DEV-04: 後方互換性の廃棄

**方針**: v1.7.15 は破壊的変更（breaking change）として扱う。以下は実施しない。
- レガシーフィクスチャの維持
- 互換エイリアス（旧関数名 → 新関数名の shim）
- マイグレーションスクリプト
- 旧挙動を維持する feature flag

**理由**: 設計書 rev10 の明示的な方針。互換レイヤーはコードの複雑度を増加させ、semantic closure を妨げる。

---

### POL-DEV-05: 型安全の徹底（TypeScript）

**方針**: `any` 型・`@ts-ignore`・`@ts-expect-error` の新規追加を禁止する。型アサーション（`as`）は型ガードによる narrowing で置き換えられる場合は使用禁止。

**理由**: NFR-0001（保守性）。型安全は semantic closure の基盤。

---

## レビューポリシー

### POL-REV-01: PR マージ前の必須チェック

**方針**: 以下のすべてが GREEN であることを確認してからマージする。

| チェック | コマンド |
|---|---|
| フォーマット | `pnpm format:check` |
| Lint | `pnpm lint` |
| 型チェック | `pnpm check-types` |
| テスト | `pnpm test` |
| バリデーション通過 | `qfai validate`（production path） |

---

### POL-REV-02: レビュアールーティング

**必須レビュアー**:
- completion-reviewer: DoD 達成確認
- requirements-reviewer: REQ トレーサビリティ確認

**条件付きレビュアー**:
- architecture-reviewer: WS-1〜WS-4 がコアアーキテクチャに影響するため必須

**非適用レビュアー**:
- product-surface-reviewer: non-UI パックのため不要

---

### POL-REV-03: OQ の解決前マージ禁止

**方針**: `Disposition=open` の OQ が残っている状態でのマージは禁止する。`deferred` の OQ は SDD フェーズへの defer 記録と gate の明示が必要。

**現在の状態**: OQ-0001〜OQ-0004 はすべて `resolved` または `deferred` であり、`open` は存在しない（11_OQ-Register.md 参照）。

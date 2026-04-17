# 10_Policy — 開発・品質ポリシー

---

## 開発ポリシー

### POL-DEV-01: 全変更を単一 PR で完結させる

**方針**: `refSemantics.ts`・`specCoverage.ts`・`panelScore.ts`・`measurement.ts`・`index.ts`・tests・README のすべての変更を1つの PR に含める。

**理由**: 各モジュールは相互依存している（`isSpecDeclarationRef()` の述語変更が `specCoverage.ts` と `measurement.ts` の両方に波及する等）。分割すると CI で partial failure が発生し、semantic closure が一時的に崩れるリスクがある。

**例外**: なし。

---

### POL-DEV-02: 実装順序の厳守

**方針**: 以下の順序で実装する。順序を入れ替えてはならない。

1. `refSemantics.ts` — 意味述語（`isSpecDeclarationRef()`）を最初に確定
2. `specCoverage.ts` — 確定した述語に基づいてスキャン対象を制限
3. `panelScore.ts` — `evidenceRefs` 厳格化・axes 非空検証
4. `measurement.ts` — category refs 厳格化・`validatePanelScore()` 呼び出し組み込み
5. `index.ts` — `runMeasurement` / `validatePanelScore` を public export から削除
6. tests — 現行 DTO に基づく完全書き直し
7. README — API 変更を反映

**理由**: 意味述語（predicate）が確定していない状態で runtime/helper を変更すると、型エラーと意味エラーが混在し原因追跡が困難になる。

---

### POL-DEV-03: fail-closed の徹底

**方針**: すべてのバリデーションルールは fail-closed で実装する。

- `console.warn` への silent fallback 禁止
- warning-only パス禁止
- 不正入力の auto-normalization 禁止
- 制約違反は `throw new ValidationError(...)` または `return { ok: false, errors: [...] }` のいずれかで返す（既存コードの慣例に従う）

**理由**: 設計書 rev11 の fail-closed 原則。警告は見落とされ、無効なデータがシステムに流入するリスクがある。

---

### POL-DEV-04: 後方互換性の完全廃棄

**方針**: rev11 は破壊的変更として扱う。以下は実施しない。

- 削除 API（`runMeasurement`・`validatePanelScore`）の互換エイリアス
- deep import パス（例: `packages/qfai/src/core/harness/measurement`）の維持
- 旧 DTO フィールドを受け付ける overload / fallback パス
- マイグレーションスクリプト・移行ガイド

**理由**: 設計書 rev11 の明示的な方針。互換レイヤーはコードの複雑度を増加させ、semantic closure を妨げる。

---

### POL-DEV-05: predicate consolidation — 単一 SSOT

**方針**: `isSpecDeclarationRef()` のロジックは `src/core/prototyping/refSemantics.ts` にのみ実装する。他のモジュールで同等の判定ロジックを重複実装することを禁止する。

**許可される形式**: `.qfai/specs/<specId>/01_Spec.md#L<正の整数>` のみ。`specId` は非空の文字列、行番号は 1 以上の整数。

**禁止される形式**:
- ベアファイルパス（`01_Spec.md` アンカーなし）
- discussion ref（`.qfai/discussion/...`）
- ディレクトリ ref
- `#L0` や負の行番号

**理由**: 複数箇所に判定ロジックが分散すると、述語の変更時に網羅的な修正が保証できなくなる。

---

### POL-DEV-06: テストは現行 DTO のみを表現する

**方針**: harness unit tests および integration tests は現行の DTO 型（`MeasurementInput`・`PanelScore` 等）のフィールドのみを使用する。以下は禁止する。

- 削除済みフィールド（`apiEndpoints`・`domLabelsFound` 等）を持つフィクスチャの維持
- `skip` / `todo` / `xit` でマークして stale テストを残すこと
- 旧フィクスチャの差分適用アダプタ

stale なテストは削除し、現行 DTO に基づいて完全に書き直す。

**理由**: stale フィクスチャはコントラクトの誤解を引き起こす。削除によってコードベースの実態を正確に反映させる。

---

## 品質ポリシー

### POL-QA-01: CI ゲートの必須通過

**方針**: PR マージ前に以下のすべてが GREEN であること。

| チェック | コマンド |
|---|---|
| フォーマット | `pnpm format:check` |
| Lint | `pnpm lint` |
| 型チェック | `pnpm check-types` |
| テスト | `pnpm test` |

一つでも RED のままでのマージは禁止。

---

### POL-QA-02: helper strictness — 内部コントラクトは production と同等

**方針**: `runMeasurement()` / `validatePanelScore()` は public API から削除されても、内部モジュールとして production path と同等の入力検証を実施する。

- internal だからといって validation を省略してはならない
- production path が拒否する入力は、helper も拒否する

**理由**: helper が loose であれば production path がバイパスされた経路で不正データが処理されるリスクがある。

---

### POL-QA-03: public surface の縮退を型で保証する

**方針**: `src/core/index.ts` の public export から `runMeasurement` / `validatePanelScore` を削除した後、`pnpm check-types` で export が存在しないことを確認する。型テストや import 文によるスモークテストを追加して surface 縮退を検証することを推奨する。

**理由**: export 削除は実装変更ではなく API 境界の変更であるため、型レベルの検証が必要。

---

## セキュリティポリシー

### POL-SEC-01: 機密情報のコミット禁止

**方針**: API キー・認証トークン・パスワード・秘密情報をソースコードまたはテストフィクスチャに含めることを禁止する。

---

## 運用ポリシー

### POL-OPS-01: README 同期義務

**方針**: rev11 で変更した API 挙動（public export 削除・strict 化されたバリデーション挙動）は `packages/qfai/README.md` に同一 PR 内で反映する。README の更新を後続 PR に先送りすることは禁止する。

**チェックリスト**:
- [ ] `runMeasurement` / `validatePanelScore` が public export から削除されたことを README に記載
- [ ] `isSpecDeclarationRef()` の許可形式を README に記載
- [ ] `specCoverage.ts` のスキャン制限（`01_Spec.md` のみ）を README に記載
- [ ] `validatePanelScore()` の evidenceRefs 非空制約を README に記載

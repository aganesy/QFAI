# 10 Plan

> **How-only.** What と Why は 01_Spec.md に記載。このファイルは実装順序、テスト戦略、リスク軽減の唯一の情報源である。

---

## 1. Implementation Steps

### Step 1: クリティークループプロセスの定義

クリティークループの実行手順を以下のように定義する：

```text
1. 初回レンダリング（prototype HTML 生成）
2. デスクトップ批評（≥1024px ビューポート）
   - layout / hierarchy / CTA visibility を評価
3. モバイル批評（≤480px ビューポート）
   - タッチターゲット / スクロール導線 / 折り返しレイアウトを評価
4. 判定
   - 両方 PASS → ループ完了
   - いずれか REVISE → 修正して Step 2 に戻る
5. エビデンス記録
```

### Step 2: 下流読取順序の実装

下流スキル（`/qfai-prototyping`、`/qfai-implement`）のプロンプトに以下の読取順序を明示する：

```text
入力読取順序（必須）:
1. Design Direction Pack (DDP) — visual thesis, content plan, interaction thesis, anti-goals
2. Design Token — color, typography, spacing
3. UI Contract — component structure, props, variants
4. HTML Mock — rendered reference implementation
5. Flow/Navigation — screen transition, CTA hierarchy, error/recovery
```

DDP が未定義の場合は処理を停止し、エラーメッセージを返す。

### Step 3: コードオンリーレビュー禁止ゲートの実装

レビュー提出時のチェックロジックに以下を追加：

- レンダリング結果（スクリーンショットまたは rendered HTML）の添付を検証
- 未添付の場合はレビュー拒否メッセージを返却
- プロンプト指示として明文化

### Step 4: 批評エビデンス記録テンプレートの定義

エビデンス記録の形式を以下のように定義する：

```markdown
## Critique Evidence

| Field          | Value                |
| -------------- | -------------------- |
| 批評日時       | YYYY-MM-DDTHH:MM:SS |
| 対象ビューポート | desktop / mobile   |
| 判定結果       | PASS / REVISE        |
| ループ回数     | N                    |
| 対象 artifact  | (artifact ref)       |

### 指摘事項

1. (指摘内容)
2. (指摘内容)

### 判定根拠

(判定の理由を記述)
```

### Step 5: プロンプトアセットの更新

以下のプロンプトアセットにクリティークループの指示を追加する：

- `/qfai-prototyping` のメインプロンプト
- `/qfai-implement` のメインプロンプト
- 下流スキル共通の入力読取順序指示

### Step 6: taskFidelity クリティークループ統合 (REQ-0016)

taskFidelity 評価をクリティークループの必須次元として追加する：

```text
taskFidelity 評価項目（必須）:
1. step_count: プライマリタスク完了に必要なクリック / タップ数（目標: ≤3）
2. cta_visibility: プライマリ CTA が初期ビューポート内に視認できること（above the fold）
3. four_state_check: 通常 / ローディング / エラー / 空 の 4 状態が設計されていること
```

- クリティーク記録テンプレートに `taskFidelity` セクションを追加
- 3 項目すべての評価結果（PASS / FAIL / N-A + 根拠）を記録必須とする
- いずれか 1 項目が FAIL の場合、クリティーク全体を REVISE とする
- **依存**: REQ-0016（taskFidelity 評価次元）

---

## 2. Test Strategy

### テスト対象

プロンプトベースのプロセス定義であるため、テストは主にプロセス遵守の検証となる。

### テストケース

| TC ID        | Title                                    | Level       | AC-Refs                | Key Assertions                                                     |
| ------------ | ---------------------------------------- | ----------- | ---------------------- | ------------------------------------------------------------------ |
| TC-0021-0001 | デスクトップ批評の実施確認               | integration | AC-0021-0001           | デスクトップ批評が実施され、評価項目が含まれている                 |
| TC-0021-0002 | モバイル批評の実施確認                   | integration | AC-0021-0002           | モバイル批評が実施され、評価項目が含まれている                     |
| TC-0021-0003 | コードオンリーレビュー拒否               | unit        | AC-0021-0003           | レンダリング結果なしの提出が拒否される                             |
| TC-0021-0004 | 下流読取順序の検証                       | integration | AC-0021-0004           | DDP→Token→Contract→Mock→Flow の順序で読み取られている             |
| TC-0021-0005 | DDP 未定義時の処理停止                   | unit        | AC-0021-0005           | DDP 未定義で処理が停止しエラーが返される                           |
| TC-0021-0006 | 批評エビデンスの記録内容検証             | integration | AC-0021-0006           | 必須項目（日時、ビューポート、判定、指摘事項）が記録されている     |
| TC-0021-0007 | エビデンスの再現可能性検証               | integration | AC-0021-0007           | 同一条件での再実行で結果の再現性が確認できる                       |
| TC-0021-0008 | 反復改善ループの完了条件検証             | integration | AC-0021-0008           | 両ビューポート PASS まで継続し、エビデンスが記録される             |
| TC-0021-0009 | taskFidelity 評価の記録検証              | integration | REQ-0016               | クリティーク記録に step_count / cta_visibility / four_state_check の 3 項目が記録されている |
| TC-0021-0010 | taskFidelity FAIL 時のクリティーク REVISE | unit        | REQ-0016               | taskFidelity の任意 1 項目 FAIL でクリティーク全体が REVISE となる |

### 検証方法

- プロンプトの静的検査：下流読取順序の指示が正しく含まれているか
- プロセス実行の手動検証：クリティークループが正しく機能するか
- エビデンス記録の検証：テンプレートに準拠した記録が生成されるか

---

## 3. Risk & Mitigation

| Risk                                          | Impact                                        | Likelihood | Mitigation                                                                                    |
| --------------------------------------------- | --------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| クリティークの主観性による判定ばらつき         | 同一 artifact で異なる判定が出る              | Medium     | rubric を明文化し、NFR-0007 の再現性要件で担保。Fidelity Scorecard（後続 spec）で定量化予定   |
| ループの無限反復                               | 改善が収束せずプロセスが停滞する              | Low        | 指摘事項を具体化し修正方針を明示。必要に応じてエスカレーション                                |
| DDP 未定義の検出漏れ                           | 設計意図なしに実装が進む                      | Medium     | 下流スキルの入力チェックを最初のステップとして実行                                            |
| モバイルビューポート批評の形骸化               | desktop 偏重で mobile 品質が低下する          | Medium     | mobile 専用の評価項目（タッチターゲット、スクロール導線）を必須化                              |
| taskFidelity 評価の主観性（手動評価）          | step_count / four_state_check の判定がレビュアー間でばらつく | Medium     | 各項目に明示的な評価基準（step_count: ≤3 クリック、four_state: 4 状態定義の存在確認）を記載し、rubric として運用する |

---

## 4. Dependencies

### Upstream

- **discussion-20260324054332396** — 承認済み。REQ-0007（下流読取順序）、REQ-0008（レンダークリティークループ）を提供。

### Downstream

- Fidelity Scorecard の詳細定義（後続 spec で対応予定）
- 自動 VRT ハードゲート（v1.6.6 に延期）

### Internal

- `/qfai-prototyping` プロンプトアセット — 読み取り・更新対象
- `/qfai-implement` プロンプトアセット — 読み取り・更新対象
- DDP テンプレート — 読み取り専用の参照ソース

---

## 5. Deliverables Checklist

### プロンプトアセット更新

- [ ] `/qfai-prototyping` メインプロンプトにクリティークループ指示を追加
- [ ] `/qfai-implement` メインプロンプトにクリティークループ指示を追加
- [ ] 下流スキル共通の入力読取順序指示を追加

### テンプレート・定義

- [ ] 批評エビデンス記録テンプレートの作成
- [ ] コードオンリーレビュー拒否メッセージの定義

### 検証

- [ ] 全 8 テストケースの実行・PASS 確認

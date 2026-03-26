# R12 Pattern-Doubler Review

- **Review Cycle**: 3
- **Pack**: `.qfai/discussion/discussion-20260315080059347/`
- **Reviewer**: R12 (pattern-doubler)
- **Date**: 2026-03-16

## Verdict: FAIL

## Rationale

### Current Counts

| Category                         | Count | Source File            |
| -------------------------------- | ----- | ---------------------- |
| US (User Story)                  | 10    | 03_Story-Workshop.md   |
| REQ (Functional Requirement)     | 25    | 06_REQ.md              |
| NFR (Non-Functional Requirement) | 12    | 07_NFR.md              |
| Example Seed tables              | 10    | 03_Story-Workshop.md   |
| Example Seed rows (total)        | 58    | 03_Story-Workshop.md   |
| AC / BR / TC / EX                | 0     | N/A (discussion phase) |

### Example Seeds Perspective Analysis

The 10 Example Seed tables cover 6 perspectives each: Happy path, Negative path, Edge/boundary, Permission/role, State transition, Idempotency/retry. However, 11 cells are marked "N/A", reducing effective coverage to **47 substantive seeds**.

### Missing Perspectives (demanding 2x coverage)

Current Example Seeds are uniform in structure (1 seed per perspective per US). To reach 2x (target: ~116 substantive seeds), the following missing perspectives and concrete additions are needed:

#### 1. Concurrency / Race Condition (missing entirely)

| US      | Proposed Seed                                                             | Rationale                       |
| ------- | ------------------------------------------------------------------------- | ------------------------------- |
| US-D001 | 2 人が同時に同じ Design Token YAML を編集し保存した場合のコンフリクト検出 | Token の並行編集は実運用で頻出  |
| US-D002 | 複数 mock を並行で validate した場合の結果混在防止                        | CI 環境での並列実行             |
| US-D003 | 2 人が同時に画面遷移図を変更した場合のマージ整合性                        | Git マージ時の Mermaid 構文破壊 |
| US-D007 | 上流 UI 定義が更新中に下流 skill が読み取りを開始した場合                 | 読み取り一貫性の保証            |
| US-D009 | 4 専門家が同時にリサーチ結果を書き込む際のファイルロック                  | 並行ワークフロー                |
| US-D010 | 統合レビュー実行中に専門家が成果物を更新した場合                          | スナップショット一貫性          |

#### 2. Data Volume / Scalability Boundary (edge/boundary の拡張)

| US      | Proposed Seed                                                       | Rationale                         |
| ------- | ------------------------------------------------------------------- | --------------------------------- |
| US-D001 | Token 定義が 1000 件超の場合のパース性能と可読性                    | 大規模プロジェクトでの Token 爆発 |
| US-D002 | 1 ファイルに 50 画面分の HTML mock が含まれる場合のレンダリング性能 | ファイルサイズ上限の定義が必要    |
| US-D003 | 画面数が 100 超の遷移図の Mermaid レンダリング                      | 大規模アプリでの視認性崩壊        |
| US-D004 | ベストプラクティス DB が 500 ルール超の場合のレビュー実行時間       | NFR-0006 (2s 制限) との整合       |
| US-D009 | 5 専門家が各自 50 件のリサーチ結果を出力した場合の統合負荷          | 統合レビューの実行可能性          |
| US-D010 | レビュー対象が 30 画面分の統合成果物の場合                          | レビュー粒度の定義不足            |

#### 3. Security / Injection (missing entirely)

| US      | Proposed Seed                                                    | Rationale                |
| ------- | ---------------------------------------------------------------- | ------------------------ |
| US-D001 | Design Token の値に `<script>` タグが含まれる場合の sanitization | XSS 防止                 |
| US-D002 | HTML mock 内に悪意ある JavaScript が含まれる場合の検出・無害化   | セキュリティレビュー観点 |
| US-D004 | アンチパターン DB のルール定義に YAML injection がある場合       | 設定ファイルの安全性     |
| US-D014 | UI 定義消費時にパス・トラバーサルが発生する場合                  | ファイル読み取りの安全性 |

#### 4. Backward Compatibility / Migration (missing for most US)

| US      | Proposed Seed                                                         | Rationale                      |
| ------- | --------------------------------------------------------------------- | ------------------------------ |
| US-D001 | Token YAML のスキーマバージョンアップ時の既存ファイルマイグレーション | NFR-0001 (後方互換性) の具体化 |
| US-D002 | HTML mock のテンプレートバージョン変更時の既存 mock 互換性            | テンプレート進化への対応       |
| US-D004 | ベストプラクティス DB のルール形式変更時の既存ルール互換性            | NFR-0003 との整合              |
| US-D007 | UI 定義消費プロトコルのバージョンアップ時の下流 skill 互換性          | プロトコル進化                 |
| US-D009 | リサーチプロトコル更新時の過去リサーチ結果との互換性                  | REQ-0023 との整合              |

#### 5. Error Recovery / Graceful Degradation (negative path の拡張)

| US      | Proposed Seed                                                        | Rationale                 |
| ------- | -------------------------------------------------------------------- | ------------------------- |
| US-D001 | Token YAML が構文不正（インデント崩れ）の場合のエラーメッセージ品質  | 開発者体験                |
| US-D003 | Mermaid 構文エラーがある場合のフォールバック表示                     | 部分表示 vs 全体失敗      |
| US-D005 | 自動チェック実行中にタイムアウトした場合の部分結果報告               | NFR-0006 超過時の振る舞い |
| US-D006 | プラットフォーム固有ルールの読み込み失敗時の共通ルールフォールバック | 段階的劣化                |
| US-D008 | Web 調査が失敗（ネットワーク不通）した場合のキャッシュ利用           | オフライン耐性            |
| US-D010 | 統合レビュー中に 1 専門家の成果物が欠落している場合の部分レビュー    | 部分評価可能性            |

#### 6. Localization / i18n (missing entirely)

| US      | Proposed Seed                                                   | Rationale                  |
| ------- | --------------------------------------------------------------- | -------------------------- |
| US-D001 | Design Token でフォントファミリに CJK フォントが含まれる場合    | 日本語プロジェクトでの実用 |
| US-D002 | HTML mock 内のテキストが RTL (右から左) 言語の場合のレイアウト  | 国際化対応                 |
| US-D003 | 画面遷移ラベルにマルチバイト文字が含まれる場合の Mermaid 互換性 | 日本語ラベルの表示         |

#### 7. Happy Path の多様化 (1 seed では不十分)

| US      | Proposed Seed                                                                                           | Rationale                        |
| ------- | ------------------------------------------------------------------------------------------------------- | -------------------------------- |
| US-D001 | component 層 Token が semantic を参照し、3 層チェーンが正しく解決される                                 | 現在は primitive → semantic のみ |
| US-D002 | ダイアログ/モーダル/ドロワーの mock が正しく表示される                                                  | 一覧・フォーム以外の画面パターン |
| US-D003 | 条件分岐（権限 + 状態）を含む遷移が正しく定義される                                                     | 複合条件の遷移                   |
| US-D005 | 自動チェック FAIL → 手動レビュー PASS（自動偽陽性のオーバーライド）                                     | FAIL 後の手動救済フロー          |
| US-D006 | Mobile + Web のクロスプラットフォームで両方のルールが合成適用される                                     | 複数プラットフォーム同時         |
| US-D009 | Design Expert が Token 定義、UX Expert がユーザビリティ評価を同一画面に対して実施し、両者の成果物が整合 | 専門家間協調の成功パターン       |

### Summary

| Perspective           | Current Seeds      | Proposed Additions | New Total |
| --------------------- | ------------------ | ------------------ | --------- |
| Happy path            | 10                 | 6                  | 16        |
| Negative path         | 10                 | 4 (recovery)       | 14        |
| Edge / boundary       | 10                 | 6 (volume)         | 16        |
| Permission / role     | 6 (4 N/A)          | 0                  | 6         |
| State transition      | 7 (3 N/A)          | 0                  | 7         |
| Idempotency / retry   | 6 (4 N/A)          | 0                  | 6         |
| Concurrency (NEW)     | 0                  | 6                  | 6         |
| Security (NEW)        | 0                  | 4                  | 4         |
| Backward compat (NEW) | 0                  | 5                  | 5         |
| Error recovery (NEW)  | 0                  | 6                  | 6         |
| i18n (NEW)            | 0                  | 3                  | 3         |
| **Total**             | **47 substantive** | **40**             | **89**    |

Current substantive seeds: 47. Target (2x): 94. Proposed additions bring total to 89, approaching 2x. With the 11 N/A entries reconsidered (some could be substantive), the target is reachable.

### Verdict Justification

**FAIL** -- The current 47 substantive Example Seeds fall short of the 2x target (94). Five critical perspectives are entirely absent: concurrency, security/injection, backward compatibility/migration, error recovery/graceful degradation, and i18n/localization. These are not exotic concerns; they directly map to existing REQs (REQ-0003 circular reference detection, REQ-0015 integrity checks, REQ-0016 backward compatibility) and NFRs (NFR-0001 backward compat, NFR-0006 performance, NFR-0010 reproducibility). The 40 concrete additions proposed above address these gaps.

# 02 User Stories

## US Catalog

- US-0025-0001: Design Audit を実行できる
- US-0025-0002: Slop Guardrails を実行できる
- US-0025-0003: Quality Profile で severity を制御できる
- US-0025-0004: Design Audit / Slop の有効/無効を切り替えられる
- US-0025-0005: Report で Design Audit / Slop findings を分離表示できる

## US-0025-0001: Design Audit を実行できる

- Parent: CAP-0025
- Source: discussion-20260326072322818, REQ-0025-0001, REQ-0025-0004, REQ-0025-0005, REQ-0025-0011, REQ-0025-0012
- Goal: QFAI ユーザーとして、`qfai validate` で UI-bearing artifact に対して design audit を実行したい。design token drift, CTA hierarchy weakness, state omission などの構造的不備を静的に検知できるようにするため。
- Non-goals: render/browser QA、自動修正
- Notes: 7 dimension (tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity) の audit findings を出力。各 finding に stable rule ID (QFAI-AUD-XXX) を付与

### Example Seeds

| Perspective         | Example                                                                       | Status                                  |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Happy path          | UI-bearing pack で全 dimension PASS → finding なし                            | seed                                    |
| Negative path       | primary CTA 未定義の anchor screen → QFAI-AUD-001 error                      | seed                                    |
| Edge / boundary     | design tokens 存在するが contracts で raw 値が 5 個ちょうど → threshold 判定  | seed                                    |
| Permission / role   | N/A — CLI ツールでロール区別なし                                              | seed (skipped: CLI tool has no role distinction) |
| State transition    | N/A — stateless validator                                                     | seed (skipped: stateless single-run)    |
| Idempotency / retry | 同一 pack で validate を 2 回実行 → 同一結果                                 | seed                                    |

## US-0025-0002: Slop Guardrails を実行できる

- Parent: CAP-0025
- Source: discussion-20260326072322818, REQ-0025-0002, REQ-0025-0003, REQ-0025-0004, REQ-0025-0013
- Goal: QFAI ユーザーとして、AI 生成 UI の再現性のある低品質パターン（slop）を検知したい。generic AI SaaS shell, token bypass, CTA inflation などの問題を早期に発見できるようにするため。
- Non-goals: 主観的な美的判断、external AI critique
- Notes: SLP-01〜SLP-06 カテゴリに基づく slop findings を出力。designSlopPatterns.json からルール定義をロード

### Example Seeds

| Perspective         | Example                                                                         | Status                  |
| ------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| Happy path          | slop パターンなし → finding なし                                                | seed                    |
| Negative path       | generic centered hero pattern → QFAI-SLP-001 warning                           | seed                    |
| Edge / boundary     | anti-goal に明示的に hero 記載あり → slop 検知しない（intentional）              | seed                    |
| Permission / role   | N/A                                                                             | seed (skipped: CLI tool) |
| State transition    | N/A                                                                             | seed (skipped: stateless) |
| Idempotency / retry | 同一 pack で validate 2 回実行 → 同一結果                                      | seed                    |

## US-0025-0003: Quality Profile で severity を制御できる

- Parent: CAP-0025
- Source: discussion-20260326072322818, REQ-0025-0008
- Goal: QFAI ユーザーとして、quality profile (default/high/strict) に応じて rule tier の severity を制御したい。プロジェクト段階に応じて advisory と blocking を切り替えられるようにするため。
- Non-goals: 個別ルール単位の severity override
- Notes: Tier 1 は全プロファイルで error。Tier 2 は default/high で warning, strict で error。Tier 3 は default で category-based info/warning, high で warning, strict で warning

### Example Seeds

| Perspective         | Example                                                                  | Status           |
| ------------------- | ------------------------------------------------------------------------ | ---------------- |
| Happy path          | default profile で Tier 2 rule → warning として出力                      | seed             |
| Negative path       | strict profile で Tier 2 rule → error として出力、validate が fail-on error で失敗 | seed             |
| Edge / boundary     | config で qualityProfile 未指定 → default にフォールバック               | seed             |
| Permission / role   | N/A                                                                      | seed (skipped)   |
| State transition    | N/A                                                                      | seed (skipped)   |
| Idempotency / retry | profile 変更なしで再実行 → 同一 severity                                | seed             |

## US-0025-0004: Design Audit / Slop の有効/無効を切り替えられる

- Parent: CAP-0025
- Source: discussion-20260326072322818, REQ-0025-0007, REQ-0025-0010
- Goal: QFAI ユーザーとして、config で audit.enabled や slopDetection を false にできるようにしたい。特定プロジェクトや段階で不要な検知を無効化できるようにするため。
- Non-goals: 個別ルール単位の無効化
- Notes: audit.enabled: false → v1.7.2 全バリデータ無効。slopDetection: false → slop のみ無効。config 省略時はデフォルト有効

### Example Seeds

| Perspective         | Example                                                            | Status           |
| ------------------- | ------------------------------------------------------------------ | ---------------- |
| Happy path          | audit.enabled: true, slopDetection: true → 全検知                 | seed             |
| Negative path       | audit.enabled: false → design audit/slop 一切なし                 | seed             |
| Edge / boundary     | audit.enabled: true, slopDetection: false → audit のみ、slop なし | seed             |
| Permission / role   | N/A                                                                | seed (skipped)   |
| State transition    | N/A                                                                | seed (skipped)   |
| Idempotency / retry | config 変更なしで再実行 → 同一動作                                | seed             |

## US-0025-0005: Report で Design Audit / Slop findings を分離表示できる

- Parent: CAP-0025
- Source: discussion-20260326072322818, REQ-0025-0009
- Goal: QFAI ユーザーとして、report で design audit findings と slop guardrails findings が分離されてグループ表示されるようにしたい。問題の種類を素早く把握し、優先度付けできるようにするため。
- Non-goals: findings のフィルタリング機能
- Notes: report に "Design Audit Findings" と "Slop Guardrails Findings" の 2 セクション。各 finding に rule ID, why, evidence, guidance を含む

### Example Seeds

| Perspective         | Example                                                              | Status           |
| ------------------- | -------------------------------------------------------------------- | ---------------- |
| Happy path          | audit + slop findings あり → 2 セクション表示                       | seed             |
| Negative path       | findings ゼロ → セクション非表示または empty 表記                    | seed             |
| Edge / boundary     | audit findings のみ、slop なし → audit セクションのみ表示            | seed             |
| Permission / role   | N/A                                                                  | seed (skipped)   |
| State transition    | N/A                                                                  | seed (skipped)   |
| Idempotency / retry | 同一入力 → 同一 report 構造                                         | seed             |

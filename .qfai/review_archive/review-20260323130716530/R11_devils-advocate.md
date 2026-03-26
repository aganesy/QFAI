# R11 Devil's Advocate

## Verdict: PASS

## Scope

- `.qfai/specs/spec-0018/01_Spec.md` through `10_Plan.md` (10 files)
- `.qfai/specs/_policies/08_Decisions.md` (DR-0027〜DR-0030)
- `.qfai/specs/spec-0018/09_delta.md`

## Checks

- **Spec completeness**: 全 10 ドキュメントが揃い、US→AC→BR→EX→TC のトレーサビリティが完備。
- **ID consistency**: US=3, AC=9, BR=6, EX=8, TC=12 が delta と整合。
- **Decision coverage**: DR-0027〜DR-0030 が全て Adopted に記録、Rejected に DO NOT ガードレール付き。
- **Scope boundary**: In/Out of Scope が明確に分離。5 エージェント除外理由が DR-0028 に根拠あり。
- **Plan actionability**: Step 1-6 が順序付き、分類表・テンプレート・検証コマンドまで記載。

## Challenges

### Challenge 1: 「39」は本当に正しい数か？なぜ 44 でも 34 でもないのか？

**前提への疑問**: カノニカルソースに 44 エージェントが存在する中、「Claude/Copilot にリンク済みの 39」というスコープ基準は恣意的ではないか。5 エージェントが未リンクなのは意図的設計か、単なる未着手か。

**反論**: DR-0028 が「プラットフォーム間一貫性」を根拠にしているが、そもそも Claude/Copilot 側の 39 が正しいという前提を検証していない。もし Claude/Copilot 側にリンク漏れがあるなら、そのバグを Codex にも伝播させることになる。

**あるべき姿**: DR-0028 の decision に「Claude/Copilot 側のリンク数 39 が正しいことの検証済みエビデンス」を明記すべき。具体的には `ls -1 .claude/agents/ | wc -l` と `ls -1 .github/copilot/agents/ | wc -l` の実行結果を Evidence として delta に記録する。

**判定**: **PASS（advisory）**。DR-0028 の Rationale は「未リンク 5 は別途追加判断」と明示しており、意図的なスコープ制限。ただしエビデンス記録は推奨。

---

### Challenge 2: 静的配置（DR-0030）は技術的負債の先送りではないか？

**前提への疑問**: 39 ファイル × 手動メンテナンスは、カノニカル MD が更新されるたびに Codex TOML との乖離（content drift）を生む。Plan のリスク表でも「Content drift from canonical MD」を Medium と評価しているのに、対策が「TC-0018-0003 validates section presence」のみ。セクション存在確認では内容の乖離は検出できない。

**反論**: init.ts 自動生成を Rejected にした理由は「複雑度が高い」だが、39 ファイルの手動同期の運用コストと比較した定量評価がない。半年後に 10 エージェントの instructions が更新されたとき、3 プラットフォーム × 10 = 30 ファイルを手動更新する運用コストは許容範囲か？

**あるべき姿**: 以下のいずれかを Plan に追加すべき:

1. **短期**: TC-0018-0003 を強化し、セクション内容のハッシュ比較（正規化後の MD5/SHA256）で drift を CI で検出
2. **中期**: `pnpm qfai sync-agents` コマンドを別 spec で計画し、ロードマップに明記
3. **長期**: init.ts 自動生成の再評価時期を delta に記録（例: v1.7.0 で再検討）

**判定**: **PASS（advisory）**。v1.6.4 スコープとして静的配置は妥当。ただし drift 検出の強化と自動化ロードマップの明記を推奨。

---

### Challenge 3: sandbox_mode の 25/14 分類は本当に正しいか？境界ケースの根拠が薄い

**前提への疑問**: EX-0018-0006 で orchestrator が「実装系」に分類されている理由は「Work Orders 作成等の書き込みが必要」だが、同じ論理で `planner` や `coverage-planner` も書き込みが必要（計画ファイルの作成）。一方、`facilitator` はレビュー系に分類されているが、議論のまとめや合意形成結果のファイル出力が必要な場合がある。

**反論**: 分類基準が「役割ベース」とされているが、実際には「書き込みが必要かどうか」という機能ベースの判断が混在している。明確な分類フローチャートが存在しない。

**あるべき姿**: BR-0018-0002 に分類判定フローを追加:

```
IF agent の Deliverables にファイル作成/変更が含まれる → 実装系（sandbox_mode 省略）
ELSE → レビュー/分析系（sandbox_mode = "read-only"）
```

さらに、14 実装系 / 25 レビュー系の各エージェントについて、分類根拠を 1 行ずつ 10_Plan.md の分類表に追記する。

**判定**: **PASS（advisory）**。現在の分類自体は Codex の公式パターンに沿っており動作上の問題はない。ただし分類根拠の明文化は将来のメンテナンス性に重要。

---

### Challenge 4: 負例（EX-0018-0007, EX-0018-0008）は十分か？

**前提への疑問**: 負例が 2 つしかない。「存在しないエージェント参照」と「TOML 構文エラー」のみ。以下の負例が欠落している:

- name フィールドとファイル名が不一致の場合
- sandbox_mode に "read-only" 以外の無効値が設定された場合（e.g., "readonly", "write"）
- developer_instructions が空文字列の場合
- 必須フィールドが欠落した TOML の場合

**反論**: 負例の目的は「何が起きてはいけないか」を明示すること。現在の 2 つでは仕様の境界が十分にカバーされていない。

**あるべき姿**: 以下の負例を追加候補として記録:

- EX-0018-0009（候補）: `name` と filename の不一致 → TC-0018-0009 で検出
- EX-0018-0010（候補）: `sandbox_mode = "readonly"`（typo）→ 無効値の検出
- EX-0018-0011（候補）: `developer_instructions = ""`（空文字列）→ AC-0018-0002 で検出

**判定**: **PASS（advisory）**。既存 TC が網羅しているため仕様として不完全ではないが、負例の充実は仕様の可読性と将来のテスト拡張に有益。

---

### Challenge 5: config.toml の max_threads = 1 は制約的すぎないか？

**前提への疑問**: `max_threads = 1` は「予測可能な実行」を理由としているが、Codex の価値は並列実行にある。シングルスレッドでは Codex を使う意味が薄れる。

**反論**: max_threads は「デフォルト値」であり、ユーザーが変更可能。しかし、spec で 1 をデフォルトにする判断根拠が BR-0018-0006 の「予測可能なエージェント動作を保証」のみで、パフォーマンスとのトレードオフ分析がない。

**あるべき姿**: 10_Plan.md の Step 2 に以下の注記を追加: 「`max_threads = 1` は保守的なデフォルト。プロジェクトの規模やタスク種別に応じて 2-4 への変更を推奨。将来的にエージェント種別ごとの並列度設定を検討。」

**判定**: **PASS（advisory）**。保守的なデフォルトは初期リリースとして合理的。ユーザーが変更可能であること、変更のガイダンスがあればなお良い。

---

## Issues

- なし（全 Challenge が PASS 判定）

## Notes

- 5 つの Challenge はすべて advisory レベル。仕様としての完成度は高く、明確な欠陥は発見されなかった。
- 最も影響度が高い改善提案は **Challenge 2（content drift 対策）** と **Challenge 3（分類根拠の明文化）**。
- FAIL 判定なし → advisory demotion カウンタ: 0/3。

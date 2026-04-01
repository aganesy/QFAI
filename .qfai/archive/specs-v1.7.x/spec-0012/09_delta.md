# 09 Delta

> **注**: アーカイブ内の DELTA-ID は作成当時の命名規則に従っています。spec 番号をプレフィックスに含むフォーマット（例: `DELTA-0005-0001`）は後発の spec で導入されたもので、既存アーカイブの ID は遡及変更しない方針です。

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-15
- Primary: spec-0012 初回作成（全否定 + パターン倍増エージェント追加）
- Tags: review-roster, devils-advocate, pattern-doubler, v1.5.6
- Summary: spec-0012（devils-advocate / pattern-doubler の 2 新規レビューサブエージェント追加）のレイヤードスペック形式での初回作成

## Rationale

- QFAI v1.5.6 にて「全否定視点でのレビュー」と「パターン倍増レビュー」という 2 種の新規レビューサブエージェントを追加する
- 両エージェントは同一の統合パターン（review-roster 登録 + SKILL.md 委任 + RCP フッター + ゲートルール）で追加される
- 同一リリース・同一ファイル群への変更であるため、単一ケイパビリティ CAP-0012 として一括管理する

## Candidates Considered

1. 全否定 + パターン倍増を単一 CAP (CAP-0012) として扱う
2. CAP-0012a（devils-advocate 専用）+ CAP-0012b（pattern-doubler 専用）に分割する
3. パターン倍増を SDD 専用スキルに限定する
4. 全否定の FAIL をブロッキングではなく参考意見のみにする
5. 新エージェントを既存レビュアー間に挿入する（例：6 番目に配置）

---

## Adopted

### DELTA-0001: 全否定 + パターン倍増を単一 CAP（CAP-0012）として扱う

- Adopted: 単一 CAP（CAP-0012）による統合管理
- Why: 両エージェントは「レビューフローへの新規エージェント追加」という同一目的・同一統合パターンを持ち、変更対象ファイル群も一致する。v1.5.6 の同一リリースに含まれるため、個別 CAP への分割は不要な管理オーバーヘッドを生む。DEC-0012-0001 参照。
- Evidence: `.qfai/specs/spec-0012/07_Decisions.md` の DEC-0012-0001、`discussion-20260315033313220/11_OQ-Register.md`

### DELTA-0002: 実行順序を既存 10 レビュアーの後に固定する（全否定 11 番目 → パターン倍増 12 番目）

- Adopted: 既存 10 名の後に devils-advocate（インデックス 10）・pattern-doubler（インデックス 11）を配置
- Why: NFR-0003（後方互換性）を厳守するため、既存 10 レビュアーの実行順序を不変に保つ。既存レビュアーによる基本品質チェック完了後に全否定を適用することで否定の精度が向上する。パターン倍増は最後に適用することで最終成果物に対して倍増指摘が機能する。OQ-0002 の解決策として採用。DEC-0012-0002 参照。
- Evidence: `.qfai/specs/spec-0012/07_Decisions.md` の DEC-0012-0002、`discussion-20260315033313220/12_OQ-Resolution-Log.md` の OQ-0002

### DELTA-0003: 全否定 3 回連続 FAIL でアドバイザリー降格

- Adopted: devils-advocate が同一成果物に対して 3 回連続 FAIL を返した場合、自動的にアドバイザリー（非ブロッキング）に降格する
- Why: NFR-0007（無限ループ防止）の実装手段として採用。全否定エージェントの性質上、永続的 FAIL によるレビューサイクル停止リスクがある。3 回という閾値は OQ-0001 の解決案として議論・合意されたもの。降格後は RCP に記録し透明性を確保する。
- Evidence: `discussion-20260315033313220/12_OQ-Resolution-Log.md` の OQ-0001、AC-0012-0005、BR-0012-0013

### DELTA-0004: 代替案提示義務を全レビュアー共通に拡張

- Adopted: POL-01（devils-advocate 専用の代替案提示義務）の適用範囲を全レビュアー（既存 10 名 + 新規 2 名）に拡張し、POL-08 として定義する
- Why: ユーザーが「各スキルの作業指示にて、レビュー依頼時は具体的な代替案を必ず提示することをレビュアーへの指示に明記すること」を要望した。否定のみのフィードバックは全レビュアーにおいて建設的でないため、代替案提示を共通義務とする。DEC-0012-0003 参照。
- Evidence: `review-roster.yml` の `feedback_policy`、`agent-selection.md` の `Feedback quality rule`、全 9 SKILL.md Reviewer Gate の「全レビュアー共通: 代替案提示義務」、AC-0012-0013、BR-0012-0014

---

## Rejected

### REJ-0001: パターン倍増を SDD 専用にする

- Candidate: pattern-doubler のスコープを qfai-sdd スキルのみに限定する
- Reason: ユーザーが全スキル共通（全 9 SKILL.md）への統合を選択した。パターン（US/AC/BR/EX/TC 等）は SDD 以外のスキルでも中心的な成果物であり、スコープ限定の技術的根拠がない。
- DO NOT: パターン倍増エージェント（pattern-doubler）のスコープを qfai-sdd スキルのみに限定してはならない。全 9 SKILL.md への委任ステップ追加は必須要件である。
- Temptation: qfai-tdd-red / qfai-tdd-green 等では「パターン」概念が薄く見えるため、SDD 専用に限定したくなる。しかしユーザーは全スキル横断の適用を明示的に選択しており、限定はスコープ縮小となる。

### REJ-0002: 全否定の FAIL からブロッキング力を除去する

- Candidate: devils-advocate の FAIL 判定を参考意見（非ブロッキング）のみとする
- Reason: ユーザーが「全否定エージェントのブロッキング力は既存レビュアーと同等」を要件として明示した（REQ-0004、NFR-0005）。ブロッキング力の除去は要件違反となる。
- DO NOT: 全否定エージェント（devils-advocate）の FAIL 判定からブロッキング力を除去してはならない。FAIL は既存 10 レビュアーと同じブロッキングメカニズムで動作しなければならない（AC-0012-0003）。
- Temptation: 全否定エージェントの性質上、頻繁な FAIL が予想される。繰り返しブロッキングによる開発速度低下を懸念してブロッキングを緩和したくなる。しかしアドバイザリー降格機構（DELTA-0003）が無限ループを防止するため、ブロッキング力の除去は不要である。

### REJ-0003: 新エージェントを既存レビュアー間に挿入する

- Candidate: devils-advocate を既存 10 名の途中（例：先頭または 6 番目）に配置する
- Reason: NFR-0003（後方互換性）が既存 10 レビュアーの動作・順序・判定ロジックへの変更を禁止している。途中挿入は既存レビュアーのインデックスをシフトさせ、参照整合性の破壊リスクがある。
- DO NOT: 新エージェント（devils-advocate / pattern-doubler）を既存 10 名の実行順序の途中に挿入してはならない。必ず既存 10 名の後（インデックス 10・11）に配置しなければならない（AC-0012-0011、DEC-0012-0002）。
- Temptation: 全否定を早期に適用することで、手戻りコストを削減できると考えたくなる。しかし早期配置は基本品質チェック前に否定が起動し修正サイクルが増加するリスクがあり、DEC-0012-0002 の棄却理由として記録済みである。

---

## Impact

- Affects: `.qfai/assistant/steering/review-roster.yml`、`.qfai/assistant/instructions/agent-selection.md`、全 9 SKILL.md、全 9 `rcp_footer.md`、`.qfai/assistant/steering/review-gate.rules.yml`
- Validation: `qfai validate` でスキーマエラー 0 件。既存 10 レビュアーのスナップショット比較で差分なし（TC-0012-0022, TC-0012-0023）。

## Follow-ups

- DELTA-0004 の実装完了（review-roster.yml feedback_policy + agent-selection.md Feedback quality rule + 全 9 SKILL.md Reviewer Gate 更新済み）
- Owner: 実装担当者
- Due: v1.5.6 リリース前

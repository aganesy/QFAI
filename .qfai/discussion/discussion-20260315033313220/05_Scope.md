# 05_Scope

## スコープ内 (In Scope)

1. **全否定エージェント (Devil's Advocate Agent) の定義と登録**
   - `review-roster.yml` に11番目のレビュアーとして追加（`can_be_na: false`、ブロッキング力あり）
   - `agent-selection.md` にデリゲーション役割として追加
   - 全9 QFAI skill の SKILL.md にレビュー委任ステップを追加

2. **パターン倍増エージェント (Pattern Doubler Agent) の定義と登録**
   - `review-roster.yml` に12番目のレビュアーとして追加（ブロッキング力あり）
   - `agent-selection.md` にデリゲーション役割として追加
   - 全9 QFAI skill の SKILL.md にレビュー委任ステップを追加

3. **影響を受けるskill一覧**
   - qfai-discussion
   - qfai-sdd
   - qfai-configure
   - qfai-prototyping
   - qfai-atdd
   - qfai-tdd-red
   - qfai-tdd-green
   - qfai-tdd-refactor
   - qfai-verify

4. **RCPフッターの更新**
   - 各skillのrcp_footer.mdに新レビュアーの記載を追加

5. **review-gate.rules.yml の更新**
   - 新レビュアーのゲートルールを追加

## スコープ外 (Out of Scope)

- 全否定エージェント・パターン倍増エージェントの「AI実装」（プロンプトエンジニアリングの実装コード）
- pr-fix / pr-merge skill への適用（QFAI固有skillではないため）
- CLIコマンド (`qfai` パッケージ) 本体のコード変更
- テストコード（`packages/qfai/test/**`）の変更（ATDD/TDD phaseで対応）
- 既存レビュアーの役割変更

## 成功基準

1. `review-roster.yml` に全否定エージェントとパターン倍増エージェントが定義されている
2. `agent-selection.md` に両エージェントの役割定義がある
3. 全9 QFAI skill の SKILL.md が両エージェントをレビュー委任に含んでいる
4. 両エージェントのFAILがブロッキング力を持つ（即修正・ロースター先頭再実行）
5. `qfai validate --fail-on error` がパスする

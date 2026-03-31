# 02 User Stories

## US Catalog

- US-0007-0001: Skill カタログ定義 - 9 つの Skill の名前・目的・引数・ロール・必須出力を定義
- US-0007-0002: Skill 依存関係定義 - Skill 間の依存関係と実行順序制約を定義
- US-0007-0003: Skill 完了契約定義 - 各 Skill の Completion Contract を定義
- US-0007-0004: Skill Evidence 要件定義 - 各 Skill が生成すべき Evidence 要件を定義
- US-0007-0005: AskUserQuestion Protocol 定義 - 全 9 スキルに統一的な AskUserQuestion Protocol セクションを定義

## US-0007-0001: Skill カタログ定義

- Parent: CAP-0007
- Goal: 9 つの Skill（qfai-discussion, qfai-sdd, qfai-atdd, qfai-configure, qfai-prototyping, qfai-verify, qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor）について、名前・目的・引数ヒント・ロール・必須出力をフレームワーク設計仕様として定義する
- Non-goals: SKILL.md の逐語的複製（SSOT は SKILL.md 自体）
- Notes: REQ-0001 準拠。各 Skill の設計意図と契約を文書化する

## US-0007-0002: Skill 依存関係定義

- Parent: CAP-0007
- Goal: Skill 間の依存関係（configure -.-> discussion → sdd → prototyping(optional) → atdd → verify）と実行順序制約を定義する
- Non-goals: ランタイムでの依存関係自動解決メカニズムの実装
- Notes: REQ-0002 準拠。循環依存の禁止、deprecated skill（tdd-red/green/refactor）の位置づけを明記する

## US-0007-0003: Skill 完了契約定義

- Parent: CAP-0007
- Goal: 各 Skill の Completion Contract（必須成果物一覧、OQ exit 条件、Gate pass 条件）を定義する
- Non-goals: 完了判定の自動化実装
- Notes: REQ-0003 準拠。各 Skill がどの成果物を必須とし、どの条件で完了とみなすかを明確にする

## US-0007-0004: Skill Evidence 要件定義

- Parent: CAP-0007
- Goal: 各 Skill が生成すべき Evidence のパス命名規則（.qfai/evidence/<skill>-<id>.md）、必須セクション、gitignore ポリシーを定義する
- Non-goals: Evidence テンプレートの具体的実装
- Notes: REQ-0004 準拠。Evidence の構造的一貫性を保証する設計契約を定める

## US-0007-0005: AskUserQuestion Protocol 定義

- Parent: CAP-0007
- Goal: 全 9 SSOT スキル（qfai-discussion, qfai-sdd, qfai-atdd, qfai-configure, qfai-prototyping, qfai-verify, qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor）の SKILL.md に統一的な AskUserQuestion Protocol セクションを追加し、AI エージェントがユーザー質問を行う際の優先手段・構造・フォールバック動作を定義する
- Non-goals: AskUserQuestion ツール自体の実装仕様定義（ツールはエージェント環境依存）
- Notes: REQ-0005 準拠。discussion-20260312140531704 で承認された REQ-0001〜REQ-0006 に基づく。配置場所は DRIFT-PROTOCOL 直後に統一する

# 08 Decisions

## Decisions

12 items — discussion-20260312143000000（symlink アーキテクチャ移行）、discussion-20260313143000000（SDP）、および discussion-20260314053646704（AskUserQuestion MUST 化）で解決された OQ に基づく。

### DR-0012: AskUserQuestion MUST 化（discussion-20260314053646704）

- Decision: AskUserQuestion の使用レベルを SHOULD から MUST に昇格し、constitution.md Article X として非交渉条項化する
- Context: 全 9 QFAI スキルに AskUserQuestion Protocol が存在するが、SHOULD レベルのためエージェントが無視してプレーンテキストで質問するケースが多発
- Rationale: constitution.md に Article X として追加することで、コンパクト実行後も P1 再読み込みで規則が保持される。communication.md および全 SKILL.md も同時に MUST 表現に統一
- Rejected-A: SKILL.md のみ修正し constitution は変更しない（コンパクト後に規則が消失するリスク）
  - DO NOT: AskUserQuestion ルールを constitution 外に留めない。Temptation: SKILL.md だけで十分と思う
- Rejected-B: Article VI（Clarification budget）を削除して Article X に統合（Article VI は質問数制限、Article X は質問方法であり独立した関心事）
  - DO NOT: Article VI を削除しない。Temptation: 質問に関する条項を一本化したい
- Rejected-C: --auto フラグを MUST ルールの例外として定義（--auto は質問不要モードであり例外ではない）
  - DO NOT: --auto を MUST ルールの例外にしない。Temptation: --auto 時は AskUserQuestion 不要だから例外にしたい

### DR-0012-001: 全否定エージェントのブロッキング権限とアドバイザリー降格

- Decision: 全否定エージェント（devils-advocate）にブロッキング FAIL 権限を付与し、3 回連続 FAIL でアドバイザリー降格する
- Context: 全否定エージェントが無制限にブロッキング FAIL を発行し続けると、永遠にスキルが完了しない無限ループが発生する可能性がある
- Rationale: ブロッキング FAIL 権限により厳格なレビューを実現しつつ、3 回連続 FAIL でアドバイザリー降格することで無限ループを防止する。3 回の根拠はレビュー品質担保と現実的な収束のバランス
- Rejected-A: 全否定エージェントに FAIL 権限を与えない（レビュー効果が薄れる）
  - DO NOT: 全否定エージェントを参考意見専用にしない。Temptation: ブロックされるより通過させたい
- Rejected-B: 無制限にブロッキング FAIL を許可する（無限ループのリスクが許容できない）
  - DO NOT: 連続 FAIL の上限を設けないまま全否定エージェントを運用しない。Temptation: 品質を最大化したい

### DR-0012-002: パターン倍増エージェントの全 skill 共通化

- Decision: パターン倍増エージェント（pattern-doubler）を全 skill 共通にする（SDD 専用ではない）
- Context: 当初 SDD スキルの成果物拡充を目的として設計されたが、ID 付き項目の倍増は全 skill で品質向上に寄与する
- Rationale: 全 skill 共通化によりパターン数の底上げが全工程で機能する。ID 付き項目が存在しない成果物では N/A として無害に通過できる
- Rejected: SDD 専用のままにする（他 skill での品質向上機会を逃す）
  - DO NOT: パターン倍増エージェントを特定 skill に限定しない。Temptation: SDD 以外では不要と思う

### DR-0012-003: 新エージェントの実行順序

- Decision: 新エージェント（R11 全否定、R12 パターン倍増）の実行順序を既存 10 名（R01〜R10）の後にする
- Context: 既存レビュアーによる基本品質チェックが完了した後に、追加の特殊レビューを実施するのが合理的
- Rationale: 既存レビュアーが FAIL を出している状態で特殊レビューを実施しても意味がない。基本品質が確保された後に全否定・倍増チェックを行う方が効率的
- Rejected: 全否定エージェントを先頭または中間に配置する（基本品質未確保の成果物に対して特殊レビューを行う非効率が生じる）
  - DO NOT: 新エージェントを既存 R01〜R10 より前に配置しない。Temptation: 早期にブロックして修正コストを下げたい

### DR-0001: GitHub agent 命名規約の不一致（OQ-0001）

- Decision: symlink 名とターゲット名の不一致を許容する
- Context: `.github/agents/<name>.agent.md` → `.qfai/assistant/agents/<name>.md`（名前が異なる）
- Rationale: Git symlink はリンク名とターゲット名が異なることを許容する。GitHub Copilot が `.agent.md` サフィックスを要求するが、カノニカルファイルの改名は影響範囲が大きい
- Rejected: canonical を `.agent.md` に改名（影響範囲大、不要）

### DR-0002: copilot-instructions.md の参照先更新（OQ-0002）

- Decision: `.github/copilot-instructions.md` 内の `.github/prompts/` 参照を `.github/skills/` に更新する
- Context: `.github/prompts/` 廃止に伴い参照先が無効になる
- Rationale: Copilot 統合のルール記述は引き続き必要であり、参照先のみ更新すれば十分
- Rejected: copilot-instructions.md の削除（ルール記述が失われる）

### DR-0003: 非 QFAI skill の扱い（OQ-0003）

- Decision: pr-fix/pr-merge は symlink 化の対象外とする
- Context: `.qfai/assistant/skills/` に存在しないスキルは QFAI 管理対象外
- Rationale: QFAI 外のスキルは QFAI の init で管理すべきではない
- Rejected: `.qfai/assistant/skills/` に移動して symlink 化（QFAI 管理範囲の過度な拡大）

### DR-0004: Windows symlink 失敗時の挙動（OQ-0004）

- Decision: エラーメッセージ（Developer Mode 有効化の案内）を表示し、処理を続行しない
- Context: Windows で Developer Mode OFF の場合 symlink 作成に失敗する
- Rationale: 中途半端な状態を防止する。ユーザー確認済み
- Rejected-A: 汎用エラーメッセージのみ表示して中断（Developer Mode 有効化手順などのアクション可能なガイダンスを含まないため、ユーザーが自力で原因を特定しにくい）
- Rejected-B: junction + テキストファイル fallback（二重互換性レイヤーが複雑性を増す）

### DR-0005: README.md ファイルの扱い（OQ-0005）

- Decision: 各ツールディレクトリの README.md は symlink 化せず通常ファイルとして維持する
- Context: README.md はディレクトリの説明であり、カノニカルスキル/エージェントとは無関係
- Rationale: README.md はツール固有の説明を含むため、共通化の利点がない
- Rejected: README.md も symlink 化（ツール固有の説明が失われる）

### DR-0006: SDP 差分検出の基点方式（OQ-0001）

- Decision: 複合判定（git diff + timestamp + delta.md パースの3ソース union）を採用
- Context: 差分検出の信頼性を最大化する必要がある
- Rationale: 単一ソースでは検出漏れリスクがあるため、3つのソースの union で漏れ防止
- Rejected-A: git diff のみ（git 不可環境での検出漏れリスク）
  - DO NOT: 差分検出を単一ソースに依存しない。Temptation: git diff だけで十分だと思う
- Rejected-B: timestamp のみ（mtime 精度に依存し信頼性が低い）
- Rejected-C: delta.md パースのみ（記載漏れリスクがあり不完全）

### DR-0007: /qfai-verify のインクリメンタル非対応（OQ-0002）

- Decision: /qfai-verify は常にフルスキャンを維持
- Context: 品質ゲートは全体の一貫性を保証する必要がある
- Rationale: インクリメンタルでは見落としリスクがあり品質ゲートとして不適切
- Rejected: verify もインクリメンタル対応（品質ゲートの見落としリスクが許容できない）
  - DO NOT: verify をインクリメンタルにしない。Temptation: 一貫性のため全スキルをインクリメンタル化したい

### DR-0008: SDP 実装レイヤーの範囲（OQ-0003）

- Decision: SKILL.md のみの改修とし、TypeScript コード変更は行わない
- Context: 迅速な導入を優先
- Rationale: v1.5.5 タイムラインに収めるため。TS 変更はビルド・テスト影響が大きい
- Rejected: SKILL.md + TypeScript（ビルド・テスト影響が大きく v1.5.5 に収まらない）
  - DO NOT: SDP v1 で TypeScript を変更しない。Temptation: TS でロジックを実装したい

### DR-0009: SDP 着手順序（OQ-0004）

- Decision: 共通 Protocol を先に定義し、各スキルに一括適用
- Context: 一貫性の確保が重要
- Rationale: 共通 Protocol 先行の方が一貫性を確保しやすい
- Rejected-A: /qfai-atdd から着手（個別先行は一貫性リスク）
- Rejected-B: /qfai-prototyping から着手（同上）

### DR-0010: stale 判定のヒューリスティック（OQ-0005）

- Decision: delta.md の Primary が Behavior/Initial の場合のみ stale とし、Structural は除外
- Context: コメントのみの変更で stale 判定するのは過剰
- Rationale: 振る舞い変更のみが stale の根拠。構造的変更（改名等）はテスト影響なし
- Rejected: ファイル変更があれば常に stale（コメント変更等で過剰な再生成が発生）
  - DO NOT: Structural 変更で stale 判定しない。Temptation: 安全側に倒して全変更を stale にしたい

### DR-0011: \_policies 変更時の影響範囲（OQ-0006）

- Decision: 保守的に全 spec を affected_specs に追加し、ユーザー確認で絞り込み
- Context: policy 変更の影響を正確に判定するのは困難
- Rationale: false positive（過大評価）は許容、漏れは不許容
- Rejected: Escalation Hook の参照関係を解析して影響 spec を特定（解析精度が不十分）
  - DO NOT: policy 変更の影響範囲を自動で絞り込まない。Temptation: 賢く影響範囲を限定したい

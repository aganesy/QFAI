# 08 Decisions

## Decisions

21 items — discussion-20260312143000000（symlink アーキテクチャ移行）、discussion-20260313143000000（SDP）、discussion-20260314053646704（AskUserQuestion MUST 化）、discussion-20260317102145554（実装フェーズ統一）、および discussion-20260322091309602（Copilot レビューインストラクション配布）で解決された OQ に基づく。

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

### DR-0013: 旧TDDスキルの完全廃止（OQ-0001）

- Decision: 旧3スキル（qfai-tdd-red/green/refactor）を非推奨ではなく完全削除する
- Context: 非推奨にすると半移行状態が継続し混乱を招く
- Rationale: クリーンブレイクにより曖昧さを排除。SRC-0001 §2.2
- Rejected-A: 非推奨+警告で段階移行（半移行状態が長期化するリスク）
  - DO NOT: 旧スキルを非推奨状態で残さない。Temptation: 段階的移行が安全だと思う

### DR-0014: test-list.md の配置場所（OQ-0002）

- Decision: `.qfai/specs/spec-XXXX/tdd/test-list.md` に配置する
- Context: spec成果物との共存、バリデータからのアクセス性が必要
- Rationale: spec ディレクトリとの共存が最も発見しやすい。SRC-0001 §5.1
- Rejected-A: `.qfai/tdd/spec-XXXX.md`（specとの分離で発見性が低下）
  - DO NOT: test-list.md を spec ディレクトリ外に配置しない。Temptation: tdd/ を独立ディレクトリにしたい
- Rejected-B: ルートレベル `test-list.md`（スケーラビリティに問題）

### DR-0015: Phase 1 バリデータのスコープ（OQ-0003）

- Decision: Phase 1 は構造検証のみ。コンテンツ検証は v1.6.1 に延期
- Context: v1.6.0 は構造的正確性にフォーカス
- Rationale: Phase 1 で基盤を固め、段階的にハードニング。SRC-0001 §6
- Rejected: フルバリデーション（カバレッジ含む）を v1.6.0 で実施（スコープ超過）
  - DO NOT: Phase 1 でコンテンツバリデーションを含めない。Temptation: 一度に全て検証したい

### DR-0016: 並列実行ポリシー（OQ-0005）

- Decision: シリアルデフォルト、独立スライス例外のみ並列許可
- Context: 初期リリースでは安全性を優先
- Rationale: 独立スライス（異なるSUT、異なるテストファイル、共有状態なし）のみ並列が安全。SRC-0001 §8
- Rejected-A: フル並列サポート（状態破損リスク）
  - DO NOT: 共有状態があるスライスを並列実行しない。Temptation: 全件並列で高速化したい
- Rejected-B: シリアルのみ（独立スライスの効率を犠牲にする）

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

### DR-0017: テストファイルパスはプロジェクトルート相対（OQ-0001）

- Decision: Test file 実在チェックはプロジェクトルートからの相対パスで解決する
- Context: テストファイルの存在確認にはパス基準の定義が必要
- Rationale: 言語非依存のファイル存在チェックを可能にし、ビルドツール仮定を排除する
- Rejected: spec ディレクトリ相対（spec 外のテストファイルを参照できない）
  - DO NOT: テストファイルパスを spec ディレクトリ相対にしない。Temptation: spec スコープに閉じたい

### DR-0018: DR-ID と Evidence を REQUIRED_COLUMNS に追加（OQ-0002）

- Decision: DR-ID と Evidence の両方を test-list.md の必須列に追加する（6列→8列）
- Context: exception ステータスの追跡可能性と completion 詐称防止に必要
- Rationale: 全ての例外に追跡可能な意思決定記録を要求し、evidence 参照も必須化する
- Rejected: DR-ID のみ追加し Evidence は任意（evidence なしでは例外の検証が不完全）
  - DO NOT: Evidence 列を任意にしない。Temptation: 列数を最小限にしたい

### DR-0019: TC Layer は 06_Test-Cases.md の Level 列で判定（OQ-0003）

- Decision: unit/component TC の判定は 06_Test-Cases.md の Level 列を使用する（test-list.md の `Layer` 列は実行レイヤーを表す別概念）
- Context: TC 網羅性チェックの対象レイヤーの判定方法が必要
- Rationale: テスト可能なレイヤーにスコープを限定し、integration/e2e TC の false positive を回避する
- Rejected: test-list.md の Layer 列で判定（test-list.md は実行台帳であり TC 定義の SSOT ではなく、`Layer` 列は実行レイヤーであって `Level` 列とは別の軸）
  - DO NOT: TC Layer（Level 判定）を test-list.md の Layer 列から行わない。Temptation: test-list.md だけで完結させたい

### DR-0020: TDDLIST_INVALID_ID を v1.6.1 で追加（OQ-0004）

- Decision: TDD-ID フォーマット検証（TDD-NNNN パターン）を v1.6.1 で導入する
- Context: 不正な ID が伝播するとフレームワーク全体に影響する
- Rationale: 早期にフォーマット違反を検出し、下流への伝播を防止する
- Rejected: v1.6.2 に延期（不正 ID の伝播リスクが v1.6.1 スコープ内で顕在化する）
  - DO NOT: ID フォーマット検証を延期しない。Temptation: スコープを絞りたい

### DR-0021: Phase 2 チェックは全て error severity（warning 不可）

- Decision: v1.6.1 で導入する 5 つの Phase 2 チェックは全て error severity とする
- Context: completion 詐称や coverage 抜けを直接許す failure mode には warning では不十分
- Rationale: warning は無視される可能性があり、guardrail としての機能を果たさない
- Rejected: 段階的に warning → error に昇格（導入初期の摩擦を避けるため）
  - DO NOT: Phase 2 チェックを warning にしない。Temptation: 移行負荷を下げたい

### DR-0022: instructions 配置は syncIntegrationWrappers 内（OQ-0001）

- Decision: `.github/instructions/` ファイルの配置ロジックを `syncIntegrationWrappers` 関数内に追加する
- Context: `copilot-instructions.md` の配置が既に同関数内（init.ts:270-280）で行われており、.github/ 生成の一貫性が必要
- Rationale: 同じパターン（exists-check + create-only）を踏襲することで一貫性を維持
- Rejected: 独立関数 syncInstructionsFiles（配置ロジック分散による一貫性低下）
  - DO NOT: .github/ 生成ロジックを複数関数に分散しない。Temptation: 関心の分離を優先して独立関数にしたい

### DR-0023: instructions テンプレートはアセットファイル管理（OQ-0002）

- Decision: `packages/qfai/assets/init/.github/instructions/` にテンプレートファイルとして配置する
- Context: instructions ファイルは 70-110 行の長文。copilot-instructions.md（17行）のようなハードコードは不適
- Rationale: アセットファイル管理によりメンテナンス性を確保
- Rejected: init.ts 内ハードコード（長文テンプレートの可読性低下）
  - DO NOT: 70行超のテンプレートをソースコード内にハードコードしない。Temptation: 依存ファイルを増やしたくない

### DR-0024: SDD 言語固有ルール追記は別スペック管理（OQ-0003）

- Decision: v1.6.3 で汎用テンプレート配置を実装、言語固有ルール追記は別スペックで管理
- Context: ユーザーが「汎用版を配布し、/qfai-sdd にて言語依存ルールを追記」と指示
- Rationale: 配置と追記は独立した機能であり、別スペックとして管理可能
- Rejected-A: 配置と SDD 追記の同時実装（スコープ肥大）
  - DO NOT: 異なる機能を1つのスペックに詰め込まない。Temptation: 関連するから一緒にやりたい
- Rejected-B: SDD 追記を v1.6.4 送り（不要な先送り）
  - DO NOT: 別スペックで v1.6.3 内着手可能なものを次バージョンに先送りしない

### DR-0025: frontmatter applyTo は `**/*`（OQ-0004）

- Decision: `applyTo: "**/*"`（全ファイル対象）
- Context: コードレビューは全ファイルを対象とするのが自然
- Rationale: 現行ファイルの設定を踏襲

### DR-0026: excludeAgent は `coding-agent`（OQ-0005）

- Decision: `excludeAgent: "coding-agent"` を除外
- Context: coding-agent はコード生成エージェントであり、レビュー指示の適用対象ではない
- Rationale: 現行設定を踏襲

### DR-0027: Codex エージェント定義形式（OQ-0001 discussion-20260323111959112）

- Decision: Codex サブエージェントは TOML 形式で `.codex/agents/*.toml` に定義する
- Context: Codex は Claude Code/GitHub Copilot と異なり、Markdown ではなく TOML でサブエージェントを定義する
- Rationale: Codex プラットフォーム仕様に準拠。OpenAI 公式ドキュメント（SRC-0002）に基づく
- Rejected-A: Markdown symlink 方式（Codex が TOML を要求するため技術的に不可能）
  - DO NOT: Codex エージェントを Markdown で定義しない。Temptation: カノニカルソースと同じ形式で統一したい

### DR-0028: エージェントスコープを 39 に限定（OQ-0001 discussion-20260323111959112）

- Decision: Claude Code/GitHub Copilot と同じ 39 エージェントのみ Codex に実装する
- Context: カノニカルソースには 44 エージェント存在するが、5 エージェントは Claude/Copilot にも未リンク
- Rationale: プラットフォーム間の一貫性を優先。未リンクの 5 エージェントは別途追加判断
- Rejected: 全 44 エージェントを実装（5 エージェントが Claude/Copilot に未リンクのため不一致が生じる）
  - DO NOT: Claude/Copilot に存在しないエージェントを Codex のみに追加しない。Temptation: カノニカルソースの全エージェントをカバーしたい

### DR-0029: sandbox_mode の役割ベース分類（OQ-0004 discussion-20260323111959112）

- Decision: レビュー/分析系 25 エージェントに `sandbox_mode = "read-only"` を設定、実装系 14 エージェントは省略（親セッション継承）
- Context: Codex では sandbox_mode でエージェントの権限を制御できる
- Rationale: レビュー系エージェントが誤ってファイルを変更するリスクを防止。実装系は書き込みが必要
- Rejected-A: 全エージェント read-only（実装系エージェントが機能しない）
  - DO NOT: 実装系エージェントを read-only にしない。Temptation: 安全性を最大化したい
- Rejected-B: 全エージェント sandbox_mode 省略（レビュー系の安全性が低下）
  - DO NOT: レビュー系エージェントの sandbox_mode を省略しない。Temptation: 設定を簡素化したい

### DR-0030: 静的配置方式（OQ-0002 discussion-20260323111959112）

- Decision: `.codex/agents/*.toml` をリポジトリに直接コミットする（init.ts 自動生成ではない）
- Context: TOML ファイルは symlink が使えないため、実ファイルとして管理が必要
- Rationale: 静的配置が最もシンプル。init.ts への自動生成ロジック追加は複雑度が高い
- Rejected: init.ts で自動生成（カノニカル MD → TOML 変換ロジックの複雑度が高い）
  - DO NOT: v1.6.4 で init.ts に TOML 自動生成を追加しない。Temptation: 自動化で同期負荷を減らしたい

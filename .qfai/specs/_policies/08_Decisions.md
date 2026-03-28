# 08 Decisions

## Decisions

55 items — discussion-20260312143000000（symlink アーキテクチャ移行）、
discussion-20260313143000000（SDP）、discussion-20260314053646704（AskUserQuestion MUST 化）、
discussion-20260317102145554（実装フェーズ統一）、discussion-20260322091309602（Copilot レビューインストラクション配布）、
discussion-20260323111959112（Codex サブエージェント）、discussion-20260324054332396（デザインディレクション＆UI品質強化）、
discussion-20260324090005338（ChatGPT 分析統合によるデザインディレクション＆UI品質強化 第2版）、
discussion-20260325120000000（ディスカッション設計強化）、
discussion-20260326072322818（Design Audit & Slop Guardrails）、
discussion-20260328120000000（Discussion/UIUX Authoring Foundation）、
および discussion-20260328212829687（Web Research Enhancement）で解決された OQ に基づく。

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

### DR-0031: DDP 必須化（OQ-0001 discussion-20260324054332396）

- Decision: Design Direction Pack を UI 仕様の必須入力とする
- Context: 既存 spec-0013 に UI 定義体系があるが、テーマ・ムード・テイスト・CTA 階層の強制力が不足
- Rationale: DDP を必須化することで「なんとなく良さそう」な UI から「意図的に設計された」UI へ移行
- Rejected: Figma 依存の統合（ツール非依存原則に反する）
  - DO NOT: 特定外部デザインツールへの依存を追加しない。Temptation: Figma MCP で自動化したい

### DR-0032: 汎用パターン禁止（OQ-0004 discussion-20260324054332396）

- Decision: ジェネリックパターン（量産型カードグリッド等）を明示的に禁止し、レビューで FAIL 対象とする
- Context: ユーザーおよび OpenAI ガイダンスでジェネリック UI の排除が求められている
- Rationale: 抑制的デフォルト＋禁止パターンリストで品質の下限を保証
- Rejected: ジェネリックパターンをデフォルトとして許容（ユーザー要求と OpenAI ガイダンスに反する）
  - DO NOT: カードグリッド・弱いヒーロー・過剰アクセントをデフォルトとして受け入れない。Temptation: 汎用テンプレートの方が実装が速い

### DR-0033: レンダークリティーク必須化（OQ-0005 discussion-20260324054332396）

- Decision: コードオンリーレビューを禁止し、レンダリング済み UI の批評ループを必須化
- Context: コードレビューだけでは UI の美的品質を評価できない
- Rationale: 実際にレンダリングされた画面で評価することで、視覚的な問題を早期検出
- Rejected: コードのみレビュー（UI 品質の評価が不十分）
  - DO NOT: コードレビューのみで UI 品質を判定しない。Temptation: コードを読めば十分だと思う

### DR-0034: 破壊的変更エンベロープ（OQ-0006 discussion-20260324054332396）

- Decision: v1.6.5 の破壊的変更は内部アーティファクト（テンプレート・プロンプト・コントラクト・レビュー）に限定
- Context: 外部 API の破壊的変更は v2.0 まで保留
- Rationale: 内部アーティファクトは QFAI ツール利用者に直接影響しないため、先行して変更可能
- Rejected: 外部 API も同時に変更（semver 互換性ポリシーに反する）
  - DO NOT: CLI コマンドインターフェースの破壊的変更を v2.0 前に行わない。Temptation: 一度に全て変更したい

### DR-0035: VRT/RUM ハードゲート延期（OQ-0008 discussion-20260324054332396）

- Decision: 完全自動 VRT/RUM ハードゲートを v1.6.6 に延期
- Context: v1.6.5 はアーティファクトと下流契約の定義にフォーカス
- Rationale: スコアカード＋レンダークリティークが当面の緩和策として機能。CI/ランタイム統合は次フェーズ
- Deferred to: v1.6.6

### DR-0036: テンプレート刷新範囲（OQ-0009 discussion-20260324090005338）

- Decision: Story Workshop + UI Contract 例 + init 展開物を同時刷新する
- Context: 上流テンプレートが下流 UI 品質の上限を決めるため (SRC-0008 §2.1)
- Rationale: Story Workshop のみでは UI Contract と init 展開物が旧フォーマットのまま残る。3 点同時刷新で一貫性を保つ
- Rejected-A: Story Workshop のみ刷新（UI Contract と init の不整合が残る）
  - DO NOT: テンプレート刷新を Story Workshop だけに限定しない。Temptation: 影響範囲を最小化したい
- Rejected-B: 全テンプレート一斉刷新（スコープ過大、v1.6.5 に収まらない）
  - DO NOT: v1.6.5 で全テンプレートを一斉に刷新しない。Temptation: 一度に全て揃えたい

### DR-0037: Warning→Error 昇格の即時適用範囲（OQ-0010 discussion-20260324090005338）

- Decision: REQ-0017 の 6 項目を error 化、その他は config で段階的に切替可能
- Context: 全 warning を一斉に error にすると既存プロジェクトが壊れるため
- Rationale: 最も impact の高い 6 項目のみ即時昇格し、残りは qfai.config.yaml で制御
- Rejected-A: 全 warning を error 化（既存プロジェクト破壊リスク）
  - DO NOT: 全 warning を無差別に error に昇格しない。Temptation: 品質を最大限に強制したい
- Rejected-B: config のみで切替（デフォルト warning のままでは効果が薄い）
  - DO NOT: 主要 UI 品質 warning をデフォルト warning のまま残さない。Temptation: 移行負荷を完全に排除したい

### DR-0038: 複数案比較の対象画面基準（OQ-0011 discussion-20260324090005338）

- Decision: primary screen（hero / dashboard / 主要一覧 / 主要フォーム）のみ必須
- Context: 全画面に 2 案を要求すると工数が過大になるため
- Rationale: primary screen は UI 品質の支配的要因。secondary/tertiary は single 案で十分
- Rejected: 全画面で複数案必須（工数過大でフロー遅延）
  - DO NOT: 全画面に複数案比較を強制しない。Temptation: 品質を均一に高めたい

### DR-0039: taskFidelity の実装フェーズ（OQ-0012 discussion-20260324090005338）

- Decision: v1.6.5 で schema 定義 + prototyping evidence に手動記録、v1.6.6 で自動収集を追加
- Context: DOM 充足だけではタスク完遂評価ができないため (SRC-0008 §2.5)
- Rationale: schema と手動評価で即効性を確保しつつ、自動収集は次フェーズで品質を段階的に向上
- Rejected-A: v1.6.5 で full 自動実装（スコープ過大）
  - DO NOT: v1.6.5 で taskFidelity の完全自動収集を実装しない。Temptation: 一度に完成させたい
- Rejected-B: 全 deferred（DOM 充足のみの問題が継続）
  - DO NOT: taskFidelity を完全に先送りしない。Temptation: 複雑な機能を避けたい

### DR-0040: 競合/参考 UI の記録形式（OQ-0013 discussion-20260324090005338）

- Decision: URL + 参考にする点 / 採用しない点 / 翻訳方針を記述。入手不能時は理由記載
- Context: 具体的 UI 事例がないと AI は抽象的ベストプラクティスだけで generic UI を作るため (SRC-0008 §5.9)
- Rationale: URL だけでは意図が伝わらない。翻訳方針まで記述することで downstream が具体的に参照可能
- Rejected-A: URL のみ（意図が伝わらない）
  - DO NOT: 競合/参考 UI を URL のみで記録しない。Temptation: 簡素化したい
- Rejected-B: スクリーンショット添付必須（著作権リスク、ファイルサイズ増大）
  - DO NOT: スクリーンショット添付を必須にしない。Temptation: 視覚的証拠を確保したい

### DR-0041: qfai.config.yaml uiux policy の必須度（OQ-0014 discussion-20260324090005338）

- Decision: セクション optional、存在時は validator と review が参照。qualityProfile のみ推奨
- Context: project-specific な UI 方針を宣言可能にしたいが初期は optional が現実的
- Rationale: optional にすることで既存プロジェクトの破壊を回避。存在すれば validator が活用
- Rejected-A: 全フィールド必須（既存プロジェクト破壊）
  - DO NOT: uiux セクションを必須にしない。Temptation: 品質方針を強制したい
- Rejected-B: 不要（project-specific 方針の宣言手段がなくなる）
  - DO NOT: uiux config セクションの導入を見送らない。Temptation: config 複雑化を避けたい

### DR-0042: UI-bearing 検出方式（OQ-0001 discussion-20260325120000000）

- Decision: UI-bearing 検出方式: アーティファクト/セクション存在検出（キーワードマッチング単独不可）
- Context: UI-bearing ディスカッションパックの判定方式を決定する必要がある
- Rationale: false positive 防止と検出の明確性
- Rejected: キーワードマッチング単独での検出（false positive リスクが高い）
  - DO NOT: キーワードマッチング単独で UI-bearing 判定を行わない。Temptation: 実装が簡単

### DR-0043: DDS 配置場所（OQ-0002 discussion-20260325120000000）

- Decision: DDS 配置場所: 03_Story-Workshop.md（SSOT 原則、02 への重複禁止）
- Context: Design Direction Summary の配置先を決定する必要がある
- Rationale: 02 はアラインメント用、具体的設計は 03 に集約
- Rejected: 02_Alignment.md に配置（アラインメント用途と設計詳細の混在）
  - DO NOT: DDS を 02_Alignment.md に配置しない。Temptation: 設計方向性はアラインメントに近いから 02 に置きたい

### DR-0044: 競合リファレンス必須フィールド（OQ-0003 discussion-20260325120000000）

- Decision: 競合リファレンス必須フィールド: adopted_points, rejected_points, local_translation の 3 点
- Context: 競合参考 UI の記録に必要なフィールドを決定する必要がある
- Rationale: 最小限の判断トレース、メトリクスは専用監査ステップで
- Rejected: メトリクスフィールドを含める（バリデータ複雑化と収集コスト増大）
  - DO NOT: 競合リファレンスにメトリクスフィールドを必須化しない。Temptation: 定量データも一緒に記録したい

### DR-0045: 新構造バリデータ重大度（OQ-0004 discussion-20260325120000000）

- Decision: 新構造バリデータ重大度: 即座に error（warning フェーズなし）
- Context: 新規バリデータの重大度レベルを決定する必要がある
- Rationale: バイナリ構造チェックには中間 warning フェーズが不要
- Rejected: warning フェーズを設けて段階的に error へ昇格（構造チェックは存在/不在のバイナリであり中間状態が無意味）
  - DO NOT: 構造バリデータに warning フェーズを設けない。Temptation: 移行負荷を軽減したい

### DR-0046: DDP バリデータ統合方式（OQ-0005 discussion-20260325120000000）

- Decision: DDP バリデータ統合方式: 既存バリデータの拡張（新ファイル群ではない）
- Context: 新規バリデータの統合方式を決定する必要がある
- Rationale: QFAI-DDP シリーズの一貫性維持
- Rejected: 新規バリデータファイル群として分離（DDP シリーズとの一貫性が崩れる）
  - DO NOT: DDP バリデータを既存シリーズから分離しない。Temptation: 新機能だから新ファイルにしたい

### DR-0047: qualityProfile v1.7.0 ゲーティング（OQ-0007 discussion-20260325120000000）

- Decision: qualityProfile v1.7.0 ゲーティング: 保存するが未活用（DDS 構造エラーは全プロファイルで error）
- Context: qualityProfile の v1.7.0 での活用範囲を決定する必要がある
- Rationale: プロファイル感度対応は将来リリースで
- Rejected: プロファイル別に重大度を変更（実装コストが高く v1.7.0 スコープを超過）
  - DO NOT: v1.7.0 で qualityProfile 別の重大度分岐を実装しない。Temptation: せっかくプロファイルがあるから活用したい

### DR-0048: Render Evidence Automation の entrypoint と evidence model（discussion-20260325144633348）

- Decision: `qfai prototyping` を拡張して render evidence を収集し、`captured` / `skipped` / `failed` を path-only metadata として保持する
- Context: v1.7.1 で rendered reality を再利用可能な structured evidence に引き上げる必要がある
- Rationale: 新コマンドを増やさず既存 prototyping flow に統合でき、degraded mode も型付きで扱える
- Rejected-A: `qfai render` のような別 top-level command を追加する
  - DO NOT: render capture 用の新コマンドを追加しない。Temptation: 機能が見えやすいので分離したい
- Rejected-B: screenshot / HTML を JSON に inline する
  - DO NOT: raw asset を evidence JSON に埋め込まない。Temptation: 単一ファイルで完結させたい

### DR-0049: Design Audit を専用バリデータ (designAudit.ts) に集約する

- Decision: 静的 design quality audit を designAudit.ts に集約し、7 audit dimension (tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity) で findings を出力する
- Context: 既存バリデータ (ddpValidation, designFidelity, designToken, uiDefinitionConsistency) は構造チェックに長けるが、設計判断の質を横断的に監査する仕組みがない
- Rationale: 監査 dimension を 1 ファイルに集約することで、責務分散と findings の一貫性を両立する。既存バリデータの DDP 構造チェックは維持し、audit dimension は新ファイルに限定
- Rejected-A: 既存バリデータ群に audit ロジックを分散追加する（バリデータ間の findings 重複・責務境界の曖昧化）
  - DO NOT: 既存バリデータに audit dimension を埋め込まない。Temptation: 既存ファイルに1-2行追加するだけなら楽

### DR-0050: Slop Guardrails を designSlop.ts + designSlopPatterns.json に分離する

- Decision: AI slop パターン検知を designSlop.ts バリデータ + designSlopPatterns.json ルール定義に分離し、SLP-01〜SLP-06 の 6 カテゴリで検知する
- Context: anti-pattern 検知が ddpBannedPatterns.txt の単純テキストマッチに限定されており、metadata 付きの構造化ルールが不足
- Rationale: JSON ルール定義により rule 追加が宣言的になり、id/category/tier/scopes/match/message/guidance のメタデータで報告品質が向上する。ddpBannedPatterns.txt は DDP 固有の simple ban として併存させる
- Rejected-A: 全ルールを ddpBannedPatterns.txt に追加する（メタデータ不足、severity/tier 制御不可）
  - DO NOT: テキストファイルに構造化ルールを詰め込まない。Temptation: 既存ファイルに行追加が最も簡単
- Rejected-B: 全ルールを TypeScript コード内にハードコードする（rule 追加にコード変更が必要）
  - DO NOT: slop ルールを TypeScript にハードコードしない。Temptation: JSON パースを省略したい

### DR-0051: Rule Tier × Quality Profile による severity 制御を導入する

- Decision: 3 段階の Rule Tier (structural-blocking / strong-advisory / style-heuristic) と 3 段階の Quality Profile (default / high / strict) のマトリクスで severity を決定する
- Context: v1.7.2 はヒューリスティック検知が増えるため、全ルール error では false-positive でユーザー体験を損なう
- Rationale: Tier 1 は全プロファイルで error、Tier 2 は default/high で warning・strict で error、Tier 3 は default で info/warning・high で warning・strict で warning。段階的導入を支援する
- Rejected-A: 全ルールを error にする（ヒューリスティック検知の false-positive が多すぎる）
  - DO NOT: style-heuristic を error にしない。Temptation: 厳格にした方が品質が上がると思う
- Rejected-B: 全ルールを warning/info にする（structural-blocking も advisory になり、壊れた設計が通過する）
  - DO NOT: structural-blocking を warning に下げない。Temptation: ユーザーを驚かせたくない

### DR-0052: OQ-0004 解決 — Finding 重複制御は config 可変閾値を採用する

- Decision: finding 重複制御に config 可変の maxDuplicateFindingsPerRule 閾値（デフォルト 5）を採用し、超過分は集約サマリーとして 1 issue にまとめる
- Context: discussion で方針（cap duplicate, aggregate）は合意済みだが具体的閾値は未定義だった（OQ-0004）
- Rationale: 固定閾値では大規模プロジェクトで不足、無制限では report が冗長。config 可変で柔軟性を確保しつつ、デフォルト 5 はバランス良好
- Rejected-A: 固定閾値（3/file/rule）で config 不可（大規模プロジェクトで不足する）
  - DO NOT: 閾値をハードコードしない。Temptation: 設定項目を増やしたくない

### DR-0053: OQ-0005 解決 — Tier 3 default profile は category ベースで info/warning を分岐する

- Decision: default profile の Tier 3 rule は、cosmetic category (SLP-01 Generic AI Pattern, SLP-05 Density Imbalance) を info、functional category (SLP-03 Missing State Realism, SLP-04 CTA Inflation, SLP-06 Reference Cargo-culting) を warning とする。SLP-02 Over-decoration は info
- Context: discussion で「info/warning in default」と記載あるが分岐条件が未定義だった（OQ-0005）
- Rationale: cosmetic パターンは info で認識させつつ blocking しない、functional パターンは warning で注意喚起する。high/strict では両方 warning 以上
- Rejected-A: 全て warning で統一する（cosmetic 検知が過剰なノイズになる）
  - DO NOT: cosmetic slop を warning にしない。Temptation: 分岐ロジックを省略したい

### DR-0054: UI-bearing 判定は v1.7.0 ロジックを再利用する

- Decision: v1.7.2 の design audit / slop guardrails は既存の v1.7.0 UI-bearing 判定ロジック (discussionDesignHardening.ts) を再利用し、非 UI-bearing pack では全スキップする
- Context: UI-bearing 判定ロジックが v1.7.0 で確立済みであり、新規ロジックは不要
- Rationale: 判定基準の一貫性維持と実装コスト削減。false positive を避けるために同一ゲーティングを使用
- Rejected-A: 独自の UI-bearing 判定を designAudit.ts に実装する（判定基準の二重管理）
  - DO NOT: UI-bearing 判定を複数箇所で独自実装しない。Temptation: audit 用に最適化したい

### DR-0055: designAudit.ts と designSlop.ts の責務境界を明確にする

- Decision: designAudit.ts は構造的・クロスアーティファクト整合の findings（QFAI-AUD-_）を担当し、designSlop.ts は AI 生成パターンの検知（QFAI-SLP-_）を担当する。両者は独立して動作し、findings を merge しない
- Context: audit と slop の責務境界が曖昧だとバリデータ間で findings が重複する
- Rationale: audit は「設計意図の構造的不備」、slop は「AI 生成の再現性のある雑さ」で明確に分離。audit.enabled=true/slopDetection=false の組み合わせでも正常動作する
- Rejected-A: 1 ファイルに統合する（ファイルが肥大化し責務が混在する）
  - DO NOT: audit と slop を 1 ファイルに混ぜない。Temptation: ファイル数を減らしたい

### DR-0056: uiux/ サイドカーは最小限だが完全な例を提供する（OQ-0001 discussion-20260328120000000）

- Decision: サイドカーアーティファクトの verbosity は minimal-but-complete（Option B）を採用する
- Context: discussion-20260328120000000 OQ-0001 で3つの選択肢を比較
- Rationale: 各アーティファクトタイプにつき1つの完全な例を提供することで、オーサリング摩擦と下流の可読性のバランスを取る
- Rejected-A: Verbose（全例を網羅）（オーサリング摩擦が過大）
  - DO NOT: 全アーティファクトに冗長な例を含めない。Temptation: 完全性を追求して全パターンを例示したい
- Rejected-B: Skeleton-only（例なし）（下流のガイダンスが不十分）
  - DO NOT: スケルトンのみのテンプレートを出荷しない。Temptation: ファイルサイズを最小化したい

### DR-0057: UI-bearing 分類は surface type のみで判定する（OQ-0002 discussion-20260328120000000）

- Decision: UI-bearing 分類は surface type (web-ui, mobile-ui, desktop-ui, mixed, non-ui) のみで判定し、interaction complexity は使用しない
- Context: discussion-20260328120000000 OQ-0002 で3つの選択肢を比較
- Rationale: surface type は決定論的に判定可能であり、interaction complexity は主観的で自動化が困難
- Rejected-A: Interaction complexity ベースの分類（主観的、自動化困難）
  - DO NOT: interaction complexity を UI-bearing 判定基準にしない。Temptation: インタラクションの複雑さで UI を検出したい
- Rejected-B: ハイブリッド分類（surface + interaction）（過度のエンジニアリング）
  - DO NOT: 分類基準を複合化しない。Temptation: より精度の高い検出を目指して両方を組み合わせたい

### DR-0058: Primary Search MCP として Brave Search MCP を採用する（OQ-0001 discussion-20260328212829687）

- Decision: Web Research Enhancement の検索 MCP として Brave Search MCP を採用する
- Context: 複数の検索 MCP（Brave Search, Tavily, Serper 等）から primary を選定する必要がある
- Rationale: Brave Search MCP はドキュメントが最も充実しており、アクティブに開発が続いている。Community adoption も高く、MCP 仕様準拠度が安定している
- Rejected-A: Tavily MCP を primary にする（ドキュメントが不十分、MCP 仕様追従が遅い）
  - DO NOT: ドキュメント未整備の MCP を primary に採用しない。Temptation: Tavily の検索品質が高いから採用したい
- Rejected-B: 複数 MCP を同時に primary として運用する（統合コスト増大、障害切り分け困難）
  - DO NOT: 複数の検索 MCP を同時に primary 運用しない。Temptation: 冗長性を確保したい

### DR-0059: Firecrawl デプロイメントはローカル推奨で両方ドキュメント化する（OQ-0002 discussion-20260328212829687）

- Decision: Firecrawl のデプロイメントについてクラウド・ローカル両方をドキュメント化し、セキュリティ上はローカルを推奨する
- Context: Firecrawl MCP はクラウドホスト版とセルフホスト版があり、どちらを推奨するか決定が必要
- Rationale: ローカルデプロイではスクレイピング対象 URL やコンテンツが外部に送信されないため、機密性の高いリサーチに適する。クラウド版はセットアップが容易なため併記する
- Rejected-A: クラウド版のみドキュメント化する（セキュリティ懸念のあるユースケースに対応できない）
  - DO NOT: クラウド版のみを推奨しない。Temptation: セットアップが簡単だからクラウドだけで十分
- Rejected-B: ローカル版のみドキュメント化する（セットアップの敷居が高くなり採用率が低下する）
  - DO NOT: ローカル版のみに限定しない。Temptation: セキュリティを最優先して選択肢を絞りたい

### DR-0060: Apify MCP は v1.8.0 スコープから除外し post-v1.8.0 に延期する（OQ-0003 discussion-20260328212829687）

- Decision: Apify MCP の統合を v1.8.0 スコープから除外し、post-v1.8.0 に延期する
- Context: Apify MCP は SSE（Server-Sent Events）トランスポートの非推奨化が進行中であり、安定性リスクがある
- Rationale: SSE deprecation により MCP 接続の破損リスクが高く、v1.8.0 の安定リリースを優先する。Streamable HTTP への移行完了後に再評価する
- Rejected-A: v1.8.0 に含める（SSE deprecation による破損リスクがリリース品質を損なう）
  - DO NOT: トランスポート非推奨化リスクのある MCP を安定リリースに含めない。Temptation: スクレイピング能力を早期に拡充したい

### DR-0061: HTML サニタイゼーションスコープは Moderate（基本 + aria-hidden/display:none 除去）とする（OQ-0004 discussion-20260328212829687）

- Decision: Web リサーチで取得した HTML のサニタイゼーションスコープを Moderate とし、基本サニタイゼーション（script/style 除去）に加えて aria-hidden 要素と display:none 要素の除去を行う
- Context: 取得 HTML からノイズを除去する範囲を決定する必要がある。過剰除去は有用コンテンツの損失、不足はトークン浪費を招く
- Rationale: aria-hidden と display:none は視覚的に非表示でありリサーチコンテンツとしての価値が低い。Aggressive（セマンティック解析ベース）はコスト・複雑性が高く v1.8.0 に不適
- Rejected-A: Basic のみ（script/style 除去だけ）（隠し要素がトークンを浪費する）
  - DO NOT: 隠し要素を残したまま LLM に渡さない。Temptation: 実装を最小限にしたい
- Rejected-B: Aggressive（セマンティック解析ベースの除去）（実装コストが高く false positive で有用コンテンツを損失する）
  - DO NOT: セマンティック解析ベースのサニタイゼーションを v1.8.0 で実装しない。Temptation: 最大限にクリーンな入力を目指したい

### DR-0062: 評価ハーネスはメトリクス定義のみでツール非依存とする（OQ-0005 discussion-20260328212829687）

- Decision: Web リサーチ結果の評価ハーネスはメトリクス（精度、関連性、鮮度等）の定義のみを行い、特定の評価ツールには依存しない
- Context: リサーチ品質の評価方法を定義する必要があるが、評価ツールの選定はプロジェクトごとに異なる
- Rationale: メトリクス定義をツール非依存にすることで、任意の評価フレームワーク（LLM-as-judge、人手評価、自動テスト等）で実装可能。ツールロックインを回避する
- Rejected-A: 特定の評価ツール（例: RAGAS）を必須にする（ツールロックイン、依存性増大）
  - DO NOT: 特定の評価ツールを必須依存にしない。Temptation: 統一ツールで評価を標準化したい
- Rejected-B: メトリクス定義を省略してツールに任せる（評価基準が不明確になり品質保証ができない）
  - DO NOT: メトリクス定義を省略しない。Temptation: 評価は下流ツールに丸投げしたい

### DR-0063: サブエージェントのスレッド・深度制限は保守的デフォルト（max_threads=2, max_depth=2）とする（OQ-0006 discussion-20260328212829687）

- Decision: Web リサーチサブエージェントの並列実行制限を max_threads=2、再帰的リサーチの深度制限を max_depth=2 とする
- Context: サブエージェントの並列度と再帰深度のデフォルト値を決定する必要がある。過大な値はリソース消費とレート制限超過を招く
- Rationale: max_threads=2 は MCP サーバーへの同時接続数を抑制しレート制限リスクを低減する。max_depth=2 はリサーチの深掘りを1段階のフォローアップまでに制限し、無限再帰を防止する。config で上書き可能
- Rejected-A: 制限なし（リソース消費が無制限、レート制限超過、無限再帰のリスク）
  - DO NOT: スレッド・深度制限なしでサブエージェントを実行しない。Temptation: 制限なしの方がリサーチが深くなる
- Rejected-B: max_threads=1, max_depth=1（過度に保守的で実用的なリサーチ品質が確保できない）
  - DO NOT: 並列度1・深度1に制限しない。Temptation: 安全側に振り切りたい

### DR-0064: キャッシュ有効期限は 24 時間デフォルトで config 可変とする（OQ-0007 discussion-20260328212829687）

- Decision: Web リサーチ結果のキャッシュ有効期限（staleness threshold）を 24 時間をデフォルトとし、config で変更可能にする
- Context: 同一クエリの再検索を避けるキャッシュの有効期限を決定する必要がある。短すぎると不要な再取得、長すぎると古い情報の使用を招く
- Rationale: 24 時間は一般的な Web コンテンツの更新頻度と MCP API コスト削減のバランスが良い。ニュース系など鮮度が重要なユースケースでは config で短縮可能
- Rejected-A: 固定値（config 不可）（ユースケースごとの柔軟性がない）
  - DO NOT: キャッシュ有効期限を固定値にしない。Temptation: 設定項目を増やしたくない
- Rejected-B: キャッシュなし（毎回再取得）（API コスト増大、レート制限超過リスク）
  - DO NOT: キャッシュを無効にしない。Temptation: 常に最新情報を取得したい

### DR-0065: HITL ゲートはリスクベース（低リスク自動承認、高リスクゲート）とする（OQ-0008 discussion-20260328212829687）

- Decision: Human-in-the-Loop ゲートの粒度をリスクベースとし、低リスク操作（検索クエリ発行、キャッシュ済み結果参照）は自動承認、高リスク操作（外部サイトへのデータ送信、有料 API の大量呼び出し）はゲートで人間の承認を要求する
- Context: HITL ゲートの粒度を決定する必要がある。全操作にゲートを設けるとリサーチの流れが止まり、ゲートなしではリスクのある操作が無承認で実行される
- Rationale: リスクベースの分類により、日常的な検索操作の流れを妨げずに、セキュリティ・コストリスクのある操作のみ人間が確認できる。リスク分類は config でカスタマイズ可能
- Rejected-A: 全操作にゲートを設ける（リサーチフローが頻繁に中断し実用性が低下する）
  - DO NOT: 全操作に HITL ゲートを設けない。Temptation: 安全のため全て人間が確認すべき
- Rejected-B: ゲートなし（全操作を自動承認）（高リスク操作が無承認で実行される）
  - DO NOT: HITL ゲートを省略しない。Temptation: 自動化を最大化したい

# 08 Decisions

## Decisions

108 items — discussion-20260312143000000（symlink アーキテクチャ移行）、
discussion-20260313143000000（SDP）、discussion-20260314053646704（AskUserQuestion MUST 化）、
discussion-20260317102145554（実装フェーズ統一）、discussion-20260322091309602（Copilot レビューインストラクション配布）、
discussion-20260323111959112（Codex サブエージェント）、discussion-20260324054332396（デザインディレクション＆UI品質強化）、
discussion-20260324090005338（ChatGPT 分析統合によるデザインディレクション＆UI品質強化 第2版）、
discussion-20260325120000000（ディスカッション設計強化）、
discussion-20260326072322818（Design Audit & Slop Guardrails）、
discussion-20260328120000000（Discussion/UIUX Authoring Foundation）、
discussion-20260329120000000（UIX-VAL/UIX-REV Validation, Review, and Migration Stabilization）、
discussion-20260329130000123（Runtime & Evidence Foundation）、
discussion-20260329175059391（Critique, Calibration & Full-Harness Expansion）、
discussion-20260329195516830（v1.7.6 Audit Remediation）、
および discussion-20260330035428071（Canonical Convergence）で解決された OQ に基づく。

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

- Decision: UI-bearing 分類は surface type (web, mobile, desktop, mixed, non-ui) のみで判定し、interaction complexity は使用しない
- Context: discussion-20260328120000000 OQ-0002 で3つの選択肢を比較
- Rationale: surface type は決定論的に判定可能であり、interaction complexity は主観的で自動化が困難
- Rejected-A: Interaction complexity ベースの分類（主観的、自動化困難）
  - DO NOT: interaction complexity を UI-bearing 判定基準にしない。Temptation: インタラクションの複雑さで UI を検出したい
- Rejected-B: ハイブリッド分類（surface + interaction）（過度のエンジニアリング）
  - DO NOT: 分類基準を複合化しない。Temptation: より精度の高い検出を目指して両方を組み合わせたい

### DR-0058: Warning デフォルト + config flag による error 昇格（DEC-001 discussion-20260329120000000）

- Decision: Legacy pack の stale asset / missing sidecar 検出は warning デフォルトとし、`uiux.migration.strict: true` config flag で error に昇格する
- Context: v1.7.3 で導入された uiux/ サイドカーを持たないレガシープロジェクトに対する enforcement 方針を決定する必要がある
- Rationale: 即座の error enforcement はマイグレーションパスなしでレガシープロジェクトを破壊する。3 フェーズ approach（warning → config opt-in error → v1.8 default error）が採用ランウェイを提供する
- Rejected-A: 即座に error enforcement（レガシープロジェクトが migration path なしで破壊される）
  - DO NOT: migration checks を初期リリースで error にしない。Temptation: 品質ゲートは最初から厳格にすべきだと思う
- Rejected-B: warning のみで error 昇格パスを提供しない（品質ゲートとして機能しない）
  - DO NOT: error への昇格パスを省略しない。Temptation: warning だけで十分と思う

### DR-0059: Migration guidance only（DEC-002 discussion-20260329120000000）

- Decision: v1.7.4 では migration guidance（ステップバイステップ手順のエラー出力）のみを提供し、auto-refresh は v1.8 に延期する
- Context: stale asset 検出後のユーザー支援方法を決定する必要がある
- Rationale: auto-refresh には CLI コマンドインフラとテンプレート diffing ロジックが必要であり、安定化リリースのスコープ外。migration guidance で v1.7.4 は十分
- Rejected: v1.7.4 で auto-refresh helper を実装する（CLI command infrastructure と template diffing logic が stabilization release のスコープ外）
  - DO NOT: v1.7.4 で auto-refresh を実装しない。Temptation: ユーザー体験を最大化するために自動修復を入れたい

### DR-0060: セマンティックルール ID 命名規約（DEC-003/005 discussion-20260329120000000）

- Decision: UIX-VAL/UIX-REV のルール ID はセマンティック名（例: `UIX-VAL-SIDECAR-MISSING`）を採用する
- Context: 既存コードでは `QFAI-AUD-001` (numeric) と `SLP-01` (short) の両パターンが存在する。新ルールファミリの命名規約を統一する必要がある
- Rationale: セマンティック名により ID だけで issue の内容を理解でき、エラーの actionability が向上する。レポート UX の目標と一致
- Rejected: 連番スタイル `UIX-VAL-001`（ID から issue 内容を推測できず actionability が低い）
  - DO NOT: ルール ID に連番を使用しない。Temptation: 既存の numeric pattern に揃えたい

### DR-0061: `uiux.migration.strict` boolean config key（DEC-004/006 discussion-20260329120000000）

- Decision: migration severity escalation の config key は `uiux.migration.strict: true` (boolean) とする
- Context: migration check の severity 制御に使用する config key の形式を決定する必要がある
- Rationale: 既存の `uiux` セクション構造に整合する最もシンプルな config path。severity string より boolean の方が warn vs error のバイナリ判定に明確
- Rejected: severity string（例: `uiux.migration.severity: "error"`）（バイナリ判定に文字列は過剰）
  - DO NOT: migration severity に文字列 config を使用しない。Temptation: 将来の拡張性のために文字列にしたい

### DR-0062: 20 文字最小長制約（DEC-006 discussion-20260329120000000）

- Decision: critical narrative fields（strategy description, anchor rationale 等）に 20 文字最小長を設定する
- Context: UIX-VAL の completeness check で「空でない」だけでは不十分な場合のしきい値を決定する必要がある
- Rationale: 20 文字未満の記述はプレースホルダーやトークン的記述であり、実質的なコンテンツとみなせない。field-level completeness の最低品質ゲート
- Rejected-A: 最小長なし（空でなければ通過）（"TBD" や "TODO" がバリデーションを通過する）
  - DO NOT: critical narrative fields を空チェックのみで通過させない。Temptation: シンプルな存在チェックで十分と思う
- Rejected-B: 100 文字以上の厳格な最小長（過度な制約で false positive が増加する）
  - DO NOT: narrative fields に過度な最小長を設定しない。Temptation: より品質の高い記述を強制したい

### DR-0063: UI-bearing 検出のポジティブシグナル + ネガティブオーバーライド（DEC-007 discussion-20260329120000000）

- Decision: UI-bearing 検出はポジティブシグナル（HTML mocks, `<style>` tags, Mermaid screen flows, screen contracts の存在）で判定し、明示的な `non-ui` surface type 宣言でネガティブオーバーライド可能とする
- Context: UI-bearing 検出の false positive/negative を最小化する方法を決定する必要がある
- Rationale: ポジティブシグナルは決定論的に検出可能であり、ネガティブオーバーライドは edge case（UI 要素を含むが UI プロジェクトでないケース）をカバーする
- Rejected: キーワードマッチングのみ（TC-32 に違反。false positive が高い）
  - DO NOT: UI-bearing 検出をキーワードマッチング単独で行わない。Temptation: 実装がシンプルだから

### DR-0064: Phase 1 exit criterion（DEC-008 discussion-20260329120000000）

- Decision: Phase 1（warning default）の exit criterion は v1.7.4 リリース後 30 日経過、または `uiux.migration.strict: true` の採用が 1 件以上確認された時点とする
- Context: warning から error への昇格タイミングの客観的基準を決定する必要がある
- Rationale: 時間ベース（30 日）と採用ベース（1+ strict adoption）の OR 条件により、十分な adoption runway を確保しつつ、早期採用者の存在で移行を加速できる
- Rejected: 固定期間のみ（採用状況に関係なく昇格）（早期採用者がいる場合に不必要な待機が発生）
  - DO NOT: exit criterion を時間のみに依存させない。Temptation: シンプルに30日固定にしたい

### DR-0065: 8 ステップバリデータ実装シーケンス（DEC-009 discussion-20260329120000000）

- Decision: UIX-VAL ルールは 8 ステップの依存関係順に実装する（Step N の前提条件完了まで Step N+1 に着手不可）
- Context: 12+ の新バリデータルールの実装順序を決定する必要がある
- Rationale: 依存関係順の実装により、各ステップでの前提条件が保証され、リグレッションのリスクを最小化する。Step 1（基盤登録 + UI-bearing 検出）→ Step 2（存在チェック）→ Step 3（フィールド完全性）→ ... → Step 8（migration guidance）
- Rejected: 全バリデータを並列実装（依存関係の前提条件が未保証のまま実装が進み、リグレッション多発）
  - DO NOT: バリデータを依存関係無視で並列実装しない。Temptation: 全員が同時に作業すれば速く終わると思う

### DR-0066: CHANGELOG テストカウント修正（DEC-010 discussion-20260329120000000）

- Decision: CHANGELOG のテストカウントを 25 から 26 に修正する
- Context: v1.7.3 の CHANGELOG に記載されたテストカウントが実際のテスト数と不一致
- Rationale: CHANGELOG の正確性維持。テストカウントの不一致は品質シグナルの信頼性を損なう
- Rejected: 不一致を放置する（CHANGELOG の信頼性低下）
  - DO NOT: CHANGELOG のテストカウント不一致を放置しない。Temptation: 些細な差異だから無視したい

### DR-0067: UIX-VAL/UIX-REV の責務分離（discussion-20260329120000000）

- Decision: UIX-VAL（deterministic validators）と UIX-REV（semantic reviewers）の責務を厳密に分離する。hard gate に taste judgment を含めない
- Context: validation と review の境界を明確にし、reviewer が hard gate として誤実装されるリスクを排除する必要がある
- Rationale: deterministic validator は同一入力→同一出力を保証し、CI の再現性を確保する。semantic review は品質判断を含むため warning にとどめ、blocking にしない
- Rejected: validator と reviewer を統合して1つのチェック群にする（deterministic check と heuristic check が混在し、CI の再現性が損なわれる）
  - DO NOT: hard gate に taste judgment を含めない。Temptation: 全チェックを error にして品質を最大化したい

### DR-0068: Static-first default recovery（DEC-0001 discussion-20260329130000123）

- Decision: `/qfai-prototyping` の default mode を static-first obligations のみに戻す。runtime-heavy checks は opt-in に移動
- Context: 現状の prototyping が default で runtime-heavy obligations を背負い ATDD と責務重複している
- Rationale: static-first default により軽量な標準経路を回復し、runtime checks は full-harness mode で明示的に選択可能にする
- Rejected: runtime-heavy default を維持する（phase mismatch と ATDD 重複を再発させる）
  - DO NOT: runtime-heavy checks を default obligation に戻さない。Temptation: 「一つ追加するだけ」が積み重なり再び重くなる

### DR-0069: Optional capability with captured/skipped/failed（DEC-0002 discussion-20260329130000123）

- Decision: render evidence を optional capability として captured/skipped/failed の 3 状態で表現する
- Context: evidence capture を全プロジェクトに強制すると non-web/non-visual project が破壊される
- Rationale: 3 状態により partial capture と absent case を明示でき、default 軽量性と evidence richness を両立する
- Rejected: browser availability を default hard dependency にする（non-web/non-visual project を壊す）
  - DO NOT: browser installation を default prototyping の前提条件にしない。Temptation: richer validation のために全プロジェクトに強制したい

### DR-0070: Provider abstraction with optional registration（DEC-0003 discussion-20260329130000123）

- Decision: browser/visual-review backend を provider abstraction と optional registration で管理する
- Context: Playwright 固定だと将来の backend 多様性が損なわれ、fail-open 設計が崩れる
- Rationale: abstraction 先行・backend 実装後置により拡張性と fail-open を両立する
- Rejected: Playwright 固定 backend（provider 拡張性と fail-open 設計を損なう）
  - DO NOT: 特定の browser backend をハードコードしない。Temptation: Playwright が最も成熟しているから固定したい

### DR-0071: Structured findings + repair suggestions（DEC-0004 discussion-20260329130000123）

- Decision: browser QA output は structured findings と repair suggestions を返す
- Context: 散文的な findings では downstream 修正が困難
- Rationale: phase + status + repair suggestion の構造化により follow-up work が actionable になる
- Rejected: prose-only findings（downstream で修正ポイントが不明確になる）
  - DO NOT: browser QA output を非構造化テキストにしない。Temptation: 自由記述の方が柔軟だと思う

### DR-0072: Standard / low-cost / full-harness mode split（DEC-0005 discussion-20260329130000123）

- Decision: mode ごとの expectation 差分を standard / low-cost / full-harness で明示的に分離する
- Context: 単一 mode では obligation が混線し、軽量利用と厳密利用の両立が困難
- Rationale: mode 分離により各利用シナリオの obligation が明確になり、混線を防ぐ
- Rejected: 単一 mode で obligation を動的切替（mode 境界が曖昧になり混線リスクが残る）
  - DO NOT: mode 分離なしに obligation を動的切替しない。Temptation: config 設定だけで全てを制御したい

### DR-0073: Default max iteration count = 15（OQ-0001 discussion-20260329175059391）

- Decision: full-harness loop のデフォルト最大反復数を 15 に設定する
- Context: 反復数が少なすぎると品質不足、多すぎるとコスト増大
- Rationale: 15 反復は品質改善とコスト管理のバランスが取れている。configurable override で調整可能
- Rejected-A: 10 反復（品質改善の余地が不足）
  - DO NOT: デフォルト最大反復数を 10 以下にしない。Temptation: コスト削減を優先したい
- Rejected-B: 20 反復（収穫逓減が顕著）
  - DO NOT: デフォルト最大反復数を 20 以上にしない。Temptation: 品質を最大化したい

### DR-0074: Score delta threshold with lookback（OQ-0002 discussion-20260329175059391）

- Decision: plateau detection にスコアデルタ閾値と 3 反復 lookback を採用する
- Context: plateau 検出方式の選択
- Rationale: スコアデルタは直接測定可能で客観的。3 反復 lookback でノイズを平滑化
- Rejected-A: 連続改善なしカウント（粒度が低く、小さな改善を見逃す）
  - DO NOT: バイナリ改善/非改善判定を採用しない。Temptation: シンプルにしたい
- Rejected-B: 複合アプローチ（実装複雑度に対して利点が不十分）
  - DO NOT: 複数の plateau 検出方式を組み合わせない。Temptation: 両方の利点を取りたい

### DR-0075: Fail-open at adapter level only（OQ-0006 discussion-20260329175059391）

- Decision: fail-open semantics をアダプターレベルのみに適用する
- Context: fail-open の適用範囲の選択
- Rationale: アダプターレベルの fail-open はカスケード障害を防ぎ、ハーネスの整合性を維持する
- Rejected-A: full-harness レベルの fail-open（障害境界が広すぎる）
  - DO NOT: fail-open を harness レベルに拡大しない。Temptation: より広い保護が欲しい
- Rejected-B: コンポーネントごとの設定可能 fail-open（過剰設計）
  - DO NOT: fail-open をコンポーネント単位で設定可能にしない。Temptation: 柔軟性を最大化したい

### DR-0076: Heuristic-based display/stub detection（OQ-0007 discussion-20260329175059391）

- Decision: display-only/stub-only detection にヒューリスティックベース（設定可能な感度）を採用する
- Context: 検出方式の選択
- Rationale: ヒューリスティックは初期リリースに十分な精度を提供し、AST 解析の複雑さを回避する
- Rejected-A: AST ベース解析（複雑さに対して利点が不釣り合い）
  - DO NOT: 初期リリースで AST 解析を採用しない。Temptation: より正確な検出が欲しい
- Rejected-B: ハイブリッドアプローチ（実装負荷が高い）
  - DO NOT: ヒューリスティックと AST を混合しない。Temptation: 段階的に精度を上げたい

### DR-0077: Premium path as explicit non-default（adopted discussion-20260329175059391）

- Decision: premium path は明示的オプトイン（`/qfai-prototyping --mode full-harness`）であり、デフォルトにしない。旧エントリポイント `/qfai-prototyping-full-harness` は廃止済みであり、`/qfai-prototyping --mode full-harness` が唯一の起動パスとなる
- Context: standard path との分離方針と、既存 CI / ユーザー導線に対する後方互換性の確保
- Rationale: standard path の軽量性を維持し、premium path のコスト/複雑さをオプトインユーザーのみに限定しつつ、旧パス依存の運用・CI を即時に破壊しないよう、README/CHANGELOG 等で警告→削除の段階移行ポリシーを採用する
- Rejected: full-harness をデフォルトにする（コスト/複雑さが全ユーザーに波及）
  - DO NOT: full-harness をデフォルトモードにしない。Temptation: 品質を全ユーザーに提供したい

### DR-0078: Critique semantics not in validate（adopted discussion-20260329175059391）

- Decision: critique semantics を deterministic validate に追加しない
- Context: validate コマンドの責務境界
- Rationale: validate は決定論的かつ予測可能でなければならない。critique の非決定論的性質は validate の信頼性を損なう
- Rejected: validate に critique 検証を追加（validate の決定論性を破壊）
  - DO NOT: validate に LLM ベースの critique check を追加しない。Temptation: 単一コマンドで全検証したい

### DR-0079: Provider benchmarking deferred to SDD implementation（OQ-0003 discussion-20260329175059391）

- Decision: provider benchmarking と fallback choice の決定を SDD 実装フェーズに延期する
- Context: 具体的な provider interface なしではベンチマークが不可能
- Rationale: 暫定的に config priority list を使用し、provider interface 実装後に動的選択を評価する
- Interim: 静的優先度リストによる fallback。設定で順序変更可能

### DR-0080: 3-layer evaluation model adoption（OQ-0001 discussion-20260329195516830）

- Decision: 評価アーキテクチャを 3-layer model（invariant, trend-derived, product-specific）に収束させる
- Context: ステアリングドキュメントは 3-layer model を最終合意設計として記載しているが、リポジトリ実装は 4-axis（usability, consistency, accessibility, delight）のまま。スコアリングロジック、トレンド反映、キャリブレーションに不整合が発生
- Rationale: 最終合意設計（3-layer）が正。4-axis は legacy 実装であり、名前だけでなくスコアリング構造に影響するため放置不可
- Rejected: 4-axis model を正式採用し 3-layer を破棄する
  - DO NOT: 4-axis model を正式アーキテクチャとして採用しない。Temptation: 既存コードを変更したくない
- Evidence: SRC-0001 P1-01, SRC-0004

### DR-0081: Render evidence wiring to CLI（OQ-0002 discussion-20260329195516830）

- Decision: 内部実装済みの render evidence を CLI/skill フローまで通しで接続する（foundation-only に格下げしない）
- Context: render evidence capture は内部的に部分実装されているが、CLI 出力はプレースホルダーのまま。CHANGELOG は機能の存在を主張しているが、実際のユーザーパスは stub を返す
- Rationale: 内部実装は完了しているため、接続作業が合理的。格下げは完了済み作業の廃棄に等しく、ユーザーへの能力主張と実態の乖離を継続させる
- Rejected: render evidence を foundation-only に格下げする
  - DO NOT: CHANGELOG の capability claim を実装なしに放置しない。Temptation: 接続よりドキュメント修正が楽
- Evidence: SRC-0001 P1-05, SRC-0008, SRC-0009

### DR-0082: Surface classification as primary UI-bearing detection（OQ-0003 discussion-20260329195516830）

- Decision: UI-bearing 検出の primary SSOT を explicit surface classification とし、content signals は fallback heuristic とする
- Context: skill docs は surface classification が primary と記載するが、validator 実装は HTML/mermaid/content signals から推論。false positive/negative とドキュメント/実装の乖離が発生
- Rationale: surface classification が明示的で予測可能。content signals は ambiguous case のみの補助
- Rejected: content signals を primary detection とする
  - DO NOT: content signals を UI-bearing 検出の primary にしない。Temptation: ヒューリスティックで全自動にしたい
- Evidence: SRC-0001 P1-04, SRC-0006

### DR-0083: Versioning strategy v1.7.6a + v1.7.7 + v1.7.8（OQ-0004 discussion-20260329195516830）

- Decision: remediation のバージョニングを v1.7.6a（hotfix）+ v1.7.7（correction）+ v1.7.8（cleanup）とする
- Context: リポジトリは v1.7.6 を完了/リリース済みとして扱っている。pre-release として再オープンすると既に共有/タグ付けされたバージョンと矛盾
- Rationale: v1.7.6a + v1.7.7 + v1.7.8 は運用上最もクリーン。ロールバック境界が明確
- Rejected: v1.7.6 を pre-release として再オープンする
  - DO NOT: 既に公開済みのバージョンを pre-release に戻さない。Temptation: 新バージョン番号を避けたい
- Evidence: SRC-0001 Section 6

### DR-0084: Default prototyping mode override to standard（qfai_prototyping_mode_switch_ux_proposal.md）

- Decision: デフォルトプロトタイピングモードを `low-cost` から `standard` に変更する。モード解決は precedence chain（1. CLI --mode, 2. discussion artifact recommended_mode, 3. system default=standard）で決定する。DR-0080 の「low-cost をデフォルト」を上書きする
- Context: qfai_prototyping_mode_switch_ux_proposal.md が hybrid model を提案。discussion artifact がモードを推奨し、CLI が上書き可能、system default は standard。ユーザーが明示的に承認（2026-03-30）
- Rationale: standard は customer-presentable な品質を target とし、大半のユースケースに適合する。low-cost は明示的な opt-in に変更。precedence chain により mode 解決が deterministic かつ auditable になる
- Rejected-A: low-cost をデフォルトのまま維持する（DR-0080 維持）
  - DO NOT: system default を low-cost に戻さない。Temptation: static-first の方がセットアップ不要で安全
- Rejected-B: discussion artifact recommendation を無視して CLI のみにする
  - DO NOT: discussion artifact recommendation を mode 解決から除外しない。Temptation: シンプルにしたい
- Evidence: qfai_prototyping_mode_switch_ux_proposal.md §6, user approval 2026-03-30

### DR-0085: Full-harness: CLI + skill 両方の entrypoint（AD-001/OQ-0001 discussion-20260330035428071）

- Decision: full-harness premium path に CLI subcommand と skill guidance の両方の entrypoint を提供する
- Context: CLI のみでは skill guidance がなく premium path の利用ハードルが高い。skill のみでは CLI automation が不可
- Rationale: 両 entrypoint により human-interactive（skill）と CI/automation（CLI）の両ユースケースをカバーする
- Rejected: CLI subcommand のみで提供する（skill guidance なしでは premium path の価値が伝わらない）
  - DO NOT: Skill guidance なしで premium path を提供しない。Temptation: CLI だけで十分と思う

### DR-0086: Browser QA MVP: smoke + visual の 2 phase（AD-002/OQ-0002 discussion-20260330035428071）

- Decision: browser QA の v1.7.8 MVP を smoke phase と visual phase の 2 phase に限定する
- Context: browser QA の完全な 4-phase pipeline（smoke, interaction, visual, accessibility）は v1.7.8 のスコープを超過する
- Rationale: smoke + visual で real findings を返す MVP を確立し、interaction と accessibility は後続リリースに延期する
- Rejected: Browser QA 全 4-phase を v1.7.8 で実装する（advanced heuristics を含めるとスコープ超過）
  - DO NOT: v1.7.8 で advanced heuristics を scope に含めない。Temptation: 完全な QA pipeline を一度に作りたい

### DR-0087: 4-axis → 3-layer: v1.7.8 warning, v1.8.0 error（AD-003/OQ-0003 discussion-20260330035428071）

- Decision: 4-axis evaluation model から 3-layer model への移行を v1.7.8 で warning、v1.8.0 で error とする段階的移行とする
- Context: DR-0080 で 3-layer model が正式アーキテクチャとして採用されたが、既存プロジェクトの 4-axis 実装が残存する
- Rationale: migration window を設けることで既存プロジェクトの破壊を回避しつつ、確実に 3-layer に収束させる
- Rejected: 4-axis を即 error にする（migration window なしで breaking change を導入してしまう）
  - DO NOT: migration window なしで breaking change を導入しない。Temptation: 旧形式を即座に排除したい

### DR-0088: Weak strategy: v1.7.8 warning, v1.8.0 error（AD-004/OQ-0004 discussion-20260330035428071）

- Decision: weak strategy artifact（不完全な strategy 記述）の検出を v1.7.8 で warning、v1.8.0 で error とする
- Context: strategy artifact の品質が不十分な場合でも現行では通過する。品質ゲートとして機能させる必要がある
- Rationale: warning-error ratchet パターンにより段階的に品質を引き上げる。v1.7.8 で認知させ、v1.8.0 で enforcement する
- Rejected: Anti-preference 全フロー横断を v1.7.8 で要求する（全フロー横断 traceability はスコープ超過）
  - DO NOT: v1.7.8 で全フロー横断 traceability を要求しない。Temptation: 完全な traceability を一度に実現したい

### DR-0089: External critique/calibration: docs + entrypoint のみ公開（AD-005/OQ-0005 discussion-20260330035428071）

- Decision: external critique adapter と calibration pack は docs と entrypoint のみを公開し、内部実装は隠蔽する
- Context: critique/calibration の詳細実装を公開すると API surface が過大になり将来の変更が困難
- Rationale: entrypoint のみの公開により API stability を確保しつつ、内部実装の柔軟性を維持する
- Rejected: 内部 API を含めて全公開する（API surface 増大による将来の breaking change リスク）
  - DO NOT: 内部 critique/calibration API を public にしない。Temptation: 拡張性のために全 API を公開したい

### DR-0090: Render evidence 不可時: skipped + reason + alternative（AD-006/OQ-0006 discussion-20260330035428071）

- Decision: render evidence capture が不可能な場合、skipped status + reason + alternative suggestion を返す
- Context: browser 未インストールや headless 環境など、render evidence を取得できない場合の振る舞いを定義する必要がある
- Rationale: skipped + reason で状況を明示し、alternative suggestion で次のアクションを提示することで fail-open と actionability を両立する
- Rejected: render evidence 不可時にエラーで停止する（non-visual project や CI 環境を壊す）
  - DO NOT: render evidence の不可をエラーにしない。Temptation: evidence がない場合は品質を保証できないからブロックしたい

### DR-0091: Anti-preference: taste → axes → review の 3 point traceable（AD-007/OQ-0007 discussion-20260330035428071）

- Decision: anti-preference traceability を taste interview → scoring axes → review findings の 3 point で実現する
- Context: ユーザーの taste preference が最終レビューの findings にどう反映されたかの追跡可能性が必要
- Rationale: 3 point traceability により preference → evaluation → findings の連鎖が明確になり、主観的判断の根拠が検証可能になる
- Rejected: Anti-preference 全フロー横断 traceability を v1.7.8 で実装する（全フロー横断はスコープ超過）
  - DO NOT: v1.7.8 で全フロー横断 traceability を要求しない。Temptation: 完全な traceability を一度に実現したい

### DR-0092: Master convergence doc: 新規 steering document（AD-008/OQ-0008 discussion-20260330035428071）

- Decision: v1.7.8 Canonical Convergence の全変更を追跡する master convergence steering document を新規作成する
- Context: correction-and-convergence リリースは多数の既存 spec/artifact を横断的に修正するため、変更の全体像を把握する文書が必要
- Rationale: 単一の steering document により全変更の進捗・依存関係・完了状態を一元管理でき、実装フェーズでの見落としを防止する
- Rejected: 既存 delta.md のみで追跡する（delta.md は事後記録であり、計画・進捗管理には不十分）
  - DO NOT: correction-and-convergence リリースを delta.md のみで管理しない。Temptation: 既存の仕組みで十分と思う

### DR-0093: v1.7.9 を convergence/correction/integration release として扱う（OQ-0001 discussion-20260330153902875）

- Decision: v1.7.9 は新規 greenfield 設計ではなく、既存 canonical model を validate/discussion/prototyping/docs に truthful に接続する convergence/correction/integration release とする
- Context: architecture 再議論に戻ると CAP-0034..0037 の correction を完了できず、release claim と実態の乖離が継続する
- Rationale: correction release と定義することで scope を既存 capability の convergence に固定し、truthfulness を最優先にできる
- Rejected: v1.7.9 を greenfield redesign として扱う
  - DO NOT: v1.7.9 を新規アーキテクチャ再設計の場にしない。Temptation: 気になる点を一度に作り直したい

### DR-0094: Canonical validator registration を production validate path に統一する（OQ-0002 discussion-20260330153902875）

- Decision: canonical UIX validator registration を `validateProject()` の production path に統一し、isolated validator と実運用 path の乖離を残さない
- Context: validator 実装が存在しても production wiring が別経路だと release truthfulness が崩れる
- Rationale: validation truth path を 1 本に保つことで、docs/review/test の前提と実行結果を一致させる
- Rejected: isolated validator を温存したまま docs だけ更新する
  - DO NOT: production wiring 未接続の validator capability を完成扱いにしない。Temptation: 実装より記述更新の方が早い

### DR-0095: Discussion completion は taste/trend/3-layer canonical family へ収束する（OQ-0003 discussion-20260330153902875）

- Decision: UI-bearing discussion completion は taste interview、trend scan、3-layer rubric、strong strategy、strong screen contract を canonical completion family とする
- Context: legacy 4-axis completion を残すと validator/template/reviewer の field family が分裂する
- Rationale: discussion completion model を 1 つに固定することで downstream の review/prototyping/validation が同じ artifact family を参照できる
- Rejected: legacy 4-axis を canonical default として併存させる
  - DO NOT: 4-axis legacy を canonical default に戻さない。Temptation: 既存テンプレート変更を避けたい

### DR-0096: full-harness は real user-facing explicit path とする（OQ-0004 discussion-20260330153902875）

- Decision: `/qfai-prototyping --mode full-harness` を explicit non-default の real user-facing path とし、planner/generator/evaluator phases と evidence/review obligations を公開する
- Context: docs only の nominal path では premium mode の責務と期待値が利用者に伝わらない
- Rationale: explicit path として定義することで standard path との境界、evidence obligation、reviewability を固定できる
- Migration: 旧エントリポイント `/qfai-prototyping-full-harness` および `.github/skills/qfai-prototyping-full-harness` 等のショートカットは廃止済み。`/qfai-prototyping --mode full-harness` が唯一の起動パスとなる
- Rejected: full-harness を docs-only reference に留める
  - DO NOT: nominal な premium path を公開して完成扱いにしない。Temptation: 実配線前に名前だけ先に出したい

### DR-0097: Runtime evidence は explicit skipped/failed を返し fake success を禁止する（OQ-0005 discussion-20260330153902875）

- Decision: render evidence と browser QA は unsupported/unavailable 時に explicit skipped または failed を返し、fake success を返さない
- Context: runtime capability の absent case を success 扱いすると review と release notes が誤誘導される
- Rationale: honest runtime reporting により capability 不足を fail-open で扱いつつ、truthfulness を維持する
- Rejected: unsupported runtime capability を success 扱いする
  - DO NOT: unsupported runtime を success に丸めない。Temptation: PASS を増やしてリリースを進めたい

### DR-0098: Docs maturity vocabulary を implemented / foundation-only / deferred に統一する（OQ-0007 discussion-20260330153902875）

- Decision: steering / changelog / docs / source comments の成熟度表現は `implemented`, `foundation-only`, `deferred` を基準語彙として統一する
- Context: completed / foundation / pending の揺れが capability claim の矛盾を生み、review 判断を難しくしている
- Rationale: 語彙を統一することで reviewer と implementer が同じ maturity semantics を共有できる
- Rejected: 自由記述の成熟度語彙を許容する
  - DO NOT: capability maturity を自由語彙で表現しない。Temptation: 文脈ごとに言い換えたい

### DR-0099

- Date: 2026-03-30
- Title: Spec Auto-Discovery Protocol — 4ソース統合差分検出
- Status: adopted
- Context: spec引数省略時にエージェントが「作業不可」として停止する事象が全エージェント共通で多発。spec-0011のPreflight Diff Protocolを拡張し、TypeScript実装・validate統合・トレーサビリティ検証を含む包括的な解決策を採用。
- Decision: 4ソース統合差分検出（git diff origin/main + ローカル変更 + timestamp + delta.md）＋ファイルレベルのトレーサビリティ整合性チェックをqfai validateに統合
- Alternatives rejected:
  - git diff のみ: DR-0006で否定済み（no-git環境対応不可）
  - 完全セマンティック解析: 実装コスト高、段階的改善で対応
  - エラー停止（差分ゼロ時）: 同じ停止問題の再発
- Consequence: specDiffDetector + traceabilityValidator モジュール新規追加、SKILL.md改修、validate拡張

### DR-0100

- Date: 2026-03-30
- Title: Traceability検証はファイルレベルdiffチェック
- Status: adopted
- Context: specのBR/AC変更と実装コードの整合性検証において、完全セマンティック解析は実装コスト高
- Decision: Phase 1はファイルレベルの差分チェックで実装し、Phase 2で行レベル/セマンティック解析に拡張可能な設計とする
- Alternatives rejected:
  - 行レベルのBR/AC参照チェック: Phase 2で検討
  - 完全セマンティック解析: Phase 2以降で段階的に導入
- Consequence: Traceability Ledger（16_Traceability-ledger.md）のマッピングを基にファイルdiff有無をチェック

---

## v1.7.11 Decisions (discussion-20260331120000000)

### DR-0101

- Date: 2026-03-31
- Title: Old aggregator compatibility wrapper with deprecation
- Status: adopted
- Context: runAllUixValidators() を canonical entrypoint に置換する際、既存利用者への影響を最小化する方法の選定
- Decision: compatibility wrapper (option b) を採用。old aggregator calls を新実装に透過的に変換し、deprecation window を設ける
- Alternatives rejected:
  - (a) Complete removal: 既存 consumer に migration path なしで breaking change。DO NOT: wrapper なしで public interface を削除しない。Temptation: 一括除去でコード簡潔化
  - (c) Side-by-side indefinitely: 永続的な二重メンテナンスコスト。DO NOT: 二重実装を永続化しない。Temptation: 両方残せば互換性最大化
- Consequence: runAllUixValidators() → runCanonicalUixValidators() への wrapper 追加。deprecation warning emit。removal は v1.8.0 以降

### DR-0102

- Date: 2026-03-31
- Title: 4-axis templates deprecation marking + removal from defaults
- Status: adopted
- Context: 3-layer canonical templates への移行において、旧 4-axis テンプレートの取り扱い方法の選定
- Decision: deprecation marking (option b) を採用。4-axis テンプレートに deprecated marking を付与し、defaults から除去。参照素材として保持
- Alternatives rejected:
  - (a) Immediate deletion: 移行途中ユーザーの参照素材喪失。DO NOT: marking なしで即削除しない。Temptation: 旧形式を即座に排除したい
  - (c) Keep as-is: 新規ユーザーが outdated model を受け取る。DO NOT: deprecated をデフォルトに残さない。Temptation: 変更リスクを避けたい
- Consequence: 6 新規 canonical テンプレート追加。旧テンプレートに deprecated metadata 付与。00_index.md を canonical family 参照に更新

### DR-0103

- Date: 2026-03-31
- Title: Remove "requested" status from render evidence vocabulary
- Status: adopted
- Context: render evidence の status vocabulary において、意図と実行の曖昧性を排除する方法の選定
- Decision: "requested" を除去し captured/skipped/failed の 3 状態のみとする (option b)
- Alternatives rejected:
  - (a) Keep "requested": intent と execution の曖昧化。DO NOT: 意図を completion status に含めない。Temptation: planning tracking が便利
  - (c) Add "pending": 状態機械の複雑化。DO NOT: 曖昧性未解消で新 status を追加しない。Temptation: 細分化したい
- Consequence: evidence report は captured/skipped/failed のみ。"captured" は actual execution evidence を要求

### DR-0104

- Date: 2026-03-31
- Title: Implement all 4 browser QA phases
- Status: adopted
- Context: browser QA phase runner のスコープ選定 (smoke/visual/interaction/accessibility)
- Decision: 全 4 phase を実装 (option a)。partial/foundation-only は dishonest reporting を生む
- Alternatives rejected:
  - (b) Smoke+visual only: interaction/accessibility が stub のまま。DO NOT: stub のまま phase を登録しない。Temptation: 2 phase だけ先行実装
  - (c) Foundation-only: 全 phase available 表示で無意味な結果。DO NOT: 実装なしで expose しない。Temptation: 後で実装
- Consequence: 4 phase runner が実際の分析結果を返す。honest empty findings は true empty のみ許可

### DR-0105

- Date: 2026-03-31
- Title: Skip v1.7.10 — proceed directly to v1.7.11
- Status: adopted
- Context: v1.7.10 は未リリース。v1.7.9 からの次リリース番号の選定
- Decision: v1.7.10 をスキップし v1.7.11 に直接進む (option b)
- Alternatives rejected:
  - (a) Release v1.7.10 retroactively: 実体のないバージョンがタイムラインに混入。DO NOT: 未リリース番号を retroactively 発行しない。Temptation: 番号の連続性を保ちたい
- Consequence: v1.7.11 が v1.7.9 直後の completion release として位置づけ

### DR-0106

- Date: 2026-04-01
- Title: v1.7.12 4-axis template complete removal（discussion-20260401215536131 D-004）
- Status: adopted
- Context: DR-0087 で段階的移行（v1.7.8 warning → v1.8.0 error）を採用していたが、v1.7.12 で init 生成物から旧 4-axis テンプレートを完全削除する判断。deprecation marking 完了済みのため移行猶予を充分に確保
- Decision: v1.7.12 で旧 4-axis テンプレート（20_eval_axis_usability, 21_consistency, 22_accessibility, 23_delight）をアクティブパスから完全削除。新規 3-layer ファミリー（invariant, trend-derived, product-specific, aggregate, dynamic-overrides）のみをデフォルトとする
- Alternatives rejected:
  - (a) 並行維持: 1リポジトリ2真実の状態が継続。DO NOT: 旧 4-axis をアクティブデフォルトに残さない。Temptation: 変更リスクを避けたい
- Consequence: init 生成、バリデータ、テストすべてが新ファミリーのみを参照
- Evidence: discussion-20260401215536131 D-001, D-004, R-001

### DR-0107

- Date: 2026-04-01
- Title: HTML/CSS mock → optional/fallback（discussion-20260401215536131 D-002）
- Status: adopted
- Context: spec-0010 の AC/TC が HTML/CSS mock を UI-bearing 完了の必須要件として記載。v1.7.12 canonical truth model では visual layout は discussion アーティファクトに属し、spec/policy の完了条件ではない
- Decision: HTML/CSS mock を optional/fallback に降格。spec/policy/validator で completion gate として使用しない
- Alternatives rejected:
  - (a) HTML/CSS mock 完全削除: フォールバック価値が残る。DO NOT: 完全削除しない（discussion 内でオプション利用可）。Temptation: 不要物を全て消したい
- Consequence: AC/TC rewrite, validator 期待値変更
- Evidence: discussion-20260401215536131 D-002, R-003

### DR-0108

- Date: 2026-04-01
- Title: Prototyping skill-centered truth（discussion-20260401215536131 D-003）
- Status: adopted
- Context: spec-0012 は CLI コマンド削除を記録済みだが、\_policies/docs/steering が `qfai prototyping` コマンドを現行として記述。v1.7.12 で全レイヤーを統一
- Decision: `/qfai-prototyping` スキルをユーザー向け唯一の真実とし、CLI コマンド参照をすべて削除
- Alternatives rejected:
  - (a) CLI コマンド復活: v1.7.12 correction release のスコープ外。DO NOT: 存在しないコマンドを文書化しない。Temptation: CLI command-first の方が伝統的
- Consequence: README, steering, policy, spec すべてからコマンド参照削除
- Evidence: discussion-20260401215536131 D-003, R-002

### DR-0109

- Date: 2026-04-01
- Title: README command count 6 → 5（discussion-20260401215536131 D-005）
- Status: adopted
- Context: README.md/product.md が 6 コマンドと記載しているが、実装は 5 コマンド（init, validate, report, doctor, guardrails）
- Decision: 正しいコマンド数 5 に修正
- Alternatives rejected:
  - (a) prototyping command 復活で 6 に: DR-0108 と矛盾。DO NOT: 未実装コマンドを数に含めない。Temptation: ドキュメントの数字が大きい方が印象が良い
- Consequence: docs/steering 修正
- Evidence: discussion-20260401215536131 D-005

### v1.7.13 Canonical Sidecar Convergence (implementation-derived, 2026-04-04)

### DR-0093: Canonical/Legacy Validator Separation

- Decision: production-path `validate.ts` に `runCanonicalUixValidators()` のみを登録し、DDP validators を `legacy/` namespace に移動する
- Context: 旧 monolithic `uixValidators.ts` が canonical と legacy の責務を混在させていた
- Rationale: production path の信頼性向上と legacy migration tooling の分離。canonical validators は `category: "canonical"` を emit し、downstream tooling で区別可能
- Rejected: legacy validators を production path に残す（canonical contract 違反の検出精度が下がる）
  - DO NOT: legacy validator を validate.ts pipeline に登録しない。Temptation: 後方互換性のために残したい

### DR-0094: prototyping.yaml as Required Side Artifact

- Decision: discussion-pack の必須アーティファクトとして prototyping.yaml を追加し、SDD preflight のブロッカーとする
- Context: prototyping mode recommendation が discussion-pack 内に構造化されておらず、mode 選択の根拠がトレースできなかった
- Rationale: prototyping.yaml により mode selection の根拠が明示的にキャプチャされ、SDD preflight で schema validation が可能になる
- Rejected: prototyping.yaml を optional にする（mode recommendation の欠落を検出できない）
  - DO NOT: prototyping.yaml を optional にしない。Temptation: 非 UI プロジェクトでは不要に見える

### DR-0095: Existence-Based Precedence (D-5)

- Decision: prototyping.yaml 内の `prototyping` key の存在自体（値の妥当性ではなく）で namespaced contract を権威的とする
- Context: 旧実装では値の妥当性チェックで legacy fallback が発動し、意図しない mode 選択が発生していた
- Rationale: key existence check により、malformed な namespaced block でも legacy fallback を防止し、明示的なエラーを表示する
- Rejected: 値の妥当性に基づく precedence（legacy fallback が silent に発動する）
  - DO NOT: 値ベースの precedence を使わない。Temptation: 空の prototyping block でもデフォルトにフォールバックしたい

### DR-0096: IssueCategory "canonical" 追加

- Decision: IssueCategory type に "canonical" を追加し、新規 canonical validator が emit する issue の category とする
- Context: "compatibility" と "change" の 2 値では canonical contract violation と legacy warning を区別できなかった
- Rationale: downstream tooling（report, CI checks）が canonical vs compatibility vs change を区別可能になる

### DR-0097: Report Prototyping Section as Foundation-Only

- Decision: report.ts に prototyping observability section を追加するが、v1.7.13 では blocking validation には統合しない
- Context: prototyping data の品質が安定するまで、observability としてのみ提供する
- Rationale: foundation-only として段階的に導入し、将来の validation 統合に向けた data model を確立する

### DR-0098: Harness Loop Status Normalization

- Decision: harness loop の termination status を "converged" / "max-iterations" に正規化する（旧 "accepted" / "cap-reached" を置換）
- Context: evidence summary が "accepted" を参照していたが、loop が "converged" を emit していたため、switch case が一致しなかった（バグ）
- Rationale: terminology alignment + bug fix

### DR-0099: ModeGuidance "premium" → "full-harness"

- Decision: ModeGuidance.recommend() が返す mode を "premium" から "full-harness" に変更し、有効な PrototypingMode 値にする
- Context: "premium" は PrototypingMode の有効値ではなく、type mismatch が silent に発生していた
- Rationale: type safety + terminology alignment

### DR-0100: Prototyping Calibration Config Block

- Decision: qfai.config.yaml に prototyping.calibration stanza を追加し、デフォルト値（accept: 0.8, refine: 0.5, maxIterations: 15）を設定する
- Context: calibration thresholds がハードコードされており、プロジェクト固有の調整ができなかった
- Rationale: config-driven calibration により、プロジェクトごとのチューニングが可能になる

### v1.7.13 補完 (コミット履歴分析由来, 2026-04-04)

### DR-0101: Phase1 Ratchet Mechanism

- Decision: config.uiux.phase1ReleaseDate 設定時、リリース日から 30 日以内の UIX-VAL-\* エラーを warning に降格する
- Context: canonical UIX validator の初期ロールアウト期間中に hard failure が多発すると採用障壁が高くなる
- Rationale: 30 日の grace period で段階的な移行を可能にし、期限後は full enforcement に移行

### DR-0102: DDH Validator Sidecar Source Mapping

- Decision: discussionDesignHardening の 7 バリデータを sidecar-first モデルに完全書き換え。読み取り先を 03_Story-Workshop.md DDS セクションから uiux/ sidecar ファイルに変更
- Context: DDS セクションは monolithic で保守性が低く、sidecar ファイルは modular
- Rationale: 各バリデータが明確な sidecar ファイルを primary source として参照することで、責務分離と保守性向上

### DR-0103: State Coverage Required States Change

- Decision: state coverage 必須状態を ["empty","loading","error","populated"] から ["default","loading","empty","error"] に変更
- Context: "populated" は "default" の部分集合であり、"default" が初期表示状態としてより正確
- Rationale: "default" は画面の初期表示を意味し、populated/empty は default の variant として扱う方が概念的に正しい

### DR-0104: Nested Bullet Canonical Format with CSV Fallback

- Decision: strategy と screen contract の list-type フィールドに nested bullet list を canonical format とし、CSV inline を legacy fallback として維持
- Context: CSV format では複雑なデータ構造の表現力が不足
- Rationale: nested bullet は可読性と構造化に優れ、CSV fallback は既存パックの後方互換性を維持

### DR-0105: QFAI-VIS-002 Severity Downgrade to Info

- Decision: HTML+CSS visual mock 不在の QFAI-VIS-002 を warning → info に降格
- Context: sidecar-first モデルで HTML mock は primary truth ではなく optional fallback
- Rationale: sidecar artifacts が primary UI definition となり、HTML mock の不在は品質問題ではなくなった

### DR-0106-A: QFAI-AUD-021 Selected Direction Audit Rule

- Decision: uiux/31_selected_anchor_screen.md に `## Selected Direction` セクションが存在しない場合に QFAI-AUD-021 error を追加
- Context: selected direction は sidecar-first モデルの中核的 design decision。v1.7.13 で 30_comparison.md から 31_selected_anchor_screen.md に分離
- Rationale: design audit で selected direction の存在を強制し、設計意思決定の欠落を防止

### DR-0107-A: Canonical Barrel Isolation

- Decision: validators/index.ts（canonical barrel）からの legacy/ re-export を禁止
- Context: barrel export に legacy validator が混入すると production path の信頼性が低下
- Rationale: 明確な module boundary により、意図しない legacy validator の production path 混入を構造的に防止

### DR-0108: compatibility IssueCategory 完全削除 (v1.7.14)

- Decision: IssueCategory union type から "compatibility" を完全削除し、"canonical" | "change" のみとする
- Context: v1.7.13 で canonical/legacy validator 分離を導入したが、IssueCategory に "compatibility" が残存しており意味が曖昧だった
- Rationale: QFAI v1.7.14 は current-only SSOT を宣言するリリース。legacy/compatibility の概念を型レベルで排除し、全 issue を "canonical"（仕様準拠性）または "change"（変更追跡）に二分することで、レポート出力とバリデータのカテゴリ体系を単純化する
- Rejected-A: "compatibility" を "legacy" にリネームして残す（legacy 自体が current-only SSOT に反する）
  - DO NOT: IssueCategory に compatibility/legacy/migration を意味するカテゴリを再導入しない。Temptation: 後方互換チェックのためにカテゴリを残したい

### DR-0109: Canonical Prototyping Surfaces — -ui suffix 廃止 (v1.7.14)

- Decision: PrototypingSurface を web-ui/mobile-ui/desktop-ui から web/mobile/desktop/cli/mixed の 5 値に変更。"non-ui" は prototyping surface 外の分類とする
- Context: v1.7.13 では web-ui 等の -ui suffix 付き surface が存在し、"non-ui" も prototyping surface に含まれていた
- Rationale: -ui suffix は冗長（prototyping 自体が UI 関連前提）。cli を新規追加し、non-ui を prototyping surface 外に明示的に分離することで、discussion UI-bearing 判定と prototyping surface 列挙の混同を解消する
- Rejected-A: -ui suffix を維持し cli だけ追加（suffix の不統一が拡大する）
  - DO NOT: prototyping surface 名に -ui suffix を復帰させない。Temptation: 既存パックとの互換性のため

### DR-0110: Surface Classification 二分割 — discussion UI-bearing vs visual/browser evidence (v1.7.14)

- Decision: "UI-bearing" 判定を 2 つの独立した関数に分割: isDiscussionUiBearingPrototypingSurface()（web/mobile/desktop/cli/mixed）と requiresVisualBrowserEvidenceSurface()（web/mobile/desktop/mixed、cli 除外）
- Context: v1.7.13 では単一の isUiBearingSurface() で discussion pack 構造要件と prototyping evidence 義務の両方を判定していた。cli は discussion UI-bearing だが browser evidence は不要
- Rationale: cli surface は UI 定義ファイル（sidecar 等）を必要とするが、screenshot/Playwright による visual evidence は不要。関心事の分離により、cli パックが誤って browser QA 義務を課されることを防止する
- Rejected-A: cli を非 UI-bearing に分類する（cli も UI 設計意図の文書化が必要）
  - DO NOT: cli を discussion UI-bearing から除外しない。Temptation: cli は CUI だから UI-bearing ではないと思う

### DR-0111: Strict Classification Validation — 矛盾検出ゲート (v1.7.14)

- Decision: readValidatedClassificationBlock() を新設し、分類ブロック内の意味的矛盾（ui_bearing=false + 空でない secondary_surfaces、ui_bearing=true + primary_surface=non-ui 等）を hard error とする
- Context: v1.7.13 の readClassificationBlock() はパース結果を返すのみで、矛盾チェックは各 validator が個別に実施していた
- Rationale: execution.ts 等の本番パスが invalid classification で動作継続するリスクを排除。矛盾検出を parser 層の共通ゲートに集約し、全消費者が一貫した strict validation を受ける
- Rejected-A: validator 個別チェックを維持（重複実装と不整合リスク）
  - DO NOT: execution path で readClassificationBlock()（non-strict）を使用しない。Temptation: strict validation が重すぎるケースがあるかも

### DR-0112: Namespaced-Only Schema — legacy top-level keys hard-reject (v1.7.14)

- Decision: prototyping.yaml の legacy top-level recommendation keys（recommended_mode, allowed_modes 等）が存在する場合、namespaced `prototyping:` ブロックの有無に関わらず hard error とする
- Context: v1.7.13 の existence-based precedence（DR-0095）では namespaced block 優先だが legacy keys は warning（QFAI-PROT-231/232）で許容していた
- Rationale: current-only SSOT リリースとして、legacy schema の存在自体を構造的に禁止する。warning→error 昇格により、migration 期間を明確に終了させる
- Rejected-A: warning を維持し v1.8.0 で error に昇格（migration 延長は convergence を遅延させる）
  - DO NOT: legacy top-level keys の存在を warning で許容しない。Temptation: 既存プロジェクトへの影響を緩和したい

### DR-0113: Semantic Invariant SSOT — recommended_mode ∈ allowed_modes (v1.7.14)

- Decision: validateRecommendationSemantics() を recommendationSemantics.ts に新設し、recommended_mode が allowed_modes に含まれることを validator/runtime/execution/CLI の全レイヤーで共有する SSOT とする（QFAI-PROT-154）
- Context: v1.7.13 では semantic mismatch チェックが validator（prototypingRecommendation.ts）のみに存在し、execution/CLI パスは未検証だった
- Rationale: semantic invariant の検証漏れは runtime error に直結する。shared helper を単一の真実源とし、parser（extractRecommendation）、resolver、execution、CLI、validator、preflight の全レイヤーが同一ロジックを参照する
- Rejected-A: execution.ts に個別チェックを追加（重複実装、不整合リスク）
  - DO NOT: semantic invariant チェックを helper 以外の場所に実装しない。Temptation: 各レイヤーに inline で書く方が早い

### DR-0114: Canonical Strategy Decision Vocabulary (v1.7.14)

- Decision: strategy decision フィールド（decision, chosen_option, candidate_options）に canonical enum（template, component-library, design-system, native-pattern, bespoke, none）を導入し、free-form text を禁止する
- Context: v1.7.13 の strategy validator は 8 フィールドの構造チェックのみで、decision の値は任意文字列だった
- Rationale: canonical vocabulary により、strategy 意思決定の比較・集計・自動分析が可能になる。selection_required=true → ≥2 candidates + non-"none" decision、selection_required=false → decision="none" の状態機械を強制し、意味的整合性を保証する
- Rejected-A: free-form を許容し enum は推奨のみとする（比較・集計が困難）
  - DO NOT: strategy decision フィールドに canonical enum 外の値を許容しない。Temptation: プロジェクト固有の選択肢を自由入力したい

### DR-0115: Current-Only SSOT — migration/defer wording 完全削除 (v1.7.14)

- Decision: product.md, manifest.md 等の steering ドキュメントから v2.0 defer、legacy deprecation、reconsidered-in-v2.0、migration guide 等の wording を完全削除する
- Context: v1.7.13 までの steering docs には「v2.0 で再検討」「legacy は deprecated」等の migration 期間の名残が存在
- Rationale: v1.7.14 は current-only SSOT リリース。shipped ドキュメントは現在の仕様のみを記述し、将来の移行や過去の互換性に関する言及を排除する。これにより、ドキュメント読者が migration status を誤解するリスクを排除する
- Rejected-A: migration 履歴を appendix として残す（current-only 原則に反する）
  - DO NOT: steering/product/manifest に migration/defer/reconsidered wording を再導入しない。Temptation: 経緯を残したい

### DR-0116: Independent Evaluator Panel 3-Layer Structure (v1.7.14)

- Decision: full-harness mode の反復改善ループに 3 層独立評価パネルを導入。L1: product-surface-reviewer（UI/UX design quality）、L2: product-experience-architect（product experience）、L3: qa-gatekeeper（process audit）
- Context: 2 つのインシデントレポートで、generator が自己評価を行い、品質スコアを過大に報告する self-evaluation bias が確認された。scoringTrace のスコアが改善なしに converged と判定されるケースや、独立した reviewer の invocation が fabricated names で偽装されるケースが発生
- Rationale: L1/L2 を task tool の background mode で別コンテキスト起動し、改善履歴・前回スコア・generator 計画を入力から排除することで、構造的にバイアスを排除する。weightedTotal は L1/L2 の最小値とし、一方のみの高スコアでは accept に至らない設計。product-experience-architect は kind: worker のため review-profiles.yml ではなく agent-routing.yml の evidence phase に配置
- Rejected-A: 単一 reviewer による評価（multi-perspective 評価ができず、blind spot が残る）
  - DO NOT: full-harness の iteration evaluation を単一エージェントで実施しない。Temptation: reviewer 1 名で十分と思う
- Rejected-B: product-experience-architect を review-profiles.yml の always_required に登録（kind: worker のため QFAI-AGENT-010 validator が reject）
  - DO NOT: kind: worker のエージェントを review-profiles.yml に登録しない。Temptation: 全 evaluator を review profile に統一管理したい

### DR-0117: Score Scope Separation — Discussion ≠ Prototyping (v1.7.14)

- Decision: discussion 3-layer aggregate scores（design direction quality）と prototyping scoringTrace（implementation fidelity）を明確に分離し、コピーを禁止する
- Context: インシデントレポートで、discussion 完了時の aggregate scores がそのまま prototyping scoringTrace にコピーされ、実装品質の独立評価が行われなかったケースが確認された。結果として全イテレーションが同一スコアで converged と偽装された
- Rationale: discussion scores は「どのデザイン方向が最も評価基準を満たすか」（what）を測定し、prototyping scores は「選択したアンカーに対する実装品質がどの程度か」（how well）を測定する。評価対象が根本的に異なるため、スコアの再利用は意味的に不正
- Rejected-A: discussion scores を prototyping の初期値として使用（評価対象の違いにより、初期値としても不適切）
  - DO NOT: discussion aggregate scores を prototyping scoringTrace の初期値・参照値として使用しない。Temptation: discussion で高スコアなら prototyping も高スコアから始めたい
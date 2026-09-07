# 08 Decisions

## Decisions

### DR-0018: Contract-first downstream

116 items — discussion-20260312143000000（symlink アーキテクチャ移行）、
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
discussion-20260330035428071（Canonical Convergence）、
discussion-20260414195449523（v1.7.15 rev4 Browser QA chain）、
discussion-20260416023323603（v1.7.15 rev8 leaf-field ref grammar closure）、
および discussion-20260416092414328（v1.7.15 rev9 leaf-field traceability closure）で解決された OQ に基づく。

- Decision: `/qfai-sdd` 以降の downstream skill / validate / verify は discussion pack を直接読まず、`specs + .qfai/contracts/**` を truth source とする
- Context: discussion-side UIUX artifacts を downstream execution truth に使うと、skill ごとに read-order が分岐し drift が起きる
- Rationale: discussion は upstream authoring、contracts は downstream execution という境界を固定すると、validate/verify と skill の責務が単純になる
- Rejected-A: downstream も discussion pack を直接読めるようにする
  - DO NOT: downstream の fallback source に discussion pack を残さない。Temptation: 既存 sidecar をそのまま使いたい

### DR-0019: Canonical UIX validators are direct-pack only

- Decision: `runCanonicalUixValidators` は direct discussion-pack validation 用に限定し、repo-root downstream validate の production path とはみなさない
- Context: 旧 posture では canonical runner が repo-root validate の主経路だったが、current code は contract-first validator 群を primary path にしている
- Rationale: direct-pack validation と downstream validate を分けることで、discussion quality gate と execution quality gate の境界が明確になる
- Rejected: canonical runner を repo-root validate の唯一経路として残す
  - DO NOT: latest discussion pack の暗黙解決を downstream validate に戻さない。Temptation: 1 runner に統合したい

### DR-0020: Web Research spec ID convergence

- Decision: Web Research Enhancement の active spec は `spec-0016` とし、`spec-0034` は historical migration record に降格する
- Context: `_policies/03_Capabilities.md` では active capability ID が `CAP-0016` であり、`spec-0034` は orphan ID になっていた
- Rationale: CAP-to-spec mapping を 1:1 に戻し、slice policy と capability table を一致させる
- Rejected: `spec-0034` を active のまま残す
  - DO NOT: active capability mapping に orphan spec ID を残さない。Temptation: 既存番号を触りたくない

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
- Status: RE-OPENED — spec-0003 DR-0003-0012 が本決定を置き換える。配布 asset に `.codex/agents/` が存在せず、`qfai init` を実行したプロジェクトの Codex には agent が 1 件も届かないという前提誤りが根拠。以降 `.codex/agents/*.toml` は `qfai init` の生成物として扱う（上記 Rejected / DO NOT はこの spec-0003 の範囲では失効）

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

### DR-0106-A: QFAI-AUD-021 Selected Direction Audit Rule (SUPERSEDED)

- **Status**: SUPERSEDED by the exploration-first rebuild (no live validator emits this code's original definition).
- Decision: legacy single-winner sidecar に required selected-direction section が存在しない場合に migration error を追加
- Context: 当時の sidecar-first モデルでは winner selection が discussion artifact に埋め込まれていたが、この posture は exploration-first rebuild で superseded となった
- Rationale: design audit で selected direction の存在を強制し、設計意思決定の欠落を防止
- **ID reuse note (CHG-006 / v1.9.2)**: the `QFAI-AUD-021` finding code has been re-bound to the new closed-schema structured `primary_tasks` rejection (DR-0013-0004, REQ-0164). The legacy "Selected Direction Audit Rule" semantics are dead code — no validator surface emits the original meaning. Future cross-references to `QFAI-AUD-021` MUST mean the v1.9.2 closed-schema rule; the legacy DR-0106-A entry is retained only as historical record. Live wiring lives at `core/validators/designAudit.ts` and the per-spec test files under `tests/unit/core/validators/auditProfile*.test.ts` + `tests/integration/primaryTasksStructured.test.ts`.

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

### DR-0200: converged requires iterationCount>=2 (v1.7.15)

- Decision: converged 判定は iterationCount >= 2 を必須条件とし、CalibrationLoader schema で plateauLookback >= 2 を強制する
- Status: Adopted

### DR-0201: Reviewer placeholder reject list frozen (v1.7.15)

- Decision: reviewer placeholder reject list を "qfai", "default", "auto", "system", "unknown", "" の 6 値に凍結。resolvedReviewer ?? "qfai" フォールバック禁止
- Status: Adopted

### DR-0202: commitSha mandatory in full-harness (v1.7.15)

- Decision: full-harness 実行時に commitSha を必須とし、取得不能時は runtime error
- Status: Adopted

### DR-0203: packVersion from pack metadata only (v1.7.15)

- Decision: packVersion は CalibrationLoader 経由で pack metadata から動的取得。ハードコード禁止
- Status: Adopted

### DR-0204: weightedTotal = min(l1.total, l2.total) always (v1.7.15)

- Decision: computeWeightedTotal は常に Math.min(l1.total, l2.total) を返す
- Status: Adopted

### DR-0205: specCoverage from real diffs only (v1.7.15)

- Decision: specCoverage は実 spec/runtime evidence から導出。zero-seeded 出力を禁止
- Status: Adopted

### DR-0206: uiFidelity observation-only (v1.7.15)

- Decision: uiFidelity は DOM parse / browser QA / render evidence からのみ構成。synthetic mockPaths pass を禁止
- Status: Adopted

### DR-0207: CalibrationLoader wired in execution.ts (v1.7.15)

- Decision: CalibrationLoader は execution.ts で loadConfig() 後に呼び出す（config.ts ではない）
- Status: Adopted

### DR-0208: Fail-fast no silent fallback (v1.7.15)

- Decision: 必須 evidence 欠落時は runtime error で即座に失敗。デフォルト値補完を禁止
- Status: Adopted

### DR-0209: Pre-scored l1/l2 path elimination (v1.7.15 rev2)

- Decision: runFullHarness() の request 型から l1/l2 を削除。scoring は runtime 内部で一元実行。panelInputs 欠如時は即 throw
- Context: request.l1/l2 が外部で pre-scored された値を受け入れ、runtime が scoring をスキップする経路が存在した。これにより evidence-grounded でないスコアが converged 判定に使用される
- Rationale: scoring の唯一の経路を runtime 内に閉じることで、evidence からの逸脱を構造的に防止
- Rejected: request.l1/l2 を optional で残す（silent bypass の温床になる）
  - DO NOT: request 型に pre-scored path を残さない。Temptation: 後方互換のため optional にしたい
- Status: Adopted

### DR-0210: l2Evidence.ts new file for real artifact derivation (v1.7.15 rev2)

- Decision: l2Evidence.ts を packages/qfai/src/core/prototyping/ に新設。buildDiscussionAxisInputs / buildScreenContractInputs / buildTrendAlignmentInputs で実 artifact から L2 入力を導出
- Context: execution.ts 内で L2 dummy object（aggregateScore:0, evidenceRefs:[]）が inline 生成されていた
- Rationale: 実 artifact 読み取りを専用モジュールに集約し、dummy object の再発を防止。evidence 不足時は throw
- Rejected: execution.ts 内に inline で build 関数を追加（モジュール責務の曖昧化）
  - DO NOT: L2 evidence 導出を execution.ts に埋め込まない。Temptation: 1 ファイルで完結させたい
- Status: Adopted

### DR-0211: CalibrationLoader fail-open removal (v1.7.15 rev2)

- Decision: CalibrationLoader の全 fail-open パスを削除。DEFAULT_PACK fallback / version="1.0.0" 補完 / thresholds 欠落時の default 値注入を廃止
- Context: pack 不在でも DEFAULT_PACK で続行できたため、calibration なしの full-harness 実行が可能だった
- Rationale: fail-closed 設計により calibration pack の存在と正当性を構造的に保証
- Rejected: DEFAULT_PACK を pack 不在時のみの safe default として維持（fail-open の最後の砦になる）
  - DO NOT: CalibrationLoader に fallback を残さない。Temptation: 初回セットアップの摩擦を減らしたい
- Status: Adopted

### DR-0212: TerminationContext receives CalibrationPack only (v1.7.15 rev2)

- Decision: history.ts の computeTerminationReason() / computeStatus() は { calibration: CalibrationPack; history: FullHarnessHistory } を受ける。pack 以外からの plateauLookback 解決を廃止
- Status: Adopted

### DR-0213: Screen-level UiObservation with ScreenObservation type (v1.7.15 rev2)

- Decision: UiObservationSummary を ScreenObservation[] ベースに再構築。flatten 集約を廃止し screen-level で観測結果を保持
- Context: 全 screen の DOM labels / actions / mockPaths を flatten して集約していたため、screen 単位の品質判定が不可能だった
- Rationale: screen-level 保持により個別 screen の insufficient-evidence 検出が可能に。uiFidelityBuilder も screen 単位で observed を構築
- Rejected: flatten 集約を維持し summary 内に screen breakdown を追加（二重構造）
  - DO NOT: flatten 集約と screen-level を並存させない。Temptation: 後方互換のため両方持ちたい
- Status: Adopted

### DR-0214: bundleWriter schema v2 only (v1.7.15 rev2)

- Decision: bundleWriter は schema v2（8 カテゴリ evidenceRefs + FullHarnessIteration 新型）のみ出力。v1/v2 並存を禁止
- Status: Adopted

### DR-0215: Validator 14-rule error upgrade (v1.7.15 rev2)

- Decision: prototypingEvidence.ts の 14 項目を warning から error に昇格。新 semantic 変更分は新 rule ID に分離
- Status: Adopted

### DR-0216: DB coverage binary policy (v1.7.15 rev2)

- Decision: declared DB objects ありで観測なしの場合は full-harness failure。「常に missing 扱いで続行」を禁止
- Status: Adopted

### DR-0217: cli/full-harness reject at 4 layers (v1.7.15 rev4)

- Decision: `cli` + `full-harness` の組み合わせを CLI / derivePrototypingObligations / runFullHarness / バリデータの 4 層で拒否する
- Status: Adopted
- Rationale: non-UI surface で full-harness を実行しても無意味な Browser QA サイクルが走るだけ。3 層（rev2 DR-0210）から 4 層に拡張
- Alternatives: (A) CLI 層のみで拒否 — 不十分、バイパス可能 / (B) 4 層防御 (adopted)
- Source: discussion-20260414195449523, WS-1

### DR-0218: screen contract-based Browser QA targets (v1.7.15 rev4)

- Decision: Browser QA ターゲットを `"/primary"` 固定値から `40_screen_contracts.md` のスクリーン定義に基づく動的導出に変更
- Status: Adopted
- Rationale: 固定値では複数画面の測定漏れが発生し、監査で齟齬として検出された
- Alternatives: (A) "/primary" 維持 — 測定漏れ / (B) screen contract 導出 (adopted)
- Source: discussion-20260414195449523, WS-2

### DR-0219: Browser QA evidence chain hard-fail on empty (v1.7.15 rev4)

- Decision: `iterations[].evidenceRefs.browserQa` が空の場合はハードフェイルとし、サイレントパスを禁止
- Status: Adopted
- Rationale: エビデンスチェーン中断は監査追跡不能を意味する。fail-closed ポリシーの一環
- Alternatives: (A) 空でも続行 — 監査チェーン断裂 / (B) ハードフェイル (adopted)
- Source: discussion-20260414195449523, WS-3

### DR-0220: canonical route semantics for runtimeGate/specCoverage (v1.7.15 rev4)

- Decision: `runtimeGateBuilder.ts` / `specCoverage.ts` で URL ではなく canonical path（正規パス）で比較する
- Status: Adopted
- Rationale: クエリパラメータやフラグメントを含む URL が誤って別ルートと判定されるバグを排除
- Alternatives: (A) URL そのまま使用 — 誤判定 / (B) canonical path 比較 (adopted)
- Source: discussion-20260414195449523, WS-4

### DR-0221: L2 structured parse priority over heuristic (v1.7.15 rev4)

- Decision: L2 エビデンス収集で構造化パース（20-23 系、04_Sources.md、40_screen_contracts.md）を優先し、ヒューリスティックフォールバックは構造化ソース不在時のみ許可
- Status: Adopted
- Rationale: ヒューリスティック依存はエビデンス精度と再現性を低下させる
- Alternatives: (A) ヒューリスティック優先 — 精度低下 / (B) 構造化パース優先 (adopted)
- Source: discussion-20260414195449523, WS-5

### DR-0222: parameterized route pattern-based matching (v1.7.15 rev4, OQ-0004 resolution)

- Decision: Browser QA のパラメタライズドルート（e.g., `/orders/:id`）のマッチングにパターンベースマッチング（Option B）を採用
- Status: Adopted
- Rationale: exact match のみでは動的ルートの Browser QA エビデンスチェーンが断裂する。canonical normalization はオーバーエンジニアリング
- Alternatives: (A) Exact match only — 動的ルート未対応 / (B) Pattern-based matching (adopted) / (C) Canonical normalization — 過度な複雑化
- Source: discussion-20260414195449523, OQ-0004

### DR-0223: ui[] row validation inline in prototypingEvidence.ts (v1.7.15 rev9, OQ-0001 resolution)

- Decision: `runtimeGate.ui[]` 行レベル3フィールド（declaredRef/renderEvidenceRefs[]/browserQaEvidenceRefs[]）の validation を `prototypingEvidence.ts` 内インラインで実装（Option A）
- Status: Adopted
- Rationale: design doc §6-1-2 が変更ファイルとして `prototypingEvidence.ts` を明示。小規模な凝集した validation ユニットを別モジュールに抽出してもアーキテクチャ上の利点がない。インラインは凝集性を保つ
- Alternatives: (A) inline in prototypingEvidence.ts (adopted) / (B) extract validateRuntimeGateUiRow() to separate utility — 不要な module 分割
- Source: discussion-20260416092414328, OQ-0001

### DR-0224: browserQaEvidenceRefs[] always required non-empty (v1.7.15 rev9, OQ-0002 resolution)

- Decision: `runtimeGate.ui[].browserQaEvidenceRefs[]` は「browser QA 未実施」の場合でも常に required non-empty とし、空配列はハードフェイル（Option A）
- Status: Adopted
- Rationale: design doc §3-2 の fail-closed ポリシー。rev8 OQ-0003 で `runtimeGate.evidenceRefs` 空配列を拒否した precedent と一貫させる。空を許可するとビルダーが空を出力して validator がパスする抜け穴になる
- Alternatives: (A) always required non-empty (adopted) / (B) allow empty when no browser QA run — fail-closed 違反
- Source: discussion-20260416092414328, OQ-0002

### DR-0225: per-axis evidenceRefs validation granularity (v1.7.15 rev9, OQ-0003 resolution)

- Decision: `fullHarness.iterations[].l1/l2.axes[].evidenceRefs[]` の validation を per-axis 粒度で実施（Option A）。任意の axis が空配列であれば validator error
- Status: Adopted
- Rationale: design doc §6-1-3 の per-element 記述に準拠。集約レニエンシー（全 axis が空のときのみエラー）を許すと一部の axis がエビデンスなしでもパスする
- Alternatives: (A) per-axis validation (adopted) / (B) aggregate leniency — per-axis traceability contract を破壊
- Source: discussion-20260416092414328, OQ-0003

### DR-0226: full README enumeration of all concrete-ref leaf fields (v1.7.15 rev9, OQ-0004 resolution)

- Decision: README に concrete-ref contract の全 leaf フィールド（ui[].declaredRef、ui[].renderEvidenceRefs[]、ui[].browserQaEvidenceRefs[]、axes[].evidenceRefs[]、reviewerLogs[].evidenceRefs[]）を明記（Option A）
- Status: Adopted
- Rationale: DoD §5-6「docs/validator partial-strictness mismatch をゼロにする」が hard gate。design doc §9 が「README の表現を弱めて整合したことにする」を明示禁止している
- Alternatives: (A) full enumeration (adopted) / (B) minimal note — DoD §5-6 違反
- Source: discussion-20260416092414328, OQ-0004

### DR-0227: UI-bearing discussion requires design guideline research (v1.7.17)

- Decision: UI-bearing discussion では Trend Scan に加えて design guideline research を mandatory step とする。Material Design / WCAG / Apple HIG / platform/library guideline など、project-context に応じた参照を少なくとも 1 系統含める
- Status: Adopted
- Rationale: visual quality failure の root cause が prototyping ではなく upstream research 欠落であるため、discussion で閉じる必要がある
- Alternatives: (A) prototyping skill で後追い補正 — root cause を閉じられない / (B) discussion mandatory step 化 (adopted)
- Source: discussion-20260418170937652, DR-001

### DR-0228: `design_guideline_research` becomes canonical Trend Scan category (v1.7.17)

- Decision: `04_Sources.md` の canonical category に `design_guideline_research` を追加する
- Status: Adopted
- Rationale: guideline evidence を既存 source registry と同じ traceability surface に置くことで、validator と downstream spec が同じ SSOT を参照できる
- Alternatives: (A) 別ファイル新設 — category drift / (B) 04_Sources に統合 (adopted)
- Source: discussion-20260418170937652, DR-002

### DR-0229: Trend-derived `score_anchors` require quantitative proxy and warning-first rollout (v1.7.17)

- Decision: legacy trend-derived scoring artifact の `score_anchors` は抽象形容詞のみを禁止し、px 値 / 比率 / rule ID / class 名 / library default などの quantitative proxy を 1 つ以上含める。validator severity は v1.7.17 では warning とする
- Status: Adopted
- Rationale: concreteness がない anchor は高スコアでも低品質 UI を通してしまう。一方で既存 pack 影響は staged rollout が妥当
- Alternatives: (A) 即時 error — migration shock / (B) warning-first ratchet (adopted)
- Source: discussion-20260418170937652, DR-003 / OQ-0003 resolution

### DR-0230: Validator ownership split = trendScan coverage + scoringReady concreteness (v1.7.17)

- Decision: guideline coverage validator は `packages/qfai/src/core/validators/uix/trendScan.ts` を拡張し、anchor concreteness validator は `packages/qfai/src/core/validators/uix/scoringReady.ts` を拡張する。top-level 新規 validator を追加しない
- Status: Adopted
- Rationale: category completeness は sources schema の責務、anchor concreteness は scoring-ready schema の責務であり、現行 canonical validator 境界と一致する
- Alternatives: (A) 新規 top-level validator — ownership split を曖昧化 / (B) 既存 uix module 拡張 (adopted)
- Source: discussion-20260418170937652, DR-004 / OQ-0004 resolution

### DR-0231: Brave Search MCP を primary search provider とする (v1.8.0)

- Decision: Web Research Enhancement の primary search MCP は Brave Search を採用する
- Status: Adopted
- Rationale: community adoption、ドキュメント整備、CLI エージェントとの統合容易性のバランスが最も良い
- Alternatives: (A) Tavily を primary にする / (B) 複数 provider を同列 primary にする
- Source: discussion-20260328212829687, OQ-0001

### DR-0232: Firecrawl は hosted/local npx の両モードを文書化し、機微環境では local を推奨する (v1.8.0)

- Decision: Firecrawl integration は hosted URL と local `npx` の両構成を提供し、sensitive environment では local を推奨する
- Status: Adopted
- Rationale: セキュリティと導入容易性の両立が必要であり、単一モード固定は運用要件を満たさない
- Alternatives: (A) hosted のみ / (B) local のみ
- Source: discussion-20260328212829687, OQ-0002

### DR-0233: SSE transport は v1.8.0 の対象外とし、post-v1.8.0 へ延期する (v1.8.0)

- Decision: MCP transport は stdio と HTTP のみを対象とし、SSE ベース統合は v1.8.0 では扱わない
- Status: Adopted
- Rationale: Apify SSE deprecation を踏まえると、現時点で SSE を正式採用すると保守コストと不確実性が高い
- Alternatives: (A) SSE を v1.8.0 に含める / (B) transport ごとに個別方針を持たず曖昧に残す
- Source: discussion-20260328212829687, OQ-0003

### DR-0234: Content sanitization は moderate scope に固定する (v1.8.0)

- Decision: sanitizer は control chars、`aria-hidden`、`display:none` の除去に限定し、ML ベース判定や過剰除去を行わない
- Status: Adopted
- Rationale: セキュリティ対策とコンテンツ忠実性の均衡点として moderate scope が最適
- Alternatives: (A) basic only / (B) aggressive semantic sanitization
- Source: discussion-20260328212829687, OQ-0004

### DR-0235: 評価ハーネスは metrics 定義に留め、特定ツールへ固定しない (v1.8.0)

- Decision: evaluation は citation precision、coverage、freshness、security hygiene の指標定義までを共通仕様とし、特定ベンダー/特定評価ツールへ固定しない
- Status: Adopted
- Rationale: 評価基盤の差し替え可能性を残しつつ、品質ゲートの観点だけを共通化する
- Alternatives: (A) 特定評価ツールを必須化 / (B) 指標自体を定義しない
- Source: discussion-20260328212829687, OQ-0005

### DR-0236: Research sub-agents は conservative defaults を採用する (v1.8.0)

- Decision: research sub-agents の既定値を `max_threads=2`, `max_depth=2` とし、より高い値は explicit opt-in とする
- Status: Adopted
- Rationale: 並列度と探索深度の暴走を防ぎ、レート制限・コスト・追跡可能性のバランスを保つ
- Alternatives: (A) 制限なし / (B) 1 固定
- Source: discussion-20260328212829687, OQ-0006

### DR-0237: Cache staleness threshold は 24 時間デフォルトで config override 可能とする (v1.8.0)

- Decision: research cache の既定 stale threshold は 24 時間とし、設定で上書き可能にする
- Status: Adopted
- Rationale: freshness と API コストの実務的な均衡点であり、ユースケース差異は config で吸収できる
- Alternatives: (A) 固定値で override 不可 / (B) cache 無効
- Source: discussion-20260328212829687, OQ-0007

### DR-0238: HITL gate はリスクベースで発火させる (v1.8.0)

- Decision: HITL は高リスク・低信頼ケースに限定して発火し、per-fetch approval のような過剰承認フローは採用しない
- Status: Adopted
- Rationale: 人手承認を必要な場面に集中させ、通常ケースのスループットを損なわない
- Alternatives: (A) すべての fetch に承認を要求 / (B) HITL なし
- Source: discussion-20260328212829687, OQ-0008

### DR-0239: Skill-First Prototyping Posture (2026-04-22)

- Decision: active prototyping contract is `/qfai-prototyping [--auto]` plus `qfai validate` / `/qfai-verify`
- Decision: declared screen evidence requires both screenshot and HTML snapshot
- Decision: legacy full-harness / mode / runtime terminology remains historical or validator-slice vocabulary only
- Rationale: simplify user-facing execution while preserving deterministic evidence integrity checks

### DR-0240: Discussion / Preflight Side Artifact Neutrality (2026-04-22)

- Decision: discussion-pack readiness と SDD preflight は required markdown を主 gate とし、`prototyping.yaml` を必須 side artifact として扱わない
- Decision: `missingSideArtifacts` は compatibility-shaped field として残っても、current contract では readiness blocker に使わない
- Rationale: `packages/qfai/src/core/discussionPack.ts` と `packages/qfai/src/core/preflight/sddPreflight.ts` の current behavior に同期するため

### DR-0241: Reviewer-Score Snapshot Evidence Model (2026-04-22)

- Decision: full-harness の active evidence schema は `reviewerScores[]`、`allReviewerAxesPerfect100`、snapshot-based `scoringTrace[]`、`iterationBudget` とする
- Decision: `weightedTotal` / `deltaFromPrevious` は historical wording とし、current convergence contract には使わない
- Rationale: `packages/qfai/src/core/harness/history.ts` / `resultWriter.ts` / `types.ts` の current implementation に同期するため

### DR-0250..0260: CHG-003 — Assistant-layer Recut + Work-log Surface (2026-05-22)

Source: discussion-20260522081618995 OQ-0001..0012 (10 resolved, 2 deferred)。

#### DR-0250: Promotion target は per-spec `07_Decisions.md` 単独 (OQ-0001 resolved)

- Decision: `kind: decision` work-log entry の promote target は per-spec `07_Decisions.md` のみ。project-level MADR `decisions/` directory は採用しない。
- Rationale: 単一 SSOT per spec を保つ。並列 decision register を増やさない。
- Rejected option: project-level MADR `decisions/` 新設 (parallel SSOT を増やすため)。
- Source: user via AskUserQuestion 2026-05-22。

#### DR-0251: 4-conceptual-layer + Process partition 採用 (OQ-0002 resolved)

- Decision: `.qfai/assistant/{constitution,manifest,catalog,process,agents,skills}/` の 6 entry に再分割。`steering/` は project-root に新設し work-log surface とする。
- Rationale: Spec Kit (Constitution) + Kiro (Manifest/steering) + Cline (scratchpad) + AAIF の industry convergence。bulk-rename Option (current steering → manifest) は 12 files 中 8 を mis-classify するため reject。
- Rejected options: (B) instructions/ + manifest/ の 2-directory bulk rename; (C) flat assistant/ no layers。
- Source: requirements-analyst, SRC-0011W/0012W/0013W。

#### DR-0252: Work-log scope は project-level 単独 (OQ-0003 resolved)

- Decision: work-log surface は project-root `.qfai/steering/` 単独。per-spec scope は frontmatter `scope: spec-NNNN` で表現する。
- Rationale: per-spec path proliferation を回避。cross-spec memos も frontmatter で表現可能。
- Rejected option: per-spec `.qfai/specs/spec-NNNN/steering/` を併設 (path proliferation のため)。
- Source: user via AskUserQuestion 2026-05-22。

#### DR-0253: `spec_required_files.json` を catalog/ へ relocate (OQ-0004 resolved)

- Decision: 既存 `.qfai/assistant/manifest/spec_required_files.json` を `.qfai/assistant/catalog/` へ移す。新 Manifest layer は project-spine 専用。
- Rationale: registry artifact は Catalog の責務であり、Manifest (project-spine) と分離する。
- Rejected option: 旧 `manifest/` に放置 (new Manifest 意味と衝突)。
- Source: user via AskUserQuestion 2026-05-22。

#### DR-0254: `.qfai/steering/` は `.gitignore` 既定 exclude (OQ-0005 resolved)

- Decision: work-log surface は default untracked。project が opt-in する場合は `.gitignore` override で commit 可能。
- Rationale: accidental secret commit に対する defense-in-depth。共有 resume context が欲しい team は opt-in できる。
- Rejected option: default tracked (secret leak リスク)。
- Source: requirements-analyst, SRC-0001。

#### DR-0255: 旧 path の deprecation window は 1 minor release (OQ-0006 resolved)

- Decision: validator は旧 layout と新 layout を 1 minor release の間並行受理し、`D-DEPRECATED-PATH` warning を発する。次 minor で旧 path 受理を削除し、warning を error に escalate。
- Rationale: 過去 ATDD migration cadence (`process/migrations/v1.4.27-atdd-alignment.md`) と整合。
- Rejected option: hard-cut (1 release 内に旧受理削除; consumer の breaking 大きい)。
- Source: requirements-analyst, prior migration memo。

#### DR-0256: Work-log entry は YAML frontmatter (OQ-0009 resolved)

- Decision: `.qfai/steering/*.md` の metadata は YAML frontmatter。
- Rationale: 既存 `qfai-*` SKILL.md convention と整合。`closure-rationale` のような prose field と相性良。
- Rejected option: TOML (tool ecosystem が薄い)、JSON (prose body と分離が必要)。
- Source: requirements-analyst, SRC-0009。

#### DR-0257: Entry filename = `<id>.md` で `id` は kebab-case ASCII (OQ-0010 resolved)

- Decision: filename stem と frontmatter `id` を match させる。
- Rationale: `ls` で時系列順、unique-enough、人間可読。
- Rejected option: UUID filename (人間可読性低)、`YYYY-MM-DD/<slug>.md` (per-day dir 増加)。
- Source: requirements-analyst, SRC-0001。

#### DR-0258: Reviewer drift findings は severity error + 必須 justification (advisory-failing) (OQ-0011 resolved)

- Decision: `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` は severity error だが `justification:` field 非空を必須とする。`qfai validate` は justification 欠落の `R-*` finding を reject。
- Rationale: 自然言語 heuristic な drift 検出を hard-block にすると false-positive で trust が崩れる。warning-only にすると無視される。advisory-failing で中庸を取る。
- Rejected option: warning-only (無視される); hard-block (false-positive で trust 崩れる)。
- Source: requirements-analyst, SRC-0001。

#### DR-0259: `D-DEPRECATED-PATH` は window 中 warning / sunset 以降 error (OQ-0012 resolved)

- Decision: window 中は warning、sunset version で error に escalate。warning text には sunset version を毎回名前で含める (NFR-0003)。
- Rationale: day 1 error は installed copies を brick する。warning のみは無視される。version-aware 段階的移行が安全。
- Rejected option: day 1 error (consumer の installed copies が動かなくなる)。
- Source: requirements-analyst, SRC-0001。

#### DR-0260: AGENTS.md 整合と auto-archival は deferred (OQ-0007 + OQ-0008 deferred)

- Decision: AGENTS.md / `CLAUDE.md` symlink 議論は別 `/qfai-discussion` invocation に切り出す (target 2026-09-30)。`.qfai/steering/` 自動アーカイブは post-v1 dogfooding review (target 2026-12-31) まで `qfai validate` の `W-WORKLOG-STALE` surface で代用。
- Rationale: 両者は独立した discovery scope を持つ。本 pack に bundle すると atomicity を超える。
- Source: requirements-analyst, deferred row in `13_Deferred.md`。

### DR-0001-0001..0009: Prototyping defect-remediation pack — deferred OQ resolutions (2026-05-24)

Source: discussion-20260523221141355 OQ-0103/0104/0105/0107/0108/0109/0110/0111/0112 (9 deferred → resolved at `/qfai-sdd` Phase 0).
These rows resolve the 9 OQ rows the requirements-analyst left `deferred` for the architect to pick. The acceptance signals for the underlying REQs (REQ-0101..0125) are invariant across each option set; the choices below pin the specific implementation contract for spec-0012 (and any co-shipped spec slices) so downstream implementation, validation, and reviewer-gate code can be written against a single resolution.

#### DR-0001-0001: Tailwind ↔ gate hybrid — β whitelist preflight + γ `<body>`-scope (OQ-0103 resolved)

- Date: 2026-05-24
- Statement: Resolve the Tailwind CDN ↔ `findDesignMdViolations` conflict by combining option β (whitelist Tailwind preflight literals in scanner) AND option γ (scope the gate to `<body>` only, skipping the preflight `<style>` block) in a single hybrid remedy. The whitelist enumerates the 5 sentinel literals named in SRC-0001 §B-4 / SRC-0004 §3: `#fff`, `#9ca3af`, `#e5e7eb`, `rgb(59 130 246 / 0.5)`, `--tw-ring-*`. The `<body>`-scope rule excludes `<head>` / preflight `<style>` blocks from scanner input.
- Chosen option: β + γ hybrid.
- Rejected option α — drop Tailwind CDN: breaks the rapid-prototyping reach the skill depends on; downstream LLMs would lose JIT utility coverage.
  - DO NOT: drop CDN-based Tailwind from `generator-prompt.md`. Temptation: gate becomes trivial if we ship no CDN.
- Rejected option δ — read `tailwind.config.theme.extend` to compute per-iter allowlist: pushes compile-cost into the scanner and creates a new SSOT-sync surface (`tailwind.config` ↔ scanner) without removing the preflight problem.
  - DO NOT: parse tailwind.config inside the scanner. Temptation: feels like the "correct" semantic remedy.
- Rejected option ε — mandate arbitrary-value form everywhere (`rounded-[0.5rem]`): forces authors to abandon utility shorthands for no scanner-side benefit (the preflight literals still leak).
  - DO NOT: ban utility shorthands. Temptation: feels safer because every value is explicit.
- Source REQ: REQ-0101, REQ-0102, REQ-0125.
- Trace: discussion-20260523221141355 OQ-0103 (deferred → resolved here).

#### DR-0001-0002: `--*-shadow*:` strip — option B (OQ-0104 resolved)

- Date: 2026-05-24
- Statement: `SHADOW_DECL_STRIP_RE` extends to **any custom-property declaration whose name contains `shadow`** (regex `--[A-Za-z0-9-]*shadow[A-Za-z0-9-]*:`), not the narrow `--shadow-*:` form. This catches Tailwind v4 emissions such as `--ring-shadow`, `--default-shadow`, `--inset-shadow-*` that the narrow form would miss.
- Chosen option: B (`--*-shadow*:`).
- Rejected option A — narrow `--shadow-*:` only: misses Tailwind v4 `--ring-shadow`, `--default-shadow` and any future `--<feature>-shadow-*` emissions; would require touching the regex every Tailwind minor.
  - DO NOT: hard-code `--shadow-` prefix. Temptation: narrowest pattern minimizes false-strip risk.
- Rejected option C — parse-as-composite (semantic strip of any `--*` whose value parses as a box-shadow composite): too permissive; will silently strip legitimate color tokens whose computed value happens to look shadow-shaped (e.g. tokens used in both shadow and border contexts), producing false negatives in `scanColors`.
  - DO NOT: introduce semantic parsing in a regex-stage filter. Temptation: feels future-proof.
- Source REQ: REQ-0105.
- Trace: discussion-20260523221141355 OQ-0104 (deferred → resolved here).

#### DR-0001-0003: CJK-aware `countWords` — Intl.Segmenter primary + OR-condition fallback (OQ-0105 resolved)

- Date: 2026-05-24
- Statement: `countWords` (consumed by QFAI-PROT-002) MUST use `Intl.Segmenter(undefined, { granularity: "word" })` with the `isWordLike` filter as primary; when `Intl.Segmenter` is unavailable (Node < 18 or stripped runtime) the fallback is the OR-condition `200..500 words OR 600..2500 characters`. Error text on out-of-band MUST name (a) the count form actually measured, (b) the band used. Acceptance signal: Japanese 800–1500-char fixture passes, English 200–500-word fixture continues to pass.
- Chosen option: Intl.Segmenter primary + OR-condition fallback.
- Rejected option — heuristic-only (CJK character-ratio fallback to `len/2`): brittle on mixed-script bilingual prose; misclassifies headers / inline code / latin loanwords.
  - DO NOT: ship CJK-ratio heuristic as primary. Temptation: cheaper than ICU dependency.
- Rejected option — OR-condition only (no semantic word resolution): loses the "200..500 words" semantic for English; tests cannot distinguish word-shaped prose from filler character counts.
  - DO NOT: drop semantic word measurement. Temptation: one rule covers both locales.
- Rejected option — per-rule configurable bounds in `.qfai/contracts/prototyping/*.yaml`: per-project config sprawl; each consumer must hand-tune; defeats the canonical-band invariant.
  - DO NOT: push the band into per-project config. Temptation: maximum flexibility.
- Source REQ: REQ-0106.
- Trace: discussion-20260523221141355 OQ-0105 (deferred → resolved here).

#### DR-0001-0004: `certify` ↔ `verify` resolution — option B (`verify.json#scope` field) (OQ-0107 resolved)

- Date: 2026-05-24
- Statement: Introduce a `scope: "prototyping" | "atdd" | "full"` field on `verify.json`. `qfai prototyping certify --check` accepts `scope: "prototyping"` as satisfying the prototyping-phase gate. `completion-certificate.json` MUST explicitly record `scope: "prototyping"` and MUST NOT claim full DONE. Full DONE retains the original full `/qfai-verify` PASS gate. Co-shipped helper `certify --upgrade-scope full` (per OQ-0121=A, separate row in resolution log) allows in-place re-seal once full verify PASSes.
- Chosen option: B (scope-field on verify.json).
- Rejected option A — split certify into `--prototype-only` / `--full`: fragments the command surface; doubles the documentation matrix; each new scope requires a new flag.
  - DO NOT: add `--prototype-only` flag. Temptation: feels like the lightest implementation.
- Rejected option C — new `qfai prototyping verify` subcommand: duplicates the verify command surface; each new scope adds a new subcommand. Discoverability is offset by per-scope command proliferation.
  - DO NOT: introduce a parallel verify command. Temptation: most-discoverable from skill body.
- Source REQ: REQ-0112, REQ-0113.
- Trace: discussion-20260523221141355 OQ-0107 (deferred → resolved here).

#### DR-0001-0005: Multi-spec doc/impl drift — option A (realign SKILL.md to single-spec) (OQ-0108 resolved)

- Date: 2026-05-24
- Statement: Realign `qfai-prototyping/SKILL.md` to single-spec language. Remove `resolveSurfaceUnion()` from the public skill surface (the function remains internal, callable from validators and `show-spec`, but is no longer documented as a skill capability). The per-spec layout migration (`iter-NN/spec-NNNN/<screen-id>.{png,html,review.json}`) is deferred to a future pack; surface MUST be self-consistent at HEAD (no claim of multi-spec iterate/certify until the migration lands).
- Chosen option: A (realign SKILL.md to single-spec).
- Rejected option B — complete per-spec layout migration: requires iterate emit + certify consume + path helpers + validator rewrites in the same pack; not justified by current downstream demand and would inflate this remediation pack beyond an atomic slice.
  - DO NOT: bundle the per-spec migration into this defect-remediation pack. Temptation: "fix it once and for all" is appealing but breaks atomicity.
- Source REQ: REQ-0114, REQ-0124.
- Trace: discussion-20260523221141355 OQ-0108 (deferred → resolved here). Cross-link: TDD-0384 / OQ-0012-0006 remains the future-pack tracker for option B.

#### DR-0001-0006: `lap-009` / `lap-010` severity — advisory-failing (severity error + mandatory justification) (OQ-0109 resolved)

- Date: 2026-05-24
- Statement: The new layout anti-patterns `lap-009: duplicate-capture` and `lap-010: missing-route` (introduced by REQ-0121) are severity **error** with mandatory Reviewer justification text. They interrupt convergence; the Reviewer MUST emit a non-empty `justification:` naming the duplicate md5 pair (for lap-009) or the missing route (for lap-010) to clear the gate. This mirrors the `R-*` advisory-failing pattern (DR-0258).
- Chosen option: advisory-failing (error + mandatory justification).
- Rejected option — advisory-warning: does not interrupt drift; identical capture pairs and missing routes would silently accumulate; defeats the md5/route detection's purpose.
  - DO NOT: ship lap-009/010 as warning. Temptation: mirrors lap-001..008 historical posture.
- Source REQ: REQ-0121.
- Trace: discussion-20260523221141355 OQ-0109 (deferred → resolved here).

#### DR-0001-0007: Screen-id casing — option A (underscore end-to-end) (OQ-0110 resolved)

- Date: 2026-05-24
- Statement: `screens[].id` MUST be snake_case (underscore-separated) end-to-end. The same form MUST be used in: UI contract authoring (`primary_tasks` slot per REQ-0115), iterate emit (`iter-NN/<screen-id>.{png,html,review.json}`), validator expectation, aggregate-dir filename (`.qfai/evidence/prototyping/screenshots/<screen-id>.png`, `.qfai/evidence/prototyping/html/<screen-id>.html`), and the `evidenceRefs[].path` field in `iterations[i]` (REQ-0111). Existing hyphen-form iter outputs are accepted during the deprecation window with `D-DEPRECATED-PATH` warning.
- Chosen option: A (underscore).
- Rejected option B — hyphen everywhere: requires validator + filename rewrites; conflicts with Python/YAML convention used in surrounding artifacts; the URL-friendliness argument is weaker than the file-stem ergonomics one.
  - DO NOT: normalize to hyphen. Temptation: URL routes use hyphen.
- Rejected option C — accept both (validator change): silently masks drift; two equivalent IDs can refer to the same screen with no enforcement; defeats the SSOT premise of `screens[].id`.
  - DO NOT: accept both casings. Temptation: minimum-breakage path.
- Source REQ: REQ-0116, REQ-0111.
- Trace: discussion-20260523221141355 OQ-0110 (deferred → resolved here).

#### DR-0001-0008: `validate.json` profile disambiguation — option A (profile-suffixed + always-latest pointer) (OQ-0111 resolved)

- Date: 2026-05-24
- Statement: `qfai validate --profile <p>` writes `.qfai/report/validate-<profile>.json` per profile AND `.qfai/report/validate.json` always reflects the most recent run with an explicit top-level `profile` field. `certify` (and all downstream skills) MUST read the profile-suffixed file when scoping by profile, and MAY read the non-suffixed file when the `profile` field check is sufficient. The doc-vs-impl drift `.qfai/output/validate.json` (old) vs `.qfai/report/validate.json` (current) resolves to `.qfai/report/validate.json`; the old path emits `D-DEPRECATED-PATH` warning during the window and is removed at the sunset version (qfai 1.10.0 per `package.json#version`).
- Chosen option: A (profile-suffixed + always-latest pointer with explicit `profile` field).
- Rejected option B — `certify` auto-reruns `qfai validate --profile prototyping` before reading: hides upstream drift (operator-driven validate-run state is silently overwritten by certify-driven re-run); adds latency; obscures which command actually produced the validated result.
  - DO NOT: have certify silently re-run validate. Temptation: "always fresh" feels safe.
- Rejected option C — error out on profile mismatch and tell operator which command to re-run: worse UX than A (forces operator round-trip); does not prevent the silent overwrite if two profiles are run in sequence.
  - DO NOT: error on profile mismatch instead of disambiguating. Temptation: minimum-implementation path.
- Source REQ: REQ-0120, REQ-0124.
- Trace: discussion-20260523221141355 OQ-0111 (deferred → resolved here).

#### DR-0001-0009: `primarySpecId` normalization — SHOULD remains SHOULD per REQ-0119 (OQ-0112 resolved)

- Date: 2026-05-24
- Statement: REQ-0119 SHOULD (input normalization of `primarySpecId` accepting `1` / `"1"` / `"01"` / `"0001"`) remains SHOULD. Implementations MAY accept any positive-integer-shaped input and MUST normalize internally to `spec-NNNN`; implementations that choose strict-rejection-only MUST produce the explicit error text from REQ-0119: `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received <input>`. The error text contract is MUST regardless of which path the implementation chooses. No schema migration is forced.
- Chosen option: SHOULD remains SHOULD (per REQ-0119 wording).
- Rejected option — MUST-normalize: forces every implementation site (config loader, CLI flag parser, validator) to apply the normalization; schema migration for downstream consumers that already use `"0001"` form gains nothing; consumers that use `1` would need to be told they must change anyway because the spec-side artifacts still use 4-digit form.
  - DO NOT: promote the SHOULD to MUST in this pack. Temptation: "be lenient on input" feels user-friendly.
- Source REQ: REQ-0119.
- Trace: discussion-20260523221141355 OQ-0112 (deferred → resolved here).

### DR-0261..0274: Second-Wave Defect-Remediation pack — deferred OQ resolutions (2026-05-27)

Source: discussion-20260527075558258 OQ-0152/0153/0154/0155/0156/0157/0158/0159/0160/0162/0163 + the REQ-0157 scaffold-escalate residual + OQ-0167 (`/qfai-sdd` slice-time resolutions).
These rows pin the specific implementation contract the per-spec slices (Spec A–K) cite. The acceptance signals for the underlying REQs (REQ-0150..0173) are invariant across each option set; the choices below select one option so downstream implementation, validation, and reviewer-gate code can be written against a single resolution. ID note: the next free plain `DR-NNNN` at authoring time was `DR-0261` (DR-0258/0259/0260 were consumed by CHG-003), so this family begins at DR-0261. OQ-0161 (memory schema), OQ-0164 (per-rule `proseCritique` configurability) and OQ-0165 (`/proposal` family) remain `deferred` (ops-owned) and are NOT decided here.

#### DR-0261: Cycle-0 skeleton emission UX shape — token-driven placeholder (OQ-0152 resolved)

- Date: 2026-05-27
- Statement: `qfai prototyping iterate --cycle 0 --emit-skeletons` emits one placeholder HTML per `screens[].id` in `frozenSurfaceUnion` by consuming the `DESIGN.md` tokens (color / font / radius / shadow) for default styling — option B (token-driven placeholder). No per-screen LLM generation call is made at cycle 0; subsequent cycles refine. The runtime-tunable `--skeleton-mode` flag (OQ-0166 register row → DR-0272) lets a project escalate to higher-fidelity modes later. Acceptance signal (every `frozenSurfaceUnion` screen has `evidenceRefs[]` of both kinds after convergence) is unchanged.
- Chosen option: B (token-driven placeholder).
- Rejected option A — full generation per declared screen: spends cycle-0 LLM budget on screens that the operator may never prioritize; highest cost for the union sizes typical of 7-spec projects; regresses the v1.9.1 cost posture.
  - DO NOT: make cycle-0 emit a full per-screen generation. Temptation: highest fidelity feels best.
- Rejected option C — minimal HTML stub (`<main>`/`<header>`/`<footer>`, no token-driven content): produces shallow evidence that does not exercise the DESIGN.md token mirror; reviewers cannot judge brand compliance from an unstyled stub.
  - DO NOT: ship a token-blind stub. Temptation: cheapest to implement.
- Source REQ: REQ-0150. Trace: discussion-20260527075558258 OQ-0152 (Spec A).

#### DR-0262: DESIGN.md patch-zone shape — front-matter `patch_zone:` block (OQ-0153 resolved)

- Date: 2026-05-27
- Statement: DESIGN.md gains a front-matter `patch_zone:` block (option a) listing the line ranges or token names that may be edited without invalidating `frozenDesignMdHash#majorHash`. Edits whose diff is fully contained in the patch zone update only a new `patchHash` field; `majorHash` (and therefore prototyping evidence validity) is unchanged. Edits touching any line/token outside the zone (or removing the `patch_zone:` block itself) invalidate evidence as today. No new lock-file artifact is introduced. Reviewer Gate emits `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (severity warning) on out-of-zone edits.
- Chosen option: a (front-matter `patch_zone:` block).
- Rejected option b — generationally-versioned `DESIGN.md.lock.yaml` with `major.minor.patch`: introduces a second SSOT file and new lock-generation semantics (more ceremony) for the same invariant; the front-matter block keeps brand SSOT in one file (consistent with DCON-030 single-file posture).
  - DO NOT: add a generational lock-file for patch-zone semantics. Temptation: "versioned lock feels more disciplined".
- Rejected option c — hybrid (front-matter + lock-file marker): combines both costs with no additional safety.
  - DO NOT: ship both surfaces. Temptation: cover every preference.
- Source REQ: REQ-0151. Trace: discussion-20260527075558258 OQ-0153 (Spec B).

#### DR-0263: exploration-mode gate-relaxation table — medium (OQ-0154 resolved)

- Date: 2026-05-27
- Statement: Under `prototyping.mode: exploration`, downgrade `QFAI-CRIT-008` (axes-exceptional) AND the design-compliance error (DESIGN.md compliance / `designMdViolations`) from error → warning. Structural gates (schema / required-field / path) and license gates (exit 66) remain hard error. This is the medium relaxation between option A (only `QFAI-CRIT-008`) and option C (entire `QFAI-CRIT-*` family). `certify` rejects sealing any iteration produced under exploration mode regardless of the table (`R-EXPLORATION-CERTIFY-ATTEMPT`).
- Chosen option: medium (`QFAI-CRIT-008` + design-compliance → warning; structural/license hard).
- Rejected option A — only `QFAI-CRIT-008`: design-compliance error still blocks shallow exploration loops, which is the second-most-cited blocker; too narrow to make exploration usable.
  - DO NOT: relax only the axes gate. Temptation: safest minimal step.
- Rejected option C — whole `QFAI-CRIT-*` family + advisory-failing findings: relaxes structural/license gates that protect evidence integrity; an exploration run could then produce structurally invalid artifacts that leak into later convergence.
  - DO NOT: relax structural or license gates in exploration mode. Temptation: maximum flexibility.
- Source REQ: REQ-0152. Trace: discussion-20260527075558258 OQ-0154 (Spec C).

#### DR-0264: Stale review-pack TTL default — 14d, project-configurable (OQ-0155 resolved)

- Date: 2026-05-27
- Statement: `qfai doctor --clean` archives `.qfai/review/<ts>/` directories older than a TTL of 14 days by default, configurable via `qfai.config.yaml#review.staleTtlDays`. Archival moves to `.qfai/review/_archive/<ts>/` and never deletes; restore is a manual `mv` back. `qfai validate --profile review` treats `_archive/` as out-of-scope. 14d sits between the high-churn (SRC-0020, 4 packs in 4 days) and low-churn (SRC-0025, weeks) extremes; the config key lets either churn profile tune it.
- Chosen option: 14d default + `review.staleTtlDays` config.
- Rejected option — 7d fixed: too aggressive for low-churn projects that revisit packs across weeks; would archive packs still in active review.
  - DO NOT: hard-code a 7-day TTL. Temptation: keep the review dir small.
- Rejected option — 30d fixed: high-churn projects accumulate a dozen stale packs before archival fires (the exact `QFAI-REVIEW-003/004/005` storm SRC-0020 reported).
  - DO NOT: hard-code a 30-day TTL. Temptation: safest long default with no churn signal.
- Rejected option — config-only with no default: forces every project to set the key before archival works; breaks zero-config UX.
  - DO NOT: ship without a default. Temptation: avoid choosing a number.
- Source REQ: REQ-0153. Trace: discussion-20260527075558258 OQ-0155 (Spec D).

#### DR-0265: `QFAI-MOCK-010` direction — anchor-form template default + strict validator (OQ-0156 resolved)

- Date: 2026-05-27
- Statement: Option b — the `qfai-discussion` template emits anchor-form (`<a href="#<name>">`) by default and SKILL.md instructs authors to use anchors in `03_Story-Workshop.md` HTML mocks. The `QFAI-MOCK-010` validator continues to PASS anchor URLs (`#name`) and external URLs (`http(s)://...`) and continues to FAIL same-origin absolute paths (`<a href="/products/">`) — it is NOT broadened. Template ↔ validator form a new SSOT-sync pair (Pair V) mirroring the v1.9.1 `R-PROMPT-SCANNER-DRIFT` precedent; asymmetric edits emit `R-MOCK-HREF-DRIFT`.
- Chosen option: b (template anchor default; validator stays strict).
- Rejected option a — broaden validator to accept same-origin absolute hrefs: relaxes a deterministic gate; mocks would then encode routes that the prototype reality cannot serve, re-introducing the "looks navigable but is not" mock drift.
  - DO NOT: accept `/<path>/` same-origin absolute hrefs in the validator. Temptation: most natural for web-URL-familiar authors.
- Rejected option c — hybrid (validator accepts both + template emits anchor): the permissive validator silently masks template drift; the SSOT-sync pair loses teeth.
  - DO NOT: make the validator permissive while the template is strict. Temptation: reduce author friction maximally.
- Source REQ: REQ-0154. Trace: discussion-20260527075558258 OQ-0156 (Spec E).

#### DR-0266: Active discussion session pointer — `state.json#discussion.currentId` SSOT (OQ-0157 resolved)

- Date: 2026-05-27
- Statement: Option B — `.qfai/state.json#discussion.currentId` is the single SSOT for the active discussion session. `qfai discussion list --active` is a READ view over it (not an independent source). All downstream skills read the pointer through one helper. Multiple-active ambiguity (no `currentId`, or `currentId` resolving to a missing/duplicate pack) is rejected with an error naming the candidate dirs and the recovery command (`qfai discussion use <id>`).
- Chosen option: B (state.json SSOT) with A as a read view.
- Rejected option A-alone — `qfai discussion list --active` derives from filesystem timestamps: timestamp inference is non-deterministic across multi-session / multi-user clones and gives no place to record an explicit operator choice.
  - DO NOT: infer the active pointer from mtime. Temptation: zero-config.
- Rejected option C — `qfai.config.yaml#discussion.currentId`: config is committed/shared project policy, but the active session is per-runtime ephemeral state; `state.json` is already the runtime-state surface and is the correct home.
  - DO NOT: put ephemeral session state in committed config. Temptation: one config file for everything.
- Source REQ: REQ-0155. Trace: discussion-20260527075558258 OQ-0157 (Spec E).

#### DR-0267: `primary_tasks` recommended count band — 3..7 (OQ-0158 resolved)

- Date: 2026-05-27
- Statement: The `QFAI-AUD-020` recommended `primary_tasks` count band is **3..7 tasks** per screen. Documented in the `ui-spec.yaml` template comments and `references/ui-contract-guide.md`; the warning text names the band. Below 3 risks under-specified screens; above 7 risks an unfocused screen. 3..7 is the permissive-but-bounded band (register option C) appropriate for the multi-screen SaaS surfaces the reporter projects build.
- Chosen option: 3..7 (permissive).
- Rejected option — 2..5: the lower floor of 2 admits screens that barely justify a UI contract; the reporter projects routinely declared 5–6 primary tasks on dashboard screens that 2..5 would flag as "too many".
  - DO NOT: cap the recommended ceiling at 5. Temptation: tighter discipline.
- Rejected option — 1..3 (minimal): floor of 1 defeats the purpose of the band; too strict for real dashboards.
  - DO NOT: use a 1..3 band. Temptation: minimal surface.
- Source REQ: REQ-0164. Trace: discussion-20260527075558258 OQ-0158 (Spec I).

#### DR-0268: `primary_tasks` structured shape JSON Schema — `{id,label,acceptance}` all required (OQ-0159 resolved)

- Date: 2026-05-27
- Statement: The structured `primary_tasks[]` item schema is `{ id: string, label: string, acceptance: string }` with all three required and `additionalProperties: false`. `auditProfile.ts` accepts BOTH this structured form AND the legacy string-only form during the deprecation window (`D-DEPRECATED-*` warn on string-only at sunset). The closed schema matches the existing US/TC `{id, label, acceptance}` convention so downstream coverage/atdd tooling can consume it without per-project shape negotiation.
- Chosen option: `{id, label, acceptance}` all-required, closed.
- Rejected option — minimal `{id, label}`: drops the `acceptance` field that makes a task testable; downstream atdd scaffolding (REQ-0157) would have nothing to anchor a TODO assertion to.
  - DO NOT: omit `acceptance`. Temptation: smallest schema.
- Rejected option — full `{id, label, acceptance, priority?, owner?}` with `additionalProperties: true`: open shape invites per-project field sprawl that breaks cross-project tooling; `priority`/`owner` are speculative (YAGNI).
  - DO NOT: open the schema or add speculative fields. Temptation: future-proofing.
- Source REQ: REQ-0164. Trace: discussion-20260527075558258 OQ-0159 (Spec I).

#### DR-0269: SKILL.md Default Autopilot Policy template — 3 named buckets (OQ-0160 resolved)

- Date: 2026-05-27
- Statement: Every SKILL.md `## Default Autopilot Policy` section uses three named buckets. (a) **auto-decide** (named defaults, AI decides without prompting): output formatting, ID / sequence numbering, append-vs-create when subject overlaps an existing artifact, and option-pick among demonstrably-equivalent alternatives. (b) **ask-user** (AI prompts via AskUserQuestion): approval-required triage ops (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE), destructive operations, version-pin changes, and scope expansions. (c) **hard-required** (no default possible; must be supplied before proceeding): `companyName`, brand intent, `primarySpecId` when absent. The three enumerations are the prototype: a skill MAY narrow ANY of the three buckets (drop an entry it cannot reach) but MUST NOT widen one. Only auto-decide widening is machine-detectable (its entry set is closed) and surfaces `R-AUTOPILOT-POLICY-WIDENED` (warning); ask-user / hard-required are enforced by review. Reviewer Gate emits `R-AUTOPILOT-POLICY-MISSING` (error) when the section is absent.
- Amendment (2026-08-22): the narrowing permission originally covered auto-decide only, so `/qfai-implement` shipped `/qfai-sdd`'s triage ops in ask-user and init's branding inputs in hard-required — decisions and inputs an implement run never reaches. Narrowing now applies to all three buckets; widening stays forbidden in all three.
- Amendment 2 (2026-08-22): narrowing alone left `/qfai-implement` with no legal way to name the authorizations it DOES need. Its `TDDLIST-001` accepted-risk waiver and its Drift-Protocol Change-Request escalation are the same kind of decision as `/qfai-sdd`'s triage ops — a human authorization the skill cannot grant itself — but neither is a triage op, so listing them read as widening. **The ask-user bucket's first entry is therefore a category, not a fixed op list: _approval-required governance operations_, which each skill instantiates with the operations its own run requires human authorization for.** `/qfai-sdd` instantiates it as the triage ops (CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE); `/qfai-implement` instantiates it as the `TDDLIST-001` waiver approval and the Change-Request escalation. Instantiating a category with the skill's own operations is **not** widening; introducing a **new category** is, and stays forbidden. The other three ask-user entries (destructive operations, version-pin changes, scope expansions) were already category-shaped and are unchanged.
- Chosen option: per-category opinionated template (register option C) with the three buckets above as the prototype.
- Rejected option A — conservative (most decisions ask user): preserves the 3–6 avoidable `AskUserQuestion` per session that this pack exists to remove.
  - DO NOT: default to asking on procedural decisions. Temptation: maximize governance.
- Rejected option B — aggressive (most decisions auto-decide): erodes governance by auto-deciding triage / destructive / scope / version operations that require human authorization.
  - DO NOT: auto-decide approval-required or destructive operations. Temptation: maximize autopilot.
- Source REQ: REQ-0160. Trace: discussion-20260527075558258 OQ-0160 (Spec H).

#### DR-0270: Envelope-deviation `AskUserQuestion` audit trigger taxonomy (OQ-0162 resolved)

- Date: 2026-05-27
- Statement: The audit-log write (REQ-0158) triggers when an `AskUserQuestion` template names any of the four envelope-deviation contexts: "skill envelope", "architectural decision", "rejected-option re-adoption", or "scope expansion". On trigger, the skill body writes `.qfai/evidence/decisions/<ISO8601-ts>.json` `{question, answer, scope, operatorIdentity, timestamp, envelopeContractClause}`. (This is the register's option C — a per-skill declared list of envelope contexts — pinned to a fixed four-context taxonomy so the trigger is deterministic and reviewable rather than a heuristic regex.) `.qfai/evidence/decisions/` is tracked in version control (governance record; negated in the managed `.gitignore` block).
- Chosen option: fixed four-context declared taxonomy (register option C, pinned).
- Rejected option A — explicit `AskUserQuestion({envelopeDeviation: true})` parameter: requires every skill author to remember to set the flag; a missed flag silently drops the audit record (fail-open).
  - DO NOT: depend on a per-call boolean flag. Temptation: most explicit.
- Rejected option B — question-text regex heuristic: brittle; false-positives on routine prompts, false-negatives on reworded ones.
  - DO NOT: use a free-text regex trigger. Temptation: zero author burden.
- Source REQ: REQ-0158. Trace: discussion-20260527075558258 OQ-0162 (Spec G).

#### DR-0271: `qfai audit log` CLI shape (OQ-0163 resolved)

- Date: 2026-05-27
- Statement: `qfai audit log` (SHOULD-level, REQ-0171) lists `.qfai/evidence/decisions/<ts>.json` records newest-first with filters `--scope`, `--operator`, `--clause` (filters on `envelopeContractClause`) and `--format table|json` defaulting to `table`. This is register option B (filtered query) with a default human-readable table view; it ships the filter surface up front because ops audit is the primary use case named in REQ-0171.
- Chosen option: B (filtered query) + `--format table|json`, table default.
- Rejected option A — simple newest-first JSON list, no filters: ships fastest but forces operators to pipe through external `jq` for the scope/operator/clause queries REQ-0171 explicitly calls out.
  - DO NOT: ship list-only with no filters. Temptation: fastest to build.
- Rejected option C — tree / decision-graph rendering: over-engineered for an advisory ergonomic surface (YAGNI); the records are flat JSON.
  - DO NOT: build graph rendering. Temptation: richest UX.
- Source REQ: REQ-0171. Trace: discussion-20260527075558258 OQ-0163 (Spec G).

#### DR-0272: `D-SCAFFOLD-PLACEHOLDER` escalate cycle count — error after 3 validate cycles (REQ-0157 escalate residual resolved)

- Date: 2026-05-27
- Statement: `qfai validate` emits `D-SCAFFOLD-PLACEHOLDER` (severity warning) for an atdd-scaffold skeleton whose `// TODO: implement assertion for <TC-ID>` is still present; the warning escalates to **error after 3 validate cycles** with the placeholder unremoved, configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`. Three cycles gives an operator a normal red→green TDD turnaround before the placeholder hard-blocks completion-claim, while preventing indefinite placeholder accumulation. (This resolves the escalate-count that REQ-0157 left "default deferred to /qfai-sdd"; the `--skeleton-mode` runtime-tunability of register OQ-0166 is recorded separately at DR-0273.)
- Chosen option: error after 3 cycles, configurable.
- Rejected option — never escalate (warning-only): placeholders accumulate silently; an operator can claim TC coverage with empty assertions indefinitely.
  - DO NOT: leave the placeholder a permanent warning. Temptation: avoid blocking.
- Rejected option — escalate after 1 cycle: too aggressive; blocks the very next validate before the operator has had a TDD cycle to fill the assertion.
  - DO NOT: escalate on the first cycle. Temptation: strictest signal.
- Source REQ: REQ-0157. Trace: discussion-20260527075558258 (REQ-0157 escalate residual; Spec F).

#### DR-0273: Cycle-0 skeleton mode runtime control — `--skeleton-mode` flag (OQ-0166 resolved)

- Date: 2026-05-27
- Statement: The skeleton emission mode is exposed as a CLI flag `qfai prototyping iterate --skeleton-mode full|placeholder|stub` (register option A), defaulting to `placeholder` per DR-0261. Config-key form is not added. The flag lets a project that wants higher-fidelity cycle-0 evidence escalate per-run without a config edit, while the default keeps the DR-0261 cost posture.
- Chosen option: A (CLI flag, default `placeholder`).
- Rejected option B — config-driven `qfai.config.yaml#prototyping.skeletonMode`: a per-run cost trade-off is better expressed as a per-invocation flag than committed project policy.
  - DO NOT: bury skeleton-mode in config. Temptation: one config for all knobs.
- Rejected option C — hardcoded per DR-0261 with no override: removes operator control that some union sizes legitimately need.
  - DO NOT: hardcode with no escape hatch. Temptation: fewest surfaces.
- Source REQ: REQ-0150. Trace: discussion-20260527075558258 OQ-0166 (Spec A).

#### DR-0274: Pack-location lint scope — staged/changed dirs vs allowed roots (OQ-0167 resolved)

- Date: 2026-05-27
- Statement: `packages/qfai/scripts/check-pack-locations.mjs` scans staged / changed directories for `review-*/` or `discussion-*/` directories that fall outside the allowed roots (`tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`) and emits `R-PACK-LOCATION-DRIFT` referencing `.agents/rules/root-additions-policy.md` and the corrected path. Wired into `pnpm ci:lint`. Scanning staged/changed dirs (not a full-tree walk) keeps the lane fast and scoped to the PR's actual additions. (This resolves OQ-0167's lint-scope dimension for REQ-0167; the register's OQ-0167 `sdd lint --fix` autofix question for `surface_type` remains separately deferred — see note below.)
- Chosen option: staged/changed-dir scope against the three allowed roots.
- Rejected option — full-tree walk every run: re-flags pre-existing legacy packs on unrelated PRs; noisy and slow.
  - DO NOT: full-walk on every lint. Temptation: catch everything.
- Source REQ: REQ-0167. Trace: discussion-20260527075558258 (REQ-0167 lint scope; Spec K). NOTE: the register row OQ-0167 (`qfai sdd lint --fix` autofix for `surface_type`-absent specs, Spec I) is a distinct question and remains `deferred` per `13_Deferred.md`.

### DR-0275..0276: CHG-007 — Layered CI Test Scaffold Adoption (2026-08-05)

Source: discussion-20260804173914356 (REQ-0001..0025, NFR-0001..0016, DTC-1..28), resolving that pack's deferred `OQ-0015` (spec and capability allocation). ApprovedBy: user@2026-08-05. These two rows are the policy-layer allocation decisions the per-spec slices cite; the full change record, its Triage Table and its impact-cascade verification live in `_policies/10_delta.md` § `2026-08-05 — CHG-007`, and the two MUST stay consistent. New plain `DR-NNNN` IDs begin at DR-0275. **Six** new open questions are recorded in `_policies/09_Open-questions.md` and are NOT decided here: `OQ-0023` (make the CAP-to-spec gate number-based, solution-architect), `OQ-0024` (`spec-0005`'s nominal traceability chain, qa-strategist), `OQ-0025` (spec-claimed implementation paths that do not exist, solution-architect) and `OQ-0026` (the permanent drift blind spot for adopters who installed a shipped workflow before the provenance record existed — owner: **user**, the one user-owned question this change surfaced) and `OQ-0027` (duplicate item-ID definitions inside one spec are undetected by every validator — measured on a spec this change never touched, qa-strategist) and `OQ-0028`.
The sixth is `OQ-0028`: no validator reconciles a delta's declared ID ranges against the pack's actual contents (qa-strategist).

#### DR-0275: revoke the `spec-0017` / `CAP-0017` permanent-gap reservation

- Date: 2026-08-05
- Decision: the 2026-05-06 permanent-gap reservation on `spec-0017` and `CAP-0017` is revoked. Both return to being ordinary reusable IDs, and `spec-0017` is renumbered immediately as `CAP-0017 = Repository Toolchain`.
- Context: `validateSpecSplitByCapability` derives its expected spec set **positionally** from the CAP count — the expected list is built by mapping each CAP's list **index** to `spec-000<index+1>` (`packages/qfai/src/core/validators/specSplitByCapability.ts:75`), so actual CAP numbers are never read. With 17 CAP rows it expects `spec-0001..spec-0017`. A 17th capability therefore had **no legal name**: `spec-0017` violated the reservation, and `spec-0018` raised `QFAI-SPLIT-103` (missing `spec-0017`) **and** `QFAI-SPLIT-104` (extra `spec-0018`) simultaneously, both at `error`.
- Rationale: a reserved gap ID — at **any** position — and a positional 1:1 gate are mutually unsatisfiable from the moment the CAP count reaches that ordinal. Because the expected set only ever grows, a reservation is never permanently safe; it is only not-yet-due. The reservation was therefore not merely inconvenient but structurally unmaintainable — it blocked every future capability addition, not just this one. Renumbering is the only state that satisfies both the gate and the catalog.
- Rejected: keep the reservation and name the new spec `spec-0018`
  - DO NOT: leave **any** gap ID reserved while the 1:1 gate is positional — a trailing reservation is not safer than an inner one, only later. Temptation: honouring a documented reservation feels like the conservative choice, but here it produces a permanently red validate.
- Rejected: keep the reservation and make the validator ID-based (pair `CAP-NNNN` with `spec-NNNN` by number) in this same change
  - DO NOT: bundle a validator behaviour change into a spec-allocation change. Temptation: "fix the root cause once and for all" — but the validator is CAP-0004 surface with its own tests, and `08_Decisions.md` DR-0001-0005 forbids inflating a pack beyond an atomic slice. Recorded as `OQ-0023` instead.
- Residual risk: §ID 安定性ルール 5's default (leave a gap) still contradicts the positional gate for **any** future DELETE / SUPERSEDE, wherever the gap falls, once the capability count reaches that ordinal — inner-range or trailing is irrelevant, as CHG-007 itself demonstrated (`spec-0017` was a **trailing** gap and detonated at the very next capability addition). §ID 安定性ルール 5 now states this position-independently as a **rule**, not as an inner-gap exception; see `11_Slice-Policy.md` §ID 安定性ルール 5. `OQ-0023` tracks making the validator ID-based so the default stops being a trap.
- Evidence: `packages/qfai/src/core/validators/specSplitByCapability.ts:60-131`; `_policies/11_Slice-Policy.md` §ID 安定性ルール 5 + §Current Slicing Notes.
- Related: `CAP-0017`, `spec-0017`, `_policies/07_Constraints.md` OC-71, `_policies/11_Slice-Policy.md`. Source REQ: REQ-0001..0025 (precondition of the allocation). Trace: discussion-20260804173914356 OQ-0015.

#### DR-0276: `toolchain` as a fifth slice category

- Date: 2026-08-05
- Decision: add a fifth slice category `toolchain` holding the repository's own tooling — `.github/workflows/`, the repository-internal composite actions under `.github/actions/**`, root `scripts/`, `packages/qfai/scripts/`, and the test-runner configuration (`vitest.config.ts` / `vitest.workspace.ts`) — as one collective spec. `.github/actions/**` is named explicitly because `scripts/verify-pack.mjs` bans composite actions only from the **shipped** `.github` tree (`assets/init/root/.github`); repository-internal ones are legal and would otherwise be the one toolchain surface with no owner.
- Context: measured against the tree, **no spec owns** `.github/workflows/ci.yml`, `permissions:`, action pinning, or `vitest.workspace.ts`; all 11 root `scripts/*.mjs` are unclaimed by any pack, as is `packages/qfai/scripts/check-branch-version-pin.sh`. The four existing categories are each defined by a **distributed** product surface, so repository-internal tooling had no category.
- Rationale: the gap is a category gap, not a CI gap. Filing only the CI work would leave the other orphans unowned and reproduce the same hole at the next toolchain change.
- Boundary: shipped workflow templates (`assets/init/root/.github/workflows/**`) stay with **CAP-0003** (`qfai init`). Distributed-or-not is the boundary, so the two surfaces the discussion pack separates stay separated in the spec layer too.
- Rejected: append the own-CI requirements to `spec-0004`
  - Reason: `spec-0004`'s subject is the `qfai validate` command; its implementation surface is `src/core/validators/**` + `src/cli/commands/validate.ts`, disjoint from `.github/workflows/**`. `10_delta.md:212` (異なる機能を1つのスペックに詰め込まない) applies directly.
  - DO NOT: file GitHub Actions job topology under the validate command spec. Temptation: `spec-0004` already owns two `pnpm ci:lint` lanes, so it looks like the established home for "CI things".
- Rejected: split the own-CI work across `spec-0004` (lint lane) / `spec-0009` (test config) / `spec-0011` (parallelism)
  - Reason: `spec-0009` scopes **adopter** repository config discovery, not QFAI's own workspace; `spec-0011`'s parallelism is agent/worktree-level, not CI-worker-level. All three would be scope escapes, and one design would be fragmented across three packs.
  - DO NOT: distribute one cohesive design across three specs. Temptation: every fragment individually looks like an append to something that already exists.
- Consequences: `toolchain` is a collective category like `agent` — toolchain constituents do not each get their own spec. The category is repository-internal by construction, so nothing `spec-0017` owns is distributed; conversely every shipped-template requirement stays outside it and inside `CAP-0003`.
- Related: `CAP-0017`, `spec-0017`, `spec-0003`, `_policies/11_Slice-Policy.md` §スライスカテゴリ. Source REQ: REQ-0001..0013, REQ-0023, REQ-0025 (own-CI / toolchain rows); REQ-0014..0022, REQ-0024 stay on the distributed side. Trace: discussion-20260804173914356 OQ-0015.

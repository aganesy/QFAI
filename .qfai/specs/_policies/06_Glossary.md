# 06 Glossary

## 用語定義

| Term                         | Definition                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QFAI                         | Quality-First AI - AI コーディングエージェント向けの品質第一開発キット                                                                                                                                   |
| SDD                          | Specification-Driven Development - 仕様駆動開発。仕様を先に定義し、それに基づいて実装する手法                                                                                                            |
| ATDD                         | Acceptance Test-Driven Development - 受入テスト駆動開発。受入条件を先にテストとして定義する手法                                                                                                          |
| TDD                          | Test-Driven Development - テスト駆動開発。Red-Green-Refactor サイクル                                                                                                                                    |
| Spec                         | Specification - 仕様。QFAI では `.qfai/specs/spec-XXXX/` 配下の構造化ファイル群                                                                                                                          |
| Layered Spec                 | レイヤードスペック。`_policies/`（共有）と `spec-XXXX/`（個別）に分離した仕様構造                                                                                                                        |
| Spec Pack                    | レガシーの単一18ファイルバンドル形式のスペック                                                                                                                                                           |
| \_policies                   | 共有ポリシーディレクトリ。複数 spec-XXXX にまたがる横断的な仕様（Objective, Initiative, Capabilities 等）                                                                                                |
| Discussion Pack              | ディスカッションパック。15ファイル構成の統合討議成果物（`.qfai/discussion/discussion-*/`）                                                                                                               |
| OQ                           | Open Question - 未解決の質問/課題。`11_OQ-Register.md` で管理                                                                                                                                            |
| OQ Register                  | 全 OQ を管理する台帳。Disposition（open/resolved/deferred/rejected）で状態管理                                                                                                                           |
| Contract                     | コントラクト。UI/API/DB の定義ファイル。`.qfai/contracts/` 配下                                                                                                                                          |
| Traceability                 | トレーサビリティ。要件からテストへの追跡可能性                                                                                                                                                           |
| Traceability Edge            | トレーサビリティの参照関係                                                                                                                                                                               |
| Validator                    | バリデータ。特定の検証ルールを実装する async 関数。`Issue[]` を返す                                                                                                                                      |
| Issue                        | バリデーション結果の個別項目。code, severity, message, file 等を持つ                                                                                                                                     |
| Waiver                       | ウェイバー。特定ルールの suppress（抑制）または downgrade（重要度下げ）                                                                                                                                  |
| CAP                          | Capability - 能力/機能単位。`CAP-XXXX` 形式。`_policies/03_Capabilities.md` で定義                                                                                                                       |
| ATDD Annotation              | テストファイル内のトレーサビリティアノテーション                                                                                                                                                         |
| Review Pack                  | レビューパック。`review-*/` 配下のレビュー成果物。`qfai init` 管理ブロックによりデフォルトで gitignore 対象（v1.7.18 以降）。追跡したい場合はプロジェクト側で明示的 negation を追加する                  |
| Drift Protocol               | ドリフトプロトコル。仕様とコードの乖離を検出・記録する仕組み                                                                                                                                             |
| Skill                        | スキル。QFAI ワークフローの独立した実行単位。SKILL.md で定義され、入力・出力・ロール・完了契約・Evidence 要件を持つ                                                                                      |
| Agent                        | エージェント（サブエージェント）。Skill 内で委任される専門化された作業者。19 の統合 taxonomy が定義され、Mission・Inputs・Deliverables・Stop Conditions・Sign-off 構造を持つ                             |
| Orchestrator                 | 作業命令の作成・委任・統合・結果提示のみを行うメタエージェント。第一草稿の直接生成と自己承認が禁止されている                                                                                             |
| Steering                     | ステアリング。manifest, product, structure, tech, test-layers の 5 文書で構成される意思決定の背骨                                                                                                        |
| Instructions                 | 操作プレイブック。workflow, drift-protocol, constitution, agent-selection, requirements-decomposition の 5 文書                                                                                          |
| Constitution                 | 10 個の非交渉条項（Article I〜X）。Evidence over confidence、No invented facts、SDD is SSOT、AskUserQuestion MUST 等。例外なし                                                                           |
| Capability Probe             | Skill 開始時に最初の必須委任を実行し、その実委任の成否でサブエージェント利用可否を判定するプロトコル。事前確認や自己代行フォールバックは行わない                                                         |
| Escalation Hook              | spec-XXXX/01_Spec.md に記載される `_policies` への参照委譲メカニズム。NFR・policy・requirements の copy-down を行う                                                                                      |
| AskUserQuestion              | VS Code Copilot Chat が提供するユーザーへの質問機能。Chat UI 上で構造化選択肢付きの質問を提示できる。Article X により全 Skill で MUST 使用が規定される                                                   |
| AskUserQuestion Protocol     | 各 Skill の SKILL.md に定義される、AskUserQuestion 使用方法のルール。MUST 使用→構造化選択肢→フォールバックの 3 行パターンで統一される。Article X で非交渉条項化                                          |
| Traceability Chain           | discussion → specs → tests → code → verification の 5 段階連鎖。各段の成果物が ID で追跡可能                                                                                                             |
| Change Request               | Drift Protocol 発動時に作成される変更提案。context, proposed change, 3+ 選択肢, 推奨, 影響範囲を含む                                                                                                     |
| Agent Routing                | agent-routing.yml と review-profiles.yml で定義される reviewer / worker の呼び出し規則。skill / phase / condition ごとに mandatory / conditional / rerun policy を持つ                                   |
| RCP                          | Review Cycle Protocol。レビュー周回手順。append-only、FAIL 即修正、roster 先頭から再実行                                                                                                                 |
| Canonical Workflow Stages    | Stage 0（steering refresh）〜 Stage 6（verify）の 7 段階ワークフロー                                                                                                                                     |
| Work Orders Summary          | サブエージェント委任の記録テーブル。Step, Role, Task title, Input refs, Output refs, Status の列を持つ                                                                                                   |
| Completion Contract          | 各 Skill またはアイテム/スペックの完了判定条件を定義する契約。必須成果物一覧、OQ exit 条件、Gate pass 条件を含む                                                                                         |
| Evidence                     | Skill 実行の客観的証拠。.qfai/evidence/ 配下に markdown（人間向け）+ json（機械向け）で記録。gitignored                                                                                                  |
| Reference Direction Rule     | upper-to-lower 禁止（\_policies に US/AC/BR/EX/TC を書かない）、lower-to-upper 許可の参照方向規則                                                                                                        |
| Canonical Skill              | QFAI パッケージの SSOT スキルファイル。`qfai init` 後は `.qfai/assistant/skills/` が SSOT。シンボリックリンクで各 IDE 統合ディレクトリに配布される                                                       |
| Canonical Agent              | QFAI パッケージの SSOT エージェントファイル。`qfai init` 後は `.qfai/assistant/agents/` が SSOT。ファイルシンボリックリンクで統合ディレクトリに配布される                                                |
| Wrapper                      | レガシーのコピーベース配布方式で `.claude/commands/` や `.github/prompts/` に配置されていた qfai-\* ファイル。symlink 移行により削除対象                                                                 |
| Directory Symlink            | ディレクトリシンボリックリンク。スキル配布に使用。Windows では `fs.symlink(target, path, 'dir')` で作成                                                                                                  |
| File Symlink                 | ファイルシンボリックリンク。エージェント配布に使用。Windows では `fs.symlink(target, path, 'file')` で作成                                                                                               |
| core.symlinks                | Git の設定項目。`true` に設定することでシンボリックリンクを正しく追跡する。`qfai init` が自動設定する                                                                                                    |
| Developer Mode               | Windows でシンボリックリンク作成に必要な権限設定。有効でない場合、`qfai init` はエラーメッセージを出して停止する                                                                                         |
| Integration Directory        | 各 IDE/ツールがスキルやエージェントを読み込むディレクトリ。`.claude/skills/`, `.agents/skills/`, `.codex/skills/`, `.github/skills/`, `.claude/agents/`, `.github/agents/` 等                            |
| qfai init                    | QFAI の初期化コマンド。レガシー Wrapper の削除、シンボリックリンクの作成、`core.symlinks` の設定、`copilot-instructions.md` の参照更新を行う                                                             |
| Prune                        | `qfai init` の初期化ステップで、レガシーの `.claude/commands/` および `.github/prompts/` 配下の qfai-\* Wrapper ファイルを削除する操作                                                                   |
| SDP                          | Spec Diff Protocol。下流スキル実行時に spec 変更を自動検出し、インクリメンタル処理を可能にするプロトコル                                                                                                 |
| Preflight Diff               | スキル実行前に行う差分検出フェーズ。Phase 0 として3つのソース（git diff, timestamp, delta.md）から changed_specs を特定する                                                                              |
| changed_specs                | Preflight Diff で検出された変更 spec のリスト。Source A と B の union                                                                                                                                    |
| change_context               | delta.md から取得した変更の意図情報（Primary/Tags）。changed_specs の補強情報                                                                                                                            |
| affected_specs               | changed_specs に policy 変更による影響波及分を加えた最終的な処理対象 spec リスト                                                                                                                         |
| ISA                          | Implementation State Analysis。QFAI アノテーションをスキャンし、obligations の実装状態を分類する分析フェーズ                                                                                             |
| Incremental Mode             | 下流スキルの実行モード。SDP の Preflight Diff 結果に基づき、missing + stale obligations のみを処理する                                                                                                   |
| 全否定エージェント           | Devil's Advocate Agent。全てが間違いという前提でレビューし、こじつけ・屁理屈・全否定で自分の意見を通すレビュアー                                                                                         |
| パターン倍増エージェント     | Pattern Doubler Agent。ID 付きパターン数の 2 倍を目標に倍増を強制するレビュアー                                                                                                                          |
| アドバイザリー降格           | Advisory Demotion。全否定エージェントの 3 回連続 FAIL 後、FAIL をブロッキングから参考意見に降格する仕組み                                                                                                |
| ID付き項目                   | ID-bearing item。US-XXXX, AC-XXXX 等のプレフィックス付き連番を持つ成果物項目                                                                                                                             |
| Design Token                 | UI のビジュアル属性（色、タイポグラフィ、スペーシング等）を名前付きの値として定義するシステム。primitive → semantic → component の 3 層構造で管理する。（W3C DTCG）                                      |
| Primitive Token              | 生の値を保持する最低層のデザイントークン。例: `color.blue.600: #2563eb`                                                                                                                                  |
| Semantic Token               | 意味的な名前を持ち、Primitive Token を参照するトークン。例: `color.primary: {color.blue.600}`                                                                                                            |
| Component Token              | 特定の UI コンポーネントに紐づくトークン。例: `button.primary.bg: {color.primary}`                                                                                                                       |
| HTML+CSS Visual Mock         | discussion 内に埋め込まれる自己完結型の HTML+CSS スニペット。v1.7.12 以降はオプション/フォールバックであり、UI-bearing パック完了の必須要件ではない。                                                    |
| UI 定義 3 点セット           | Design Token YAML + HTML+CSS Visual Mock + Mermaid 画面遷移図の組み合わせ。UI の見た目・構造・遷移を網羅的に定義する。                                                                                   |
| Research-First Protocol      | 専門家サブエージェントが作業開始前に必ず実施するリサーチプロトコル。対象プラットフォーム・ドメインに関する最新のベストプラクティスとアンチパターンを調査し、作業の基盤とする。                           |
| UI/UX Expert                 | ユーザビリティ評価・認知負荷分析・情報設計・インタラクション設計を専門とするサブエージェント。                                                                                                           |
| Design Expert                | ビジュアルデザイン・色彩・タイポグラフィ・レイアウト・Design Token 設計を専門とするサブエージェント。                                                                                                    |
| Screen Transition Expert     | 画面遷移フロー設計・状態管理・条件分岐・エラー/例外遷移・ディープリンクを専門とするサブエージェント。                                                                                                    |
| Navigation Expert            | IA 構造設計・メニュー/タブ/サイドバー設計・ブレッドクラム・導線最適化・ファネル設計を専門とするサブエージェント。                                                                                        |
| Integrated UI/UX Reviewer    | 4 専門家の成果物を統合的にレビューし、個別評価に加えてサービス全体の使い勝手の良さを統合的に評価するサブエージェント。review-roster 13 番目。                                                            |
| ゆるやかな責務分離           | 4 専門家間の責務境界の設計方針。大枠で領域を分けるが、重複する領域は複数の専門家が協調して担当し、統合レビュアーが最終調整を行う。                                                                       |
| IA（情報アーキテクチャ）     | 情報の組織化・分類・ナビゲーション構造の設計。カードソート・ツリーテスト等の手法で検証する。                                                                                                             |
| ベストプラクティス DB        | UI/UX のベストプラクティスを体系化したルールセット。プラットフォーム共通層 + プラットフォーム固有層の 2 層構造。永続保存せず毎回 /qfai-discussion 実行時に最新情報を調査し記録。                         |
| アンチパターン DB            | UI/UX のアンチパターン（ダークパターン含む）を体系化したルールセット。自動検出ルールと手動チェック項目に分類。永続保存せず毎回 /qfai-discussion 実行時に最新情報を調査し記録。                           |
| UI/UX 消費プロトコル         | 下流 skill（prototyping, ATDD, TDD）が UI 定義 3 点セット + UI Contract を読み取り解釈する手順の定義。                                                                                                   |
| qfai-implement               | v1.6.0で導入された統一実装スキル。旧3つのTDDスキルを置き換え、単一の呼び出しでRed-Green-Refactorマイクロサイクルを実行する                                                                               |
| test-list.md                 | `.qfai/specs/spec-XXXX/tdd/test-list.md` に配置される実行台帳。TDDアイテムの進捗をマークダウンテーブルで追跡する。必須列（v1.6.1）: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence |
| Phase 1 バリデータ           | test-list.md の構造検証を行うバリデータ。ファイル存在、テーブル存在、必須列、ステータス列挙値、TC参照の妥当性を検証する                                                                                  |
| TDD マイクロサイクル         | Red-Green-Refactor の1テスト単位のループ。Red: 失敗テスト作成、Green: 最小限の実装、Refactor: コード改善                                                                                                 |
| Phase 2 バリデータ           | test-list.md のコンテンツ検証を行うバリデータ。TC網羅性、例外DR-ID必須、テストファイル実在、TDD-ID一意性・フォーマットを検証する（v1.6.1）                                                               |
| TDDLIST_TC_NOT_COVERED       | Phase 2 エラーコード。06_Test-Cases.md の unit/component TC が test-list.md に未収載の場合に発行される                                                                                                   |
| TDDLIST_EXCEPTION_MISSING_DR | Phase 2 エラーコード。Status=exception の行に DR-ID が空の場合に発行される                                                                                                                               |
| TDDLIST_TEST_FILE_MISSING    | Phase 2 エラーコード。Status が green/refactor/done の行で Test file が実在しない場合に発行される                                                                                                        |
| TDDLIST_DUPLICATE_ID         | Phase 2 エラーコード。同一 spec 内で TDD-ID が重複する場合に発行される                                                                                                                                   |
| TDDLIST_INVALID_ID           | Phase 2 エラーコード。TDD-ID が TDD-NNNN パターンに合致しない場合に発行される                                                                                                                            |
| DR-ID                        | Decision Record Identifier。exception ステータスの根拠となる意思決定記録の識別子。Phase 2 で必須化される                                                                                                 |
| Delivery Planner             | qfai-implement における TDD マイクロサイクルの選択・並列可否・完了ゲートを管理する planning agent                                                                                                        |
| Frontend / Backend Engineer  | RED→GREEN→Refactor を実装する worker。対象スライスに応じて frontend-engineer または backend-engineer が担当する                                                                                          |
| QA Gatekeeper                | RED/GREEN 証拠、validate、coverage、runtime、prototyping evidence を検証する gate reviewer                                                                                                               |
| Completion Reviewer          | Completion Contract、spec 整合、drift-protocol を検証する reviewer                                                                                                                                       |
| Implementation Reviewer      | コード品質、保守性、backend 安全性を検証する reviewer                                                                                                                                                    |
| Evidence Contract            | TDD アイテムごとのエビデンス最低要件を定義する契約                                                                                                                                                       |
| Independent Slice            | 並列実行可能な独立したテスト対象の単位                                                                                                                                                                   |
| Fresh Evidence               | 現在のコード状態に対して取得された最新のエビデンス                                                                                                                                                       |
| Copilot Instructions         | `.github/instructions/` 配下の Markdown ファイル。YAML frontmatter（applyTo, excludeAgent）を持ち、GitHub Copilot のコードレビュー動作を指示する                                                         |
| SDD Insertion Marker         | `<!-- qfai:language-rules -->` コメント。/qfai-sdd が言語固有ルールを追記する挿入ポイント                                                                                                                |
| create-only Protection       | ファイルが存在しない場合のみ作成し、--force でも上書きしない保護メカニズム。instructions と specs/contracts で適用                                                                                       |

| Design Direction Pack (DDP) | UI 仕様の上位入力。ビジュアルテーゼ・コンテンツプラン・インタラクションテーゼ・アンチゴール・CTA 階層を含む |
| ビジュアルテーゼ (Visual Thesis) | 1 文のムード・素材・温度・エネルギー要約 |
| コンテンツプラン (Content Plan) | セクション役割と順序（ヒーロー・サポート・ディテール・CTA） |
| インタラクションテーゼ (Interaction Thesis) | 2-3 のモーション原則 |
| アンチゴール (Anti-goals) | UI が「あってはならない」状態の明示 |
| CTA 階層 (CTA Hierarchy) | プライマリ/セカンダリ/ターシャリのアクション優先順位と配置 |
| ジェネリックパターン (Generic Pattern) | 量産型カードグリッド・弱いヒーロー・無意味なグラデーション等の禁止パターン |
| レンダークリティークループ (Render Critique Loop) | 初回レンダー→デスクトップ/モバイル批評→反復改善 |
| フィデリティスコアカード (Fidelity Scorecard) | 美的・ユーザビリティ・アクセシビリティ・レスポンシブの同時評価 |
| Research-to-Constraint 変換 | Research Summary の知見を contracts/design の BP/AP rule DB へ変換し、downstream の拘束条件にするプロセス |
| taskFidelity | uiFidelity の拡張。DOM 充足だけでなく、タスク完遂に必要な CTA 可視性・step 数・状態表現を評価する指標 |
| 高忠実度テンプレート (High-Fidelity Template) | Story Workshop の Screen Mock テンプレートで、page objective、CTA hierarchy、states、情報密度 rationale 等を必須項目として含むもの |
| 体験仕様 (Experience Spec) | UI Contract を要素台帳から拡張し、purpose / primary_user_task / states / max_primary_steps を含めた体験設計の SSOT |
| Quality Profile | qfai.config.yaml で宣言するプロジェクト固有の UI/UX 方針。b2b-dense / consumer / mobile-first 等のプリセット |
| max_primary_steps | primary task を完遂するための最大許容ステップ数。デフォルト 3 |
| BP/AP Rule DB | contracts/design 配下に配置するベストプラクティス/アンチパターンの実データ YAML。schema だけでなく実ルールを持つ |
| UI-bearing discussion pack | UI アーティファクト（taste interview、trend/reference scan、3-layer evaluation 等）を含むディスカッションパック。v1.7.0 で DDS 必須化、v1.7.12 で 3-layer canonical model に統一、v1.7.13 で canonical file rename (30_option_comparison, 31_selected_anchor_screen, 40_screen_contracts, 50_review_input_bundle) |
| Design Direction Summary (DDS) | 03_Story-Workshop.md に配置される設計方向性セクション。ビジュアルテーゼ、オプション比較、アンカースクリーン、CTA 階層、ステート網羅性、アンチゴールを含む |
| Competitive Reference Registry | 04_Sources.md に配置される競合参考 UI の構造化レジストリ。adopted_points, rejected_points, local_translation の 3 フィールドが必須 |
| Structural check | プレゼンス（存在/不在）を検証するバイナリチェック。v1.7.0 で error 重大度が割り当てられる |
| Heuristic check | 品質・美観を判定する主観的チェック。v1.7.2+ に延期 |
| Render Evidence | `/qfai-prototyping` スキルが route × viewport ごとに保存する screenshot / HTML snapshot の構造化証跡。`captured` / `skipped` / `failed` を区別する |
| Typed Outcome | render capture helper が返す型付き結果。成功・退避・失敗を throw ではなく明示状態として返す |
| Design Audit | UI-bearing artifact に対する静的設計品質監査。tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity の 7 dimension で構造的不備を検知する。Context: v1.7.2 新機能 |
| Slop | AI 生成 UI に再現性のある低品質パターン。generic AI SaaS shell, token bypass, CTA inflation 等。Context: v1.7.2 のガードレール対象 |
| Slop Guardrails | slop パターンを rule-based に検知するバリデータ。designSlop.ts + designSlopPatterns.json で構成。Context: v1.7.2 新機能 |
| Audit Dimension | Design Audit の検査軸。7 つの dimension で構成。Context: designAudit.ts の内部構造 |
| Rule Tier | ルールの重要度分類。Tier 1 (structural-blocking), Tier 2 (strong-advisory), Tier 3 (style-heuristic)。Context: severity mapping の入力 |
| Quality Profile (v1.7.2) | Rule Tier から severity へのマッピングを制御するプロファイル。default, high, strict の 3 種。Context: config.uiux.qualityProfile |
| Token Drift | design token 定義があるにもかかわらず contracts/mocks で raw 値が繰り返し使用される状態。Context: tokenDiscipline dimension の検査対象 |
| uiux/ サイドカー (uiux/ sidecar) | UI-bearing プロジェクト向けに qfai-discussion が生成する補助アーティファクトディレクトリ。11ファイルで構成される |
| Surface Classification (サーフェス分類) | プロジェクトの UI surface type (web, mobile, desktop, mixed, non-ui) を分類する仕組み。01_Context.md に explicit classification block として記載される |
| Implementation Strategy (実装戦略) | UI/UX 実装アプローチを YAML で定義するサイドカーアーティファクト (10_strategy.md) |
| Scoring Axes (スコアリング軸) | invariant, trend-derived, product-specific の3層評価フレームワーク |
| Anchor Screen (アンカースクリーン) | オプション比較から選定される参照画面デザイン。canonical record は uiux/31_selected_anchor_screen.md |
| Screen Contract (スクリーンコントラクト) | 画面レベルの UI 義務を構造化 Markdown（表形式）で定義するサイドカーアーティファクト (uiux/40_screen_contracts.md)。11 required fields（secondary_tasks 含む）。将来 YAML 化される可能性がある |
| Option Comparison (オプション比較) | 2つ以上のデザイン代替案をスコアリング軸に沿って構造化比較すること。canonical file は uiux/30_option_comparison.md（Selected Direction は含まず、31_selected_anchor_screen.md に分離） |
| Selected Anchor (選択アンカー) | オプション比較から選定された方向性とアンカースクリーンの canonical record。uiux/31_selected_anchor_screen.md に記載 |
| Review Input Bundle (レビュー入力バンドル) | サイドカー出力をまとめた統合アーティファクトパッケージ (uiux/50_review_input_bundle.md) |
| Dynamic Overrides (動的オーバーライド) | 3-layer evaluation の動的上書き定義 (uiux/24_design_eval_dynamic_overrides.md)。OPTIONAL — 存在しなくてもファミリ完全性エラーにはならない |
| UI-bearing Classification (UI-bearing 分類) | 01_Context.md に配置される explicit classification block。surface type (web, mobile, desktop, mixed, non-ui) を宣言し、UI-bearing 判定の primary SSOT となる |
| Direct Template (ダイレクトテンプレート) | v1.7.3 で置換される3テンプレート (03, 04, 14) |
| Batch A/B Templates (バッチA/Bテンプレート) | UX intent クロスリファレンスで拡張されるコアテンプレート群 (01, 02, 05-12, 99) |
| UIX-VAL | Deterministic validator rule family for UI/UX artifacts。Shape/completeness/contradiction checks のみ。LLM 非依存。Context: v1.7.4 新機能 |
| UIX-REV | Semantic reviewer check family for UI/UX artifacts。Strategy quality, scoring weakness, generic fallback risk を評価する。Context: v1.7.4 新機能 |
| Deterministic validator | 同一入力に対して同一出力を返すバリデータ。外部状態・乱数・LLM 依存なし。UIX-VAL ファミリの設計原則 |
| Stale asset | サイドカーアーティファクトのテンプレートバージョンが現行 QFAI バージョンのテンプレートより古い状態。マイグレーション検出の対象 |
| Hard gate | progression をブロックするバリデーションチェック（error severity を出力）。UIX-VAL のみが hard gate として機能する |
| Soft gate | 警告するが progression をブロックしないバリデーションチェック（warning severity を出力）。Migration checks のデフォルト |
| Actionable error | rule ID + file path + description + fix suggestion を含むエラー出力。UIX-VAL/UIX-REV の出力形式 |
| Verify-pack | アーティファクトの作成からバリデーションまでの full lifecycle を検証する end-to-end テスト |
| Fixture (テストフィクスチャ) | 特定のバリデータルールを検証するための pass/fail テスト入力アーティファクト |
| Warning-error ratchet | 段階的エンフォースメント戦略。warning で開始し、採用期間後に error に昇格する。v1.7.4 migration enforcement policy の基盤 |
| Static-first | runtime-heavy checks を default completion から外し、軽量 obligations を優先する prototyping 方針。Context: v1.7.5 で default に復帰 |
| Runtime-heavy checks | API non-404、DB existence、UI route reachability など環境依存の強い確認。default completion gate から除外される |
| Capability declaration | optional backend/evidence 機能の利用可否を明示する宣言。fail-open/skipped semantics を持つ |
| Provider abstraction | backend 実装差異を吸収する登録インターフェース。optional registration で browser-like/screenshot-only 等を統一管理 |
| Fail-open | optional capability 不在時に全体を block せず継続する振る舞い。skipped semantics と組み合わせて使用 |
| Skipped semantics | capability や環境不足により未実行であることを明示的に表す状態。evidence の capture status に反映 |
| Browser QA | smoke、interaction、visual、accessibility を扱う browser-based quality check。structured findings を返す |
| Structured finding | phase、repair suggestion 等を持つ機械可読な QA 出力。browser QA の標準出力形式 |
| Mode-aware obligations | standard / low-cost / full-harness など mode ごとに異なる完了判定条件。義務の混線を防ぐ |
| Critique Adapter | 外部批評プロバイダーへのインターフェース層。fail-open semantics を持ち、プロバイダー障害時は批評をスキップする |
| Critique Provider | Critique Adapter の背後にある実際の外部批評サービス。generic command interface で接続 |
| Calibration Pack | スコアリング整合性、accept/refine/pivot ポリシー、プラトー処理を定義するファイルベースのアセット群 |
| Full-Harness | premium prototyping mode で使用される planner/generator/evaluator の反復ループ構造 |
| Premium Path | `/qfai-prototyping --mode full-harness` で明示的にオプトインする高品質プロトタイピングモード |
| Plateau Detection | スコアデルタ閾値と lookback で改善停滞を検出し、ループを早期終了させるメカニズム |
| Loop Exit Policy | accept（品質達成）、plateau（改善停滞）、cap（最大反復数到達）の 3 条件で loop を終了するポリシー |
| Handoff Artifact | long-running session の中断時に生成される再開可能なアーティファクト。planner/generator/evaluator の状態をキャプチャ |
| Display-Only Detection | 表面的な UI 表示のみで実質的な機能実装がない出力を検出するヒューリスティック |
| Stub-Only Detection | stub メソッドのみで実装が未完了の出力を検出するヒューリスティック |
| Scoring Alignment | calibration pack 内のスコアリング基準定義。run 間・チームメンバー間のスコアリング一貫性を保証 |
| Accept/Refine/Pivot | evaluator の判定ポリシー。accept=品質達成で出力、refine=フィードバック付きで再生成、pivot=planner に差し戻し |
| Reviewer Drift | run 間でレビュアーのスコアリング傾向が変化すること。observability で追跡される |
| Capability Profile | premium path の利用可否、コスト、推奨モードをプロジェクト特性に基づいて判定するプロファイル |
| Interaction Depth | 生成出力の実装深度を測定する指標。display-only/stub-only detection の入力 |
| Correction-and-Convergence | 新思想を追加せず、既に確定した仕様へ repo を収束させるリリースタイプ |
| 3-Layer Evaluation Model | invariant / trend-derived / product-specific の3層で構成される評価軸モデル |
| Invariant Axes | プロジェクトによらず常に適用される基底評価軸 |
| Trend-Derived Axes | live trend research から動的に生成される評価軸。freshness metadata を持つ |
| Product-Specific Axes | プロダクト固有のコンテキストから導出される評価軸 |
| Scoring-Ready Schema | 16 fields を持つ評価軸の完全スキーマ |
| Design Taste Interview | UI-bearing project の discussion で実施する9項目の必須ヒアリング |
| Trend/Reference Research | UI-bearing discussion の必須リサーチ。最新トレンドと競合参考 UI を調査する |
| Over-Fire | non-UI project で本来発火すべきでない validator が発火する不具合 |
| Spec Auto-Discovery Protocol | spec引数省略時に4ソース統合差分検出（git diff + ローカル変更 + timestamp + delta.md）を起動し対象specを自動特定するプロトコル | SKILL.md / TypeScript | SRC-0001 |
| Traceability Integrity | specのBR/AC変更と対応する実装コードの変更が整合している状態 | validation | discussion-20260330183225659 |
| Traceability Drift | specのBR/ACが変更されたのに対応する実装コードに変更がない状態（トレーサビリティ断絶） | validation | discussion-20260330183225659 |
| Implementation State | 各specの実装状態分類: implemented（実装済み）, missing（未実装）, stale（古い実装）, unchanged（変更なし） | diff detection | spec-0011 |
| Diff Context | evidenceファイルに記録される差分検出の実行コンテキスト（last_commit_sha, last_run_timestamp, changed_specs, execution_mode） | evidence | spec-0011 |
| Canonical Validator | production-path validator registered in `validate.ts` pipeline. Distinguished from legacy/compatibility validators by `category: "canonical"` in emitted issues. |
| Existence-Based Precedence (D-5) | mode resolution rule where the mere existence of the `prototyping` key in `prototyping.yaml` makes the namespaced contract authoritative, regardless of value validity. |
| IssueCategory | type discriminator for validator findings — `"canonical"` (production contract violations), `"change"` (change-related findings). v1.7.14: `"compatibility"` は削除済み（DR-0108）。 |
| Legacy Validator | [REMOVED v1.7.14] `validators/legacy/` namespace は v1.7.14 で完全削除済み（DR-0115）。 |
| prototyping.yaml | required side artifact in discussion-pack alongside 15 markdown files. Contains `prototyping.recommended_mode`, `rationale`, `allowed_modes`, `surface` fields. |
| Prototyping Mode | one of `low-cost` (static only), `standard` (default), `full-harness` (opt-in runtime-heavy). Resolved via precedence: user-specified > discussion recommendation > system default. |
| Recommendation Artifact | `prototyping.yaml` file in discussion-pack. Status: valid/invalid/missing/no-pack. Resolved by `resolveLatestRecommendationArtifact()`. |
| runCanonicalUixValidators | production-path UIX validator entrypoint replacing `runAllUixValidators`. Runs 11 modular validators in parallel from `uix/canonical.ts`（v1.7.14: rollout.ts 削除により 12→11）。 |
| Browser QA 4-Phase Model | browser-level QA を smoke → interaction → visual → accessibility の 4 フェーズで順次実行するモデル。`browserQa/runner.ts` が orchestrate し `BrowserQaRunResult` を集約。|
| Evidence Bundle | render capture + Browser QA 結果 + prototyping summary を `.qfai/evidence/` に JSON バンドルとして永続化する単位。`evidence/bundleWriter.ts` が生成。|
| UI Fidelity Builder | render evidence + Browser QA 結果から UI fidelity artifact を合成するモジュール。required evidence 欠落時は QFAI-PROT-270/271/272 を emit。|
| Prototyping Execution Orchestrator | `prototyping/execution.ts` — mode resolution → evidence capture → Browser QA → full-harness の本番パスを統合実行するエントリポイント。|
| Provider Registry | `providers/registry.ts` — `QfaiPrototypingConfig` から concrete provider（Playwright/custom）を解決する依存逆転パターン。|
| Surface Type Detection | `detection/surfaceType.ts` — 01_Context.md の明示的分類ブロック（ui_bearing/primary_surface）を優先し、フォールバックとして surface_type フィールドを使用する判定モジュール。|
| Classification Block | 01_Context.md に記載する構造化ブロック。`ui_bearing`, `primary_surface`, `secondary_surfaces`, `classification_rationale` の 4 フィールドで構成。`classification.ts` バリデータが検証。|
| Research Pipeline | Web リサーチの標準 8 ステージ実行順序。search → rank → fetch → extract → sanitize → cache → verify → cite を固定順で実行する。 |
| Content Sanitization | 取得コンテンツから制御文字、`aria-hidden` 要素、`display:none` 要素を除去する安全化処理。ML ベース判定は使わない。 |
| Domain Allowlist | 既定拒否のネットワークアクセス制御。明示許可したドメインのみ fetch / redirect を許可する。 |
| Research Session Log | リサーチ実行の監査ログ。検索語、取得 URL、content hash、sanitization event、verification 結果、最終 citation を含み、秘密情報を含めない。 |
| HITL Gate | Human-in-the-Loop によるリスクベース承認ゲート。高リスクまたは低信頼の結果のみ人手承認を要求する。 |
| Citation Precision | 最終回答の引用が実ソース内容を正確に裏づけている度合いを測る評価指標。 |
| Source Freshness | 使用ソースの更新性・時点妥当性を表す評価観点。キャッシュしきい値や再取得判断の基準となる。 |

## 略語一覧

| Abbreviation              | Full Form                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| CLI                       | Command-Line Interface                                                                                                                                                                                                           |
| CI/CD                     | Continuous Integration / Continuous Delivery                                                                                                                                                                                     |
| DOM                       | Document Object Model                                                                                                                                                                                                            |
| ESM                       | ECMAScript Modules                                                                                                                                                                                                               |
| CJS                       | CommonJS                                                                                                                                                                                                                         |
| SSOT                      | Single Source of Truth                                                                                                                                                                                                           |
| NFR                       | Non-Functional Requirement                                                                                                                                                                                                       |
| REQ                       | Functional Requirement                                                                                                                                                                                                           |
| API                       | Application Programming Interface                                                                                                                                                                                                |
| UI                        | User Interface                                                                                                                                                                                                                   |
| DB                        | Database                                                                                                                                                                                                                         |
| YAML                      | YAML Ain't Markup Language                                                                                                                                                                                                       |
| JSON                      | JavaScript Object Notation                                                                                                                                                                                                       |
| OSS                       | Open Source Software                                                                                                                                                                                                             |
| CR                        | Change Request                                                                                                                                                                                                                   |
| RCP                       | Review Cycle Protocol                                                                                                                                                                                                            |
| SDP                       | Spec Diff Protocol                                                                                                                                                                                                               |
| ISA                       | Implementation State Analysis                                                                                                                                                                                                    |
| TDD-ID                    | Test-Driven Development Item Identifier                                                                                                                                                                                          |
| DR-ID                     | Decision Record Identifier                                                                                                                                                                                                       |
| DDP                       | Design Direction Pack                                                                                                                                                                                                            |
| DDS                       | Design Direction Summary                                                                                                                                                                                                         |
| REA                       | Render Evidence Automation                                                                                                                                                                                                       |
| SLP                       | Slop Pattern — AI slop カテゴリ ID プレフィックス (v1.7.2)                                                                                                                                                                       |
| AUD                       | Audit — Design Audit ルール ID プレフィックス (v1.7.2)                                                                                                                                                                           |
| UIX-VAL                   | UI/UX Validation — deterministic validator ルール ID プレフィックス (v1.7.4)                                                                                                                                                     |
| UIX-REV                   | UI/UX Review — semantic reviewer ルール ID プレフィックス (v1.7.4)                                                                                                                                                               |
| FH                        | Full-Harness — premium prototyping mode の反復ループ構造                                                                                                                                                                         |
| HITL                      | Human-in-the-Loop                                                                                                                                                                                                                |
| SDP                       | Spec Diff Protocol                                                                                                                                                                                                               | Spec Auto-Discovery Protocol の略称 |
| l2Evidence                | L2 Evidence Module — `l2Evidence.ts` が提供する 3 つの builder 関数（buildDiscussionAxisInputs / buildScreenContractInputs / buildTrendAlignmentInputs）で実 discussion artifact から L2 入力を導出するモジュール (v1.7.15 rev2) |
| ScreenObservation         | Screen-level UI 観測型。route / htmlCaptureRef / domLabelsFound / elementsPlaced / actionsWired / mockPathFindings を screen 単位で保持する (v1.7.15 rev2)                                                                       |
| TerminationContext        | Full-harness 終了判定コンテキスト。`{ calibration: CalibrationPack; history: FullHarnessHistory }` を受け、CalibrationPack 以外からの plateauLookback 解決を禁止 (v1.7.15 rev2)                                                  |
| MeasurementResult         | Full-harness 計測結果型。panelInputs と 8 カテゴリ evidenceRefs を同時に返す strict 型 (v1.7.15 rev2)                                                                                                                            |
| evidenceRefs 8 categories | iteration ごとに必須の 8 つの evidence カテゴリ: runtimeGate / render / browserQa / uiObservation / specCoverage / discussion / screenContract / trend (v1.7.15 rev2)                                                            |
| schema v2 (bundleWriter)  | bundleWriter の新 iteration schema。8 カテゴリ evidenceRefs + FullHarnessIteration 新型の required fields を定義。v1 との並存を禁止 (v1.7.15 rev2)                                                                               |
| fail-closed               | 入力不備時にデフォルト値で続行せず即座に失敗する設計方針。CalibrationLoader / validatePanelInputs / specCoverage 等に適用 (v1.7.15 rev2)                                                                                         |
| validatePanelInputs       | panelInputs の必須項目欠落を検出する検証関数。10 種類の silent pass を error に昇格 (v1.7.15 rev2)                                                                                                                               |

| canonical route | URL パスとは分離された、spec 定義上の論理ルート識別子。`runtimeGate` / `specCoverage` はこの canonical route を基準に計測する (v1.7.15 rev4) |
| screen-level measurement | 各 screen contract に対して個別に render / Browser QA / observation を実施する測定方式 (v1.7.15 rev4) |
| render target | render パネルの測定対象画面。rev4 では `"/primary"` 固定値を廃止し、canonical screen contract から動的に決定 (v1.7.15 rev4) |
| structured parse | L2 evidence の構築において、artifact を構造化パーサーで解析する方式。heuristic fallback より優先 (v1.7.15 rev4) |
| heuristic fallback | structured parse が利用できない場合に、テキストパターンマッチ等の経験則で L2 入力を推定する方式。rev4 では適用範囲を縮小 (v1.7.15 rev4) |
| canonical screen contract | screen contract の正規化された表現。画面 ID / ルート / 期待 DOM 構造 / 期待アクションを定義 (v1.7.15 rev4) |
| missing_observation | 画面契約に存在するがオブザベーションにないルートに対する specCoverage のレポートステータス (v1.7.15 rev4) |
| reality sync | docs / SKILL / README が runtime / validator / tests の実体と一致した状態 (v1.7.15 rev4) |
| Design Guideline Research | UI-bearing discussion で Material Design / WCAG / Apple HIG / 採用 UI ライブラリ等の基準を収集し、`04_Sources.md` に traceable に記録する research step (v1.7.17) |
| design_guideline_research | `04_Sources.md` に追加される canonical category。デザイン指南書由来の定量基準や rule ID を保持するための領域 (v1.7.17) |
| Quantitative Proxy | `score_anchors` の concreteness を支える具体表現。px 値、比率、WCAG rule ID、class 名、library default value などを含む (v1.7.17) |

## 使用ルール

- 全成果物で上記の用語定義に従い、一貫した用語を使用すること
- 新しい用語が登場した場合は本 Glossary に追加すること
- 略語は初出時にフルフォームを併記すること

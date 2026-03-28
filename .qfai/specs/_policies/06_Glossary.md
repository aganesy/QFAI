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
| Review Pack                  | レビューパック。`review-*/` 配下のレビュー成果物                                                                                                                                                         |
| Drift Protocol               | ドリフトプロトコル。仕様とコードの乖離を検出・記録する仕組み                                                                                                                                             |
| Skill                        | スキル。QFAI ワークフローの独立した実行単位。SKILL.md で定義され、入力・出力・ロール・完了契約・Evidence 要件を持つ                                                                                      |
| Agent                        | エージェント（サブエージェント）。Skill 内で委任される専門化された作業者。39 種類が定義され、Mission・Inputs・Deliverables・Stop Conditions・Sign-off 構造を持つ                                         |
| Orchestrator                 | 作業命令の作成・委任・統合・結果提示のみを行うメタエージェント。第一草稿の直接生成と自己承認が禁止されている                                                                                             |
| Steering                     | ステアリング。manifest, product, structure, tech, test-layers の 5 文書で構成される意思決定の背骨                                                                                                        |
| Instructions                 | 操作プレイブック。workflow, drift-protocol, constitution, agent-selection, requirements-decomposition の 5 文書                                                                                          |
| Constitution                 | 10 個の非交渉条項（Article I〜X）。Evidence over confidence、No invented facts、SDD is SSOT、AskUserQuestion MUST 等。例外なし                                                                           |
| Capability Probe             | Skill 開始時にサブエージェント利用可否を確認する軽量テスト。失敗時は Simulation Mode の承認を要求する                                                                                                    |
| Simulation Mode              | サブエージェント利用不可時にユーザー承認のもとでロールを逐次エミュレートするフォールバック。明示的 opt-in 必須                                                                                           |
| Escalation Hook              | spec-XXXX/01_Spec.md に記載される `_policies` への参照委譲メカニズム。NFR・policy・requirements の copy-down を行う                                                                                      |
| AskUserQuestion              | VS Code Copilot Chat が提供するユーザーへの質問機能。Chat UI 上で構造化選択肢付きの質問を提示できる。Article X により全 Skill で MUST 使用が規定される                                                   |
| AskUserQuestion Protocol     | 各 Skill の SKILL.md に定義される、AskUserQuestion 使用方法のルール。MUST 使用→構造化選択肢→フォールバックの 3 行パターンで統一される。Article X で非交渉条項化                                          |
| Traceability Chain           | discussion → specs → tests → code → verification の 5 段階連鎖。各段の成果物が ID で追跡可能                                                                                                             |
| Change Request               | Drift Protocol 発動時に作成される変更提案。context, proposed change, 3+ 選択肢, 推奨, 影響範囲を含む                                                                                                     |
| Review Roster                | review-roster.yml で定義される 10 人のレビュアーリスト。scope, must_check, can_be_na, na_rule を持つ                                                                                                     |
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
| HTML+CSS Visual Mock         | discussion/spec 内に埋め込まれる自己完結型の HTML+CSS スニペット。Design Token のフォールバック値を持ち、ブラウザで直接プレビュー可能。                                                                  |
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
| TDDCycleController           | qfai-implement のマスターオーケストレーター。TDD マイクロサイクルの選択・起動・完了ゲートを管理する                                                                                                      |
| TDDImplementer               | RED→GREEN→Refactor の実コード変更を担当するサブエージェント                                                                                                                                              |
| RedGreenAuditor              | RED/GREEN 証拠の妥当性を検証するサブエージェント                                                                                                                                                         |
| TDDSpecReviewer              | スペック準拠と上流トレーサビリティを検証するサブエージェント                                                                                                                                             |
| TDDCodeQualityReviewer       | コード品質（リファクタリング含む）を検証するサブエージェント                                                                                                                                             |
| ParallelSliceDispatcher      | 独立スライスの並列ディスパッチを制御するサブエージェント                                                                                                                                                 |
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
| UI-bearing discussion pack | UI アーティファクト（HTML+CSS モック、Mermaid 画面遷移図等）を含むディスカッションパック。v1.7.0 で DDS 必須化の対象となる |
| Design Direction Summary (DDS) | 03_Story-Workshop.md に配置される設計方向性セクション。ビジュアルテーゼ、オプション比較、アンカースクリーン、CTA 階層、ステート網羅性、アンチゴールを含む |
| Competitive Reference Registry | 04_Sources.md に配置される競合参考 UI の構造化レジストリ。adopted_points, rejected_points, local_translation の 3 フィールドが必須 |
| Structural check | プレゼンス（存在/不在）を検証するバイナリチェック。v1.7.0 で error 重大度が割り当てられる |
| Heuristic check | 品質・美観を判定する主観的チェック。v1.7.2+ に延期 |
| Render Evidence | `qfai prototyping` が route × viewport ごとに保存する screenshot / HTML snapshot の構造化証跡。`captured` / `skipped` / `failed` を区別する |
| Typed Outcome | render capture helper が返す型付き結果。成功・退避・失敗を throw ではなく明示状態として返す |
| Design Audit | UI-bearing artifact に対する静的設計品質監査。tokenDiscipline, visualHierarchy, stateCoverage, densityBalance, referenceTranslation, antiPatternRisk, flowClarity の 7 dimension で構造的不備を検知する。Context: v1.7.2 新機能 |
| Slop | AI 生成 UI に再現性のある低品質パターン。generic AI SaaS shell, token bypass, CTA inflation 等。Context: v1.7.2 のガードレール対象 |
| Slop Guardrails | slop パターンを rule-based に検知するバリデータ。designSlop.ts + designSlopPatterns.json で構成。Context: v1.7.2 新機能 |
| Audit Dimension | Design Audit の検査軸。7 つの dimension で構成。Context: designAudit.ts の内部構造 |
| Rule Tier | ルールの重要度分類。Tier 1 (structural-blocking), Tier 2 (strong-advisory), Tier 3 (style-heuristic)。Context: severity mapping の入力 |
| Quality Profile (v1.7.2) | Rule Tier から severity へのマッピングを制御するプロファイル。default, high, strict の 3 種。Context: config.uiux.qualityProfile |
| Token Drift | design token 定義があるにもかかわらず contracts/mocks で raw 値が繰り返し使用される状態。Context: tokenDiscipline dimension の検査対象 |
| uiux/ サイドカー (uiux/ sidecar) | UI-bearing プロジェクト向けに qfai-discussion が生成する補助アーティファクトディレクトリ。11ファイルで構成される |
| Surface Classification (サーフェス分類) | プロジェクトの UI surface type (web-ui, mobile-ui, desktop-ui, mixed, non-ui) を分類する仕組み |
| Implementation Strategy (実装戦略) | UI/UX 実装アプローチを YAML で定義するサイドカーアーティファクト (10_strategy.md) |
| Scoring Axes (スコアリング軸) | invariant, trend-derived, product-specific の3層評価フレームワーク |
| Anchor Screen (アンカースクリーン) | オプション比較から選定される参照画面デザイン |
| Screen Contract (スクリーンコントラクト) | 画面レベルの UI 義務を構造化 Markdown（表形式）で定義するサイドカーアーティファクト (uiux/40_contracts.md)。将来 YAML 化される可能性がある |
| Option Comparison (オプション比較) | 2つ以上のデザイン代替案をスコアリング軸に沿って構造化比較すること |
| Review Input Bundle (レビュー入力バンドル) | サイドカー出力をまとめた統合アーティファクトパッケージ |
| Critique Loop (クリティークループ) | デザイン批評サイクルを追跡する反復レビューアーティファクト |
| Direct Template (ダイレクトテンプレート) | v1.7.3 で置換される3テンプレート (03, 04, 14) |
| Batch A/B Templates (バッチA/Bテンプレート) | UX intent クロスリファレンスで拡張されるコアテンプレート群 (01, 02, 05-12, 99) |
| MCP (Model Context Protocol) | AIエージェントが外部ツールと通信するためのプロトコル。JSON-RPC 2.0 ベース、stdio/HTTP トランスポート対応 |
| Research Pipeline | Web リサーチの標準パイプライン。search→rank→fetch→extract→sanitize→cache→verify→cite の8ステージで構成 |
| HITL Gate (Human-in-the-Loop Gate) | リサーチ結果をコードに適用する前にユーザー承認を要求するレビューゲート |
| Content Sanitization | Web から取得したコンテンツから隠し文字・制御文字・非表示DOM要素を除去する処理 |
| Domain Allowlist | エージェントがアクセスを許可されたドメインの明示的リスト。デフォルト拒否方式 |
| Golden Task | リサーチ品質の回帰テスト用に定義された期待出力付きタスク |
| Progressive Disclosure | SKILL.md のメタデータのみを先に読み込み、本文はタスク開始時に展開する方式 |
| Research Session Log | リサーチセッションの構造化ログ。クエリ・URL・ハッシュ・検証結果・引用を記録 |

## 略語一覧

| Abbreviation | Full Form                                                  |
| ------------ | ---------------------------------------------------------- |
| CLI          | Command-Line Interface                                     |
| CI/CD        | Continuous Integration / Continuous Delivery               |
| DOM          | Document Object Model                                      |
| ESM          | ECMAScript Modules                                         |
| CJS          | CommonJS                                                   |
| SSOT         | Single Source of Truth                                     |
| NFR          | Non-Functional Requirement                                 |
| REQ          | Functional Requirement                                     |
| API          | Application Programming Interface                          |
| UI           | User Interface                                             |
| DB           | Database                                                   |
| YAML         | YAML Ain't Markup Language                                 |
| JSON         | JavaScript Object Notation                                 |
| OSS          | Open Source Software                                       |
| CR           | Change Request                                             |
| RCP          | Review Cycle Protocol                                      |
| SDP          | Spec Diff Protocol                                         |
| ISA          | Implementation State Analysis                              |
| TDD-ID       | Test-Driven Development Item Identifier                    |
| DR-ID        | Decision Record Identifier                                 |
| DDP          | Design Direction Pack                                      |
| DDS          | Design Direction Summary                                   |
| REA          | Render Evidence Automation                                 |
| SLP          | Slop Pattern — AI slop カテゴリ ID プレフィックス (v1.7.2) |
| AUD          | Audit — Design Audit ルール ID プレフィックス (v1.7.2)     |
| MCP          | Model Context Protocol                                     |
| HITL         | Human-in-the-Loop                                          |

## 使用ルール

- 全成果物で上記の用語定義に従い、一貫した用語を使用すること
- 新しい用語が登場した場合は本 Glossary に追加すること
- 略語は初出時にフルフォームを併記すること

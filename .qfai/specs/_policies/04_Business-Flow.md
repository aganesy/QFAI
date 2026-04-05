# 04 Business Flow

## Purpose

- QFAI CLI ツールの高レベルビジネスプロセスをポリシーレイヤーの SSOT として記述する。
- 受入シナリオの詳細は各 `spec-XXXX/03_Acceptance-Criteria.md` に記載する。

## Actors / Systems

- Actor: 開発者 / AI コーディングエージェント / CI/CD パイプライン
- System: QFAI CLI

## Preconditions

- Node.js >= 18.0.0 がインストールされていること
- プロジェクトルートに `qfai.config.yaml` が存在すること（`qfai init` 後）

## Flow Overview

1. 開発者または AI エージェントが `qfai init` でワークスペースを初期化する
2. ディスカッションパック（15ファイル）を作成し、要件を整理する
3. スペック（SDD）を生成する
4. `qfai validate` でスペックを検証し、問題があれば修正する
5. プロトタイプを実装し、`qfai validate --phase atdd` で検証する
6. 受入テスト（ATDD）を実装する
7. TDD サイクル（Red -> Green -> Refactor）でコードを実装する
8. `qfai validate --phase full` で最終検証する
9. `qfai report` でレポートを生成する

## Diagram (Mermaid required)

```mermaid
flowchart TD
    START([開発者/AIエージェント]) --> INIT["qfai init<br/>ワークスペース初期化"]
    INIT --> DISCUSS["ディスカッションパック作成"]
    DISCUSS --> SDD["スペック生成 (SDD)"]
    SDD --> VALIDATE_SPEC["qfai validate<br/>スペック検証"]
    VALIDATE_SPEC -->|PASS| PROTO["プロトタイプ実装"]
    VALIDATE_SPEC -->|FAIL| FIX_SPEC["スペック修正"]
    FIX_SPEC --> VALIDATE_SPEC
    PROTO --> VALIDATE_PROTO["qfai validate --phase atdd<br/>プロトタイプ検証"]
    VALIDATE_PROTO -->|PASS| ATDD["受入テスト実装 (ATDD)"]
    VALIDATE_PROTO -->|FAIL| FIX_PROTO["プロトタイプ修正"]
    FIX_PROTO --> VALIDATE_PROTO
    ATDD --> TDD["TDD サイクル<br/>Red - Green - Refactor"]
    TDD --> VALIDATE_FULL["qfai validate --phase full<br/>最終検証"]
    VALIDATE_FULL -->|PASS| REPORT["qfai report<br/>レポート生成"]
    VALIDATE_FULL -->|FAIL| FIX_CODE["コード修正"]
    FIX_CODE --> VALIDATE_FULL
    REPORT --> DONE([完了])
```

```mermaid
sequenceDiagram
    autonumber
    participant User as 開発者/CI
    participant CLI as qfai CLI
    participant Config as config.ts
    participant Discovery as discovery.ts
    participant Validate as validate.ts
    participant Validators as Validators (33+)
    participant Output as Report/Log

    User->>CLI: qfai validate --fail-on error --format github
    CLI->>Config: loadConfig(root)
    Config-->>CLI: QfaiConfig
    CLI->>Validate: validateProject(root, config, options)
    Validate->>Discovery: collectSpecEntries(specsRoot)
    Discovery-->>Validate: SpecEntry[]
    loop 各バリデータ (33+)
        Validate->>Validators: validate*(root, config, ...)
        Validators-->>Validate: Issue[]
    end
    Validate->>Validate: applyWaivers(issues, waivers)
    Validate-->>CLI: ValidationResult
    CLI->>Output: validate.json + console/github output
    CLI-->>User: exit code (0 or 1)
```

## Alternate / Exception Flows

- ALT-01: ウェイバーが設定されている場合、該当ルールの issue は suppress または downgrade される
- ALT-02: `--phase` オプションにより、バリデーション対象を限定できる（full/atdd/tdd/refinement）
- EX-01: 設定ファイル不在の場合、`qfai doctor` で診断を推奨するエラーメッセージを表示
- EX-02: テストディレクトリが存在しない場合、ATDD チェックはスキップされる

## Canonical Workflow Stages (Assistant Framework)

QFAI の Assistant Framework は以下の 7 ステージで構成される Canonical Workflow を定義する。

```mermaid
flowchart TD
    S0["Stage 0: Steering Refresh<br/>プロジェクトメモリ更新"] --> S1["Stage 1: /qfai-discussion<br/>ディスカッションパック作成"]
    S1 --> S2["Stage 2: Requirements<br/>(.qfai/require/)"]
    S2 --> S3["Stage 3: /qfai-sdd<br/>Contracts → Outline → Slice → Plan → Delta"]
    S3 --> S4{"UI 要件あり?"}
    S4 -->|Yes| S4a["Stage 4: /qfai-prototyping<br/>全 specs 対象"]
    S4 -->|No| S5["Stage 5: /qfai-atdd<br/>E2E/API/Integration"]
    S4a --> S5
    S5 --> S6["Stage 6: /qfai-verify<br/>Quality Gates + Evidence"]
    S6 --> GATE{"全 Gate PASS?"}
    GATE -->|Yes| DONE["DONE → PR 作成"]
    GATE -->|No| FIX["修正 → 該当 Skill に戻る"]
    FIX --> S3
```

```mermaid
flowchart LR
    subgraph SkillDeps["Skill 依存関係"]
        disc["discussion"] --> sdd["sdd"]
        sdd --> proto["prototyping<br/>(optional)"]
        sdd --> atdd["atdd"]
        proto --> atdd
        atdd --> verify["verify"]
        conf["configure"] -.-> disc
    end

    subgraph Abolished["v1.6.0 廃止"]
        tdd_r["tdd-red<br/>❌ 廃止"] -.->|abolished| atdd
        tdd_g["tdd-green<br/>❌ 廃止"] -.->|abolished| atdd
        tdd_rf["tdd-refactor<br/>❌ 廃止"] -.->|abolished| verify
    end

    subgraph Replacement["v1.6.0 新規"]
        implement["qfai-implement<br/>(統一実装スキル)"] --> verify
        atdd --> implement
    end
```

### Drift Recovery Flow

下流フェーズで upstream SSOT との不整合を検出した場合:

1. STOP — 下流の編集を即座に停止
2. Change Request 作成（context, 3+ 選択肢, 推奨, 影響範囲）
3. ユーザー承認を待機
4. Owner skill rerun で upstream を修正
5. 下流の作業を再開

### Review Cycle Flow

Skill 完了後:

1. Review Request 発行
2. Roster 順に全 reviewer を実行
3. FAIL 検出 → 修正 → 新 review-pack → roster 先頭から再実行
4. 全 reviewer PASS（または valid N/A）で完了

## SDP Incremental Flow (v1.5.5)

Spec 更新後の下流スキル実行時、SDP によりインクリメンタル処理が行われる。

```mermaid
flowchart TD
    SDD_UPDATE["/qfai-sdd spec 更新"] --> PREFLIGHT["Phase 0: Preflight Diff"]

    subgraph PREFLIGHT_SUB["Preflight Diff Protocol"]
        SRC_A["Source A: git diff<br/>last_sha → HEAD"]
        SRC_B["Source B: timestamp<br/>evidence vs spec mtime"]
        SRC_C["Source C: delta.md<br/>Primary/Tags パース"]
        UNION["changed_specs = union(A, B)<br/>change_context = C"]
        SRC_A --> UNION
        SRC_B --> UNION
        SRC_C --> UNION
    end

    PREFLIGHT --> SRC_A
    PREFLIGHT --> SRC_B
    PREFLIGHT --> SRC_C

    UNION --> HAS_CHANGES{"changed_specs<br/>あり?"}
    HAS_CHANGES -->|No| SKIP["スキップ<br/>(verify のみ推奨)"]
    HAS_CHANGES -->|Yes| ISA["Phase 0.5: ISA<br/>Implementation State Analysis"]
    ISA --> CLASSIFY["implemented / missing<br/>/ stale / unchanged"]
    CLASSIFY --> EXEC["Incremental Execution<br/>missing + stale のみ処理"]
    EXEC --> EVIDENCE["Evidence 更新<br/>sha + timestamp + spec リスト"]
```

- `/qfai-prototyping`: changed_specs のスケルトンのみ更新。unchanged は Runtime Gate 検証のみ。
- `/qfai-atdd`: missing obligations の新規テスト生成 + stale obligations のテスト更新。unchanged はスキップ。
- `/qfai-verify`: SDP 適用外。常にフルスキャン。

## Notes

- CLI ツールのため画面モックは対象外。
- `qfai report --format md` の出力がレポートの主要な可読形式となる。

## v1.5.6 レビューサイクルフロー（拡張レビュアー）

v1.5.6 では既存 10 名のレビュアー（R01〜R10）に加え、R11 全否定エージェントと R12 パターン倍増エージェントが追加された。

```mermaid
sequenceDiagram
    autonumber
    participant Skill as Skill 実行
    participant R01_10 as R01〜R10<br/>既存レビュアー
    participant R11 as R11 全否定エージェント<br/>(devils-advocate)
    participant R12 as R12 パターン倍増エージェント<br/>(pattern-doubler)
    participant Fix as 修正フェーズ

    Skill->>R01_10: レビューサイクル開始（Review Request 発行）
    loop 既存レビュアー全員
        R01_10->>R01_10: レビュー実行
        alt FAIL 検出
            R01_10-->>Fix: FAIL（ブロッキング）
            Fix-->>Skill: 修正完了 → R01 から再起動
        end
    end
    R01_10-->>R11: 既存 10 名 PASS → R11 実行
    R11->>R11: 全否定前提でレビュー実行
    alt R11 FAIL（1〜2 回目）
        R11-->>Fix: FAIL（ブロッキング）
        Fix-->>Skill: 修正完了 → R01 から再起動
    else R11 FAIL（3 回連続）
        R11-->>R12: アドバイザリー降格（FAILを参考意見として扱い続行）
    else R11 PASS または N/A
        R11-->>R12: R12 実行へ
    end
    R12->>R12: ID付きパターン数の2倍増を検証
    alt R12 FAIL
        R12-->>Fix: FAIL（ブロッキング）
        Fix-->>Skill: 修正完了 → R01 から再起動
    else R12 PASS または N/A
        R12-->>Skill: 全レビュアー完了 → スキル完了
    end
```

### レビューサイクルルール（v1.5.6 追加分）

- R11（全否定エージェント）はこじつけ・屁理屈・全否定でレビューし、FAIL を発行できる（ブロッキング）。
- R11 が 3 回連続で FAIL を発行した場合、アドバイザリー降格が適用され、以降 R11 の FAIL は参考意見として扱われる（スキル完了をブロックしない）。
- R12（パターン倍増エージェント）は全 skill 共通。ID 付き項目数が目標（現在数の 2 倍）に達しない場合に FAIL を発行できる（ブロッキング）。R12 は成果物に ID 付き項目が存在しない場合は N/A とする。
- 既存 R01〜R10 の設定変更は禁止。いずれかの FAIL → 修正 → R01 からの再起動は v1.5.5 以前と同一。

## v1.5.7 UI/UX 定義ライフサイクルフロー

v1.5.7 では CAP-0013 として UI/UX 定義・レビュー体系が導入される。UI 定義 3 点セット（Design Token + HTML+CSS Visual Mock + Mermaid 画面遷移図）の作成から下流 skill での消費・レビューまでの一連のフローを定義する。

```mermaid
flowchart TD
    DISCUSS["/qfai-discussion<br/>ディスカッション実行"] --> RESEARCH["Research-First Protocol<br/>Expert サブエージェント調査<br/>(UI/UX Expert, Design Expert,<br/>Screen Transition Expert, Navigation Expert)"]
    RESEARCH --> BPDB["ベストプラクティス DB 構築<br/>+ アンチパターン DB 構築<br/>（discussion-pack に記録）"]
    BPDB --> UIDEF["UI 定義 3 点セット作成<br/>① Design Token YAML<br/>② HTML+CSS Visual Mock<br/>③ Mermaid 画面遷移図"]
    UIDEF --> SDD["/qfai-sdd<br/>UI Contract 更新<br/>(contracts/design/ + contracts/ui/)"]
    SDD --> PROTO["/qfai-prototyping<br/>UI/UX 消費プロトコルで<br/>3 点セット + UI Contract を参照<br/>→ プロトタイプ生成"]
    PROTO --> REVIEW["UI/UX レビュー<br/>自動: qfai validate ルール<br/>手動: Integrated UI/UX Reviewer (R13)<br/>+ 既存 R01〜R12"]
    REVIEW -->|PASS| ATDD["/qfai-atdd<br/>UI 定義に基づく<br/>受入テスト生成"]
    REVIEW -->|FAIL| FIX["修正フェーズ<br/>→ 該当 Expert に差し戻し"]
    FIX --> REVIEW
    ATDD --> DONE(["完了"])
```

## v1.6.2 qfai-implement サブエージェントオーケストレーション

v1.6.2 では CAP-0016 として `qfai-implement` の内部オーケストレーション層が堅牢化される。サブエージェントロスターの形式化、完了/エビデンス/並列コントラクトの導入、および Docs/Wrappers/Assets テスト同期が実施される。

```mermaid
flowchart TD
    IMPLEMENT["/qfai-implement 呼び出し"] --> CONTROLLER["Delivery Planner<br/>サイクル選択・並列可否・完了ゲート"]
    CONTROLLER --> DISPATCH{"並列実行可能?<br/>Independent Slice?"}
    DISPATCH -->|Yes| PARALLEL["Frontend / Backend Engineer<br/>並列ディスパッチ"]
    DISPATCH -->|No| SERIAL["逐次実行"]
    PARALLEL --> IMPLEMENTER["Frontend / Backend Engineer<br/>RED→GREEN→Refactor 実装"]
    SERIAL --> IMPLEMENTER
    IMPLEMENTER --> EVIDENCE_CHECK["Evidence Contract 検証<br/>Fresh Evidence 取得確認"]
    EVIDENCE_CHECK --> AUDITOR["QA Gatekeeper<br/>RED/GREEN 証拠検証"]
    AUDITOR --> COMPLETION_CHECK{"Completion Contract<br/>満足?"}
    COMPLETION_CHECK -->|No| CONTROLLER
    COMPLETION_CHECK -->|Yes| SPEC_REVIEW["Completion Reviewer<br/>スペック準拠・drift 検証"]
    SPEC_REVIEW --> QUALITY_REVIEW["Implementation Reviewer<br/>コード品質・保守性検証"]
    QUALITY_REVIEW --> DONE(["TDD アイテム完了"])
```

- `Delivery Planner`: qfai-implement におけるマスターオーケストレーター。サイクル選択・並列可否・完了ゲートを管理する。
- `Completion Contract`: アイテム/スペック単位で完了判定条件を定義し、未完了での前進を防止する。
- `Evidence Contract`: TDD アイテムごとの Fresh Evidence 最低要件を定義し、stale evidence を拒否する。
- `Independent Slice`: 共有状態のない独立スライスのみ並列実行可能（DR-0016 制約継続）。

## v1.6.5 Design Direction ライフサイクルフロー

v1.6.5 では CAP-0019〜CAP-0022 として Design Direction Pack（DDP）を起点とした UI 品質強化ライフサイクルが導入される。DDP 作成からフィデリティ評価までの一連のフローを定義する。

```mermaid
flowchart TD
    REQUEST([ユーザーリクエスト]) --> DDP_CREATE["Design Direction Pack 作成<br/>ビジュアルテーゼ・コンテンツプラン<br/>インタラクションテーゼ・アンチゴール<br/>CTA 階層"]
    DDP_CREATE --> DDP_VALIDATE{"DDP フィールド検証<br/>必須フィールド充足?"}
    DDP_VALIDATE -->|FAIL| DDP_FIX["DDP 修正<br/>不足フィールド補完"]
    DDP_FIX --> DDP_VALIDATE
    DDP_VALIDATE -->|PASS| NAV_FLOW["Navigation/Screen Flow 定義<br/>Mermaid SSOT<br/>画面遷移・エラーリカバリー"]
    NAV_FLOW --> SDD["/qfai-sdd<br/>DDP + Flow を spec 反映"]
    SDD --> PROTO["/qfai-prototyping<br/>DDP 参照でプロトタイプ生成<br/>禁止ジェネリックパターン検査"]
    PROTO --> CRITIQUE_DESKTOP["Render Critique Loop<br/>デスクトップ批評"]
    CRITIQUE_DESKTOP --> CRITIQUE_MOBILE["Render Critique Loop<br/>モバイル批評"]
    CRITIQUE_MOBILE --> CRITIQUE_CHECK{"批評結果<br/>改善必要?"}
    CRITIQUE_CHECK -->|Yes| CRITIQUE_FIX["反復改善<br/>→ 再レンダリング"]
    CRITIQUE_FIX --> CRITIQUE_DESKTOP
    CRITIQUE_CHECK -->|No| FIDELITY["Fidelity Scorecard 評価<br/>階層・明確性<br/>アクセシビリティ・レスポンシブ"]
    FIDELITY --> FIDELITY_CHECK{"スコアカード<br/>全項目 PASS?"}
    FIDELITY_CHECK -->|FAIL| FIDELITY_FIX["スコアカード指摘修正"]
    FIDELITY_FIX --> CRITIQUE_DESKTOP
    FIDELITY_CHECK -->|PASS| IMPLEMENT["/qfai-implement<br/>実装フェーズへ"]
```

## v1.7.0 ディスカッション設計強化フロー

v1.7.0 では CAP-0023 として、UI-bearing ディスカッションパックに対する設計方向性の強制検証が導入される。

```mermaid
flowchart TD
    START(["/qfai-discussion 開始"]) --> DETECT{"UI-bearing<br/>アーティファクト検出?"}
    DETECT -->|No| STANDARD["標準パック検証<br/>(既存フロー維持)"]
    DETECT -->|Yes| DDS_CHECK["DDS セクション検証<br/>QFAI-DDP-019"]
    DDS_CHECK --> OPT_COMP["オプション比較検証<br/>QFAI-DDP-020"]
    OPT_COMP --> ANCHOR["アンカースクリーン検証<br/>QFAI-DDP-021"]
    ANCHOR --> COMP_REF["競合リファレンス検証<br/>QFAI-DDP-022"]
    COMP_REF --> CTA["CTA 階層検証<br/>QFAI-DDP-023"]
    CTA --> STATE["ステート網羅性検証<br/>QFAI-DDP-024"]
    STATE --> ANTI["デザインアンチゴール検証<br/>QFAI-DDP-025"]
    ANTI --> PASS(["全検証 PASS → /qfai-sdd へ"])
    STANDARD --> DONE(["完了"])
    DDS_CHECK -->|FAIL| ERROR["error 出力<br/>(blocking)"]
    OPT_COMP -->|FAIL| ERROR
    ANCHOR -->|FAIL| ERROR
    COMP_REF -->|FAIL| ERROR
    CTA -->|FAIL| ERROR
    STATE -->|FAIL| ERROR
    ANTI -->|FAIL| ERROR
    ERROR --> FIX["修正 → 再検証"]
    FIX --> DETECT
```

## v1.7.2 Design Audit & Slop Guardrails フロー

v1.7.2 では CAP-0025 として、`qfai validate` パイプラインに静的 design audit と AI slop guardrails を統合する。

### Actors / Systems

- Actor: 開発者 / AI コーディングエージェント / CI/CD パイプライン
- System: QFAI CLI (`qfai validate`)
- Validators: designAudit.ts, designSlop.ts

### Preconditions

- UI-bearing discussion pack が存在すること
- config.uiux.audit.enabled が true であること（デフォルト）

### v1.7.2 Validate Pipeline Flow

```mermaid
flowchart TD
    A["qfai validate 起動"] --> B{"config: audit.enabled?"}
    B -->|false| SKIP["v1.7.2 バリデータ全スキップ"]
    B -->|true| C{"UI-bearing pack?"}
    C -->|"Non UI-bearing"| SKIP
    C -->|"UI-bearing"| D["Load: discussion pack + contracts + optional HTML mock"]
    D --> E["designAudit.ts: 7 dimension 監査"]
    E --> F{"config: slopDetection?"}
    F -->|true| G["designSlop.ts: SLP-01〜SLP-06 検知"]
    F -->|false| H["Skip slop detection"]
    G --> I["Quality Profile で tier→severity マッピング"]
    H --> I
    I --> J["Issue[] に変換・マージ"]
    J --> K{"findings exist?"}
    K -->|yes| L["Report: Design Audit / Slop Guardrails グループ化"]
    K -->|no| M["Report: all checks passed"]
    L --> N["CLI / CI 出力"]
    M --> N
```

### Audit Dimensions

designAudit.ts は以下の 7 dimension で静的監査を実行する:

1. **tokenDiscipline** — design token 遵守度
2. **visualHierarchy** — CTA・見出しの階層妥当性
3. **stateCoverage** — empty/error/loading/skeleton 状態網羅性
4. **densityBalance** — 情報密度・余白バランス
5. **referenceTranslation** — リファレンス翻訳精度
6. **antiPatternRisk** — アンチパターン一致度
7. **flowClarity** — 画面遷移・操作フロー明確性

### Slop Categories

designSlop.ts は designSlopPatterns.json のルール定義に基づき以下を検知する:

- SLP-01: Generic AI SaaS shell
- SLP-02: Over-decoration without task support
- SLP-03: Missing state realism
- SLP-04: CTA inflation
- SLP-05: Token bypass
- SLP-06: Reference cargo-culting

### Severity Mapping

| Quality Profile | Tier 1 (structural-blocking) | Tier 2 (strong-advisory) | Tier 3 (style-heuristic) |
| --------------- | ---------------------------- | ------------------------ | ------------------------ |
| default         | error                        | warning                  | info/warning             |
| high            | error                        | warning                  | warning                  |
| strict          | error                        | error                    | warning                  |

## v1.7.3 Discussion/UIUX Authoring Flow

qfai-discussion が UI-bearing プロジェクトを検出した場合、標準15ファイルパックに加えて `uiux/` サイドカーディレクトリを生成する。

```mermaid
flowchart TD
    A["User runs /qfai-discussion"] --> B{"UI-bearing project?"}
    B -->|Yes| C["Surface Classification"]
    C --> D["Strategy Selection"]
    D --> E["Scoring Axes Definition"]
    E --> F["Option Comparison"]
    F --> G["Anchor Screen Selection"]
    G --> H["Screen Contracts Draft"]
    H --> I["Generate uiux/ sidecar (11 files)"]
    I --> J["Core Pack + Sidecar Output"]
    B -->|No| K["Standard Discussion Flow"]
    K --> L["Core Pack Output Only"]
    J --> M["Ready for /qfai-sdd"]
    L --> M
```

- UI-bearing 検出: SKILL.md のヒューリスティックで surface type (web, mobile, desktop, mixed, non-ui) を分類
- サイドカー: 00_index, 10_strategy, 11_design_taste_interview, 20_design_eval_invariant, 21_design_eval_trend_derived, 22_design_eval_product_specific, 23_design_eval_aggregate, 24_design_eval_dynamic_overrides (OPTIONAL), 30_option_comparison, 31_selected_anchor_screen, 40_screen_contracts, 50_review_input_bundle
- 非 UI プロジェクト: サイドカーは生成されず、既存15ファイルパックのみ出力

## v1.7.4 UIX-VAL/UIX-REV Validation Flow

v1.7.4 では CAP-0027 として、`qfai validate` パイプラインに UIX-VAL deterministic validators と UIX-REV semantic reviewers を統合し、レガシープロジェクトのマイグレーション検出を追加する。

```mermaid
flowchart TD
    A["qfai validate 起動"] --> B{"UI-bearing<br/>detection"}
    B -->|"Non UI-bearing"| SKIP["UIX-VAL/UIX-REV 全スキップ<br/>(zero-noise guarantee)"]
    B -->|"UI-bearing"| C["UIX-VAL-* Deterministic Validators<br/>(Promise.all 並列実行)"]

    subgraph UIX_VAL["UIX-VAL Group (Hard Gate)"]
        V1["UIX-VAL-SIDECAR-MISSING<br/>サイドカー存在チェック"]
        V2["UIX-VAL-STRATEGY-INCOMPLETE<br/>戦略フィールド完全性"]
        V3["UIX-VAL-SCORING-INCOMPLETE<br/>スコアリング軸完全性"]
        V4["UIX-VAL-ANCHOR-MISSING<br/>アンカースクリーン存在"]
        V5["UIX-VAL-CONTRACTS-INCOMPLETE<br/>スクリーンコントラクト完全性"]
        V6["UIX-VAL-PROTO-MODE-MISMATCH<br/>プロトタイピングモード整合性"]
    end

    C --> V1
    C --> V2
    C --> V3
    C --> V4
    C --> V5
    C --> V6

    V1 --> MERGE["Issue[] マージ"]
    V2 --> MERGE
    V3 --> MERGE
    V4 --> MERGE
    V5 --> MERGE
    V6 --> MERGE

    MERGE --> D["UIX-REV-* Semantic Reviewers"]

    subgraph UIX_REV["UIX-REV Group (Soft Gate)"]
        R1["UIX-REV-STRATEGY-QUALITY<br/>戦略品質レビュー"]
        R2["UIX-REV-SCORING-WEAKNESS<br/>スコアリング弱点検出"]
        R3["UIX-REV-GENERIC-FALLBACK<br/>汎用フォールバック警告"]
    end

    D --> R1
    D --> R2
    D --> R3

    R1 --> REPORT["Report 出力<br/>(Issue[] 統合)"]
    R2 --> REPORT
    R3 --> REPORT

    SKIP --> DONE(["完了"])
    REPORT --> DONE

    subgraph MIGRATION["Migration Path"]
        M1["Stale asset detection<br/>テンプレートバージョン比較"]
        M2{"uiux.migration.strict?"}
        M2 -->|true| M3["error 出力<br/>(blocking)"]
        M2 -->|false| M4["warning 出力<br/>(non-blocking)"]
        M1 --> M2
    end

    C --> M1
    M3 --> MERGE
    M4 --> MERGE
```

### UIX-VAL/UIX-REV 責務分離

- **UIX-VAL (Hard Gate)**: アーティファクトの存在/不在、必須フィールドの空/非空、構造の完全性、矛盾検出、テンプレートバージョン比較。決定論的（同一入力→同一出力）。
- **UIX-REV (Soft Gate)**: 戦略品質、スコアリング弱点、汎用フォールバックリスク。セマンティックレビュー（出力が変動しうる）。
- **Migration**: stale asset 検出は UIX-VAL グループに統合。severity は `uiux.migration.strict` config で制御（デフォルト warning）。

## v1.7.5 Runtime & Evidence Foundation フロー

v1.7.5 では CAP-0028 として、`/qfai-prototyping` の default を static-first に戻し、render evidence / backend abstraction / browser QA を optional capability として整備する。

```mermaid
flowchart TD
    START(["/qfai-prototyping 実行"]) --> MODE["Mode Resolver<br/>default / opt-in mode 判定"]

    MODE --> DEFAULT{"default<br/>(static-first)?"}
    DEFAULT -->|Yes| STATIC["Static-First Obligations<br/>source / route / state /<br/>contract-level checks のみ"]
    STATIC --> DONE_STATIC(["DONE<br/>(runtime-heavy なし)"])

    DEFAULT -->|No| CAP_CHECK{"Capability<br/>宣言あり?"}
    CAP_CHECK -->|"render evidence<br/>enabled"| EVIDENCE["Render Evidence Capture<br/>screenshot / viewport /<br/>DOM snapshot ref"]
    CAP_CHECK -->|"browser backend<br/>registered"| BACKEND["Backend Registry<br/>resolve provider"]

    EVIDENCE --> STATUS{"Capture Status"}
    STATUS -->|captured| CAPTURED["evidence: captured"]
    STATUS -->|skipped| SKIPPED["evidence: skipped"]
    STATUS -->|failed| FAILED["evidence: failed"]

    BACKEND --> QA_CHECK{"Browser QA<br/>enabled?"}
    QA_CHECK -->|Yes| QA["Browser QA Phases<br/>smoke / interaction /<br/>visual / accessibility"]
    QA_CHECK -->|No| SKIP_QA["QA: skipped<br/>(fail-open)"]

    QA --> FINDINGS["Structured Findings<br/>+ Repair Suggestions"]
    FINDINGS --> REPORT["Report Output"]

    CAP_CHECK -->|"no capability"| FALLBACK["Fail-Open / Skipped<br/>(non-web safety)"]
    FALLBACK --> DONE_STATIC

    CAPTURED --> REPORT
    SKIPPED --> REPORT
    FAILED --> REPORT
    SKIP_QA --> REPORT
    REPORT --> DONE_OPT(["DONE<br/>(optional capabilities)"])
```

### v1.7.5 Mode Expectation 分離

| Mode               | Static Obligations             | Runtime Obligations                        | Evidence Capture | Browser QA          |
| ------------------ | ------------------------------ | ------------------------------------------ | ---------------- | ------------------- |
| standard (default) | source, route, state, contract | opt-in only                                | optional         | optional            |
| low-cost           | source, route, state, contract | opt-in only                                | optional         | smoke + interaction |
| full-harness       | source, route, state, contract | API non-404, DB existence, UI reachability | required         | required            |

### v1.7.5 非 Web プロジェクト安全保証

- browser/backend capability 未宣言時は fail-open semantics を適用
- evidence capture は skipped で表現（error にしない）
- browser QA は skip で表現（blocking error にしない）
- 新規 universal dependency の追加禁止

## v1.7.6 Critique, Calibration & Full-Harness Expansion フロー

v1.7.6 では CAP-0029〜CAP-0033 として、premium prototyping mode with iterative critique loops を導入する。

```mermaid
flowchart TD
    START([ユーザーリクエスト]) --> MODE{モード選択}
    MODE -->|Standard| STD[標準プロトタイピングパス]
    MODE -->|Premium| FH[/qfai-prototyping --mode full-harness<br/>明示的オプトイン]
    FH --> OBS_START[Observability: コスト/時間追跡開始]
    OBS_START --> PLAN[Planner: 生成戦略策定]
    PLAN --> GEN[Generator: 出力生成]
    GEN --> EVAL[Evaluator: 評価]
    EVAL --> CAL[Calibration Pack: スコアリング整合性確認]
    EVAL --> CRIT{Critique Adapter}
    CRIT -->|provider available| CRITIQUE[構造化批評取得]
    CRIT -->|provider unavailable| FAILOPEN[Fail-Open: 批評スキップ]
    CRITIQUE --> SCORE[スコアリング]
    FAILOPEN --> SCORE
    CAL --> SCORE
    SCORE --> DECISION{Accept / Refine / Pivot}
    DECISION -->|Accept| OUTPUT[最終出力]
    DECISION -->|Refine| GEN
    DECISION -->|Pivot| PLAN
    DECISION -->|Plateau/Cap| OUTPUT
    OUTPUT --> OBS_END[Observability: メトリクス出力]
    OBS_END --> HANDOFF[Handoff Artifact 生成]
    HANDOFF --> DETECT[Display/Stub Detection]
    DETECT --> EVIDENCE[Evidence + Review]
    STD --> STD_OUT[標準出力]
    STD_OUT --> EVIDENCE
```

### Premium Path Iteration Policy

| Policy            | Rule                                            |
| ----------------- | ----------------------------------------------- |
| Iteration range   | 5-15 (configurable max, default 15)             |
| Plateau detection | Score delta threshold with 3-iteration lookback |
| Loop exit         | Accept, plateau, or max cap reached             |
| Fail-open         | Adapter-level; provider failure never blocks    |
| Cost ceiling      | Deferred to post-implementation (OQ-0005)       |

## v1.7.13 Canonical Sidecar Convergence

```mermaid
flowchart TD
    A[validate.ts pipeline] --> B{Canonical or Legacy?}
    B -->|Canonical| C[runCanonicalUixValidators]
    B -->|Legacy/Migration| D[legacy/ddpCompatibility.ts]
    C --> E[12 modular validators in uix/]
    E --> F{prototyping.yaml exists?}
    F -->|Yes| G[validatePrototypingRecommendation]
    F -->|No| H[QFAI-PROT-153 error]
    G --> I[sddPreflight gates]
    I --> J[report.ts prototyping section]
```

**Canonical/Legacy Separation:**

- Production path: `runCanonicalUixValidators()` in `uix/canonical.ts` runs 12 modular validators
- Legacy path: `legacy/ddpCompatibility.ts` and `legacy/uixCompatibility.ts` for migration tooling only
- `validateDdpFields` removed from `validate.ts` pipeline

**Prototyping Module:**

- `prototyping/mode.ts`: mode resolution with existence-based precedence (D-5)
- `prototyping/recommendationArtifact.ts`: single source of truth for recommendation artifact status
- `prototyping/recommendationSchema.ts`: key existence checks for precedence decisions
- SDD preflight gates on valid `prototyping.yaml`

**Report Observability:**

- `report.ts` now includes `## Prototyping` section with mode, obligations, evidence, harness, render, browserQa, calibration subsections
- Marked as "foundation-only (not integrated into blocking validation in v1.7.13)"

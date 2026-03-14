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

    subgraph Deprecated["非推奨"]
        tdd_r["tdd-red"] -.->|deprecated| atdd
        tdd_g["tdd-green"] -.->|deprecated| atdd
        tdd_rf["tdd-refactor"] -.->|deprecated| verify
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

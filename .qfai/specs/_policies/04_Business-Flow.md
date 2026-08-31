# 04 Business Flow

## Purpose

- QFAI の current business flow を policy-layer SSOT として定義する。
- downstream execution は `specs + .qfai/contracts/**` を読み、discussion pack を直接 truth source にしない。

## Actors / Systems

- Actor: 開発者 / AI コーディングエージェント / CI/CD パイプライン
- System: QFAI CLI + Assistant Skills

## Preconditions

- Node.js >= 18.0.0
- `qfai init` 済み
- UI-bearing プロジェクトでは `/qfai-discussion` → `/qfai-sdd` を経て `.qfai/contracts/design/**` と `.qfai/contracts/ui/**` が存在する

## Flow Overview

1. `qfai init` でワークスペースを初期化する
2. `/qfai-discussion` で discussion pack を作成する
3. `/qfai-sdd` で discussion UIUX sidecar を contracts/design・contracts/ui に正規化し、specs を生成・更新する
4. `qfai validate --fail-on error` で spec/contracts を検証する
5. UI-bearing の場合は `/qfai-prototyping` が spec/contracts を読み、prototype 実装・capture・agent-led evaluation を行う
6. `/qfai-atdd` が spec/contracts を読み、受入テストを整備する
7. `/qfai-implement` が spec/contracts を読み、TDD マイクロサイクルで実装する
8. `/qfai-verify` が repo gates と `qfai validate --fail-on error` を実行し、review artifact と evidence を確認する
9. `qfai report` が validate/review/evidence の結果をまとめる

## Diagram

```mermaid
flowchart TD
    INIT["qfai init"] --> DISCUSS["/qfai-discussion"]
    DISCUSS --> SDD["/qfai-sdd<br/>discussion -> specs/contracts"]
    SDD --> VALIDATE["qfai validate --fail-on error"]
    VALIDATE --> UIREQ{"ui_bearing?"}
    UIREQ -->|Yes| PROTO["/qfai-prototyping<br/>specs + contracts only"]
    UIREQ -->|No| ATDD["/qfai-atdd"]
    PROTO --> ATDD
    ATDD --> IMPLEMENT["/qfai-implement"]
    IMPLEMENT --> VERIFY["/qfai-verify"]
    VERIFY --> REPORT["qfai report"]
```

```mermaid
sequenceDiagram
    autonumber
    participant User as 開発者/CI
    participant Discussion as /qfai-discussion
    participant Sdd as /qfai-sdd
    participant Validate as qfai validate
    participant Proto as /qfai-prototyping
    participant Verify as /qfai-verify

    User->>Discussion: discussion pack 作成
    Discussion-->>Sdd: discussion pack + uiux sidecar
    Sdd->>Sdd: specs + contracts/design + contracts/ui 生成
    Sdd-->>Validate: current SSOT
    Validate-->>User: contract-first validation result
    alt ui_bearing = true
        User->>Proto: /qfai-prototyping
        Proto->>Proto: specs/contracts を読み evaluation 実施
        Proto-->>Verify: review artifact + evidence
    end
    User->>Verify: /qfai-verify
    Verify->>Validate: qfai validate --fail-on error
    Verify-->>User: PASS / REVISE
```

## Alternate / Exception Flows

- discussion pack が不足している場合、`/qfai-sdd` は停止し `/qfai-discussion` への差し戻しを行う。
- design/ui contracts が不足している UI-bearing project では、`/qfai-prototyping` と downstream validate は fail-close する。
- `runCanonicalUixValidators` は discussion pack を直接検証する時だけ使用し、repo-root downstream validate の primary path には使わない。

## Notes

- `qfai prototyping` CLI や runtime/full-harness engine は current flow に存在しない。
- screenshot と HTML snapshot は declared screen ごとの mandatory evidence である。
- current downstream truth は `specs + contracts` であり、discussion pack は upstream authoring artifact である。

## CHG-007 — Layered CI Lane Topology (CAP-0017 / CAP-0003)

上流の SDD/ATDD/TDD フローとは別レイヤーの、CI 実行時トポロジを policy-layer SSOT として定義する。
本節は QFAI 自身の CI（`CAP-0017`）と配布ワークフローテンプレート（`CAP-0003`）の**共通形**を記述する。
どちらも QFAI が runner としてワークフローを実行するものではない（`01_Objective.md` Out of Scope）。

### Actors / Systems

- Actor: pull request 作成者（開発者 / AI エージェント）
- System: GitHub Actions（detection job / test lane / aggregate verdict job）

### Flow Overview

1. pull request が 1 本のワークフローをトリガーする。
2. detection job が base..head の差分からどのレーンを走らせるかを導出する（full history はこの job のみ要求する）。
3. 差分取得失敗・未知パスは **fail-open** — warning annotation を出して全レーンを選択する（過剰実行しかしない）。
4. documentation-only 差分では**テストレーンを 1 本も選択しない**。lint レーンと必須コンテキストを担う job は選択対象外で常に実行される。
5. 全レーンは常に**宣言**され、非選択レーンは false 条件で**スキップ**される。よって check name は消えず、runner minutes も消費しない（REQ-0007 / REQ-0017）。
6. 選択されたレイヤー分離テストレーン（L1 unit / L2 component / L3 integration / L4 api / L5 e2e）は**並列**に実行される。レーン分離は新規ワークフローファイルではなく同一ファイル**内の job**として表現する（REQ-0008 / REQ-0016）。
7. aggregate verdict job は `if: always()` かつ空の permission map で走り、**自身の `needs` 集合を走査して** verdict を導出する（REQ-0006）。手書きの比較リストは持たない。
8. verdict は failure / cancelled のいずれかがあれば exit 1、全 success または**全 skipped** なら exit 0（green-on-skip）。

### Diagram

```mermaid
flowchart TD
    PR["pull_request"] --> DETECT["detection job<br/>base..head diff + JSON filter"]
    DETECT -->|"diff 失敗 / 未知パス"| FAILOPEN["fail-open<br/>warning annotation + 全レーン選択"]
    DETECT -->|"documentation-only 差分"| MINIMAL["テストレーン 0 本を選択"]
    DETECT -->|"source 差分"| AFFECTED["影響レーンを選択"]
    FAILOPEN --> SELECT["lane selection output<br/>レーンごとの boolean"]
    MINIMAL --> SELECT
    AFFECTED --> SELECT
    SELECT --> L1["L1 unit lane<br/>宣言済 / if(selected)"]
    SELECT --> L2["L2 component lane<br/>宣言済 / if(selected)"]
    SELECT --> L3["L3 integration lane<br/>宣言済 / if(selected)"]
    SELECT --> L4["L4 api lane<br/>宣言済 / if(selected)"]
    SELECT --> L5["L5 e2e lane<br/>宣言済 / if(selected)"]
    SELECT --> EXEMPT["選択対象外レーン<br/>lint + 必須コンテキスト担当 job<br/>常に実行"]
    L1 --> AGG["aggregate verdict job<br/>needs = 全レーン / permissions 空 / if always()"]
    L2 --> AGG
    L3 --> AGG
    L4 --> AGG
    L5 --> AGG
    EXEMPT --> AGG
    AGG --> DERIVE{"needs 集合の result を走査<br/>(列挙リストを持たない)"}
    DERIVE -->|"いずれかが failure / cancelled"| RED["exit 1"]
    DERIVE -->|"全 success"| GREEN["exit 0"]
    DERIVE -->|"全 skipped (green-on-skip)"| GREEN
```

```mermaid
sequenceDiagram
    autonumber
    participant PR as pull request
    participant Detect as detection job
    participant Lanes as layer-separated lanes
    participant Verdict as aggregate verdict job

    PR->>Detect: base..head 差分を要求
    alt 差分取得失敗 / 未知パス
        Detect-->>Lanes: fail-open — 全レーン選択 + warning
    else documentation-only
        Detect-->>Lanes: テストレーン 0 本（宣言は維持）
    else source 差分
        Detect-->>Lanes: 影響レーンのみ選択
    end
    par 選択されたレーンを並列実行
        Lanes->>Verdict: L1 / L2 result
    and 並列
        Lanes->>Verdict: L3 / L4 / L5 result
    and 選択対象外レーン
        Lanes->>Verdict: lint + 必須コンテキスト job result
    end
    Verdict->>Verdict: needs 集合を走査して verdict を導出
    Verdict-->>PR: exit 1 (failure/cancelled) / exit 0 (全 success or 全 skipped)
```

### Alternate / Exception Flows

- ALT-CI-01: documentation-only 差分 — テストレーンは全て skipped だが check name は解決し続け、verdict は green-on-skip で exit 0（REQ-0007 / REQ-0017）。
- ALT-CI-02: shallow clone / base ref 不在 — fail-open。verdict は green を維持しつつ warning annotation を残す。
- EX-CI-01: パッケージマネージャ解決不能 — **fail-closed**。何もインストールされないため継続すると評価していない結果を報告することになる（`07_Constraints.md` OC-78）。
- EX-CI-02: 必須ステータスコンテキストを担う job を選択対象に含めてはならない。skip された job は success を報告するため、走っていない job に対して branch protection へ green を渡してしまう。

### Notes (CHG-007)

- レーン（CI の job / matrix leg）とレイヤー（テスト意味論）とスライス（QFAI 自身の matrix 次元）は同義ではない。用語定義は `06_Glossary.md` § CHG-007。
- レイヤー語彙は増やさない（NFR-0015）。本節は既存の L1..L5 語彙のみを使う。
- 配布側はさらに inert-by-default であり、アダプタが対応 script を宣言するまでテストレーンは 1 本も実行されない。

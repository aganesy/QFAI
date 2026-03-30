# 03_Story-Workshop

## Surface Type Classification

| Key | Value |
| --- | --- |
| Surface Type | non-ui |
| UI-bearing | No |

QFAI 自体は CLI/package であり、今回の pack は UI アプリの画面仕様ではない。  
ただし、QFAI が生成・検証する UI-bearing project 向けの discussion / template / validator 要件を扱うため、ユーザーストーリーでは UI-bearing support の収束を定義する。

## User Stories

### US-001: Canonical validator entrypoint

**As** a QFAI maintainer,  
**I want** `validateProject()` が canonical UIX validator registration point を実行し、production path で新 validators を有効化してほしい  
**So that** isolated validator 実装と実運用 path の乖離をなくせる。

### US-002: Discussion convergence

**As** a QFAI discussion user,  
**I want** UI-bearing project の discussion completion が taste interview + trend scan + 3-layer rubric を必須にしてほしい  
**So that** `/qfai-sdd` 前に design direction の曖昧さを残さずに済む。

### US-003: Canonical UI/UX template family

**As** a template consumer,  
**I want** init/discussion が legacy 4-axis ではなく 3-layer canonical artifacts を生成してほしい  
**So that** validator と reviewer の期待フィールドが一致する。

### US-004: Strong strategy and contract schema

**As** a downstream automation consumer,  
**I want** `10_strategy` と `40_contracts` が stronger schema を持ってほしい  
**So that** review/verification が field-level に追跡可能になる。

### US-005: Static-first prototyping contract

**As** a prototyping user,  
**I want** `/qfai-prototyping` が static-first / mode-aware contract を公開してほしい  
**So that** unsupported environment で false failure や false success を避けられる。

### US-006: Full-harness real path

**As** a premium prototyping user,  
**I want** `/qfai-prototyping-full-harness` が実在する command/skill として提供されてほしい  
**So that** stronger evidence obligations を伴う premium path を明示的に選べる。

### US-007: Honest render evidence

**As** an evidence consumer,  
**I want** render evidence が `captured|skipped|failed` を明示してほしい  
**So that** runtime capability の有無を誤魔化さずに判断できる。

### US-008: Real browser QA findings

**As** a QA workflow user,  
**I want** browser QA orchestration が actual phase runners を呼び、structured findings を返してほしい  
**So that** scaffold-only reporting から脱却できる。

### US-009: Reviewer routing convergence

**As** a reviewer,  
**I want** taste/trend/3-layer artifacts を入力に semantic review できてほしい  
**So that** deterministic validation と semantic judgment の役割が分離される。

### US-010: Docs state normalization

**As** a QFAI adopter,  
**I want** changelog / steering / comments の成熟度表現が実装状況と一致してほしい  
**So that** release claim を信頼できる。

### US-011: PR slicing and release gate clarity

**As** a maintainer,  
**I want** v1.7.9 の work items が PR slicing と release gate を伴って整理されていてほしい  
**So that** convergence release を段階的かつ reviewable に進められる。

## User Flow

```mermaid
flowchart TD
    A[Issue register V179-001..011] --> B{Release gate?}
    B -->|P0 / blocking P1| C[Implement first]
    B -->|P2| D[Follow-up within release]
    C --> E[Validation truth]
    C --> F[Discussion/template convergence]
    C --> G[Prototyping convergence]
    F --> H[/qfai-sdd ready]
    E --> H
    G --> H
    D --> I[Docs and reviewer normalization]
    I --> H
```

## Example Seeds

### US-001: Canonical validator entrypoint

| Perspective | Seed |
| --- | --- |
| Happy path | `validateProject()` が canonical validator entrypoint を1回だけ呼び、新 rule family が production path で実行される |
| Negative path | 新 validator 実装は存在するが main validate path が旧 aggregator のまま |
| Edge / boundary | non-ui project では UI-bearing validators が skip される |
| Permission / role | maintainer が validator registration を変更、user は `qfai validate` を実行 |
| State transition | legacy aggregator -> canonical registration point |
| Idempotency / retry | 同一 repo に validate を再実行しても同一 finding set が得られる |

### US-002: Discussion convergence

| Perspective | Seed |
| --- | --- |
| Happy path | UI-bearing pack で taste interview, trend scan, 3-layer rubric, option comparison, anchor, contracts が揃う |
| Negative path | 4-axis artifacts だけで discussion completion を宣言しようとして validator error |
| Edge / boundary | non-ui pack は uiux sidecar 不要だが、UI-bearing support requirements は REQ として記録される |
| Permission / role | facilitator が discussion を進行、user が direction input を与える |
| State transition | open OQ -> resolved/deferred -> open 0 |
| Idempotency / retry | discussion 再生成時も mandatory sections が欠けない |

### US-005: Static-first prototyping contract

| Perspective | Seed |
| --- | --- |
| Happy path | `--mode low-cost` は static deliverables のみで完了できる |
| Negative path | skill が runtime-heavy completion を universal default と説明している |
| Edge / boundary | unsupported environment で runtime checks が skipped + reason になる |
| Permission / role | user が CLI mode を選び、artifact が推奨 mode を示す |
| State transition | default mode recommendation -> explicit CLI override |
| Idempotency / retry | 同一 mode 再実行で contract explanation が変わらない |

### US-007: Honest render evidence

| Perspective | Seed |
| --- | --- |
| Happy path | renderable surface + capability available で `captured` record が出る |
| Negative path | capability unavailable なのに success 扱いの空 evidence が生成される |
| Edge / boundary | surface 非対応時に `skipped: surface_not_renderable` を返す |
| Permission / role | runtime orchestrator が status を決定し、reviewer が evidence を確認する |
| State transition | requested -> captured/skipped/failed |
| Idempotency / retry | retry で structure は同じ、content は runtime 依存 |

### US-008: Real browser QA findings

| Perspective | Seed |
| --- | --- |
| Happy path | smoke/visual phase が structured findings を返す |
| Negative path | phase runners 未接続のため empty findings のみ返る |
| Edge / boundary | unsupported phase は explicit skip reason を返し silent success にしない |
| Permission / role | QA runner が phase orchestration、user は report を読む |
| State transition | planned phases -> executed/skipped -> findings aggregated |
| Idempotency / retry | 同一条件なら findings schema は安定する |

### US-010: Docs state normalization

| Perspective | Seed |
| --- | --- |
| Happy path | changelog / steering / comments が `implemented|foundation-only|deferred` を一貫して使う |
| Negative path | release notes が completed と言い、steering が in progress と言う |
| Edge / boundary | partial implementation は foundation-only と明記される |
| Permission / role | maintainer が docs を更新、adopter が release state を判断する |
| State transition | stale state claim -> normalized vocabulary |
| Idempotency / retry | docs consistency check を再実行しても矛盾件数は 0 のまま |

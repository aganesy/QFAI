# 09 Delta — Web Research Enhancement

## Change Summary

| Change ID | Date       | Primary             | Tags           | Summary                                                    |
| --------- | ---------- | ------------------- | -------------- | ---------------------------------------------------------- |
| CHG-001   | 2026-03-29 | spec-0034 (initial) | new-capability | Historical origin before convergence to CAP-0016/spec-0016 |
| CHG-002   | 2026-04-22 | spec-0016           | migration      | Active spec ID converged from spec-0034 to spec-0016       |

## CHG-001: spec-0034 Initial Creation

### Rationale

discussion-20260328212829687 で Web Research Enhancement のディスカッションパックが完成し、全 13 レビュアーが PASS を返した。
8 つの OQ が解決され、2 つが将来リリース (TBD) に正当に延期された。SDD フェーズとして spec-0034 を新規作成する。

### Candidates Considered

1. **単一 spec (spec-0034)**: 8 ユーザーストーリーを 1 つの spec にまとめる
2. **複数 spec 分割**: パイプライン、セキュリティ、評価で 3 つの spec に分割する
3. **既存 spec 拡張**: spec-0002 (validate) や spec-0006 (prototyping) を拡張する

### Adopted

#### 候補 1: 単一 spec (spec-0034)

- Why: Web Research Enhancement は単一のケイパビリティ（CAP-0034）であり、8 つのユーザーストーリーは密結合している。パイプライン→セキュリティ→評価→HITL の流れは一連のワークフローであり、分割すると参照の複雑性が増す。
- Evidence: discussion-20260328212829687 の 05_Scope.md で単一機能として定義済み。

### Rejected

#### 候補 2: 複数 spec 分割

- Reason: 8 ストーリーは単一のリサーチパイプラインを構成する。分割すると AC→BR→EX→TC の参照が spec 間をまたぎ、トレーサビリティ管理のオーバーヘッドが増大する。
- DO NOT: 密結合したワークフローを複数 spec に分割しない。
- Temptation: 「セキュリティは独立した関心事だから分けるべき」と考えるが、サニタイゼーションはパイプラインの一ステージであり分離不可。

#### 候補 3: 既存 spec 拡張

- Reason: Web Research は QFAI の既存コマンド（validate/report/prototyping）とは異なる新機能領域。既存 spec のスコープを超える。
- DO NOT: 既存 spec のスコープを無関係な機能で拡大しない。
- Temptation: 「MCP テンプレートは init の一部だから spec-0001 に入れるべき」と考えるが、Web Research は init 以外にもスキル定義・セキュリティ・評価を含む独立したケイパビリティ。

### Impact

- Affects: historical origin only

## CHG-002: spec-0016 Convergence

- adopted: active capability/spec mapping was converged from `CAP-0034/spec-0034` to `CAP-0016/spec-0016`
- rationale: current `_policies/03_Capabilities.md` uses `CAP-0016`, and active slice policy must remain 1 CAP = 1 spec directory
- Validation: `qfai validate --fail-on error --format github` で検証

### Follow-ups

| Next action                             | Owner | Due    |
| --------------------------------------- | ----- | ------ |
| ATDD テストケース実装 (/qfai-atdd)      | agent | v1.8.0 |
| プロトタイプ実装 (/qfai-prototyping)    | agent | v1.8.0 |
| OQ-0009 (Jina AI MCP) 再評価            | agent | TBD    |
| OQ-0010 (OTel integration depth) 再評価 | agent | TBD    |

## Rejected Visual Directions

N/A — CLI-only pack, no visual directions.

# 05_Scope

## In Scope

### Category A: Discussion-side Canonical Architecture

| ID   | Item                                 | Gap Ref | Deliverable | Severity |
| ---- | ------------------------------------ | ------- | ----------- | -------- |
| S-01 | Design taste interview artifact      | G-01    | D-01        | P0       |
| S-02 | Mandatory trend/reference research   | G-02    | D-02        | P0       |
| S-03 | 3-layer evaluation architecture 収束 | G-03    | D-03        | P0       |
| S-04 | Scoring-ready schema 強化            | G-04    | D-04        | P0       |
| S-05 | Strategy artifact 強化               | G-05    | D-05        | P0       |
| S-06 | Screen contract 強化                 | G-06    | D-06        | P1       |

### Category B: User-facing Prototyping Workflow

| ID   | Item                                     | Gap Ref | Deliverable | Severity |
| ---- | ---------------------------------------- | ------- | ----------- | -------- |
| S-07 | UI-bearing detection 統一                | G-07    | D-07        | P1       |
| S-08 | Prototyping skill rewrite (static-first) | G-08    | D-08        | P0       |
| S-09 | True full-harness entrypoint             | G-09    | D-09        | P0       |

### Category C: Foundation-only 実装解消

| ID   | Item                       | Gap Ref | Deliverable | Severity |
| ---- | -------------------------- | ------- | ----------- | -------- |
| S-10 | Render evidence CLI wiring | G-10    | D-10        | P0       |
| S-11 | Browser QA MVP findings    | G-11    | D-11        | P1       |

### Category D: Repo-internal SSOT 統一

| ID   | Item                             | Gap Ref   | Deliverable | Severity |
| ---- | -------------------------------- | --------- | ----------- | -------- |
| S-12 | Reviewer extension (taste/trend) | G-12,G-19 | D-12        | P1       |
| S-13 | Migration normalization          | G-13      | D-13        | P1       |
| S-14 | Docs/state normalization         | G-14      | D-14        | P2       |

### Cross-cutting Concerns

| ID   | Item                                | Gap Ref | Notes                                 |
| ---- | ----------------------------------- | ------- | ------------------------------------- |
| S-15 | DDS subordination to sidecar        | G-15    | D-03 の一部として対応                 |
| S-16 | Dynamic trend freshness enforcement | G-16    | D-02 の一部として対応                 |
| S-17 | Anti-preference traceability        | G-17    | D-01, D-04, D-12 で横断対応           |
| S-18 | Non-UI/non-visual normalization     | G-18    | 全新 validator に non-UI fixture 追加 |
| S-19 | Canonical convergence document      | G-20    | D-14 の一部として対応                 |

## Out of Scope

| Item                                        | Reason                                       |
| ------------------------------------------- | -------------------------------------------- |
| Full-harness をデフォルトにする             | Premium path は opt-in のまま                |
| External critique provider 品質ベンチマーク | v1.8.0 以降の feature scope                  |
| Advanced browser QA heuristics beyond MVP   | smoke + visual minimum が v1.7.8 scope       |
| Full observability productization           | Internal infrastructure は expose 対象を限定 |
| 新しい設計思想の導入                        | v1.7.8 は収束のみ、新思想なし                |
| 4-axis model を equal canon として維持      | 3-layer が唯一の canonical model             |
| Runtime-heavy default prototyping text      | Static-first が canonical                    |
| Web-only mandatory behavior for CLI project | Non-UI explicit n/a path を保証              |

## Success Criteria

1. 14 acceptance criteria (Section 11 of SRC-0001) が全て満たされている
2. `qfai validate --fail-on error` が PASS
3. 全新 validator に non-UI fixture テストが存在
4. Migration path が old → intermediate → final で文書化されている
5. Docs/CHANGELOG/steering に矛盾する feature maturity 表現がない

# 07 Decisions

## Decisions

| DEC-ID      | Title                                     | Adopted Option                                            | Source  | Rationale                                                                                                                                                                               |
| ----------- | ----------------------------------------- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-0031-001 | Premium path as separate skill, not flag  | Separate `/qfai-prototyping-full-harness` skill           | DR-0077 | Standard path と premium path の完全分離により NFR-0005 (<1% regression) を構造的に担保する。flag 方式は条件分岐の複雑化と標準 path への意図しない影響を招く                            |
| SD-0031-002 | Critique semantics excluded from validate | Critique は evaluator phase 内のみ; validate command 不変 | DR-0078 | Critique adapter (spec-0029) の fail-open semantics は validate の deterministic 検証と相容れない。critique は premium evaluator の scoring 補助であり、validate gate に混入させない    |
| SD-0031-003 | Default max 15 iterations                 | Configurable range 5-15, default 15                       | DR-0073 | 15 は convergence opportunity を最大化しつつ resource 消費に上限を設ける実用的バランス点。5 下限は最低限の refinement cycle を保証。range 制約は暴走ループと過小 iteration の両方を防止 |

## Rejected Options

| DEC-ID      | Rejected Option                           | Reason                                                                                             |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SD-0031-001 | Premium mode を `--premium` flag で有効化 | Standard path の条件分岐が増え NFR-0005 の regression risk が高まる。code review burden も増大する |
| SD-0031-001 | Configuration file で premium 有効化      | 暗黙的な有効化は REQ-0011 (explicit opt-in) に違反。意図しない premium 実行のリスクがある          |
| SD-0031-002 | Critique 結果を validate gate に統合      | Critique は non-deterministic (provider 依存, fail-open)。validate の deterministic 保証を破壊する |
| SD-0031-003 | Iteration cap なし (無制限)               | Resource 消費の上限がなくなり NFR-0001 違反。暴走ループのリスクが制御不能になる                    |
| SD-0031-003 | Fixed 10 iterations (非 configurable)     | プロジェクト特性による必要 iteration 数の差異に対応できない。柔軟性が不足する                      |
| DR-0083     | Embed evidence policy only in runtime code docs | Out-of-band policy not discoverable at skill invocation time; must be in SKILL.md      |
| DR-0083     | Omit three-mode positioning from SKILL.md       | Leaves users without context on when to use full-harness vs standard; requires external lookup |

---

## [v1.7.7 Remediation] Decisions

| DEC-ID  | Title                                                   | Adopted Option                                                                              | Source                                   | Rationale                                                                                                                                                                                  |
| ------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DR-0083 | SKILL.md as canonical evidence and reviewer policy surface | SKILL.md contains mandatory evidence policy section and reviewer expectations section    | discussion-20260329195516830, REQ-0002   | P0-02 audit finding: no dedicated /qfai-prototyping-full-harness entrypoint existed. Policy at SKILL.md level makes it discoverable at skill invocation time without requiring source code access. |
| DR-0084 | Three-mode cross-reference in SKILL.md                 | Full-harness SKILL.md explicitly positions the skill in the low-cost/standard/full-harness structure | discussion-20260329195516830, REQ-0003, REQ-0010 | Closes mode split exposure gap (P1-07) for users who land on the full-harness skill. Without cross-reference, users cannot discover the lighter-weight alternatives. |
| DR-0085 | Routing reception is stateless                          | Full-harness skill initialization depends only on user-provided spec inputs; not on routing context | discussion-20260329195516830, REQ-0002 | Routing from standard skill is a user guidance pattern, not a handshake protocol. Requiring routing state would make direct invocation second-class and create fragile dependencies between skills. |

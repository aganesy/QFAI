# R12_pattern-doubler

## Reviewer

- ID: R12
- Name: Pattern Doubler

## Verdict: N/A

## na_rule

- discussion phase では ID-bearing items の 2x target は適用外。代わりに Example Seeds の観点網羅性を評価した。9 user stories x 6 perspectives (Happy path, Negative path, Edge/boundary, Permission/role, State transition, Idempotency/retry) = 54 seeds が定義されており、十分な網羅性を確認

## Findings

- ID-bearing items 数: REQ 21 件、NFR 13 件、OQ 15 件、Policy 12 件、Constraint 15 件、User Story 9 件。discussion phase としては十分な構造化がされている
- Example Seeds の 6 観点は全 9 story で統一的に適用されており、観点の欠落がない
- 特に Negative path と Edge/boundary の seeds が具体的であり、validator と review gate の検証シナリオとして下流で活用可能
- Constraint の分類（Technical 7 件、Operational 4 件、Business 3 件、Legal/quality 1 件）は balanced であり、Technical 偏重になっていない

## Evidence Checked

- 03_Story-Workshop.md: 9 user stories、54 Example Seeds（6 perspectives x 9 stories）
- 06_REQ.md: 21 REQ（must 17, should 4）
- 07_NFR.md: 13 NFR
- 09_Constraints.md: 15 Constraints（TC 7, OC 4, BC 3, LC 1）
- 10_Policy.md: 12 Policies
- 11_OQ-Register.md: 15 OQ（resolved 13, deferred 2）

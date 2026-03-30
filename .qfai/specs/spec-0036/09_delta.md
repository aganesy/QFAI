# 09 Delta

## Change Summary

- Change ID: DELTA-S36-001
- Date: 2026-03-30
- Primary: spec-0036 initial creation
- Tags: v1.7.8, render-evidence, browser-qa, foundation-completion
- Summary: Initial spec creation for Foundation Implementation Completion (CAP-0036)

## Rationale

- Render evidence CLI path contains placeholder "not implemented" that must be replaced with real capture logic
- Browser QA runner smoke phase returns empty results that must be replaced with real findings

## Candidates Considered

1. Full 4-phase browser QA pipeline (smoke + visual + interaction + accessibility)
2. Smoke + visual MVP (adopted)
3. Smoke only

## Adopted

- Adopted: Smoke + visual MVP with honest render evidence reporting
- Why: Provides actionable findings within v1.7.8 scope without interaction/accessibility complexity (SD-0036-001, SD-0036-002, OQ-0002, OQ-0006)
- Evidence: discussion-20260330035428071

## Rejected

- RJ-002: Full 4-phase browser QA
- Reason: Interaction and accessibility phases require additional infrastructure and exceed v1.7.8 scope
- DO NOT: v1.7.8 で browser QA の interaction/accessibility phase を scope に含めない
- Temptation: 完全な 4-phase QA pipeline を一度に作りたい

## Impact

- Affects: `packages/qfai/src/cli/commands/prototyping.ts` (render evidence wiring), `core/browserQa/runner.ts` (smoke + visual findings)
- Validation: qfai validate pass, test cases for all TC-0036-\* cases

## Follow-ups

- None (all OQs resolved)

## v1.7.9 Convergence Update

- Date: 2026-03-30
- Source: discussion-20260330153902875
- Adopted: render evidence / browser QA は honest reporting を維持し、unsupported を explicit skipped or failed で表現する
- Rejected: fake success と placeholder findings
- DO NOT: runtime capability absence を success に丸めない

---

- Change ID: DELTA-S36-002
- Date: 2026-03-31
- Primary: v1.7.11 completion — all 4 browser QA phases produce real findings
- Tags: v1.7.11, WS-H, DR-0104, browser-qa, foundation-completion
- Summary: REQ-0016/0017/0018 対応。全 4 browser QA phases (smoke, visual, interaction, accessibility) に actual runner を配線し、foundation-only comments を除去。honest empty findings を義務化。

## Rationale (DELTA-S36-002)

- v1.7.8 scope では smoke + visual MVP のみだったが、v1.7.11 で interaction + accessibility を含む全 4 phases に拡張。DR-0104 により全 phases で honest reporting を採用。foundation-only comments は実装完了により不要。

## Candidates Considered (DELTA-S36-002)

1. 全 4 phases に actual runner を配線し honest reporting を実施（採用）
2. Smoke + visual のみ維持し interaction/accessibility は次バージョンに延期（却下）

## Adopted (DELTA-S36-002)

- Adopted: 全 4 phases actual runner + foundation comment removal
- Why: DR-0104 が 4-phase honest reporting を義務付けており、v1.7.11 completion release の scope として必要

## Rejected (DELTA-S36-002)

- Candidate: interaction/accessibility 延期
- Reason: DR-0104 が全 4 phases を scope に含めており、延期は decision violation
- DO NOT: v1.7.11 で browser QA phase runner を stub のまま残さない
- Temptation: interaction/accessibility は複雑なので延期したくなるが、DR-0104 の義務

## Impact (DELTA-S36-002)

- Affects: `core/browserQa/runner.ts` (all 4 phase runners), `runBrowserQa()` wiring, phase runner source comments
- New items: US-0036-0003, AC-0036-0009..0014, BR-0036-0010..0015, EX-0036-0011..0017, TC-0036-0011..0017
- Validation: qfai validate pass, all TC-0036-* cases

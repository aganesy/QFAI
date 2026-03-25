# 01 Spec

- Spec: spec-0024
- Parent: CAP-0024

## Consumer View

- Primary SSOT for execution: `spec-0024/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: `qfai prototyping` の render evidence capture 拡張、typed outcome、path-only evidence、validator/report/docs/test 更新、後方互換維持
- Out: browser QA の full audit、visual diff / baseline 管理、自動修復、外部 critique adapter、新しい top-level command

## Applicable NFR

- NFR-0024-0001: Non-render path の追加コストは小さい
- NFR-0024-0002: legacy pack と markdown-only 互換を維持する
- NFR-0024-0003: Playwright 不可時も pack 生成を継続する
- NFR-0024-0004: エラーは route / viewport / 欠落 / 次アクションを含む
- NFR-0024-0005: 新規ロジックは unit / integration で十分にテストされる
- NFR-0024-0006: 証跡は軽量で漏らさない

## Applicable Policy

- 既存 `qfai prototyping` を拡張し、新トップレベル command は増やさない
- Playwright は optional dependency として lazy import で扱う
- evidence は path-only metadata とする
- CLI flags は config を override する
- render evidence は v1.7.1 では capture と validation に限定する
- TypeScript / 既存依存を壊さない
- External DB/API/UI contracts are intentionally `0 items`; rationale is fixed in `_policies/05_Contracts.md`
- Constraint refs: `TC-35`, `TC-36`, `TC-37`, `OC-26`, `OC-27`

## Evidence Summary

- Discussion: discussion-20260325144633348
- Review: review-20260325211000000
- Validate: `.qfai/report/validate.log` (`error=0`)
- Coverage: `.qfai/report/specs-coverage/spec-0024.md`

## Relevant Requirements

- REQ-0024-0001: `qfai prototyping` に render evidence capture を追加する
- REQ-0024-0002: CLI フラグは config を上書きする
- REQ-0024-0003: viewport の既定値と opt-in を定義する
- REQ-0024-0004: `uiFidelity.screens[].renders[]` を追加する
- REQ-0024-0005: evidence は path-only で保存する
- REQ-0024-0006: lazy Playwright 解決と typed outcome を採用する
- REQ-0024-0007: `prototypingEvidence.ts` で render evidence を検証する
- REQ-0024-0008: `renderCritique.ts` は render evidence を一次ソースとして使う
- REQ-0024-0009: `designFidelity.ts` と `navigationFlow.ts` は互換的に扱う
- REQ-0024-0010: `report.ts` は skipped / missing の理由を具体化する
- REQ-0024-0011: init evidence README と example docs を更新する
- REQ-0024-0012: v1.7.1 のスコープ境界を固定する

## Entry points

- US range in this spec: US-0024-0001..US-0024-0005
- Primary actors: QFAI 利用者、validator maintainer、report maintainer、Playwright 不在環境の利用者
- Notes: This spec hardens render evidence automation by introducing structured capture artifacts and graceful degraded mode, while preserving backward compatibility

## Escalation Hook (Read _policies only when needed)

### When to Escalate

- Ambiguous: route / viewport expansion rules conflict with config defaults
- Conflict: path-only storage requirement conflicts with developer expectations for richer artifacts
- Missing: report guidance needs wording beyond the current summary model
- Trade-off: strictness of missing render evidence versus adoption friction

### Escalation Targets (Read-only, decision basis)

- _policies/02_Initiative.md
- _policies/05_Contracts.md
- _policies/07_Constraints.md
- _policies/08_Decisions.md

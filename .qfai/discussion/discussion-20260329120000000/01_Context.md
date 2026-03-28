# 01 Context

## Metadata

| Key           | Value                                     |
| ------------- | ----------------------------------------- |
| Discussion ID | discussion-20260329120000000              |
| Date          | 2026-03-29                                |
| Owner         | agent                                     |
| Source        | qfai_v1.7.4_design_spec_compressed.md     |

## Goal and Completion Criteria

### Goal

v1.7.4 は、v1.7.3 で導入した UI/UX sidecar artifact と redesign templates を **deterministic validation・semantic review・tests・migration** のレベルで安定化させること。validator は shape/completeness/obvious contradiction のみを hard gate とし、semantic quality は reviewer 側で扱う。既存プロジェクトへの upgrade path を含めて v1.7 系を実運用可能な状態にする。

### Completion Criteria (Measurable)

1. `UIX-VAL-*` ルールファミリが `qfai validate` で検出可能になる
2. 各 `UIX-VAL-*` ルールに pass/fail fixture テストが存在する
3. `UIX-REV-*` semantic reviewer prompt が構造レベルで検証可能になる
4. stale asset detection が migration path 付きで動作する
5. non-UI project に不要な error が発生しない
6. report 出力が actionable (rule ID + fix suggestion 付き) である
7. verify-pack テストが redesign path をカバーする
8. 全変更が同一 PR で docs・tests・validator registration と共に投入される

## Stakeholders

- **Primary**: QFAI コア開発チーム、UI/UX 品質管理担当
- **Secondary**: QFAI ユーザー (SDD/ATDD 実行者)、CI/CD パイプライン運用者

## Background

### Business Context

v1.7.3 で UI/UX artifact architecture は整ったが、artifact の存在だけでは pack quality は安定しない。missing/weak artifact を確実に落とす deterministic validator、strategy/scoring/generic fallback risk を見る semantic reviewer、stale asset を検出する migration path、drift を防ぐ tests/verify-pack が必要である。

### Technical Context

v1.7.3 時点の状況:
- `packages/qfai/src/core/validators/` に 52 validator 関数が登録済み
- UI/UX 系 validator は `designAudit.ts`, `designSlop.ts`, `designFidelity.ts`, `designToken.ts`, `discussionDesignHardening.ts` 等が存在
- `reviewArtifacts.ts` と `reviewGate.ts` で review pack 構造検証あり
- `validate.ts` で UI/UX validator は Promise.all で並列実行 (2000ms budget)
- validator パターン: `(root, config[, platform]) => Promise<Issue[]>`
- migration は `deltaV1.ts` に verification level として定義あり、具体的 migration validator は未実装

### History

- v1.7.0 -- Discussion Design Hardening
- v1.7.1 -- Render Evidence Automation (optional)
- v1.7.2 -- Design Audit & Slop Guardrails (CAP-0025, 34 tests)
- v1.7.3 -- UIUX Authoring Foundation (sidecar artifact family, 25 tests)
- v1.7.4 -- Validation, Review, and Migration Stabilization (this release)

## Inputs

- Design specification: `qfai_v1.7.4_design_spec_compressed.md`
- Existing validator architecture: `packages/qfai/src/core/validators/`
- Existing review system: `reviewArtifacts.ts`, `reviewGate.ts`
- Config system: `packages/qfai/src/core/config.ts` (`QfaiConfig` with `uiux` section)
- Test patterns: `packages/qfai/tests/core/uiuxValidators.test.ts`

## Assumptions

1. v1.7.3 の sidecar artifact 構造は安定しており、v1.7.4 で構造変更しない
2. validator は deterministic (同一入力に同一出力) であり、LLM 判断を含めない
3. semantic review は reviewer prompt template 経由で提供し、hard gate にしない
4. migration support は soft launch (warning) から始め、段階的に harden する
5. 既存の validator registration パターン (`Promise<Issue[]>`) を踏襲する

## Issues

- validator が厳しすぎると authoring friction が上がるリスク
- review と validate の責務混線リスク
- legacy project で stale asset failure が多発するリスク
- error message が不親切だと導入が止まるリスク

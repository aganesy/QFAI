# 06_REQ

## REQ-0001: Design Guideline Research Step

- Source: SRC-0001
- Priority: Must
- Description: `qfai-discussion` は UI-bearing のとき、Trend Scan 内で design guideline research を mandatory step として要求しなければならない。
- Acceptance: skill/reference/template に、Material Design、WCAG、Apple HIG、platform-specific library などの調査要求が明示される。

## REQ-0002: Trend Scan Category

- Source: SRC-0001
- Priority: Must
- Description: `04_Sources.md` template は `design_guideline_research` category を canonical category として持たなければならない。
- Acceptance: template で category 名、required fields、最低 coverage guidance が定義される。

## REQ-0003: Quantitative Score Anchors

- Source: SRC-0001
- Priority: Must
- Description: `21_design_eval_trend_derived.md` は `score_anchors` に定量基準を必須化しなければならない。
- Acceptance: template comment または schema guidance に、px 値、比率、WCAG rule ID、Tailwind class、library default value のいずれかを含める requirement が記載される。

## REQ-0004: Guideline Coverage Validator

- Source: SRC-0001
- Priority: Must
- Description: validator は UI-bearing discussion pack に `design_guideline_research` が存在し、required coverage を満たすか検証しなければならない。
- Acceptance: rule ID、対象ファイル、違反メッセージ、severity が定義される。

## REQ-0005: Anchor Concreteness Validator

- Source: SRC-0001
- Priority: Must
- Description: validator は TRD `score_anchors` が抽象語だけで構成されていないか検証しなければならない。
- Acceptance: low/mid/high を検査し、定量 proxy がない場合に diagnostic を返す rule が定義される。

## REQ-0006: Project Context Preservation

- Source: SRC-0001
- Priority: Should
- Description: package は固定ルール集の押し付けを避け、project-specific library guideline を許容しなければならない。
- Acceptance: docs/skill wording で platform-specific research を許容する記述がある。

## REQ-0007: Migration Guidance

- Source: SRC-0001
- Priority: Should
- Description: 既存 pack への導入影響と staged rollout の方針を maintainer が判断できるよう、migration guidance を用意しなければならない。
- Acceptance: warning 初期導入や future hardening に関する guidance が discussion decisions または docs task として定義される。

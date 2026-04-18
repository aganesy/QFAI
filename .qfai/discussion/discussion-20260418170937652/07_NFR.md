# 07_NFR

## NFR-0001: Backward Compatibility

- Description: 既存 discussion pack を即時 hard error で壊さないこと
- Measure: 新 rule の初期 severity は warning を基本とし、将来の hardening は migration note を伴う

## NFR-0002: Maintainability

- Description: package 内で skill/template/validator の責務分離が維持されること
- Measure: rule 追加は既存 discussion/UIX validator 境界に沿って行う

## NFR-0003: Actionability

- Description: validator message は修正行動へ直結しなければならない
- Measure: message に不足カテゴリまたは不足基準の種類を含める

## NFR-0004: Non-UI Safety

- Description: non-ui discussion pack に誤適用しないこと
- Measure: rule は UI-bearing 判定に従い、non-ui pack では not applicable となる

## NFR-0005: Traceability

- Description: source -> decision -> requirement -> validator expectation の関係が追跡できること
- Measure: discussion pack に traceability 表と decision log が存在する

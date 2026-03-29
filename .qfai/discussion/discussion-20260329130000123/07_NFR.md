# 07 NFR

## Metadata

| Key | Value |
| --- | --- |
| Discussion ID | discussion-20260329130000123 |
| Date | 2026-03-29 |

## Non-Functional Requirements

| NFR-ID | Requirement | Measure | Source Refs |
| --- | --- | --- | --- |
| NFR-0001 | Default prototyping path は browser/backend 未導入環境でも成立しなければならない | browser/backend 未設定時に blocking error 0 件 | SRC-0001 |
| NFR-0002 | optional capability は fail-open または skipped semantics で表現されなければならない | capability 不足時に hard fail へ昇格しない設計であること | SRC-0001 |
| NFR-0003 | mode-specific expectation は reviewer と実装者が識別できる粒度で文書化されなければならない | standard / low-cost / full-harness 差分が discussion から読めること | SRC-0001 |
| NFR-0004 | render evidence schema は partial capture を表現できなければならない | screenshot / viewport / DOM ref の個別 status を保持できること | SRC-0001 |
| NFR-0005 | browser QA output は後続修正に十分な構造化情報を持たなければならない | finding に phase と repair suggestion を含めること | SRC-0001 |
| NFR-0006 | compatibility correction は既存 non-web project を不必要に壊してはならない | non-web projects 向け新規 universal dependency 0 件 | SRC-0001,SRC-0007 |
| NFR-0007 | scope control は v1.7.5 release slice 単位で維持されなければならない | 4 internal slices を超える必須機能追加を行わない | SRC-0001 |
| NFR-0008 | review/validation の責務は混線してはならない | screenshot semantic quality や critique correctness を hard gate にしない | SRC-0001 |

# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                          | AC-Refs                    | Rule                                                                                                                                           | Notes                                                          | NFR-Refs |
| ------------ | ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| BR-0036-0001 | Capture status enum            | AC-0036-0002, AC-0036-0003 | Render evidence result must use a status enum: `captured` / `skipped` / `failed`. No other status values are permitted                         | Enum enforced at type level                                    | NFR-0003 |
| BR-0036-0002 | Honest reason required         | AC-0036-0003, AC-0036-0004 | When status is `skipped` or `failed`, the result must include a non-empty `reason` string explaining why                                       | Reason must be human-readable and specific to the failure mode |          |
| BR-0036-0003 | Alternative suggestion         | AC-0036-0003               | When status is `skipped`, the result must include an `alternative` string suggesting how to obtain evidence by other means (OQ-0006 decision)  | e.g., "Run manually with browser dev tools"                    |          |
| BR-0036-0004 | Partial success handling       | AC-0036-0004               | When multiple capture targets exist, partial success must report both `capturedItems` and `failedItems` arrays with per-item status and reason  | Mixed result is not treated as full failure                     |          |
| BR-0036-0005 | Placeholder removal obligation | AC-0036-0001               | The literal string "not implemented in this slice" must not appear in the render evidence CLI path after implementation                         | Verified by test assertion on source or output                 |          |
| BR-0036-0006 | Smoke finding structure        | AC-0036-0005, AC-0036-0008 | Each smoke phase finding must contain: `selector` (CSS selector or element identifier), `issue` (description), `severity` (level), `suggestion` (fix guidance) | Structure enforced at type level                     | NFR-0003 |
| BR-0036-0007 | Visual finding structure       | AC-0036-0006, AC-0036-0008 | Each visual phase finding must contain the same structure as smoke findings: `selector`, `issue`, `severity`, `suggestion`                      | Visual findings may additionally include screenshot reference  |          |
| BR-0036-0008 | URL validation                 | AC-0036-0007               | Browser QA runner must validate URL presence before execution. Missing URL returns structured error with `error` type and `message` field       | Empty string and undefined both treated as missing              |          |
| BR-0036-0009 | Empty result is bug            | AC-0036-0005, AC-0036-0007 | Browser QA must never return an empty findings array without explanation. Either return findings or return a structured error                    | Guards against silent failure                                  |          |

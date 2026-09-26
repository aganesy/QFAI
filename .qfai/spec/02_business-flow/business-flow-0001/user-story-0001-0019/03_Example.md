# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                 | Expected                                                                                          |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| EX-0001-0019-01 | AC-0001-0019-01 | A UI-bearing pack omits `uiux/40_screen_contracts.md` while keeping `uiux/50_review_input_bundle.md`. | `qfai validate` reports `UIX-VAL-3LAYER-INCOMPLETE-FAMILY` against `uiux/40_screen_contracts.md`. |
| EX-0001-0019-02 | AC-0001-0019-01 | A UI-bearing pack puts a legacy four-axis evaluation heading in `uiux/40_screen_contracts.md`.        | `qfai validate` reports `UIX-VAL-3LAYER-LEGACY-FORMAT` against that file.                         |

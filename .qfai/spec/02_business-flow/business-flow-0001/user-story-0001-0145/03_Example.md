# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                | Expected                                                                                                                                                                                                 |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0145-01 | AC-0001-0145-01 | `taskFidelity` evidence lacks `four_state_check`, when `qfai validate` runs                                          | `QFAI-CRIT-009` names the missing section and required keywords, including `cta_visibility` and `four_state_check`; `references/evidence-requirements.md` shows the same keywords with example Markdown. |
| EX-0001-0145-02 | AC-0001-0145-02 | A capture run needs a `taskFidelity` evidence template, when `qfai prototyping iterate --capture` emits the template | It includes `## cta_visibility` and `## four_state_check` sections with TODO placeholders for the full required keyword set.                                                                             |

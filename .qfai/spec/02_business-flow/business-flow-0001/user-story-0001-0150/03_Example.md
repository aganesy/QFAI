# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                     | Expected                                                                                                                                                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0150-01 | AC-0001-0150-01 | Given `taskFidelity` evidence lacks `four_state_check` When `qfai validate` runs                                          | Then `QFAI-CRIT-009` names the missing section and required keywords, including `cta_visibility` and `four_state_check`; `references/evidence-requirements.md` shows the same keywords with example Markdown. |
| EX-0001-0150-02 | AC-0001-0150-02 | Given a capture run needs a `taskFidelity` evidence template When `qfai prototyping iterate --capture` emits the template | Then it includes `## cta_visibility` and `## four_state_check` sections with TODO placeholders for the full required keyword set.                                                                             |

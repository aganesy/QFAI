# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                       | Expected                                                                                                                          |
| --------------- | --------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0113-01 | AC-0001-0113-01 | `CON-UI-0001/home` is reviewed without `--capture`, when cycle 1 completes. | `iter-01/CON-UI-0001/home.review.json` is required, while a PNG, HTML snapshot, or interaction transcript is not required.        |
| EX-0001-0113-02 | AC-0001-0113-02 | `--capture` is enabled for `CON-UI-0001/home`, when cycle 1 completes.      | Optional PNG and HTML capture artifacts accompany the review payload, and the reviewer still owns the live Playwright assessment. |

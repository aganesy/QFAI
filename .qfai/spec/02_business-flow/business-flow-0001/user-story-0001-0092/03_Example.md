# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                      | Expected                                                                                                                                     |
| --------------- | --------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0092-01 | AC-0001-0092-01 | mock authored with `<a href="#orders">` and one with `<a href="https://x.test/">`          | both PASS `QFAI-MOCK-010`                                                                                                                    |
| EX-0001-0092-02 | AC-0001-0092-01 | mock authored with `<a href="/orders/">` (template default not followed)                   | `QFAI-MOCK-010` fails (validator stays strict; `/path/` not accepted)                                                                        |
| EX-0001-0092-03 | AC-0001-0092-02 | template switched to `/path/` form but validator left strict (asymmetric edit)             | `R-MOCK-HREF-DRIFT` fires                                                                                                                    |
| EX-0001-0092-04 | AC-0001-0092-01 | The shipped `qfai-discussion` template `templates/03_Story-Workshop.md` and its `SKILL.md` | The template's sample mock link is anchor-form (`<a href="#orders">`), and the template and `SKILL.md` both name the `<a href="#name">` form |
| EX-0001-0092-05 | AC-0001-0092-02 | An anchor-form template with the strict validator                                          | No `R-MOCK-HREF-DRIFT`                                                                                                                       |

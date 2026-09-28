# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                              | Expected                                                                                                                                     |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0092-01 | AC-0001-0092-01 | A mock authored with `<a href="#orders">`, and one authored with `<a href="https://x.test/">`      | Both pass `QFAI-MOCK-010`                                                                                                                    |
| EX-0001-0092-02 | AC-0001-0092-01 | A mock authored with `<a href="/orders/">`, not following the template default                     | `QFAI-MOCK-010` fails; the validator stays strict and does not accept `/path/`                                                               |
| EX-0001-0092-03 | AC-0001-0092-02 | The template is switched to the `/path/` form while the validator stays strict, an asymmetric edit | `R-MOCK-HREF-DRIFT` is raised                                                                                                                |
| EX-0001-0092-04 | AC-0001-0092-01 | The shipped `qfai-discussion` template `templates/03_Story-Workshop.md` and its `SKILL.md`         | The template's sample mock link is anchor-form (`<a href="#orders">`), and the template and `SKILL.md` both name the `<a href="#name">` form |
| EX-0001-0092-05 | AC-0001-0092-02 | An anchor-form template with the strict validator                                                  | `R-MOCK-HREF-DRIFT` is not raised                                                                                                            |

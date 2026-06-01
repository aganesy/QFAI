# 05 Examples

| EX-ID        | BR-Ref       | Given / Input                                                                     | Expected                                                                               |
| ------------ | ------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| EX-0010-0001 | BR-0010-0001 | UI-bearing pack with all new sidecars                                             | sidecar family pass                                                                    |
| EX-0010-0002 | BR-0010-0002 | exploration brief missing differentiation targets                                 | heading error                                                                          |
| EX-0010-0003 | BR-0010-0003 | rubric contains design quality / originality / craft / functionality              | rubric pass                                                                            |
| EX-0010-0004 | BR-0010-0004 | evaluator calibration has good critique and blandness fail                        | calibration pass                                                                       |
| EX-0010-0005 | BR-0010-0005 | review bundle explains best-of-history                                            | bundle pass                                                                            |
| EX-0010-0006 | BR-0010-0006 | discussion artifact names a final winner                                          | planner-first violation                                                                |
| EX-0010-0007 | BR-0010-0007 | UI-bearing run produces root `DESIGN.md` with all 4 token tables                  | DESIGN.md draft pass                                                                   |
| EX-0010-0008 | BR-0010-0008 | UI-bearing run produces `33_exploration_rubric.md` again                          | regression validator hit                                                               |
| EX-0010-0009 | BR-0010-0009 | mock authored with `<a href="#orders">` and one with `<a href="https://x.test/">` | both PASS `QFAI-MOCK-010`                                                              |
| EX-0010-0010 | BR-0010-0009 | mock authored with `<a href="/orders/">` (template default not followed)          | `QFAI-MOCK-010` fails (validator stays strict; `/path/` not accepted)                  |
| EX-0010-0011 | BR-0010-0010 | template switched to `/path/` form but validator left strict (asymmetric edit)    | `R-MOCK-HREF-DRIFT` fires                                                              |
| EX-0010-0012 | BR-0010-0011 | `/qfai-discussion` finalizes pack `discussion-20260527075558258`                  | `state.json#discussion.currentId` set to that ID; `discussion list --active` prints it |
| EX-0010-0013 | BR-0010-0012 | `currentId` absent with 3 candidate `discussion-*` dirs present                   | error names the 3 candidates + `qfai discussion use <id>` recovery                     |

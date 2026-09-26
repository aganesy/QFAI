# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                        | Expected                                                                                        |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| EX-0001-0009-01 | AC-0001-0009-01 | An EX row whose `AC-Ref` names one existing AC of the same story                                                             | No EX-to-AC finding                                                                             |
| EX-0001-0009-06 | AC-0001-0009-01 | A story whose every AC is named by the `AC-Ref` of at least one EX                                                           | No EX-to-AC finding                                                                             |
| EX-0001-0009-08 | AC-0001-0009-02 | One BR cites two EXs, one of which a second BR also cites, and every EX of the tree is cited                                 | No BR-to-EX finding                                                                             |
| EX-0001-0009-12 | AC-0001-0009-03 | A YAML contract with a top-level `x-qfai-rules` entry holding `id: BR-NNNN`, a `statement` and `examples: [EX-NNNN-NNNN-NN]` | The rule is read as declared in that contract, with its statement and its one example           |
| EX-0001-0009-13 | AC-0001-0009-03 | A SQL contract with the line `-- Rule BR-NNNN: <statement>` followed by `-- Examples: EX-NNNN-NNNN-NN`                       | The rule is read as declared in that contract, with its statement and its one example           |
| EX-0001-0009-14 | AC-0001-0009-03 | A Markdown contract with a `## Rules` table whose columns are BR-ID, Statement and Examples, holding one row                 | The rule is read as declared in that contract, with its statement and its one example           |
| EX-0001-0009-15 | AC-0001-0009-03 | A rule declared in one contract, and a second contract with `x-qfai-rule-refs: [BR-NNNN]` naming it                          | The rule is declared once, in the first contract; the rule ref adds no citation of its examples |
| EX-0001-0009-16 | AC-0001-0009-03 | A SQL contract whose `-- Rule refs:` line names a BR that no contract declares                                               | A BR-to-EX error names the BR and that contract file                                            |

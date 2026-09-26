# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                | Expected                                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| EX-0001-0010-01 | AC-0001-0010-01 | A test file under `<testsDir>/e2e/` annotated `QFAI:BF-NNNN`                                         | The annotation covers the BF                                                              |
| EX-0001-0010-02 | AC-0001-0010-01 | A test file under `<testsDir>/integration/` annotated `QFAI:AC-NNNN-NNNN-NN`                         | The annotation covers the AC                                                              |
| EX-0001-0010-03 | AC-0001-0010-01 | A test file under `<testsDir>/api/` annotated `QFAI:AC-NNNN-NNNN-NN`                                 | The annotation covers the AC                                                              |
| EX-0001-0010-04 | AC-0001-0010-01 | A unit test outside the three layer directories annotated `QFAI:EX-NNNN-NNNN-NN`                     | The annotation covers the EX                                                              |
| EX-0001-0010-05 | AC-0001-0010-01 | A test file under `<testsDir>/integration/` annotated `QFAI:BF-NNNN`                                 | A misplaced-annotation error names the file and the annotation, and the BF is not covered |
| EX-0001-0010-06 | AC-0001-0010-01 | A unit test outside `<testsDir>/integration/` and `<testsDir>/api/` annotated `QFAI:AC-NNNN-NNNN-NN` | A misplaced-annotation error names the file and the annotation, and the AC is not covered |
| EX-0001-0010-07 | AC-0001-0010-02 | On the story tree, a test annotated only with the `QFAI:SPEC-NNNN:` prefix form                      | The annotation covers no item                                                             |
| EX-0001-0010-08 | AC-0001-0010-02 | On the story tree, a test annotated only with `QFAI:CON-API-N`                                       | The annotation covers no item                                                             |

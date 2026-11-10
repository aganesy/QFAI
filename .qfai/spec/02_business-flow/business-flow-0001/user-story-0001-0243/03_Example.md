# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                        | Expected                           |
| --------------- | --------------- | ------------------------------------------------------------ | ---------------------------------- |
| EX-0001-0243-01 | AC-0001-0243-01 | The shipped scripts check-mermaid.mjs and check-mdschema.mjs | Each has a caller; the test passes |
| EX-0001-0243-02 | AC-0001-0243-01 | A shipped script named only on a comment line of a workflow  | The test fails naming the script   |
| EX-0001-0243-03 | AC-0001-0243-01 | A shipped script named only inside an HTML comment of a step | The test fails naming the script   |

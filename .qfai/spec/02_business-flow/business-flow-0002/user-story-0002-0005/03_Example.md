# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                    | Expected                                                                                                                                                                                                          |
| --------------- | --------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0002-0005-01 | AC-0002-0005-01 | Plant an organization-private label literal in the shipped set and inspect the selectors | The plant is rejected. In the clean state every selector reads a repository variable whose default is a public GitHub-hosted label, and no non-public label literal appears                                       |
| EX-0002-0005-02 | AC-0002-0005-01 | Parse the header block of each shipped file                                              | Each header states the variable name, its default, the indefinite-queue failure mode, the `packageManager` precondition, the layer the file covers, the condition that makes it inert and its fail-open behaviour |

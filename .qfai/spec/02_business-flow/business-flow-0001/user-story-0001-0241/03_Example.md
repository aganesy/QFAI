# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                    | Expected                                                             |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| EX-0001-0241-01 | AC-0001-0241-01 | A code span citing line 3 of a file the project does not have                                                            | QFAI-DPACK-012 error naming the pack file, its line and the citation |
| EX-0001-0241-02 | AC-0001-0241-01 | A quoted research summary locator citing line 3 of a file the project does not have                                      | QFAI-DPACK-012 error                                                 |
| EX-0001-0241-03 | AC-0001-0241-01 | A code span citing a path that leaves the project root                                                                   | QFAI-DPACK-012 error                                                 |
| EX-0001-0241-04 | AC-0001-0241-01 | A code span citing an existing file with a different letter case                                                         | QFAI-DPACK-012 error on every platform                               |
| EX-0001-0241-05 | AC-0001-0241-02 | A code span citing line 11 of a 10-line file that ends with a newline                                                    | QFAI-DPACK-012 error naming 10 lines                                 |
| EX-0001-0241-06 | AC-0001-0241-02 | A code span citing lines 10 to 11 of a 10-line file                                                                      | QFAI-DPACK-012 error                                                 |
| EX-0001-0241-07 | AC-0001-0241-02 | A code span citing line 0 of an existing file                                                                            | QFAI-DPACK-012 error                                                 |
| EX-0001-0241-08 | AC-0001-0241-03 | Code spans citing line 3 and lines 2 to 10 of a 10-line CRLF file, and line 1 of a file at the project root              | No QFAI-DPACK-012                                                    |
| EX-0001-0241-09 | AC-0001-0241-03 | A URL with a port and a path, a code span naming a path with no line, and a code span naming a path, a line and a column | No QFAI-DPACK-012                                                    |
| EX-0001-0241-10 | AC-0001-0241-03 | A citation of a missing file in a discussion pack older than the latest                                                  | No QFAI-DPACK-012                                                    |
| EX-0001-0241-11 | AC-0001-0241-03 | The latest pack cites a missing file, run in verify                                                                      | No QFAI-DPACK-012                                                    |

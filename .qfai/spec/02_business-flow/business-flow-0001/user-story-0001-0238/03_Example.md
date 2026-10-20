# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                     | Expected                                                                              |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| EX-0001-0238-01 | AC-0001-0238-01 | One example row; one side changes a word in its first sentence, the other appends a clause to its last    | One row holding both edits; no conflict markers; exit 0                               |
| EX-0001-0238-02 | AC-0001-0238-01 | Both sides append a different row at the end of the same table                                            | Both rows kept, ours first; exit 0                                                    |
| EX-0001-0238-03 | AC-0001-0238-01 | One long contract statement; each side edits a different sentence of it                                   | One statement line holding both edits; exit 0                                         |
| EX-0001-0238-04 | AC-0001-0238-01 | No unmerged document under the story tree                                                                 | Says there is nothing to merge; no file written; exit 0                               |
| EX-0001-0238-05 | AC-0001-0238-01 | An unmerged document whose working file no longer holds conflict markers                                  | Working file unchanged; exit 0                                                        |
| EX-0001-0238-06 | AC-0001-0238-02 | Both sides rewrite the same sentence of one row; another row changed on one side                          | That row between conflict markers in both versions; the other row merged; exit 1      |
| EX-0001-0238-07 | AC-0001-0238-02 | One side deleted a document the other side changed                                                        | Document left as it is and named; exit 1                                              |
| EX-0001-0238-08 | AC-0001-0238-03 | The merged result breaks an example row with a raw line break                                             | QFAI-DOCSCHEMA-001 naming the document; exit 1                                        |
| EX-0001-0238-09 | AC-0001-0238-01 | A CRLF document; each side edits a different sentence of one row                                          | Both edits merged; CRLF line ends kept; exit 0                                        |
| EX-0001-0238-10 | AC-0001-0238-02 | A CRLF document; both sides rewrite the same sentence of one row                                          | That row between conflict markers with CRLF line ends; not reported as merged; exit 1 |
| EX-0001-0238-11 | AC-0001-0238-02 | A working file still holding conflict markers that a person edited, or that an earlier run already merged | Working file unchanged; named as left as is; exit 1                                   |
| EX-0001-0238-12 | AC-0001-0238-02 | A document holding a line of seven `=` characters                                                         | Document left as it is and named; exit 1                                              |
| EX-0001-0238-13 | AC-0001-0238-03 | The document-schema check cannot run                                                                      | QFAI-DOCSCHEMA-002 reported; the check named as not run; exit 1                       |
| EX-0001-0238-14 | AC-0001-0238-04 | A project directory that is not in a Git work tree                                                        | Nothing written; exit 2                                                               |
| EX-0001-0238-15 | AC-0001-0238-04 | A conflicted document; qfai.config.yaml that cannot be parsed                                             | The configuration named; nothing written; exit 2                                      |
| EX-0001-0238-16 | AC-0001-0238-02 | A half-resolved working file: the opening marker removed, the closing marker kept                         | Working file unchanged; named as left as is, not as free of markers; exit 1           |

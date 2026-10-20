# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                  | Expected                                                                         |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| EX-0001-0238-01 | AC-0001-0238-01 | One example row; one side changes a word in its first sentence, the other appends a clause to its last | One row holding both edits; no conflict markers; exit 0                          |
| EX-0001-0238-02 | AC-0001-0238-01 | Both sides append a different row at the end of the same table                                         | Both rows kept, ours first; exit 0                                               |
| EX-0001-0238-03 | AC-0001-0238-01 | One long contract statement; each side edits a different sentence of it                                | One statement line holding both edits; exit 0                                    |
| EX-0001-0238-04 | AC-0001-0238-01 | No unmerged document under the story tree                                                              | Says there is nothing to merge; no file written; exit 0                          |
| EX-0001-0238-05 | AC-0001-0238-01 | An unmerged document whose working file no longer holds conflict markers                               | Working file unchanged; exit 0                                                   |
| EX-0001-0238-06 | AC-0001-0238-02 | Both sides rewrite the same sentence of one row; another row changed on one side                       | That row between conflict markers in both versions; the other row merged; exit 1 |
| EX-0001-0238-07 | AC-0001-0238-02 | One side deleted a document the other side changed                                                     | Document left as it is and named; exit 1                                         |
| EX-0001-0238-08 | AC-0001-0238-03 | The merged result breaks an example row with a raw line break                                          | QFAI-DOCSCHEMA-001 naming the document; exit 1                                   |

# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                     | Expected                                                                                               |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| EX-0001-0011-01 | AC-0001-0011-01 | The mdschema manifest and the `qfai-sdd` templates, matched against the sixteen fixed story-tree files and the Markdown CLI contract      | `documentsWithoutOneEntry` returns no file, and each file's manifest entry is paired with one template |
| EX-0001-0011-02 | AC-0001-0011-01 | A manifest text whose entries cover the sixteen fixed files and the Markdown CLI contract, with the entry for `open-questions.md` removed | `documentsWithoutOneEntry` returns `open-questions.md` and no other file                               |
| EX-0001-0011-03 | AC-0001-0011-01 | `qfai.config.yaml` sets `paths.contractsDir: docs/contracts`, and `docs/contracts/tech.md` exists                                         | `pnpm lint:mdschema` checks `docs/contracts/tech.md` against its entry with no manifest edit           |
| EX-0001-0011-04 | AC-0001-0011-02 | The sample story tree built from the `qfai-sdd` templates, with one flow and one story                                                    | `pnpm lint:mdschema` reports no failure                                                                |
| EX-0001-0011-05 | AC-0001-0011-02 | The same sample tree                                                                                                                      | `pnpm lint:mermaid` parses every Mermaid diagram, including the one in `business-flow.md`              |

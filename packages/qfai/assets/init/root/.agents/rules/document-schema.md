# Document Schema

Every document in the spec tree has a schema, shipped with the QFAI package,
and conforms to it.

## Scope

| Target                                                                                 | Applies                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A Markdown document under `paths.specsDir` or `paths.contractsDir` the manifest routes | Always                                               |
| What a document says                                                                   | Outside this rule — the stage that writes it decides |
| Markdown anywhere else in the repository                                               | Outside this rule                                    |

## 1. The schemas are closed

A schema fixes a document's headings, their order, and the one kind of content
each section holds: a list, a table with named columns, a paragraph, or one
fenced block. A section the schema does not name fails. An optional section is
named in the schema and may be left out; nothing else may be added.

## 2. An empty section is still there

A required section is written even when there is nothing to record. A table
with its header row and no data row, or a list holding `- None.` where the
template shows one, says so.

## 3. The template is the shape

Each schema is paired with the template for the same path under
`.qfai/assistant/skill/qfai-sdd/templates/spec/`. Start every document from its
template, and it conforms by construction. Where the two seem to disagree, the
package is wrong: report it rather than working around it.

## 4. No history in a document

A document states what is true now. A change-set section, a dated section, a
"Legacy" section and a heading carrying a version are not accepted. The history
is in version control and in `decisions.md`.

## 5. No opt-out

`<!-- mdschema:ignore -->` is refused. A document carrying it fails, and is
still checked against its schema. A document that cannot take its schema's
shape goes to a person; it does not go around the check.

## 6. Where the check runs

| Where                                                             | What it reports                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npx qfai validate`, in the `sdd`, `verify` and `full` profiles   | Each violation as a `QFAI-DOCSCHEMA-001` error; a check that could not run as `QFAI-DOCSCHEMA-002` |
| `.github/workflows/qfai-docs.yml`, which `npx qfai init` installs | The same violations, on every pull request. The lane is required                                   |
| `npx qfai doctor`                                                 | The lane, when the workflow file is missing                                                        |

Both run the checker the installed package carries, against its schemas, with
the `@jackchuka/mdschema` version the package depends on. Neither can be
switched off in `qfai.config.yaml`.

## 7. What a schema cannot say

A schema reads structure. A cell's value, the content of a fenced block, and
whether an ID is unique or resolves are other checks of `npx qfai validate`. A
document can conform to its schema and still fail those.

## Related

- Writing standard for the text inside a section: `documentation-clarity.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.

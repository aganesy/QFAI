# Document Schema — This Repository

Read with `document-schema.md`, which this file does not restate. Only what is
specific to this repository is here: the lanes, where the implementation
lives, and how a schema is changed.

## Why markdownlint is not enough

markdownlint reads Markdown syntax and treats a fenced block as opaque text.
All of these pass it:

- a story with no Criteria section;
- an example table that lost its `AC-Ref` column, so the trace goes empty;
- a Mermaid diagram that GitHub renders as an error box.

Those are questions about a document's shape, so they need their own checks.

## Lanes

| Lane                | Implementation                                        | What it reads                                                         |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `lint:md`           | markdownlint-cli2                                     | Markdown syntax                                                       |
| `lint:mdschema`     | `packages/qfai/assets/scripts/check-mdschema.mjs`     | Each spec-tree document against its schema                            |
| `lint:mermaid`      | `packages/qfai/assets/scripts/check-mermaid.mjs`      | Whether each Mermaid diagram parses with Mermaid's own grammar        |
| markdownlint config | `packages/qfai/scripts/check-markdownlint-config.mjs` | `.qfai/spec/.markdownlint.jsonc` against markdownlint's strict schema |
| `format:check`      | prettier                                              | Formatting                                                            |

`pnpm ci:lint` and `pnpm ci:gate` run all of them on every pull request.
`qfai validate` runs the `lint:mdschema` check too, as `QFAI-DOCSCHEMA-001`.

## One implementation, three entry points

Both checkers live in `packages/qfai/assets/scripts/` because they ship. The
docs lane `qfai init` writes into an adopter's repository runs the same files
out of the installed package, and `qfai validate` imports `checkDocuments` from
`check-mdschema.mjs` rather than carrying a copy.

`scripts/check-mdschema.mjs` and `scripts/check-mermaid.mjs` at the repository
root only delegate. They exist so `pnpm lint:*` and the tests can call the lanes
by a root-relative path.

Do not copy an implementation. Two copies of one rule drift until an adopter
gets a verdict this repository would not have given.

## Changing a schema

1. **A schema states its template's contract**, not the average of the current
   tree. The `qfai-sdd` templates under
   `assets/init/.qfai/assistant/skill/qfai-sdd/templates/spec/**` and the
   schemas are one pair. `tests/assets/mdschemaSchemas.test.ts` fails on a
   schema with no template, a manifest entry with no file, two entries on one
   pattern, and a template that does not conform.
2. **One content kind per section.** A section holds a list, a table, a
   paragraph or one fenced block, never a mix, so the shape is decided by the
   schema rather than by each author.
3. **A required section may hold a header-only table.** Mark a section required
   when every document has to answer it, even with nothing.
4. **Register it in the manifest.** A schema missing from
   `assets/mdschema/manifest.yml` is never run.

## Updating the checker

`packages/qfai/package.json` declares the checker version. Update the root
manifest and lockfile with it, then install the dependencies in this checkout.
`pnpm sync:mdschema` checks those versions and updates the shipped docs install,
its explicit tool allowlist, the two shipped workflow pins and the heading below.
It stops before writing if an expected anchor or existing pin does not match.
Renovate groups both manifests and runs the same command in its repin job before
the guard-byte and verification-body resealers. Install-script permissions stay
unchanged; synchronization runs no install, build or test.

## Writing a schema for mdschema 0.15.5

| Fact                                                                           | Consequence                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `max: 0` means no upper limit                                                  | Forbid an element with `forbidden_text` instead      |
| A section's text excludes its own heading line and includes its child sections | Forbid `\A\s*[^#\s]` to keep the text under H1 empty |
| A nested list counts as two lists                                              | Count lists with that in mind                        |
| A double-quoted YAML string interprets escapes                                 | Write regular expressions in single quotes           |
| A heading pattern matches the whole line                                       | Include the `#` characters in the pattern            |
| A table with only its header row counts as one table                           | A required table may have no data row                |

## Excluding a Mermaid diagram

A template diagram that carries placeholders is excluded one diagram at a time,
with `<!-- mermaid-lint:ignore -->` on the line directly above its opening
fence. There is no file-level exclusion, because it would silently cover a
diagram added later.

# Deliberation record: Catalogue slices

## Subject

Build the remaining parts of the confirmed UI catalogue design in parallel: prop variants, theme variables, a shipped base catalogue and an agent brief.

## implement

### Interview

| Background                                  | Option 1                       | Option 2                              | Option 3                  | Option 4 (other)                                                                                           | Chosen option number |
| ------------------------------------------- | ------------------------------ | ------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- |
| Which slice comes next, and where it lands. | Variants read from prop types. | The theme variables a component uses. | A shipped base catalogue. | All of them, by sub-agents in parallel, with no further questions; commits added to the open pull request. | 4                    |

### Agent decisions

| Background                                                                                            | Option 1                                                                                                            | Option 2                                                                         | Option 3                                                          | Option 4 (other) | Chosen option number |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------- | -------------------- |
| Which prop types give `variants`.                                                                     | A union of string literals, `undefined` and `null` aside, or a same-file alias of one; a single literal gives none. | Also a single literal, as a one-value variant.                                   | Also unions with alias parts, resolved through same-file aliases. |                  | 1                    |
| Which text `tokens` is read from. A `const` list's next declarator starts on the previous one's line. | A sibling of the `realizes` text cut at the declarator's first character.                                           | The `realizes` text as it is, letting one declarator's variables reach the next. | A changed `realizes` text, altering what it records.              |                  | 1                    |
| Where the base catalogue ships. The assistant tree's layers are fixed, and a new layer is reported.   | Beside the procurement rule's references, as YAML.                                                                  | A new `catalog` layer of the assistant tree.                                     | A reference of the implementation skill.                          |                  | 1                    |
| How the brief shows fields it does not know.                                                          | Re-read the committed text, so every key appears without code changes.                                              | Widen the typed catalogue entry for each field.                                  | Print only the known fields.                                      |                  | 1                    |
| How `--brief` with `--check` is refused.                                                              | Inside the command: one line, exit 1.                                                                               | In the argument parser: usage, exit 2.                                           | Let `--check` win silently.                                       |                  | 1                    |

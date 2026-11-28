# Deliberation record: Component catalogue realizes

## Subject

Apply the confirmed UI catalogue design, starting with the link from component catalogue entries to the business rules they realise.

## implement

### Interview

| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |
| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |

### Agent decisions

| Background                                                                                                                                                                              | Option 1                                                                                                      | Option 2                                               | Option 3                                  | Option 4 (other) | Chosen option number |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- | ---------------- | -------------------- |
| The confirmed design has several parts: rule links, variants from prop types, token use, a shipped base catalogue, an agent brief and handoff checks. One change cannot carry them all. | Start with `realizes`, the link between abstract business rules and components, which every later part reads. | Start with the shipped base catalogue of common parts. | Start with variants read from prop types. |                  | 1                    |
| Which text a component's citations are read from.                                                                                                                                       | Its statement's leading comment lines and its own declaration, each from the start of its line.               | Every citation in the component's file.                | Only the doc comment.                     |                  | 1                    |

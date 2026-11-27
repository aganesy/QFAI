# Deliberation record: Abstract contracts and web guidance

## Subject

Define what a consuming project records about its UI, API and database and how existing contracts move to the new format.

## discussion

### Interview

| Background                                                                                                                              | Option 1                                                                                                                               | Option 2                                                                                  | Option 3                                                      | Option 4 (other) | Chosen option number |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------- | -------------------- |
| An existing browser guidance initiative overlaps this change ([browser support proposal](https://github.com/aganesy/QFAI/issues/5027)). | Reconsider its policy as part of this change.                                                                                          | Leave the guidance to the existing initiative and change only contracts and traceability. | Stop this change.                                             |                  | 1                    |
| Existing projects have structured contracts that validation reads.                                                                      | Write new contracts in Markdown and allow existing contracts to migrate individually with their existing checks available.             | Require all contracts to migrate before validation passes.                                |                                                               |                  | 1                    |
| How much browser feature selection evidence to keep ([browser support proposal](https://github.com/aganesy/QFAI/issues/5027)).          | Consult the catalogue during implementation and record the reason and fallback only for a feature beyond the supported browser target. | Keep a separate record of the source and support status for every screen region.          | Require no selection record and demonstrate support in tests. |                  | 1                    |
| Document structure and traceability for all three contract kinds.                                                                       | Use a closed schema for Responsibility, Inputs, Outcomes and Business rules, linking each rule to existing examples.                   | Revise the design.                                                                        |                                                               |                  | 1                    |

### Agent decisions

| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |
| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |

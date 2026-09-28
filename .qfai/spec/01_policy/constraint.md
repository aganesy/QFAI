# Constraints

## Technical Constraints

| ID    | Constraint                                                                                                                                                                  | Rationale                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC-01 | The package runs on the Node.js floor it declares, on Linux and on Windows.                                                                                                 | Adopters install it on either platform, on any Node.js release from that floor up.                                                                           |
| TC-02 | Validation is deterministic: the same tree and the same configuration give the same findings.                                                                               | A result has to be reproducible, and comparable between runs and between machines.                                                                           |
| TC-03 | Every stage after the specification stage reads the story tree and its contracts, never a discussion pack, and a missing contract is never filled from discussion material. | The discussion pack is discovery evidence upstream of the specification; a check that accepted it in place of a contract would pass what no contract states. |
| TC-04 | The published package carries no identifier only this repository understands.                                                                                               | An adopter cannot open the documents such an identifier points at.                                                                                           |

## Operational Constraints

| ID    | Constraint                                                                                                                                                                                                     | Rationale                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| OC-01 | CI runs exactly the standard commands a contributor runs locally.                                                                                                                                              | A local run of the same commands then predicts the CI result.                                                                 |
| OC-02 | Shared history is never rewritten.                                                                                                                                                                             | Rewriting a branch that other work builds on loses that work.                                                                 |
| OC-03 | Settings that live outside the repository, such as branch protection and the package registry's trusted publishing, are changed only by an administrator, and the repository declares what it expects of them. | No pull request can read or change such a setting, so the repository can only state its expectation and hand the change over. |

## Business Constraints

| ID    | Constraint                                                                                   | Rationale                                                                                     |
| ----- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| BC-01 | A breaking change ships with release notes that say what breaks and how an adopter migrates. | Adopters upgrade from the published package and learn of a break only from its release notes. |

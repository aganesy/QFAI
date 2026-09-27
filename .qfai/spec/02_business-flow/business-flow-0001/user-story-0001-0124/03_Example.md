# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                                                          | Expected                                                                                     |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| EX-0001-0124-03 | AC-0001-0124-01 | Given `paths.contractsDir` is an absolute path outside the repository, and a UI contract under it declares `CON-UI-0007` with screens `home` and `settings`. When certify reads the screens of the covered contracts.                          | Then both `home` and `settings` are returned, so certify requires a review payload for each. |
| EX-0001-0124-04 | AC-0001-0124-01 | Given the accepted iteration is `iter-07`, and the frozen UI contract set includes `CON-UI-0007` and `CON-UI-0011`, whose `settings` screen lacks `iter-07/CON-UI-0011/settings.review.json`. When `qfai prototyping certify` checks evidence. | Then certify exits 64 and names `(CON-UI-0011, settings)` as the missing pair.               |

# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                                                                        | Expected                                                                                |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| EX-0001-0124-03 | AC-0001-0124-01 | `paths.contractsDir` is an absolute path outside the repository, and a UI contract under it declares `UI-0007` with screens `home` and `settings`, when certify reads the screens of the covered contracts.                  | Both `home` and `settings` are returned, so certify requires a review payload for each. |
| EX-0001-0124-04 | AC-0001-0124-01 | The accepted iteration is `iter-07`, and the frozen UI contract set includes `UI-0007` and `UI-0011`, whose `settings` screen lacks `iter-07/UI-0011/settings.review.json`, when `qfai prototyping certify` checks evidence. | Certify exits 64 and names `(UI-0011, settings)` as the missing pair.                   |

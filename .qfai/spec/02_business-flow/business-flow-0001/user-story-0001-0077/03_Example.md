# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                        | Expected                                                                                                                                                                                                                            |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0077-01 | AC-0001-0077-01 | Configure a repository whose `package.json` names Vitest, which holds a `pnpm-lock.yaml`, and whose tests sit under `tests/unit/` and `tests/integration/` named `*.test.ts` | The configure run records Vitest as the test framework, `tests/unit/` and `tests/integration/` as the test directories, `*.test.ts` as the naming convention and pnpm as the package manager, each with the file it was observed in |

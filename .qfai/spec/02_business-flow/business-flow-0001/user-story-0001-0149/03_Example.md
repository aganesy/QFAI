# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                   | Expected                                                                                                                                                                        |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0149-01 | AC-0001-0149-01 | `qfai.config.yaml#prototyping.mode: convergence`, when `qfai prototyping iterate --mode exploration` runs with failed `QFAI-CRIT-008` and a design compliance violation | The flag wins, `prototyping.json#mode` is `exploration`, and both findings are warnings; missing schema fields remain errors and a non-allowlisted image source still exits 66. |
| EX-0001-0149-02 | AC-0001-0149-02 | A loop containing an exploration iteration and an accepted convergence iteration, when `qfai prototyping certify` runs                                                  | It rejects sealing the exploration iteration with `R-EXPLORATION-CERTIFY-ATTEMPT`, and `acceptedIterationIndex` may select only the convergence iteration.                      |

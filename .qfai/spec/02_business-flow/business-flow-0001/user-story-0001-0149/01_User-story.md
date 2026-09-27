# US-0001-0149: Exploration and convergence modes

## User Story

As an operator, I want a `prototyping.mode` setting (`convergence` or `exploration`) in `qfai.config.yaml`, overridable per run by `qfai prototyping iterate --mode <mode>` and defaulting to `convergence`, so that exploration iterations can use the relaxed gate table while `qfai prototyping certify` refuses to seal an exploration-mode iteration (`R-EXPLORATION-CERTIFY-ATTEMPT`) and `acceptedIterationIndex` points only at a convergence-mode iteration.

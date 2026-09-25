# US-0001-0191: Read-only convergence peek

## User Story

As an `/qfai-prototyping` operator, I want `qfai prototyping iterate --check-convergence` to report whether the loop has converged without running a cycle, so that I can choose between `certify` and another cycle from the recorded state. (REQ-0012-0078)

## Source Provenance

- Story block: US-0012-0143, which `main` added to spec-0012 in commit `9d14e814c` after the retired archive was taken. `decisions.md#DEC-0737` records the port.

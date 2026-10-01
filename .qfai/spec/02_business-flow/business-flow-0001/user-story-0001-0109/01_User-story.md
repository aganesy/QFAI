# US-0001-0109: Deterministic iteration stop codes

## User Story

As a maintainer, I want the stop condition of `qfai prototyping iterate --cycle <n>` decided by its exit code (0, 2, 64, 65 or 66), so that an AI agent cannot declare the work done on its own judgement before the deterministic gate passes.

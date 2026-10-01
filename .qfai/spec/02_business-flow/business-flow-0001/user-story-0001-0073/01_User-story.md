# US-0001-0073: ATDD Scaffold Bulk Skeleton Generation

## User Story

As a QA engineer, I want `qfai atdd scaffold` to write one skeleton per AC of a story (`--story US-NNNN-NNNN`) or one E2E skeleton for a flow (`--flow BF-NNNN`), never overwriting an existing file, with `D-SCAFFOLD-PLACEHOLDER` keyed by the AC or BF ID until the placeholder is filled, so that I can bootstrap acceptance-test files in bulk without hand-creating each file.

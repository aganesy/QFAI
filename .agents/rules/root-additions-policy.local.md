# Root Additions — This Repository

Read with `root-additions-policy.md`, which this file does not restate. Only
what is specific to this repository is here.

## Two shapes that turn up at this root

- A file named `report.<pid>.<timestamp>.<n>.<n>.<n>.json` is a Node.js
  diagnostic dump, not a production artifact. Find what produced it, then
  delete it or move it under `tmp/`.
- A review pack belongs at `.qfai/review/review-<timestamp>/`, never at the
  repository root.

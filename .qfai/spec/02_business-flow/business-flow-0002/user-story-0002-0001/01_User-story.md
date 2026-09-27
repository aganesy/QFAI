# US-0002-0001: Shipped workflow hardening

## User Story

As an adopter, I want the `.github/workflows/qfai-validate.yml` that `qfai init` ships to carry job-reachable least-privilege `permissions:` blocks, a ref-scoped `concurrency:` group with cancellation, `persist-credentials: false`, per-job `timeout-minutes` and artifact hygiene, with a header that claims no Node floor the package's `engines` does not declare and the existing lockfile-detecting `cache:` expression kept rather than replaced, so that the CI I receive is bounded and runs with the least privilege it needs.

## Non-goals

- Hardening QFAI's own `.github/workflows/**`
- Retiring the repository's own copy of the shipped workflows

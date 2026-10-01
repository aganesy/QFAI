# US-0002-0016: Measurement-gated build reuse and artifact-upload hygiene

## User Story

As a maintainer paying for runner minutes, I want the bundler build produced once and downloaded by the legs that need it, and the report upload to stop paying storage for cancelled runs, so that each cost change is accepted or rejected on captured before-and-after numbers rather than on argument.

## Non-goals

- Asserting a saving without a baseline.
- Caching keyed on a source hash instead of upload and download.
- Narrowing the matrix to reduce builds.
- Retrying a measured regression until it agrees.
- Touching the two builds the pack-verification lifecycle fires, which artifact reuse cannot reach.

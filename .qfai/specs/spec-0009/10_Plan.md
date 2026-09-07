# 10 Plan

## Implementation approach

1. Repository analysis module: detect test frameworks, directories, naming conventions
2. Glob pattern generator: produce include/exclude globs from analysis results
3. Config updater: apply minimal diff to `qfai.config.yaml`
4. Steering populator: fill steering files from repository evidence
5. Evidence sampler: list 5-15 matched test files for user confirmation

## Test approach

- Unit tests: glob pattern generation, config diff minimality
- Integration tests: full configure workflow from analysis to config update

## Dependencies

- Requires: initialized QFAI project (`qfai init` completed)
- Consumed by: `/qfai-discussion` as the recommended next step

## Risk mitigation

- Diverse project structures may require custom glob patterns beyond automatic detection
- Mitigation: skill stops and asks when zero matches or ambiguous directories are found

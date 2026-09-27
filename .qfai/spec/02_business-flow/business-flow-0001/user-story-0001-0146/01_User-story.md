# US-0001-0146: Out-of-range cycle guidance

## User Story

As an operator, I want `iterate --cycle N` with N outside `0..9` to fail with a deterministic error that names the supported range and recommends the peek-mode equivalent, so that off-by-one CLI mistakes are self-diagnosable.

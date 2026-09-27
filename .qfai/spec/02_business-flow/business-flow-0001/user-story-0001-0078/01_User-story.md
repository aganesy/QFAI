# US-0001-0078: Config Glob Tuning

## User Story

As a QFAI user, I want `/qfai-configure` to write precise test globs, `paths.specsDir: .qfai/spec` when my config has no such key, and only the agent assignments and review profiles I ask to change into `qfai.config.yaml`, so that `qfai validate` traces tests without false positives or misses and every default I did not change keeps following the package.

# US-0001-0078: Config Glob Tuning

## User Story

As a QFAI user, I want `/qfai-configure` to write precise test globs, `paths.specsDir: .qfai/spec` when my config has no such key, only the agent assignments and review profiles I ask to change, and the paths that render a user-visible surface as `uiux.surfacePaths` into `qfai.config.yaml`, so that `qfai validate` traces tests without false positives or misses, the UI-affecting check reads those paths from that same file and reads an API obligation from the contract that declares it, and every default I did not change keeps following the package.

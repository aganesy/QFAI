# US-0001-0076: Config Glob Tuning

## User Story

As a QFAI user, I want `/qfai-configure` to write precise test globs, only the agent assignments and review profiles I ask to change, and the paths that render a user-visible surface as `uiux.surfacePaths` into `qfai.config.yaml`, leaving every other key, `paths.specsDir` included, as it is, so that `qfai validate` traces tests without false positives or misses, the UI-affecting check reads those paths from that same file, and every default I did not change keeps following the package.

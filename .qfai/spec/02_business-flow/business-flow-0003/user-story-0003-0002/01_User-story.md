# US-0003-0002: Directory structure diagnosis

## User Story

As an operator, I want `qfai doctor` to check that each directory the configuration names exists, resolving it from its `paths.*` key in `qfai.config.yaml` (`paths.specsDir`, `paths.contractsDir` and `paths.discussionDir` among them), so that a missing directory is reported before a command that needs it fails.

## Non-goals

- Creating missing directories automatically.

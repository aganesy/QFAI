# US-0001-0232: Find forbidden identifiers in the tracked worktree

## User Story

As a project maintainer, I want validation to find configured forbidden
identifiers in tracked file names and current contents without storing their
plaintext values in configuration, so that matches and incomplete coverage
are visible as validation errors.

## Non-goals

- Unicode identifiers or arbitrary regular expressions.
- Untracked files, Git history or changes to scanned files.
- Secure storage of secrets or redaction of unrelated diagnostics.

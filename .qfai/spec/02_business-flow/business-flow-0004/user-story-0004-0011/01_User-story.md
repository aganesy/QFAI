# US-0004-0011: Repoint the host links and the ignore rules

## User Story

As an adopter, I want steps 9 and 10 to point my host integration links at the renamed skill and agent directories and stop git tracking `.qfai/evidence/`, so that my AI host and git see the migrated project correctly.

## Non-goals

- Rerunning `qfai init --force`.
- Editing a `.gitignore` line outside its managed block, other than a negation that re-includes `.qfai/evidence/`.
- Committing the removal of `.qfai/evidence/` from the git index.

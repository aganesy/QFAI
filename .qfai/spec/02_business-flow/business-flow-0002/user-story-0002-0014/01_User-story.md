# US-0002-0014: Own-CI supply-chain hardening with an accountable pin owner

## User Story

As a maintainer accountable for supply-chain risk, I want every own-CI job to reach a least-privilege permission block, every checkout to refuse to persist the token and every action reference to be pinned to a full commit SHA with a named owner for bumping the pins, so that these properties hold structurally rather than by review discipline.

## Non-goals

- Relying on the repository-wide default permission set.
- Making full history a workflow-wide default because two jobs need it.
- Pinning without naming who bumps the pins.
- Removing the publishing job's identity-token elevation, which is justified and stays.

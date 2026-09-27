# US-0001-0048: Skill-document references and migration notes

## User Story

As a SKILL.md author, I want `qfai validate` to raise `W-SKILL-DOC-BROKEN-REF` for a SKILL.md reference to a retired legacy path and to pass the `W-USER-EDIT-PRESERVED` notes of `qfai init --upgrade-assistant-tree` through as informational, so that documentation drift is caught while migration never blocks a gate.

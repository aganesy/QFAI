# US-0001-0189: Continue, or stop, an interrupted run

## User Story

As an operator, I want to say "continue" in a new session and have the run pick up at the pending work without redoing story authoring or acceptance, and a run I stop to end at once and leave my own uncommitted work alone, so that an interrupted run neither repeats finished work nor touches mine.

## Non-goals

- A lock taken over because it looks old.
- A damaged journal repaired to look like success.
- Recovery through a reset, a stash or a branch switch.

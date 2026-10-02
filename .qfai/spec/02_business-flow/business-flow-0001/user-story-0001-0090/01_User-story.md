# US-0001-0090: Discussion writes the active session pointer

## User Story

As a QFAI user finishing a `/qfai-discussion` run, I want the skill to write `.qfai/state.json#discussion.currentId`, and a missing or ambiguous pointer to raise an error naming the candidate directories and the recovery command, so that the pack just written becomes the active session downstream skills find.

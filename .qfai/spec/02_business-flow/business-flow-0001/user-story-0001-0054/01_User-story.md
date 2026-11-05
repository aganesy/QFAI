# US-0001-0054: Append-only drift and change-request authorization

## User Story

As a reviewer of a change on the story tree, I want the `drift` gate to report a register row that was removed or rewritten, a question deleted with no decision naming it, a row added with a four-digit ID, and a protected file changed with no change request the branch adds, so that recorded decisions and upstream specifications change only through a recorded change request.

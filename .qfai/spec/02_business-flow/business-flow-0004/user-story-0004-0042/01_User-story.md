# US-0004-0042: List the project files that still name a 1.x path

## User Story

As an adopter who moved a project from QFAI 1.x to 2.x, I want step 12 to list each tracked file I wrote that still names a 1.x path, by file and line, and the guide to say what each path is now, so that I can update my own skills, agents and documents before they fail on their first run.

## Non-goals

- Rewriting a file the project wrote.
- Scanning a file the package or the migration owns: every path under `.qfai/`.
- Scanning a file git does not track.
- Finding a 1.x construct other than the paths the migration moves.

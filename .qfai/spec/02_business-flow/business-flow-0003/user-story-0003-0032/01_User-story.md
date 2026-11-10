# US-0003-0032: Assistant asset size checks

## User Story

As an adopter, I want `qfai doctor` to report each skill whose body exceeds the size the AI-readable Markdown rule allows, and the text `qfai init` makes my agent load in every session to stay within a fixed budget, so that the instructions an agent reads before it acts stay small enough for it to follow. I check skill bodies through what doctor reports; the every-session budget is held by the package's own tests on the text it ships, and doctor does not measure it.

## Non-goals

- Counting tokens; every size is in code points, and a token figure is only an estimate.
- Shrinking a skill body or a reminder on the project's behalf.
- Holding a skill's reference files to the body limit.

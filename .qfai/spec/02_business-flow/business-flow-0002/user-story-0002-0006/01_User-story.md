# US-0002-0006: Shipped Node and package manager portability

## User Story

As an adopter, I want the shipped workflows to prefer my own Node version file and fail open with a warning to a documented literal when it is absent, to fail closed with an actionable annotation naming the fix when the package manager cannot be resolved, to keep the existing lockfile-detecting install branches for four package managers and no lockfile in every shipped file, and to run the QFAI my Yarn Plug'n'Play project depends on rather than the newest release, so that the workflows run on my toolchain and a setup failure names its own fix.

## Non-goals

- Assuming a single package manager or a single language
- Taking the Node version from a file unconditionally
- Changing a spelling for the leakage guard's sake, since a bare major literal never matched the guard

# Deliberation record: deliberation record P2 follow-ups

> This record is history: it keeps how this run reached its choices, twists and reversals included.
> It is not the current state. The story tree, `decisions.md` and `open-questions.md` are, and they win where this record disagrees.
> It is not read end to end: search its option cells for the option you are about to choose, and read only the rows that match.

## Subject

Fix the six small review notes left after the deliberation record redesign: the graph's handling of an unreadable configuration, a double configuration load, two stale spec texts, a stale test comment and a bare type assertion.

## qfai-run

### Interview

| Background                           | Option 1                                                               | Option 2                          | Option 3                 | Option 4 (other) | Chosen option number |
| ------------------------------------ | ---------------------------------------------------------------------- | --------------------------------- | ------------------------ | ---------------- | -------------------- |
| Which scope to run for the six fixes | Fix, verify and commit locally                                         | Fix only, with no gate or commit  |                          |                  | 1                    |
| What happens after the local commit  | Push, open a pull request, merge when CI, threads and review are clear | Push and open a pull request only | Stop at the local commit |                  | 1                    |

## qfai-implement

### Agent decisions

| Background                                                                                                                                               | Option 1                                            | Option 2                                                                               | Option 3                                                                                               | Option 4 (other)                                                                | Chosen option number |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------- |
| The graph cannot read `qfai.config.yaml`, so it cannot tell which directory holds deliberation records; until now it silently used the default directory | Keep the default directory and warn                 | Throw a plain error, which the query's catch turns into the generic "operation failed" | Throw a typed error that the query reports as a failure naming the file and telling the user to fix it | Exclude both the default directory and every directory any earlier config named | 3                    |
| A second `qfai init` reads a current code analysis while the configuration gives no usable `paths.deliberationDir`, and the new check now throws there   | Let the error stop init after its files are written | Report code analysis not ready, so init finishes as it did before                      | Write a new init rule that aborts on such a configuration                                              |                                                                                 | 2                    |

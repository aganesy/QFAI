# Deliberation record: graph configuration review notes

> This record is history: it keeps how this run reached its choices, twists and reversals included.
> It is not the current state. The story tree, `decisions.md` and `open-questions.md` are, and they win where this record disagrees.
> It is not read end to end: search its option cells for the option you are about to choose, and read only the rows that match.

## Subject

Fix the six minor notes the final review left on the graph's handling of an unusable `paths.deliberationDir`.

## qfai-implement

### Interview

| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |
| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |

### Agent decisions

| Background                                                                                                                                                                                           | Option 1                                                                                       | Option 2                                                                           | Option 3                                                    | Option 4 (other) | Chosen option number |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------- | -------------------- |
| With a current analysis, the query turned the configuration error into a failed answer and the fallback still granted a search; with none, the error reached the command and no fallback was granted | Rethrow the error from the query, so the command reports both paths and no fallback is granted | Catch the error around preparation and return the same failed answer on both paths | Leave the two paths as they are and document the difference |                  | 1                    |
| The error message named two possible faults at once                                                                                                                                                  | One message per fault: unreadable or unparsable, or no usable `paths.deliberationDir`          | Append the first configuration issue to one generic message                        | Keep one generic message                                    |                  | 1                    |

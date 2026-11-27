# Deliberation record: the domain-language step

> This record is history: it keeps how this run reached its choices, twists and reversals included.
> It is not the current state. The story tree, `decisions.md` and `open-questions.md` are, and they win where this record disagrees.
> It is not read end to end: search its option cells for the option you are about to choose, and read only the rows that match.

## Subject

Deliver the second stage of the approved domain-driven design adoption: a step that settles the request's domain terms against the glossary, run in discussion between research and interview and first in every specification stage.

## qfai-sdd

### Interview

| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |
| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |

### Agent decisions

| Background                                                                                                                                           | Option 1                                                                                                                                                                | Option 2                                                                | Option 3                                              | Option 4 (other) | Chosen option number |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- | -------------------- |
| The step runs in a discussion stage and a specification stage, which two different skills own                                                        | One `common-` step that both skills list, writing what each stage may write                                                                                             | Two steps, one per skill, with the same procedure                       | A reference both stages read, with no step of its own |                  | 1                    |
| Which specification stages run the step                                                                                                              | Every stage of kind `sdd`, including the shared specification stage the planner adds and the `decide` stage of `retire-mechanism`, so one rule holds without exceptions | Only the stages of the ten routes that list `sdd-triage` in their files | Only the routes that add behaviour                    |                  | 1                    |
| Whether the step may pass through in the discussion stage, where the user chose a dedicated step                                                     | Pass-through in every plan: it always runs, and writes nothing only when its Passes when condition holds                                                                | Pass-through only in the specification stage                            | Never pass-through                                    |                  | 1                    |
| The two reviewers disagreed on whether the shared specification stage needs a guard for a route that would leave only the domain-language step in it | No guard: BR-CLI-0020-0010 lets no project add or edit a plan, and every built-in plan that runs `sdd-triage` also runs the step, so the case cannot arise              | Keep the guard and pin it with an example                               | Keep the guard without an example                     |                  | 1                    |

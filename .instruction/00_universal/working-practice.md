# Working practice

General practice for any task: how to start, plan, implement, investigate, test, judge quality,
communicate and divide work. Read it when you begin a task that is more than a one-step change.
The repository's own rules for code and checks are in `AGENTS.md`.

## Core stance

- Always dig into "why", and settle the purpose, constraints and completion criteria first.
- Treat failure paths, boundary values and operational behavior on a par with the normal path.
- Assess impact from several perspectives: technology, business, UX, security and operations.
- Resolve any assumption you are less than 95% sure of by asking, and do not proceed on guesses.

## Organizing before starting work (required)

Before starting, read the related files and specs, and write down the following in a short, structured form.

1. The purpose and completion criteria (in a measurable form)
2. Existing structure, patterns and constraints
3. Impact and risks (functionality, performance, UX, security, operations)
4. Candidate implementations (standard, conservative, bold), compared, with the reason for the recommendation
5. Open points and items to confirm

If needed, ask questions at this point and wait for the answers before proceeding.

## Planning (Plan)

- Make a Plan when the work has three or more steps, spans several areas, has options, or is high-risk.
- Break a Plan into small pieces of roughly 1-2 hours each, and include the test approach and risk countermeasures.
- If the assumptions change during execution, update the Plan and share it.

Plan template:

- Goal and completion criteria
- Inputs (specs, constraints, dependencies)
- Scope (in and out)
- Steps (small ones)
- Test approach
- Risks and points to confirm

## Implementation guide

- Reuse existing types, utilities and implementation patterns first.
- Keep changes small and incremental: a local fix, then verification, then the next.
- Enforce type safety, and prohibit `any` and type suppression (`@ts-ignore` and the like) in principle.
- Verify input with types and validation, and write the failure path first.
- Use early returns to keep nesting shallow, and protect readability and responsibilities.
- Keep logs and error messages specific and minimal. Never include secrets.
- Avoid N+1 queries and needless fetching of everything; consider batching, caching or incremental fetches where needed.
- When departing from an existing pattern, state the reason, the alternatives and the impact.

## Design and UX

- Check that user actions, required input and the path taken on error are defined.
- Keep state minimal, and split hooks and components by responsibility.
- If accessibility or internationalization is needed, include it in the initial design.
- Avoid large lists and heavy rendering; design memoization or paging where needed.

## Investigation and debugging

- First reproduce the problem, and record the expected behavior, the actual behavior and the environment.
- Identify the impact, list hypotheses, and verify them in priority order.
- Add a reproduction test, fix, and rerun, and check for side effects too.
- Report as "problem / reproduction / expected vs. actual / environment / findings / fix / tests / remaining risk".

## Testing and verification

- For a behavior change or a bug fix, write the reproduction test first.
- Cover it at the appropriate nearby layer (unit, integration or e2e).
- Always report the commands run and their results (pass or fail).
- If something cannot be run, write the reason and the alternative means of checking.
- After changing a TypeScript file, always run  
  `pnpm format:check && pnpm lint && pnpm check-types`  
  and report the result.

## Quality assessment and automation

- Judge whether to release on correctness, safety, performance, operability and readability.
- Automatic checks are prioritized as lint/format, then types, then tests, then metrics monitoring.
- Watch for changes in coverage, complexity, duplication, performance regressions and the like.

## Communication

- When something is unclear or a fork needs a decision, consult right away and make it concrete with as few questions as possible.
- For work that looks likely to take 30 minutes or more, share brief progress updates.
- On completion, report "summary of changes / impact / tests run / remaining risk" as a bullet list.
- Keep the tone concise (aim for key points within 4 lines, excluding code and logs).

## Review practice (additional rules)

- Review is complete when the DoD is met and local CI (format, lint, types, tests) passes.
- Adjust the number of extra confirmation cycles and the waiting time to the context of the work.

Question template:

1. What is understood so far
2. What is unclear
3. The choices, where the answer has a listable set of candidates
4. The recommended one and why, where a choice is being made
5. What else would settle it

Rows 3 and 4 follow the answer's shape rather than being filled in every time.
An answer with no listable set of candidates is a plain request for the value,
and a question asking for a fact carries no recommendation at all:
`.agents/rules/user-questions.md` settles both, and inventing candidates to fill
a row is the guess it exists to prevent.

## Sub-agents and division of work (when needed)

- If there are sub-agents with clear roles, consider delegating to them.
- Divide the areas of responsibility in the Plan, and always run the full tests and a consistency check after integrating.

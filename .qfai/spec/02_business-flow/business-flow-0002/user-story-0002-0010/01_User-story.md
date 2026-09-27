# US-0002-0010: Scanner and prompt synchronization

## User Story

As a contributor changing either the scanner `findDesignMdViolations.ts` or the LLM prompt `generator-prompt.md`, I want CI to refuse a merge when only one file of that pair changed, so that the Tailwind contract embedded in the prompt and the contract the scanner enforces cannot drift apart.

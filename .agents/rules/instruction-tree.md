# Instruction Tree

What `.instruction/` may say, and what it may not.

The directory holds operating guidance an agent reads because `AGENTS.md` sent
it there. Nothing loads it automatically.

## Repository-only

`qfai init` does not ship this tree, and no shipped agent card may cite a path
under it. `agentSelectionReferenceTargets.test.ts` holds that: a pointer into a
directory an adopter does not have resolves to nothing.

## It states no rule of its own

Four places own rules, and a file here restates none of them. It points.

| Owner                             | Owns                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `.agents/rules/**`                | The cross-AI rules, one master per rule               |
| `.qfai/assistant/constitution/**` | The articles, and the Absolute Rules                  |
| `AGENTS.md`, `CLAUDE.md`          | Naming, indexing, and which of the above applies when |
| `REVIEW.md`, the agent cards      | What a reviewer looks for, and what each role does    |

On any disagreement the owner wins and the file here is wrong. A second
statement of a rule is not a summary; it is a copy that drifts, and the drift is
invisible until someone follows the copy.

## Output language

This directory pins none. `.qfai/assistant/constitution/constitution.md` states
the Absolute Rule — output in the user's working language — and that rule
decides, here as everywhere.

Every file here once opened with a block fixing output to one language. That
block reached `constitution/agent-selection.md` by being copied out of this
directory, where it overrode the Absolute Rule for every operator working in
another language. `outputLanguageSingleSource.test.ts` sweeps this tree with the
same matcher that guards the shipped one.

The prose here is in whatever language its author used. That says nothing about
what an agent writes back.

## Adding a file

A new file earns its place by saying something no rule master, no constitution
article, no agent card and no skill says. If the sentence exists elsewhere, link
to it.

## Project facts

The `02_project/` layer describes this repository — its layout, its stack, its
commands. Those are facts a live file already states, and a summary of a fact
goes stale without anything failing. Read the live source before acting on a
version number, a path or a pack shape stated here.

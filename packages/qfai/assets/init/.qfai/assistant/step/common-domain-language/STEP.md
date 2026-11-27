---
name: common-domain-language
owner: common
purpose: "Settle the names and meanings of the domain terms a request uses against the glossary, its rejected synonyms and its bounded contexts, before the interview or the specification is written in them."
requires: []
---

# common-domain-language

A question asked in a word two people read two ways is answered twice, once
for each meaning. This step settles the words first, so the interview and the
specification after it are written in one language: the glossary's.

It runs in the discussion stage between `discussion-research` and
`discussion-interview`, and at the start of the specification stage before
`sdd-triage`.

## Reads

- `<paths.specsDir>/01_policy/glossary.md`: each term, its definition, its
  rejected synonyms (Avoid) and its bounded context (Context), and the
  `## Contexts` table.
- The request, and in the discussion stage the research summary
  `discussion-research` reported. In the specification stage, the
  deliberation record the stage consumes.
- The story tree, the contracts and the code the request touches, for the
  words they already use for each thing.
- `.qfai/assistant/skill/qfai-grilling/references/glossary-check.md`, for how
  a clash is raised and where a settled term is written.
- `.qfai/assistant/rule/references/deliberation-record.md`, for the rows a
  round writes.
- `.agents/rules/document-schema.md`, before writing `01_policy/glossary.md`.

## Writes

| Stage         | Writes                                                                                                                                                                                                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discussion    | An Interview row of the run's deliberation record for each question put, and one `open-questions.md` row for each node left open and each settled term, naming the term and its definition                                                                                                                                       |
| Specification | An Interview row of the run's deliberation record for each question put, one `open-questions.md` row for each node left open, the settled rows of `01_policy/glossary.md` with its Avoid and Context cells and its `## Contexts` table, and the deletion of each settled-term `open-questions.md` row it wrote into the glossary |

The discussion stage writes no glossary row. The specification stage writes
each settled-term row a discussion left in `open-questions.md` into the
glossary, then deletes that row. Nothing else is written.

## Procedure

1. **List the candidates.** Collect the domain words the request and the
   research use: the things, the people and the events the work is about. A
   general programming word is not a candidate.
2. **Read each against the glossary.** Put every candidate in one of these:

   | Reading      | What it is                                                     | What happens                                                                                                   |
   | ------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
   | Matches      | A term the glossary defines, used in that meaning              | Nothing                                                                                                        |
   | Rejected     | A word a row lists under Avoid                                 | Corrected to the row's term, and noted in the round; not asked                                                 |
   | Synonym      | Another word for a term the glossary defines                   | Corrected to that term and noted; adding it to the row's Avoid cell is an item of the round's grouped question |
   | Two meanings | One word the request, the tree or the code uses for two things | A decision: one meaning, or one row per bounded context                                                        |
   | New          | A word the glossary does not hold that a decision turns on     | Defined in the round                                                                                           |

   A candidate no decision turns on is left out.

3. **Draft only from evidence.** For a new term with a use in the code, the
   story tree or the request, draft its definition from that use and cite the
   use. A new business term with no such use is a fact only the user holds:
   ask for its definition with no recommended answer.
4. **Try each definition on an edge case.** For each drafted or answered
   definition, state one scenario at its boundary, such as a cancelled order
   or a person who is both buyer and seller, and say which side of the
   definition it falls on. A scenario that splits the definition reopens it.
5. **Put one round.** Ask every node of steps 2 to 4 together, as
   `.agents/rules/grilling.md` § A round says. Changing what a glossary row
   already defines is a critical decision and is put to the user in every
   session. Under a no-question mode, write each node left open as an
   `open-questions.md` row and rewrite no existing glossary row.
6. **Write what was settled.** Write each settled term as the Writes table
   says, at once: a definition that says what the term is, the rejected
   synonyms comma-separated, and the context only where the term splits. A
   context the row names is declared in `## Contexts`.

## Passes when

Read first: the request, the glossary, the run's deliberation record and
`open-questions.md`. The step passes when, in the specification stage, no
settled-term row waits in `open-questions.md`, and in either stage no candidate of step 1 is new, a synonym or read two
ways; a rejected synonym it only corrects in its own reading does not stop the
pass. The pass names the glossary rows it read.

## Gate

Every domain word a decision of the request turns on is a glossary term used in
its meaning, a settled term written as the Writes table says, or an
`open-questions.md` row; no rejected synonym is left uncorrected in what the
stage wrote; and no file outside the Writes table changed.

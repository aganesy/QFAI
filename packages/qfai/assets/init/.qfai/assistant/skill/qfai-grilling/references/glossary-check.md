# The glossary check

How a grilling session checks its terms against the project glossary.
`.agents/rules/grilling.md` § Terms against the glossary holds the rule; this
file is the procedure. Every session, user or delegated and at every stage,
checks only `<specsDir>/01_policy/glossary.md`.

## The check

- **A clash is raised when it appears.** A term the user or an author uses that
  conflicts with, or is a synonym of, a term the glossary defines is raised first
  in the round it appears in, or the next one when it appears in an answer.
  Questions whose answer turns on its meaning wait for the next round. The
  griller proposes the glossary's term. A plain synonym is corrected to it and
  noted in the round, not asked; a term with two plausible meanings is a
  decision node.
- A matching term raises nothing. A term the glossary does not hold is asked about only
  when a decision on the tree turns on its meaning.
- **A settled term is written at once**, not at the end of the session: to the
  project glossary in a stage that writes the policy layer, and otherwise as an
  `open-questions.md` row naming the term and its definition, which `/qfai-sdd`
  writes into the glossary.
- A definition says what the term is. A rule, a value set or a procedure belongs in the spec, not in the row.

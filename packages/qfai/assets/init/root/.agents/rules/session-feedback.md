# Session Feedback

What an agent does once, when every task the user gave it is complete: review
the whole session for problems in QFAI itself, and ask the user whether to
report them.

An agent in a session notices what a maintainer cannot see from outside: a rule
that contradicted another, a gate that stopped correct work, a step that cost an
hour for a small result. The notice ends with the session unless something
carries it out. This rule carries it to the QFAI repository, at the moment the
agent holds the most evidence, and only with the user's agreement.

## Scope

| Target                                                                    | Applies                                    |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| The end of the turn after which no task the user gave is left             | Reviewed                                   |
| A pause: a question, an approval, a phase boundary, a halt, a next action | Not reviewed                               |
| A problem in the adopter's own project                                    | Outside this rule                          |
| A problem in QFAI's rules, skills, steps, commands, hooks or documents    | Reported once the user agrees              |
| A run under a no-question mode                                            | Drafted into the final report, never filed |

## 1. When the review runs

Only when both hold, judged from the whole session:

1. Every task the user gave is complete, in every stage the plan chose.
2. Nothing waits on the user: no question, approval or choice is open.

A turn that ends with a question, a plan awaiting approval or a list of next
actions is a pause. So is the end of one stage of several. If the user's next
answer would start more work, the work is not complete.

The `Stop` hook puts the question at the end of a turn, because no hook can see
whether the user's work is done. The agent answers it from the session. When the
work is not complete, or the review already ran after the user's latest
instruction, the agent replies with one short line and stops. In doubt, the work
is not complete.

> SIMPLIFIED: the hook fires at every end of turn that does not end in a
> question mark, a statement-style pause included, and the agent declines it
> when the work is not complete, which costs one short extra turn and the
> message each time.
> Lift when: the host reports whether the user's work is complete.

## 2. What to review

The whole session, for these, where QFAI caused or contributed to them:

- **Blockers.** A gate, check or rule that stopped correct work.
- **Structural problems and contradictions.** Two rules, specs or skills asking
  for incompatible things, or text that points at nothing.
- **Lost efficiency.** Repeated steps, waiting, and rework that a rule or
  command caused.
- **Tokens against output.** Large reads, repeated loads and long ceremony for a
  small result.
- **Poor value.** A mechanism whose cost for this work exceeded what it gave.
- **Over-work.** Work beyond the request because a rule or step required it.
- **Quality that missed the user's wish.** Output the user had to correct or
  reject, and the QFAI guidance that led there.

A finding names its evidence: the command, finding code, message or shipped file.
A feeling without evidence is not a finding. A figure is given only when the
session measured it, and an estimate says so.

## 3. What a draft holds

One draft for each problem, never a log of the session. Each holds:

- a title that states the problem in one line;
- what happened, with the QFAI command, finding code or shipped file named;
- the cost, in time, tokens or rework;
- what would have helped, as a suggestion.

Write it for a maintainer who has not seen the session, in English, whatever
language the session used. `documentation-clarity.md` sets the writing standard.

A draft carries none of these: the name of the project or its organisation, a
repository address, source code, a path of the project's own, a secret, personal
data, or the user's words beyond what the problem needs. A path under what QFAI
ships is fine. Generalise the rest.

A message quoted from the session has the project's paths, IDs and names
replaced by placeholders. Nothing else is quoted from the project's files or
tool output.

## 4. Ask before filing

Put one question to the user through the host's structured question tool, in the
form `user-questions.md` sets out:

- one option for each draft, labelled by its title and described by what it
  reports and the cost it names, with the full text of every draft shown beside
  the question;
- more than one may be chosen, and choosing none files nothing;
- the recommendation first, with its reason.

A requested change to a draft is made, and the question is put again. Filing is
visible to others, so the answer covers the drafts shown and nothing wider
(`action-reversibility.md`).

When the review finds nothing worth reporting, say so in one line and ask
nothing.

## 5. Filing

For each approved draft, write the body to a scratch file
(`temporary-files.md`) and file it once:

```sh
gh issue create --repo aganesy/QFAI --title '<title>' --body-file <file>
```

The title is plain words: no backtick, `$`, or quote in it, so the shell
expands nothing. Report each issue's address. Where `gh` is missing or not signed
in, give the user the title and body to post at
`https://github.com/aganesy/QFAI/issues/new`. Never ask for, read or enter a
credential.

## 6. Under a no-question mode

Nothing is asked and nothing is filed. The drafts go in the final report, and
the report says they were not filed.

## Related

- The form of the question: `user-questions.md`
- Why filing needs an answer: `action-reversibility.md`
- The writing standard for a draft: `documentation-clarity.md`
- Where the scratch file goes: `temporary-files.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.

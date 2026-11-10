# Session Feedback

What an agent does once, when every task the user gave it is complete: review
the whole session for problems in QFAI itself, and ask the user whether to
report them. Separately, it proposes where the project could keep a correction
the user had to give twice.

An agent in a session notices what a maintainer cannot see from outside: a rule
that contradicted another, a gate that stopped correct work, a step that cost an
hour for a small result. The notice ends with the session unless something
carries it out. This rule carries it to the QFAI repository, at the moment the
agent holds the most evidence, and only with the user's agreement.

## Scope

| Target                                                                    | Applies                                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| The end of the turn after which no task the user gave is left             | Reviewed                                                            |
| A pause: a question, an approval, a phase boundary, a halt, a next action | Not reviewed                                                        |
| A defect in the adopter's own project                                     | Outside this rule                                                   |
| A correction the user gave twice in the session                           | Proposed for the project, written on a yes                          |
| A problem in QFAI's rules, skills, steps, commands, hooks or documents    | Reported once the user agrees                                       |
| A run under a no-question mode                                            | Drafts and proposals go in the final report, never filed or written |

## 1. When the review runs

Only when both hold, judged from the whole session:

1. Every task the user gave is complete, in every stage the plan chose.
2. Nothing waits on the user: no question, approval or choice is open.

A turn that ends with a question, a plan awaiting approval or a list of next
actions is a pause. So is the end of one stage of several. If the user's next
answer would start more work, the work is not complete.

The end of the run triggers the review: `qfai-run`'s final report, when it
closes the user's last task and nothing waits on the user, has the agent follow
this rule once, after the report. No hook triggers it, so an ordinary end of a
turn costs nothing. When the work is not complete, or the review already ran
after the user's latest instruction, the agent does not run it. In doubt, the
work is not complete.

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

Where the drafts are more than the tool's option limit, put them as one sort
with the columns `file` and `skip`, as `reply-forms.md` sets out. Every draft
left in `skip` is not filed. A draft the reply does not place is not filed
and is not put again.

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

Nothing is asked and nothing is filed or written. The drafts and the proposals
of § 7 go in the final report, and the report says they were not filed or
written.

## 7. Corrections to keep in the project

A second output, separate from the issues above: it concerns the adopter's own
project and never goes to QFAI. It runs at the same moment as the review (§ 1).

List each correction the user gave twice in the session: a convention, a
command or a preference the agent missed and the user had to state again. For
each, propose one place in the project to record it:

| What the user repeated                                 | Where to propose it                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| A convention, corrected twice                          | The `## Project rules` section of `AGENTS.md`, or a rule scoped to the paths it governs if the host has them |
| A procedure, pasted three times                        | A skill                                                                                                      |
| Something that has to happen every time, with no lapse | A hook                                                                                                       |

- A correction given once proposes nothing, and neither does a procedure pasted
  fewer than three times.
- Read the project's entry file, rules, skills and hooks first. Where an
  equivalent already exists, propose nothing for it.
- Each proposal names the correction, the place, and the text or the setting it
  would add.
- Write nothing without the user's yes. Ask as § 4 does, as a question of its
  own: one option for each proposal, more than one may be chosen, and choosing
  none writes nothing. Write only what the user chose.
- When no correction qualifies, this output is left out.

## Related

- The form of the question: `user-questions.md`
- Why filing needs an answer: `action-reversibility.md`
- The writing standard for a draft: `documentation-clarity.md`
- Where the scratch file goes: `temporary-files.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.

# User Questions

The form every question to the user arrives in.

This rule does not decide how many questions to ask, or whether a question is
worth asking. It decides only what a question looks like when it is put.

## Scope

| Target                                      | Applies                                     |
| ------------------------------------------- | ------------------------------------------- |
| Any question put to the user                | Always                                      |
| The tool is callable in this invocation     | The tool, every time                        |
| The tool is not callable in this invocation | The fallback below, carrying the same parts |
| How many questions to ask                   | Outside this rule — see § 6                 |

**Callable, not present.** A host may carry a structured-question capability
that this invocation cannot use — a mode that offers no structured tool, a
permission that was not granted. That is the fallback's case, not a violation.
Judge availability at the moment the question is asked, never from what the host
supports in general.

**A mode that asks nothing is a different case.** Where the invocation is
forbidden to ask at all — `--auto` is the one QFAI ships — there is no question
whose availability this rule could judge. It is silenced, and the run proceeds
on a recorded assumption or stops. Reading it as an unavailability would send it
to the fallback and ask in plain text what the mode forbids asking.

**Callable for this question, not in general.** A tool that cannot carry the
answer's shape is not callable for that question either. The common case is a
question that permits several answers put to a tool whose options are mutually
exclusive: forcing it through loses the constraint, and the answer that comes
back means something narrower than what was asked. Use the fallback for that
question and say which part the tool could not carry. Do not decompose it into
one yes-or-no per option — that spends a question item per option and asks the
user to hold the set in their head, which is what a single question with a
stated constraint exists to avoid.

## 1. No exceptions

Every question to the user goes through the host's structured question tool
where it is callable, and through § 5's fallback where it is not. No question
reaches the user as a bare paragraph: whichever path carries it, it arrives with
its parts.

| The question   | Its parts                                                               |
| -------------- | ----------------------------------------------------------------------- |
| Offers choices | What is being asked, what each choice means, and how many may be chosen |
| Is open        | What is being asked, and what depends on the answer                     |

That is not the same as "always a list of choices", and it is not the same as
"a scalar answer is open" either. **What decides is whether a listable set of
candidates exists**, not what type the value has: one deployment count out of
the four the platform supports is a choice, and a release name nobody has picked
is open. § 2 sends the open one down the tool's free-text path and § 5 carries
the same distinction.

**Finite is not the same as listable.** A port between 1 and 65535 has a bounded
set of valid values and is still an open answer, because 65535 options is not a
choice — it is the question made unreadable. The set has to be one the question
can put in front of someone. Where it is not, ask for the value and say what
makes one valid.

There is no class of question light enough to skip it. A yes-or-no, a
confirmation, a "just checking" — each is a question, and each goes through the
same path.

The reason is what an exception is used for. An agent looking for one is an agent
that would rather not ask, and the question it skips is the one it was least sure
of. Exactly the question the user most needed to see.

### A set presented as one

Some questions are put as a unit — a grilling round is the case this repository
has — and the unit is the point: the user sees what is being decided together,
and answers it as one thing.

**Availability is then judged for the unit.** A tool that cannot carry one
member cannot carry the unit, so the whole of it takes § 5's fallback. Judged
per member instead, the unit arrives split across two carriers, and what the
unit was for is gone.

Each question inside it still arrives in the shape its own answer has. The unit
decides the carrier; it never flattens two shapes into one.

## 2. Choices, not free text

Each option carries two things: a short label, and a description saying what
choosing it means.

The description is the work. A label alone asks the user to infer the
consequence, and inferring it is the reasoning the agent already did and did not
write down.

Where the answer is genuinely open — no listable set of candidates to choose from —
the tool's own free-text path covers it. That is a different answer shape, not an
exception to this rule. A name, a number or a sentence is usually of that kind and
is not of that kind by type: where the value has to be one of a known few, the set
is what the user needs to see, and free text loses it.

## 3. Recommend

Where one option is the better answer on the evidence, say so, and say why.

A recommendation lets the user agree in one word. Without it they have to
reconstruct the agent's reasoning from the options, which is slower and arrives
at a worse answer, because the agent had the evidence and they do not.

Where no option is better, say that too. A recommendation invented to look
decisive is worse than none.

Some hosts require a recommended option and give no way to present an unranked
choice. There, put first the option that is cheapest to reverse, and say in its
description that the choice is close and why. The host's shape is satisfied and
the user is not told a preference the evidence does not support. Never resolve
the conflict the other way: an invented recommendation is the failure this
clause exists to prevent, and the host's formatting requirement does not
outrank it.

**That workaround is for decisions.** A question asking for a fact has no option
that is cheaper to reverse, because nothing is being reversed: the value is
whatever it is, and none of the candidates may be recommended. A host requiring
a recommendation therefore cannot carry that question, in the sense the Scope
section gives: not callable for this question. It takes § 5's fallback, with the
candidates kept as numbered choices.

## 4. More questions than the host takes at once

Read the limit off the tool, and split the set into consecutive calls of at most
that many. Do not hard-code a number: the capacity differs per host, and a rule
that names one is unfollowable on a host that takes fewer.

**The batches are sequential, not simultaneous.** A structured-question call
blocks until it is answered, so the second batch is issued after the first is
answered. Three things follow, and they are the whole of what a split has to
respect.

1. **The set is fixed before the first call.** It does not grow as answers
   arrive, and this rule adds nothing to it. Where a budget bounded the set, it
   bounded it before the split, so splitting is never a way to ask past a cap.
2. **Read each batch's answers for a stop before issuing the next.** A `stop`
   ends the asking there, and the questions not yet put are reported as
   unasked. Issuing the next batch after that is the agent overriding the user.
   A `proceed` or `done` ends the asking too, and the clarifications not yet
   put are recorded as assumed, labelled as such. **Only the clarifications.** A
   question the set still holds whose subject is a decision some document
   requires the user to record, or an input declared undefaultable, is asked
   anyway — closing the questions waives the agent's own uncertainty, never an
   authorization the user has not given. Where the closure leaves nothing but
   those, they are still put; where a no-question mode forbids putting them, the
   run stops and names them.
3. **No answer is acted on until the set is exhausted or a stop ends it.**
   Ordering is preserved and nothing is deferred to a later exchange. What the
   split cannot do is show a set larger than the host's capacity in one view, so
   where another rule asks for a whole set to be visible at once, a host-limited
   split satisfies it to the host's capacity and no further.

## 5. When the tool is not callable

Fall back to plain text **in the shape the answer has**.

Where there are choices, that is a numbered list keeping every part the tool
would have carried: the label, the description of what each choice means, the
recommendation **where one is permitted**, and **how many options may be
chosen**.

The qualifier is not a loophole; it is the one case § 3 creates. A question
asking for a fact carries no recommendation at all, and a fact with listable
candidates arrives here precisely because the host demanded one. Carrying the
list without a recommendation is the compliant answer; inventing one to fill the
slot is the failure the whole clause exists to prevent.

Where the answer is open — no listable set of candidates — it is a plain request
for the value, naming what depends on it. Inventing two options so an open
answer fits a numbered list is the guess § 3 refuses, wearing the fallback's
shape.

The selection constraint is the part most easily lost and the one that changes
the answer. "Pick one" and "pick all that apply" are different questions, and a
numbered list alone does not say which was asked.

Say why the tool was not callable. Otherwise the fallback reads as a choice the
agent made about how to ask, and the next reader cannot tell a limitation from a
preference.

## 6. What this rule is not

- Not a question budget. How many questions are worth asking is a separate
  subject, and the two are independent: one bounds the count, this bounds the
  form.
- Not a reason to ask more. A question that should not be asked is not improved
  by being well shaped.
- Not a licence to ask for what the environment can settle. A fact the agent can
  read is the agent's to read.

## Related

- Which questions to ask, and in what order: `grilling.md`
- Writing standard for the labels and descriptions: `documentation-clarity.md`

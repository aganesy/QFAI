# User Questions

The form every question to the user arrives in.

This rule does not decide how many questions to ask, or whether a question is
worth asking. It decides only what a question looks like when it is put.

## Scope

| Target                                 | Applies                                  |
| -------------------------------------- | ---------------------------------------- |
| Any question put to the user           | Always                                   |
| A host with a structured-question tool | The tool, every time                     |
| A host without one                     | The fallback below, with the same shape  |
| How many questions to ask              | Outside this rule — see the budget below |

## 1. No exceptions

Every question to the user goes through the host's structured question tool.

There is no class of question light enough to skip it. A yes-or-no, a
confirmation, a "just checking" — each is a question, and each goes through the
same path.

The reason is what an exception is used for. An agent looking for one is an agent
that would rather not ask, and the question it skips is the one it was least sure
of. Exactly the question the user most needed to see.

## 2. Choices, not free text

Each option carries two things: a short label, and a description saying what
choosing it means.

The description is the work. A label alone asks the user to infer the
consequence, and inferring it is the reasoning the agent already did and did not
write down.

Where the answer is genuinely open — a name, a number, a sentence — the tool's
own free-text path covers it. That is a different answer shape, not an exception
to this rule.

## 3. Recommend

Where one option is the better answer on the evidence, say so, and say why.

A recommendation lets the user agree in one word. Without it they have to
reconstruct the agent's reasoning from the options, which is slower and arrives
at a worse answer, because the agent had the evidence and they do not.

Where no option is better, say that too. A recommendation invented to look
decisive is worse than none.

## 4. More than four questions

Split them across consecutive calls, until the set is exhausted.

The split is presentation only. It does not reorder the questions, and it does
not defer any of them to a later exchange — every question in the set is asked
before the agent acts on any answer.

The set is whatever the agent was already entitled to ask, and this rule does not
add to it. Where a budget bounded the set, it bounded it before the split;
splitting is a way to present a set the host cannot show at once, never a way to
ask past a cap.

## 5. A host without the tool

Fall back to numbered plain-text choices, keeping everything above: the label,
the description of what each choice means, and the recommendation.

Say why the tool was unavailable. Otherwise the fallback reads as a choice the
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

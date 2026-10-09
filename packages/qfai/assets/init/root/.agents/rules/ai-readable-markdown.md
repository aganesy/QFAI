# AI-Readable Markdown

How a Markdown file that an AI agent reads as instructions is sized and split.

An agent follows fewer instructions as its context grows, and it follows those
in the middle of a long file worst. A loaded file also stays loaded: every line
is paid for again on every turn. So the aim is a small, relevant context for
each task, not merely short files.

## Scope

| Target                                                            | Applies                                           |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| Skills, references, templates, rules, agent cards and entry files | Always                                            |
| Any other Markdown file an agent reads to decide what to do       | Always                                            |
| Markdown written for people only, such as a changelog             | Outside this rule                                 |
| How the text in a file is written                                 | Outside this rule; see `documentation-clarity.md` |

## 1. Size limits

- Every Markdown file an agent reads stays at or under **500 lines**.
- A `SKILL.md` body stays at or under **20,000 characters**.

The body excludes YAML frontmatter; a character is one Unicode code point.

A file near a limit is a signal to move a section out, not to pack more onto
each line.

## 2. Budget what a task loads

Splitting helps only when the pieces are loaded on demand. A piece that is
always read together with another saves nothing: the task still loads both, and
now pays for the pointer as well.

So the budget is what a task loads, not the size of one file. It is the entry
file, plus every file the task reads because a pointer sent it there. Two files
that are always read together are one file.

## 3. Every pointer says when

Every pointer to another file says when to read it, when not to, and what it
holds.

> Read `references/api-errors.md` when the API returns a status other than 200.
> It lists each error code and what to do about it. Not needed after a
> successful call.

A generic "see `references/`" does not count. An agent that cannot tell whether
it needs a file either skips it or reads every file, and both defeat the split.

## 4. One level deep

The entry file names every reference directly. A reference does not point to
another reference.

An agent tends to preview a file it reached through another one, rather than
read it whole, and misses what the preview did not show. Where two references
need each other, point the entry file at both, or merge them.

## 5. A long reference opens with its contents

A reference file over 100 lines opens with a `## Contents` section: a list of
its `##` headings, in order.

A preview, a truncated read and a context that was compacted all keep the head
of a file. The list lets the agent see what the rest holds from there.

## 6. What stays in the entry file

An obligation whose trigger the agent cannot judge for itself stays in the entry
file.

Move a section out only when the task itself shows the agent it needs it: it is
writing that file, it hit that error, it reached that step. A rule that applies
before the agent can know it applies — a trap, a stop condition, an input that
must never be assumed — is read in the entry file or not at all.

## 7. One home per rule

Each rule is written in one place, and every other file references it.

Two copies diverge over time. When they contradict each other, an agent picks one of
them, and nothing says which.

## Held by

Review, and any check a project adds for itself. `npx qfai doctor` reports a
Markdown assistant asset over the line limit in § 1.

## Related

- Writing standard for the text itself: `documentation-clarity.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.

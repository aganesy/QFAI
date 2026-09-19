# API Budget

Which surface answers a question about the repository's hosted side, and how
often it is asked.

An API allowance is a shared resource with no reservation system. It belongs to
the account, so every session, sub-agent and background task draws on the same
pool at the same time, and none of them can see what the others have spent. One
agent that asks the expensive way stops the rest: once the allowance is gone,
every later call in every session returns a refusal until the window resets.

## Scope

| Target                                       | Applies                                   |
| -------------------------------------------- | ----------------------------------------- |
| A call to the forge's API                    | Always                                    |
| A question the local clone can answer        | Asked of git, never of the API            |
| A payload already saved from an earlier call | Read from disk                            |
| How many calls a task needs                  | Outside this rule — the task decides that |

## 1. Ask the cheapest surface that can answer

In this order, and stop at the first that answers.

1. **git.** Whether a branch merged, what it points at, how far behind it is,
   what a commit says. The clone already holds all of it and a read costs
   nothing.
2. **REST.** One call, one resource, one unit of the allowance. Predictable.
3. **GraphQL.** A separate allowance, counted in points rather than calls, and
   one query can spend a lot of them.

Most questions can be answered on more than one of these, which is why the order
matters. Reaching for the convenient command rather than the cheap one is how an
allowance goes: several of the forge's own subcommands take the GraphQL path
where an equivalent REST path exists.

## 2. One call for the set, not one per member

A question about several branches, pull requests or runs is one request with a
filter, not one request per item. A listing endpoint returns the whole set, and
asking it once costs what asking about a single item costs.

Three branches polled separately spend three times what the answer needs, and
the multiplier grows with the work rather than staying put.

## 3. Save a payload once and read it locally

A log, a diff or a listing that will be searched more than once is written to
disk on the first call. Every search after that reads the file.

A second `grep` is not a second download. Where a saved payload goes is settled
by `temporary-files.md`.

## 4. Poll no faster than the thing changes

The interval follows the subject. A job that takes ten minutes has nothing new
to say after two, so asking is a call spent to learn what the last answer
already said.

Where the subject's duration is unknown, ask once, wait, and widen the gap as
the wait grows.

## 5. `rate_limit` is not the budget

A dedicated rate-limit endpoint can report a stale or wrong figure. One has
answered `0` calls used against a token that a real endpoint reported, minutes
later, as most of the way through its allowance. An agent that trusts the
endpoint reads reassurance and keeps spending.

The instrument is the response to a call that was going to be made anyway.
Every response carries the remaining count, the reset time and the name of the
allowance it was drawn from — and that last one is what says which allowance a
refusal came from, where REST and GraphQL are counted separately.

## The command, where there is one

The cheap path holds only if it is the default. A repository that gives the
recurring questions one command gets that; one where each agent reassembles the
calls gets the habits above again.

The QFAI repository's own command is `scripts/gh-budget.mjs`: the CI state of
every branch from one call, and a job log saved once. A project with no
equivalent composes its calls by hand under the rules above, and a project that
writes one names it here.

## The reminder

`.claude/settings.json` puts this rule in front of the agent before a shell
command, through a `PreToolUse` hook matching `Bash`.

`documentation-clarity.md` keeps its own hook off the shell, and that decision
stands: a matcher on the tool name alone fires on every compound command, and a
reminder about writing would arrive in front of work that has nothing to do with
it. This hook takes the same matcher and then reads the command, printing only
where the command mentions the forge's CLI or its API host. The filter is in the
program rather than in the matcher, which is the whole of the difference.

It reminds and never blocks. It runs `node` directly, with no shell and no
network, and prints one message from `.agents/rules/reminders.json`. Input it
does not recognise prints nothing, as do a missing and an unreadable message
file, so it cannot fail the session it is attached to.

## Related

- Why the shell is outside that rule's own hook: `documentation-clarity.md`
- Where a saved payload goes: `temporary-files.md`
- Reusing what the repository already has before writing its equivalent:
  `minimal-implementation.md`

## Scope of this file

This is the master copy for every AI coding agent in this repository.
Tool-specific instruction files point here instead of restating it. Edit this
file when the rule changes.

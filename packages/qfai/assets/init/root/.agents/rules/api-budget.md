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
allowance runs out: several of the forge's own subcommands take the GraphQL path
where an equivalent REST path exists.

## 2. One call for the set, not one per member

A question about several branches, pull requests or runs is one request with a
filter, not one request per item. A listing endpoint returns the whole set, and
asking it once costs what asking about a single item costs.

Three branches polled separately spend three times what the answer needs, and
the multiplier grows with the work rather than staying put.

### A first snapshot of two pull requests

When git and a REST listing cannot answer the combined CI and review question,
use aliases and a common fragment. Supply the repository owner, name and two
pull-request numbers as variables. This query reads the first pages only.

```graphql
query PullRequestSnapshot($owner: String!, $name: String!, $firstPR: Int!, $secondPR: Int!) {
  repository(owner: $owner, name: $name) {
    first: pullRequest(number: $firstPR) {
      ...PullRequestState
    }
    second: pullRequest(number: $secondPR) {
      ...PullRequestState
    }
  }
}

fragment PullRequestState on PullRequest {
  id
  number
  headRefOid
  state
  mergeable
  commits(last: 1) {
    nodes {
      commit {
        id
        oid
        statusCheckRollup {
          id
          state
          contexts(first: 50, after: null) {
            nodes {
              __typename
              ... on CheckRun {
                id
                name
                status
                conclusion
                detailsUrl
                completedAt
              }
              ... on StatusContext {
                id
                context
                state
                targetUrl
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
  reviewThreads(first: 50, after: null) {
    nodes {
      id
      isResolved
      isOutdated
      comments(first: 20, after: null) {
        nodes {
          id
          body
          author {
            login
          }
          createdAt
          updatedAt
          url
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
  reviews(first: 50, after: null) {
    nodes {
      id
      state
      body
      author {
        login
      }
      submittedAt
      commit {
        oid
      }
      url
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
  comments(first: 50, after: null) {
    nodes {
      id
      body
      author {
        login
      }
      createdAt
      updatedAt
      url
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

- Keep a separate cursor for each PR's contexts, threads, reviews and comments,
  and for each thread's comments. While `hasNextPage` is true, fetch that
  connection with its own `endCursor` as `after`, retaining earlier pages.
  Batch independent next-page requests with distinct aliases and variables;
  never reuse one connection's cursor for another.
- `commits(last: 1)` selects the head evidence, not the full commit history.
  Its commit `oid` must equal that PR's `headRefOid`. Earlier commits indicated
  by `hasPreviousPage` need not be fetched for this head check.
- Require every page of the status and review connections before claiming
  coverage. API errors, null PRs or required evidence, missing heads, or an OID
  mismatch leave the snapshot incomplete. A null rollup does not prove CI passed.
  If the head changes during pagination, discard that head's coverage and
  collect a new snapshot. Apply the project's completion and merge rules only
  to complete evidence for the current head.

GitHub's [pull-request fields](https://docs.github.com/en/graphql/reference/pulls),
[commit status fields](https://docs.github.com/en/graphql/reference/commits) and
[pagination guide](https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api)
define the query's fields and cursors.

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

### One watcher for the task

The root agent names one API watcher for recurring hosted-state checks. The
root and all its descendants together have at most one such watcher. Other
workers read its saved payloads and request fresh snapshots from it. Save the
capture time, covered PRs and heads, pagination state and response headers with
each payload so workers can judge whether it answers their question.

Coordinate targets and timing with other known tasks using the same account;
reuse their watcher where it can cover the combined set. This does not reserve
the account or guarantee exclusive access against unknown sessions. It limits
API polling, not workers doing local work or making necessary non-polling calls.

These are operating instructions. The reminder does not elect a watcher or
enforce the limit.

## 5. `rate_limit` is not the budget

Read the budget from the response to a call that was going to be made anyway,
never a dedicated `rate_limit` probe. Record that response's resource, remaining count
and reset time. On GitHub these are `x-ratelimit-resource`,
`x-ratelimit-remaining` and `x-ratelimit-reset`; also retain `Retry-After` when
present. REST and GraphQL have separate primary allowances. Missing headers
leave the budget unknown; a saved count is not a reservation for the next call.

### Recover from an actual refusal

When a real response refuses a request because of a rate limit, stop calls to
the affected resource and tell the watcher and known account-sharing tasks.
A successful HTTP status with a rate-limit error in the body is also a refusal.
Wait for `Retry-After` and any applicable reset time. For a secondary limit
with neither delay nor an exhausted primary allowance, wait at least one minute.

After the wait, make one real request already needed for the work. Resume that
resource only when the request succeeds and its own headers show available
budget. If it is refused again or the headers are missing, keep it stopped;
do not run a retry loop or a `rate_limit` probe. Continue work that needs no
call to that resource. GitHub's
[rate-limit guidance](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
describes the refusal signals and wait headers.

## The command, where there is one

The cheap path holds only if it is the default. A repository that gives the
recurring questions one command gets that; one where each agent reassembles the
calls gets the habits above again.

A useful command answers two questions: the CI state of every branch from one
call, and a job log saved once. A project with no equivalent composes its calls
by hand under the rules above, and a project that writes one names it here.

## The reminder

`.claude/settings.json` and `.codex/hooks.json` put this rule in front of the
agent before a shell command, through a `PreToolUse` hook matching `Bash`.

`documentation-clarity.md` keeps its own hook off the shell, and that decision
stands: a matcher on the tool name alone fires on every compound command, and a
reminder about writing would arrive in front of work that has nothing to do with
it. This hook takes the same matcher and then reads the command, printing only
where the command mentions the forge's CLI or its API host. The filter is in the
program rather than in the matcher, which is the whole of the difference.

It reminds and never blocks. Claude Code runs `node` directly, with no shell and
no network. Codex runs the same filter as one command line, the same under
every shell, whose program finds the message file by looking upward from where
it runs, once the project's hooks are trusted. Either way it
prints one message from `.agents/rules/reminders.json`. Input it
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

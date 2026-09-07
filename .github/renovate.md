# Renovate

Dependency updates arrive as pull requests, opened weekly by this repository's own workflow.

- **What runs it:** `.github/workflows/renovate.yml`
- **What it does:** `.github/renovate.json5`

## The one thing a human has to do

The workflow needs a `RENOVATE_TOKEN` secret, and **nothing in this repository can create it**.
Until it exists, the scheduled run fails on its first step with a message saying so — deliberately,
because a green run that opened no pull request is indistinguishable from one with nothing to
update.

1. Create a fine-grained personal access token at
   <https://github.com/settings/personal-access-tokens/new>, scoped to this repository only, with:
   - **Contents:** read and write — Renovate pushes update branches
   - **Pull requests:** read and write — Renovate opens and updates the pull requests
   - **Issues:** read and write — only if the dependency dashboard is wanted (it is on by default)
2. Add it at **Settings → Secrets and variables → Actions → New repository secret**, named
   `RENOVATE_TOKEN`.
3. Run the workflow once from **Actions → Renovate → Run workflow** with **Resolve every update and
   open nothing** ticked. That resolves everything and opens nothing, so the log shows what the
   first real run would do before it does it.

### Why not the job token

`GITHUB_TOKEN` would be simpler and is wrong here for a reason that costs nothing to state: GitHub
raises no workflow events for anything done with it. A pull request it opened would sit there with
no checks running, and a re-pin commit it pushed would not restart them — an update whose checks
never started is worse than no update, because it reads as reviewed.

`prepare-release.yml` uses a separate token for the same reason, and both workflows keep
`permissions: { contents: read }` because every write goes through the secret rather than through
the job.

### Why not the Renovate GitHub App

The App is installed at github.com and configured there. Everything else that writes to this
repository is a workflow whose actions are pinned by SHA and whose changes go through review, and
running the bot the same way keeps it inside that.

## What gets opened, and when

|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| Schedule      | Before 6am Monday, Asia/Tokyo                                                          |
| At most       | 5 open pull requests, 2 opened per hour                                                |
| Age floor     | A release must be 3 days old before it is offered                                      |
| Commit style  | `chore(deps): …`                                                                       |
| Grouping      | Every GitHub Action in one pull request, monorepo packages by monorepo                 |
| Held back     | `engines.node` and `packageManager` — listed on the dashboard, opened only when ticked |
| Not held back | Vulnerability alerts: no schedule, no age floor, opened immediately                    |

The **Dependency dashboard** issue lists everything waiting, including what is held back. It is the
place to look before assuming nothing is happening.

### The shipped workflows move with ours

`packages/qfai/assets/init/root/.github/workflows/**` is what `qfai init` writes into an adopter's
repository. Those files are grouped with this repository's own workflows rather than updated
separately, so an adopter never inherits a deprecation the maintainers already fixed for
themselves.

## The second job, and why it exists

An action bump here is not a one-line change. `.github/actions/setup/action.yml` is pinned by
sha256 in `.github/pinned-bytes.txt`; that list's digest is pinned in `ci.yml`; and that step's body
is digested into `.github/required-status-contexts.json`. Rewriting a `uses:` line and stopping
there produces a pull request that is red before anyone reads it — which is exactly what happened
when both actions had to be moved off `node20` by hand.

So the workflow also runs on pushes to `renovate/**`. That job re-runs the two re-pin scripts in
order, checks the result against the hygiene lane, and pushes the difference if there is one:

```sh
node scripts/pin-guard-bytes.mjs         # writes pinned-bytes.txt and the ci.yml step
node scripts/pin-verification-bodies.mjs # digests that step's body — must run second
node scripts/check-workflow-hygiene.mjs --root .
```

Renovate's config puts `postUpgradeTasks` in reach for this and it does not work: the action runs
Renovate inside its own container against its own clone, and `pin-verification-bodies.mjs` reads
the `yaml` parser out of `packages/qfai/node_modules`, which no install in that container created.
The job here uses the same shared setup action every other toolchain job in the tree consumes.

The re-pin commits under `renovate[bot]`, matching `gitAuthor` in the config. That is load-bearing:
Renovate stops updating a branch whose commits it does not recognise as its own, so a re-pin under
any other name would freeze the branches it had just fixed.

## When an update pull request is red

- **Only the hygiene lane is red, on an action bump.** The re-pin job either did not run or
  failed. Check the `Renovate / repin` run for that branch.
- **The re-pin job refused the branch.** It compares `scripts/` against `main` and stops if they
  differ, because it runs those programs with a write-capable token and Renovate never writes
  there. A branch that differs is not the plain dependency bump it claims to be.
- **Tests are red.** That is the update, and it is what the pull request is for.

## Renovate's own version

`renovate-version` in the workflow is pinned exactly, like every other version in this tree — the
action's own default is the floating major tag `44`, which is a different image from one week to
the next inside a job whose every action is pinned to an immutable ref.

Renovate has no built-in extractor for that input, so `customManagers` in the config teaches it to
read the line. The bot updates itself through the same review as everything else.

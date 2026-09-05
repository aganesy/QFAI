# Renovate

Dependency updates arrive as pull requests, opened weekly by this repository's own workflow — and
merged by it. **Every update type is automerged, major included, and nothing waits for a review.**
The only thing between a dependency bump and `main` is `ci-pass`.

- **What runs it:** `.github/workflows/renovate.yml`
- **What it does:** `.github/renovate.json5`
- **What other repositories can extend:** `.github/renovate-presets/` (see below)

## The two things a human has to do

### 1. The token

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

### 2. Branch protection, which is what makes automerge safe

**Branch protection on `main` must require the `ci-pass` status check.** This is not a
recommendation; it is the other half of the automerge configuration.

Renovate uses GitHub's own automerge (`platformAutomerge`), which means **GitHub** decides when the
pull request may merge, and GitHub asks branch protection. If branch protection requires no status
check, GitHub merges the pull request as soon as it is mergeable — possibly before a single lane has
started. Automerge with nothing required is not "merge when tests pass". It is "merge".

`.github/required-status-contexts.json` declares which context is expected and argues why it is
`ci-pass` rather than `build`. A repository setting cannot be read from a pull request, so nothing
here can verify the setting agrees — what the tree can do, and does, is refuse to let the automerge
declaration stand without a declared context beside it
(`packages/qfai/tests/scripts/renovateMechanism.test.ts`).

Set it at **Settings → Branches → Branch protection rules → Require status checks to pass before
merging**, and select **`ci-pass`**.

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

## What gets opened, when, and what merges it

|               |                                                                                     |
| ------------- | ----------------------------------------------------------------------------------- |
| Schedule      | Before 6am Monday, Asia/Tokyo — branch creation only                                |
| At most       | 10 open pull requests, 5 opened per hour                                            |
| Age floor     | A release must be 3 days old before it is offered                                   |
| Commit style  | `chore(deps): …`                                                                    |
| Grouping      | Every GitHub Action in one pull request, monorepo packages by monorepo              |
| Automerged    | **Everything** — patch, minor, major, digest, lockfile, `engines`, `packageManager` |
| Merge gate    | `ci-pass`, and nothing else. No review, no approval, no dashboard tick              |
| Merged when   | As soon as the checks pass — not on the next weekly run                             |
| Not held back | Vulnerability alerts: no schedule, no age floor, opened immediately                 |

Nothing is held back for approval any more. `engines.node` and `packageManager` used to sit on the
dashboard until someone ticked a box; they still get their own pull request rather than riding
inside a group, but CI decides them like everything else — the `node-floor` lane checks the declared
`engines` range, and a `packageManager` bump is executed by every job in the tree before anything
else runs.

The **Dependency dashboard** issue lists what is open and what has been detected. With nothing
waiting on a human, it is the place to look when a dependency you expected to move has not moved.

### Turning it off for one dependency

Add a `packageRules` entry with `matchPackageNames` and `automerge: false`. That is the supported
way to exempt something; editing the top-level `automerge` narrows the policy for everything and
fails the row in `renovateMechanism.test.ts` that pins it.

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

It also checks the branch still exists before pushing. Automerge is why: the pull request can be
merged and its branch deleted while the job is still computing, and `git push HEAD:refs/heads/<name>`
to a deleted branch does not fail — it recreates it, leaving an orphan branch behind every
automerged action bump. The lookup closes the ordinary case; the push is still never forced.

## When an update pull request is red

An update that goes red does **not** merge — that is the whole design — and it stays open until
somebody looks at it.

- **Only the hygiene lane is red, on an action bump.** The re-pin job either did not run or
  failed. Check the `Renovate / repin` run for that branch.
- **The re-pin job refused the branch.** It compares `scripts/` against `main` and stops if they
  differ, because it runs those programs with a write-capable token and Renovate never writes
  there. A branch that differs is not the plain dependency bump it claims to be.
- **Tests are red.** That is the update, and it is what the pull request is for.

## The presets other repositories extend

`.github/renovate-presets/` holds the policy QFAI recommends to repositories that have run
`qfai init`. They are not used by this repository — it declares no dependency on the `qfai` package,
so no Renovate run here will ever produce a `qfai` bump — and they are published from here because
that is where Renovate resolves a `github>` preset from.

| Preset                                                           | Extend it when                                     |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `github>aganesy/QFAI//.github/renovate-presets/qfai`             | Always — the safe default                          |
| `github>aganesy/QFAI//.github/renovate-presets/qfai-self-hosted` | Once `allowedCommands` permits the `qfai init` run |

Both automerge every dependency update on a green CI run. What they differ on is the `qfai` package
itself, which is the one update that is not finished when the version number changes: the package
writes an assistant tree into the adopter's repository, and only `qfai init --force` refreshes it.

Both presets ask Renovate to run that command inside the update branch via `postUpgradeTasks`, so
the regenerated tree rides in the same pull request. Whether it actually runs is an **administrator**
setting (`allowedCommands`), which self-hosted Renovate has and the hosted app does not by default —
and no config file can read it. So the base preset **fails closed**: a `qfai` bump is the one update
it does not automerge, which means a stale assistant tree can never reach the default branch
unreviewed. `qfai-self-hosted` is the same preset with that hold removed, for a Renovate that is
known to run the command.

**These paths are a public interface.** A rename breaks every adopter's Renovate run and would
report nothing here, which is why `renovateMechanism.test.ts` resolves the cross-preset reference
against the path the file actually occupies.

## Renovate's own version

`renovate-version` in the workflow is pinned exactly, like every other version in this tree — the
action's own default is the floating major tag `44`, which is a different image from one week to
the next inside a job whose every action is pinned to an immutable ref.

Renovate has no built-in extractor for that input, so `customManagers` in the config teaches it to
read the line. The bot updates itself through the same review as everything else.

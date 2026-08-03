# Release publish setup

One-time setup so `.github/workflows/release.yml` can publish `qfai` to npm.

Until both steps below are done, the `publish` job **fails on purpose** rather
than skipping — a release that silently does not publish looks identical to one
that did.

Nothing here can be done by an agent: step 1 mints a credential and step 2
changes repository settings. Both need a maintainer signed in to npm and GitHub.

---

## Prerequisites

- npm account `aganesy` — the sole maintainer of the `qfai` package
  (`npm view qfai maintainers`).
- Admin on `aganesy/QFAI`.
- 2FA on the npm account (required to mint a granular token).

---

## Step 1 — Mint an npm token and store it as `NPM_TOKEN`

### 1a. Create the token

1. Sign in at <https://www.npmjs.com/> as `aganesy`.
2. Avatar → **Access Tokens** → **Generate New Token** → **Granular Access
   Token**.
3. Fill in:

   | Field               | Value                                             |
   | ------------------- | ------------------------------------------------- |
   | Token name          | `qfai-github-actions-release`                     |
   | Expiration          | 90 days (shortest that fits your release cadence) |
   | Packages and scopes | **Only select packages** → `qfai`                 |
   | Permissions         | **Read and write**                                |
   | Organizations       | leave empty                                       |

   Select the single package rather than "All packages": this token can then
   only publish `qfai`, so a leak cannot touch anything else you own.

4. **Generate token**, then copy it. npm shows it exactly once.

> Classic Automation tokens also work, but they carry write access to every
> package on the account and do not expire. Prefer the granular token.

### 1b. Store it in the repository

```bash
gh secret set NPM_TOKEN --repo aganesy/QFAI
# paste the token at the prompt, then press Enter
```

Or: repository → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**, name `NPM_TOKEN`.

Verify (the value is never shown again, only the name):

```bash
gh secret list --repo aganesy/QFAI
# expect: NPM_TOKEN   Updated YYYY-MM-DD
```

---

## Step 2 — Create the `release` environment with a required reviewer

This is the approval gate. The workflow **refuses to publish** against an
environment with no required reviewers, because without one a tag push would
upload to npm unattended — and `RELEASE.md` treats tagging and publishing as
separate decisions.

Use the UI; the API cannot attach reviewers in a single call reliably.

1. Repository → **Settings** → **Environments** → **New environment**.
2. Name it exactly `release` (lowercase).
3. Under **Deployment protection rules**, tick **Required reviewers** and add
   yourself (`aganesy`). Save.
4. Optional but recommended — **Deployment branches and tags** →
   **Selected branches and tags** → add rule `v*`. The publish job then cannot
   run from a branch at all, only from a release tag.

Verify:

```bash
gh api repos/aganesy/QFAI/environments/release \
  --jq '[.protection_rules[].type] | join(",")'
# expect the output to contain: required_reviewers
```

---

## Step 3 — Publish 1.10.0

`v1.10.0` is already tagged and its GitHub Release exists; only the npm upload
is outstanding.

**The tag cannot be reused for this.** A tag-triggered run uses the workflow
file _as it existed at that tag_, and `v1.10.0` predates the change that lets
`publish` run on a push. Dispatch it instead — a dispatch uses the workflow file
from the ref you dispatch on:

```bash
gh workflow run release.yml --repo aganesy/QFAI --ref main -f tag=v1.10.0
```

Then:

1. `gh run list --workflow=release.yml --limit 1` — find the run.
2. Wait for `verify` and `gate` to pass (~3 min).
3. GitHub sends a deployment approval request. Approve it in the run page's
   **Review deployments** box, or:

   ```bash
   gh api repos/aganesy/QFAI/actions/runs/<RUN_ID>/pending_deployments \
     -f state=approved -f comment='publish 1.10.0'
   ```

4. Confirm:

   ```bash
   npm view qfai version        # expect 1.10.0
   npm view qfai dist-tags      # expect latest: 1.10.0
   ```

---

## From 1.11.0 onward

Pushing the tag is the whole release:

```bash
git tag -a v1.11.0 -m "qfai 1.11.0 — <summary>"
git push origin v1.11.0
```

`verify` → `gate` → GitHub Release run automatically, then `publish` waits for
your approval before uploading.

---

## What the publish job checks before uploading

| Check                       | Why                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| tag = `package.json`        | A tag naming a version the tree does not carry ships as the wrong version, silently.                                         |
| CHANGELOG heading exists    | Matched literally, not as a regex — `1.10.0` as a regex matches `1x10x0`.                                                    |
| tag is on `main`            | A tag can be pushed onto any commit; without this, code that never passed review reaches npm.                                |
| `pnpm ci:gate` on the tag   | A tag can point at a commit that never passed CI, so the gate re-runs on the tagged tree rather than trusting the merge run. |
| leakage scan on the tarball | `prepack` rebuilds `dist/` during pack, so the scan runs on the unpacked tarball — byte-for-byte what npm receives.          |
| version not already on npm  | npm refuses to overwrite a version; a re-run skips cleanly instead of failing with `EPUBLISHCONFLICT`.                       |

---

## Troubleshooting

**`NPM_TOKEN is not configured`** — step 1b did not take. Re-check
`gh secret list`. Note that an _environment_ secret named `NPM_TOKEN` on
`release` also satisfies this and is slightly tighter than a repository secret.

**`the 'release' environment has no required reviewers`** — step 2 is
incomplete. The environment exists but carries no protection rule.

**`E403 Forbidden`** — the token lacks write access to `qfai`, or it expired.
Mint a new one (step 1) and `gh secret set NPM_TOKEN` again.

**`E402 Payment Required`** — `--access public` is already passed; this means
npm treated the package as private. Check the account's package settings.

**Provenance failure** — the workflow passes `--provenance`, which needs
`id-token: write` (already declared) and a public repository. On a private
repository, drop the flag.

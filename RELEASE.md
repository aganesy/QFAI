# Release procedure

## Prerequisites

The prerequisites differ by path. **The automated path exists to update what the
manual path requires to be "already updated".** If you bump the version first and
then run Prepare release, it is always rejected, because the version you enter
matches the current version.

### Common

- The target commits are all on main
- Each change has its description under `## [Unreleased]` in `CHANGELOG.md`
  (Prepare release fails if the section is empty, or holds only headings such as
  `### Added`)
- Supported: Node.js >= 20.19.0 / Tested: Node.js 20 / Recommended: Node.js 20 LTS or later

### Using the automated path

- `packages/qfai/package.json#version` and the version heading in `CHANGELOG.md`
  are **not yet updated**. Updating them is this path's job
- The repository has the `RELEASE_AUTOMATION_TOKEN` secret set (see "Required
  secret" below)
- No npm publish permission is needed. A required reviewer of the `release`
  environment approves the publish, and CI runs it through trusted publishing
  (OIDC)

### Using the manual path

- The version in `packages/qfai/package.json` and `CHANGELOG.md` are already updated
- You have npm publish permission, and `npm whoami` succeeds
- Before moving to the next major version, reconcile things with patch releases
  and proceed step by step

## Permissions and responsibilities

- Creating PRs and commits: anyone
- Merging, tagging and release work: permission holders only
- In an environment without permission, stop at creating the PR and hand merging,
  tagging and publishing over to a permission holder

## Branch and PR

- Branch naming: `feature/vX.Y.Z`
- Run CI locally before creating the PR (the commands are in the next section)
- Review completion criteria: the DoD is met and every additional finding is resolved
- A permission holder merges and tags the PR

## Automated path (recommended)

Enter the version number once, and PR creation and tagging proceed automatically.
The publish still stops at the `release` environment's required reviewer approval,
as before.

1. Run **Prepare release** in Actions and enter `X.Y.Z` (without a leading `v`) as `version`
2. Review and merge the `release/vX.Y.Z` PR it creates
3. **Tag release commit** pushes `vX.Y.Z` automatically, and `release.yml` starts
4. Approving the `release` environment runs the npm publish

### What this automation does not do

**It does not write the release text.** Whoever makes each change adds to
`## [Unreleased]` in `CHANGELOG.md` as the change lands, so the only thing decided
at release time is where to cut. Prepare release does only the following three
things and generates no prose.

- Syncs `packages/qfai/package.json#version`
- Renames `## [Unreleased]` to `## [X.Y.Z] - <date>`
  (the date is **the day you ran Prepare release**. The tag is created when the
  PR is merged, so if you merge on a later day, fix the date inside that PR.
  Fixing it after the merge needs a separate commit to `main`)
- Re-inserts an empty `## [Unreleased]`

`release.yml` extracts the same section for the GitHub Release body. In other
words, the published description is exactly what the merged PRs wrote.

The flip side: **Prepare release fails if `## [Unreleased]` is empty**. A release
note nobody wrote reads as "nothing happened", which is worse than having none.

**It does not choose the version number either.** `.agents/rules/version-discipline.md`
leaves the decision on the version number to the user, and entering it in the form
is that explicit instruction. The input is required and has no default.

### Required secret

`RELEASE_AUTOMATION_TOKEN` (`contents: write` and `pull-requests: write`). There
are two reasons.

- **A tag pushed with `GITHUB_TOKEN` does not start other workflows.** If a
  workflow token creates the tag, `release.yml` never fires and the release
  stalls silently.
- The workflows can keep `permissions:` at `contents: read`, so no more places
  depart from least privilege.

If the secret is not set, both workflows fail and say why (they never do nothing
silently).

## Procedure (manual)

Use these steps when you do not use the automation, or in an environment without
permission.

Note: run the commands below from the repository root unless stated otherwise.

1. Install dependencies

   ```sh
   pnpm install
   ```

2. Local CI (required before the PR)

   ```sh
   pnpm format:check
   node scripts/check-bidi.mjs
   pnpm lint
   pnpm check-types
   node scripts/check-build-warnings.mjs
   pnpm -C packages/qfai test
   pnpm test:assets
   node packages/qfai/dist/cli/index.mjs --help
   node packages/qfai/dist/cli/index.mjs init --dry-run
   node packages/qfai/dist/cli/index.mjs doctor --fail-on error
   pnpm verify:pack
   ```

   Run `pnpm verify:pack` from the repository root (to run it directly, use `node ./scripts/verify-pack.mjs`).

3. Package check (dry-run)

   ```sh
   cd packages/qfai
   npm publish --dry-run
   ```

   Success conditions before publishing:
   - `pnpm build` succeeds
   - `pnpm verify:pack` succeeds
   - `npm publish --dry-run` succeeds

   After the dry-run, return to the repository root (Unix/Linux: `cd ../../`, PowerShell: `Set-Location ..\\..`). Run the remaining steps from the repository root.

4. Create the tag

   ```sh
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   Example: `git tag vX.Y.Z`

5. Create the GitHub Release (quote the CHANGELOG)

6. npm publish (when needed)

   ```sh
   cd packages/qfai
   npm publish
   ```

## Final check after the release

Run it in an empty working directory (to avoid clashing with existing files).

On Unix/Linux (bash/zsh):

```sh
mkdir -p tmp/qfai-release-smoke
cd tmp/qfai-release-smoke
```

On PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path tmp/qfai-release-smoke
Set-Location tmp/qfai-release-smoke
```

```sh
npm i -D qfai
npx qfai init
# validate generates validate.json
npx qfai validate
npx qfai report --out .qfai/report/report.md
```

## Notes

- Check that you are logged in with `npm whoami`.
- With 2FA enabled, use an automation token (`NPM_TOKEN`).
- Running npm publish needs authentication such as `NPM_TOKEN`.
- `--access public` is not needed for unscoped packages (only for scoped ones).
- Always run publish under `packages/qfai`.
- `report.json` and `doctor.json` are internal representations with no compatibility guarantee. For external integration, use Markdown output such as `report.md`.

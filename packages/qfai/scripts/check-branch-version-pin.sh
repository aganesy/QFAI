#!/usr/bin/env bash
# Enforce that packages/qfai/package.json#version matches the SemVer
# encoded in the current git branch name. See
# .agents/rules/version-discipline.md.
#
# Pass conditions:
#   - branch contains a SemVer match (e.g. feature/v1.8.8) AND that
#     SemVer equals package.json#version
#   - branch contains no SemVer pattern (e.g. main, chore/deps)
#   - explicit override: VERSION_PIN_SKIP=1
#
# Fail conditions:
#   - branch contains a SemVer that does not equal package.json#version
set -euo pipefail

if [[ "${VERSION_PIN_SKIP:-0}" == "1" ]]; then
  # GitHub Actions warning so the skip surfaces in the run summary,
  # not just an easily-missed plain log line. Past incident
  # (2026-05-02 1.9.0 暴走) shows that silent skip use is risky.
  echo "::warning title=VERSION_PIN_SKIP=1::branch version pin check skipped. Justification required in PR description; see .agents/rules/version-discipline.md."
  echo "VERSION_PIN_SKIP=1: skipping branch version pin check."
  exit 0
fi

# Resolve current branch:
#   - GitHub Actions pull_request / pull_request_target: GITHUB_HEAD_REF
#     is the source branch (e.g. feature/v1.8.8), GITHUB_REF_NAME is
#     `<number>/merge` (e.g. `206/merge`) so HEAD_REF must take priority.
#   - GitHub Actions push / workflow_dispatch: GITHUB_HEAD_REF is empty,
#     GITHUB_REF_NAME is the branch name (e.g. `main`).
#   - Local invocation: fall back to `git rev-parse --abbrev-ref HEAD`.
branch="${GITHUB_HEAD_REF:-}"
if [[ -z "$branch" ]]; then branch="${GITHUB_REF_NAME:-}"; fi
if [[ -z "$branch" ]]; then branch="$(git rev-parse --abbrev-ref HEAD)"; fi

# Extract first SemVer from branch name. The leading `v` prefix is
# REQUIRED with a word-boundary delimiter so dependency-version-shaped
# branches (e.g. `feature/upgrade-eslint-9.10.0`,
# `bugfix/issue-1.2.3-typo`, `fix/log4j-2.17.1`) are not mis-pinned.
# Recommended branch naming: `<type>/v<X.Y.Z>[-<slug>]`. Pre-release /
# build metadata are out of scope; use VERSION_PIN_SKIP=1 for the rare
# coordinated pre-release flow. Mirrors
# .agents/rules/version-discipline.md.
if [[ "$branch" =~ (^|[/_-])v([0-9]+)\.([0-9]+)\.([0-9]+)($|[/_-]) ]]; then
  pinned="${BASH_REMATCH[2]}.${BASH_REMATCH[3]}.${BASH_REMATCH[4]}"
else
  echo "OK: branch '$branch' has no SemVer pin; check skipped."
  exit 0
fi

# Locate packages/qfai/package.json relative to this script. Pass the
# directory through Node's path.resolve so MSYS / Windows paths work.
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
current="$(node -e '
  const path = require("node:path");
  const pkg = require(path.resolve(process.argv[1], "..", "package.json"));
  console.log(pkg.version);
' "$script_dir")"

if [[ "$pinned" != "$current" ]]; then
  cat <<EOF >&2
ERROR: branch version pin mismatch.

  branch:               $branch
  pinned (from name):   $pinned
  package.json#version: $current

Fix one of:
  - Revert package.json#version to $pinned (no AI-driven version bumps)
  - If the bump was authorized, switch to a branch named after the new
    version (e.g. release/v$current) and obtain explicit user approval
  - Setting VERSION_PIN_SKIP=1 should be reserved for coordinated bumps
    that the user has explicitly approved (see
    .agents/rules/version-discipline.md). Otherwise fix the branch
    name or the version mismatch above.

See .agents/rules/version-discipline.md.
EOF
  exit 1
fi

echo "OK: branch '$branch' pinned to $pinned matches package.json#version."

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
  echo "VERSION_PIN_SKIP=1: skipping branch version pin check."
  exit 0
fi

# Resolve current branch (works locally and in GitHub Actions PR / push).
branch="${GITHUB_HEAD_REF:-}"
if [[ -z "$branch" ]]; then branch="${GITHUB_REF_NAME:-}"; fi
if [[ -z "$branch" ]]; then branch="$(git rev-parse --abbrev-ref HEAD)"; fi

# Extract first SemVer from branch name; tolerate optional 'v' prefix.
if [[ "$branch" =~ v?([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
  pinned="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
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
  - Set VERSION_PIN_SKIP=1 only when intentionally landing a coordinated
    bump in CI

See .agents/rules/version-discipline.md.
EOF
  exit 1
fi

echo "OK: branch '$branch' pinned to $pinned matches package.json#version."

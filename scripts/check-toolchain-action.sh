#!/usr/bin/env bash
#
# Refuse a local composite action that reaches a workflow command file — BEFORE any of them runs.
#
# Review finding [82]. Every toolchain job in `ci.yml` opens with
# `uses: ./.github/actions/setup`, and a pull request can edit that action. A step added at the top
# of it that appends `BASH_ENV=<a script that exits 0>` to the environment file makes every later
# `shell: bash` step in the job source that script and exit 0 without running its own body —
# GitHub runs `bash --noprofile --norc -eo pipefail {0}`, and neither flag stops BASH_ENV. So the
# lint job's own guards, the workflow-hygiene lane among them, report success having done nothing,
# and every other job using the same action is neutered the same way.
#
# The hygiene lane now reports that write. It cannot report it in this scenario, because it is one
# of the steps that never really runs. A check that the attack disables is not a check, so this one
# runs FIRST — after `actions/checkout` and before anything else in the job, with nothing ahead of
# it that could have set an environment file.
#
# Deliberately dependency-free: `grep` and `bash`, both on the runner image before any setup. It
# must be runnable at a point where node, pnpm and the workspace's dependencies do not exist yet.
#
# The whole tree, not the actions this workflow happens to invoke: an action reachable from any
# workflow in the repository is an action that runs in some job, and enumerating the callers here
# would be a second copy of the closure the lane already computes.
set -uo pipefail

root="${1:-.}"
actions_dir="${root}/.github/actions"

if [ ! -d "${actions_dir}" ]; then
  echo "check-toolchain-action: no ${actions_dir} — nothing to verify"
  exit 0
fi

# `-r`, not `-R`: `-R` follows symlinks during the descent, and a link inside a tree a pull request
# controls is a door out of it. `-I` skips binary files rather than printing a match for one.
#
# The names are read from a file rather than written here, for a reason worth stating: this script
# is inside the required verification's closure, and the hygiene lane refuses a step whose surface
# NAMES a command file. Spelling them in this body would make the lane report its own pre-flight as
# a writer — and evading that by splicing the names together is exactly the trick the lane exists to
# refuse. So they live in a data file, which the lane's body digest covers along with this script.
names_file="${root}/.github/command-files.txt"
if [ ! -f "${names_file}" ]; then
  echo "::error::check-toolchain-action: ${names_file} is missing, so this check knows nothing to look for."
  exit 1
fi

status=0
while IFS= read -r name; do
  case "${name}" in
    '' | '#'*) continue ;;
  esac
  if grep -rIn -e "${name}" "${actions_dir}"; then
    echo "::error::A composite action under ${actions_dir} reaches the workflow command file named above. A step that writes it sets the environment of every step after it in the job — including the guards in this job — so it is refused before any action runs."
    status=1
  fi
done <"${names_file}"

if [ "${status}" -eq 0 ]; then
  echo "check-toolchain-action: no composite action under ${actions_dir} reaches a workflow command file"
fi
exit "${status}"

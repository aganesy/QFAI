#!/usr/bin/env bash
set -euo pipefail

# Independent check lanes, started together and all awaited.
#
# The lanes below are independent: no lane reads a file another lane writes, no
# lane needs a build artifact, the formatter runs in check mode and the linter
# has no fix flag. The one lane that writes inside the repository is the shipped
# workflow shape gate, into an ignored report directory nothing else reads.
#
# The two shipped-surface gates share a lane with the document checks so that
# their runners never fork beside the mirror lane's. The package's vitest knobs
# record that forking past the core count makes a run both slower and noisier.
#
# ONE argument, the lane profile, because two aggregates run overlapping but
# unequal sets of these checks and a second copy of the wait-and-collect loop is
# the drift a single helper exists to prevent:
#
#   lint  (default)  what `pnpm ci:lint` runs on every pull request
#   gate             what `pnpm ci:gate:checks` runs at release time
#
# The release profile is not the lint profile with a filter. It leaves out the
# lanes whose home is the pull-request aggregate — the shipped-shape gate among
# them, whose whole purpose is to red a pull request rather than a release.
#
# Each lane is written out as a literal `pnpm <script>` line rather than read
# from a list, because a workflow's verification digest resolves package scripts
# by reading these invocations: a lane reached through a variable is a lane whose
# body no digest covers.
profile="${1:-lint}"

pids=()
case "${profile}" in
  lint)
    pnpm -C packages/qfai lint:mirror-surface &
    pids+=("$!")
    pnpm format:check &
    pids+=("$!")
    pnpm lint &
    pids+=("$!")
    pnpm ci:lint:structure &
    pids+=("$!")
    pnpm ci:lint:scans &
    pids+=("$!")
    ;;
  gate)
    pnpm format:check &
    pids+=("$!")
    pnpm lint &
    pids+=("$!")
    pnpm ci:gate:structure &
    pids+=("$!")
    pnpm ci:gate:scans &
    pids+=("$!")
    ;;
  *)
    printf 'unknown lane profile: %s\n' "${profile}" >&2
    exit 2
    ;;
esac

# Every child is awaited even after one has failed, so a failure in any lane
# reaches this script's exit status and the lanes after it still report.
status=0
for pid in "${pids[@]}"; do
  if ! wait "${pid}"; then
    status=1
  fi
done
exit "${status}"

#!/usr/bin/env bash
set -euo pipefail

# The lanes below are independent: no lane reads a file another lane writes, no
# lane needs a build artifact, the formatter runs in check mode and the linter
# has no fix flag. The one lane that writes inside the repository is the shipped
# workflow shape gate, into an ignored report directory nothing else reads.
#
# The two shipped-surface gates share a lane with the document checks so that
# their runners never fork beside the mirror lane's. The package's vitest knobs
# record that forking past the core count makes a run both slower and noisier.
pids=()
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

# Every child is awaited even after one has failed, so a failure in any lane
# reaches this script's exit status and the lanes after it still report.
status=0
for pid in "${pids[@]}"; do
  if ! wait "${pid}"; then
    status=1
  fi
done
exit "${status}"

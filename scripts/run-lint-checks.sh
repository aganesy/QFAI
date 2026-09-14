#!/usr/bin/env bash
set -euo pipefail

pnpm ci:lint:checks &
checks_pid=$!
pnpm -C packages/qfai lint:mirror-surface &
mirror_pid=$!

status=0
for pid in "${checks_pid}" "${mirror_pid}"; do
  if ! wait "${pid}"; then
    status=1
  fi
done
exit "${status}"

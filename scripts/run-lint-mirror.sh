#!/usr/bin/env bash
set -euo pipefail

case "${QFAI_LINT_MIRROR_SCHEDULE:-inline}" in
  inline)
    pnpm -C packages/qfai lint:mirror-surface
    ;;
  sharded)
    if [ "${GITHUB_ACTIONS:-}" != "true" ]; then
      echo "::error::Sharded mirror checks require the GitHub Actions aggregate"
      exit 1
    fi
    echo "Mirror checks execute in the required CI shard matrix"
    ;;
  *)
    echo "::error::Invalid mirror check schedule"
    exit 1
    ;;
esac

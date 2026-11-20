#!/usr/bin/env bash
set -uo pipefail

# The check lists of the four aggregate lanes, each run in order to its end.
#
# The lists used to sit inline in the root manifest as `status=0; a || status=1;
# ...; exit $status`. pnpm hands a script body to the platform shell, which on
# Windows is cmd.exe, and cmd.exe refuses the assignment before any check runs.
# Read from this file by an explicit `bash`, the same lists run the same way on
# every platform.
#
# SHIPPED-CI: not-applicable
# Because: the shipped templates run no lint aggregate, so there is no list on that side for these to move into.
#
# ONE argument, the aggregate it runs, named after the manifest entry that calls it:
#
#   lint:structure   what `pnpm ci:lint:structure` runs on every pull request
#   lint:scans       what `pnpm ci:lint:scans` runs on every pull request
#   gate:structure   what `pnpm ci:gate:structure` runs at release time
#   gate:scans       what `pnpm ci:gate:scans` runs at release time
#
# Every check runs even after one has failed, and records its failure, so one
# run names every failing check and the lane still exits non-zero.
#
# Each check is written out as a literal `pnpm <script>` or `node ./scripts/...`
# line rather than read from a list, because a workflow's verification digest
# resolves package scripts and checker files by reading these invocations: a
# check reached through a variable is a check whose body no digest covers.
aggregate="${1:-}"

status=0
case "${aggregate}" in
  lint:structure)
    pnpm lint:md || status=1
    pnpm -C packages/qfai lint:md:shipped || status=1
    pnpm lint:mermaid || status=1
    pnpm lint:mdschema || status=1
    pnpm -C packages/qfai lint:shipping || status=1
    pnpm -C packages/qfai lint:workflow-shape || status=1
    ;;
  lint:scans)
    node ./scripts/link-assistant-tree.mjs --check || status=1
    node ./scripts/sync-init-to-root.mjs --check || status=1
    node ./scripts/check-bidi.mjs || status=1
    node ./scripts/check-conflict-markers.mjs || status=1
    node ./scripts/check-register-duplicates.mjs || status=1
    node ./scripts/check-tracked-scratch.mjs || status=1
    node ./scripts/check-repository-language.mjs || status=1
    node ./scripts/check-tracked-symlinks.mjs || status=1
    node ./scripts/check-tracked-readmes.mjs || status=1
    node ./scripts/check-readme-alignment.mjs || status=1
    node ./scripts/check-instructions-size.mjs || status=1
    node ./scripts/check-instruction-links.mjs || status=1
    node ./scripts/check-shipped-ci-parity.mjs || status=1
    node ./scripts/check-route-catalog.mjs || status=1
    node ./scripts/check-changelog-released-sections.mjs || status=1
    node ./scripts/check-changelog-entries.mjs || status=1
    node ./scripts/check-doc-clarity.mjs || status=1
    node ./scripts/check-simplification-ledger.mjs || status=1
    node ./packages/qfai/scripts/check-markdownlint-config.mjs || status=1
    ;;
  gate:structure)
    pnpm lint:md || status=1
    pnpm -C packages/qfai lint:md:shipped || status=1
    pnpm lint:mermaid || status=1
    pnpm lint:mdschema || status=1
    ;;
  gate:scans)
    node ./scripts/check-bidi.mjs || status=1
    node ./scripts/check-readme-alignment.mjs || status=1
    node ./scripts/check-instructions-size.mjs || status=1
    ;;
  *)
    printf 'run-aggregate-checks: unknown aggregate: %s\n' "${aggregate}" >&2
    exit 2
    ;;
esac
exit "${status}"

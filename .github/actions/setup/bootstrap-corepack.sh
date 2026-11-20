#!/usr/bin/env bash
# Install corepack when the Node on PATH does not carry it, from pinned, verified bytes.
#
# Corepack is BUNDLED with the Node line this repository floors at, and it stopped being bundled
# from Node 25 on. A runner image whose Node is past that boundary answers `corepack enable` with
# `command not found`, so every caller runs this first. When corepack is already on PATH this
# does nothing.
#
# The one definition of the bootstrap. The toolchain action runs it before its shim and again
# before its re-shim, and the publish job in `release.yml` runs it before its first corepack
# call, reading this file from the workflow's own revision.
#
# SHIPPED-CI: not-applicable
# Because: the shipped templates enable corepack on the adopter's own Node and carry no pinned bootstrap.
set -euo pipefail

if command -v corepack > /dev/null 2>&1; then
  exit 0
fi

# PINNED — the version, the REGISTRY it comes from, and the bytes themselves.
#
# The version is pinned because an unpinned global install fetches whatever the
# registry calls latest at the moment the job runs, so the same commit installs a different
# corepack from one day to the next — inside a job whose every `uses:` is pinned to an immutable
# ref, and which then installs and verifies everything else.
#
# A version is not a source. `npm` resolves the registry from
# `NPM_CONFIG_REGISTRY` or a project `.npmrc`, both of which a pull request controls, so
# `corepack@0.35.0` from an attacker's registry is the same request answered by a different
# package — and its `corepack` bin runs on the very next line, before any verification in the
# job. `--registry` on the command line outranks both.
#
# And the bytes are checked rather than trusted: the tarball is fetched, its sha512 compared with
# the integrity this file pins, and only then installed — from the local file, with
# `--ignore-scripts`, so nothing in the package runs during installation. A registry that answers
# the pinned name and version with different content is refused here rather than executed one
# line later.
registry="https://registry.npmjs.org/"
want="sha512-9BuIGHDFE7Zieor1CeRsvt7X7AJFEuJ6OnbSbsVprq83ChDFoBh1wP98NeUS9FT3ZwlzFllPElXcz/OiDf0YGw=="
tgz="${RUNNER_TEMP:-/tmp}/corepack-0.35.0.tgz"
curl -fsSL --proto '=https' --tlsv1.2 \
  "${registry}corepack/-/corepack-0.35.0.tgz" -o "${tgz}"
got="sha512-$(openssl dgst -sha512 -binary "${tgz}" | openssl base64 -A)"
if [ "${got}" != "${want}" ]; then
  echo "::error::corepack 0.35.0 from ${registry} hashed ${got}, not the pinned ${want}. Refusing to install it."
  exit 1
fi
npm install --global --ignore-scripts \
  --registry https://registry.npmjs.org/ "${tgz}"

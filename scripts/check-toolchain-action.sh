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
# FIRST: the bytes of every local action, against the pinned list.
#
# Review finding [95]. Refusing a command-file name refuses one capability out of many: a step
# added to this action can also `printf 'process.exit(0)' > scripts/check-workflow-hygiene.mjs`,
# replacing the lane itself before it runs, or rewrite any verification source in every job that
# uses the action. Enumerating what a step may DO is the losing side of that argument; what the
# action IS can be pinned.
#
# `sha256sum -c` reads the list directly, so this needs no parser and no toolchain — and it runs
# before anything the action could have changed.
digests_file="${root}/.github/pinned-bytes.txt"
if [ ! -f "${digests_file}" ]; then
  echo "::error::check-toolchain-action: ${digests_file} is missing, so the local actions are pinned by nothing."
  exit 1
fi
if ! command -v sha256sum > /dev/null 2>&1; then
  echo "::error::check-toolchain-action: sha256sum is not on this runner, so the pinned local-action bytes cannot be verified."
  exit 1
fi
if ! (cd "${root}" && sha256sum -c --quiet "${digests_file}"); then
  echo "::error::A pinned file does not match its digest in .github/pinned-bytes.txt. These are the local composite actions and the guard programs — they run before every verification in this job, and one of them decides whether this lane reports anything at all. An edit is refused here rather than executed; if it is intended, reseal with \`node scripts/pin-guard-bytes.mjs\` and land the new digests in the same commit."
  exit 1
fi

# The tree must hold exactly what the list pins, in both directions and per ROOT.
#
# The SET of paths, not how many lines there are. Review finding [112]: comparing counts let a
# deletion and a duplicate cancel out — drop `setup/action.yml` from the list, put a benign
# action's line in twice, and `sha256sum -c` verifies the duplicate happily while both counts
# read 2. The unpinned setup action then runs, and it runs before every verification in the job.
#
# Duplicates are refused on their own too, ahead of the comparison: a list that names a path
# twice is a list somebody is doing arithmetic with, and the message should say that rather than
# leaving a set difference to be puzzled over.
for pinned_root in ".github/actions" "scripts"; do
  listed="$(grep -E "^[0-9a-f]{64}  ${pinned_root}/" "${digests_file}" | sed "s/^[0-9a-f]\{64\}  //" | sort)"
  duplicated="$(printf "%s\n" "${listed}" | uniq -d)"
  if [ -n "${duplicated}" ]; then
    echo "::error::check-toolchain-action: .github/pinned-bytes.txt names these paths more than once under ${pinned_root}: ${duplicated}. A path pinned twice is a line count being made to balance, not a file being verified."
    exit 1
  fi
  present="$(cd "${root}" && find "${pinned_root}" -type f | sed "s|^\./||" | sort)"
  if [ "${listed}" != "${present}" ]; then
    echo "::error::check-toolchain-action: the files under ${pinned_root} are not the files .github/pinned-bytes.txt pins. Pinned: ${listed}. Present: ${present}. A file the list does not name is code nobody reviewed the bytes of; a name the tree does not hold is a pin protecting nothing."
    exit 1
  fi
done

# Any manifest that runs code at install time must be one the declaration pins.
#
# Review finding [110]. `pnpm install --frozen-lockfile` runs the lifecycle hooks of every
# manifest in the workspace, and the hygiene lane compared the declaration against a FIXED list
# of manifests — so a pull request adding a package to `pnpm-workspace.yaml` with a `prepare`
# hook had it installed and run before any verification, in a manifest the lane never looked at.
#
# Refused HERE because here is before `pnpm install`. The lane checks the same allow-list against
# the declaration; this checks it against the tree, at the only moment that helps.
#
# The question is asked of the JSON, not of the line layout.
#
# Review finding [118]: the first version matched a lifecycle key at the start of a line, and a
# perfectly valid one-line manifest — `{"scripts":{"prepare":"…"}}` — matches no such pattern.
# A pull request adding that manifest to the workspace passed this refusal and had `prepare` run
# by the very next step's `pnpm install --frozen-lockfile`; a `prepare` that writes `BASH_ENV`
# into `$GITHUB_ENV` turns every guard shell after it in this job into a no-op that exits 0.
#
# `node`, then, and not the package manager. This step runs before the TOOLCHAIN is set up —
# before corepack, pnpm, or any dependency — but the runner has a Node it uses to execute every
# JavaScript action, `actions/checkout` in the step above included. If it somehow does not, that
# is reported rather than skipped: a check whose input is absent must report, never pass.
manifest_allow="${root}/.github/lifecycle-manifests.txt"
if [ ! -f "${manifest_allow}" ]; then
  echo "::error::check-toolchain-action: ${manifest_allow} is missing, so which manifests may run code at install time is decided by nothing."
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "::error::check-toolchain-action: no node on PATH, so which manifests run code at install time cannot be read. Every JavaScript action in this job needs one, so a runner without it cannot run this workflow anyway — this refuses rather than skipping, because a check that cannot read its input must not report a pass."
  exit 1
fi

# Exit 0: the manifest declares one or more hooks, and they are on stdout. Exit 1: it declares
# none. Anything else: it could not be read, which is a finding rather than a pass.
lifecycle_probe='
  const { readFileSync } = require("node:fs");
  const HOOKS = ["preinstall", "install", "postinstall", "prepare", "prepublishOnly"];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(process.argv[1], "utf8"));
  } catch {
    process.exit(2);
  }
  if (parsed === null || typeof parsed !== "object") process.exit(1);
  const scripts = parsed.scripts;
  if (scripts === null || typeof scripts !== "object") process.exit(1);
  const found = HOOKS.filter((hook) =>
    Object.prototype.hasOwnProperty.call(scripts, hook),
  );
  if (found.length === 0) process.exit(1);
  process.stdout.write(found.join(", "));
'

while IFS= read -r manifest; do
  rel="${manifest#./}"
  # `node_modules` is not ours; `tmp/` is this repository's sanctioned scratch area and is
  # gitignored, so nothing there is installed or reviewed. Both are skipped by NAME rather than by
  # asking git, because this runs before any toolchain exists.
  case "${rel}" in *node_modules* | ./tmp/* | tmp/*) continue ;; esac
  if hooks="$(node -e "${lifecycle_probe}" "${root}/${rel}")"; then
    :
  else
    probe_status=$?
    if [ "${probe_status}" -eq 1 ]; then
      continue
    fi
    echo "::error::check-toolchain-action: ${rel} is not readable as JSON, so whether it runs code at install time cannot be decided. A manifest pnpm will parse and this guard will not is the gap the guard exists to close."
    exit 1
  fi
  if grep -qxF "${rel}" "${manifest_allow}"; then
    continue
  fi
  echo "::error::check-toolchain-action: ${rel} declares the package-manager lifecycle hook(s) ${hooks} and is not listed in .github/lifecycle-manifests.txt. pnpm runs those hooks in every job before every verification; a manifest that runs code at install time is one a reviewer reads."
  exit 1
done <<EOF
$(cd "${root}" && find . -name package.json -not -path "*/node_modules/*")
EOF

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

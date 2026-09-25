# Acceptance-test RED provenance

Each BF or AC test needs evidence that its assertion can reject the wrong
behavior. Keep the record under `### <BF-ID>` or `### <AC-ID>` in
`.qfai/evidence/atdd-BF-NNNN.md`. Name the test file and selector, the exact
command, the selected-test output, the tested revision, and the manifest and
hash of the test plus fixtures or snapshots it reads. The manifest lists
paths in a stable order. A hash of the test file alone is insufficient when
its oracle depends on shared artifacts.

For each manifest entry, hash `path + NUL + kind + NUL + mode + NUL + blob hash`
in sorted path order. `kind` is `file` or `symlink`; `mode` is the six-digit
Git tree form: `120000` for a symlink, `100755` for a file `git add` would
record as executable, and `100644` for another file. Do not use the revision
manifest's full permission bits. The hash is recomputed on another checkout,
where non-execute permission bits may differ.

Read the execute bit where git reads it. Where `core.fileMode` is `false`, as
in a repository git created on Windows, take it from the index: `100755` when
`git ls-files -s` says so, and `100644` for a file git does not track.
Everywhere else, take the owner's execute bit off the disk: a `0654` file is
`100644`. Two checkouts of one commit then read the same mode on Windows and
on POSIX. Resolve and stage a merge conflict in a manifest file before
recording the hash.

## Observed RED

Run the selected test before code satisfying its predicate exists, or against
an existing surface that currently violates it. Preserve the assertion
message and location. A module-load error, missing dependency, broken fixture
or zero selected tests is not a RED observation. Have qa-gatekeeper confirm
that the failure is the specified assertion before implementation makes it
pass. Then hand the test to `/qfai-implement` and make the tree green before
opening another deliberate RED that a full-suite gate would encounter.

## Already implemented behavior

When the test passes before authoring the change, make the smallest controlled
mutation that violates the claimed rule. Run the selected test, capture its
assertion failure, restore the mutation, and rerun it on the restored tree.
Record the mutation and both results. If no safe mutation or equivalent
falsifiability argument exists, keep the obligation unresolved and route it
through the current flow's `decisions.md`; only a valid DONE exception can
discharge it. Do not call a passing test alone a RED proof.

## Freshness

A test or fixture edit after RED changes the proof subject. Recompute the
manifest and hash and retake the proof before a reviewer certifies it.
A later flow that changes a shared fixture follows
`references/shared-test-artifacts.md`. Do not overwrite the old record;
append the new attempt and identify the current one. The common revision
and review-seal rules are in
`../qfai-implement/references/evidence-revision.md` and
`../qfai-implement/references/round-evidence.md`.

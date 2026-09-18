# Temporary Files — This Repository

Read with `temporary-files.md`, which this file does not restate. Only what is
specific to this repository is here.

## A test's own sandbox is outside the rule

A directory a test creates with `mkdtemp` under `os.tmpdir()` is not a scratch
file the rule governs. It lies outside the repository, so it cannot land in any
directory rule 1 protects, and the test that created it removes it, which is
what rule 5 asks for. Keeping test input and output outside the tree also keeps
it away from file-watchers and from every guard that walks the repository.

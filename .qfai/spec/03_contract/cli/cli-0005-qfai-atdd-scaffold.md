# CLI-0005: `qfai atdd scaffold`

## Ownership boundary

This contract decides which options `qfai atdd scaffold` accepts, which acceptance tests it writes and where, and how it exits. Each test it writes carries its annotation, is not skipped, and has an empty body that passes.

What counts as a test at each layer, and the findings `qfai validate` reports on a test, are decided by the `qfai validate` contract (CLI-0014).

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0005-0001 | `qfai atdd scaffold` takes exactly one of `--story US-NNNN-NNNN` and `--flow BF-NNNN`. Neither, both, a malformed ID, or an ID the story tree does not define exits 2 and writes nothing. Exit 1 is kept for a runtime failure reading or writing a file. `--story` writes one test per AC of the story at `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>`, in the project's test dialect, carrying `QFAI:AC-NNNN-NNNN-NN`, not skipped, with an empty body that passes. | EX-0001-0073-01, EX-0001-0073-03 |
| BR-0005-0002 | Re-running `--story` or `--flow` overwrites no existing test, whether its body is empty or written, and writes nothing new for an existing target. | EX-0001-0073-05 |
| BR-0005-0003 | `--flow BF-NNNN` writes one test for the flow at `<testsDir>/e2e/<BF-ID>.test.<ext>`, in the project's test dialect, carrying `QFAI:BF-NNNN`, not skipped, with an empty body that passes. An existing file is not overwritten, and a second run writes nothing. | EX-0001-0073-04 |
| BR-0005-0004 | When the project's configured test globs select no file name a supported test dialect can write, or would not collect the skeleton's destination as a test, `qfai atdd scaffold` exits 2 before it writes any skeleton. | EX-0001-0073-06 |
| BR-0005-0005 | For a JS/TS skeleton, `qfai atdd scaffold` reads the test runner from the `package.json` files on the path from the skeleton's destination directory up to the project root, nearest first, and one that names no runner leaves the choice to the next. vitest declared in `dependencies` or `devDependencies`, or a script that runs `vitest`, keeps the vitest test. Otherwise a script that runs `node --test` writes a test that imports `describe` and `it` from `node:test`. When the deciding `package.json` declares only jest, or every `package.json` on the path names no runner, the command exits 2 before it writes any skeleton and names the supported runners. With no `package.json` on the path, the vitest test is written. A `package.json` that is not valid JSON is a runtime failure reading a file. | EX-0001-0073-08, EX-0001-0073-09, EX-0001-0073-10 |

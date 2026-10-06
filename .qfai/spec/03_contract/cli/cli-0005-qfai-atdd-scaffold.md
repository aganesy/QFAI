# CLI-0005: `qfai atdd scaffold`

## Ownership boundary

This contract decides which options `qfai atdd scaffold` accepts, which acceptance tests it writes and where, and how it exits. Each test it writes carries its annotation, is not skipped, and has an empty body that passes.

What counts as a test at each layer, and the findings `qfai validate` reports on a test, are decided by the `qfai validate` contract (CLI-0014).

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0005-0001 | `qfai atdd scaffold` takes exactly one of `--story US-NNNN-NNNN` and `--flow BF-NNNN`. Neither, both, a malformed ID, or an ID the story tree does not define exits 2 and writes nothing. `--spec` is not accepted: it exits 2 with a message naming `--story` and `--flow`. Exit 1 is kept for a runtime failure reading or writing a file. `--story` writes one test per AC of the story at `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>`, in the project's test dialect, carrying `QFAI:AC-NNNN-NNNN-NN`, not skipped, with an empty body that passes. | EX-0001-0073-01, EX-0001-0073-03 |
| BR-0005-0002 | Re-running `--story` or `--flow` overwrites no existing test, whether its body is empty or written, and writes nothing new for an existing target. | EX-0001-0073-05 |
| BR-0005-0003 | `--flow BF-NNNN` writes one test for the flow at `<testsDir>/e2e/<BF-ID>.test.<ext>`, in the project's test dialect, carrying `QFAI:BF-NNNN`, not skipped, with an empty body that passes. An existing file is not overwritten, and a second run writes nothing. | EX-0001-0073-04 |
| BR-0005-0004 | When the project's configured test globs select no file name a supported test dialect can write, or would not collect the skeleton's destination as a test, `qfai atdd scaffold` exits 2 before it writes any skeleton. | EX-0001-0073-06 |

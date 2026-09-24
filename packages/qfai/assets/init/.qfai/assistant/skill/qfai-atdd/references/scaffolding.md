# Acceptance-test scaffolding

`npx qfai atdd scaffold` accepts exactly one selector:

- `--flow BF-NNNN` creates one E2E skeleton for the flow at
  `<testsDir>/e2e/<BF-ID>.test.<ext>` with `QFAI:BF-NNNN`.
- `--story US-NNNN-NNNN` creates one integration skeleton per AC under
  `<integration-home>/<US-ID>/<AC-ID>.test.<ext>`, each with its
  `QFAI:AC-NNNN-NNNN-NN` annotation.

The configured test-file globs and exclusions determine both the extension
and whether the destination can be read by validation. The emitted path must
also be collected by the project's test runner. If no supported path satisfies
those checks, the command refuses the request rather than writing an invisible
test. Existing edited files are left intact. A previous untouched skeleton
may be replaced when its generated shape can be proved.

A skeleton marks intended coverage, not observed behavior. It remains a
`D-SCAFFOLD-PLACEHOLDER` finding until a real assertion replaces the placeholder
and the selected test runs. Record the test command and its result in the
flow's ATDD evidence file. A skipped or uncollected test never discharges
the BF or AC obligation.

`qfai.config.yaml#atdd.scaffoldEscalateCycles` sets how many consecutive
`qfai validate` runs may retain a placeholder before the finding becomes an
error. The default is 3. Set it to 0 to keep the finding a warning.

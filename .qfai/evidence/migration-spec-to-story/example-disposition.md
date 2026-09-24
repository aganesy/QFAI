# P7 examples with more than one old criterion reference

The source audit is `tmp/p7-br-review-multi-ex.csv`. These 15 old examples
have test cases referring to multiple criteria. Step 5 cannot infer a unique
criterion from those test-case links. The three retired examples
EX-0013-0001/0002/0018 are archived under the approved P7 REMOVE chain;
they must not receive active new EX IDs. For the remaining twelve, the
example text and the current criterion text determine the disposition below.
The step-4 `id-map.json` and step-6 report must verify every old-to-new
relationship and the derived criterion reference.

| Old example | Proposed target or action | Reason |
| --- | --- | --- |
| EX-0005-0004 | Retained for AC-0005-0001; new EX-0005-0018 covers AC-0005-0002 | DR-0005-0003 splits Markdown and JSON output. New EX-0005-0019..0024 cover the other report criteria and the old TC refs now cite the corresponding example. |
| EX-0006-0010 | AC-0006-0010 | The example demonstrates the installed Playwright primary probe and its order. AC-0006-0012 only covers a fresh install with no error and is not asserted by the example. |
| EX-0009-0001 | AC-0009-0002 | The example's output is proposed test globs; repository discovery and sampling are context, not the example's result. |
| EX-0009-0003 | AC-0009-0004 | The example writes evidence-derived tech steering facts. Tool-selection rationale is separate. |
| EX-0011-0001 | Retained for AC-0011-0001; new EX-0011-0017/0018/0019 cover AC-0011-0003/0006/0008 | DR-0011-0003 narrows it to the EX-first RED/GREEN/refactor cycle. Old ledger status and retired BR-0011-0002 are archived in `retired/spec-0011/legacy-ex0001.md`. TC-0011-0003/0006/0008 now cite the new examples. |
| EX-0013-0017 | Retained for AC-0013-0020; new EX-0013-0035 covers AC-0013-0021 | DR-0013-0007 separates valid active-pointer resolution from absent-pointer recovery. TC-0013-0028/0029 remain with their corresponding example. |
| EX-0014-0001 | AC-0014-0027 | SDD added the missing validation-error outcome and TC-0014-0042 now links this EX to that criterion. |
| EX-0016-0008 | AC-0016-0007 | The example's result is progressive disclosure: frontmatter now, body on task start. AC-0016-0008 concerns malformed frontmatter. |
| EX-0016-0014 | AC-0016-0012 | The example is a blocked fetch from a non-allowlisted domain. AC-0016-0020 is broader sandbox configuration. |
| EX-0017-0003 | Retained for AC-0017-0001; new EX-0017-0074 covers AC-0017-0002 | DR-0017-0023 separates failure/cancellation from the unknown-state closed-set case; TC-0017-0005 now cites the new example. |
| EX-0017-0030 | AC-0017-0039 | SDD added the unmeasured-cost-claim rejection and repointed TC-0017-0033/0035 to it. |
| EX-0017-0068 | AC-0017-0040 | SDD added the four-figure code-path pin outcome and repointed TC-0017-0086/0087 to it. |

All twelve active examples now have one criterion in source SDD. Verify the
changed TC references and the old-to-new provenance
in step 4 and step 6 reports. The new examples receive their own new IDs;
never duplicate one old EX ID into two parents. Preserve the pre-split source
in the archive and record the generated IDs after the immutable step-4 map is
created.

## Input and expected-result parsing

EX-0008-0010 was the only heading example whose old clauses had no explicit
`- Then` line. DR-0008-0004 and the corresponding `09_delta.md` UPDATE:MODIFY
replace its mixed `--spec` and story-tree clauses with explicit Given, When
and Then lines for `--story`/`--flow`. AC-0008-0011, BR-0008-0009 and
TC-0008-0014 retain their IDs and cite the current outcome. Step 4 must read
the new `Then` as the expected result and keep the AC/BF keyed three-cycle
escalation; an embedded `then` in a When or And clause is not a parsing rule.

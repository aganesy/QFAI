# Legacy source format inventory before P7

The counts below are current physical headings and first-column table rows in
each old pack. Mixed files may repeat the same ID in a catalog and a heading;
these are occurrences, not new identities. `BR plan` is the number of active
old rules assigned to contracts. A parser must preserve a heading's full body
while deduplicating an index-table reference to the same ID.

| Pack | BR headings | BR rows | EX headings | EX rows | TC headings | TC rows | BR plan |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| spec-0001 | 0 | 51 | 0 | 97 | 0 | 97 | 36 |
| spec-0002 | 0 | 4 | 0 | 5 | 0 | 5 | 4 |
| spec-0003 | 0 | 59 | 3 | 67 | 67 | 79 | 58 |
| spec-0004 | 71 | 0 | 83 | 0 | 0 | 93 | 71 |
| spec-0005 | 8 | 0 | 16 | 0 | 0 | 14 | 8 |
| spec-0006 | 0 | 22 | 1 | 28 | 26 | 36 | 22 |
| spec-0007 | 0 | 10 | 2 | 10 | 5 | 12 | 10 |
| spec-0008 | 14 | 0 | 18 | 0 | 23 | 0 | 14 |
| spec-0009 | 8 | 0 | 8 | 0 | 15 | 0 | 8 |
| spec-0010 | 0 | 9 | 0 | 10 | 0 | 10 | 9 |
| spec-0011 | 15 | 0 | 19 | 0 | 19 | 0 | 13 |
| spec-0012 | 59 | 0 | 87 | 0 | 180 | 0 | 51 |
| spec-0013 | 34 | 0 | 35 | 0 | 58 | 0 | 24 |
| spec-0014 | 12 | 0 | 13 | 0 | 0 | 15 | 12 |
| spec-0015 | 21 | 0 | 22 | 0 | 43 | 0 | 21 |
| spec-0016 | 0 | 20 | 0 | 26 | 0 | 28 | 20 |
| spec-0017 | 0 | 72 | 0 | 74 | 0 | 95 | 72 |
| spec-0018 | 0 | 60 | 0 | 82 | 0 | 82 | 60 |

`spec-0003/03_Acceptance-Criteria.md` has thirty `## AC-...` sections and
sixteen marker-only `# AC-...` Gherkin blocks (AC-0003-0001 through 0016).
The original step-4 `oldCriteria()` selected headings whenever any were
present, thereby losing all sixteen marker-only criteria. The migration
fixture must cover that mixed form as well as the BR/EX/TC forms above.

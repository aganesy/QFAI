# Place migrated stories and rules

## Contents

- Place stories and rules
- Retired configuration keys
- Contract IDs
- Business rules
- Documents in their template's shape

## Place stories and rules

The AI writes `.qfai/evidence/migration-spec-to-story/plan.yaml` before running
step 4. `plan.yaml` may be written before step 1, because only steps 4 and 7
read it and a contract is named by the path it has in the contracts directory
before step 3, which is also a key of `contract-map.json` once step 3 has run.

The plan states the decisions the scripts cannot make. `flows` says which
business flow holds each old story. `rules` says which existing contract
enforces each old business rule, or that it enforces none. The optional
`examples` list places an example whose criterion the test cases leave open.
Flow order and story order determine the new IDs.

- **`from`.** A `from` value identifies an old flow to continue; omit it for a
  new flow. It is the exact title of any H2 section of the old
  `_policies/04_Business-Flow.md`, and no other H2 of that file has the same
  title. For the unnamed opening flow, which is the text before the first
  `CHG-` heading or the whole file where it has none, use the reserved value
  `_policies/04_Business-Flow.md`. Several flows may continue the same section,
  and each takes that section's prose and diagram. If `from` is omitted, the
  script writes a template flow and reports that its diagram needs a person.
- **`criteria`.** An old criterion belongs to the story its `Parent:` line
  names or, where it has none, to the story its row of the criteria catalog
  table names in the `US Ref`, `US-Refs` or `Maps To` column. Add `criteria`
  to a story only when the criterion has no such reference, the reference
  names several stories, or the two disagree.
- **`contract`.** A contract path is relative to the configured contracts
  directory, lies under `cli/`, `api/`, `db/` or `ui/`, and names the contract
  file as it is before step 3 renames it. A Markdown file under `api/`, `db/`
  or `ui/` and a file under `design/` hold no contract, so a rule cannot be
  placed in one.
- **`binds: none` and `retire`.** A rule with no contract takes one of these
  instead of `contract`. `binds: none` is allowed only where the rule's
  `Contract-Refs` cell is `-`. `retire` takes a reason. Step 7 removes such a
  rule from its `04_Business-Rules.md`, lists it under `## Operations` with
  its old ID and, for `retire`, the reason, and gives it no new ID.
- **`examples`.** An entry names an old example ID and a `criterion`, one of
  the old criterion IDs that the `AC-Refs` of the test cases citing the example
  name. Step 4 places the example under that criterion's story, and its test
  cases enter the ID map, so that step 8 rewrites their annotations.

```yaml
flows:
  - title: Place an order
    stories:
      - id: US-0001-0001
        criteria: [AC-0001-0001]
examples:
  - id: EX-0001-0002
    criterion: AC-0001-0001
rules:
  - id: BR-0001-0001
    contract: api/orders.yaml
  - id: BR-0001-0002
    binds: none
  - id: BR-0001-0003
    retire: The payment provider enforces this limit.
```

Use IDs from the old files in this plan. Assign each old story, rule, example
and criterion at most once. A `from` value that matches no old flow or matches
several, an invalid plan, a duplicate assignment, an `examples` criterion that
none of the citing test cases names, a rule with none or more than one of
`contract`, `binds` and `retire`, or a contract path that is outside the four
contract directories or names no contract stops step 4 before writing. Check
the step-4 dry run before accepting its numbering. Step 4 writes
`.qfai/evidence/migration-spec-to-story/id-map.json` once, and later steps use
that map. Write the `examples` entries and the rule marks before step 4: once
the map exists, an `examples` entry and a mark on a rule the map holds are
refused. A mark on a rule step 4 left unplaced is still accepted while a spec
pack is left. Place any other unplaced content in the new tree through `/qfai-sdd`. While the
map exists and no spec pack is left, steps 4 and 7 read no plan, so a missing or
rewritten `plan.yaml` stops nothing.

## Retired configuration keys

Three keys of `qfai.config.yaml` no longer exist in 2.x. Each is handled by the
step named here:

| Key                                                 | What the migration does                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `validation.traceability.scMustHaveTest`            | Step 1 removes it and lists it under `## Operations`                                                       |
| `validation.traceability.unknownContractIdSeverity` | Step 1 removes it and lists it under `## Operations`                                                       |
| `prototyping.primarySpecId`                         | Step 3 replaces it with `prototyping.primaryUiContract` where exactly one UI contract is tied to that spec |

Step 1 also removes a `validation.traceability` or `validation` mapping that
the removal leaves empty. Steps 1 to 3 run although the configuration loader
reports these keys. Steps 4 to 12 refuse with exit 2 before writing, naming the
key, while `qfai.config.yaml` still holds one of the three. That refusal does
not mean an earlier step has not run.

A UI contract is tied to a spec when the contract IDs named by the
`Contract-Refs` of that spec's business rules translate, through the contract
map, to one UI contract. Step 3 lists the replacement under `## Operations`.
Where `prototyping.primaryUiContract` is already set, step 3 removes the old key
instead. Where no UI contract is tied, more than one is, or the spec pack is
gone, step 3 leaves `prototyping.primarySpecId` and lists it under
`## For a person` with its old value, and exits 3. Replace it by hand with
`prototyping.primaryUiContract: UI-NNNN` naming the contract. Steps 4 to 12 then
run.

When a step cannot load `qfai.config.yaml` for any other reason, it exits 2
before writing and prints on standard error the message of each configuration
issue, one per line.

## Contract IDs

Step 3 gives every contract file that has no 2.x contract ID one, and renames
the file to match:

| Old contract               | Declares       | New ID   | New file                   |
| -------------------------- | -------------- | -------- | -------------------------- |
| `cli/orders.md`            | nothing        | CLI-0001 | `cli/cli-0001-orders.md`   |
| `api/api-0001-orders.yaml` | `CON-API-0001` | API-0002 | `api/api-0002-orders.yaml` |
| `db/db-0001-orders.sql`    | `CON-DB-0001`  | DB-0003  | `db/db-0003-orders.sql`    |

- Numbers run across all contracts, in the order CLI, API, DB, UI, then by
  the old number, then by path. No two contracts share a number.
- The new ID replaces the old one in the file's declaration: the H1 of a
  Markdown contract, as `# CLI-0001: <title>`, and the `QFAI-CONTRACT-ID` line
  of any other. The old IDs in `-- Depends on:` and `x-qfai-depends-on` become
  the new ones, and a YAML contract keeps its `x-qfai-depends-on` list on one
  line.
- `contracts.md` becomes one index table listing every contract. The old
  index's other sections are reported for a person.
- `.qfai/evidence/migration-spec-to-story/contract-map.json` records each old
  path and old ID with the new ones, and step 4 copies it into the ID map.
- Step 7 writes the new IDs into rule statements, and step 8 changes a
  `QFAI:CON-API-0001` test annotation to `QFAI:API-0002`.

Step 3 gives no ID to a file that is not a 2.x contract, and does not write it
into the new tree:

| Old file                                     | Why it is not a contract                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A Markdown file under `api/`, `db/` or `ui/` | Those directories hold OpenAPI YAML or JSON, SQL and UI YAML contracts                                  |
| Any file under `design/`                     | The directory no longer exists: the brand belongs in the root `DESIGN.md`, a screen in a `ui/` contract |

Step 3 moves each one to
`.qfai/evidence/migration-spec-to-story/retired/contract/` under its old path,
`design/` as one directory, and lists each file under `## For a person` with
its archived copy. Rewrite what the file states in the form its row names.

The old `design/prototype-handoff.yaml` is now the `handoff` object of
`.qfai/evidence/prototyping/prototyping.json`, which `/qfai-prototyping` writes
when a loop ends with the prototype accepted. The migration does not convert
the old file into it.

Step 3 also replaces every old `CON-*` ID that the contract map translates inside
the contract files it writes, wherever it stands in the file, and lists none of
them. It writes nothing outside those files. An old ID the map cannot translate,
such as an ID no contract declared or that several declared, stays as written
and is reported for a person with its file and line, as is a UI marker in
application code.

Step 3 groups its `## For a person` items under `### Content` and
`### Identifiers`. `### Content` comes first and holds what a person rewrites
or decides. `### Identifiers` holds an item that only pairs an old ID with its
new one, such as a changed constraint ID. A group with no item is not printed.

Step 3 writes a `routing:` override into `qfai.config.yaml` only for an entry
of `agent-routing.yml` that differs from the installed default. It writes none
for an entry equal to a default or to an entry a 1.x release shipped. Step 3
lists each routing entry it does write under `## For a person`, with its name
and a warning that a routing entry copied from a 1.x manifest hides the roles
the 2.x skills declare.

## Business rules

Rules are numbered per contract, `BR-<contract number>-NNNN` from `0001` in plan
order: the first rule step 4 places in API-0002 is BR-0002-0001. Step 7 writes
each rule into its contract in the form the contract's format takes:

| Contract format | Where the rule goes                                                     |
| --------------- | ----------------------------------------------------------------------- |
| Markdown        | A row of the `## Business rules` table: BR-ID, Statement and Examples   |
| YAML or JSON    | An entry `{ id, statement, examples }` of the top-level `x-qfai-rules:` |
| SQL             | A `-- Rule BR-0002-0001: <statement>` line, then an `-- Examples:` line |

A Markdown contract without a `## Business rules` section gets one as its last
section. A rule's examples are the new IDs of the examples that cited it. A
rule written as a heading section takes the value of its `Rule` field as its
statement, and a SQL contract holds that statement on one line.

## Documents in their template's shape

Each story-tree document the steps write takes the shape of its `qfai-sdd`
template, which is the shape the document schema checks:

| Documents                                                                               | Step |
| --------------------------------------------------------------------------------------- | ---- |
| `decisions.md` and `open-questions.md` rows                                             | 2    |
| `objective.md`, `initiative.md`, `principle.md`, `glossary.md` and `constraint.md`      | 3    |
| `contracts.md` and `tech.md`                                                            | 3    |
| Markdown contracts under `cli/`                                                         | 3    |
| `business-flows.md`, `business-flow.md`, `user-stories.md` and each story's three files | 4    |
| Examples turned from test cases                                                         | 5    |

Content that does not fit that shape is listed under `## For a person`, and the
step exits 3:

- Step 3 leaves it out of the policy file, `tech.md` or CLI contract, and names the source
  file, its archived copy and, where one fits, the template section that takes
  the content once a person rewrites it.
- Step 3 also leaves as it is a policy file or `tech.md` that already exists
  and differs from what it would write.
- A constraint row keeps only its ID, Constraint and Rationale. Step 3 lists
  an Impact column, whose content belongs to the contract or `tech.md` that
  owns it, and a row that names a file, a command or a rule ID, to be rewritten
  in plain words.
- Step 3 numbers each constraint section from 01 in table order, and lists
  every ID that changed with the ID that replaces it.
- Steps 4 and 5 write a story sentence or an example cell of another form as it
  stands, for a person to rewrite.
- Step 4 lists every business flow, so that a person writes its alternate and
  exception paths.

The steps do not write these into the new tree. Each stays in its old spec-pack
file, which stays in the pack while any of its content is unplaced and then
moves to `.qfai/evidence/migration-spec-to-story/retired/<spec-id>/`:

- a spec pack's scope and source provenance;
- a story block's `Parent`, `Source` and `Flow` fields;
- a criterion's `# Parent:` line, since its directory names the story;
- a `Background:`, any scenario after a criterion's first named one, and a
  `Scenario Outline:`, each listed for a person.

Step 3 writes no structure document. It routes the old `catalog/structure.md`
section by section:

| Old content                                                                                                                                | New home                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| An entrypoint with a smoke or skeleton command                                                                                             | A `- Skeleton:` line in `tech.md`'s Standard commands |
| A layer row of an `## Architecture` or `## Architecture constraints` table of Layer, Responsibility and Depends on columns, naming no path | The `## Architecture` table of `tech.md`              |
| The `ui_paths:` globs of `## UI surface paths`                                                                                             | `uiux.surfacePaths` in `qfai.config.yaml`, if unset   |
| Anything else                                                                                                                              | `## For a person`, with the archived copy             |

Step 3 writes the moved layers in the shape of the Architecture section: a
`flowchart TD` with a node per layer and an edge per dependency, then the table
with the rows ordered from the uppermost layer down. Where the rows cannot be
ordered, because a layer depends on one that has no row or layers depend on each
other, none of them moves: the section is listed under `## For a person` with
the reason, and `tech.md` keeps the template's Architecture section.

Step 3 writes each Markdown contract under `cli/` in the shape of the CLI
contract template: its `# CLI-0001: <title>` heading, `## Ownership boundary`
and a `## Business rules` table, and nothing else.

- An old `## Ownership boundary` of one to three paragraphs that name no rule is
  kept as it stands.
- Where the old contract has none, the section holds the template's placeholder,
  and the contract is listed for a person to write it.
- The text before the first section, lines such as `Status:` or `Rule refs:`,
  and every other section are left out. Each is listed with the old file and
  its copy under `.qfai/evidence/migration-spec-to-story/retired/contract/`.

Step 7 then writes the contract's rules into that table. A rule whose statement
names another rule is written and listed for a person, because a CLI contract's
rule cites only examples.

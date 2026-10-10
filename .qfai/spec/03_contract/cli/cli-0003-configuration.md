# CLI-0003: Configuration

## Ownership boundary

This contract decides what `/qfai-configure` writes into a project and which
values of `qfai.config.yaml` a project may override: the test globs, the story
and contract roots, the routing and review-profile overrides, the workflow mode
and the paths that render a user-visible surface. It also decides how every
QFAI command reads those values.

The init contract decides the shipped default values and the file `qfai init`
writes first. `cli-0001-assistant-routing.md` decides how routing resolves at
run time, the migration contract decides how an existing spec pack moves to the
configured roots, and the workflow contract decides what each workflow mode
does.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0003-0001 | No Source/Test Modification - `/qfai-configure` MUST NOT modify tests or source code. Only `qfai.config.yaml` and the policy files are modified. - On the story tree, the write set is `qfai.config.yaml` and the four merged policy and contract files. Nothing under `.qfai/assistant/catalog/` is written. | EX-0001-0076-01, EX-0001-0077-01 |
| BR-0003-0002 | `/qfai-configure` adds exclude globs only when an observed test path needs exclusion beyond the default exclusions; it does not add redundant exclude patterns. | EX-0001-0076-04 |
| BR-0003-0003 | `/qfai-configure` writes verifiable tool, runtime and test-layout facts from the repository into the four policy/contract files. A fact with nothing in the repository to support it is written as `TBD` with what is missing named; it is not guessed. The Stack table of `tech.md` records, as one row for each test layer, the selected tool, the manifest or test files it was observed in, and why it fits that layer. Configure also documents a minimum runnable path (dev server, database, environment, and a pointer to the Standard commands) and names each step it cannot verify rather than guessing it. | EX-0001-0077-01, EX-0001-0077-02, EX-0001-0079-01, EX-0001-0079-02, EX-0001-0075-01 |
| BR-0003-0004 | Zero Match Stop - If zero test files match the proposed globs, the skill MUST stop and ask for clarification rather than proceeding silently. | EX-0001-0078-01 |
| BR-0003-0005 | Specs Directory Left to the Default - On a project on the story tree, `/qfai-configure` does not add `paths.specsDir` to a `qfai.config.yaml` that lacks it, because the configuration loader resolves an absent key to `.qfai/spec`. - An existing `paths.specsDir` is kept, whatever its value, and the loader resolves to it. - It never writes `paths.specsDir: .qfai/specs`. - The key and its default are stated in `cli-0009-qfai-init.md`. | EX-0001-0076-02, EX-0001-0076-08 |
| BR-0003-0006 | Overrides Written Only for What the User Changes - With the `rule/ skill/ agent/ prompt/` assistant tree, the routing and review-profile defaults are built into the package. `/qfai-configure` records a project's changes to them in `qfai.config.yaml` as overrides. - It writes an override only for a skill whose agent assignment, or a review profile whose settings, the user asked to change. - An override is the whole entry, keyed the way the default is keyed: a routing entry by its skill, a review profile by its name. - A default the user did not change is not copied into `qfai.config.yaml`. - It writes no routing file and no review-profile file into the project. - The override keys are stated in `cli-0009-qfai-init.md`. | EX-0001-0076-03 |
| BR-0003-0007 | Each Fact Stated Once in the Four Merged Files - On the story tree, `/qfai-configure` writes each fact into exactly one of four files: `<paths.specsDir>/01_policy/objective.md`, `<paths.specsDir>/01_policy/initiative.md`, `<paths.specsDir>/01_policy/principle.md` and `<paths.contractsDir>/tech.md`. - The paths that render a user-visible surface go to `uiux.surfacePaths` in `qfai.config.yaml`. - The quality-gate commands live only in the Standard commands section of `<paths.contractsDir>/tech.md`. No gate command is written into `qfai.config.yaml`. - Nothing is written under `.qfai/assistant/catalog/`. - The four files are stated in `cli-0009-qfai-init.md`. | EX-0001-0077-01, EX-0001-0079-02 |
| BR-0003-0008 | `workflow.mode` in `qfai.config.yaml` takes `active`, `shadow` or `off`, and an absent key means `active`. Every reader of the mode, `qfai init` and `qfai validate` included, resolves an absent key to `active` and treats any other value as invalid rather than guessing a mode. `qfai init` writes no `workflow` key, so a project that never sets one runs `active`. | EX-0001-0196-11, EX-0001-0196-12, EX-0001-0196-13, EX-0001-0196-15, EX-0001-0196-14 |
| BR-0003-0009 | `uiux.surfacePaths` in `qfai.config.yaml` is the only declaration of the paths that render a user-visible surface: a list of repository-relative POSIX globs. An empty list states that the project renders no surface, and an absent key declares nothing. Any other value is a configuration issue and declares nothing. The UI-affecting check of `/qfai-implement` reads the key and nothing else for this. | EX-0001-0076-05, EX-0001-0076-06 |
| BR-0003-0010 | `/qfai-configure` writes `uiux.surfacePaths` from the paths it observes rendering a user-visible surface, or an empty list for a repository that renders none, and leaves an existing value unchanged unless the user asks to change it. | EX-0001-0076-07 |
| BR-0003-0011 | `qfai.config.yaml` has no `validation.require` section. `qfai init` writes none, `/qfai-configure` writes none, and the configuration loader reads none; the sections a story-tree document holds come only from the shipped schemas. | EX-0001-0038-09 |
| BR-0003-0012 | `paths.specsDir` and `paths.contractsDir` are read with every `\` taken as `/`, on every platform. The configuration loader and the document-schema checker both read them this way, so `qfai validate` and the document lane resolve one value to one directory on Linux and macOS as on Windows. | EX-0001-0011-16 |
| BR-0003-0013 | `workflow.skipShipped` in `qfai.config.yaml` is a list of the shipped workflow file names `qfai init` does not write, each a name of the shipped set such as `qfai-tests.yml`. An absent key means an empty list. Every reader of the key, `qfai init` and `qfai validate` included, treats a value that is not a list of shipped names as invalid rather than skipping it. `qfai init` writes no `skipShipped` key. | EX-0002-0007-07, EX-0002-0007-08 |

# CLI-0021: Graph exploration

## Ownership boundary

This contract owns graph selection, scope readiness, the graph-first guidance
the shipped rule gives and completed-analysis reuse. Init preparation and exit
outcomes belong to the init contract. The terminal contract owns presentation.
Native engines own their analysis formats and freshness operations; no QFAI
application database or public graph subcommand is introduced here.

The managed command surface is `node .qfai/tools/graph-cli.mjs code <question>`
for code and `node .qfai/tools/graph-cli.mjs documents <question>` for documents.
Each command is a short-lived process. Invalid or incomplete command arguments
are refused before analysis; no command flag authorizes external document
transmission. No graph MCP configuration, server or SDK integration is provided;
existing adopter MCP settings remain intact.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-CLI-0021-0001 | Code structure exploration uses the managed code CLI to query CodeGraph for symbols, calls, dependencies and change impact. It is a short-lived command with no graph MCP request, server, daemon or IPC. | EX-0001-0234-01 |
| BR-CLI-0021-0002 | An exact known source path may be read directly; a known-file read does not require another graph query. | EX-0001-0234-02 |
| BR-CLI-0021-0003 | Requirement, specification, design-rationale and document-relationship exploration uses the managed documents CLI to query Graphify when its requested document scope is ready. It uses no graph MCP request, server, daemon or IPC. | EX-0001-0234-03 |
| BR-CLI-0021-0004 | A second engine is used only for a stated unresolved cross-domain question left by the first engine. A fully answered question invokes no second engine, permanent Graphify sync or automatic watcher. | EX-0001-0234-04, EX-0001-0234-05, EX-0001-0234-06 |
| BR-CLI-0021-0005 | Document processing uses only an explicitly selected local backend or an explicitly human-authorized processing destination and scope. The managed process reaches only the origin of that backend or destination; any other origin, including another host name for the same address, is refused at connection time, name lookups are limited to the selected host name, no redirect is followed, no child process starts and no socket binds or listens. Ambient credentials select no backend and authorize no transmission; without a required selected backend the scope is documents-not-ready. Existing upstream processing settings are passed only to the managed process, without selecting a provider from ambient configuration. | EX-0001-0234-07, EX-0001-0234-08, EX-0001-0234-09, EX-0001-0234-21, EX-0001-0234-22 |
| BR-CLI-0021-0006 | Graphify code-only analysis may run locally without a document backend; its result does not make document scope ready. | EX-0001-0234-10 |
| BR-CLI-0021-0007 | A compatible completed document graph may be queried without a backend or model call after current scope is confirmed. A changed document requiring processing remains documents-not-ready until the selected processing backend is available. | EX-0001-0234-11, EX-0001-0234-12 |
| BR-CLI-0021-0008 | Unsupported, unreadable, unparsed and incomplete requested scope is identified separately from a no-match result; an incomplete search does not establish absence. | EX-0001-0234-13 |
| BR-CLI-0021-0009 | Results distinguish source facts and their locations from inferred graph relationships; inferred edges do not establish semantic correctness or complete coverage. | EX-0001-0234-14 |
| BR-CLI-0021-0010 | The CLI attempts a native query, prepares missing or stale required analysis where possible, then requeries. Not-ready scope and graph-operation failures return preparation or repair actions; the CLI runs no raw search itself. | EX-0001-0234-15, EX-0001-0234-16 |
| BR-CLI-0021-0011 | The graph exploration rule `qfai init` ships names the managed code and documents CLIs as the first choice for searching, exploring and investigating, and says that ordinary search (grep, rg, git grep, findstr, Select-String) is acceptable and that no tool blocks it. No pre-tool hook denies, reroutes or records a direct search. | EX-0001-0235-01 |
| BR-CLI-0021-0020 | Reuse selects only completed local analysis for the same machine and repository with compatible engine, environment, paths and selected processing definitions. It restores an independent working copy and confirms native current-scope freshness before querying; unchanged verified scope needs no unnecessary generation. | EX-0001-0236-01, EX-0001-0236-02, EX-0001-0236-21 |
| BR-CLI-0021-0021 | CodeGraph database restoration and Graphify restoration containing documents are enabled only for version and environment combinations with actual independent-copy acceptance proof. Unproved combinations use local generation and make no portability claim. | EX-0001-0236-03 |
| BR-CLI-0021-0022 | Worktrees and Windows/WSL environments share no live writable database, graph, daemon, PID, socket or lock, and cannot publish another worktree's uncommitted state. Each worktree serializes CLI queries, analysis preparation and the runtime activation `qfai init` performs through its own local lock. Contention reports retry; an abandoned lock reports manual recovery without automatic deletion of unrelated locks. | EX-0001-0236-04, EX-0001-0236-05, EX-0001-0236-20, EX-0001-0236-24 |
| BR-CLI-0021-0023 | Native engine freshness and update operations reconcile uncommitted edits, added, deleted and renamed inputs before requested results are current. Engine, parser, grammar and selected processing-definition changes trigger compatibility and freshness checks again. | EX-0001-0236-06, EX-0001-0236-07, EX-0001-0236-08, EX-0001-0236-09, EX-0001-0236-10 |
| BR-CLI-0021-0024 | Native updates may rebuild a whole corpus; no universal incremental-update speed or initial-generation time is guaranteed. | EX-0001-0236-11 |
| BR-CLI-0021-0025 | Missing, partial, corrupt or incompatible cache candidates are excluded from queries. Required compatible local analysis is prepared or its preparation failure is reported. | EX-0001-0236-12, EX-0001-0236-13 |
| BR-CLI-0021-0026 | Failed checking or replacement generation preserves prior usable analysis and does not publish an incomplete replacement as completed. Changed scope remains not ready when its selected processing backend is unavailable; prior analysis is not described as current for that scope. | EX-0001-0236-14, EX-0001-0236-15, EX-0001-0236-20 |
| BR-CLI-0021-0027 | Generated DBs, graphs, manifests, caches, runtimes and live-process markers stay outside Git; project source, configuration and processing definitions remain tracked. If an adopter removes an ignore entry or tracks generated output, their choice is preserved and the conflict and recovery are reported. | EX-0001-0236-16, EX-0001-0236-17 |
| BR-CLI-0021-0028 | Source-changing pull requests need neither generated graph attachments nor a mandatory full graph-regeneration CI gate. Ordinary implementation and integration checks remain required. | EX-0001-0236-18 |
| BR-CLI-0021-0029 | Freshness and snapshot handling reuse native engine operations and their supported backup or copy mechanisms; QFAI adds no custom integrity hashes, mandatory remote cache or automatic analysis watcher. | EX-0001-0236-19, EX-0001-0236-02 |
| BR-CLI-0021-0030 | Secret files are excluded from both engines' corpus and generated storage. Graph integration writes no credentials to tracked settings, logs or reusable snapshots. A candidate containing secrets or credentials is excluded from restoration and queries. Existing user files and settings are preserved; conflicts and safe recovery are reported without secret values. | EX-0001-0234-17, EX-0001-0234-18, EX-0001-0236-22 |
| BR-CLI-0021-0031 | The Graphify document corpus excludes the directory `paths.deliberationDir` names and every file under it, and no cached code or document analysis holding such a file is restored. No documents query returns a record. When the configuration cannot be read or parsed, or is not a mapping, or gives a `paths` that is not a mapping or a `paths.deliberationDir` that is blank, not a string, names the project root or a directory outside it, or has a part ending in a dot or a space, no corpus is built and the query fails, naming the configuration file; init still finishes and reports code analysis not ready. | EX-0001-0234-19, EX-0001-0234-20 |
| BR-CLI-0021-0033 | Code and document analysis a query prepares run under time and output limits of their own, longer than those of a version check or a query, with document analysis allowed the longest. Analysis stopped at its limit fails preparation with a recovery that names the analysis, which limit it passed, time or output, and the value, in place of the generic repair action; a stopped document analysis says to narrow the document scope. | EX-0001-0234-25 |

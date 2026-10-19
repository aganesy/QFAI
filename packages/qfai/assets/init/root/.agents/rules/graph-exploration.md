# Graph exploration

Use the project graph CLIs for exploratory searches once they are ready. Run
`qfai init` to prepare or repair the project-local runtimes, CLI and denial
hooks. This integration registers and launches no graph MCP server.

## While the graph tools are not ready

When `qfai init` or the graph CLI reports an engine as not ready, use ordinary
search for the questions that engine answers. Do the same when search
protection is reported as unsupported for your host. Say in your report that
the graph was not used and why. When a supported hook denies the search, use
the fallback command in "Direct search and result limits" below. Retry once
the cause is fixed; for a failed download, run the command `qfai init` names to
see the cause.

## Choose the first engine

| Question                                                    | First engine |
| ----------------------------------------------------------- | ------------ |
| Symbols, callers, imports, dependencies or change impact    | CodeGraph    |
| Requirements, specifications, decisions or design rationale | Graphify     |

Run the managed command for the selected engine:

```sh
node .qfai/tools/graph-cli.mjs code "your code question"
node .qfai/tools/graph-cli.mjs documents "your document question"
```

The CLI checks native freshness, prepares required analysis where possible and
retries its query. Each command exits after returning evidence or an actionable
failure; it uses no daemon or IPC.

Read an exact known source path directly. A known-file read grants no general
search exception. Use a second engine only for a specific unresolved question
that crosses from code to documents or documents to code. A complete answer
needs no second engine, watcher or continuous synchronization.

## Processing and readiness

Installed tools do not establish current analysis or search protection.
Inspect code, document and host readiness separately. Configure document
processing explicitly before extraction. Ambient API credentials choose no
provider and authorize no external transmission or paid processing.

Local processing is the default. An external destination requires explicit
human approval of that destination and document scope. A completed, compatible,
current document graph may be queried without a model. Code-only Graphify
analysis does not establish document readiness.

### Configure local document analysis

Create `.qfai/graph-processing.json` with the local server and model you chose:

```json
{
  "backend": "ollama",
  "model": "your-installed-model",
  "endpoint": "http://127.0.0.1:11434/v1",
  "scope": ["docs"]
}
```

Replace `model` with a model you already installed. Set `scope` to the existing
project files or directories you want to analyze. Paths are relative to this
worktree. Start your selected local server, then retry the documents CLI
command. The CLI prepares missing analysis with these settings. QFAI
does not install or choose a model for you.
The quality of document answers depends on the model you select, and QFAI
does not evaluate it. Check important answers against their cited sources.

The supported backend names are `ollama` and `openai`. An `openai` backend can
also use a compatible local endpoint. Keep credentials out of this file. When
the selected server requires a key, set `credentialEnv` to the name of an
environment variable containing it. An external endpoint still requires human
authorization of the exact destination and scope before processing.

### Authorize external document analysis

Set the selected `backend`, `model`, `endpoint` and exact `scope` in the same
file. The ordinary graph CLI does not approve external transmission. Run a
Node script such as this yourself in an interactive terminal:

```js
import { prepareDocumentAnalysis } from "qfai";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

if (!stdin.isTTY || !stdout.isTTY) {
  throw new Error("Use an interactive terminal to review document transmission.");
}
const prompt = createInterface({ input: stdin, output: stdout });
try {
  const result = await prepareDocumentAnalysis(process.cwd(), undefined, async (request) => {
    stdout.write(JSON.stringify(request, null, 2) + "\n");
    return (await prompt.question("Allow this document transmission? Type yes: ")).trim() === "yes";
  });
  console.log(result);
} finally {
  prompt.close();
}
```

Review the displayed worktree, destination, backend, model and document scope
before answering. The AI must not supply this approval or pipe a response.
An omitted or refusing authorization callback starts no external processing.
After preparation succeeds, retry the documents CLI. A changed scope requiring
new external processing needs this review again. Search fallback grants no
document-transmission permission.

Exclude secret files from both engines and generated storage. Keep credentials
out of tracked integration settings, logs and reusable analysis.

## Direct search and result limits

Supported pre-tool hooks deny direct exploratory search and display the
appropriate graph CLI command and a pending attempt UUID. Build, test, lint and
graph-engine internals remain permitted. Hooks only classify, deny and save
bounded pending state; they perform no graph query, preparation, network
request or model call. The graph CLI never runs raw search itself.

When the AI judges that the graph cannot answer, run the fallback command with
the pending UUID displayed by the denied action:

```sh
node .qfai/tools/graph-cli.mjs fallback --attempt-id "UUID-from-denial" --question "unresolved question" --reason "why the graph cannot answer"
```

The CLI derives immutable target, operation, worktree, session and domain from
the pending attempt. It attempts the relevant graph itself, prepares required
analysis where possible and requeries before saving permission. Partial,
not-ready or failed results can still leave an unresolved question. State the
actual limitation; the CLI does not verify the reason's semantic truth.

Permission lasts exactly 60 seconds and matches only the observed target and
operation in the same worktree and session, strictly before expiry. No human
search approval is needed. Manual scope overrides and missing, invalid,
expired or mismatched state grant nothing. State-management failures grant
nothing. Correct the reported cause and retry the denied action when a new
pending attempt is required. Search fallback authorizes no external document
transmission.

Configuration alone proves no blocking. Trust and runtime behavior are checked
per host, version and event set. Hidden scripts, aliases and continuing shell
input remain outside the proven boundary unless separately demonstrated.

Report unparsed, unsupported, unreadable and incomplete scope separately from
no matches. Label inferred relationships and retain source locations. Incomplete
coverage does not establish absence or semantic correctness.

## Local reuse

Keep generated runtimes, databases, graphs, manifests and caches outside Git.
Reuse only compatible, completed local analysis from the same repository and
machine. Restore independent writable copies and check native freshness before
querying. Worktrees share no live writable analysis, process, socket or lock.
Restoration is proven only on Windows x64, for CodeGraph on Node.js 24.16.0
and for Graphify on Python 3.12.13. Other platforms, architectures and
runtime versions are unverified and use local generation instead.

Each worktree serializes CLI queries and preparation with its own local lock.
Contention reports retry; an abandoned lock reports manual recovery. Do not
delete another operation's lock automatically.

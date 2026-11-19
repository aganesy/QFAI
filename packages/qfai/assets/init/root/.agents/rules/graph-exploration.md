# Graph exploration

For searching, exploring and investigating code or documents, prefer the
project graph CLIs first. Run `qfai init` to prepare or repair the
project-local runtimes and CLI. This integration registers and launches no
graph MCP server.

Ordinary search (`grep`, `rg`, `git grep`, `findstr`, `Select-String`) is
acceptable, and no tool blocks it. Reach for it when the graph tools are not
ready, when the graph cannot answer the question, or when you already know the
exact text or file you need. Do not repeat a search you already ran just to
route it through the graph.

## While the graph tools are not ready

When `qfai init` or the graph CLI reports an engine as not ready, use ordinary
search for the questions that engine answers, and say in your report that the
graph was not used and why. Retry once the cause is fixed; for a failed
download, run the command `qfai init` names to see the cause.

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

Read an exact known source path directly. Use a second engine only for a
specific unresolved question that crosses from code to documents or documents
to code. A complete answer needs no second engine, watcher or continuous
synchronization.

## Processing and readiness

Installed tools do not establish current analysis. Inspect code and document
readiness separately. Configure document processing explicitly before
extraction. Ambient API credentials choose no provider and authorize no
external transmission or paid processing.

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
environment variable containing it. An external endpoint must use `https`;
plain `http` works only on `127.0.0.1`, `localhost` or `[::1]`. An external
endpoint still requires human authorization of the exact destination and scope
before processing.

An `openai` backend always needs `credentialEnv`, even for a local server
that requires no authentication: Graphify's client refuses to start without a
non-empty key, so the documents CLI reports document analysis not ready before
extraction. For such a local server, set a variable to any placeholder value,
for example `QFAI_LOCAL_LLM_KEY=local`, and name it:

```json
{
  "backend": "openai",
  "model": "your-installed-model",
  "endpoint": "http://127.0.0.1:8080/v1",
  "credentialEnv": "QFAI_LOCAL_LLM_KEY",
  "scope": ["docs"]
}
```

The documents CLI passes the placeholder only to the managed process that
reaches the selected endpoint.

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
new external processing needs this review again.

Exclude secret files from both engines and generated storage. Keep credentials
out of tracked integration settings, logs and reusable analysis.

## Reading results

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

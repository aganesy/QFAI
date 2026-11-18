import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";
import { prepareDocumentAnalysis } from "../../../src/core/graph/documents.js";
import { getInitAssetsDir } from "../../../src/shared/assets.js";
import { documentAnalysisFixture, graphifyExtractionFixture } from "../../helpers/graphAnalysis.js";

const execute = promisify(execFile);
const ORIGIN_GUARD = path.resolve(getInitAssetsDir(), "..", "graph", "graphify-origin.py");

// A stand-in for Graphify: it sends the synthetic document to the approved endpoint, follows a
// redirect the endpoint answers with, and sends it straight to another origin.
const STUB_GRAPHIFY = `import json, sys, urllib.request
document = open(sys.argv[2], encoding="utf-8").read().encode("utf-8")
approved, other = sys.argv[3], sys.argv[4]
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def attempt(url):
    try:
        opener.open(urllib.request.Request(url, data=document), timeout=10).read()
        return "sent"
    except Exception as error:
        reason = getattr(error, "reason", error)
        return "refused" if isinstance(reason, PermissionError) else type(reason).__name__
print(json.dumps({
    "approved": attempt(approved + "/v1/chat/completions"),
    "redirect": attempt(approved + "/redirect"),
    "other": attempt(other + "/v1/chat/completions"),
}))
`;

interface Endpoint {
  server: Server;
  origin: string;
  received: { url: string; body: string }[];
}

async function endpoint(redirectTo?: () => string): Promise<Endpoint> {
  const received: Endpoint["received"] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({ url: request.url ?? "", body: Buffer.concat(chunks).toString("utf8") });
      if (redirectTo && request.url === "/redirect") {
        response.writeHead(302, { location: `${redirectTo()}/v1/chat/completions` }).end();
        return;
      }
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Expected a TCP endpoint.");
  return { server, origin: `http://127.0.0.1:${address.port}`, received };
}

/** The interpreter's own path, so the guarded run with a reduced environment starts no launcher. */
async function python(): Promise<string> {
  // Windows names its interpreter python; python3 there can start the Python install manager.
  for (const candidate of process.platform === "win32" ? ["python"] : ["python3", "python"]) {
    try {
      const { stdout } = await execute(
        candidate,
        ["-c", "import sys; print(sys.executable if sys.version_info[0] == 3 else '')"],
        { windowsHide: true },
      );
      if (stdout.trim()) return stdout.trim();
    } catch (cause: unknown) {
      if (!(cause instanceof Error) || !("code" in cause)) throw cause;
    }
  }
  throw new Error("This example runs the origin guard and needs Python 3 on PATH.");
}

// QFAI:EX-0001-0234-21
// Mutation: packages/qfai/assets/graph/graphify-origin.py `raise PermissionError(REFUSAL)` -> `pass` fails "delivers the synthetic document only to the selected local origin"
it("delivers the synthetic document only to the selected local origin", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-origin-"));
  const other = await endpoint();
  const approved = await endpoint(() => other.origin);
  try {
    const stub = path.join(directory, "stub");
    await mkdir(path.join(stub, "graphify"), { recursive: true });
    await writeFile(path.join(stub, "graphify", "__init__.py"), "");
    await writeFile(path.join(stub, "graphify", "__main__.py"), STUB_GRAPHIFY);
    const document = path.join(directory, "rationale.md");
    const content = "# Rationale\nSynthetic document for the origin guard.\n";
    await writeFile(document, content);
    const { stdout } = await execute(
      await python(),
      [ORIGIN_GUARD, `${approved.origin}/v1`, "extract", document, approved.origin, other.origin],
      {
        cwd: directory,
        windowsHide: true,
        timeout: 60_000,
        env: {
          PATH: process.env.PATH ?? "",
          ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
          PYTHONPATH: stub,
          PYTHONUTF8: "1",
        },
      },
    );
    expect(JSON.parse(stdout)).toEqual({
      approved: "sent",
      redirect: "refused",
      other: "refused",
    });
    expect(approved.received).toContainEqual({ url: "/v1/chat/completions", body: content });
    expect(other.received).toEqual([]);
  } finally {
    await Promise.all(
      [approved, other].map(
        ({ server }) => new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

// QFAI:EX-0001-0234-22
// Mutation: packages/qfai/src/core/graph/documents.ts `path.resolve(getInitAssetsDir(), "..", "graph", "graphify-origin.py"),` -> `"-m", "graphify",` fails "holds selected and authorized document processing to its origin"
it("holds selected and authorized document processing to its origin", async () => {
  const fixture = await documentAnalysisFixture();
  try {
    const definition = path.join(fixture.root, ".qfai", "graph-processing.json");
    const run = graphifyExtractionFixture(fixture);
    const guarded = () => {
      const extracts = fixture.calls.filter((call) => call.args.includes("extract"));
      expect(extracts).toHaveLength(1);
      const args = extracts[0]?.args ?? [];
      const guard = args.indexOf(ORIGIN_GUARD);
      expect(guard).toBeGreaterThan(0);
      expect(args.slice(0, guard)).toEqual(["-I", "-X", "utf8"]);
      return args.slice(guard + 1, guard + 3);
    };
    await writeFile(definition, JSON.stringify({ backend: "ollama", model: "selected-local" }));
    expect((await prepareDocumentAnalysis(fixture.root, run)).status).toBe("prepared");
    expect(guarded()).toEqual(["http://127.0.0.1:11434/v1", "extract"]);
    const external = {
      backend: "openai",
      model: "selected-model",
      endpoint: "https://selected.example.invalid/v1",
      scope: ["rationale.md"],
    };
    await writeFile(definition, JSON.stringify(external));
    fixture.calls.length = 0;
    const approvals: string[] = [];
    const result = await prepareDocumentAnalysis(fixture.root, run, (request) => {
      approvals.push(request.destination);
      return Promise.resolve(true);
    });
    expect(result.status).toBe("prepared");
    expect(approvals).toEqual([external.endpoint]);
    expect(guarded()).toEqual([external.endpoint, "extract"]);
  } finally {
    await fixture.dispose();
  }
});

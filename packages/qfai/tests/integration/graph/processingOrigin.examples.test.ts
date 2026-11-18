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
// redirect the endpoint answers with, sends it straight to another origin, and tries every kind of
// name lookup, since a lookup of a chosen name can carry data out by itself.
const STUB_GRAPHIFY = `import json, socket, sys, urllib.parse, urllib.request
document = open(sys.argv[2], encoding="utf-8").read().encode("utf-8")
approved, other = sys.argv[3], sys.argv[4]
host = urllib.parse.urlsplit(approved).hostname
outside = "rationale-data.example.invalid"
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
def attempt(url):
    try:
        opener.open(urllib.request.Request(url, data=document), timeout=10).read()
        return "sent"
    except Exception as error:
        reason = getattr(error, "reason", error)
        return "refused" if isinstance(reason, PermissionError) else type(reason).__name__
def lookup(call):
    try:
        call()
        return "allowed"
    except PermissionError:
        return "refused"
    except OSError as error:
        return type(error).__name__
print(json.dumps({
    "approved": attempt(approved + "/v1/chat/completions"),
    "redirect": attempt(approved + "/redirect"),
    "other": attempt(other + "/v1/chat/completions"),
    "lookups": {
        "gethostbyname": lookup(lambda: socket.gethostbyname(host)),
        "gethostbyname_ex": lookup(lambda: socket.gethostbyname_ex(host)),
        "gethostbyname outside": lookup(lambda: socket.gethostbyname(outside)),
        "gethostbyname_ex outside": lookup(lambda: socket.gethostbyname_ex(outside)),
        "getaddrinfo outside": lookup(lambda: socket.getaddrinfo(outside, 80)),
        "gethostbyaddr": lookup(lambda: socket.gethostbyaddr("127.0.0.1")),
        "getnameinfo": lookup(lambda: socket.getnameinfo(("127.0.0.1", 80), 0)),
    },
}))
`;

const LOOKUPS = {
  gethostbyname: "allowed",
  gethostbyname_ex: "allowed",
  "gethostbyname outside": "refused",
  "gethostbyname_ex outside": "refused",
  "getaddrinfo outside": "refused",
  gethostbyaddr: "refused",
  getnameinfo: "refused",
};

interface Endpoint {
  server: Server;
  origin: string;
  received: { url: string; body: string }[];
}

async function endpoint(redirectTo?: (port: number) => string): Promise<Endpoint> {
  const received: Endpoint["received"] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({ url: request.url ?? "", body: Buffer.concat(chunks).toString("utf8") });
      if (redirectTo && request.url === "/redirect") {
        const port = request.socket.localPort ?? 0;
        response.writeHead(302, { location: `${redirectTo(port)}/v1/chat/completions` }).end();
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

const CONTENT = "# Rationale\nSynthetic document for the origin guard.\n";

/** Runs the guard over the stand-in Graphify and returns what the stand-in reports. */
async function guardedRun(origin: string, approved: string, other: string): Promise<unknown> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-origin-"));
  try {
    const stub = path.join(directory, "stub");
    await mkdir(path.join(stub, "graphify"), { recursive: true });
    await writeFile(path.join(stub, "graphify", "__init__.py"), "");
    await writeFile(path.join(stub, "graphify", "__main__.py"), STUB_GRAPHIFY);
    const document = path.join(directory, "rationale.md");
    await writeFile(document, CONTENT);
    const { stdout } = await execute(
      await python(),
      [ORIGIN_GUARD, origin, "extract", document, approved, other],
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
    return JSON.parse(stdout);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function close(...endpoints: Endpoint[]): Promise<void> {
  await Promise.all(
    endpoints.map(({ server }) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
}

// QFAI:EX-0001-0234-21
// Mutation: packages/qfai/assets/graph/graphify-origin.py `raise PermissionError(REFUSAL)` -> `pass` fails "delivers the synthetic document only to the selected local origin"
it("delivers the synthetic document only to the selected local origin", async () => {
  const other = await endpoint();
  const approved = await endpoint(() => other.origin);
  try {
    expect(await guardedRun(`${approved.origin}/v1`, approved.origin, other.origin)).toEqual({
      approved: "sent",
      redirect: "refused",
      other: "refused",
      lookups: LOOKUPS,
    });
    expect(approved.received).toContainEqual({ url: "/v1/chat/completions", body: CONTENT });
    expect(other.received).toEqual([]);
  } finally {
    await close(approved, other);
  }
});

// QFAI:EX-0001-0234-21
// Mutation: packages/qfai/assets/graph/graphify-origin.py `return host_text(args[0]) == host and port_allowed(args[1])` -> `return port_allowed(args[1])` fails "refuses another host name for the approved address"
it("refuses another host name for the approved address", async () => {
  const approved = await endpoint((port) => `http://127.0.0.1:${port}`);
  const port = new URL(approved.origin).port;
  try {
    expect(
      await guardedRun(
        `http://localhost:${port}/v1`,
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
      ),
    ).toEqual({ approved: "sent", redirect: "refused", other: "refused", lookups: LOOKUPS });
    expect(approved.received.map(({ url }) => url)).toEqual(["/v1/chat/completions", "/redirect"]);
  } finally {
    await close(approved);
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

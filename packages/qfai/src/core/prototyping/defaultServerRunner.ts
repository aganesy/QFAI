/**
 * Default local HTTP server runner used by `qfai prototyping iterate
 * --auto-serve` when no DI serverRunner is supplied.
 *
 * Spins up an in-process Node `http.createServer` listening on
 * `127.0.0.1`. Serves static files from
 * `<root>/.qfai/prototypes/iter-NN/` (where NN is the zero-padded
 * cycle), with `GET /` mapped to `index.html`. Path-traversal attempts
 * outside the iteration directory are rejected with HTTP 403.
 *
 * Design choice — in-process, no subprocess
 * ----------------------------------------
 * The auto-serve operator contract calls out `tree-kill` (Unix) /
 * `taskkill /F /T` (Windows) teardown in the context of runners that
 * spawn an EXTERNAL server subprocess. The default ships an
 * IN-PROCESS Node HTTP server instead: no child PID to track, no
 * process tree to walk, no platform-specific kill incantation. Teardown
 * is a single `server.close()` call which the Node runtime resolves
 * well under the operator-facing 2 s SIGINT bound. Operators who need
 * a subprocess-based server (vite dev, next dev, etc.) pass their own
 * `serverRunner` via the DI surface.
 *
 * Foreign-process refusal
 * -----------------------
 * On `EADDRINUSE` the runner refuses to silently pick another port
 * (which would let the operator interact with an unrelated process).
 * It returns `{ ok: false, reason: "...already in use; refusing to
 * attach to foreign process" }`. iterate surfaces this as exit 2.
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import path from "node:path";

/**
 * Arguments accepted by the default server runner. Mirrors the
 * `ServerRunnerFn` contract exported by the iterate command so callers
 * can pass the default directly without an adapter. `port` is an
 * optional override (mainly for tests that need to force EADDRINUSE on
 * a known port); production callers omit it and the runner picks the
 * documented default port.
 */
export type ServerRunnerArgs = {
  readonly root: string;
  readonly cycle: number;
  readonly port?: number;
};

export type ServerRunnerResult =
  | {
      readonly ok: true;
      readonly teardown: () => Promise<void>;
      readonly pid?: number;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly foreignPid?: number;
    };

/**
 * Documented default port. Operators may override via the DI hook if
 * the port is occupied by an unrelated service they intend to keep
 * running.
 */
export const DEFAULT_AUTO_SERVE_PORT = 4321;

/**
 * Default server runner. Returns a teardown handle on success or a
 * structured refusal on EADDRINUSE / bind failure.
 */
export const defaultServerRunner = async (
  args: ServerRunnerArgs,
): Promise<ServerRunnerResult> => {
  const port = args.port ?? DEFAULT_AUTO_SERVE_PORT;
  const iterDirName = `iter-${String(args.cycle).padStart(2, "0")}`;
  const serveRoot = path.resolve(args.root, ".qfai", "prototypes", iterDirName);

  const server = createServer((req, res) => {
    handleRequest(req, res, serveRoot);
  });

  // Listen + propagate bind failures (notably EADDRINUSE) through a
  // single promise. The handler attaches both "listening" and "error"
  // listeners and removes itself once one fires.
  const bindResult = await bindServer(server, port);
  if (!bindResult.ok) {
    return { ok: false, reason: bindResult.reason };
  }

  const teardown = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      // server.close resolves once all in-flight connections drain; we
      // also call closeAllConnections (when available) so the close
      // does not block on idle keep-alive sockets — keeping teardown
      // well under the operator-facing 2 s bound.
      try {
        // Structural narrowing without a bare `as` cast: `Server` does
        // not declare `closeAllConnections` in older @types/node, so we
        // assign through a permissive shape and invoke optionally.
        const maybe: { closeAllConnections?: () => void } = server;
        maybe.closeAllConnections?.();
      } catch {
        // best-effort; do not block teardown on connection drainage.
      }
      server.close(() => {
        resolve();
      });
    });
  };

  return { ok: true, teardown };
};

/**
 * Internal result of `bindServer`. The success case carries no
 * teardown — callers construct the full teardown handle themselves so
 * we don't ship a dead-code placeholder that future maintainers might
 * mistakenly rely on.
 */
type BindResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

function bindServer(server: Server, port: number): Promise<BindResult> {
  return new Promise((resolve) => {
    const onListening = (): void => {
      server.off("error", onError);
      resolve({ ok: true });
    };
    const onError = (err: unknown): void => {
      server.off("listening", onListening);
      const code = readErrorCode(err);
      if (code === "EADDRINUSE") {
        resolve({
          ok: false,
          reason: `port ${port} already in use; refusing to attach to foreign process. Free the port or pass options.serverRunner.`,
        });
        return;
      }
      resolve({
        ok: false,
        reason: `failed to bind local HTTP server on port ${port} (${String(err)}).`,
      });
    };
    server.once("listening", onListening);
    server.once("error", onError);
    try {
      server.listen(port, "127.0.0.1");
    } catch (cause) {
      // listen() can throw synchronously for invalid port etc.
      server.off("listening", onListening);
      server.off("error", onError);
      resolve({
        ok: false,
        reason: `failed to invoke server.listen on port ${port} (${String(cause)}).`,
      });
    }
  });
}

function readErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  serveRoot: string,
): void {
  try {
    const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
    const requested = urlPath === "/" ? "/index.html" : urlPath;
    // Decode percent-encoding so traversal payloads cannot smuggle
    // `%2e%2e` through the join. Decoding failures fall back to a
    // rejected request.
    let decoded: string;
    try {
      decoded = decodeURIComponent(requested);
    } catch {
      res.statusCode = 400;
      res.end("bad request");
      return;
    }
    const normalised = path.normalize(decoded).replace(/^[\\/]+/, "");
    const candidate = path.resolve(serveRoot, normalised);
    // Path-traversal guard: candidate MUST stay inside serveRoot.
    const rootWithSep = serveRoot.endsWith(path.sep) ? serveRoot : serveRoot + path.sep;
    if (candidate !== serveRoot && !candidate.startsWith(rootWithSep)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    if (!existsSync(candidate)) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    let stat;
    try {
      stat = statSync(candidate);
    } catch {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    if (!stat.isFile()) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", contentTypeFor(candidate));
    const stream = createReadStream(candidate);
    stream.on("error", () => {
      // surface a 500 only if no body has been sent yet; otherwise just
      // tear the connection.
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end();
    });
    stream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end();
  }
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

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
 * SPA route fallback
 * ------------------
 * A document request (GET/HEAD whose `Accept` includes `text/html`)
 * that resolves to a path with no file on disk is served
 * `index.html` instead of 404. Capture URLs are composed verbatim from
 * each UI contract's `route`, and real routes are largely
 * client-side and often parameterized (`/pairs/:instrument`,
 * `/reports/:reportId`) — no file layout can satisfy those, and `:`
 * is not even a legal filename character on Windows. Without the
 * fallback, `--auto-serve` + `--capture` cannot capture those screens
 * at all, and capture evidence is a mandatory input to the prototyping
 * DONE gate. Sub-resource requests (`.css`, `.png`, `fetch()`) do NOT
 * carry `text/html` in `Accept`, so a genuinely missing asset still
 * 404s rather than silently receiving an HTML body. The 403 traversal
 * guard runs ahead of the fallback — including on the decoded path,
 * before normalization, so an escape payload cannot reach the fallback
 * by having its `..` segments collapsed away first.
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
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

/**
 * Arguments accepted by the default server runner. Mirrors the
 * `ServerRunnerFn` contract exported by the iterate command so callers
 * can pass the default directly without an adapter.
 *
 * `port` is a **test-only override**. Production callers (the iterate
 * CLI command in `runPrototypingIterate`) never set it — the runner
 * resolves the bind port from `args.targetUrl` (when it carries an
 * explicit port) or falls back to {@link DEFAULT_AUTO_SERVE_PORT}. The
 * field is retained on the public surface only so unit / integration
 * tests can force EADDRINUSE on a known port without rebuilding the
 * production resolution chain.
 */
export type ServerRunnerArgs = {
  readonly root: string;
  readonly cycle: number;
  readonly port?: number;
  /**
   * Optional operator-supplied target URL. When `port` is not given,
   * the runner derives the bind port from this URL's `port` component
   * (so `--target-url http://localhost:5173/` binds 5173 instead of
   * silently falling back to {@link DEFAULT_AUTO_SERVE_PORT}). When the
   * URL has no explicit port — bare `http://` / `https://` schemes
   * imply privileged 80 / 443 — the runner still falls back to
   * {@link DEFAULT_AUTO_SERVE_PORT} rather than attempt a privileged
   * bind.
   */
  readonly targetUrl?: string;
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
 *
 * Why 4321: does not collide with the common dev-server defaults
 * operators are likely to have running alongside
 * `qfai prototyping iterate --auto-serve` (Vite 5173, Next 3000, Vue
 * CLI 8080, webpack-dev-server 9000, Storybook 6006). IANA records
 * 4321/tcp as `rwhois` (RFC 2167), but modern dev environments almost
 * never run rwhois, so the empirical collision rate is near zero.
 * Picking an uncommon-but-memorable port keeps the EADDRINUSE-refusal
 * branch from firing on operators who happen to already have one of
 * those tools open.
 */
export const DEFAULT_AUTO_SERVE_PORT = 4321;

/**
 * Derive a bind port from an operator-supplied target URL. Returns
 * `null` when the URL is missing, unparseable, or carries no explicit
 * port — the caller falls back to {@link DEFAULT_AUTO_SERVE_PORT} in
 * those cases (we never attempt the privileged 80 / 443 ports implied
 * by a bare `http://` / `https://` URL).
 */
function derivePortFromTargetUrl(targetUrl: string | undefined): number | null {
  if (targetUrl === undefined || targetUrl.length === 0) return null;
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return null;
  }
  if (parsed.port.length === 0) return null;
  const n = Number.parseInt(parsed.port, 10);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) return null;
  return n;
}

/**
 * Default server runner. Returns a teardown handle on success or a
 * structured refusal on EADDRINUSE / bind failure.
 */
export const defaultServerRunner = async (args: ServerRunnerArgs): Promise<ServerRunnerResult> => {
  // Port resolution precedence (operator contract): explicit `args.port`
  // → port parsed from `args.targetUrl` (so `--target-url http://localhost:5173/`
  // binds 5173 instead of silently re-binding 4321 against a foreign
  // process the operator never asked for) → DEFAULT_AUTO_SERVE_PORT.
  const port = args.port ?? derivePortFromTargetUrl(args.targetUrl) ?? DEFAULT_AUTO_SERVE_PORT;
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
type BindResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

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
          reason:
            `port ${port} already in use; refusing to attach to a foreign process. ` +
            `Identify the owner (lsof -i :${port} on macOS/Linux, ` +
            `netstat -ano | findstr :${port} on Windows) and free the port ` +
            `before re-running. Programmatic consumers can pass ` +
            `options.serverRunner to override.`,
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
  if (!("code" in err)) return null;
  // After `typeof === "object" && !== null` the value is a non-null
  // object; reading through `Record<string, unknown>` keeps the
  // narrowing explicit instead of asserting `{ code?: unknown }`
  // shape directly via a bare `as` cast (CLAUDE.md project rule).
  const code: unknown = (err as Record<string, unknown>).code;
  return typeof code === "string" ? code : null;
}

function isReadableFile(candidate: string): boolean {
  if (!existsSync(candidate)) return false;
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

// A document request is the navigation the SPA fallback exists for.
// Browsers and Playwright send `Accept: text/html,...` on top-level
// navigations; sub-resource loads (`<link rel=stylesheet>`, `<img>`,
// `fetch()`) send image/*, text/css, or `*/*` instead. Keying the
// fallback on that header is what keeps a missing `.css` / `.png` a
// genuine 404 rather than an HTML body with a 200 status.
function isDocumentRequest(req: IncomingMessage): boolean {
  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const accept = req.headers.accept;
  const header = Array.isArray(accept) ? accept.join(",") : (accept ?? "");
  return header.toLowerCase().includes("text/html");
}

// Resolve the on-disk file to serve, or `null` for a 404. The caller
// has already applied the path-traversal guard, so `candidate` is known
// to be inside `serveRoot`.
function resolveServablePath(
  candidate: string,
  serveRoot: string,
  req: IncomingMessage,
): string | null {
  if (isReadableFile(candidate)) return candidate;
  if (!isDocumentRequest(req)) return null;
  const fallback = path.resolve(serveRoot, "index.html");
  // No `index.html` in the tree means there is nothing to fall back
  // to; preserve the 404 rather than inventing a response.
  return isReadableFile(fallback) ? fallback : null;
}

/**
 * True when the DECODED request path is shaped like a filesystem escape
 * rather than a route.
 *
 * This has to run before `path.normalize`, because normalization is what
 * destroys the evidence: `/../../etc/passwd` collapses to `/etc/passwd`,
 * which then resolves to a harmless-looking path INSIDE `serveRoot` and
 * sails past the `startsWith(rootWithSep)` guard. That containment kept
 * the old code honest — the request simply 404'd — but with the SPA
 * fallback in place a non-existent contained path is answered with
 * `index.html` and HTTP 200, turning a rejected traversal attempt into a
 * success. Reject the shape up front so the documented "403 traversal
 * guard runs ahead of the fallback" contract is literally true.
 *
 * Three shapes, all matched on the decoded string so percent-encoded
 * payloads are seen for what they are:
 *   - any backslash (`..\..\etc\passwd`, `\\server\share\secret`)
 *   - a `..` path segment (`/../../etc/passwd`)
 *   - a drive-qualified first segment (`/C:/Windows/...`)
 * None of them is a legal SPA route, so no capture URL is lost.
 */
function looksLikeFilesystemEscape(decodedPath: string): boolean {
  // Backslash is not a legal URL path character — browsers rewrite it to
  // `/` before the request is sent — so one arriving here means a crafted
  // Windows-shaped payload, not a file a prototype legitimately serves.
  if (decodedPath.includes("\\")) {
    return true;
  }
  const segments = decodedPath.split("/").filter((segment) => segment.length > 0);
  if (segments.includes("..")) {
    return true;
  }
  const first = segments[0];
  return first !== undefined && /^[A-Za-z]:$/.test(first);
}

function handleRequest(req: IncomingMessage, res: ServerResponse, serveRoot: string): void {
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
    // Traversal guard #1, evaluated on the decoded path BEFORE
    // `path.normalize` can collapse the evidence away. See
    // `looksLikeFilesystemEscape` for why the post-normalization
    // containment check is not sufficient once the SPA fallback exists.
    if (looksLikeFilesystemEscape(decoded)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    // Defense-in-depth: collapse backslashes to forward slashes BEFORE
    // calling `path.normalize`. On POSIX `path.normalize("..\\..\\etc")`
    // treats backslashes as literal filename characters, so a
    // URL-encoded `..\..\etc\passwd` payload would normalize to a
    // single literal filename inside `serveRoot`. Guard #1 above already
    // rejects that payload; normalising slashes keeps the containment
    // check platform-independent for anything that gets this far.
    const slashNormalised = decoded.replace(/\\/g, "/");
    const normalised = path.normalize(slashNormalised).replace(/^[\\/]+/, "");
    const candidate = path.resolve(serveRoot, normalised);
    // Path-traversal guard: candidate MUST stay inside serveRoot.
    const rootWithSep = serveRoot.endsWith(path.sep) ? serveRoot : serveRoot + path.sep;
    if (candidate !== serveRoot && !candidate.startsWith(rootWithSep)) {
      res.statusCode = 403;
      res.end("forbidden");
      return;
    }
    const servable = resolveServablePath(candidate, serveRoot, req);
    if (servable === null) {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", contentTypeFor(servable));
    // HEAD carries the headers of the equivalent GET and no body (RFC 9110
    // §9.3.2). `isDocumentRequest` admits HEAD alongside GET so a HEAD probe
    // against an SPA route resolves through the same index.html fallback;
    // piping the file would answer that probe with a body it must not have.
    if ((req.method ?? "GET").toUpperCase() === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(servable);
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

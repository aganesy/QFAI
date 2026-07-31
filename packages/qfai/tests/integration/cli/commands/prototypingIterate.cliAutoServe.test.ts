/**
 * `iterate --auto-serve` CLI flag wiring + default in-process HTTP server runner.
 *
 * 7 `it` blocks pin the deferred Phase 2 follow-up:
 *   (1) CLI flag parses: `parseArgs(["prototyping","iterate","--auto-serve",...])`
 *       sets `options.prototypingAutoServe === true`.
 *   (2) Threading: `--auto-serve` invocation reaches `runPrototypingIterate`
 *       with `autoServe: true` (verified via DI hook capturing the call).
 *   (3) Default-runner fallback: when `autoServe: true` and `serverRunner`
 *       is omitted, iterate dynamically loads the default runner module
 *       which spins up an in-process HTTP server; the deferred sentinel
 *       error is GONE.
 *   (4) No-server default preserved: without `--auto-serve`, no HTTP
 *       server is spawned (DI runner not invoked).
 *   (5) DI priority preserved: when serverRunner is injected, the
 *       default runner module is NOT loaded.
 *   (6) 2-second teardown bound (NFR-0106): teardown promise resolves
 *       within 2000ms of being invoked.
 *   (7) Foreign-process refusal: when port is already in use, the
 *       default runner returns `{ ok: false, reason: /already in use/i }`
 *       and runPrototypingIterate returns exit 2.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { parseArgs } from "../../../../src/cli/lib/args.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-autoserve-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const CANONICAL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "audience:",
  '  emotion: ["confident comparison"]',
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand",
  "",
  "Restrained.",
  "",
].join("\n");

async function seedMinimal(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), CANONICAL_DESIGN_MD, "utf-8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01 Spec — t\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

describe("iterate --auto-serve: (1) CLI flag parses", () => {
  it("parseArgs sets options.prototypingAutoServe=true when --auto-serve is present", () => {
    const parsed = parseArgs(
      ["prototyping", "iterate", "--cycle", "0", "--auto-serve"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("iterate");
    expect(parsed.options.prototypingCycle).toBe(0);
    expect(parsed.options.prototypingAutoServe).toBe(true);
  });

  it("parseArgs leaves prototypingAutoServe undefined when --auto-serve is absent", () => {
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "0"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAutoServe).toBeUndefined();
  });
});

describe("iterate --auto-serve: (2) threading via injected serverRunner reaches the runner", () => {
  it("invokes serverRunner when autoServe=true is passed", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const teardown = vi.fn(async () => {});
    const runner = vi.fn(async () => ({ ok: true, teardown }) as const);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      serverRunner: runner,
    });
    expect(exit).toBe(0);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });
});

describe("iterate --auto-serve: (3) default runner fallback when serverRunner omitted", () => {
  it("dynamically loads defaultServerRunner; deferred sentinel error is gone", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      writes.push(String(c));
      return true;
    });
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c) => {
      writes.push(String(c));
      return true;
    });
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        autoServe: true,
      });
      const joined = writes.join("\n");
      // Sentinel string from the Phase 2 stub must be REPLACED.
      expect(joined).not.toMatch(/no default wiring yet/);
      // The default runner module must be importable (smoke test).
      const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
      expect(typeof mod.defaultServerRunner).toBe("function");
      // exit is a number (0 on successful spawn + teardown, 2 on
      // EADDRINUSE etc.).
      expect(typeof exit).toBe("number");
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

describe("iterate --auto-serve: (4) no-server default preserved (DR-0012-0029 / DR-0012-0031)", () => {
  it("does not invoke serverRunner when autoServe flag is absent", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const runner = vi.fn();
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      serverRunner: runner,
    });
    expect(exit).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });
});

describe("iterate --auto-serve: (5) DI priority preserved", () => {
  it("when serverRunner is injected, the injected runner is used (not the default module)", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    let injectedCalled = false;
    const teardown = vi.fn(async () => {});
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      autoServe: true,
      serverRunner: async () => {
        injectedCalled = true;
        return { ok: true, teardown } as const;
      },
    });
    expect(exit).toBe(0);
    expect(injectedCalled).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
  });
});

describe("iterate --auto-serve: (6) 2-second teardown bound (NFR-0106)", () => {
  it("default runner teardown resolves within 2000ms", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
    const result = await mod.defaultServerRunner({ root, cycle: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const started = Date.now();
    await Promise.race([
      result.teardown(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("teardown exceeded 2s budget")), 2000),
      ),
    ]);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("iterate --auto-serve: (7a) defaultServerRunner path-traversal — Windows edge cases", () => {
  // PR #210 wave-Batch-C — verifies that the path-traversal guard in
  // `defaultServerRunner` correctly rejects platform-specific traversal
  // shapes (Windows drive-letter `C:\...` and UNC `\\server\share\...`)
  // in addition to the URL-decoded `../../etc/passwd` POSIX shape.
  //
  // Why test via HTTP rather than the function directly: the guard is
  // applied inside `handleRequest`, which is only reachable via an HTTP
  // request. `path.resolve` is platform-aware; on POSIX, drive-letter
  // input is treated as a relative segment (`C:\Windows\system32\config\sam`
  // becomes a literal file name) which the `startsWith` check still
  // contains within `serveRoot` — that's the safety property we want to
  // pin. On Windows, drive-letter input would absolutise and the guard
  // would catch the escape. UNC input on POSIX is similarly contained.
  // In all cases the request must NOT return 200 with the contents of a
  // file outside the iter-NN dir; 403 / 404 are both acceptable
  // (`existsSync` may legitimately return false for the contained path).

  it("rejects URL-encoded Windows drive-letter traversal (C:\\Windows\\system32\\config\\sam)", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
    // Pre-create the serve dir so the runner can bind.
    await mkdir(path.join(root, ".qfai", "prototypes", "iter-00"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "prototypes", "iter-00", "index.html"),
      "<html>iter-00</html>",
      "utf-8",
    );
    const result = await mod.defaultServerRunner({ root, cycle: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    try {
      const port = await (async (): Promise<number> => {
        // The runner returns a teardown handle but not its port.
        // DEFAULT_AUTO_SERVE_PORT is exported; use it.
        return mod.DEFAULT_AUTO_SERVE_PORT;
      })();
      // URL-encode `C:\Windows\system32\config\sam` so it survives the
      // HTTP URL parsing; `decodeURIComponent` inside the runner
      // expands it before the path-traversal check.
      const encoded = encodeURIComponent("C:\\Windows\\system32\\config\\sam");
      const status = await new Promise<number>((resolve, reject) => {
        import("node:http")
          .then(({ get }) => {
            const req = get(`http://127.0.0.1:${port}/${encoded}`, (res) => {
              // Drain the body so the socket can close cleanly.
              res.on("data", () => {});
              res.on("end", () => resolve(res.statusCode ?? 0));
            });
            req.on("error", reject);
          })
          .catch(reject);
      });
      // Status MUST be one of the rejection codes (403 / 404 / 400).
      // 200 would indicate the guard let a file outside serveRoot
      // through.
      expect([400, 403, 404]).toContain(status);
    } finally {
      await result.teardown();
    }
  });

  it("rejects URL-encoded UNC path traversal (\\\\server\\share\\secret)", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
    await mkdir(path.join(root, ".qfai", "prototypes", "iter-00"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "prototypes", "iter-00", "index.html"),
      "<html>iter-00</html>",
      "utf-8",
    );
    const result = await mod.defaultServerRunner({ root, cycle: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    try {
      const port = mod.DEFAULT_AUTO_SERVE_PORT;
      const encoded = encodeURIComponent("\\\\server\\share\\secret");
      const status = await new Promise<number>((resolve, reject) => {
        import("node:http")
          .then(({ get }) => {
            const req = get(`http://127.0.0.1:${port}/${encoded}`, (res) => {
              res.on("data", () => {});
              res.on("end", () => resolve(res.statusCode ?? 0));
            });
            req.on("error", reject);
          })
          .catch(reject);
      });
      expect([400, 403, 404]).toContain(status);
    } finally {
      await result.teardown();
    }
  });
});

describe("iterate --auto-serve: (7b) SPA fallback must not answer traversal payloads", () => {
  // The SPA fallback answers a document request for a missing path with
  // `index.html` + 200. `path.normalize` collapses `/../../etc/passwd`
  // into a path that IS inside serveRoot, so the containment guard alone
  // never fires and the fallback would turn a rejected traversal attempt
  // into a 200 — a regression against the pre-fallback 404.
  //
  // Two independent conditions keep that from happening, and the cases below
  // cover both:
  //   1. `looksLikeFilesystemEscape` rejects the payload with a 403 before
  //      resolution runs, so a traversal request never reaches the fallback
  //      regardless of its headers. This is the primary guard.
  //   2. The `Accept: text/html` condition in `isDocumentRequest`, which keeps
  //      a non-document request (`http.get` sends no `Accept`) on the 404 path
  //      even if it did reach resolution.
  // Asserting only through guard 1 would leave the header condition untested,
  // so the browser-shaped probes below exercise it explicitly.

  type Probe = { status: number; body: string };

  async function probe(port: number, urlPath: string, accept?: string): Promise<Probe> {
    const { get } = await import("node:http");
    return new Promise<Probe>((resolve, reject) => {
      const req = get(
        {
          host: "127.0.0.1",
          port,
          path: urlPath,
          ...(accept ? { headers: { accept } } : {}),
        },
        (res) => {
          let body = "";
          res.setEncoding("utf-8");
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on("error", reject);
    });
  }

  async function headProbe(port: number, urlPath: string, accept?: string): Promise<Probe> {
    const { request } = await import("node:http");
    return new Promise<Probe>((resolve, reject) => {
      const req = request(
        {
          method: "HEAD",
          host: "127.0.0.1",
          port,
          path: urlPath,
          ...(accept ? { headers: { accept } } : {}),
        },
        (res) => {
          let body = "";
          res.setEncoding("utf-8");
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on("error", reject);
      req.end();
    });
  }

  async function withServer(fn: (port: number) => Promise<void>): Promise<void> {
    const root = await newTempDir();
    await seedMinimal(root);
    const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
    await mkdir(path.join(root, ".qfai", "prototypes", "iter-00"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai", "prototypes", "iter-00", "index.html"),
      "<html>iter-00</html>",
      "utf-8",
    );
    const result = await mod.defaultServerRunner({ root, cycle: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    try {
      await fn(mod.DEFAULT_AUTO_SERVE_PORT);
    } finally {
      await result.teardown();
    }
  }

  it("rejects GET /..%2f..%2fetc/passwd with Accept: text/html as 403, not an index.html 200", async () => {
    await withServer(async (port) => {
      const res = await probe(port, "/..%2f..%2fetc/passwd", "text/html,application/xhtml+xml");
      expect(res.status).toBe(403);
      expect(res.body).not.toContain("iter-00");
    });
  });

  it("rejects the same payload without the Accept header too", async () => {
    await withServer(async (port) => {
      expect((await probe(port, "/..%2f..%2fetc/passwd")).status).toBe(403);
    });
  });

  it("rejects an encoded backslash payload and a drive-qualified path", async () => {
    await withServer(async (port) => {
      const backslash = await probe(port, "/..%5C..%5Cetc%5Cpasswd", "text/html");
      expect(backslash.status).toBe(403);
      const drive = await probe(port, "/C:/Windows/system32/config/sam", "text/html");
      expect(drive.status).toBe(403);
    });
  });

  it("still serves index.html for a legitimate client-side route", async () => {
    await withServer(async (port) => {
      const res = await probe(port, "/pairs/BTCUSD", "text/html,application/xhtml+xml");
      expect(res.status).toBe(200);
      expect(res.body).toContain("iter-00");
    });
  });

  it("still 404s a missing sub-resource that does not accept text/html", async () => {
    await withServer(async (port) => {
      expect((await probe(port, "/assets/app.css", "text/css,*/*;q=0.1")).status).toBe(404);
    });
  });

  it("answers HEAD with the GET status and no body", async () => {
    // `isDocumentRequest` admits HEAD so a HEAD probe against a client-side
    // route resolves through the same index.html fallback as GET. HEAD must
    // carry the headers of that GET and no body (RFC 9110 §9.3.2), so piping
    // the file would answer the probe with content it must not have.
    await withServer(async (port) => {
      const route = await headProbe(port, "/pairs/BTCUSD", "text/html,application/xhtml+xml");
      expect(route.status).toBe(200);
      expect(route.body).toBe("");

      const root = await headProbe(port, "/index.html", "text/html");
      expect(root.status).toBe(200);
      expect(root.body).toBe("");

      // The non-200 paths already end() without a body; pin them so a future
      // change cannot start writing one.
      expect((await headProbe(port, "/assets/app.css", "text/css")).status).toBe(404);
      expect((await headProbe(port, "/..%2f..%2fetc/passwd", "text/html")).status).toBe(403);
    });
  });
});

describe("iterate --auto-serve: (7) foreign-process refusal on EADDRINUSE", () => {
  it("default runner returns {ok:false, reason:/already in use/i} when port is busy, iterate exits 2", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    // Pre-bind a listener on an ephemeral port and pin its address so
    // the default runner sees EADDRINUSE.
    const blocker: Server = createServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", () => resolve());
    });
    const address = blocker.address();
    if (!address || typeof address !== "object") {
      blocker.close();
      throw new Error("could not bind blocker to ephemeral port");
    }
    const busyPort = address.port;
    const stderrChunks: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((c) => {
      stderrChunks.push(String(c));
      return true;
    });
    try {
      const mod = await import("../../../../src/core/prototyping/defaultServerRunner.js");
      const result = await mod.defaultServerRunner({
        root,
        cycle: 0,
        port: busyPort,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toMatch(/already in use/i);

      // Threading through iterate with a runner that wraps the default
      // (simulating the same EADDRINUSE result) must yield exit 2.
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        autoServe: true,
        serverRunner: async () => result,
      });
      expect(exit).toBe(2);
      expect(stderrChunks.join("")).toMatch(/already in use/i);
    } finally {
      stderrSpy.mockRestore();
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });
});

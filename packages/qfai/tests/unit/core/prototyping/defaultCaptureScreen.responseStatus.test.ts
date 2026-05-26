/**
 * defaultCaptureScreen HTTP response-status guard (Codex P1 wave-13).
 *
 * Playwright's page.goto resolves with a Response object (not throws)
 * on HTTP 4xx/5xx, so the runner MUST inspect the response and reject
 * non-2xx as a capture failure. Otherwise an error page would
 * silently become recorded prototyping evidence.
 *
 * The runner has no DI on playwright's Page itself; we exercise the
 * branches by stubbing the dynamic import via vi.mock and feeding
 * controlled response shapes.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { defaultCaptureScreen } from "../../../../src/core/prototyping/defaultCaptureScreen.js";

type StubPage = {
  goto: ReturnType<typeof vi.fn>;
  screenshot: ReturnType<typeof vi.fn>;
  content: ReturnType<typeof vi.fn>;
};

function makeStubPage(gotoReturn: { status: () => number } | null): StubPage {
  return {
    goto: vi.fn().mockResolvedValue(gotoReturn),
    screenshot: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue("<html></html>"),
  };
}

function makeStubModule(page: StubPage): { chromium: { launch: () => Promise<unknown> } } {
  return {
    chromium: {
      launch: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(page),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    },
  };
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-capture-response-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("defaultCaptureScreen — HTTP response-status guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("ACCEPTS a 200 OK response and writes PNG/HTML", async () => {
    const dir = await newTempDir();
    const page = makeStubPage({ status: () => 200 });
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "ok",
      url: "http://localhost/ok",
      pngPath: path.join(dir, "ok.png"),
      htmlPath: path.join(dir, "ok.html"),
    });
    expect(result.ok).toBe(true);
    expect(page.screenshot).toHaveBeenCalledTimes(1);
    const html = await readFile(path.join(dir, "ok.html"), "utf-8");
    expect(html).toBe("<html></html>");
  });

  it("REJECTS a 404 Not Found response with reason mentioning the status", async () => {
    const dir = await newTempDir();
    const page = makeStubPage({ status: () => 404 });
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "missing",
      url: "http://localhost/missing",
      pngPath: path.join(dir, "missing.png"),
      htmlPath: path.join(dir, "missing.html"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/HTTP 404/);
    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it("REJECTS a 500 Internal Server Error response", async () => {
    const dir = await newTempDir();
    const page = makeStubPage({ status: () => 500 });
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "boom",
      url: "http://localhost/boom",
      pngPath: path.join(dir, "boom.png"),
      htmlPath: path.join(dir, "boom.html"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/HTTP 500/);
    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it("REJECTS a null response (no navigation occurred)", async () => {
    const dir = await newTempDir();
    const page = makeStubPage(null);
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "nullresp",
      url: "http://localhost/x",
      pngPath: path.join(dir, "x.png"),
      htmlPath: path.join(dir, "x.html"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/no response/);
    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it("ACCEPTS a 204 No Content response (still 2xx)", async () => {
    const dir = await newTempDir();
    const page = makeStubPage({ status: () => 204 });
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "nocontent",
      url: "http://localhost/x",
      pngPath: path.join(dir, "x.png"),
      htmlPath: path.join(dir, "x.html"),
    });
    expect(result.ok).toBe(true);
  });

  it("REJECTS a 399 redirect that did not resolve (boundary just below 400 is OK)", async () => {
    const dir = await newTempDir();
    const page = makeStubPage({ status: () => 399 });
    vi.doMock("playwright", () => makeStubModule(page));
    const result = await defaultCaptureScreen({
      screenId: "redir",
      url: "http://localhost/x",
      pngPath: path.join(dir, "x.png"),
      htmlPath: path.join(dir, "x.html"),
    });
    expect(result.ok).toBe(true);
  });
});

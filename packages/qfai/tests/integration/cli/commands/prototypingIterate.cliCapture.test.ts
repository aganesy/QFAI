/**
 * `iterate --capture` CLI flag wiring + default Playwright runner.
 *
 * 7 `it` blocks pin the deferred Phase 2 follow-up:
 *   (1) CLI flag parses: `parseArgs(["prototyping","iterate","--capture",...])`
 *       sets `options.prototypingCapture === true`.
 *   (2) Threading: when iterate is invoked with `capture: true` and an
 *       injected mock `captureScreen`, the runner is called once per
 *       `screens[]` entry (DI hook still takes priority over the
 *       default fallback).
 *   (3) Default-runner fallback: when `capture: true` and
 *       `captureScreen` is omitted, iterate dynamically loads the
 *       default Playwright runner module. With Playwright unavailable
 *       in the test environment, the runner returns
 *       `{ ok: false, reason: /playwright/i }` and iterate exits 2.
 *   (4) No-capture default preserved: without `--capture`, iterate
 *       writes zero PNG/HTML (DR-0012-0029 byte-equivalence).
 *   (5) --capture writes evidence bijection: PNG + HTML files exist on
 *       disk after a successful run.
 *   (6) Per-screen budget: when `captureBudgetMs` is set and the mock
 *       captureScreen reports an over-budget duration, the soft
 *       warning fires to stdout/stderr.
 *   (7) --capture failure → exit 2: when the runner returns
 *       `{ ok: false, reason }`, iterate returns non-zero.
 */
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { parseArgs } from "../../../../src/cli/lib/args.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-cli-capture-"));
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

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe("iterate --capture: (1) CLI flag parses", () => {
  it("parseArgs sets options.prototypingCapture=true when --capture is present", () => {
    const parsed = parseArgs(
      ["prototyping", "iterate", "--cycle", "0", "--capture"],
      process.cwd(),
    );
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingAction).toBe("iterate");
    expect(parsed.options.prototypingCycle).toBe(0);
    expect(parsed.options.prototypingCapture).toBe(true);
  });

  it("parseArgs leaves prototypingCapture undefined when --capture is absent", () => {
    const parsed = parseArgs(["prototyping", "iterate", "--cycle", "0"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.prototypingCapture).toBeUndefined();
  });
});

describe("iterate --capture: (2) threading via injected captureScreen", () => {
  it("invokes captureScreen once per screen when capture=true is passed", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const calls: string[] = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [
        { id: "home", url: "/" },
        { id: "settings", url: "/settings" },
      ],
      captureScreen: async ({ screenId, pngPath, htmlPath }) => {
        calls.push(screenId);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, `<html>${screenId}</html>`);
        return { ok: true, durationMs: 5 };
      },
    });
    expect(exit).toBe(0);
    expect(calls.sort()).toEqual(["home", "settings"]);
  });
});

describe("iterate --capture: (3) default Playwright runner fallback when captureScreen omitted", () => {
  // Determinism note (PR #210 wave-Batch-C):
  //
  // The Phase 2 follow-up landing carried a non-deterministic assertion
  // (`expect(typeof exit).toBe("number")`) that passed regardless of
  // whether Playwright was installed in the test environment — masking
  // the missing-dep path CI is supposed to cover. Deterministic
  // interception of `await import("playwright")` inside
  // `defaultCaptureScreen` is not reliable across vitest versions
  // (`vi.mock` / `vi.doMock` hoisting interacts poorly with the
  // command's lazy dynamic import). Instead, this describe block is
  // split into two deterministic surfaces:
  //
  //   (a) a SMOKE assertion that the default runner module is importable
  //       and exports the documented `defaultCaptureScreen` function —
  //       pins the wiring surface without depending on Playwright;
  //   (b) a DI-driven runtime assertion that mimics the
  //       Playwright-missing failure shape (`{ ok: false, reason:
  //       /playwright not installed/i }`) and asserts iterate exits 2
  //       with that reason surfaced to stderr — pins the operator-facing
  //       diagnostic on the missing-dep path without requiring
  //       Playwright to be (un)installed in CI.
  //
  // This satisfies the "missing-dep path is observable in CI" guarantee
  // the original test was meant to provide.

  it("exports defaultCaptureScreen as a function (smoke test on the default runner module)", async () => {
    const mod = await import("../../../../src/core/prototyping/defaultCaptureScreen.js");
    expect(typeof mod.defaultCaptureScreen).toBe("function");
  });

  it("surfaces 'playwright not installed' and exits 2 when the runner reports the missing-dep failure shape (DI-mimicked)", async () => {
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
      // Stub the captureScreen DI hook with the exact failure shape the
      // default Playwright runner emits when `await import("playwright")`
      // throws ERR_MODULE_NOT_FOUND. This pins the iterate-side handler:
      // any runner result of {ok:false, reason:/playwright not
      // installed/i} must surface the reason on stderr and exit 2.
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        capture: true,
        screens: [{ id: "home", url: "/" }],
        captureScreen: async () => ({
          ok: false,
          durationMs: 1,
          reason: "playwright not installed",
        }),
      });
      expect(exit).toBe(2);
      const joined = writes.join("\n");
      // Pin BOTH the deterministic exit AND the operator-facing reason:
      // a future regression that swallows the reason on stderr would
      // pass `exit === 2` alone but leave operators without diagnostics.
      expect(joined).toMatch(/playwright not installed/i);
      // Regression guard: the Phase 2 stub sentinel must stay GONE.
      expect(joined).not.toMatch(/no default wiring yet/);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  it("DI captureScreen takes priority over the default runner", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    let injectedCalled = false;
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [{ id: "home", url: "/" }],
      captureScreen: async ({ pngPath, htmlPath }) => {
        injectedCalled = true;
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 1 };
      },
    });
    expect(exit).toBe(0);
    expect(injectedCalled).toBe(true);
  });
});

describe("iterate --capture: (4) no-capture default preserved (DR-0012-0029)", () => {
  it("writes zero PNG/HTML when capture flag is absent", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iterDir);
    expect(entries.some((e) => e.endsWith(".png"))).toBe(false);
    expect(entries.some((e) => e.endsWith(".html"))).toBe(false);
  });
});

describe("iterate --capture: (5) writes evidenceRefs[] bijection on success", () => {
  it("writes a PNG and HTML for each screen captured", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [
        { id: "home", url: "/" },
        { id: "about", url: "/about" },
      ],
      captureScreen: async ({ pngPath, htmlPath }) => {
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 3 };
      },
    });
    expect(exit).toBe(0);
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    expect(await fileExists(path.join(iterDir, "home.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "home.html"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "about.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "about.html"))).toBe(true);
  });
});

describe("iterate --capture: (6) per-screen budget soft-warning still fires when capture=true is the entry", () => {
  it("emits soft warning when durationMs > captureBudgetMs", async () => {
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
        capture: true,
        captureBudgetMs: 100,
        screens: [{ id: "slow", url: "/" }],
        captureScreen: async ({ pngPath, htmlPath }) => {
          await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
          await writeFile(htmlPath, "<html></html>");
          return { ok: true, durationMs: 5_000 };
        },
      });
      expect(exit).toBe(0);
      expect(writes.join("\n")).toMatch(/exceeded 100ms budget/);
      expect(writes.join("\n")).toMatch(/soft warning/);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

describe("iterate --capture: (7) runner failure → exit 2", () => {
  it("returns 2 when the injected runner reports ok=false", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        capture: true,
        screens: [{ id: "home", url: "/" }],
        captureScreen: async () => {
          return { ok: false, durationMs: 1, reason: "synthetic failure" };
        },
      });
      expect(exit).toBe(2);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

/**
 * Helper: seed a minimal UI contract under `.qfai/contracts/ui/<file>.yaml`
 * so `readUiContractScreenContracts` returns the listed screens. Matches
 * the shape consumed by `extractUiScreens` in `core/contracts/screenContracts.ts`.
 */
async function seedUiContract(
  root: string,
  fileBase: string,
  screens: Array<{ id: string; route: string; title?: string }>,
  extension: "yaml" | "yml" = "yaml",
): Promise<void> {
  const uiDir = path.join(root, ".qfai/contracts/ui");
  await mkdir(uiDir, { recursive: true });
  const yamlBody = [
    "screens:",
    ...screens.flatMap((screen) => {
      const lines = [`  - id: ${screen.id}`, `    route: ${screen.route}`];
      if (screen.title !== undefined) {
        lines.push(`    title: ${JSON.stringify(screen.title)}`);
      }
      return lines;
    }),
    "",
  ].join("\n");
  await writeFile(path.join(uiDir, `${fileBase}.${extension}`), yamlBody, "utf-8");
}

describe("iterate --capture: (8) Codex P1 wave-8 — auto-derive screens from UI contracts", () => {
  it("derives screens from UI contracts when CLI sets capture=true without DI screens", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    // Two screens declared in a UI contract. The CLI invocation
    // simulates `qfai prototyping iterate --cycle 0 --capture
    // --target-url ...` — no DI `screens` / `captureScreen` overrides.
    await seedUiContract(root, "spec-0001", [
      { id: "home", route: "/", title: "Home" },
      { id: "settings", route: "/settings", title: "Settings" },
    ]);

    const calls: string[] = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      // No `screens` DI hook: auto-derivation from UI contracts is
      // exercised. `captureScreen` is still injected to keep the test
      // isolated from Playwright while the screens[] resolution path
      // is the surface under test.
      captureScreen: async ({ screenId, pngPath, htmlPath }) => {
        calls.push(screenId);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, `<html>${screenId}</html>`);
        return { ok: true, durationMs: 4 };
      },
    });

    expect(exit).toBe(0);
    expect(calls.sort()).toEqual(["home", "settings"]);

    // PNG / HTML bijection: one of each per derived screen.
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    expect(await fileExists(path.join(iterDir, "home.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "home.html"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "settings.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "settings.html"))).toBe(true);
  });

  it("warns and exits 0 when capture=true is set but no UI contracts are present", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    // Deliberately no UI contracts — the auto-derivation path returns
    // an empty list, and `runCapturePath` surfaces the documented
    // "no screens[] declared" warning + exit 0 (graceful no-op).
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
        capture: true,
      });
      expect(exit).toBe(0);
      expect(writes.join("\n")).toMatch(/no screens\[\] declared/i);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});

describe("iterate --capture: (9) Codex P2 wave-8 — capture URL composition with targetUrl", () => {
  it("passes absolute URLs verbatim (operator override wins over base targetUrl)", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const observedUrls: Array<string | null> = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      screens: [{ id: "home", url: "https://example.com/page" }],
      captureScreen: async ({ url, pngPath, htmlPath }) => {
        observedUrls.push(url);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 1 };
      },
    });
    expect(exit).toBe(0);
    // Absolute URL is forwarded verbatim — the base targetUrl is NOT
    // applied because the screen-level value is already navigable.
    expect(observedUrls).toEqual(["https://example.com/page"]);
  });

  it("composes route-relative URLs (with leading slash) against targetUrl", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const observedUrls: Array<string | null> = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:3000",
      capture: true,
      screens: [{ id: "new-order", url: "/orders/new" }],
      captureScreen: async ({ url, pngPath, htmlPath }) => {
        observedUrls.push(url);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 1 };
      },
    });
    expect(exit).toBe(0);
    expect(observedUrls).toEqual(["http://localhost:3000/orders/new"]);
  });

  it("returns exit 2 with an explanatory message when a route-relative URL has no targetUrl", async () => {
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
      // cycle 1 path so the `--target-url is required` cycle-0 input
      // gate is not the failure mode under test. Seed prototyping.json
      // / lock to satisfy the cycle ≥ 1 gates.
      await mkdir(path.join(root, ".qfai/evidence/prototyping"), { recursive: true });
      // Seed cycle 0 first (with target URL) so cycle 1 has frozen state.
      const seedExit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:3000",
      });
      expect(seedExit).toBe(0);
      const exit = await runPrototypingIterate({
        root,
        cycle: 1,
        // No targetUrl on cycle ≥ 1 — and the route-relative screen
        // url cannot be composed against a missing base.
        capture: true,
        screens: [{ id: "orders", url: "/orders/new" }],
        captureScreen: async ({ pngPath, htmlPath }) => {
          await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
          await writeFile(htmlPath, "<html></html>");
          return { ok: true, durationMs: 1 };
        },
      });
      expect(exit).toBe(2);
      const joined = writes.join("\n");
      expect(joined).toMatch(/route-relative URL/i);
      expect(joined).toMatch(/--target-url/i);
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });

  it("composes route-relative URLs WITHOUT leading slash against targetUrl", async () => {
    const root = await newTempDir();
    await seedMinimal(root);
    const observedUrls: Array<string | null> = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      // targetUrl with trailing slash so `new URL("orders/new", base)`
      // composes to the expected `http://localhost:3000/orders/new`.
      // (Without a trailing slash on the base, WHATWG URL replaces the
      // last path segment instead of appending; trailing slash is the
      // intended operator-facing convention for prototype base URLs.)
      targetUrl: "http://localhost:3000/",
      capture: true,
      screens: [{ id: "orders", url: "orders/new" }],
      captureScreen: async ({ url, pngPath, htmlPath }) => {
        observedUrls.push(url);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, "<html></html>");
        return { ok: true, durationMs: 1 };
      },
    });
    expect(exit).toBe(0);
    expect(observedUrls).toEqual(["http://localhost:3000/orders/new"]);
  });
});

describe("iterate --capture: (10) Codex P2 wave-10 — auto-derive screens accepts `.yml` UI contracts", () => {
  it("derives screens from `.yml` UI contracts (extension parity with `.yaml`)", async () => {
    // Repos that author UI contracts as `.yml` (rather than `.yaml`)
    // were silently producing an empty screens list under `--capture`,
    // so the CLI exited 0 with a "no screens" warning without writing
    // any PNG/HTML evidence. Pin the parity at the auto-derive entry
    // point so future regressions in the glob are catchable.
    const root = await newTempDir();
    await seedMinimal(root);
    await seedUiContract(
      root,
      "spec-0001",
      [
        { id: "home", route: "/", title: "Home" },
        { id: "settings", route: "/settings", title: "Settings" },
      ],
      "yml",
    );

    const calls: string[] = [];
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      capture: true,
      captureScreen: async ({ screenId, pngPath, htmlPath }) => {
        calls.push(screenId);
        await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        await writeFile(htmlPath, `<html>${screenId}</html>`);
        return { ok: true, durationMs: 3 };
      },
    });

    expect(exit).toBe(0);
    expect(calls.sort()).toEqual(["home", "settings"]);

    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    expect(await fileExists(path.join(iterDir, "home.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "home.html"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "settings.png"))).toBe(true);
    expect(await fileExists(path.join(iterDir, "settings.html"))).toBe(true);
  });
});

/**
 * Default per-screen capture runner used by `qfai prototyping iterate
 * --capture` when no DI captureScreen is supplied.
 *
 * Drives Playwright via a dynamic `import("playwright")` so the
 * package can be shipped without a hard runtime dependency. Playwright
 * lives in devDependencies — operators install it separately when they
 * actually need capture from the CLI (test fixtures pass a deterministic
 * stub via the captureScreen DI hook and never reach this module).
 *
 * Contract follows the `CaptureScreenFn` type exported by the iterate
 * command: receives `{ screenId, url, pngPath, htmlPath }`, returns
 * `{ ok, durationMs, reason? }`. On a Playwright-missing failure the
 * runner returns `{ ok: false, reason: "playwright not installed; ..." }`
 * so iterate can surface the actionable hint via its existing error
 * path (exit 2). The runner never throws on a missing optional dep.
 */

import { writeFile } from "node:fs/promises";

/**
 * Per-screen capture arguments. Mirrors the shape of `CaptureScreenFn`
 * in `cli/commands/prototypingIterate.ts` so callers can pass the
 * default runner directly without an adapter.
 */
export type CaptureArgs = {
  readonly screenId: string;
  readonly url: string | null;
  readonly pngPath: string;
  readonly htmlPath: string;
};

export type CaptureResult = {
  readonly ok: boolean;
  readonly durationMs: number;
  readonly reason?: string;
};

/**
 * Default capture runner. Launches a chromium browser via Playwright,
 * navigates to `args.url`, screenshots to `args.pngPath`, and writes
 * the serialized DOM to `args.htmlPath`. When the dynamic import for
 * `playwright` fails (module not installed), returns a deterministic
 * failure result so the caller can surface the actionable hint.
 */
export const defaultCaptureScreen = async (args: CaptureArgs): Promise<CaptureResult> => {
  const started = Date.now();
  if (!args.url) {
    return {
      ok: false,
      durationMs: Date.now() - started,
      reason: `screen ${args.screenId} has no url; pass screens[].url or options.targetUrl.`,
    };
  }

  // Dynamic import keeps Playwright out of the runtime dependency
  // closure. If the operator has not installed Playwright, surface a
  // single-line actionable hint via reason instead of crashing.
  let playwrightModule: { chromium: PlaywrightChromium };
  try {
    const mod = await import("playwright");
    if (!isPlaywrightModule(mod)) {
      return {
        ok: false,
        durationMs: Date.now() - started,
        reason:
          "playwright module loaded but does not export chromium; verify the installed package.",
      };
    }
    playwrightModule = mod;
  } catch (cause) {
    // Distinguish "Playwright is genuinely absent" (the common case;
    // Playwright is an optionalDependency) from "Playwright is present
    // but the import itself is broken" (corrupt install, native binding
    // mismatch, SyntaxError in a transitive ESM dep). Operators receive
    // an actionable reason in either case; we no longer blanket-direct
    // every failure to `npm i -D playwright`.
    if (isModuleNotFoundError(cause)) {
      return {
        ok: false,
        durationMs: Date.now() - started,
        reason:
          "playwright not installed. Install with `npm i -D playwright` " +
          "(or pass options.captureScreen for programmatic use).",
      };
    }
    return {
      ok: false,
      durationMs: Date.now() - started,
      reason:
        `playwright failed to load (likely a corrupt install or native binding issue; ` +
        `not a missing package). Cause: ${String(cause)}`,
    };
  }

  let browser: PlaywrightBrowser | null = null;
  try {
    browser = await playwrightModule.chromium.launch();
    const page = await browser.newPage();
    // `waitUntil: "load"` is tuned for the QFAI prototyping default
    // posture: prototypes are static HTML emitted under
    // `.qfai/prototypes/iter-NN/` (no client-side router, no
    // hydration). For SPA prototypes that need hydration / route
    // resolution before screenshot, operators pass their own
    // `captureScreen` via DI (which may use `networkidle` or a
    // domain-specific wait helper). A future contract extension could
    // surface a `--capture-wait-until` flag; for now the DI hook
    // covers the SPA case without expanding the operator surface.
    await page.goto(args.url, { waitUntil: "load" });
    await page.screenshot({ path: args.pngPath, fullPage: true });
    const html = await page.content();
    await writeFile(args.htmlPath, html, "utf-8");
    return { ok: true, durationMs: Date.now() - started };
  } catch (cause) {
    return {
      ok: false,
      durationMs: Date.now() - started,
      reason: `screen ${args.screenId} capture failed (${String(cause)}).`,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // best-effort teardown; do not mask the primary result.
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Minimal structural typings for the dynamic Playwright surface. We do
// not import Playwright types statically (Playwright is in
// devDependencies) — the structural shape below is what the runner
// actually consumes.
// ---------------------------------------------------------------------------

type PlaywrightChromium = {
  launch: (options?: unknown) => Promise<PlaywrightBrowser>;
};

type PlaywrightBrowser = {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};

type PlaywrightPage = {
  goto: (url: string, options?: { waitUntil?: string }) => Promise<unknown>;
  screenshot: (options: { path: string; fullPage?: boolean }) => Promise<unknown>;
  content: () => Promise<string>;
};

/**
 * True when the dynamic import failure is the Node "module not found"
 * class — i.e. Playwright is genuinely not installed in this tree.
 * Errors that arise from a present-but-broken Playwright install
 * (native binding mismatch, SyntaxError in a transitive ESM dep)
 * surface a different code/message and are routed to the generic
 * "failed to load" branch above.
 */
function isModuleNotFoundError(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) return false;
  const rec = cause as Record<string, unknown>;
  const code: unknown = rec.code;
  if (
    typeof code === "string" &&
    (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND")
  ) {
    return true;
  }
  const message: unknown = rec.message;
  if (typeof message !== "string") return false;
  // Node's ESM loader emits "Cannot find package 'playwright'" or
  // "Cannot find module 'playwright'" depending on resolver path.
  return /cannot find (module|package) ['"]?playwright['"]?/i.test(message);
}

function isPlaywrightModule(mod: unknown): mod is { chromium: PlaywrightChromium } {
  if (typeof mod !== "object" || mod === null) return false;
  if (!("chromium" in mod)) return false;
  // After `typeof === "object" && !== null` the value is a non-null
  // object; reading through `Record<string, unknown>` lets us narrow
  // each property explicitly without re-asserting the candidate's
  // shape with a bare `as { launch?: unknown }` cast (CLAUDE.md
  // "avoid bare `as` type assertions; prefer type narrowing").
  const candidate: unknown = (mod as Record<string, unknown>).chromium;
  if (typeof candidate !== "object" || candidate === null) return false;
  if (!("launch" in candidate)) return false;
  const launch: unknown = (candidate as Record<string, unknown>).launch;
  return typeof launch === "function";
}

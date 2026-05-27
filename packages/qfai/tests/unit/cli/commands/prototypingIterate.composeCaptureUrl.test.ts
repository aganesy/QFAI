/**
 * Direct unit tests for `composeCaptureUrl`.
 *
 * PR #210 wave-10 reviewer feedback (MINOR): the helper is exported
 * from `prototypingIterate.ts` for testability but the wave-8 / wave-9
 * landings only exercised it indirectly through the integration test
 * harness (`prototypingIterate.cliCapture.test.ts`). The export then
 * surfaces in `dist/*.d.ts` as a public API. Two ways to reconcile the
 * surface: (a) add direct unit tests so the export is justified by
 * direct contract coverage; (b) drop the export. Path (a) is taken
 * here — the helper is reused under non-trivial composition rules and
 * pinning the rules at the unit level removes the integration-only
 * coupling.
 *
 * Six branches cover every composition arm:
 *   1. absolute URL passthrough (`http://` / `https://`);
 *   2. route-relative URL + targetUrl (leading slash);
 *   3. route-relative URL + targetUrl (no leading slash, trailing
 *      slash on base — WHATWG URL semantics);
 *   4. route-relative URL + no targetUrl → `{ ok: false, reason }`
 *      with the operator-facing `--target-url` flag named;
 *   5. undefined screen URL → `targetUrl` (or `null`) fallback;
 *   6. unparseable URL composition (`new URL(...)` throws inside the
 *      try/catch) → `{ ok: false, reason }` with the operator-facing
 *      `--target-url=` flag named (NOT the internal `targetUrl=`
 *      field name). Added in PR #210 wave-12 to pin the operator
 *      surface of the catch branch.
 */
import { describe, expect, it } from "vitest";

import { composeCaptureUrl } from "../../../../src/cli/commands/prototypingIterate.js";

describe("composeCaptureUrl — direct unit coverage", () => {
  it("forwards absolute https:// URLs verbatim (operator override wins over base)", () => {
    const result = composeCaptureUrl("https://example.com/page", "http://localhost:5173");
    expect(result).toEqual({ ok: true, url: "https://example.com/page" });
  });

  it("forwards absolute http:// URLs verbatim", () => {
    const result = composeCaptureUrl("http://example.com/page", "http://localhost:5173");
    expect(result).toEqual({ ok: true, url: "http://example.com/page" });
  });

  it("composes a leading-slash route-relative URL against targetUrl", () => {
    const result = composeCaptureUrl("/orders/new", "http://localhost:3000");
    expect(result).toEqual({ ok: true, url: "http://localhost:3000/orders/new" });
  });

  it("composes a no-leading-slash route-relative URL against a trailing-slash base", () => {
    // WHATWG URL: without a trailing slash on the base, the last path
    // segment is replaced. Operator-facing convention for prototype
    // base URLs uses a trailing slash so `orders/new` appends as a
    // child segment rather than replacing the existing one.
    const result = composeCaptureUrl("orders/new", "http://localhost:3000/");
    expect(result).toEqual({ ok: true, url: "http://localhost:3000/orders/new" });
  });

  it("returns ok=false with the operator-facing flag named when a route-relative URL has no targetUrl", () => {
    const result = composeCaptureUrl("/orders/new", undefined);
    expect(result.ok).toBe(false);
    if (result.ok) {
      // Discriminant guard: this `if (result.ok) throw` structurally
      // narrows `result` to the `ok: false` arm on the falling-through
      // branch, so the subsequent `result.reason` access type-checks.
      // The `expect` above guarantees we never actually throw at
      // runtime; the guard exists for the TypeScript narrowing.
      throw new Error("expected ok=false");
    }
    expect(result.reason).toMatch(/route-relative URL/);
    // Operator-facing flag (`--target-url`) MUST appear in the reason;
    // the internal options field name (`options.targetUrl`) MUST NOT.
    expect(result.reason).toMatch(/--target-url/);
    expect(result.reason).not.toMatch(/options\.targetUrl/);
  });

  it("falls back to targetUrl when screen URL is undefined", () => {
    const result = composeCaptureUrl(undefined, "http://localhost:5173");
    expect(result).toEqual({ ok: true, url: "http://localhost:5173" });
  });

  it("falls back to null when both screen URL and targetUrl are undefined", () => {
    const result = composeCaptureUrl(undefined, undefined);
    expect(result).toEqual({ ok: true, url: null });
  });

  it("returns ok=false with the operator-facing flag named when URL composition throws", () => {
    // `new URL(":::", "not-a-base")` throws (`:::` is not a valid URL
    // and `"not-a-base"` is not a valid absolute base) — the catch
    // branch surfaces both args verbatim in the reason string. This
    // pins the operator-facing flag rename of the catch branch
    // (`--target-url=` instead of the internal `targetUrl=` field
    // name), which is the part the wave-10 diff explicitly changed.
    const result = composeCaptureUrl(":::", "not-a-base");
    expect(result.ok).toBe(false);
    if (result.ok) {
      // Discriminant guard: narrows `result` to the `ok: false` arm
      // so `result.reason` type-checks below. The expect above
      // guarantees we never throw at runtime.
      throw new Error("expected ok=false");
    }
    expect(result.reason).toMatch(/unparseable URL composition/);
    expect(result.reason).toMatch(/--target-url=/);
    // Internal field name MUST NOT leak.
    expect(result.reason).not.toMatch(/targetUrl="/);
  });
});

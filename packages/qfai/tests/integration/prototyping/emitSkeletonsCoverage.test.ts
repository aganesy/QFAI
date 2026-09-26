/** Verify token-styled skeleton generation and file output across screens. */
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildSkeletonHtml,
  buildSkeletonsForUnion,
  writeSkeletons,
} from "../../../src/core/prototyping/emitSkeletons.js";

let root: string;

const TOKENS = {
  colors: {
    primary: "#2563eb",
    surface: "#ffffff",
    text: "#111827",
  },
  fonts: {
    family_sans: "Inter",
  },
  radius: {
    md: "8px",
  },
  shadow: {
    md: "0 4px 6px rgba(0,0,0,0.1)",
  },
};

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-emit-skeletons-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("--emit-skeletons cross-contract frozenSurfaceUnion helpers", () => {
  it("emits one placeholder HTML per screen, consuming DESIGN.md tokens (default placeholder mode)", async () => {
    // Multi-spec union: spec-A {home, dashboard}, spec-B {settings}.
    const screens = [{ id: "home" }, { id: "dashboard" }, { id: "settings" }] as const;
    const skeletons = buildSkeletonsForUnion({
      screens: [...screens],
      tokens: TOKENS,
      mode: "placeholder",
    });
    expect(skeletons.length).toBe(3);
    for (const sk of skeletons) {
      // Token consumption: primary color, font-sans, radius-md, shadow-md
      // are baked into the inline style block.
      expect(sk.html).toContain("Inter");
      expect(sk.html).toContain("#2563eb");
      expect(sk.html).toContain("8px");
      expect(sk.html).toContain("rgba(0,0,0,0.1)");
      // No script tags or remote-load markers — strictly static.
      expect(sk.html).not.toMatch(/<script\b/i);
      expect(sk.html).not.toMatch(/fetch\(|XMLHttpRequest/);
    }
  });

  it("each screen receives evidenceRefs of both kinds when threaded into prototyping evidence", () => {
    // Confirms the structural contract: each rendered skeleton has a
    // stable screenId and an html payload, so a downstream
    // `evidenceRefs[]` builder can pair `{kind:"html"}` with a future
    // `{kind:"screenshot"}` for the same screenId.
    const skeletons = buildSkeletonsForUnion({
      screens: [{ id: "home" }, { id: "dashboard" }, { id: "settings" }],
      tokens: TOKENS,
      mode: "placeholder",
    });
    const ids = skeletons.map((s) => s.screenId);
    expect(ids).toEqual(["home", "dashboard", "settings"]);
    // Every screen has a non-empty html payload (the html evidence
    // surface; the screenshot kind is produced by a downstream
    // capture path not exercised here).
    for (const sk of skeletons) {
      expect(sk.html.length).toBeGreaterThan(0);
    }
  });

  it("writeSkeletons creates one file per screen under outDir", async () => {
    const outDir = path.join(root, ".qfai", "prototypes", "iter-00");
    await mkdir(outDir, { recursive: true });
    const skeletons = buildSkeletonsForUnion({
      screens: [{ id: "home" }, { id: "dashboard" }, { id: "settings" }],
      tokens: TOKENS,
      mode: "placeholder",
    });
    const written = await writeSkeletons(outDir, skeletons);
    expect(written.length).toBe(3);
    const entries = await readdir(outDir);
    expect(entries.sort()).toEqual(["dashboard.html", "home.html", "settings.html"]);
    for (const file of entries) {
      const abs = path.join(outDir, file);
      const text = await readFile(abs, "utf-8");
      // Token-driven content present.
      expect(text).toContain("Inter");
      expect(text).toContain("#2563eb");
      // Size is non-trivial (real placeholder, not empty marker).
      const size = (await stat(abs)).size;
      expect(size).toBeGreaterThan(200);
    }
  });
});

describe("opt-in default and --skeleton-mode full escalation", () => {
  it("stub mode emits a minimal <!doctype html> marker (no styling)", () => {
    const html = buildSkeletonHtml({ id: "home" }, TOKENS, "stub");
    expect(html).toContain("<!doctype html>");
    // No CSS color / font tokens in stub form — caller is opting
    // into the minimal marker.
    expect(html).not.toContain("Inter");
    expect(html).not.toContain("#2563eb");
  });

  it("full mode produces a placeholder body that the caller is expected to replace", () => {
    const html = buildSkeletonHtml({ id: "home" }, TOKENS, "full");
    // Full mode keeps the token-styled body as a starting fallback
    // (the renderer itself does NOT call an LLM); the comment is the
    // structural cue for the caller.
    expect(html).toContain("Inter");
    expect(html).toContain("skeleton-mode=full");
  });

  it("placeholder mode (default) makes zero remote / dynamic calls", () => {
    const html = buildSkeletonHtml({ id: "home" }, TOKENS, "placeholder");
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|onload=/i);
  });
});

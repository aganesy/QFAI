import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { JUSTIFICATION_CATALOG } from "../../src/core/validators/justificationCatalog.js";

// Anchored to this file, not to `process.cwd()`: a runner launched from the
// repo root would resolve `src/` to a path that does not exist and the walk
// below would scan nothing, passing vacuously.
// tests/validators/<this file> -> tests -> packages/qfai
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const srcRoot = path.join(packageRoot, "src");

/**
 * Catalog codes whose only emitter lives outside the published package
 * (`package.json#files` ships `dist` + `assets`, never `scripts/`), so the
 * rule is enforced in this repository's own lint lane and is NOT evaluated by
 * `qfai validate` in a consuming project.
 *
 * The catalog itself compiles into `dist` and reaches consumers, so an entry
 * here MUST say so in its `description` — otherwise the catalog advertises a
 * rule the consumer never gets. `descriptionMarkers` pins that disclosure.
 *
 * This map is a declaration, not permission to add more: a NEW catalog code
 * with no `src/` emitter fails the first test until it is either given one or
 * listed here with the matching description text. Porting a code into a real
 * validator means deleting its entry here — the third assertion fails if a
 * listed code gains a `src/` emitter.
 */
const REPO_LOCAL_EMITTERS = new Map<
  string,
  { readonly emitter: string; readonly descriptionMarkers: readonly RegExp[] }
>([
  [
    "R-PACK-LOCATION-DRIFT",
    {
      emitter: path.join("scripts", "check-pack-locations.mjs"),
      descriptionMarkers: [/no emitter in the published package/i, /ci:lint/],
    },
  ],
]);

async function collectTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Files under `src/` that mention `code`, excluding the catalog SSOT itself. */
async function emittersFor(code: string): Promise<string[]> {
  const files = await collectTsFiles(srcRoot);
  const hits: string[] = [];
  for (const file of files) {
    if (path.basename(file) === "justificationCatalog.ts") continue;
    const text = await readFile(file, "utf8");
    if (text.includes(code)) hits.push(path.relative(packageRoot, file));
  }
  return hits;
}

describe("justification catalog: every code ships with its emitter, or says it does not", () => {
  it("does not publish `scripts/` — repo-local emitters cannot reach a consumer", async () => {
    const raw = await readFile(path.join(packageRoot, "package.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const files =
      typeof parsed === "object" && parsed !== null && "files" in parsed ? parsed.files : undefined;
    expect(Array.isArray(files)).toBe(true);
    const entries = Array.isArray(files) ? files : [];
    for (const entry of entries) {
      expect(typeof entry).toBe("string");
      expect(String(entry).replace(/^\.\//, "").split("/")[0]).not.toBe("scripts");
    }
  });

  it("every catalog code has an emitter under src/, or is declared repo-local", async () => {
    for (const entry of JUSTIFICATION_CATALOG) {
      if (REPO_LOCAL_EMITTERS.has(entry.code)) continue;
      const hits = await emittersFor(entry.code);
      expect(hits, `${entry.code} has no emitter under src/`).not.toHaveLength(0);
    }
  });

  it("every repo-local code discloses its limited scope in the shipped description", async () => {
    for (const [code, declared] of REPO_LOCAL_EMITTERS) {
      const entry = JUSTIFICATION_CATALOG.find((e) => e.code === code);
      expect(entry, `${code} is declared repo-local but is not a catalog code`).toBeDefined();
      const description = entry?.description ?? "";
      for (const marker of declared.descriptionMarkers) {
        expect(description, `${code} description must disclose ${String(marker)}`).toMatch(marker);
      }
    }
  });

  it("every repo-local code still points at a script that emits it, and has no src/ emitter", async () => {
    for (const [code, declared] of REPO_LOCAL_EMITTERS) {
      const script = await readFile(path.join(packageRoot, declared.emitter), "utf8");
      expect(script, `${declared.emitter} no longer emits ${code}`).toContain(code);
      const hits = await emittersFor(code);
      expect(
        hits,
        `${code} now has a src/ emitter — remove it from REPO_LOCAL_EMITTERS and drop the scope note from its description`,
      ).toHaveLength(0);
    }
  });
});

/**
 * Check layout review identifiers against the shipped registry.
 *
 * The reviewer records declared identifiers in `layoutAntiPatternsDetected[]`.
 * The story tree and CLI contracts point to the registry for that vocabulary.
 * This suite reads the registry and checks any concrete identifier cited in
 * those documents. A negative or historical example identifies the context
 * on the same line.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> tests -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const REGISTRY_REL = "packages/qfai/assets/validators/layoutAntiPatterns.json";

/** Where a stale identifier does damage: what a reviewer measures against. */
const SCANNED = [".qfai/spec/02_business-flow/**/*.md", ".qfai/spec/03_contract/cli/*.md"];

/** Decision records can cite historical identifiers. */
const EXEMPT_FILE = /(^\.qfai\/spec\/decisions\.md$)/;

/**
 * Elsewhere the exemption is per line, not per file: to cite an identifier the
 * registry does not declare, the same line says so. A negative fixture and a
 * record of a superseded list both need one, and a file-level pass would let
 * the next claim in that file through unread.
 */
const DISCLAIMED =
  /(earlier revision|no longer|retired|superseded|does not declare|not in the registry|undeclared|unknown|not declare)/i;

const LAP_ID_RE = /`(lap-[0-9a-z-]+)`/g;

async function declaredIds(): Promise<Set<string>> {
  const raw = await readFile(path.join(repoRoot, REGISTRY_REL), "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const entries: unknown = Array.isArray(parsed)
    ? parsed
    : ((parsed as Record<string, unknown>).entries ?? (parsed as Record<string, unknown>).patterns);
  const ids = new Set<string>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const id = (entry as Record<string, unknown>).id;
    if (typeof id === "string") ids.add(id);
  }
  return ids;
}

describe("the layout anti-pattern vocabulary is one list", () => {
  it("the registry declares at least one identifier", async () => {
    expect((await declaredIds()).size).toBeGreaterThan(0);
  });

  it("no spec or CLI contract cites an identifier the registry does not declare", async () => {
    const declared = await declaredIds();
    const files = await fg(SCANNED, { cwd: repoRoot, absolute: false, dot: true });
    expect(files.length, "the sweep must have found documents to be about").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const rel of files) {
      const posix = rel.replace(/\\/g, "/");
      if (EXEMPT_FILE.test(posix)) continue;
      const text = await readFile(path.join(repoRoot, rel), "utf-8");
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? "";
        for (const [, id] of line.matchAll(LAP_ID_RE)) {
          // `lap-*` is how a document refers to the vocabulary itself.
          if (id === undefined || id === "lap-" || id.endsWith("-")) continue;
          if (declared.has(id)) continue;
          if (DISCLAIMED.test(line)) continue;
          offenders.push(`${posix}:${i + 1}: ${id}`);
        }
      }
    }

    expect(offenders, "an identifier no registry entry declares").toEqual([]);
  });

  it("keeps the retired QFAI-PROT-025 code out of story-tree specs", async () => {
    const files = await fg([".qfai/spec/02_business-flow/**/*.md"], {
      cwd: repoRoot,
      absolute: false,
    });
    const offenders: string[] = [];
    for (const rel of files) {
      const posix = rel.replace(/\\/g, "/");
      if (EXEMPT_FILE.test(posix)) continue;
      const text = await readFile(path.join(repoRoot, rel), "utf-8");
      if (text.includes("QFAI-PROT-025")) offenders.push(posix);
    }

    expect(offenders, "story-tree files naming the retired code").toEqual([]);
  });
});

/**
 * No document may cite a `lap-*` identifier the registry does not declare.
 *
 * `layoutAntiPatternsDetected[]` is a closed vocabulary: `loadKnownLapIds`
 * reads it from one JSON file, and a token no entry declares is
 * `QFAI-PROT-002`. The specs and the CLI contracts named that vocabulary in
 * three places and no two agreed — one identifier out of eight was the same in
 * all three, and a spec whitelist rejected two identifiers the same spec
 * required the capture pass to emit.
 *
 * Writing the list out is what let that happen, so the rule now is that a
 * document names the registry rather than copying it. A citation of one
 * identifier is still allowed — an example needs a concrete token — and this
 * sweep is what keeps such a citation honest.
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
const SCANNED = [".qfai/specs/**/*.md", ".qfai/contracts/cli/*.md"];

/**
 * Two documents exist to record what an identifier used to be, so naming a
 * retired one there is the point rather than a defect.
 */
const EXEMPT_FILE = /(^\.qfai\/decisions\/|09_delta\.md$)/;

/**
 * Elsewhere the exemption is per line, not per file: to cite an identifier the
 * registry does not declare, the same line says so. A negative fixture and a
 * record of a superseded list both need one, and a file-level pass would let
 * the next claim in that file through unread.
 */
const DISCLAIMED =
  /(earlier revision|no longer|retired|superseded|does not declare|not in the registry)/i;

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
    // A zero here would make every other row below pass by finding nothing.
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

  it("the spec names the finding code the validator actually reports", async () => {
    // `QFAI-PROT-025` was specified for an unregistered token and is emitted by
    // nothing. A consumer building against it waits for a code that never comes.
    const files = await fg([".qfai/specs/**/*.md"], { cwd: repoRoot, absolute: false });
    const offenders: string[] = [];
    for (const rel of files) {
      const posix = rel.replace(/\\/g, "/");
      if (EXEMPT_FILE.test(posix)) continue;
      const text = await readFile(path.join(repoRoot, rel), "utf-8");
      if (text.includes("QFAI-PROT-025")) offenders.push(posix);
    }

    expect(offenders, "a finding code no source emits").toEqual([]);
  });
});

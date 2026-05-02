/**
 * Integration: distributed surface leakage smoke.
 *
 * Runs `qfai init` into a temp dir and asserts that the resulting
 * filesystem contains zero QFAI-internal spec IDs, internal version
 * markers, internal trace IDs, or schemaVersion fields.
 *
 * Complements scripts/check-no-internal-version-leakage.sh by checking
 * the *output* of init (post-template-copy), not just the source assets.
 */
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-leakage-"));
  tempDirs.push(dir);
  return dir;
}

const PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "internal spec id (spec-0010+)", re: /spec-0(0[1-9][0-9]|[1-9][0-9]{2,})/g },
  { name: "internal version marker", re: /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b|\bv1\.x\b/g },
  {
    name: "internal trace id (CAP-0010+/DEC/DR/PROT2)",
    re: /\bCAP-0(0[1-9][0-9]|[1-9][0-9]{2,})\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b/g,
  },
  { name: "schemaVersion field", re: /"schemaVersion"|schemaVersion\s*:/g },
];

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".json",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".sh",
  ".ps1",
  ".html",
  ".css",
  ".txt",
]);

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

interface Hit {
  file: string;
  line: number;
  match: string;
  className: string;
}

describe("distributed surface leakage smoke", { timeout: 90000 }, () => {
  it("qfai init output contains no internal IDs or version markers", async () => {
    const tmpDir = await newTempDir();
    await captureStdout(() =>
      runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }),
    );

    const hits: Hit[] = [];
    for await (const file of walk(tmpDir)) {
      const ext = path.extname(file);
      if (!TEXT_EXTENSIONS.has(ext)) continue;
      const stats = await stat(file);
      if (stats.size > 1_000_000) continue;
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");
      const isPackageJson = path.basename(file) === "package.json";
      for (const { name, re } of PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? "";
          if (
            isPackageJson &&
            name === "internal version marker" &&
            /"version"\s*:/.test(line)
          ) {
            continue;
          }
          if (isPackageJson && name === "schemaVersion field") {
            continue;
          }
          re.lastIndex = 0;
          const m = re.exec(line);
          if (m) {
            hits.push({
              file: path.relative(tmpDir, file),
              line: i + 1,
              match: m[0],
              className: name,
            });
          }
        }
      }
    }

    if (hits.length > 0) {
      const report = hits
        .slice(0, 30)
        .map((h) => `  [${h.className}] ${h.file}:${h.line} -> ${h.match}`)
        .join("\n");
      throw new Error(
        `Distributed surface leakage detected in qfai init output (${hits.length} hits):\n${report}\n\n` +
          "Fix: remove the internal identifier from the originating asset under packages/qfai/assets/init/.",
      );
    }
    expect(hits).toEqual([]);
  });
});

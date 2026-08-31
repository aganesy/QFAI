/**
 * Integration: distributed surface leakage smoke.
 *
 * Runs `qfai init` into a temp dir and asserts that the resulting
 * filesystem contains zero QFAI-internal spec IDs, internal version
 * markers, internal trace IDs, or schemaVersion fields.
 *
 * Complements scripts/check-no-internal-version-leakage.sh by checking
 * the *output* of init (post-template-copy), not just the source assets.
 *
 * SSOT note (PR #206 review LtfD / Nv4N): the `PATTERNS` array below is
 * one of THREE semantically-equivalent expressions of the same forbidden
 * class set:
 *   1. `packages/qfai/scripts/lint-shipping.ts` `src-comment` rules
 *      (JS RegExp, pre-build, `src/*.ts` JSDoc scan).
 *   2. `packages/qfai/scripts/check-no-internal-version-leakage.sh`
 *      L21..L45 (POSIX ERE, post-build `dist/` scan).
 *   3. This file (JS RegExp, smoke against `qfai init` output).
 *
 * Updating one (e.g. tightening `INTERNAL_VERSION_RE` to a QFAI-context
 * pattern) requires updating ALL THREE in the same PR — Rule of Three
 * has been hit and a single source module is now a reasonable next
 * step, deferred from this PR. See `.agents/rules/distributed-surface.md`
 * "Defenses (4 layers)" for the layered defense overview.
 */
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "../helpers/stdout.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";

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
  // "10 and above" as a value, not as a list of digit shapes: any leading
  // zeros, then a non-zero digit and at least one more. Enumerating shapes is
  // what let `spec-9999` and `spec-00100` through different layers of the same
  // SSOT-synced set.
  { name: "internal spec id (spec-0010+)", re: /spec-0*[1-9][0-9]+/gi },
  { name: "internal version marker", re: /\bv[0-9]+\.[0-9]+(?:\.[0-9]+)?\b|\bv1\.x\b/g },
  {
    name: "internal trace id (CAP-0010+/DEC/DR/PROT2/OQ/CHG)",
    re: /\bCAP-0(0[1-9][0-9]|[1-9][0-9]{2,})\b|\bDEC-[0-9]{4}-[0-9]{4}\b|\bDR-[0-9]{4}\b|\bQFAI-PROT2-[0-9]+\b|\bOQ-[0-9]{4}-[0-9]{4}\b|\bCHG-[0-9]+\b/g,
  },
  { name: "schemaVersion field", re: /"schemaVersion"|schemaVersion\s*:/g },
];

/** Repo-relative rule-master paths cited by the generated agent instructions. */
const RULE_REFERENCE_RE = /\.agents\/rules\/[A-Za-z0-9._-]+\.md/g;

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

/**
 * Extensionless text files `qfai init` seeds. `path.extname(".gitkeep")` is
 * `""`, so an extension allowlist alone never reads them — the `.gitkeep`
 * bodies seeded for every assistant layer carry prose and are as much a
 * distributed surface as the `.md` files beside them.
 */
const TEXT_BASENAMES = new Set([".gitkeep", ".gitignore", ".gitattributes"]);

function isScannableTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file)) || TEXT_BASENAMES.has(path.basename(file));
}

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
    await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

    const hits: Hit[] = [];
    const visitedRelative: string[] = [];
    for await (const file of walk(tmpDir)) {
      visitedRelative.push(path.relative(tmpDir, file));
      if (!isScannableTextFile(file)) continue;
      const stats = await stat(file);
      if (stats.size > 1_000_000) continue;
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");
      const isPackageJson = path.basename(file) === "package.json";
      for (const { name, re } of PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? "";
          if (isPackageJson && name === "internal version marker" && /"version"\s*:/.test(line)) {
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

    // TC-1.5.1: DESIGN.md must be in the walked file list (guard against
    // accidental rename / exclusion of the root brand SSOT).
    expect(visitedRelative).toContain("DESIGN.md");
  });

  // TC-1.5.2: standalone DESIGN.md template scan against all 4 PATTERNS.
  it("DESIGN.md template alone has zero matches across all 4 forbidden patterns", async () => {
    const designMdPath = path.join(getInitAssetsDir(), "root", "DESIGN.md");
    const content = await readFile(designMdPath, "utf-8");
    const lines = content.split("\n");
    const hits: Array<{ pattern: string; line: number; match: string }> = [];
    for (const { name, re } of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        re.lastIndex = 0;
        const m = re.exec(line);
        if (m) {
          hits.push({ pattern: name, line: i + 1, match: m[0] });
        }
      }
    }
    if (hits.length > 0) {
      const report = hits
        .map((h) => `  [${h.pattern}] DESIGN.md:${h.line} -> ${h.match}`)
        .join("\n");
      throw new Error(
        `DESIGN.md template contains forbidden tokens (${hits.length} hits):\n${report}`,
      );
    }
    expect(hits).toEqual([]);
  });

  // The generated agent instruction files declare `.agents/rules/**` the
  // cross-AI SSOT. A consumer project has no other source for those files, so
  // every path they name must exist in the tree `qfai init` just produced —
  // otherwise the rules named as authoritative are unreadable by construction.
  it("every .agents/rules path cited by the generated instructions resolves", async () => {
    const tmpDir = await newTempDir();
    await captureStdout(() => runInit({ dir: tmpDir, force: false, dryRun: false, yes: true }));

    // Every entry point an agent loads on its own: Codex reads `AGENTS.md`,
    // Claude Code reads `CLAUDE.md`, Copilot reads its instructions file.
    // `.codex/README.md` is not auto-loaded, but it makes the same claim, so
    // its citations have to resolve too.
    const citingFiles = [
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      ".codex/README.md",
    ];
    const missing: string[] = [];

    for (const citing of citingFiles) {
      const citingPath = path.join(tmpDir, ...citing.split("/"));
      const content = await readFile(citingPath, "utf-8").catch(() => null);
      expect(content, `qfai init did not create ${citing}`).not.toBeNull();
      const cited = new Set(content?.match(RULE_REFERENCE_RE) ?? []);
      expect(cited.size, `${citing} cites no .agents/rules path`).toBeGreaterThan(0);
      for (const rulePath of cited) {
        const stats = await stat(path.join(tmpDir, ...rulePath.split("/"))).catch(() => null);
        if (!stats?.isFile()) {
          missing.push(`${citing} -> ${rulePath}`);
        }
      }
    }

    expect(
      missing,
      `dangling .agents/rules references in qfai init output:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});

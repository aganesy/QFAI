/**
 * Spec diff detector — identifies which specs have changed since last evidence.
 *
 * Sources:
 *   A) remote diff   (git diff baseBranch..HEAD)
 *   B) local diff     (git diff + git diff --staged)
 *   C) timestamp      (spec mtime vs evidence mtime)
 *   D) delta.md       (adopted entries referencing other specs)
 *   Policy            (_policies/ changes → all specs in scope)
 */
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "./config.js";
import { resolvePath } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpecDiffSource = "remote" | "local" | "timestamp" | "delta" | "policy";
export type SpecDiffStatus = "changed" | "stale" | "unchanged";

export type SpecDiffEntry = {
  specId: string;
  sources: SpecDiffSource[];
  status: SpecDiffStatus;
};

export type SpecDiffResult = {
  entries: SpecDiffEntry[];
  allSpecs: string[];
  fullScan: boolean;
};

export type SpecDiffOptions = {
  full?: boolean;
  baseBranch?: string;
};

// ---------------------------------------------------------------------------
// Stub implementations (to be filled via TDD)
// ---------------------------------------------------------------------------

// Canonical path: .qfai/specs/spec-XXXX — matches the fixed QFAI directory layout.
const SPEC_PATH_RE = /[/\\]specs[/\\](spec-\d{4})[/\\]/i;

export function extractSpecIdsFromPaths(paths: string[]): Set<string> {
  const ids = new Set<string>();
  for (const p of paths) {
    const m = SPEC_PATH_RE.exec(p);
    if (m?.[1]) {
      ids.add(m[1].toLowerCase());
    }
  }
  return ids;
}

export function detectSourceA(root: string, baseBranch: string): Promise<Set<string>> {
  const output = execFileSync("git", ["diff", "--name-only", `${baseBranch}..HEAD`], {
    cwd: root,
    encoding: "utf-8",
  });
  return Promise.resolve(extractSpecIdsFromPaths(output.split("\n").filter(Boolean)));
}

export function detectSourceB(root: string): Promise<Set<string>> {
  const unstaged = execFileSync("git", ["diff", "--name-only"], {
    cwd: root,
    encoding: "utf-8",
  });
  const staged = execFileSync("git", ["diff", "--name-only", "--staged"], {
    cwd: root,
    encoding: "utf-8",
  });
  const all = [...unstaged.split("\n"), ...staged.split("\n")].filter(Boolean);
  return Promise.resolve(extractSpecIdsFromPaths(all));
}

export async function detectSourceC(root: string, specsRoot: string): Promise<Set<string>> {
  const staleIds = new Set<string>();
  const evidenceDir = path.join(root, ".qfai", "evidence");

  let specDirs: string[];
  try {
    const entries = await readdir(specsRoot, { withFileTypes: true });
    specDirs = entries
      .filter((e) => e.isDirectory() && /^spec-\d{4}$/i.test(e.name))
      .map((e) => e.name);
  } catch {
    return staleIds;
  }

  for (const specName of specDirs) {
    const specDir = path.join(specsRoot, specName);
    const specId = specName.toLowerCase();

    // Find newest file mtime in the spec directory
    let newestSpecMtime = 0;
    try {
      const files = await readdir(specDir);
      for (const f of files) {
        const st = await stat(path.join(specDir, f));
        if (st.mtimeMs > newestSpecMtime) {
          newestSpecMtime = st.mtimeMs;
        }
      }
    } catch {
      continue;
    }

    // Find evidence file mtime
    let evidenceMtime = 0;
    let evidenceFound = false;
    const prefixes = ["implement", "prototyping"];
    for (const prefix of prefixes) {
      try {
        const st = await stat(path.join(evidenceDir, `${prefix}-${specId}.md`));
        evidenceFound = true;
        if (st.mtimeMs > evidenceMtime) {
          evidenceMtime = st.mtimeMs;
        }
      } catch {
        // evidence file not found — fine
      }
    }

    // Skip if no evidence file exists for this spec
    if (!evidenceFound) continue;

    if (newestSpecMtime > 0 && newestSpecMtime > evidenceMtime) {
      staleIds.add(specId);
    }
  }

  return staleIds;
}

const SPEC_ID_RE = /spec-\d{4}/gi;

export async function detectSourceD(specsRoot: string): Promise<Set<string>> {
  const ids = new Set<string>();

  let specDirs: string[];
  try {
    const entries = await readdir(specsRoot, { withFileTypes: true });
    specDirs = entries
      .filter((e) => e.isDirectory() && /^spec-\d{4}$/i.test(e.name))
      .map((e) => e.name);
  } catch {
    return ids;
  }

  for (const specName of specDirs) {
    const specDir = path.join(specsRoot, specName);

    // Look for delta.md candidates (09_delta.md)
    let deltaPath: string | undefined;
    try {
      const files = await readdir(specDir);
      const deltaFile = files.find((f) => /delta/i.test(f) && f.endsWith(".md"));
      if (deltaFile) {
        deltaPath = path.join(specDir, deltaFile);
      }
    } catch {
      continue;
    }

    if (!deltaPath) continue;

    let content: string;
    try {
      content = await readFile(deltaPath, "utf-8");
    } catch {
      continue;
    }

    // Extract "## Adopted" section
    const adoptedMatch = /^## Adopted\b.*$/im.exec(content);
    if (!adoptedMatch) continue;

    const afterAdopted = content.slice(adoptedMatch.index + adoptedMatch[0].length);
    // Stop at next H2 or end of file
    const nextH2 = /^## /m.exec(afterAdopted);
    const adoptedSection = nextH2 ? afterAdopted.slice(0, nextH2.index) : afterAdopted;

    for (const m of adoptedSection.matchAll(SPEC_ID_RE)) {
      ids.add(m[0].toLowerCase());
    }
  }

  return ids;
}

const POLICY_PATH_RE = /[/\\]_policies[/\\]/i;

export function detectPolicyChanges(root: string, baseBranch: string): Promise<boolean> {
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${baseBranch}..HEAD`], {
      cwd: root,
      encoding: "utf-8",
    });
    return Promise.resolve(output.split("\n").some((line) => POLICY_PATH_RE.test(line)));
  } catch {
    return Promise.resolve(false);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function detectSpecChanges(
  root: string,
  config: QfaiConfig,
  options?: SpecDiffOptions,
): Promise<SpecDiffResult> {
  const specsRoot = resolvePath(root, config, "specsDir");
  const baseBranch = options?.baseBranch ?? config.baseBranch ?? "origin/main";

  // Discover all specs
  let allSpecIds: string[];
  try {
    const dirs = await readdir(specsRoot, { withFileTypes: true });
    allSpecIds = dirs
      .filter((e) => e.isDirectory() && /^spec-\d{4}$/i.test(e.name))
      .map((e) => e.name.toLowerCase())
      .sort();
  } catch {
    allSpecIds = [];
  }

  // --full: skip detection, return all
  if (options?.full) {
    return {
      entries: allSpecIds.map((id) => ({
        specId: id,
        sources: [] as SpecDiffSource[],
        status: "changed" as SpecDiffStatus,
      })),
      allSpecs: allSpecIds,
      fullScan: true,
    };
  }

  // Collect from each source, tolerating git failures
  const sourceSets: { source: SpecDiffSource; ids: Set<string> }[] = [];
  let policyChanged = false;

  // Source A: remote diff
  try {
    const a = await detectSourceA(root, baseBranch);
    sourceSets.push({ source: "remote", ids: a });
  } catch {
    // git not available
  }

  // Source B: local diff
  try {
    const b = await detectSourceB(root);
    sourceSets.push({ source: "local", ids: b });
  } catch {
    // git not available
  }

  // Source C: timestamp
  const c = await detectSourceC(root, specsRoot);
  sourceSets.push({ source: "timestamp", ids: c });

  // Source D: delta.md
  const d = await detectSourceD(specsRoot);
  sourceSets.push({ source: "delta", ids: d });

  // Policy changes
  try {
    policyChanged = await detectPolicyChanges(root, baseBranch);
  } catch {
    // git not available
  }

  // Build union with source tracking
  const specSourceMap = new Map<string, Set<SpecDiffSource>>();

  for (const { source, ids } of sourceSets) {
    for (const id of ids) {
      let set = specSourceMap.get(id);
      if (!set) {
        set = new Set();
        specSourceMap.set(id, set);
      }
      set.add(source);
    }
  }

  // If policy changed, add all specs with "policy" source
  if (policyChanged) {
    for (const id of allSpecIds) {
      let set = specSourceMap.get(id);
      if (!set) {
        set = new Set();
        specSourceMap.set(id, set);
      }
      set.add("policy");
    }
  }

  // Fallback: if nothing detected, return all
  if (specSourceMap.size === 0) {
    return {
      entries: allSpecIds.map((id) => ({
        specId: id,
        sources: [] as SpecDiffSource[],
        status: "changed" as SpecDiffStatus,
      })),
      allSpecs: allSpecIds,
      fullScan: true,
    };
  }

  const entries: SpecDiffEntry[] = [...specSourceMap.entries()]
    .map(([specId, sources]) => ({
      specId,
      sources: [...sources] as SpecDiffSource[],
      status: (sources.has("timestamp") ? "stale" : "changed") as SpecDiffStatus,
    }))
    .sort((a, b) => a.specId.localeCompare(b.specId));

  return {
    entries,
    allSpecs: allSpecIds,
    fullScan: policyChanged,
  };
}

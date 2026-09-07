#!/usr/bin/env node
/* global console, process */
/**
 * gen-codex-agents.mjs
 *
 * Rewrites every `.codex/agents/<id>.toml` from the canonical agent body in
 * `.qfai/assistant/agents/<id>.md`, using the same renderer `qfai init` uses.
 *
 * `tests/integration/codexAgentWrappers.test.ts` asserts these files ARE
 * generator output — "not a hand-maintained tree: an edit that lands in the
 * canonical markdown and not here (or the reverse) fails this" — but nothing
 * in the repository produced them. `sync:ssot` covers
 * `packages/qfai/assets/init/.qfai/**` -> `.qfai/**` and stops there, and the
 * only other producer is `qfai init`, which cannot run in this root without
 * writing a pile of unrelated files. So the only ways to satisfy the test were
 * to hand-edit a file it says is not hand-edited, or to copy the expected bytes
 * out of its failure message (#1183).
 *
 * The markdown is the source; the TOML is derived. Runs after
 * `gen-agent-catalog.mjs` in the `sync:ssot` chain, because the kind of each
 * agent is read from the catalog that script rewrites.
 *
 * Usage:
 *   node scripts/gen-codex-agents.mjs          # rewrite and report
 *   node scripts/gen-codex-agents.mjs --check  # dry-run, exit 1 if stale
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The renderer is not in the package build, so it comes from `src/` — which
// imports its siblings as `./x.js`. See the hook's own docblock.
register("./lib/ts-specifier-hook.mjs", import.meta.url);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AGENTS_DIR = path.join(repoRoot, ".qfai", "assistant", "agents");
const CATALOG = path.join(repoRoot, ".qfai", "assistant", "manifest", "agent-catalog.yml");
const CODEX_DIR = path.join(repoRoot, ".codex", "agents");

const check = process.argv.includes("--check");

/** Normalized so a CRLF checkout does not read as drift. */
const lf = (text) => text.replace(/\r\n/g, "\n");

async function main() {
  const source = pathToFileURL(
    path.join(repoRoot, "packages", "qfai", "src", "core", "codexAgentToml.ts"),
  ).href;
  const { renderCodexAgentToml, parseAgentCatalogKinds } = await import(source);

  const kinds = parseAgentCatalogKinds(await readFile(CATALOG, "utf-8"));
  const existing = new Set(
    (await readdir(CODEX_DIR)).filter((name) => name.endsWith(".toml")).map((name) => name),
  );

  const stale = [];
  const skipped = [];
  let written = 0;

  for (const [name, kind] of kinds) {
    const canonical = await readFile(path.join(AGENTS_DIR, `${name}.md`), "utf-8");
    const rendered = renderCodexAgentToml(canonical, kind, name);
    if (!rendered.ok) {
      // A body the renderer declines is a defect in the markdown, not something
      // to paper over by leaving the previous TOML in place.
      skipped.push(`${name}: ${rendered.reason ?? "did not render"}`);
      continue;
    }
    const target = path.join(CODEX_DIR, `${name}.toml`);
    existing.delete(`${name}.toml`);
    const before = await readFile(target, "utf-8").catch(() => null);
    if (before !== null && lf(before) === rendered.toml) continue;
    stale.push(name);
    if (!check) {
      await writeFile(target, rendered.toml, "utf-8");
      written += 1;
    }
  }

  for (const orphan of existing) {
    // Reported, never deleted: the catalog is the roster, but removing a file
    // this script does not own is a bigger claim than "it is not generated".
    skipped.push(`${orphan}: no agent of that name in the catalog`);
  }

  for (const note of skipped) console.log(`skipped ${note}`);

  if (check) {
    if (stale.length > 0) {
      console.error(
        `gen-codex-agents: ${String(stale.length)} profile(s) differ from the canonical agents: ${stale.join(", ")}`,
      );
      console.error("Run `pnpm sync:ssot` and commit the result.");
      process.exit(1);
    }
    console.log(`gen-codex-agents: ${String(kinds.size)} profile(s) already current.`);
    return;
  }
  console.log(
    `gen-codex-agents: rewrote ${String(written)} of ${String(kinds.size)} profile(s) from the canonical agents.`,
  );
}

await main();

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * CLI contracts must not use a release version as their tracking mechanism.
 *
 * A note of the shape "NOT YET IMPLEMENTED in vX.Y.Z — scheduled for vA.B.C+"
 * expires silently: the only way to notice the deadline arrived is to diff the
 * contract against `packages/qfai/package.json#version`. `qfai-init.md` carried
 * two such notes (`--allow-dirty`, exit 65) whose target version shipped with
 * neither behaviour implemented. Either a contract describes what the code does
 * today, or it points at a tracking issue — never at a version number.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");
const CONTRACTS_DIR = path.join(ROOT, ".qfai", "contracts");

/** Deferral markers that pin a promise to a release rather than to an issue. */
const DEFERRAL_MARKERS: readonly RegExp[] = [
  /NOT YET IMPLEMENTED/i,
  /scheduled for v\d+\.\d+\.\d+/i,
];

async function collectFiles(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(full);
    }
  }
  return files;
}

describe("CLI contracts do not defer behaviour to a version number", () => {
  it("no contract carries a version-pinned deferral note", async () => {
    const files = await collectFiles(CONTRACTS_DIR, ".md");
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf-8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (DEFERRAL_MARKERS.some((marker) => marker.test(line))) {
          offenders.push(`${path.relative(ROOT, file).replace(/\\/g, "/")}:${index + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});

describe("qfai-init.md matches what --upgrade-assistant-tree actually does", () => {
  const contractPath = path.join(CONTRACTS_DIR, "cli", "qfai-init.md");
  const initSourcePath = path.join(ROOT, "packages", "qfai", "src", "cli", "commands", "init.ts");

  it("documents that the helper does not inspect the working tree, and no --allow-dirty exists", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");
    const args = await readFile(
      path.join(ROOT, "packages", "qfai", "src", "cli", "lib", "args.ts"),
      "utf-8",
    );

    // The contract must state the absence plainly, not promise a future flag.
    expect(contract).toMatch(/Working tree state is NOT inspected/);
    expect(contract).not.toMatch(/`--allow-dirty` is supplied/);

    // …and the source must actually still lack the flag and the probe. If
    // either is implemented, the contract above is the thing to update.
    expect(source).not.toMatch(/allowDirty|allow-dirty/);
    expect(source).not.toMatch(/status\s+--porcelain/);
    expect(args).not.toMatch(/allowDirty|allow-dirty/);
  });

  it("documents the catalog fallback instead of an unreachable exit 65", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    // The `--upgrade-assistant-tree` exit-code table must not promise a code
    // the helper cannot emit.
    const additional = contract.split("Exit codes (additional):")[1] ?? "";
    expect(additional).not.toMatch(/^\|\s*65\s*\|/m);
    expect(additional).toMatch(/catalog/);

    // The fallback the contract now documents is the classifier's last
    // statement; covered behaviourally by tests/cli/init.test.ts
    // ("leaves non-top-level migrations segments in catalog/").
    expect(source).toMatch(/return \{ layer: "catalog", subpath: posix \};/);
  });

  // The `catalog/` fallback only reaches files the helper actually walks, and
  // the pre-recut `manifest/` surface is deliberately not one of them (its path
  // is unchanged by the recut). A contract that promises "any legacy path" is
  // wrong for exactly the surface whose rationale it quotes.
  it("scopes the relocation to the surfaces runUpgradeAssistantTree walks", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`\.qfai\/assistant\/manifest\/\*` is \*\*not\*\* walked/);
    expect(source).toMatch(
      /const legacySurfaces: Array<\{ name: "steering" \| "instructions"; dir: string \}>/,
    );
  });

  // `report` prints copies as a count and enumerates paths only for skipped /
  // removed, so a contract cannot send the operator to a "copied-path list".
  it("does not point the operator at a copied-path list the run never prints", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).not.toMatch(/copied-path list/);
    // `--untracked-files=all` is required: the default `normal` mode collapses
    // a wholly-new directory into one `?? dir/` entry, which names no file.
    expect(contract).toMatch(/git status --short --untracked-files=all \.qfai\/assistant\//);
    expect(contract).not.toMatch(/git status --short \.qfai\/assistant\//);
    // …and the listing covers the whole invocation, because the init flow that
    // follows seeds into the same layers. The contract must not sell it as the
    // migration step's own rollback set.
    expect(contract).toMatch(/never the enclosing directory/);

    expect(source).toMatch(/info\(`\s+created: \$\{copied\.length\}`\)/);
    expect(source).not.toMatch(/copied paths:/);
  });

  // `--upgrade-assistant-tree` falls through into the ordinary init flow, which
  // rewrites the managed `.gitignore` block in place and (with `--force`, which
  // is not rejected alongside it) regenerates and deletes files. The contract
  // must scope "additive" to the migration step rather than to the invocation.
  it("separates the additive migration step from the init flow that follows it", async () => {
    const contract = await readFile(contractPath, "utf-8");
    const source = await readFile(initSourcePath, "utf-8");

    expect(contract).toMatch(/`ensureRootGitignoreEntries`/);
    expect(contract).toMatch(/`--force` is not rejected alongside `--upgrade-assistant-tree`/);

    // The non-additive step the contract now names really is on this path.
    expect(source).toMatch(/await ensureRootGitignoreEntries\(destRoot, options\.dryRun\)/);
  });
});

/**
 * A finding code documented with no emitter is the same failure mode as a
 * version-pinned deferral: the contract promises behaviour, nothing produces
 * it, and no mechanism notices. `E-WORKLOG-SECRET` sat in the delta table as a
 * security hard block that no validator raises, so the table is now checked
 * against the source that would have to emit each code.
 *
 * "Appears under src/" would not have caught it: a bare substring search is
 * satisfied by a JSDoc line, a prose comment, or a dead constant. The check
 * below instead demands a *reachable emission*: the code must reach a finding
 * constructor (or a CLI note the command prints), inside a module the runner
 * actually invokes. Pasting `E-WORKLOG-SECRET` into a comment or an unused
 * table no longer satisfies it.
 */

const SRC_DIR = path.join(ROOT, "packages", "qfai", "src");

/**
 * Drop whole-line comments and trailing `//` comments so a code mentioned in
 * prose cannot pass for behaviour. Line-oriented on purpose (same technique,
 * and same known limitation, as `scripts/lint-shipping.ts`): it can never eat
 * a statement, so a false pass is possible but a false failure is not.
 */
function stripComments(source: string): string {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trimStart();
      return !(trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*"));
    })
    .map((line) => line.replace(/(^|[^:"'`\\])\/\/.*$/, "$1"))
    .join("\n");
}

/** The code sitting inside a string literal — the only form an emitter can use. */
function literalRe(code: string): RegExp {
  return new RegExp(`["'\`]\\s*${code}\\b`);
}

describe("qfai-validate.md documents only finding codes the source can emit", () => {
  it("every code in the delta table is emitted by a validator the runner invokes", async () => {
    const contract = await readFile(path.join(CONTRACTS_DIR, "cli", "qfai-validate.md"), "utf-8");
    const section = contract.split("## New finding codes (this delta)")[1] ?? "";
    const table = section.split(/^## /m)[0] ?? "";

    const codes = [...table.matchAll(/^\|\s*`([A-Z]-[A-Z0-9-]+)`/gm)]
      .map((match) => match[1] ?? "")
      .filter((code) => code.length > 0);
    expect(codes.length).toBeGreaterThan(5);

    const sourceFiles = await collectFiles(SRC_DIR, ".ts");
    const sources = new Map<string, string>();
    await Promise.all(
      sourceFiles.map(async (file) => {
        const rel = path.relative(SRC_DIR, file).replace(/\\/g, "/");
        sources.set(rel, stripComments(await readFile(file, "utf-8")));
      }),
    );

    const runner = sources.get("core/validate.ts") ?? "";
    const cliEntry = sources.get("cli/main.ts") ?? "";
    expect(runner).not.toBe("");
    expect(cliEntry).not.toBe("");

    /** A validator module counts only if `core/validate.ts` calls one of its exports. */
    const runnerInvokes = (rel: string, body: string): boolean => {
      if (rel === "core/validate.ts") return true;
      const exported = [...body.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(
        (match) => match[1] ?? "",
      );
      return exported.some((name) => name.length > 0 && runner.includes(`${name}(root`));
    };

    /** A CLI module counts only if `cli/main.ts` imports it. */
    const cliDispatches = (rel: string): boolean => {
      if (!rel.startsWith("cli/commands/")) return false;
      const specifier = `./${rel.slice("cli/".length).replace(/\.ts$/, ".js")}`;
      return cliEntry.includes(specifier);
    };

    const emitters = new Map<string, string[]>();
    for (const code of codes) {
      const found: string[] = [];
      const literal = literalRe(code);
      for (const [rel, body] of sources) {
        if (!literal.test(body)) continue;

        // Shape 1 — the literal is the code argument of a finding.
        const direct =
          new RegExp(`issue\\(\\s*"${code}"`).test(body) ||
          new RegExp(`code:\\s*"${code}"`).test(body);
        // Shape 2 — the literal sits in a registered code table that the same
        // module feeds to `issue(code, …)` (e.g. ADVISORY_FAILING_CODES).
        const tableDriven = /issue\(\s*code[,\s)]/.test(body);
        if ((direct || tableDriven) && runnerInvokes(rel, body)) {
          found.push(`${rel} (${direct ? "issue-literal" : "issue-table"})`);
          continue;
        }

        // Shape 3 — a note the CLI command prints or collects for printing.
        if (cliDispatches(rel)) {
          const lines = body.split("\n");
          const printed = lines.some((line, index) => {
            if (!literal.test(line)) return false;
            const window = lines.slice(Math.max(0, index - 3), index + 1).join("\n");
            return /(?:push|info|warn|error|log)\(|=\s*[`"']/.test(window);
          });
          if (printed) found.push(`${rel} (cli-note)`);
        }
      }
      emitters.set(code, found);
    }

    const orphans = codes.filter((code) => (emitters.get(code) ?? []).length === 0);
    expect(orphans).toEqual([]);
  });

  it("rejects a code that only appears in a comment or a dead constant", async () => {
    // Guards the check above against regressing to `haystack.includes(code)`:
    // both of these are how `E-WORKLOG-SECRET` could have been smuggled back in.
    const mention = stripComments(
      ["// E-WORKLOG-SECRET is planned.", "/** E-WORKLOG-SECRET */", "const x = 1;"].join("\n"),
    );
    expect(literalRe("E-WORKLOG-SECRET").test(mention)).toBe(false);

    const deadConstant = stripComments('const PLANNED = ["E-WORKLOG-SECRET"];');
    expect(literalRe("E-WORKLOG-SECRET").test(deadConstant)).toBe(true);
    expect(/issue\(\s*"E-WORKLOG-SECRET"/.test(deadConstant)).toBe(false);
    expect(/issue\(\s*code[,\s)]/.test(deadConstant)).toBe(false);
  });
});

/**
 * No rule body loads at session start; a rule tied to files loads when one of
 * them is touched.
 *
 * Claude Code loads every file under `.claude/rules/` at launch unless it
 * carries a `paths` field, and then loads it only when a matching file is read
 * or edited. A link to a rule body placed directly in that directory would load
 * the whole body for every task, so the directory holds no file of its own.
 * What a rule tied to files needs is a short file under `scoped/` that names
 * the files and points at the body, which stays in `.agents/rules/`.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const RULES = path.join(ROOT, ".claude", "rules");
const SCOPED = path.join(RULES, "scoped");

interface Stub {
  readonly name: string;
  readonly paths: readonly string[];
  readonly body: string;
}

function parseStub(name: string, text: string): Stub {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (match === null) throw new Error(`${name} has no frontmatter`);
  const paths = [...(match[1] ?? "").matchAll(/^\s+-\s+"([^"]+)"\s*$/gm)].map((m) => m[1] ?? "");
  return { name, paths, body: match[2] ?? "" };
}

async function stubs(): Promise<Stub[]> {
  const names = (await readdir(SCOPED)).filter((entry) => entry.endsWith(".md")).sort();
  return Promise.all(
    names.map(async (name) => parseStub(name, await readFile(path.join(SCOPED, name), "utf-8"))),
  );
}

/** The part of a glob before its first wildcard, as a path that has to exist. */
function literalPrefix(glob: string): string {
  const wildcard = glob.search(/[*?[{]/);
  if (wildcard === -1) return glob;
  const prefix = glob.slice(0, wildcard);
  return prefix.endsWith("/") ? prefix.slice(0, -1) : path.posix.dirname(prefix);
}

describe("path-scoped rules", () => {
  it("leaves no file directly under .claude/rules/, so nothing loads at launch", async () => {
    const entries = await readdir(RULES, { withFileTypes: true });
    expect(
      entries.filter((entry) => !entry.isDirectory()).map((entry) => entry.name),
      "a file here loads for every task; put a rule tied to files under scoped/",
    ).toEqual([]);
  });

  it("has at least one scoped rule", async () => {
    expect((await stubs()).length).toBeGreaterThan(0);
  });

  it("names the files each scoped rule governs", async () => {
    for (const stub of await stubs()) {
      expect(stub.paths.length, `${stub.name} has no paths`).toBeGreaterThan(0);
    }
  });

  it("points each scoped rule at rule bodies that exist", async () => {
    for (const stub of await stubs()) {
      const cited = [...stub.body.matchAll(/`((?:\.agents\/rules\/)?[\w.-]+\.md)`/g)].map(
        (m) => m[1] ?? "",
      );
      const rules = cited.filter((file) => file.startsWith(".agents/rules/"));
      expect(rules.length, `${stub.name} cites no rule body`).toBeGreaterThan(0);
      for (const file of cited) {
        const stats = await stat(path.join(ROOT, file)).catch(() => undefined);
        expect(stats?.isFile(), `${stub.name} cites ${file}, which is not a file`).toBe(true);
      }
    }
  });

  it("names paths that exist, so a scope cannot match nothing", async () => {
    for (const stub of await stubs()) {
      for (const glob of stub.paths) {
        const prefix = literalPrefix(glob);
        const stats = await stat(path.join(ROOT, prefix)).catch(() => undefined);
        expect(stats, `${stub.name}: ${glob} names ${prefix}, which does not exist`).toBeDefined();
      }
    }
  });
});

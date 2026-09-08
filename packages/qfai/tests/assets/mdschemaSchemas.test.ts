/**
 * The shipped Markdown schemas and the SDD templates are one pair.
 *
 * `assets/mdschema/**` declares the shape of an SDD document;
 * `assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/**` is the
 * document an author starts from. If the two disagree, `qfai init` seeds a tree
 * that fails its own document lane on the first commit — the worst version of
 * this failure, because the adopter did nothing wrong.
 *
 * So the templates are the fixtures: every template is validated against the
 * schema that governs its path, and the manifest is checked for orphans in both
 * directions. That is what makes the schemas a contract about the templates
 * rather than a second, independent opinion about how a spec should look.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/assets -> tests -> packages/qfai -> packages -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCHEMA_ROOT = path.join(REPO_ROOT, "packages/qfai/assets/mdschema");
const MANIFEST = path.join(SCHEMA_ROOT, "manifest.yml");
const require_ = createRequire(import.meta.url);

/**
 * The checker's own JavaScript entry point, run through {@link process.execPath}.
 *
 * Not the `node_modules/.bin` shim. Node refuses to `spawnSync` a `.cmd` or
 * `.bat` without `shell: true`, and on Windows the shim beside the
 * extensionless name is exactly that — so spawning it there fails before the
 * checker runs, and every case below reports a schema violation that is really
 * an unspawned process. Passing `shell: true` instead would put every schema
 * and template path through a command-line parser for no gain.
 *
 * The entry point is read from the package's own `bin` field rather than
 * written out. Naming an internal file here would be the same guess as naming
 * the platform's shim: right until the package moves it, and silent when it
 * does.
 */
function resolveMdschemaCli(): string {
  const manifestPath = require_.resolve("@jackchuka/mdschema/package.json");
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf-8"));
  const bin =
    typeof manifest === "object" && manifest !== null && "bin" in manifest
      ? manifest.bin
      : undefined;
  const entry =
    typeof bin === "string"
      ? bin
      : typeof bin === "object" && bin !== null && "mdschema" in bin
        ? bin.mdschema
        : undefined;
  if (typeof entry !== "string") {
    throw new Error(`@jackchuka/mdschema declares no "mdschema" bin entry in ${manifestPath}`);
  }
  return path.resolve(path.dirname(manifestPath), entry);
}

const MDSCHEMA_CLI = resolveMdschemaCli();

/**
 * The packaged template tree, which is also what the repository root mirrors.
 *
 * Read from `assets/` rather than from `.qfai/`: `assets/` is what ships, and
 * the mirror is verified to be byte-identical by the SSOT sync gate.
 */
const TEMPLATE_ROOT = path.join(
  REPO_ROOT,
  "packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs",
);

interface ManifestEntry {
  id: string;
  schema: string;
  pattern: string;
  /** The content predicate that routes one path to two schemas, if any. */
  when?: string;
}

function readManifest(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  let current: Partial<ManifestEntry> = {};
  const flush = (): void => {
    if (current.id !== undefined && current.schema !== undefined && current.pattern !== undefined) {
      entries.push({
        id: current.id,
        schema: current.schema,
        pattern: current.pattern,
        ...(current.when !== undefined ? { when: current.when } : {}),
      });
    }
    current = {};
  };
  for (const raw of readFileSync(MANIFEST, "utf-8").split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    // The captures are narrowed rather than assigned straight through: a group
    // that did not participate reads as `undefined`, and under
    // `exactOptionalPropertyTypes` writing that into an optional field is not
    // the same as leaving the field out.
    const id = /^\s*-\s+id:\s*(.+?)\s*$/.exec(line)?.[1];
    if (id !== undefined) {
      flush();
      current = { id };
      continue;
    }
    const field = /^\s+(schema|pattern|when):\s*"?([^"\r\n]+?)"?\s*$/.exec(line);
    const value = field?.[2];
    if (value !== undefined && current.id !== undefined) {
      if (field?.[1] === "schema") {
        current.schema = value;
      } else if (field?.[1] === "when") {
        current.when = value;
      } else {
        current.pattern = value;
      }
    }
  }
  flush();
  return entries;
}

/** Every `*.mdschema.yml` under the schema root, schema-root-relative. */
function schemaFiles(): string[] {
  const out: string[] = [];
  for (const group of readdirSync(SCHEMA_ROOT, { withFileTypes: true })) {
    if (!group.isDirectory()) {
      continue;
    }
    for (const file of readdirSync(path.join(SCHEMA_ROOT, group.name))) {
      if (file.endsWith(".mdschema.yml")) {
        out.push(`${group.name}/${file}`);
      }
    }
  }
  return out.sort();
}

/**
 * The template a schema governs, or `undefined` when the schema covers a
 * document the template tree does not seed.
 *
 * The mapping is derived from the schema's own path rather than declared: a
 * declared second mapping is a second thing to keep true, and the file names are
 * already equal by construction (`spec/04_Business-Rules.mdschema.yml` governs
 * `spec/04_Business-Rules.md`).
 */
function templateFor(schemaRelative: string): string | undefined {
  const group = schemaRelative.startsWith("policies/") ? "_policies" : "spec";
  const base = path.basename(schemaRelative).replace(/\.mdschema\.yml$/, ".md");
  const candidate = path.join(TEMPLATE_ROOT, group, base);
  return existsSync(candidate) ? candidate : undefined;
}

const manifest = readManifest();
const schemas = schemaFiles();

describe("shipped Markdown schemas", () => {
  it("declares at least one document type", () => {
    // A manifest that parsed to nothing would make every check below vacuous:
    // zero entries iterate zero times and the suite reports green.
    expect(manifest.length).toBeGreaterThan(0);
    expect(schemas.length).toBeGreaterThan(0);
  });

  it("names a schema file that exists for every manifest entry", () => {
    const missing = manifest.filter((entry) => !existsSync(path.join(SCHEMA_ROOT, entry.schema)));

    expect(missing.map((entry) => `${entry.id} -> ${entry.schema}`)).toEqual([]);
  });

  it("has no schema file the manifest never references", () => {
    // An unreferenced schema is a rule nobody runs. It reads as coverage in a
    // directory listing and enforces nothing.
    const referenced = new Set(manifest.map((entry) => entry.schema));
    const orphans = schemas.filter((file) => !referenced.has(file));

    expect(orphans).toEqual([]);
  });

  it("gives every manifest entry a unique id", () => {
    const ids = manifest.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves at most one entry per pattern without a `when` predicate", () => {
    // The invariant is that no document is run against two contracts, with the
    // loser invisible in the summary. Two entries on one pattern are how a path
    // that carries two document shapes is expressed, and the predicate is what
    // partitions them — so a second UNPREDICATED entry is the state that
    // breaks it, not a repeated pattern.
    const byPattern = new Map<string, string[]>();
    for (const entry of manifest.filter((e) => e.when === undefined)) {
      byPattern.set(entry.pattern, [...(byPattern.get(entry.pattern) ?? []), entry.id]);
    }
    const contested = [...byPattern].filter(([, ids]) => ids.length > 1);

    expect(contested.map(([pattern, ids]) => `${pattern}: ${ids.join(", ")}`)).toEqual([]);
  });

  it("gives every predicated entry a pattern some other entry also carries", () => {
    // A `when:` on a pattern nothing else claims is a filter, not a route: the
    // documents it does not match are then checked by nothing at all, and the
    // gap reads in the summary exactly like a pack nobody has written yet.
    const patterns = manifest.map((entry) => entry.pattern);
    const stranded = manifest.filter(
      (entry) =>
        entry.when !== undefined &&
        patterns.filter((pattern) => pattern === entry.pattern).length < 2,
    );

    expect(stranded.map((entry) => `${entry.id}: ${entry.pattern}`)).toEqual([]);
  });

  it("gives every `when` predicate a valid regular expression", () => {
    const broken = manifest
      .filter((entry) => entry.when !== undefined)
      .filter((entry) => {
        try {
          new RegExp(entry.when ?? "", "mu");
          return false;
        } catch {
          return true;
        }
      });

    expect(broken.map((entry) => `${entry.id}: ${entry.when ?? ""}`)).toEqual([]);
  });

  it("roots every pattern at the configured specs directory", () => {
    // `{specsDir}` is what makes an adopter who relocated their specs work
    // without editing this file; a hard-coded `.qfai/specs` would silently match
    // nothing there and report a green lane over zero documents.
    const unrooted = manifest.filter((entry) => !entry.pattern.startsWith("{specsDir}/"));

    expect(unrooted.map((entry) => `${entry.id}: ${entry.pattern}`)).toEqual([]);
  });
});

describe("shipped schemas agree with the SDD templates", () => {
  it("finds the mdschema binary", () => {
    // Every case below spawns it; without this the failures read as schema
    // violations rather than as a missing devDependency.
    expect(existsSync(MDSCHEMA_CLI)).toBe(true);
  });

  it("runs the checker rather than reporting an unspawned process", () => {
    // The failure this guards against is silent: a spawn that never starts
    // returns empty output, and an empty string contains no violation text, so
    // every case below would report the template as violating its schema. This
    // one asks whether the process ran at all.
    const result = spawnSync(process.execPath, [MDSCHEMA_CLI, "--help"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    });

    expect(result.error).toBeUndefined();
    expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).not.toBe("");
  });

  for (const schemaRelative of schemaFiles()) {
    const template = templateFor(schemaRelative);
    const label = template === undefined ? "(no template)" : path.relative(REPO_ROOT, template);

    it(`${schemaRelative} validates ${label}`, () => {
      if (template === undefined) {
        // Stated rather than skipped: a schema with no seeded template is a
        // legal state (an optional document), and saying so keeps the case from
        // reading as an untested schema.
        expect(existsSync(path.join(SCHEMA_ROOT, schemaRelative))).toBe(true);
        return;
      }
      const result = spawnSync(
        process.execPath,
        [MDSCHEMA_CLI, "check", "--schema", path.join(SCHEMA_ROOT, schemaRelative), template],
        { cwd: REPO_ROOT, encoding: "utf-8" },
      );

      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`.trim()).toContain("No violations");
      expect(result.status).toBe(0);
    });
  }
});

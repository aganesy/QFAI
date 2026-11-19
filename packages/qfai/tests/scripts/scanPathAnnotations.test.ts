/**
 * A path a guard scanned is data in the workflow command it reports, never command syntax.
 *
 * The repository guards that read the index or walk the tree print their findings as GitHub
 * Actions workflow commands, and a pull request chooses the paths they find. A path carrying a
 * line break would end the command and open one of its own (`::stop-commands::<token>` silences
 * every annotation after it); a `:` or `,` in `file=` would set properties the finding never
 * reported; a `%` would be decoded as an escape the path never meant.
 *
 * Each guard is run over a throwaway repository. The index cases stage their paths with
 * `git update-index` rather than on disk, so a name no Windows filesystem accepts is still
 * exercised on every runner.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { lifecycleProjection } from "../../../../scripts/check-lifecycle-manifests.mjs";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../scripts");

/** The command a hostile path would open if it were interpolated raw. */
const INJECTED_COMMAND = "::stop-commands::7f3a9c";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function emptyRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-scan-paths-"));
  roots.push(root);
  return root;
}

/** A repository whose index holds `entries`, none of which needs to exist on disk. */
async function indexWith(entries: Array<{ mode: string; path: string }>): Promise<string> {
  const root = await emptyRoot();
  execFileSync("git", ["init", "-q"], { cwd: root });
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    input: "# page\n",
    encoding: "utf-8",
  }).trim();
  const records = entries.map((entry) => `${entry.mode} ${blob}\t${entry.path}\0`).join("");
  // Git for Windows refuses a path with `:` or a control character unless NTFS protection is off,
  // and the index alone is what the guards read.
  execFileSync(
    "git",
    ["-c", "core.protectNTFS=false", "update-index", "--add", "-z", "--index-info"],
    {
      cwd: root,
      input: records,
    },
  );
  return root;
}

/** The output lines of `script` run in `cwd` with `args`, and its exit status. */
function run(
  script: string,
  cwd: string,
  args: string[] = [],
): { status: number; lines: string[] } {
  const child = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    cwd,
    encoding: "utf-8",
  });
  return {
    status: child.status ?? -1,
    lines: `${child.stdout ?? ""}${child.stderr ?? ""}`.split(/\r?\n/).filter(Boolean),
  };
}

/** The lines that are workflow commands, and the metadata block of each. */
function commands(lines: string[]): Array<{ line: string; metadata: string }> {
  return lines
    .filter((line) => line.startsWith("::"))
    .map((line) => ({ line, metadata: line.slice(0, line.indexOf("::", 2)) }));
}

const PUBLISHED = ["README.md", "packages/qfai/README.md"];

describe("check-tracked-readmes escapes the paths it found in the index", () => {
  it("keeps a path with a line break inside one annotation", async () => {
    const hostile = `docs\n${INJECTED_COMMAND}/README.md`;
    const root = await indexWith(
      [...PUBLISHED, hostile].map((file) => ({ mode: "100644", path: file })),
    );

    const result = run("check-tracked-readmes.mjs", root);

    expect(result.status).toBe(1);
    expect(result.lines.filter((line) => line.startsWith(INJECTED_COMMAND))).toEqual([]);
    const [annotation] = commands(result.lines);
    expect(annotation?.metadata).toBe(
      "::error file=docs%0A%3A%3Astop-commands%3A%3A7f3a9c/README.md",
    );
    expect(annotation?.line).toContain(`::docs%0A${INJECTED_COMMAND}/README.md is a README`);
  });

  it("escapes the separators a property value is parsed with, and `%` first", async () => {
    const root = await indexWith(
      [...PUBLISHED, "a:b,c%41/README.md"].map((file) => ({ mode: "100644", path: file })),
    );

    const [annotation] = commands(run("check-tracked-readmes.mjs", root).lines);

    expect(annotation?.metadata).toBe("::error file=a%3Ab%2Cc%2541/README.md");
    // The message keeps `:` and `,`, which only the metadata block is split at.
    expect(annotation?.line).toContain("::a:b,c%2541/README.md is a README");
  });
});

describe("check-tracked-symlinks escapes the paths it found in the index", () => {
  it("keeps a copy staged under an unusual name inside one annotation", async () => {
    const name = `x:y,%\n${INJECTED_COMMAND}.md`;
    const root = await indexWith([
      { mode: "100644", path: `packages/qfai/assets/init/root/.agents/rules/${name}` },
      { mode: "100644", path: `.agents/rules/${name}` },
    ]);

    const result = run("check-tracked-symlinks.mjs", root);

    expect(result.status).toBe(1);
    expect(result.lines.filter((line) => line.startsWith(INJECTED_COMMAND))).toEqual([]);
    const annotations = commands(result.lines);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.metadata).toBe(
      "::error file=.agents/rules/x%3Ay%2C%25%0A%3A%3Astop-commands%3A%3A7f3a9c.md",
    );
    expect(annotations[0]?.line).toContain(
      `::.agents/rules/x:y,%25%0A${INJECTED_COMMAND}.md is staged with mode 100644`,
    );
  });
});

describe("check-lifecycle-manifests escapes the paths its walk found", () => {
  it("does not let a directory name carry a `%` escape into the annotation", async () => {
    // A line break cannot be a directory name on every runner this suite runs on, so the walked
    // case is a `%`: unescaped, the runner would decode `%0A` in the name into a line break.
    const root = await emptyRoot();
    await writeFile(path.join(root, "package.json"), "{}\n", "utf-8");
    const digest = lifecycleProjection(path.join(root, "package.json"))?.digest ?? "";
    await mkdir(path.join(root, ".github"), { recursive: true });
    await writeFile(
      path.join(root, ".github", "lifecycle-manifests.txt"),
      `${digest}  package.json\n`,
      "utf-8",
    );
    const odd = path.join(root, "odd%0Aname");
    await mkdir(odd, { recursive: true });
    await writeFile(
      path.join(odd, "package.json"),
      JSON.stringify({ scripts: { postinstall: "node -e 0" } }),
      "utf-8",
    );

    const result = run("check-lifecycle-manifests.mjs", root, [root]);

    expect(result.status).toBe(1);
    const annotations = commands(result.lines);
    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.line).toMatch(
      /^::error::check-lifecycle-manifests: odd%250Aname\/package\.json declares/,
    );
  });
});

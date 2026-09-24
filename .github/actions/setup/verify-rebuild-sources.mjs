/**
 * Refuse to rebuild a package the lockfile does not resolve from the registry.
 *
 * Installation runs with `--ignore-scripts`, and the step beside this one then rebuilds exactly the
 * packages named in `dependency-builds.txt` — which runs their `postinstall`. Review finding:
 * that allow-list names `esbuild` and nothing else, so it permits *the package called esbuild*,
 * whatever that turns out to be. A pull request that points the manifest and lockfile at a local
 * `.tgz`, a git URL, or a directory keeps the name and replaces the code, and the rebuild step
 * executes it — in a job holding the credentials every later verification depends on.
 *
 * The name is not the identity. What the lockfile says about where the package COMES FROM is:
 *
 * - `resolution: {integrity: sha512-…}` — a registry tarball, pinned by content. Allowed.
 * - `resolution: {tarball: …}` / `{directory: …}` / `{repo: …, commit: …}` — a local file, a
 *   workspace directory, or a git checkout. Refused: none of those is content-addressed by the
 *   registry, and each is a route for supplying different code under an approved name.
 *
 * Pinning the integrity VALUE here was the alternative and is worse: it turns every ordinary
 * dependency bump into an edit to this guard, the guard is then resealed so often that nobody
 * reads the diff, and the property it protects quietly stops being read. The lockfile already
 * carries the value under review; this asks that it be the KIND of source a reviewer can reason
 * about.
 *
 * Parsed by scanning lines rather than with a YAML library, for the reason the rest of this
 * directory does the same: it runs before anything guarantees a dependency is present, and a
 * guard that needs `node_modules` to decide whether `node_modules` is trustworthy has a hole in
 * the middle of it.
 *
 * The package manager keeps a permission list of its own, and the two have to agree. Under
 * `--ignore-scripts` its list grants nothing, so in this job the allow-list beside this file is
 * what decides; on any other install the manager's list is what decides, and a name present
 * there and absent here is a permission nobody reviewed. Each list is therefore read against
 * the other.
 *
 * Usage:
 * `node verify-rebuild-sources.mjs <pnpm-lock.yaml> <dependency-builds.txt> <pnpm-workspace.yaml>`.
 * Exits 1 on any finding.
 */
import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

/** A `  <name>@<version>:` entry in the lockfile's package map, at exactly two spaces. */
const ENTRY = /^ {2}(?:'([^']+)'|([^\s:][^:]*?)):\s*$/;

/** Read the allow-list: one bare package name per line, `#` comments ignored. */
function allowedNames(listPath) {
  return readFileSync(listPath, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/**
 * The packages the package manager's own configuration permits to build.
 *
 * Scanned line by line, for the reason the lockfile is: this runs before anything guarantees a
 * dependency is present, and a guard that needs `node_modules` to decide whether `node_modules`
 * is trustworthy has a hole in the middle of it.
 *
 * Only a `true` is a permission. An explicit `false` is a denial and needs no counterpart here.
 *
 * @param {string} workspacePath the workspace configuration file
 * @returns {string[]} the permitted package names
 */
function permittedNames(workspacePath) {
  const lines = readFileSync(workspacePath, "utf-8").split(/\r?\n/);
  const names = [];
  let inBlock = false;
  for (const line of lines) {
    if (/^allowBuilds:\s*$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break;
    const entry = /^\s+(?:'([^']+)'|"([^"]+)"|([^\s:#][^:]*?))\s*:\s*(\S+)\s*$/.exec(line);
    if (entry === null) continue;
    const name = entry[1] ?? entry[2] ?? entry[3];
    if (name !== undefined && entry[4] === "true") names.push(name);
  }
  return names;
}

/**
 * The package name out of a lockfile key such as `esbuild@0.21.5` or `@scope/pkg@1.2.3`.
 *
 * @param {string} key the lockfile entry key, already unquoted
 * @returns {string} the name, without the version
 */
function nameOf(key) {
  const at = key.lastIndexOf("@");
  return at <= 0 ? key : key.slice(0, at);
}

/**
 * Every lockfile entry for the named packages, with the resolution block that follows it.
 *
 * @param {string} lockText the lockfile
 * @param {Set<string>} wanted the package names to report on
 * @returns {Array<{ key: string, resolution: string }>} one per matching entry
 */
function resolutionsFor(lockText, wanted) {
  const found = [];
  const lines = lockText.split(/\r?\n/);
  // Only the `packages:` section. The lockfile repeats every key under `snapshots:` to record
  // the dependency graph, and those entries carry no `resolution:` at all — reading them as
  // unresolved packages reported a finding against a perfectly ordinary lockfile, which was
  // measured before this line existed.
  let section = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const top = /^([A-Za-z][A-Za-z0-9_-]*):\s*$/.exec(line);
    if (top !== null) {
      section = top[1] ?? "";
      continue;
    }
    if (section !== "packages") continue;
    const match = ENTRY.exec(line);
    if (match === null) continue;
    const key = match[1] ?? match[2] ?? "";
    if (!wanted.has(nameOf(key))) continue;

    // The `resolution:` line belongs to this entry only while the indentation is deeper.
    let resolution = "";
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const line = lines[scan] ?? "";
      if (line.trim() === "") continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= 2) break;
      if (line.trimStart().startsWith("resolution:")) {
        resolution = line.trim();
        break;
      }
    }
    found.push({ key, resolution });
  }
  return found;
}

function main(lockPath, listPath, workspacePath) {
  let names;
  try {
    names = allowedNames(listPath);
  } catch {
    stdout.write(
      `::error::verify-rebuild-sources: cannot read ${listPath}, so which packages may run install scripts is decided by nothing.\n`,
    );
    return 1;
  }
  let permitted;
  try {
    permitted = permittedNames(workspacePath);
  } catch {
    stdout.write(
      `::error::verify-rebuild-sources: cannot read ${workspacePath}, so what the package manager permits to build cannot be compared with the allow-list.\n`,
    );
    return 1;
  }

  // Both directions. A name the manager permits and the list does not is a permission nobody
  // reviewed; a name the list carries and the manager does not is a rebuild that cannot run,
  // and naming it here beats reading it out of the manager's own error one step later.
  let disagreed = false;
  for (const name of permitted) {
    if (!names.includes(name)) {
      stdout.write(
        `::error::verify-rebuild-sources: ${name} may build according to ${workspacePath} and is absent from ${listPath}. What may run install scripts is decided in one place, and the list is that place.\n`,
      );
      disagreed = true;
    }
  }
  for (const name of names) {
    if (!permitted.includes(name)) {
      stdout.write(
        `::error::verify-rebuild-sources: ${name} is on ${listPath} and ${workspacePath} does not permit it to build, so the rebuild beside this check cannot run it.\n`,
      );
      disagreed = true;
    }
  }
  if (disagreed) return 1;

  if (names.length === 0) {
    // An empty allow-list is a legitimate state: nothing is rebuilt, so nothing needs verifying.
    stdout.write("verify-rebuild-sources: the allow-list names no package\n");
    return 0;
  }

  let lockText;
  try {
    lockText = readFileSync(lockPath, "utf-8");
  } catch {
    stdout.write(
      `::error::verify-rebuild-sources: cannot read ${lockPath}, so where the packages allowed to run install scripts come from cannot be checked.\n`,
    );
    return 1;
  }

  const wanted = new Set(names);
  const entries = resolutionsFor(lockText, wanted);

  let failed = false;
  for (const name of names) {
    const mine = entries.filter((entry) => nameOf(entry.key) === name);
    if (mine.length === 0) {
      stdout.write(
        `::error::verify-rebuild-sources: ${name} is allowed to run install scripts and appears nowhere in ${lockPath}. A name the lockfile does not resolve is a permission with no subject.\n`,
      );
      failed = true;
      continue;
    }
    for (const entry of mine) {
      if (entry.resolution === "") {
        stdout.write(
          `::error::verify-rebuild-sources: ${entry.key} has no resolution in ${lockPath}, so where its code comes from cannot be read.\n`,
        );
        failed = true;
        continue;
      }
      if (!entry.resolution.includes("integrity:")) {
        stdout.write(
          `::error::verify-rebuild-sources: ${entry.key} does not resolve to a content-addressed registry tarball (${entry.resolution}). Being on the rebuild allow-list permits the package of that NAME to run its install scripts; it does not permit that name to be pointed at a local file, a directory or a git checkout.\n`,
        );
        failed = true;
      }
    }
  }

  if (failed) return 1;
  stdout.write(
    `verify-rebuild-sources: ${String(entries.length)} lockfile entr(ies) for ${String(names.length)} permitted package(s), all registry-resolved\n`,
  );
  return 0;
}

exit(
  main(
    argv[2] ?? "pnpm-lock.yaml",
    argv[3] ?? ".github/actions/setup/dependency-builds.txt",
    argv[4] ?? "pnpm-workspace.yaml",
  ),
);

/* global process, URL */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// CI runners are not logged in to npm, triggering a benign auth warning on dry-run.
// Filter this known false-positive so real warnings still fail the check.
//
// gitignore-fallback: package.json `files` field already controls what gets
// published; the .npmignore-fallback warning is informational, not a real
// publish risk.
const KNOWN_NOISE = [/requires you to be logged in/, /No \.npmignore file found/];

/**
 * `npm publish --dry-run` fails outright when the working version is already on the registry.
 *
 * That is not a defect in the pack and it is the NORMAL state of every feature branch: the version
 * in `package.json` is whatever `main` carries, and once that version is released every pull
 * request inherits it. The dry-run still does the work this check wants — it builds the tarball and
 * lists its contents, which is where a packing mistake shows up — and then refuses on
 * publishability, which no pull request is asking about.
 *
 * Observed on PR #794, the first run of the layered CI scaffold: `qfai@1.10.0` is published, the
 * branch is at 1.10.0, the tarball was built and listed in full, and the step failed with
 *
 *     npm error You cannot publish over the previously published versions: 1.10.0.
 *
 * `build` carries this repository's required status context, so the effect was that the required
 * context could not pass on any branch while the current version is published.
 */
/**
 * The registry a published-version claim is settled against.
 *
 * Named rather than inherited: `.npmrc` is a file a pull request can add, and the point of the
 * registry conjunct is that it is the one input the pull request does not control.
 */
const PUBLIC_REGISTRY = "https://registry.npmjs.org/";

const ALREADY_PUBLISHED = /cannot publish over the previously published versions/i;

/**
 * Whether the registry ITSELF says this version is already published.
 *
 * The tolerated case is "the version is already published, which a pull request is not asking
 * about", and the first two versions of this check decided that by reading the dry-run child's own
 * text. Review finding [06] closed the tarball half of that; the SAME argument applies to this half
 * and was left open — a lifecycle script can print `npm error You cannot publish over the previously
 * published versions` for a version that was never published, and a pull request can edit
 * `prepublishOnly`. Two measured escapes survived the tarball repair:
 *
 *   - `npm pack` does not run `prepublishOnly` at all, so a `prepublishOnly` that prints the
 *     sentence and exits 1 leaves `verifyTarballIndependently` answering `ok: true`;
 *   - a `prepack` can branch on npm's own `npm_command`, behaving during `npm publish` and not
 *     during `npm pack`.
 *
 * So the claim is put to the party that owns it. `npm view <name>@<version> version` is a separate
 * process asking the REGISTRY, and no lifecycle script in this package can make the registry report
 * a version it does not host. A refusal — offline, unpublished, unparseable — returns `ok: false`,
 * and the tolerance then does not apply, which is the conservative direction: an unreachable
 * registry already fails the dry-run for its own reasons.
 *
 * @param {string} pkgDir the package directory whose name and version to ask about
 * @returns {{ ok: boolean, reason: string }}
 */
export function verifyAlreadyPublished(pkgDir) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf-8"));
  } catch (error) {
    return { ok: false, reason: `could not read ${pkgDir}/package.json: ${String(error)}` };
  }
  const name = typeof manifest?.name === "string" ? manifest.name : "";
  const version = typeof manifest?.version === "string" ? manifest.version : "";
  if (name === "" || version === "") {
    return { ok: false, reason: "package.json declares no name/version to ask the registry about" };
  }

  // The registry is NAMED here, and the query does not run inside the package.
  //
  // Review finding [49]: `npm view` reads `.npmrc` from its cwd, and a pull request can add
  // `packages/qfai/.npmrc` with `registry=<anything>`. A registry the pull request controls then
  // answers this question — and the whole point of this function is that it is the ONE thing the
  // pull request cannot write. With a fake registry returning the manifest's own name and
  // version, the dry-run reported the already-published failure and this confirmed it, so the
  // required `build` context went green over a version nobody had published.
  //
  // `--registry` on the command line outranks every config file, and running from a directory
  // outside the repository means no project `.npmrc` is read at all. Both, because either alone
  // is one config precedence rule away from being wrong.
  const viewed = runNpm(
    ["view", `${name}@${version}`, "version", "--json", `--registry=${PUBLIC_REGISTRY}`],
    { cwd: tmpdir() },
  );
  if (viewed.status !== 0) {
    // `npm view` exits non-zero for an unpublished version (E404) and for a network failure alike.
    // Both mean the same thing here: the registry did not confirm it.
    return {
      ok: false,
      reason: `${PUBLIC_REGISTRY} did not confirm ${name}@${version} is published (\`npm view\` exited ${String(viewed.status)})`,
    };
  }
  let reported;
  try {
    reported = JSON.parse((viewed.stdout ?? "").trim());
  } catch {
    return { ok: false, reason: "`npm view --json` printed something that did not parse" };
  }
  // A single match prints a string; an ambiguous query prints an array.
  const versions = Array.isArray(reported) ? reported : [reported];
  if (!versions.includes(version)) {
    return {
      ok: false,
      reason: `the registry reported ${JSON.stringify(versions)} rather than ${version}`,
    };
  }
  return { ok: true, reason: `${PUBLIC_REGISTRY} confirms ${name}@${version} is published` };
}

/**
 * Whether a tarball was really built, established by a SEPARATE process and by a file on disk.
 *
 * The tolerated case rests on "the pack itself built", and the first version of this check read
 * that off the dry-run's own output — npm's `=== Tarball Details ===` banner. Review finding [06]
 * named why that establishes nothing: `prepublishOnly`, `prepack` and `prepare` all run BEFORE the
 * pack, npm's own documentation says so, and a pull request can change any of them. A lifecycle
 * script printing that banner and the already-published sentence, then exiting non-zero, reproduced
 * the entire tolerated signature with no tarball in existence — and the required `build` context
 * went green over a pack that never ran. Text from the same child is not evidence about that child.
 *
 * So this runs `npm pack --json` into a temporary directory and checks three things a lifecycle
 * script cannot fake between them:
 *
 * 1. the separate process exited zero;
 * 2. npm's OWN post-pack accounting — the JSON it prints after packing — names a filename and a
 *    non-empty file list;
 * 3. that file exists on disk, and IS the archive npm accounted for — the reported size, a gzip
 *    magic number, and whichever of `shasum` / `integrity` the report carries, recomputed over
 *    the bytes. A report carrying neither digest is refused rather than accepted on its name.
 *
 * A script can print anything; it cannot make npm's post-pack JSON describe a file it did not
 * create, and it cannot leave a gzip archive of the reported size where npm says one is without
 * having built one. Any refusal returns `ok: false` with the reason, and the caller turns that into
 * a fatal verdict — the conservative direction, since "could not establish a tarball" and "no
 * tarball" cost the same thing here.
 *
 * @param {string} pkgDir the package directory to pack
 * @returns {{ ok: boolean, reason: string }}
 */
export function verifyTarballIndependently(pkgDir) {
  let outDir;
  try {
    outDir = mkdtempSync(path.join(tmpdir(), "qfai-pack-proof-"));
  } catch (error) {
    return { ok: false, reason: `could not create a directory to pack into: ${String(error)}` };
  }
  try {
    // `--ignore-scripts`, and it is the whole repair for review finding [50].
    //
    // npm writes its accounting as JSON to stdout, and every lifecycle script it runs writes to
    // the SAME stdout. The parse below used to walk back from the last `]` for a slice that
    // parsed — which a `postpack`, or a background child it starts that outlives the pack, can
    // satisfy by appending an array of its own describing a tarball it has since swapped in. The
    // size and both digests then come from the attacker's array and match the attacker's file,
    // and every check below agrees.
    //
    // With scripts off there is no other writer on that stdout, so the whole of it is npm's and
    // the parse can demand exactly that. This is the INDEPENDENT proof — `npm publish --dry-run`
    // above still runs the lifecycle in full, and it is what would catch a `prepack` that fails.
    // What this establishes is narrower and is the thing that was forgeable: that npm itself
    // packed an archive, and that the bytes on disk are the ones it accounted for.
    const packed = runNpm(["pack", "--json", "--ignore-scripts", "--pack-destination", outDir], {
      cwd: pkgDir,
    });
    if (packed.status !== 0) {
      return {
        ok: false,
        reason: `\`npm pack\` exited ${String(packed.status)} in its own process`,
      };
    }

    // The WHOLE of stdout, parsed as one value. With `--ignore-scripts` npm is the only writer on
    // it, so anything else there is a reason to refuse rather than something to search past.
    //
    // The previous version searched: it walked back from the last `]` for a slice that parsed,
    // because `prepack` (tsup, ANSI colour codes containing `[`) wrote a build log in front of
    // npm's array. Searching is what made a second array indistinguishable from the first —
    // review finding [50].
    let report;
    try {
      report = JSON.parse((packed.stdout ?? "").trim());
    } catch {
      return {
        ok: false,
        reason: "`npm pack --json` printed something other than one JSON document on stdout",
      };
    }
    if (!Array.isArray(report)) {
      return {
        ok: false,
        reason: "`npm pack --json` printed no JSON array to account for the pack",
      };
    }
    if (report.length !== 1) {
      return {
        ok: false,
        reason: `\`npm pack --json\` accounted for ${String(report.length)} tarballs; exactly one is the only shape this proof reads`,
      };
    }
    const entry = Array.isArray(report) ? report[0] : undefined;
    if (entry === undefined || typeof entry !== "object" || entry === null) {
      return { ok: false, reason: "`npm pack --json` accounted for no tarball" };
    }
    const filename = Reflect.get(entry, "filename");
    const files = Reflect.get(entry, "files");
    const entrySize = Reflect.get(entry, "size");
    const entryShasum = Reflect.get(entry, "shasum");
    const entryIntegrity = Reflect.get(entry, "integrity");
    if (typeof filename !== "string" || filename.length === 0) {
      return { ok: false, reason: "`npm pack --json` named no tarball file" };
    }
    if (!Array.isArray(files) || files.length === 0) {
      return { ok: false, reason: `\`npm pack\` reported ${filename} with no files in it` };
    }

    // On disk, where the accounting says it is. `filename` can carry the scope as a path segment,
    // so only its basename is joined — a name with a separator must not reach outside `outDir`.
    const tarball = path.join(outDir, path.basename(filename));
    let stats;
    try {
      stats = statSync(tarball);
    } catch {
      return { ok: false, reason: `\`npm pack\` reported ${filename}, which is not on disk` };
    }
    if (!stats.isFile() || stats.size === 0) {
      return { ok: false, reason: `${filename} is not a non-empty regular file` };
    }

    // The file on disk must be the file npm ACCOUNTED FOR — its size and its digest, not just
    // its name and a gzip header.
    //
    // The docblock above claimed "with the size npm reported" while the code read neither the
    // size nor the digest: any non-empty file whose first two bytes are the gzip magic passed.
    // So a `postpack` — or a background process it started, which outlives the `npm pack` this
    // waits on — could replace the archive after it was built, and the already-published
    // tolerance would then let the required `build` context go green over an archive nobody
    // verified. npm reports `size`, `shasum` and `integrity`; measured on npm 11 they are all
    // present, so there is no reason to check less than it tells us.
    if (typeof entrySize === "number" && stats.size !== entrySize) {
      return {
        ok: false,
        reason: `${filename} is ${String(stats.size)} bytes on disk but npm accounted for ${String(entrySize)}`,
      };
    }

    let bytes;
    try {
      bytes = readFileSync(tarball);
    } catch {
      return { ok: false, reason: `${filename} could not be read back` };
    }
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
      return { ok: false, reason: `${filename} is not a gzip archive` };
    }

    // `shasum` is npm's own sha1 over the tarball, and `integrity` its SRI form. Whichever the
    // report carries is checked; a report carrying NEITHER is refused, because then nothing
    // distinguishes the archive npm built from one left in its place.
    const digestChecks = [];
    if (typeof entryShasum === "string" && entryShasum.length > 0) {
      digestChecks.push(["shasum", entryShasum, createHash("sha1").update(bytes).digest("hex")]);
    }
    if (typeof entryIntegrity === "string" && entryIntegrity.startsWith("sha512-")) {
      digestChecks.push([
        "integrity",
        entryIntegrity,
        `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
      ]);
    }
    if (digestChecks.length === 0) {
      return {
        ok: false,
        reason: `\`npm pack --json\` reported neither a shasum nor an sha512 integrity for ${filename}, so the archive on disk cannot be tied to the one it packed`,
      };
    }
    for (const [label, reported, actual] of digestChecks) {
      if (reported !== actual) {
        return {
          ok: false,
          reason: `${filename} does not match the ${label} npm reported (${reported} vs ${actual})`,
        };
      }
    }

    return {
      ok: true,
      reason: `\`npm pack\` built ${filename} (${String(files.length)} files, ${String(stats.size)} bytes, ${digestChecks.map(([label]) => label).join("+")} verified)`,
    };
  } finally {
    try {
      rmSync(outDir, { recursive: true, force: true });
    } catch {
      // A leftover temp directory is not worth failing a gate over.
    }
  }
}

/**
 * Decide whether a dry-run result is acceptable, with no side effects, so both directions are
 * testable without a registry.
 *
 * @param {{ status: number | null, stdout?: string, stderr?: string }} result
 * @param {{ ok: boolean, reason: string } | undefined} [tarballProof] the answer from
 *   {@link verifyTarballIndependently}. OPTIONAL, and its absence is a state rather than a default:
 *   `main` only runs the pack proof when the dry-run failed, because a green dry-run already packed
 *   and packing twice would double the slowest step of the required context for no added claim.
 *   Absent therefore means "not established", and the already-published tolerance refuses on it —
 *   which is the conservative direction, since "could not establish a tarball" and "no tarball" cost
 *   the same thing here.
 * @param {{ ok: boolean, reason: string } | undefined} [publishedProof] the answer from
 *   {@link verifyAlreadyPublished}. Absent means the registry was not asked, which is refused
 *   for the same reason an absent tarball proof is.
 * @returns {{ ok: boolean, reason: string, warnings: string[] }}
 */
export function classifyDryRun(result, tarballProof, publishedProof) {
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combined = `${stdout}\n${stderr}`;

  const warnings = combined
    .split(/\r?\n/)
    .filter((line) => /npm warn/i.test(line))
    .filter((line) => !KNOWN_NOISE.some((re) => re.test(line)));

  if (result.status !== 0) {
    // The one tolerated failure, and only when the registry named it AND a SEPARATE process built
    // a tarball. Any other non-zero status is a real failure — a broken pack, a network error, a
    // missing file — and stays fatal.
    //
    // The second condition used to be `TARBALL_BUILT.test(combined)`: npm's own tarball summary,
    // read out of the same child's output. Review finding [06] named why that is not an
    // independent observation. `prepublishOnly`, `prepack` and `prepare` all run BEFORE the pack —
    // npm's own documentation says so — and a pull request can change any of them. One that prints
    // `npm notice === Tarball Details ===` and the already-published wording, then exits non-zero,
    // satisfied both patterns with no tarball ever built, and the required `build` context passed.
    // Text a lifecycle script can print is not evidence about what npm did after printing it.
    //
    // BOTH conjuncts are now established outside this child, and the second one had to move for
    // the same reason as the first. Hardening only the tarball left the tolerance as
    // `forgeable-text AND unforgeable-tarball`, and two escapes were measured through the text:
    // `npm pack` does not run `prepublishOnly` at all, so a `prepublishOnly` printing the
    // registry's sentence and exiting 1 still reached `ok: true`; and a `prepack` can branch on
    // npm's own `npm_command` to behave during `pack` and not during `publish`.
    //
    // So the already-published claim is put to the REGISTRY (`verifyAlreadyPublished`, a separate
    // `npm view`) and the tarball claim to a separate `npm pack`. Neither is something a lifecycle
    // script in this package can produce.
    //
    // Three conjuncts, and the text is still one of them — as a NECESSARY condition, never a
    // sufficient one. Dropping it was tried and is wrong: the text is what identifies WHICH failure
    // is being tolerated, and without it any non-zero dry-run on a published version passes, ENOENT
    // included. Measured — the row asserting "an unrelated failure must stay fatal" went red. A
    // forged sentence can now only ADD a condition to a tolerance the registry and the pack already
    // have to agree to.
    //
    // What stays open, stated rather than implied: `prepublishOnly` runs on publish and nowhere
    // else, so a `prepublishOnly` failing for its own reason while the version is genuinely
    // published is indistinguishable here from the tolerated case. It is also not a question a pull
    // request can get an answer to — npm refuses that publish for the version either way.
    if (
      ALREADY_PUBLISHED.test(combined) &&
      publishedProof?.ok === true &&
      tarballProof?.ok === true
    ) {
      return {
        ok: warnings.length === 0,
        reason:
          warnings.length === 0
            ? `the version is already published, which a pull request is not asking about — ${publishedProof?.reason ?? ""}; and ${tarballProof?.reason ?? ""}`
            : "warnings were produced",
        warnings,
      };
    }
    return {
      ok: false,
      reason: ALREADY_PUBLISHED.test(combined)
        ? `npm publish --dry-run reported the version as already published, but that was not confirmed out of process. Registry: ${publishedProof?.reason ?? "not asked"}. Pack: ${tarballProof?.reason ?? "not asked"}`
        : "npm publish --dry-run exited with non-zero status",
      warnings,
    };
  }

  return {
    ok: warnings.length === 0,
    reason: warnings.length === 0 ? "clean" : "warnings were produced",
    warnings,
  };
}

/**
 * The npm CLI that ships with the Node running this script, as an absolute path.
 *
 * Review finding [98]: this script runs through a `pnpm` script, so its PATH begins with
 * `node_modules/.bin` — a directory a pull request fills by adding a dependency. A workspace
 * package declaring a `npm` bin replaces every `npm` call here with a program that exits 0, and
 * the independent tarball and registry proofs below never run at all. Measured by the reviewer:
 * a fake `npm` first on PATH made this whole script exit 0 with no output.
 *
 * The identity has to come from somewhere the pull request does not control. `process.execPath`
 * is the Node the runner installed, and npm sits beside it in the same installation — two
 * layouts, because Windows puts it next to the executable and POSIX puts it under `lib/`.
 *
 * Refused rather than fallen back on: if neither layout holds, the toolchain is not the one this
 * check knows how to verify with, and reaching for PATH is exactly the resolution that was
 * forgeable.
 *
 * @returns {string} absolute path to `npm-cli.js`
 */
function npmCliPath() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return path.resolve(candidate);
    } catch {
      // try the next layout
    }
  }
  throw new Error(
    "check-publish-dry-run: no npm-cli.js beside the running Node (looked in " +
      candidates.join(" and ") +
      "). Resolving npm from PATH is not an option here: this script runs under a pnpm " +
      "script, so PATH begins with node_modules/.bin, which a pull request fills by adding a " +
      "dependency.",
  );
}

/**
 * Run npm through the toolchain's own CLI.
 *
 * @param {string[]} args npm arguments
 * @param {{ cwd: string }} options where to run it
 * @returns {ReturnType<typeof spawnSync>} the result
 */
function runNpm(args, options) {
  return spawnSync(process.execPath, [npmCliPath(), ...args], {
    cwd: options.cwd,
    encoding: "utf-8",
  });
}
function main() {
  const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
  const pkgDir = path.join(root, "packages", "qfai");

  const result = runNpm(["publish", "--dry-run"], { cwd: pkgDir });

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  // Only when the dry-run failed: a green dry-run already packed, and packing a second time on
  // every run would double the slowest step of the required context for no added claim.
  // Both only when the dry-run FAILED: a green dry-run already packed and needs no tolerance, and
  // asking twice would double the slowest step of the required context for no added claim.
  const tarballProof = result.status === 0 ? undefined : verifyTarballIndependently(pkgDir);
  const publishedProof = result.status === 0 ? undefined : verifyAlreadyPublished(pkgDir);
  if (tarballProof !== undefined) {
    process.stdout.write(`publish dry-run: independent pack check — ${tarballProof.reason}.
`);
  }
  if (publishedProof !== undefined) {
    process.stdout.write(`publish dry-run: registry check — ${publishedProof.reason}.
`);
  }

  const verdict = classifyDryRun(result, tarballProof, publishedProof);

  if (verdict.warnings.length > 0) {
    process.stderr.write(
      [
        "npm publish --dry-run produced warnings (treated as errors):",
        ...verdict.warnings.map((line) => `  ${line}`),
      ].join("\n") + "\n",
    );
  }

  if (!verdict.ok) {
    process.stderr.write(`${verdict.reason}.\n`);
    process.exit(result.status === 0 ? 1 : (result.status ?? 1));
  }

  if (result.status !== 0) {
    // Said out loud, because a green step over a non-zero child is exactly the shape that hides a
    // real failure. Naming the tolerated case is what makes the tolerance auditable.
    process.stdout.write(`publish dry-run: tolerated — ${verdict.reason}.\n`);
  }
}

// Same invocation guard the sibling root scripts use: importing this module must not run it,
// and `new URL(argv[1], "file:")` throws under a test runner, which is how the first version
// of this guard broke the import.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

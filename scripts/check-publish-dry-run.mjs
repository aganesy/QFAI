/* global process, URL */
import { spawnSync } from "node:child_process";
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
const ALREADY_PUBLISHED = /cannot publish over the previously published versions/i;

/**
 * Decide whether a dry-run result is acceptable, with no side effects, so both directions are
 * testable without a registry.
 *
 * @param {{ status: number | null, stdout?: string, stderr?: string }} result
 * @returns {{ ok: boolean, reason: string, warnings: string[] }}
 */
export function classifyDryRun(result) {
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const combined = `${stdout}\n${stderr}`;

  const warnings = combined
    .split(/\r?\n/)
    .filter((line) => /npm warn/i.test(line))
    .filter((line) => !KNOWN_NOISE.some((re) => re.test(line)));

  if (result.status !== 0) {
    // The one tolerated failure, and only when the registry named it. Any other non-zero status is
    // a real failure — a broken pack, a network error, a missing file — and stays fatal.
    if (ALREADY_PUBLISHED.test(combined)) {
      return {
        ok: warnings.length === 0,
        reason:
          warnings.length === 0
            ? "the version is already published, which a pull request is not asking about; the pack itself built and listed"
            : "warnings were produced",
        warnings,
      };
    }
    return { ok: false, reason: "npm publish --dry-run exited with non-zero status", warnings };
  }

  return {
    ok: warnings.length === 0,
    reason: warnings.length === 0 ? "clean" : "warnings were produced",
    warnings,
  };
}

function main() {
  const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
  const pkgDir = path.join(root, "packages", "qfai");

  const result = spawnSync("npm", ["publish", "--dry-run"], {
    cwd: pkgDir,
    encoding: "utf-8",
  });

  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  const verdict = classifyDryRun(result);

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

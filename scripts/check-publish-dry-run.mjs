/* global process, URL */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pkgDir = path.join(root, "packages", "qfai");

const result = spawnSync("npm", ["publish", "--dry-run"], {
  cwd: pkgDir,
  encoding: "utf-8",
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";

process.stdout.write(stdout);
process.stderr.write(stderr);

if (result.status !== 0) {
  process.stderr.write("npm publish --dry-run exited with non-zero status.\n");
  process.exit(result.status ?? 1);
}

const combined = `${stdout}\n${stderr}`;

// CI runners are not logged in to npm, triggering a benign auth warning on dry-run.
// Filter this known false-positive so real warnings still fail the check.
//
// gitignore-fallback: package.json `files` field already controls what gets
// published; the .npmignore-fallback warning is informational, not a real
// publish risk.
const KNOWN_NOISE = [/requires you to be logged in/, /No \.npmignore file found/];

const warnLines = combined
  .split(/\r?\n/)
  .filter((line) => /npm warn/i.test(line))
  .filter((line) => !KNOWN_NOISE.some((re) => re.test(line)));

if (warnLines.length > 0) {
  process.stderr.write(
    [
      "npm publish --dry-run produced warnings (treated as errors):",
      ...warnLines.map((line) => `  ${line}`),
    ].join("\n") + "\n",
  );
  process.exit(1);
}

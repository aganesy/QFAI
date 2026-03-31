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

// npm 11 emits gitignore-fallback warnings for every directory in workspace
// packages even when .npmignore exists and "files" field controls inclusion.
// CI runners are not logged in to npm, triggering a benign auth warning on dry-run.
// Filter these known false-positives so real warnings still fail the check.
const KNOWN_NOISE = [/gitignore-fallback/, /requires you to be logged in/];

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

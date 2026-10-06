import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import { removeTempTree } from "../helpers/tempTree.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RECORDS = path.join(PACKAGE_ROOT, "tests", "eval", "records");
const HOST = "unstartable-host-test";
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const namesIn = (dir: string): Promise<string[]> => readdir(dir).catch(() => []);

// The runner's own vitest invocation, as its header comment gives it, with the temporary
// directory and git's command trace redirected where the test can read them.
function runRunner(scratch: string, trace: string) {
  const vitest = path.join(
    path.dirname(createRequire(import.meta.url).resolve("vitest/package.json")),
    "vitest.mjs",
  );
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST")),
  );
  return spawnSync(process.execPath, [vitest, "run", "--config", "tests/eval/vitest.config.ts"], {
    cwd: PACKAGE_ROOT,
    encoding: "utf8",
    timeout: 240_000,
    env: {
      ...env,
      TMPDIR: scratch,
      TEMP: scratch,
      TMP: scratch,
      GIT_TRACE: trace,
      QFAI_EVAL_HOST: HOST,
      QFAI_EVAL_COMMAND: JSON.stringify(["qfai-eval-host-that-does-not-exist", "{prompt}"]),
    },
  });
}

it("The routing eval runner stops on a host command that cannot start and leaves nothing behind", async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "qfai-eval-runner-test-"));
  roots.push(scratch);
  const trace = path.join(scratch, "git-trace.txt");
  const recordsBefore = await namesIn(RECORDS);

  const result = runRunner(scratch, trace);

  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}${result.stderr}`).toContain("The host command did not start");
  // No eval record is written for this host.
  expect(await namesIn(RECORDS)).toEqual(recordsBefore);
  // The base tree and the seed's copy are both removed.
  const left = (await namesIn(scratch)).filter((name) => name.startsWith("qfai-eval-"));
  expect(left).toEqual([]);
  // One seed committed its fixture and ran the host; no later seed started.
  const commits = (await readFile(trace, "utf8")).match(/built-in: git commit/g) ?? [];
  expect(commits).toHaveLength(1);
}, 300_000);

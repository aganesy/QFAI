/**
 * Spawn-based tests for `scripts/check-not-a-dependency.mjs`.
 *
 * The monorepo root is not the published package. Renaming it to
 * `qfai-monorepo` stops it answering to the *package name* `qfai`, but
 * `"qfai": "github:aganesy/QFAI"` maps a dependency *key* to a git URL, so npm
 * still installs this manifest to `node_modules/qfai` — measured with npm
 * 11.16.0: "added 1 package", `node_modules/qfai` present,
 * `node_modules/.bin/qfai` absent. The root `prepack` guard does not fire,
 * because git-dependency preparation packs the clone without running it.
 *
 * This `preinstall` guard aborts that install. Its contract:
 *   - npm  -> exit 1 with an explanatory message
 *   - yarn -> exit 1
 *   - pnpm -> exit 0 (the repository's own install must never break)
 *   - unknown / absent user agent -> exit 0 (fail-open)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/scripts → tests → packages/qfai → packages → repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/check-not-a-dependency.mjs");

function runGuard(userAgent: string | undefined): { status: number; stderr: string } {
  // Windows environment names are case-insensitive but `{...process.env}` keeps
  // whatever casing the parent used, so a stray `NPM_CONFIG_USER_AGENT` would
  // survive alongside the lowercase key and win in the child. Drop every casing
  // before injecting the one under test.
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === "npm_config_user_agent") {
      continue;
    }
    env[key] = value;
  }
  if (userAgent !== undefined) {
    env.npm_config_user_agent = userAgent;
  }
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: "utf-8", env });
  return { status: result.status ?? -1, stderr: result.stderr };
}

describe("check-not-a-dependency guard", () => {
  it("refuses an npm install of the monorepo root", () => {
    const { status, stderr } = runGuard("npm/11.16.0 node/v24.18.0 win32 x64 workspaces/false");
    expect(status).toBe(1);
    expect(stderr).toContain("this is the private monorepo root");
    expect(stderr).toContain("npm i -D qfai");
    expect(stderr).toContain("github:aganesy/QFAI");
  });

  it("refuses a yarn install of the monorepo root", () => {
    const { status } = runGuard("yarn/1.22.19 npm/? node/v20.11.0 linux x64");
    expect(status).toBe(1);
  });

  it("allows pnpm, which is how this repository is developed and built in CI", () => {
    const { status, stderr } = runGuard("pnpm/9.12.3 npm/? node/v20.19.0 linux x64");
    expect(status).toBe(0);
    expect(stderr).toBe("");
  });

  it("fails open when the user agent is absent or unrecognised", () => {
    expect(runGuard(undefined).status).toBe(0);
    expect(runGuard("").status).toBe(0);
    expect(runGuard("bun/1.1.0 node/v22.0.0 darwin arm64").status).toBe(0);
  });

  it("is wired as the root preinstall script", async () => {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path.join(REPO_ROOT, "package.json"), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toBeTypeOf("object");
    if (parsed === null || typeof parsed !== "object" || !("scripts" in parsed)) {
      throw new Error("root package.json has no scripts block");
    }
    const scripts = parsed.scripts;
    if (scripts === null || typeof scripts !== "object" || !("preinstall" in scripts)) {
      throw new Error("root package.json has no preinstall script");
    }
    expect(scripts.preinstall).toBe("node ./scripts/check-not-a-dependency.mjs");
  });
});

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { invokedScriptBodies } from "../../../../scripts/check-workflow-hygiene.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const helper = path.join(root, "scripts/run-lint-checks.sh");

const stub = `
pnpm() {
  case "$*" in
    "ci:lint:checks") lane=checks ;;
    "-C packages/qfai lint:mirror-surface") lane=mirror ;;
    *) return 94 ;;
  esac
  printf '%s\\n' "$*" >> calls.txt
  touch "started-$lane"
  for attempt in {1..100}; do
    if [ -f started-checks ] && [ -f started-mirror ]; then break; fi
    sleep 0.02
  done
  if [ ! -f started-checks ] || [ ! -f started-mirror ]; then return 93; fi
  touch "finished-$lane"
  if [ "$lane" = checks ]; then return "$CHECKS_STATUS"; fi
  return "$MIRROR_STATUS"
}
`;

describe("lint parallel execution", () => {
  it.each([
    [0, 0, 0],
    [2, 0, 1],
    [7, 0, 1],
    [143, 0, 1],
    [0, 2, 1],
    [0, 7, 1],
    [0, 143, 1],
    [2, 7, 1],
  ])(
    "awaits both concurrent checks with exits %i/%i and returns %i",
    (checks, mirror, expected) => {
      const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-parallel-"));
      try {
        const body = readFileSync(helper, "utf-8");
        const result = spawnSync("bash", ["-c", `${stub}\n${body}`], {
          cwd: temp,
          encoding: "utf-8",
          timeout: 10_000,
          env: {
            ...process.env,
            CHECKS_STATUS: String(checks),
            MIRROR_STATUS: String(mirror),
            QFAI_LINT_MIRROR_SCHEDULE: "sharded",
            GITHUB_ACTIONS: "true",
          },
        });
        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(expected);
        expect(
          readFileSync(path.join(temp, "calls.txt"), "utf-8").trim().split("\n").sort(),
        ).toEqual(["-C packages/qfai lint:mirror-surface", "ci:lint:checks"]);
        expect(readFileSync(path.join(temp, "finished-checks"), "utf-8")).toBe("");
        expect(readFileSync(path.join(temp, "finished-mirror"), "utf-8")).toBe("");
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    },
  );

  it("keeps workflow hygiene ahead of both independent checks", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(manifest.scripts["ci:lint"]).toBe(
      "node ./scripts/check-workflow-hygiene.mjs --report-dir .qfai/review/workflow-hygiene && bash ./scripts/run-lint-checks.sh",
    );
    const bodies = invokedScriptBodies("pnpm ci:lint", root);
    expect(bodies.some(([key]) => key === ".#ci:lint:checks")).toBe(true);
    expect(bodies.some(([key]) => key === "packages/qfai#lint:mirror-surface")).toBe(true);
    expect(bodies.some(([key]) => key === ".#preci:lint:checks")).toBe(true);
    expect(bodies.some(([key]) => key === "packages/qfai#prelint:mirror-surface")).toBe(true);
  });

  it("pins package scripts reached through a local Bash helper, including absent hooks", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-pin-"));
    try {
      mkdirSync(path.join(temp, "scripts"));
      writeFileSync(
        path.join(temp, "package.json"),
        JSON.stringify({ scripts: { check: "node check.mjs" } }),
      );
      const script = path.join(temp, "scripts/checks.sh");
      writeFileSync(script, "pnpm check &\nwait\n");
      const run = "bash ./scripts/checks.sh";
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#check", "node check.mjs"]);
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#precheck", null]);
      writeFileSync(script, "true\n");
      expect(invokedScriptBodies(run, temp).some(([key]) => key === ".#check")).toBe(false);
      rmSync(script);
      expect(invokedScriptBodies(run, temp)).toContainEqual([".#bash:scripts/checks.sh", null]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("retains every static lint command exactly once", () => {
    const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(manifest.scripts["ci:lint:checks"]?.split(" && ")).toEqual([
      "pnpm format:check",
      "pnpm lint",
      "pnpm lint:md",
      "pnpm lint:mermaid",
      "pnpm lint:mdschema",
      "node ./scripts/check-bidi.mjs",
      "node ./scripts/check-conflict-markers.mjs",
      "node ./scripts/check-tracked-scratch.mjs",
      "node ./scripts/check-readme-alignment.mjs",
      "node ./scripts/check-instructions-size.mjs",
      "node ./scripts/check-review-profile-consistency.mjs",
      "node ./scripts/check-prompt-scanner-pair.mjs",
      "node ./scripts/check-doc-clarity.mjs",
      "node ./scripts/check-simplification-ledger.mjs",
      "pnpm -C packages/qfai lint:shipping",
      "pnpm -C packages/qfai lint:workflow-shape",
      "node ./scripts/check-atdd-annotation-ledger.mjs --spec 0017",
      "node ./packages/qfai/scripts/check-pack-locations.mjs",
    ]);
  });

  it("bounds Bash traversal and records unreadable helpers without following them", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "qfai-lint-bounds-"));
    try {
      mkdirSync(path.join(temp, "scripts"));
      const script = path.join(temp, "scripts/checks.sh");
      writeFileSync(script, "bash ./scripts/checks.sh\n");
      expect(invokedScriptBodies("bash ./scripts/checks.sh", temp)).toHaveLength(1);
      expect(invokedScriptBodies("bash ./scripts/../outside.sh", temp)).toEqual([]);
      writeFileSync(script, "x".repeat(1_048_577));
      expect(invokedScriptBodies("bash ./scripts/checks.sh", temp)).toEqual([
        [".#bash:scripts/checks.sh", null],
      ]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});

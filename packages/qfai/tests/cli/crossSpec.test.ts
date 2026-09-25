/**
 * `qfai cross-spec` — the files a change touched, measured from the base, and
 * what it exits with.
 *
 * Which rows are blocked and which proof is current are held in
 * `tests/core/crossSpecRereview.test.ts`. These cases hold what the command
 * owns: committed and uncommitted changes both count, the JSON reads, and a
 * base the clone does not hold is refused rather than read as no change.
 */
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCrossSpec } from "../../src/cli/commands/crossSpec.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function write(root: string, relative: string, body: string): Promise<void> {
  const abs = path.join(root, relative);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=qfai", "-c", "user.email=qfai@example.com", ...args],
    { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
}

/** A repository with one completed row, and the revision it was committed at. */
async function repository(): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-cross-spec-cli-"));
  tempDirs.push(root);
  await write(root, "src/login.ts", "export const login = 1;\n");
  await write(root, "src/billing.ts", "export const charge = 1;\n");
  await write(
    root,
    "tests/login.test.ts",
    'import { login } from "../src/login.js";\nit("logs in", () => login);\n',
  );
  await write(
    root,
    ".qfai/specs/spec-0001/tdd/test-list.md",
    "| TDD-ID | TC-Refs | Layer | Test file | Selector | Status | DR-ID | Evidence |\n" +
      "| --- | --- | --- | --- | --- | --- | --- | --- |\n" +
      "| TDD-0001 | TC-0001 | Unit | tests/login.test.ts | logs in | done | - | evidence at `.qfai/evidence/implement-spec-0001.md#tdd-0001` |\n",
  );
  await write(
    root,
    ".qfai/evidence/implement-spec-0001.md",
    "### TDD-0001\n\n- Round 1: GREEN command: npx vitest run tests/login.test.ts\n- Round 1: Oracle proof: returned early; the test failed\n",
  );
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "seed");
  return { root, base: git(root, "rev-parse", "HEAD") };
}

/** Everything the command wrote to stdout while `run` was awaited. */
async function captured(run: () => Promise<number>): Promise<{ exitCode: number; said: string }> {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  try {
    return { exitCode: await run(), said: chunks.join("") };
  } finally {
    spy.mockRestore();
  }
}

describe("qfai cross-spec", () => {
  it("counts a committed change against the base", async () => {
    const { root, base } = await repository();
    await write(root, "src/login.ts", "export const login = 2;\n");
    git(root, "commit", "-q", "-am", "change login");

    const { exitCode, said } = await captured(() => runCrossSpec({ root, base, format: "json" }));
    expect(exitCode).toBe(0);
    const payload: unknown = JSON.parse(said);
    expect(payload).toMatchObject({
      base,
      changed: ["src/login.ts"],
      rows: [
        {
          spec: "spec-0001",
          tddId: "TDD-0001",
          blockedBy: "reach",
          selector: "logs in",
          greenCommand: "npx vitest run tests/login.test.ts",
          proof: { kind: "oracle-proof", round: 1, proof: "returned early; the test failed" },
        },
      ],
    });
  });

  it("counts an uncommitted change too, and says when nothing is blocked", async () => {
    const { root, base } = await repository();
    await write(root, "src/billing.ts", "export const charge = 2;\n");

    const { exitCode, said } = await captured(() => runCrossSpec({ root, base }));
    expect(exitCode).toBe(0);
    expect(said).toContain("0 completed row(s) blocked by 1 file(s) changed since");
  });

  it("names the row, its selector and its proof in the text output", async () => {
    const { root, base } = await repository();
    await write(root, "tests/login.test.ts", 'import { login } from "../src/login.js";\n');

    const { said } = await captured(() => runCrossSpec({ root, base }));
    expect(said).toContain("spec-0001 TDD-0001 [Unit] tests/login.test.ts");
    expect(said).toContain("blocked by test-file: tests/login.test.ts");
    expect(said).toContain("selector: logs in");
    expect(said).toContain("proof (round 1): returned early; the test failed");
  });

  it("refuses a base the clone does not hold", async () => {
    const { root } = await repository();
    const errors = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const { exitCode } = await captured(() => runCrossSpec({ root, base: "no/such/ref" }));
    expect(exitCode).toBe(2);
    expect(String(errors.mock.calls[0]?.[0])).toContain("cannot list the files changed since");
  });
});

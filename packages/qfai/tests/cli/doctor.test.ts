import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { runInit } from "../../src/cli/commands/init.js";
import { run } from "../../src/cli/main.js";

describe("doctor", () => {
  it("finds config in parent when --root is omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    const cwd = path.join(root, "packages", "app");
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
      await mkdir(cwd, { recursive: true });

      const output = await captureStdout(async () => {
        await run(["doctor"], cwd);
      });

      expect(output).toContain("qfai doctor:");
      expect(output).toContain("found");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes json output to --out", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-doctor-"));
    try {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });

      const outPath = path.join(root, ".qfai", "out", "doctor.json");
      await runDoctor({
        root,
        rootExplicit: true,
        format: "json",
        outPath,
      });

      const raw = await readFile(outPath, "utf-8");
      const parsed = JSON.parse(raw) as {
        tool?: string;
        doctorFormatVersion?: number;
        checks?: unknown[];
        summary?: { ok?: number };
      };
      expect(parsed.tool).toBe("qfai");
      expect(parsed.doctorFormatVersion).toBe(1);
      expect(Array.isArray(parsed.checks)).toBe(true);
      expect(typeof parsed.summary?.ok).toBe("number");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function captureStdout(task: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  const mockWrite: typeof process.stdout.write = (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((err?: Error) => void),
    cb?: (err?: Error) => void,
  ): boolean => {
    output.push(
      typeof chunk === "string"
        ? chunk
        : Buffer.from(chunk).toString("utf-8"),
    );
    const callback = typeof encoding === "function" ? encoding : cb;
    if (callback) {
      callback();
    }
    return true;
  };
  process.stdout.write = mockWrite;

  try {
    await task();
  } finally {
    process.stdout.write = originalWrite;
  }

  return output.join("");
}

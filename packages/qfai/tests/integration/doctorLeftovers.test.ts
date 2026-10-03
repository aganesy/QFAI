/**
 * Integration: `qfai doctor` lists what an earlier release left in the project
 * under `paths.leftovers`, at `info`, and deletes none of it under any flag.
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { runDoctor } from "../../src/cli/commands/doctor.js";
import { createDoctorData } from "../../src/core/doctor.js";
import { useTempDirPool } from "../helpers/shippedWorkflowFixtures.js";
import { captureStdout } from "../helpers/stdout.js";

const newTempDir = useTempDirPool("qfai-doctor-leftovers-");

async function exists(file: string): Promise<boolean> {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function seed(dir: string, relative: string): Promise<void> {
  const target = path.join(dir, ...relative.split("/"));
  if (relative.endsWith("/")) {
    await mkdir(target, { recursive: true });
  } else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "{}\n", "utf-8");
  }
}

async function leftovers(dir: string) {
  const data = await createDoctorData({ startDir: dir, rootExplicit: true });
  const check = data.checks.find((entry) => entry.id === "paths.leftovers");
  expect(check, "paths.leftovers is reported").toBeDefined();
  return check;
}

describe("doctor paths.leftovers", () => {
  // QFAI:AC-0003-0004-02
  // QFAI:EX-0003-0004-05
  it("lists the leftover paths at info and keeps them", async () => {
    const dir = await newTempDir();
    const left = [
      ".qfai/evidence/",
      ".qfai/review/",
      ".qfai/run/",
      ".qfai/assistant/.assets.lock.json",
      ".qfai/install-provenance.json",
    ];
    for (const relative of left) await seed(dir, relative);

    const check = await leftovers(dir);

    expect(check?.severity).toBe("info");
    expect(check?.details?.["paths"]).toEqual(left);
    for (const relative of left) {
      expect(await exists(path.join(dir, ...relative.split("/"))), relative).toBe(true);
    }
  });

  // QFAI:EX-0003-0004-06
  it("lists the retired discussion-pack files under --clean and keeps them", async () => {
    const dir = await newTempDir();
    const pack = ".qfai/discussion/discussion-20260101000000000";
    const files = [
      "12_OQ-Resolution-Log.md",
      "13_Deferred.md",
      "14_Review-Request.md",
      "99_delta.md",
    ].map((name) => `${pack}/${name}`);
    for (const relative of files) await seed(dir, relative);
    const outPath = path.join(dir, "doctor.txt");

    await captureStdout(async () => {
      await runDoctor({ root: dir, rootExplicit: true, format: "text", outPath, clean: true });
    });

    const text = await readFile(outPath, "utf-8");
    for (const relative of files) {
      expect(text, relative).toContain(`  ${relative}`);
      expect(await exists(path.join(dir, ...relative.split("/"))), relative).toBe(true);
    }
  });

  // QFAI:AC-0003-0004-03
  // QFAI:EX-0003-0004-07
  it("names the migration archive on its own line and keeps it", async () => {
    const dir = await newTempDir();
    const archive = ".qfai/evidence/migration-spec-to-story/";
    await seed(dir, archive);

    const check = await leftovers(dir);

    const line = check?.message.split("\n").find((entry) => entry.startsWith(archive));
    expect(line).toContain("may hold the only copy of content the 1.x migration retired");
    expect(line).toContain("you decide whether to delete it");
    expect(await exists(path.join(dir, ...archive.split("/")))).toBe(true);
  });

  // QFAI:AC-0003-0004-04
  // QFAI:EX-0003-0004-08
  it("is ok and lists nothing when none is present", async () => {
    const check = await leftovers(await newTempDir());

    expect(check?.severity).toBe("ok");
    expect(check?.details?.["paths"]).toEqual([]);
  });
});

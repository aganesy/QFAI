/**
 * Integration: a packaged workflows directory that exists and holds nothing.
 *
 * Review finding [86]. The whole-tree precondition asked only whether the packaged path was a
 * readable DIRECTORY — and a partial extraction, or a half-finished install, leaves exactly that:
 * the directory, with the workflow files gone. Every packaged file then reads as absent, the
 * per-file rule treats each one as a name the package no longer ships and excludes it, the count
 * lands on zero, `status` is `ok`, and `doctor` registers neither drift nor a skip. The package
 * damage that repair exists for reads as a clean check.
 *
 * Two directions, because a precondition that fires on everything is not a precondition: a gutted
 * tree is unresolved, and a tree holding the packaged copy is compared exactly as before.
 *
 * The override is how a controlled packaged tree is supplied. It also decides how strict the
 * precondition is, and that distinction is asserted here rather than left implied: against the
 * RUNNING package every shipped name must be present, because the list is the package's own claim
 * about what it ships; against a caller-supplied tree at least one, because an override exists to
 * compare with a controlled directory and demanding the whole write set would turn every partial
 * fixture into an unresolved run.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import { SHIPPED_WORKFLOW_NAMES } from "../../src/shared/shippedWorkflowNames.js";

const temps: string[] = [];

async function temp(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-gutted-packaged-"));
  temps.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of temps) await rm(dir, { recursive: true, force: true });
});

/**
 * An adopter tree with one recorded shipped workflow installed.
 *
 * Hand-built rather than seeded through `init`: this suite is about the PACKAGED side, and a real
 * seed would bring a real packaged directory with it — the one state these rows must supply
 * themselves.
 */
async function adopterTree(name: string, body: string): Promise<string> {
  const dir = await temp();
  const workflows = path.join(dir, ".github", "workflows");
  await mkdir(workflows, { recursive: true });
  await writeFile(path.join(workflows, name), body, "utf-8");
  await mkdir(path.join(dir, ".qfai"), { recursive: true });
  await writeFile(
    path.join(dir, ".qfai", "install-provenance.json"),
    `${JSON.stringify(
      {
        workflows: {
          [name]: {
            sha256: "0".repeat(64),
            installedAt: "2026-01-01T00:00:00.000Z",
            installedByVersion: "1.0.0",
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  return dir;
}

describe("a packaged workflows directory holding none of the shipped files", () => {
  it("is unresolved rather than a clean comparison", async () => {
    const name = "qfai-tests.yml";
    const body = "name: shipped\n";
    const dir = await adopterTree(name, body);
    const packaged = await temp();

    const diff = await diffInstalledShippedWorkflows(dir, packaged);

    expect(
      diff.status,
      "an empty packaged directory is package damage, and reporting it as `ok` is the fail-open " +
        "the whole-tree precondition exists to close",
    ).toBe("skipped_unresolved");
    expect(diff.comparedCount, "nothing was compared, and the status must say so").toBe(0);
    expect(diff.modified, "and an unresolved read reports no drift").toEqual([]);
  });

  it("compares normally as soon as the packaged copy is there", async () => {
    // The control, and it is the half a blanket refusal would break: the precondition must fire on
    // a gutted tree and on nothing else.
    const name = "qfai-tests.yml";
    const body = "name: shipped\n";
    const dir = await adopterTree(name, body);
    const packaged = await temp();
    await writeFile(path.join(packaged, name), body, "utf-8");

    const diff = await diffInstalledShippedWorkflows(dir, packaged);

    expect(diff.status, "a matching pair is not drift").toBe("ok");
    expect(diff.comparedCount, "and the packaged copy was opened").toBe(1);
  });

  it("reports drift through the same precondition, so it is a gate and not a filter", async () => {
    const name = "qfai-tests.yml";
    const dir = await adopterTree(name, "name: installed\n");
    const packaged = await temp();
    await writeFile(path.join(packaged, name), "name: packaged, and different\n", "utf-8");

    const diff = await diffInstalledShippedWorkflows(dir, packaged);

    expect(diff.status, "the bytes differ, so this is drift").toBe("modified");
    expect(diff.modified, "and the finding names the file").toEqual([`.github/workflows/${name}`]);
  });

  it("accepts an override holding some of the shipped names, which a fixture legitimately is", async () => {
    // The strictness distinction, asserted. `SHIPPED_WORKFLOW_NAMES` holds more than one name, and
    // a controlled tree carrying one of them is the ordinary shape of every fixture in the sibling
    // suites — so requiring the whole write set here would turn them all unresolved.
    expect(
      SHIPPED_WORKFLOW_NAMES.size,
      "the distinction this row asserts needs at least two shipped names to be visible",
    ).toBeGreaterThan(1);

    const [first] = [...SHIPPED_WORKFLOW_NAMES];
    if (first === undefined) throw new Error("the shipped name set is empty");
    const body = "name: shipped\n";
    const dir = await adopterTree(first, body);
    const packaged = await temp();
    await writeFile(path.join(packaged, first), body, "utf-8");

    const diff = await diffInstalledShippedWorkflows(dir, packaged);
    expect(diff.status, "one packaged name is enough for a caller-supplied tree").toBe("ok");
  });

  it("is unresolved when a packaged file is present but cannot be read", async () => {
    // Review finding [93]. The precondition checked `lstat().isFile()` and was named for
    // something it did not do: a regular file over the bounded reader's ceiling satisfies that
    // test, and then the recorded workflow of the same name reads as `unreadable` further down,
    // is classified `modified`, and `doctor` tells the operator to copy from a packaged file it
    // cannot read. Damage reported as drift, with a repair instruction that cannot work.
    const name = "qfai-tests.yml";
    const dir = await adopterTree(name, "name: shipped\n");
    const packaged = await temp();
    // Past the reader's 1 MiB ceiling, and a perfectly ordinary regular file otherwise.
    await writeFile(
      path.join(packaged, name),
      `name: shipped\n${"#".repeat(1024 * 1024 + 16)}\n`,
      "utf-8",
    );

    const diff = await diffInstalledShippedWorkflows(dir, packaged);

    expect(
      diff.status,
      "a packaged file this reader cannot read is not a comparison, and not drift",
    ).toBe("skipped_unresolved");
    expect(diff.modified, "and nothing may be reported as modified from it").toEqual([]);
  });

  it("is unresolved when a packaged name is a symlink rather than a file", async () => {
    // The other half of the same precondition. The packaged tree is this package's own; a link
    // inside it is damage of the same kind a missing file is.
    const name = "qfai-tests.yml";
    const body = "name: shipped\n";
    const dir = await adopterTree(name, body);
    const packaged = await temp();
    const target = path.join(packaged, "real.yml");
    await writeFile(target, body, "utf-8");
    const { symlink } = await import("node:fs/promises");
    try {
      await symlink(target, path.join(packaged, name));
    } catch {
      // Windows without developer mode refuses symlink creation for an unprivileged process.
      return;
    }

    const diff = await diffInstalledShippedWorkflows(dir, packaged);
    expect(diff.status).toBe("skipped_unresolved");
  });

  it("leaves the adopter tree untouched, whichever way the precondition goes", async () => {
    // A read is a read. The unresolved arm returns early, and an early return that had written
    // something on the way would be a repair nobody asked for.
    const name = "qfai-tests.yml";
    const body = "name: shipped\n";
    const dir = await adopterTree(name, body);
    const packaged = await temp();

    await diffInstalledShippedWorkflows(dir, packaged);

    expect(await readFile(path.join(dir, ".github", "workflows", name), "utf-8")).toBe(body);
  });
});

/**
 * QFAI-SPACK-095 — a divergent required-file catalog is reported (#393).
 *
 * `resolveLayeredRequiredFileSets` prefers the on-disk catalog over the in-code
 * defaults and falls back silently, and a well-formed catalog array replaces
 * the default wholesale rather than merging. So a project's catalog silently
 * decides which files are mandatory, and a file one side considers required can
 * never raise `E_SPEC_MISSING_FILESET`.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import {
  REQUIRED_LAYERED_SHARED_FILES_V1421,
  REQUIRED_LAYERED_SPEC_FILES_V1421,
} from "../../src/core/specLayout.js";
import { validateSpecRequiredFilesCatalog } from "../../src/core/validators/specRequiredFilesCatalog.js";

const tempDirs: string[] = [];

async function withCatalog(content: string | null): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-required-files-"));
  tempDirs.push(root);
  await mkdir(path.join(root, ".qfai", "specs"), { recursive: true });
  if (content !== null) {
    const dir = path.join(root, ".qfai", "assistant", "catalog");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "spec_required_files.json"), content, "utf-8");
  }
  return root;
}

const matching = JSON.stringify(
  {
    spec_dir: [...REQUIRED_LAYERED_SPEC_FILES_V1421],
    shared_dir: [...REQUIRED_LAYERED_SHARED_FILES_V1421],
  },
  null,
  2,
);

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

describe("validateSpecRequiredFilesCatalog", () => {
  it("is silent when the catalog matches the built-in sets", async () => {
    const root = await withCatalog(matching);

    await expect(validateSpecRequiredFilesCatalog(root, defaultConfig)).resolves.toEqual([]);
  });

  it("is silent when there is no catalog at all", async () => {
    // No catalog means the built-in defaults apply — the documented fallback,
    // not a divergence.
    const root = await withCatalog(null);

    await expect(validateSpecRequiredFilesCatalog(root, defaultConfig)).resolves.toEqual([]);
  });

  it("reports a file the catalog requires and the built-in set does not", async () => {
    const root = await withCatalog(
      JSON.stringify({
        spec_dir: [...REQUIRED_LAYERED_SPEC_FILES_V1421, "99_Extra.md"],
        shared_dir: [...REQUIRED_LAYERED_SHARED_FILES_V1421],
      }),
    );

    const issues = await validateSpecRequiredFilesCatalog(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("QFAI-SPACK-095");
    // A project may customise deliberately, so this is a warning with a waiver
    // route — the point is that it stops being silent.
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.message).toContain("required only by the catalog: 99_Extra.md");
    expect(issues[0]?.suggested_action).toContain("QFAI-SPACK-095");
  });

  it("reports a file the built-in set requires and the catalog omits", async () => {
    const root = await withCatalog(
      JSON.stringify({
        spec_dir: [...REQUIRED_LAYERED_SPEC_FILES_V1421],
        shared_dir: REQUIRED_LAYERED_SHARED_FILES_V1421.filter(
          (name) => name !== "11_Slice-Policy.md",
        ),
      }),
    );

    const issues = await validateSpecRequiredFilesCatalog(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(
      "required only by the built-in default: 11_Slice-Policy.md",
    );
    expect(issues[0]?.message).toContain("The catalog wins");
  });

  it("reports both sets independently", async () => {
    const root = await withCatalog(
      JSON.stringify({
        spec_dir: [...REQUIRED_LAYERED_SPEC_FILES_V1421, "99_Extra.md"],
        shared_dir: REQUIRED_LAYERED_SHARED_FILES_V1421.filter(
          (name) => name !== "11_Slice-Policy.md",
        ),
      }),
    );

    const issues = await validateSpecRequiredFilesCatalog(root, defaultConfig);

    expect(issues).toHaveLength(2);
  });

  it("reports a malformed catalog rather than falling back silently", async () => {
    const root = await withCatalog("{ not json");

    const issues = await validateSpecRequiredFilesCatalog(root, defaultConfig);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("could not be parsed");
    expect(issues[0]?.suggested_action).toContain("silently changes which files are mandatory");
  });

  it("ignores a set the catalog does not declare", async () => {
    // A partial catalog falls back per key, which is existing behaviour.
    const root = await withCatalog(
      JSON.stringify({ spec_dir: [...REQUIRED_LAYERED_SPEC_FILES_V1421] }),
    );

    await expect(validateSpecRequiredFilesCatalog(root, defaultConfig)).resolves.toEqual([]);
  });
});

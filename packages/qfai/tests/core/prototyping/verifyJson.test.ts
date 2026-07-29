import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  readVerifyJson,
  VERIFY_JSON_LEGACY_REL,
  VERIFY_JSON_REL,
} from "../../../src/core/prototyping/verifyJson.js";

async function withRoot(
  files: Record<string, string>,
  assertion: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-verify-json-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(root, rel);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf-8");
    }
    await assertion(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("readVerifyJson", () => {
  it("prefers the canonical .qfai/report location", async () => {
    await withRoot(
      {
        [VERIFY_JSON_REL]: JSON.stringify({ status: "PASS", scope: "prototyping" }),
        [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "FAIL" }),
      },
      async (root) => {
        const read = await readVerifyJson(root);
        expect(read.source).toBe("canonical");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.json?.status).toBe("PASS");
        expect(read.error).toBeNull();
      },
    );
  });

  it("falls back to the legacy .qfai/output location", async () => {
    await withRoot(
      { [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }) },
      async (root) => {
        const read = await readVerifyJson(root);
        expect(read.source).toBe("legacy");
        expect(read.rel).toBe(VERIFY_JSON_LEGACY_REL);
        expect(read.json?.status).toBe("PASS");
        expect(read.error).toBeNull();
      },
    );
  });

  it("reports missing against the canonical path, not the legacy one", async () => {
    await withRoot({}, async (root) => {
      const read = await readVerifyJson(root);
      expect(read).toEqual({
        source: "missing",
        rel: VERIFY_JSON_REL,
        json: null,
        error: null,
      });
    });
  });

  it("refuses to fall back past an unparseable canonical file", async () => {
    // A stale legacy PASS left behind by the migration must not be able to
    // certify a run whose canonical gate result was never readable.
    await withRoot(
      {
        [VERIFY_JSON_REL]: "{ not json",
        [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }),
      },
      async (root) => {
        const read = await readVerifyJson(root);
        expect(read.source).toBe("unreadable");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.json).toBeNull();
        expect(read.error).toContain("invalid JSON");
      },
    );
  });

  it("refuses to fall back past a non-object canonical payload", async () => {
    await withRoot(
      {
        [VERIFY_JSON_REL]: JSON.stringify(["PASS"]),
        [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }),
      },
      async (root) => {
        const read = await readVerifyJson(root);
        expect(read.source).toBe("unreadable");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.error).toBe("expected a JSON object, got an array");
      },
    );
  });

  it("reports a broken legacy file instead of calling it missing", async () => {
    await withRoot({ [VERIFY_JSON_LEGACY_REL]: "null" }, async (root) => {
      const read = await readVerifyJson(root);
      expect(read.source).toBe("unreadable");
      expect(read.rel).toBe(VERIFY_JSON_LEGACY_REL);
      expect(read.error).toBe("expected a JSON object, got null");
    });
  });

  it("treats a dangling symlink at the canonical path as unreadable, not absent", async () => {
    // `readFile` reports a dangling link as ENOENT, exactly like a missing
    // file, so the fallback would have handed certify the legacy PASS.
    await withRoot(
      { [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }) },
      async (root) => {
        const canonical = path.join(root, VERIFY_JSON_REL);
        await mkdir(path.dirname(canonical), { recursive: true });
        try {
          await symlink(path.join(root, "no-such-target.json"), canonical);
        } catch {
          // Windows without developer mode refuses symlink creation; the
          // behaviour under test is unreachable there.
          return;
        }

        const read = await readVerifyJson(root);
        expect(read.source).toBe("unreadable");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.error).toContain("dangling symlink");
      },
    );
  });

  it("treats a dangling symlink at an ancestor as unreadable, not absent", async () => {
    // The leaf `lstat` cannot see this: with `.qfai/report` itself a broken
    // link, both `readFile` and `lstat` on `.qfai/report/verify.json` report
    // ENOENT, so the canonical route looked simply "not written yet" and the
    // stale legacy PASS was handed to certify.
    await withRoot(
      { [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }) },
      async (root) => {
        const reportDir = path.join(root, ".qfai", "report");
        await mkdir(path.dirname(reportDir), { recursive: true });
        try {
          await symlink(path.join(root, "no-such-dir"), reportDir, "dir");
        } catch {
          // Windows without developer mode refuses symlink creation; the
          // behaviour under test is unreachable there.
          return;
        }

        const read = await readVerifyJson(root);
        expect(read.source).toBe("unreadable");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.error).toContain(".qfai/report is a dangling symlink");
        expect(read.json).toBeNull();
      },
    );
  });

  it("still reports missing when the report directory simply does not exist", async () => {
    // The ancestor walk must not turn an ordinary fresh project into a hard
    // stop: nothing at all on the canonical path is still `missing`.
    await withRoot({}, async (root) => {
      const read = await readVerifyJson(root);
      expect(read.source).toBe("missing");
      expect(read.rel).toBe(VERIFY_JSON_REL);
      expect(read.error).toBeNull();
    });
  });

  it("treats a directory at the canonical path as unreadable, not absent", async () => {
    // Not ENOENT: something occupies the path and cannot be read, so the
    // fallback must not fire.
    await withRoot(
      { [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }) },
      async (root) => {
        await mkdir(path.join(root, VERIFY_JSON_REL), { recursive: true });
        const read = await readVerifyJson(root);
        expect(read.source).toBe("unreadable");
        expect(read.rel).toBe(VERIFY_JSON_REL);
        expect(read.error).not.toBeNull();
      },
    );
  });
});

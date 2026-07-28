import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      },
    );
  });

  it("falls back to the legacy .qfai/output location", async () => {
    await withRoot({ [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }) }, async (root) => {
      const read = await readVerifyJson(root);
      expect(read.source).toBe("legacy");
      expect(read.rel).toBe(VERIFY_JSON_LEGACY_REL);
      expect(read.json?.status).toBe("PASS");
    });
  });

  it("reports missing against the canonical path, not the legacy one", async () => {
    await withRoot({}, async (root) => {
      const read = await readVerifyJson(root);
      expect(read).toEqual({ source: "missing", rel: VERIFY_JSON_REL, json: null });
    });
  });

  it("treats an unparseable canonical file as absent and falls through", async () => {
    await withRoot(
      {
        [VERIFY_JSON_REL]: "{ not json",
        [VERIFY_JSON_LEGACY_REL]: JSON.stringify({ status: "PASS" }),
      },
      async (root) => {
        const read = await readVerifyJson(root);
        expect(read.source).toBe("legacy");
      },
    );
  });

  it("rejects a non-object payload", async () => {
    await withRoot({ [VERIFY_JSON_REL]: JSON.stringify(["PASS"]) }, async (root) => {
      expect((await readVerifyJson(root)).source).toBe("missing");
    });
  });
});

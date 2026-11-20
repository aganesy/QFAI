/**
 * `scripts/gen-codex-agents.mjs` reads each existing Codex profile before it
 * decides whether to rewrite it. Only a profile that does not exist is absent.
 *
 * A read that fails for any other reason (a permission refusal, an I/O error)
 * used to read as a missing profile: `--check` reported it as generated drift,
 * and a plain run overwrote a file whose contents it never saw. The failure now
 * surfaces before anything is written.
 *
 * `readFile` is mocked, because a permission failure cannot be made portably on
 * every platform the suite runs on (a mode change does not restrict a file on
 * Windows, nor for a privileged user). `vi.mock` is hoisted to module scope, so
 * these cases live in their own file.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import type * as fsPromises from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

type FsPromises = typeof fsPromises;

const refusal = vi.hoisted(() => ({ file: "", code: "EACCES" }));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<FsPromises>("node:fs/promises");
  return {
    ...actual,
    readFile: (...args: Parameters<FsPromises["readFile"]>) => {
      if (refusal.file !== "" && path.resolve(String(args[0])) === refusal.file) {
        return Promise.reject(
          Object.assign(new Error(`${refusal.code}: operation failed, open '${refusal.file}'`), {
            code: refusal.code,
          }),
        );
      }
      return Reflect.apply(actual.readFile, actual, args) as unknown;
    },
  };
});

const { readExistingProfile } = await import("../../../../scripts/gen-codex-agents.mjs");

const TARGET = path.resolve("codex-profile-under-test.toml");

afterEach(() => {
  refusal.file = "";
  refusal.code = "EACCES";
});

describe("an existing Codex profile the generator cannot read", () => {
  it.each(["EACCES", "EIO", "EISDIR"])(
    "rejects with the profile's path and the %s cause instead of reading it as absent",
    async (code) => {
      refusal.file = TARGET;
      refusal.code = code;

      const read = readExistingProfile(TARGET);

      await expect(read).rejects.toThrow(TARGET);
      await expect(read).rejects.toThrow(code);
    },
  );

  it("keeps a profile that does not exist a tolerated absence", async () => {
    refusal.file = TARGET;
    refusal.code = "ENOENT";

    await expect(readExistingProfile(TARGET)).resolves.toBeNull();
  });

  it("returns the contents of a profile that reads", async () => {
    const own = fileURLToPath(import.meta.url);

    const contents = await readExistingProfile(own);

    expect(contents).toContain("readExistingProfile");
  });
});

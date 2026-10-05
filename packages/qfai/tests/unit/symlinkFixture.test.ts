import { describe, expect, it } from "vitest";

import { createSymlinkFixture, isUnsupportedSymlinkError } from "../helpers/symlinkFixture.js";

function failure(code: string, message: string): Error {
  return Object.assign(new Error(message), { code, path: "/fixture/link" });
}

describe("symlink fixture setup", () => {
  it("treats the Windows refusal as an unsupported host", async () => {
    const refused = failure("EPERM", "operation not permitted");

    expect(isUnsupportedSymlinkError(refused, "win32")).toBe(true);
    await expect(
      createSymlinkFixture("/fixture/target", "/fixture/link", "dir", {
        platform: "win32",
        createSymlink: () => Promise.reject(refused),
      }),
    ).resolves.toBe(false);
  });

  it("reports a created link as available", async () => {
    await expect(
      createSymlinkFixture("/fixture/target", "/fixture/link", "dir", {
        createSymlink: () => Promise.resolve(),
      }),
    ).resolves.toBe(true);
  });

  it("rethrows EPERM on a platform where symlinks are always allowed", async () => {
    const refused = failure("EPERM", "operation not permitted");

    expect(isUnsupportedSymlinkError(refused, "linux")).toBe(false);
    await expect(
      createSymlinkFixture("/fixture/target", "/fixture/link", "dir", {
        platform: "linux",
        createSymlink: () => Promise.reject(refused),
      }),
    ).rejects.toBe(refused);
  });

  it("rethrows any other failure with its code, path and message", async () => {
    const unexpected = failure("ENOENT", "no such file or directory");

    expect(isUnsupportedSymlinkError(unexpected, "win32")).toBe(false);
    await expect(
      createSymlinkFixture("/fixture/target", "/fixture/link", "dir", {
        platform: "win32",
        createSymlink: () => Promise.reject(unexpected),
      }),
    ).rejects.toMatchObject({
      code: "ENOENT",
      path: "/fixture/link",
      message: "no such file or directory",
    });
  });

  it("does not treat a value that is not an error object as unsupported", () => {
    expect(isUnsupportedSymlinkError("EPERM", "win32")).toBe(false);
    expect(isUnsupportedSymlinkError(null, "win32")).toBe(false);
  });
});

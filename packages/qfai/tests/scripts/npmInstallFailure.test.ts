/**
 * An `npm install` that fails on a damaged cache says so.
 *
 * npm reports the missing cache entry as a bare ENOENT under the cache's
 * content store, which reads like a registry failure. The explanation is
 * given only where the log shows that signature, so another failure keeps
 * npm's own words.
 */
import { describe, expect, it } from "vitest";

import { explainNpmInstallFailure } from "../../../../scripts/lib/npm-failure.mjs";

describe("explainNpmInstallFailure", () => {
  it("names a damaged cache and the command that repairs it", () => {
    const stderr = String.raw`npm error code ENOENT
npm error syscall open
npm error path C:\Users\dev\AppData\Local\npm-cache\_cacache\content-v2\sha512\ab\cd\ef
npm error errno -4058`;

    expect(explainNpmInstallFailure(stderr)).toContain("npm cache verify");
  });

  it("names a damaged cache on a POSIX path", () => {
    const stderr =
      "npm error ENOENT: no such file or directory, open '/home/dev/.npm/_cacache/index-v5/aa/bb'";

    expect(explainNpmInstallFailure(stderr)).toContain("cache is damaged");
  });

  it("leaves a registry failure to npm's own output", () => {
    const stderr =
      "npm error code E404\nnpm error 404 Not Found - GET https://registry.npmjs.org/x";

    expect(explainNpmInstallFailure(stderr)).toBeNull();
  });

  it("leaves a missing file elsewhere to npm's own output", () => {
    const stderr = "npm error ENOENT: no such file or directory, open '/work/package.json'";

    expect(explainNpmInstallFailure(stderr)).toBeNull();
  });
});

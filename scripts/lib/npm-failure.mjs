/**
 * Name the cause of an `npm install` failure whose log would otherwise read
 * like a registry failure.
 *
 * A missing entry under the npm cache's content store means the cache is
 * damaged, not that the registry or the tarball is wrong, and
 * `npm cache verify` repairs it. Returns `null` when the log shows nothing
 * this function can name, so the caller leaves npm's own output to speak.
 *
 * @param {string} stderr
 * @returns {string | null}
 */
export function explainNpmInstallFailure(stderr) {
  if (/ENOENT/.test(stderr) && /_cacache/.test(stderr)) {
    return (
      "npm failed because its cache is damaged: a file under _cacache is missing. " +
      "Run `npm cache verify` and run again."
    );
  }
  return null;
}

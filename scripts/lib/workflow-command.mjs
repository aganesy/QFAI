/**
 * Escape a value before it goes into a GitHub Actions workflow command.
 *
 * A workflow command is a line protocol. A path a guard found by scanning the index or walking
 * the tree is chosen by whoever wrote the pull request, so a path carrying a line break would
 * end the command and start a log line of its own, such as `::stop-commands::<token>`, which
 * silences every annotation after it. A `%` would be decoded by the runner as an escape the
 * path never meant.
 *
 * The rules are the ones `qfai validate --format github` applies, and they differ by field:
 * the message is decoded for `%`, CR and LF only, and a property value (`file=...`) is also
 * split at `:` and `,`. `%` is escaped first, or it would re-encode the escapes that follow it.
 */

/**
 * The message of a workflow command: everything after its closing `::`.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeCommandMessage(value) {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/**
 * One property value in a workflow command's metadata, such as the path in `file=<path>`.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeCommandProperty(value) {
  return escapeCommandMessage(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

/**
 * The last filter on everything `qfai session-review` prints.
 *
 * The report is built from counts and fixed words, so a secret reaches it only through a string the
 * transcript supplied: a tool name, a session ID, a path. Each of those passes this filter, which
 * writes the project root and the home directory as placeholders and blanks anything shaped like a
 * credential or an e-mail address.
 */

/** The shapes blanked wherever they appear, in the order they are applied. */
const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{20,}/g,
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/g,
  /(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}(?![A-Za-z0-9])/g,
  /(?<![A-Za-z0-9])xox[bp]-[A-Za-z0-9-]{8,}/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\bpassword\s*=\s*\S+/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
];

const REDACTED = "[redacted]";

export type RedactContext = {
  root: string;
  home: string;
  /** Windows compares paths without regard to letter case. */
  platform: NodeJS.Platform;
};

/** `text` with the root and home written as `<root>` and `~`, and every secret shape blanked. */
export function redact(text: string, context: RedactContext): string {
  let out = replacePath(text, context.root, "<root>", context.platform);
  out = replacePath(out, context.home, "~", context.platform);
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

/** Replace `dir` in either slash style, and on Windows in any letter case. */
function replacePath(
  text: string,
  dir: string,
  placeholder: string,
  platform: NodeJS.Platform,
): string {
  const trimmed = dir.replace(/[\\/]+$/, "");
  if (trimmed === "") return text;
  const pattern = trimmed
    .split(/[\\/]+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\\\/]+");
  return text.replace(new RegExp(pattern, platform === "win32" ? "gi" : "g"), placeholder);
}

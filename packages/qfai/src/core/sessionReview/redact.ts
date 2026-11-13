/**
 * The last filter on everything `qfai session-review` prints.
 *
 * The report is built from counts and fixed words, so a secret reaches it only through a string the
 * transcript supplied: a tool name, a session ID, a path. Each of those passes this filter, which
 * writes the project root, the hosts' configured transcript directories and the home directory as
 * placeholders and blanks anything shaped like a credential or an e-mail address.
 */

/** The shapes blanked wherever they appear, in the order they are applied. */
const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{20,}/g,
  /(?<![A-Za-z0-9])github_pat_[A-Za-z0-9_]{20,}/g,
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/g,
  /(?<![A-Za-z0-9])(?:AKIA|ASIA)[0-9A-Z]{16}(?![A-Za-z0-9])/g,
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
  /** `CLAUDE_CONFIG_DIR`, where it is set. */
  claudeConfigDir?: string;
  /** `CODEX_HOME`, where it is set. */
  codexHome?: string;
  /** Windows compares paths without regard to letter case. */
  platform: NodeJS.Platform;
};

/**
 * `text` with the root, the configured transcript directories and the home written as `<root>`,
 * `$CLAUDE_CONFIG_DIR`, `$CODEX_HOME` and `~`, and every secret shape blanked.
 */
export function redact(text: string, context: RedactContext): string {
  let out = replacePath(text, context.root, "<root>", context.platform);
  for (const [dir, placeholder] of [
    [context.claudeConfigDir, "$CLAUDE_CONFIG_DIR"],
    [context.codexHome, "$CODEX_HOME"],
  ] as const) {
    if (dir !== undefined) out = replacePath(out, dir, placeholder, context.platform);
  }
  out = replacePath(out, context.home, "~", context.platform);
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

/**
 * Replace `dir` where it ends at a path-segment boundary, in either slash style. On Windows it is
 * matched in any letter case and in the Git Bash form too, `/c/...` for `C:\...`.
 */
function replacePath(
  text: string,
  dir: string,
  placeholder: string,
  platform: NodeJS.Platform,
): string {
  const parts = dir.replace(/[\\/]+$/, "").split(/[\\/]+/);
  if (parts.join("") === "") return text;
  const escape = (part: string): string => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forms = [parts.map(escape).join("[\\\\/]+")];
  const drive = /^([A-Za-z]):$/.exec(parts[0] ?? "");
  if (platform === "win32" && drive !== null) {
    forms.push(["", (drive[1] ?? "").toLowerCase(), ...parts.slice(1)].map(escape).join("/"));
  }
  const pattern = `(?:${forms.join("|")})(?![A-Za-z0-9._-])`;
  return text.replace(new RegExp(pattern, platform === "win32" ? "gi" : "g"), placeholder);
}

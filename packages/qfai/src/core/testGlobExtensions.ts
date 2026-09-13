/**
 * The file extensions a project's test globs select outright.
 *
 * A glob may be extension-broad, and one that is sweeps data files into a test
 * directory beside the suites it was written for. A scan that reads sources
 * keeps a collected file only when its extension is one the scan reads or one
 * these helpers find named in a glob, so a fixture is not read as a source and
 * a language the project selected on purpose is not dropped.
 */

/** Characters an extension may carry, and the most variants a class expands to. */
const EXTENSION_TOKEN = /^[A-Za-z0-9_+-]+$/;
const MAX_CLASS_VARIANTS = 32;

/**
 * Every spelling a character-class extension selects — `[tj]s` gives `ts` and
 * `js` — or `null` when the classes do not form a short explicit list. A range,
 * a negated class or an empty one selects too much to list, so the glob is
 * treated as extension-broad.
 */
function expandCharacterClasses(extension: string): string[] | null {
  let variants = [""];
  for (const token of extension.match(/\[[^\]]*\]|[^[\]]/g) ?? []) {
    if (!token.startsWith("[")) {
      variants = variants.map((variant) => variant + token);
      continue;
    }
    const members = token.slice(1, -1);
    if (members.length === 0 || /^[!^]/.test(members) || members.includes("-")) {
      return null;
    }
    const next: string[] = [];
    for (const variant of variants) {
      for (const member of members) next.push(variant + member);
    }
    variants = next;
    if (variants.length > MAX_CLASS_VARIANTS) return null;
  }
  return variants;
}

/**
 * Extensions the globs name outright, as `.ext`, spelled as each glob spells
 * them.
 *
 * A glob ending in a literal extension names it; one ending in a brace set, an
 * extglob group or a short character class names each member; one ending in a
 * wildcard names none, which is the extension-broad case a caller filters. A
 * negative entry selects nothing, so it names nothing either. `!(…)` selects
 * every extension except its members and names none.
 *
 * The spelling is kept because a glob is matched against a path, and on a
 * case-sensitive filesystem `*.ts` does not reach `pay.TS`; a caller comparing
 * extensions lowercases its own copy.
 */
export function globExtensions(globs: readonly string[]): string[] {
  const found: string[] = [];
  const pushAlternatives = (alternatives: string[]): void => {
    for (const part of alternatives) {
      // An alternative's own last dotted segment: `{test.zig,spec.zig}` names
      // `.zig` twice.
      const extension = part.trim().split(".").at(-1) ?? "";
      if (EXTENSION_TOKEN.test(extension)) {
        found.push(`.${extension}`);
      }
    }
  };
  for (const glob of globs) {
    if (glob.startsWith("!")) continue;
    const braces = /\.\{([^}]+)\}$/.exec(glob);
    if (braces) {
      pushAlternatives((braces[1] ?? "").split(","));
      continue;
    }
    const group = /\.[@?+*]\(([^)]+)\)$/.exec(glob);
    if (group) {
      pushAlternatives((group[1] ?? "").split("|"));
      continue;
    }
    const literal = /\.((?:[A-Za-z0-9_+-]|\[[^\]]*\])+)$/.exec(glob);
    if (literal) {
      for (const variant of expandCharacterClasses(literal[1] ?? "") ?? []) {
        if (EXTENSION_TOKEN.test(variant)) found.push(`.${variant}`);
      }
    }
  }
  return found;
}

/**
 * A predicate for a file name that a glob selects by name rather than by
 * extension: the last segment of a glob naming something besides wildcards,
 * as `*.test.*`, `*.{test,spec}.*` and `test_[0-9].*` do.
 *
 * Such a glob selects a test by its name whatever the extension, so a file it
 * matches is a source even when no glob names that extension. A last segment
 * of wildcards alone names nothing, a negative entry selects nothing, and a
 * segment this reader cannot translate — a negated extglob group, an unclosed
 * brace or bracket — is left to {@link globExtensions}. Matched
 * case-sensitively, as the glob that collected the file was.
 */
export function namedTestFileMatcher(globs: readonly string[]): (fileName: string) => boolean {
  const patterns: RegExp[] = [];
  for (const glob of globs) {
    if (glob.startsWith("!")) continue;
    const last = glob.split("/").at(-1) ?? "";
    if (!/[^*?.]/.test(last)) continue;
    const source = segmentPattern(last);
    if (source !== null) patterns.push(new RegExp(`^${source}$`));
  }
  return (fileName) => patterns.some((pattern) => pattern.test(fileName));
}

/**
 * One glob path segment as a regular-expression source, or `null` for syntax
 * this reader does not translate. Braces and extglob groups become
 * alternations, a bracket expression stays a character class, and `*` and `?`
 * stay inside the segment.
 */
function segmentPattern(segment: string): string | null {
  let source = "";
  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? "";
    if ("@?+*!".includes(char) && segment[index + 1] === "(") {
      const close = segment.indexOf(")", index + 2);
      if (char === "!" || close < 0) return null;
      const group = alternation(segment.slice(index + 2, close).split("|"));
      if (group === null) return null;
      source += char === "@" ? group : `${group}${char}`;
      index = close;
    } else if (char === "{") {
      const close = segment.indexOf("}", index + 1);
      const group = close < 0 ? null : alternation(segment.slice(index + 1, close).split(","));
      if (group === null) return null;
      source += group;
      index = close;
    } else if (char === "[") {
      const close = segment.indexOf("]", index + 2);
      if (close < 0) return null;
      const members = segment.slice(index + 1, close).replaceAll("\\", "\\\\");
      source += `[${members.replace(/^[!^]/, "^")}]`;
      index = close;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.^$|\\+(){}[\]]/g, "\\$&");
    }
  }
  return source;
}

function alternation(alternatives: readonly string[]): string | null {
  const sources: string[] = [];
  for (const alternative of alternatives) {
    const source = segmentPattern(alternative);
    if (source === null) return null;
    sources.push(source);
  }
  return `(?:${sources.join("|")})`;
}

/**
 * Whether a glob selects files that have no extension: its last segment names
 * something and carries no dot, as `tests/integration/test_pay` does. A last
 * segment of wildcards alone names nothing, so an extension-broad glob whose
 * last segment is `*` does not count, and a negative entry selects nothing.
 */
export function namesExtensionlessSource(globs: readonly string[]): boolean {
  return globs.some((glob) => {
    if (glob.startsWith("!")) return false;
    const last = glob.split("/").at(-1) ?? "";
    return last.length > 0 && !last.includes(".") && !/^\*+$/.test(last);
  });
}

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

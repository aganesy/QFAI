import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fills the language slot in the shipped review-instruction files, or removes it.
 *
 * ## What was wrong
 *
 * The shipped `code-review.instructions.md` used to carry concrete TypeScript review rules —
 * avoid unjustified assertions, narrow `unknown` in catch blocks, no fire-and-forget promises,
 * and so on. A later change replaced them with the comment `<!-- qfai:language-rules -->`, and
 * nothing was ever written to fill it: a search of the package source found the marker in the
 * two shipped assets and nowhere else.
 *
 * So every project created since received an HTML comment where the release before it had
 * rules. Half a feature, shipped, and strictly worse than either whole: the rules were gone and
 * the slot did nothing. Measured on a project that IS TypeScript — a manifest declaring the
 * compiler, a `tsconfig.json` beside it — the marker still came through untouched.
 *
 * ## What decides the content
 *
 * The pair (file, language), not the language alone. The TypeScript rules that went missing are
 * review checks and belong to the review file; the principles file's slot has no content for
 * any language today, and it had none before the marker existed either.
 *
 * **A slot with nothing to put in it is removed, never left in place.** That is the whole
 * difference between this and what it replaces: a reader of the output should never meet the
 * marker, whatever their project is written in. A file for a language with no rules reads
 * exactly as it did before the slot was introduced.
 *
 * ## Why detection is deliberately narrow
 *
 * One language is recognised, because one language has rules to render. Adding a second means
 * adding its rules and its detection together — which is the pairing this module exists to make
 * structural, so the half-shipped state cannot recur. Detection is by manifest rather than by
 * walking the tree: `qfai init` runs against a directory that may hold a large repository, and
 * a scan for source files would cost more than the answer is worth.
 */

/** The slot the shipped instruction files carry. */
export const LANGUAGE_RULES_MARKER = "<!-- qfai:language-rules -->";

/** A language this module can recognise and has rules for. */
export type InstructionLanguage = "typescript";

/** The shipped instruction files, by the base name `qfai init` writes. */
export type InstructionFile = "code-review.instructions.md" | "principles.instructions.md";

/**
 * The rules for each file, by language.
 *
 * A missing entry means "this pair has nothing to say", which is a normal answer and not an
 * omission: the principles file has no per-language content, and said nothing there before the
 * slot existed.
 *
 * NESTED, and not one map keyed by a joined string. The joined form worked and was a trap: the
 * key and the lookup are built by two separate expressions, so a character that goes wrong in
 * one of them has to go wrong the same way in the other for a lookup to miss — and when it goes
 * wrong in BOTH, they agree and every test passes over a corrupted table. That happened while
 * this file was being written, to the separator itself. Nesting removes the constructed key, so
 * the two sides have nothing to disagree about.
 */
const RULES: ReadonlyMap<
  InstructionFile,
  ReadonlyMap<InstructionLanguage, readonly string[]>
> = new Map([
  [
    "code-review.instructions.md",
    new Map([
      [
        "typescript",
        [
          "TypeScript specific checks:",
          "",
          "- Avoid `as` type assertions unless a preceding type guard or runtime check justifies them; prefer type narrowing.",
          "- Prefer discriminated unions over plain string-literal unions when branching logic depends on the variant.",
          "- In catch blocks, narrow `unknown` errors before accessing properties; flag bare `(error as Error).message`.",
          "- Ensure every async code path has proper error handling; flag fire-and-forget Promises without `.catch` or `void` annotation.",
          "- Keep generic type parameters to a minimum; overly complex generics hurt readability more than they help type safety.",
        ],
      ],
    ]),
  ],
]);

/** The rules block for `file` in `language`, or `null` when the pair has none. */
export function languageRulesFor(
  file: InstructionFile,
  language: InstructionLanguage,
): string | null {
  const lines = RULES.get(file)?.get(language);
  return lines === undefined ? null : lines.join("\n");
}

/**
 * Whether `root` looks like a TypeScript project.
 *
 * `tsconfig.json` is the direct declaration. The manifest is read as well because a package can
 * depend on the compiler and keep its configuration elsewhere — and because reading it is how
 * this stays a manifest check rather than a tree walk. Every failure is an answer of "no": an
 * unreadable or malformed manifest is a project this cannot classify, and guessing yes there
 * would put TypeScript rules in front of a reviewer of some other language.
 */
async function looksLikeTypeScript(root: string): Promise<boolean> {
  try {
    await readFile(path.join(root, "tsconfig.json"), "utf-8");
    return true;
  } catch {
    // Absent or unreadable; the manifest is the other route.
  }
  try {
    const manifest: unknown = JSON.parse(await readFile(path.join(root, "package.json"), "utf-8"));
    if (typeof manifest !== "object" || manifest === null) return false;
    const record: Record<string, unknown> = { ...manifest };
    for (const field of ["dependencies", "devDependencies"]) {
      const deps = record[field];
      if (typeof deps === "object" && deps !== null && "typescript" in deps) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Every language `root` is recognised as, in a stable order. */
export async function detectProjectLanguages(root: string): Promise<InstructionLanguage[]> {
  return (await looksLikeTypeScript(root)) ? ["typescript"] : [];
}

/**
 * `content` with its language slot filled, or removed when nothing fills it.
 *
 * Content is joined in the order `languages` gives, so a project matching two of them reads in
 * one order rather than in whichever the map happened to enumerate.
 *
 * The blank line before the marker goes with it when the slot is empty: a file ending in a
 * marker plus a blank line reads as an unfinished section, and removing only the marker leaves
 * exactly that.
 */
export function fillLanguageRules(
  content: string,
  file: InstructionFile,
  languages: readonly InstructionLanguage[],
): string {
  if (!content.includes(LANGUAGE_RULES_MARKER)) {
    return content;
  }
  const blocks = languages
    .map((language) => languageRulesFor(file, language))
    .filter((block): block is string => block !== null);

  if (blocks.length === 0) {
    // The marker, and the blank line that separated it from the prose above.
    const withoutSlot = content.replace(
      new RegExp(`\\n*${escapeForRegExp(LANGUAGE_RULES_MARKER)}\\n*`, "g"),
      "\n",
    );
    return withoutSlot.endsWith("\n") ? withoutSlot : `${withoutSlot}\n`;
  }
  return content.split(LANGUAGE_RULES_MARKER).join(blocks.join("\n\n"));
}

function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

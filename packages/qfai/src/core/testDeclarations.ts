/**
 * The declaration forms a test runner collects, by language.
 *
 * One table answers "does this text declare a test" for every caller: the ATDD
 * scan judging a whole file, and the story-tree scan judging the line an EX
 * annotation sits above. Two copies would drift, and an annotation would count
 * in one place while the other reported the file as holding no test.
 *
 * Every pattern here is read off text whose comments and literals are already
 * blanked, so a declaration quoted in a string or a comment is never one.
 */

import type { JsMaskOptions } from "./validators/jsSourceMask.js";

/**
 * The lexer settings that blank the comments and literals of any carrier before
 * a declaration pattern reads it.
 *
 * This scan walks whatever a project puts under its test roots, so `#` opens a
 * comment (Python, Ruby, Gherkin) and triple quotes blank a Python docstring
 * whole; `#[` and a shebang are excluded by the lexer itself.
 */
export const DECLARATION_MASK: JsMaskOptions = { hashComments: true, tripleQuoted: true };

/**
 * Chain segments that still leave a call declaring a test or a suite.
 *
 * An open `[\w$]+` chain accepted the configuration and hook forms too, and
 * those declare nothing: a Playwright file holding only `test.use(...)`,
 * `test.beforeEach(...)` and `test.describe.configure(...)` collects no test
 * yet read as an executable carrier, which took every obligation in it out of
 * `coveredByCarrierOnly`. Only modifiers a runner still collects through are
 * listed, so `test.describe.serial(` matches and `test.describe.configure(`
 * does not.
 */
export const TEST_MODIFIER_SEGMENT =
  "skip|only|todo|fails|failing|concurrent|sequential|serial|parallel|each|for|runIf|skipIf|describe";

/**
 * xUnit / BDD call form with the modifier chains the frameworks allow:
 * `it(`, `test.each(`, `describe.skip(`, `it.concurrent.each(`, and the type
 * arguments TypeScript allows on the name: `it.each<[string]>(`.
 */
const CALL_FORM_PATTERN = new RegExp(
  `(?:^|[^\\w$.])(?:it|test|describe|context|specify|suite|scenario)(?:\\s*\\.\\s*(?:${TEST_MODIFIER_SEGMENT}))*(?:<[^;]{0,200}?>)?\\s*\\(`,
);

/**
 * Runners whose entry point is a property, so {@link CALL_FORM_PATTERN} rejects
 * them on the `.` before `test`: Deno's built-in runner and QUnit.
 */
const NAMESPACED_CALL_PATTERN =
  /(?:^|[^\w$.])(?:Deno\s*\.\s*test|QUnit\s*\.\s*(?:test|only|todo|skip))(?:\s*\.\s*(?:only|skip|ignore|each))*\s*\(/;

/**
 * JUnit 5's collectable annotations, listed rather than matched by prefix so a
 * lifecycle or container annotation is not read as a declaration.
 */
const JVM_ANNOTATION_PATTERN =
  /^\s*@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b/m;

/**
 * NUnit / xUnit.net attributes that name a collected case.
 *
 * `[TestFixture]` is deliberately absent: it marks the class, and a fixture
 * holding no case declares nothing a runner collects.
 */
const DOTNET_ATTRIBUTE_PATTERN = /^\s*\[\s*(?:Test|TestCase|TestCaseSource|Fact|Theory)\s*[\]([]/m;

/** Rust's `#[test]`, including the framework-qualified `#[tokio::test]` form. */
const RUST_ATTRIBUTE_PATTERN = /^\s*#\[\s*(?:\w+::)?test\s*\]/m;

/**
 * Expecto's entry points, which name a case in the call rather than an attribute.
 *
 * An F# suite reads the attribute form or this one, and reading only the
 * first reported a whole Expecto file as declaring no test.
 *
 * Read off the masked body, where the name literal beside the call is already
 * blanked — so the form is the call and its application, never the quote. The
 * lookahead keeps a binding of the same name out: `let testCase = …` declares a
 * value, and only an applied one declares a case.
 */
const EXPECTO_CALL_PATTERN =
  /\b(?:testCase|testCaseAsync|ftestCase|ptestCase|testList|testProperty|testTheory)\s+(?![=:])/;

/**
 * The `def test...` convention pytest and minitest both collect on.
 *
 * The form stops at the name rather than requiring `(`, because Ruby's
 * parameter list is optional and minitest collects `def test_serves_story` as
 * written; Python, where the parentheses are mandatory, is unaffected.
 */
const DEF_NAMING_PATTERN = /^\s*(?:async\s+)?def\s+test\w*\b/m;

/** PHPUnit's `test*` method convention. */
const PHP_NAMING_PATTERN = /^\s*(?:public\s+)?function\s+test\w*\s*\(/m;

/** The Go names `go test` collects and always runs. */
const GO_NAMING_PATTERN = /^\s*func\s+(?:Test|Benchmark|Fuzz)\w*\s*\(/m;

/**
 * Go's `Example` names, kept apart because the form alone settles nothing.
 *
 * `go doc testing`: an example without an output comment is compiled and never
 * run, so the function on its own declares no test — see
 * {@link GO_OUTPUT_COMMENT_RE}.
 */
const GO_EXAMPLE_PATTERN = /^\s*func\s+Example\w*\s*\(/m;

/**
 * The comment that makes a Go example executable.
 *
 * Read off the raw body, because {@link stripCommentsAndLiterals} blanks it
 * along with every other comment. `go/doc` matches this prefix
 * case-insensitively, so this does too.
 */
const GO_OUTPUT_COMMENT_RE = /^[ \t]*\/\/[ \t]*(?:unordered[ \t]+)?output[ \t]*:/im;

/**
 * The declaration forms each language's runner collects, keyed by extension.
 *
 * An extension is not executability — a `.test.ts` whose whole body is an
 * annotation comment is prose that happens to end in `.ts`, and classifying by
 * extension alone would let a markdown ledger clear the same obligation with
 * the same bytes simply by being renamed. But the extension *is* the language,
 * and a form written for one language reads noise in another: PHPUnit's
 * `function test\w*(` convention matched a plain TypeScript helper named
 * `testData`, which took every obligation in that file out of the partition
 * with no test collected anywhere. Each carrier is therefore read with its own
 * language's forms only. Gherkin has its own set again — see
 * {@link GHERKIN_STRUCTURE_PATTERNS}.
 *
 * Container and lifecycle forms are excluded throughout on the same terms as
 * the hook chains above: an `[TestFixture]` on an otherwise empty class and a
 * `@pytest.mark.integration` on a plain helper declare nothing a runner
 * collects, and pytest's own collection is the `def test\w*` convention anyway.
 *
 * Deliberately blind to skip state — `describe.skip(` matches. The claim these
 * support is "a test is declared here", not "it is enabled" or "it passes": a
 * disabled skeleton is owned by the scaffold placeholder gate, and a green run
 * is owned by the test command itself.
 */
const TEST_PATTERNS_BY_LANGUAGE: readonly (readonly [readonly string[], readonly RegExp[]])[] = [
  [
    ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"],
    [CALL_FORM_PATTERN, NAMESPACED_CALL_PATTERN],
  ],
  [["py"], [DEF_NAMING_PATTERN]],
  // RSpec declares with the call form, minitest with the naming convention.
  [["rb"], [CALL_FORM_PATTERN, DEF_NAMING_PATTERN]],
  [["go"], [GO_NAMING_PATTERN]],
  // JUnit's annotations, plus the call form Kotest / Spock / ScalaTest use.
  [
    ["java", "kt", "kts", "groovy", "scala"],
    [JVM_ANNOTATION_PATTERN, CALL_FORM_PATTERN],
  ],
  [["cs", "vb"], [DOTNET_ATTRIBUTE_PATTERN]],
  [["fs"], [DOTNET_ATTRIBUTE_PATTERN, EXPECTO_CALL_PATTERN]],
  [["rs"], [RUST_ATTRIBUTE_PATTERN]],
  [["php"], [PHP_NAMING_PATTERN]],
];

const TEST_PATTERNS_BY_EXTENSION: ReadonlyMap<string, readonly RegExp[]> = new Map(
  TEST_PATTERNS_BY_LANGUAGE.flatMap(([extensions, patterns]) =>
    extensions.map((extension): readonly [string, readonly RegExp[]] => [extension, patterns]),
  ),
);

/**
 * Every code form, for a carrier whose extension names no language above.
 *
 * The pre-split reading, kept for the unrecognised case on purpose: over-
 * counting a carrier costs a finding that would not have been raised, while
 * narrowing a language the scan cannot name would report a suite its runner
 * does execute as unwritten. {@link GO_EXAMPLE_PATTERN} stays out — it is the
 * one form that needs a second condition before it means anything.
 */
const EVERY_TEST_PATTERN: readonly RegExp[] = [
  ...new Set(TEST_PATTERNS_BY_LANGUAGE.flatMap(([, patterns]) => patterns)),
];

/** The declaration forms a runner for a carrier of `extension` collects. */
function runnableTestPatterns(extension: string, text: string): readonly RegExp[] {
  const patterns = TEST_PATTERNS_BY_EXTENSION.get(extension) ?? EVERY_TEST_PATTERN;
  if (extension === "go" && GO_OUTPUT_COMMENT_RE.test(text)) {
    return [...patterns, GO_EXAMPLE_PATTERN];
  }
  return patterns;
}

/**
 * The declarations a Gherkin runner collects — the whole of a `.feature`'s say.
 *
 * A feature body is not code, so the code forms above read its prose: an
 * ordinary step such as `Given test(account) is open` matched the xUnit call
 * form, which let a feature holding only a `Background:` count as executable
 * while Cucumber collected nothing from it. A `.feature` is therefore judged on
 * scenario structure alone.
 *
 * `Background:` is deliberately absent — it is the shared preamble those
 * scenarios run, not a scenario a runner collects, so a feature that has only
 * one declares no test.
 *
 * `Scenario Template` is the English dialect's standard alias of
 * `Scenario Outline`, and `Example` of `Scenario`; a feature written with the
 * alias collects exactly the same scenarios.
 */
const GHERKIN_STRUCTURE_PATTERNS: readonly RegExp[] = [
  /^\s*(?:Scenario Outline|Scenario Template|Scenario|Example)\s*:/m,
];

/**
 * A `.feature` written in a Gherkin dialect this scan cannot read English.
 *
 * Cucumber resolves `Scenario:` through the `# language:` header, so a feature
 * declaring `ja` collects the Japanese scenario keyword and matches no English
 * keyword above.
 * Carrying a keyword table for seventy dialects is not this scan's job, so a
 * non-English feature is taken at its word and counted as declaring a test:
 * over-counting one file costs a finding that would not have been raised,
 * while under-counting reports a suite the runner does execute as unwritten.
 */
export const LOCALISED_GHERKIN_RE = /^\s*#\s*language\s*:\s*(?!en\s*$)[A-Za-z]/im;

/**
 * The patterns that make text a declaration in a file with this extension.
 *
 * A feature is read on scenario structure alone and every other carrier on its
 * language's forms. `text` is the whole file, because a Go example declares a
 * test only when the file holds an output comment.
 */
export function declarationPatterns(extension: string, text: string): readonly RegExp[] {
  return extension === "feature"
    ? GHERKIN_STRUCTURE_PATTERNS
    : runnableTestPatterns(extension, text);
}

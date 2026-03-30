/**
 * Fixture coverage validator — spec-0037
 *
 * Verifies that each new validator has pass/fail/non-UI fixture tests.
 *
 * BR-0037-0015
 */
export type FixtureCoverageResult = {
  validator: string;
  hasPass: boolean;
  hasFail: boolean;
  hasNonUi: boolean;
  fixtureCount: number;
};

/**
 * Check a test file for pass/fail/non-UI test patterns.
 */
export async function checkFixtureCoverage(
  testFilePath: string,
  validatorName: string,
): Promise<FixtureCoverageResult> {
  let content = "";
  try {
    const { readFile } = await import("node:fs/promises");
    content = await readFile(testFilePath, "utf-8");
  } catch {
    return {
      validator: validatorName,
      hasPass: false,
      hasFail: false,
      hasNonUi: false,
      fixtureCount: 0,
    };
  }

  const lower = content.toLowerCase();
  const hasPass = /(?:pass|complete|success|happy\s*path)/.test(lower);
  const hasFail = /(?:fail|missing|incomplete|error|invalid)/.test(lower);
  const hasNonUi = /(?:non.?ui|non_ui|skip)/.test(lower);

  let fixtureCount = 0;
  if (hasPass) fixtureCount++;
  if (hasFail) fixtureCount++;
  if (hasNonUi) fixtureCount++;

  return {
    validator: validatorName,
    hasPass,
    hasFail,
    hasNonUi,
    fixtureCount,
  };
}

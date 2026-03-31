# 03 Acceptance Criteria

14 items.

## AC-0017-0001: New repo creates code-review.instructions.md

**US Ref:** US-0017-0001

```gherkin
Given a new repository with no .github/instructions/ directory
When the user runs `qfai init`
Then `.github/instructions/code-review.instructions.md` is created
And the file contains YAML frontmatter with `applyTo` and `excludeAgent`
And the file contains severity prefix definitions (BLOCKER/MAJOR/MINOR/NIT/FYI)
And the file does not contain language-specific checks
```

## AC-0017-0002: New repo creates principles.instructions.md

**US Ref:** US-0017-0002

```gherkin
Given a new repository with no .github/instructions/ directory
When the user runs `qfai init`
Then `.github/instructions/principles.instructions.md` is created
And the file contains YAML frontmatter with `applyTo` and `excludeAgent`
And the file contains SOLID, KISS, YAGNI, DRY principles
And the file does not contain language-specific examples
```

## AC-0017-0003: Existing code-review file is skipped

**US Ref:** US-0017-0003

```gherkin
Given `.github/instructions/code-review.instructions.md` already exists with custom content
When the user runs `qfai init`
Then the existing file is not modified
And the file content remains identical to before init
```

## AC-0017-0004: Existing principles file is skipped

**US Ref:** US-0017-0003

```gherkin
Given `.github/instructions/principles.instructions.md` already exists with custom content
When the user runs `qfai init`
Then the existing file is not modified
And the file content remains identical to before init
```

## AC-0017-0005: --force with existing files still skips

**US Ref:** US-0017-0003

```gherkin
Given `.github/instructions/code-review.instructions.md` already exists
And `.github/instructions/principles.instructions.md` already exists
When the user runs `qfai init --force`
Then neither file is modified
And the report shows both files as skipped
```

## AC-0017-0006: .github/instructions/ directory auto-created

**US Ref:** US-0017-0001, US-0017-0002

```gherkin
Given a repository with no .github/ directory
When the user runs `qfai init`
Then `.github/instructions/` directory is created recursively
And both instructions files are placed inside it
```

## AC-0017-0007: Only instructions/ subdirectory created when .github/ exists

**US Ref:** US-0017-0001, US-0017-0002

```gherkin
Given a repository with `.github/` directory but no `instructions/` subdirectory
When the user runs `qfai init`
Then `.github/instructions/` subdirectory is created
And existing `.github/` contents are not affected
```

## AC-0017-0008: Partial existing files - only missing file created

**US Ref:** US-0017-0003

```gherkin
Given `.github/instructions/code-review.instructions.md` already exists
And `.github/instructions/principles.instructions.md` does not exist
When the user runs `qfai init`
Then `principles.instructions.md` is created
And `code-review.instructions.md` is not modified
```

## AC-0017-0009: Report shows created count

**US Ref:** US-0017-0004

```gherkin
Given a new repository with no instructions files
When the user runs `qfai init`
Then the report created count includes the 2 instructions files
```

## AC-0017-0010: Report shows skipped paths

**US Ref:** US-0017-0004

```gherkin
Given both instructions files already exist
When the user runs `qfai init`
Then the report skipped paths include `.github/instructions/code-review.instructions.md`
And the report skipped paths include `.github/instructions/principles.instructions.md`
```

## AC-0017-0011: --dry-run shows planned actions without file creation

**US Ref:** US-0017-0004

```gherkin
Given a new repository with no instructions files
When the user runs `qfai init --dry-run`
Then the report shows instructions files as planned for creation
And no instructions files are actually created on disk
```

## AC-0017-0012: SDD insertion marker present in templates

**US Ref:** US-0017-0001, US-0017-0002

```gherkin
Given the template assets in packages/qfai/assets/init/.github/instructions/
When the user inspects the template files
Then `code-review.instructions.md` contains `<!-- qfai:language-rules -->` marker
And `principles.instructions.md` contains `<!-- qfai:language-rules -->` marker
And the markers are positioned near the end of each file
```

## AC-0017-0013: Activation guidance printed when files created

**US Ref:** US-0017-0004

```gherkin
Given a new repository with no instructions files
When the user runs `qfai init`
And at least one instructions file is created
Then stdout includes activation guidance for Copilot review
And the guidance mentions `@github-copilot review` or GitHub Actions workflow setup
```

## AC-0017-0014: Empty file (0 bytes) counts as existing - skip

**US Ref:** US-0017-0003

```gherkin
Given `.github/instructions/code-review.instructions.md` exists as an empty file (0 bytes)
When the user runs `qfai init`
Then the file is not overwritten
And the report shows the file as skipped
```

# Acceptance Criteria

## Criteria

```gherkin
Feature: Find forbidden identifiers in the tracked worktree
  # AC-0001-0232-01
  Scenario: The optional hash policy accepts its bounded shape
    Given validation.forbiddenIdentifiers is absent, empty or a valid list of at most 64 mappings
    When the configuration is loaded
    Then each mapping has exactly sha256 and byteLength, with a 64-character lowercase hexadecimal digest and an integer length from 1 through 128
    And the list has at most eight distinct lengths and no duplicate digest-and-length pair
    And an absent or empty list disables the forbidden-identifier scan and its Git operations

  # AC-0001-0232-02
  Scenario: Invalid policy and unreadable configuration produce generic errors
    Given an invalid list, entry, digest, length or extra key, or a YAML parse or configuration read failure
    When the configuration is loaded
    Then QFAI-CFG-002 is raised at error without echoing unknown keys, values, digests, snippets or raw exceptions
    And no invalid policy is silently accepted as a clear scan

  # AC-0001-0232-03
  Scenario: Every ASCII window is checked exactly
    Given a valid non-empty policy and a safely readable tracked tree
    When qfai validate scans names and current file bytes
    Then it hashes every fixed-length window wholly within a maximal ASCII letter, digit, underscore or hyphen span
    And matching is case-sensitive and includes windows inside longer spans and across read chunks
    And non-ASCII and other bytes split spans
    And each window is hashed once per distinct configured length

  # AC-0001-0232-04
  Scenario: Names and current tracked bytes define the scope
    Given tracked files including binary files, ignored tracked paths and names containing spaces or newlines
    When the enabled scan enumerates Git-tracked paths with NUL framing
    Then every tracked name and current file content is scanned without extension or configured-directory exclusions
    And untracked files and historical contents are not scanned

  # AC-0001-0232-05
  Scenario: A match exposes no identifier through its finding
    Given a configured identifier matches tracked content or a tracked name
    When qfai validate returns the finding
    Then QFAI-SECURITY-001 is raised at error with a generic message and no candidate bytes, raw identifier, digest or configured value
    And a matching name is omitted from file, refs, message and remedy
    And text, JSON, logs and reports preserve these omissions and the existing counts and fail-on threshold

  # AC-0001-0232-06
  Scenario: Unsafe or incomplete coverage is an error
    Given unsafe Git execution, incomplete listing, an invalid or traversing path, a parent or leaf symlink, a hard link, gitlink or nonregular entry, or a missing or unreadable file, an observed descriptor identity or metadata change, or an inconsistent bounded read
    When the enabled scan attempts coverage
    Then QFAI-SECURITY-002 is raised at error without following an unsafe path or treating omitted input as clear
    And its diagnostic exposes no path, identifier, digest, raw exception or Git stderr
    And the scan provides no atomic snapshot or guarantee that every concurrent mutation is detected

  # AC-0001-0232-07
  Scenario: Inclusive capacity limits bound the scan
    Given an enabled scan with limits of 16 MiB per file, 64 MiB of name and content bytes, 64 MiB of Git listing output, 1000000 windows and 64 MiB of hash input
    When the scanner accounts for its work
    Then each raw UTF-8 tracked name and current file byte is counted once in the tree size
    And name and content windows and hash input are counted once per distinct configured length
    And exact limits are allowed and any overrun raises QFAI-SECURITY-002, never a clear result
    And raising these first-version ceilings requires an explicit contract change backed by larger-repository CI capacity measurements

  # AC-0001-0232-08
  Scenario: Every profile retains enabled scanning
    Given any validate profile, including an old-layout return or integration damage that stops other validators from walking files
    When qfai validate runs with the policy enabled
    Then the scan runs once before profile validation and contributes to the normal result without suppressing the layout or integration finding
    And a disabled scan or a safely completed scan with no match raises no security finding
```

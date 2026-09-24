# Acceptance Criteria

## Criteria

```gherkin
Feature: Domain and URL Allowlisting

# AC-0001-0187-01
# Parent: US-0001-0187
Scenario: Fetch from allowlisted domain succeeds
  Given a domain allowlist containing "docs.python.org"
  When the agent attempts to fetch from docs.python.org
  Then the fetch succeeds

# AC-0001-0187-02
# Parent: US-0001-0187
Scenario: Fetch from non-allowlisted domain is blocked
  Given a domain allowlist that does not contain "malicious-site.com"
  When the agent attempts to fetch from malicious-site.com
  Then the fetch is blocked
  And the blocked attempt is logged

# AC-0001-0187-03
# Parent: US-0001-0187
Scenario: Redirect chain crosses allowlist boundary
  Given a fetch from an allowlisted domain
  When the response redirects to a non-allowlisted domain
  Then the fetch is blocked at the redirect target
  And the redirect chain is logged

# AC-0001-0187-04
# Parent: US-0001-0187
Scenario: Sandbox restricts unauthorized access
  Given a sandbox configuration with default-deny network policy
  When the agent attempts to access a domain not in the allowlist
  Then the access is denied
  And the denial event is logged
```

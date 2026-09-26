# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                                | Expected                                                                                             |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| EX-0001-0187-01 | AC-0001-0187-01 | Agent configured with allowlist: ["docs.python.org", "nodejs.org"]; fetch from docs.python.org                                                                       | Fetch succeeds; content returned                                                                     |
| EX-0001-0187-02 | AC-0001-0187-03 | Fetch from docs.python.org → 302 redirect to evil-proxy.com/docs.python.org                                                                                          | Fetch blocked at redirect target; log: "Redirect blocked: evil-proxy.com not in allowlist"           |
| EX-0001-0187-03 | AC-0001-0187-02 | Agent allowlist contains `docs.python.org`; a fetch targets `malicious-site.com`                                                                                     | Fetch is blocked and the denial is logged as `Domain blocked: malicious-site.com (not in allowlist)` |
| EX-0001-0187-04 | AC-0001-0187-04 | Given a sandbox with a default-deny network policy and an allowlist containing only `docs.python.org` When the agent attempts network access to `malicious-site.com` | Then the sandbox denies the request and records the denied domain in its log                         |

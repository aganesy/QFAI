# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                                           | Expected                                                                                          |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| EX-0001-0180-01 | AC-0001-0180-01 | Agent configured with allowlist: ["docs.python.org", "nodejs.org"]; fetch from docs.python.org                                                                  | Fetch is allowed and made; the content it returns continues through the pipeline                  |
| EX-0001-0180-02 | AC-0001-0180-03 | Fetch from docs.python.org → 302 redirect to evil-proxy.com/docs.python.org                                                                                     | Fetch blocked at redirect target `evil-proxy.com`; the redirect chain up to that target is logged |
| EX-0001-0180-03 | AC-0001-0180-02 | Agent allowlist contains `docs.python.org`; a fetch targets `malicious-site.com`                                                                                | Fetch is blocked and skipped; the blocked domain `malicious-site.com` is logged                   |
| EX-0001-0180-04 | AC-0001-0180-04 | A sandbox with a default-deny network policy and an allowlist containing only `docs.python.org`, when the agent attempts network access to `malicious-site.com` | The sandbox denies the request and records the denied domain in its log                           |
| EX-0001-0180-05 | AC-0001-0180-03 | `docs.python.org` → 302 → `nodejs.org` → 302 → `evil-proxy.com`, with an allowlist of both docs domains                                                         | Blocked at the third hop, and the chain is logged                                                 |

# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                               | Expected                                                                                                                        |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0183-01 | AC-0001-0183-01 | Agent receives "find Node.js stream API docs" task with all MCP servers running                     | Pipeline executes: search(Brave)→rank→fetch(Firecrawl)→extract→sanitize→cache→verify→cite                                       |
| EX-0001-0183-02 | AC-0001-0183-03 | Search returns results but fetch stage returns 403 for all URLs                                     | Agent reports "fetch failed for all sources" with HTTP 403 details per URL; no content passed to sanitizer                      |
| EX-0001-0183-03 | AC-0001-0183-02 | Search for "nonexistent-library-xyz-2026 API" returns zero results                                  | Agent reports: "No web sources found. Queries: ['nonexistent-library-xyz-2026 API']"; no citations generated                    |
| EX-0001-0183-04 | AC-0001-0183-01 | URL `<https://nodejs.org/api/stream.html>` with etag "abc123"; cache populated                      | Cache key: `hash("https://nodejs.org/api/stream.html"+"abc123")`; both raw and cleaned versions stored                          |
| EX-0001-0183-05 | AC-0001-0183-01 | Cached content for URL is 25 hours old (> 24h default threshold)                                    | Agent re-fetches from source, updates cache, logs "Cache stale (25h > 24h threshold)"                                           |
| EX-0001-0183-06 | AC-0001-0183-01 | Research task with the defaults `max_threads=2` and `max_depth=2`, no override, and 5 URLs to fetch | Agent fetches URLs 2 at a time in sequence; total fetch operations: 3 batches (2+2+1); links are followed at most 2 levels deep |
| EX-0001-0183-07 | AC-0001-0183-01 | Cached content for the URL is 23 hours old                                                          | Served from cache; no fetch is made                                                                                             |

# US-0002-0003: A layer-separated, credential-free shipped workflow set

## User Story

As an adopter, I want `qfai init` to ship several `qfai-`-prefixed workflow files, with each layer's lane expressed as a job in the orchestrator file that skips on a false condition until I declare the matching layer-named script, and no secret declared or referenced anywhere in the set, so that the shipped CI needs no credentials and stays inert until I opt a layer in.

## Non-goals

- Shipping composite-action templates, which is structurally impossible because the shipped `.github/` allow-list admits only `workflows`
- A shipped template that consumes a secret
- A lane that assumes an ephemeral environment or a browser backend

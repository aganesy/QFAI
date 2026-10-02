# US-0002-0005: Shipped runner label indirection

## User Story

As an adopter, I want every runner selector in the shipped set to read a repository variable whose default is a public GitHub-hosted label, and each shipped file's header table to state the variable name, its default and the failure mode in which GitHub queues the job indefinitely rather than failing fast on a wrong value, so that I can move the workflows to my own runners without editing them.

## Non-goals

- Shipping an organization-private label
- Adding a CI key to `qfai.config.yaml`
- A second runner tier, before a second job class actually exists

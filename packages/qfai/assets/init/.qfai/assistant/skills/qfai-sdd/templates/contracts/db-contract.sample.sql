-- QFAI-CONTRACT-ID: CON-DB-0001
-- Purpose: Sample order draft persistence contract
-- Depends on: -
--   Apply-order dependencies as a comma-separated list of CON-DB-* ids, or `-`
--   when there are none. List only what must be applied BEFORE this file.
--   A reference resolved at run time (a deferred FK, a view a later query
--   reads) is NOT an apply-order dependency: the apply graph is acyclic by
--   construction, the runtime graph need not be.

CREATE TABLE order_drafts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_order_drafts_customer_item
  ON order_drafts (customer_id, item_code);

-- QFAI-CONTRACT-ID: DB-0001
-- Purpose: Sample order draft persistence contract

CREATE TABLE order_drafts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_order_drafts_customer_item
  ON order_drafts (customer_id, item_code);

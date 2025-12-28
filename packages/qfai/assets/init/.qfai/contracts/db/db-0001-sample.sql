-- DATA-0001 (DB contract sample)
-- 破壊的 SQL (DROP/TRUNCATE) は警告対象
CREATE TABLE sample_table (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

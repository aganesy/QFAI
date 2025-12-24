CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  order_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL,
  total_amount INT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE order_lines (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  qty INT NOT NULL,
  unit_price INT NOT NULL,
  line_amount INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
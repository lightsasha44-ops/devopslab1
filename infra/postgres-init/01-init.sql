CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  price DOUBLE PRECISION NOT NULL,
  image_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_login VARCHAR(255) NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE products SET image_url = '/media/shop-images/products/laptop.svg' WHERE name = 'Laptop' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/media/shop-images/products/headphones.svg' WHERE name = 'Headphones' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/media/shop-images/products/mouse.svg' WHERE name = 'Mouse' AND (image_url IS NULL OR image_url = '');

INSERT INTO products (name, price, image_url) VALUES
('Laptop', 1299.99, '/media/shop-images/products/laptop.svg'),
('Headphones', 199.99, '/media/shop-images/products/headphones.svg'),
('Mouse', 49.99, '/media/shop-images/products/mouse.svg')
ON CONFLICT (name) DO NOTHING;

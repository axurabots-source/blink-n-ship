ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_amount DECIMAL(12,2);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_price DECIMAL(12,2),
    sale_amount DECIMAL(12,2),
    profit DECIMAL(12,2)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

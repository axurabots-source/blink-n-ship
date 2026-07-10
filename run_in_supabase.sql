-- =============================================
-- Migration: Add sale_amount and order_items
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- 1. Add sale_amount column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sale_amount DECIMAL(12,2);

-- 2. Create order_items table for multi-product parcels
--    product_id allows NULL for "Book Without Inventory"
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

-- 3. Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =============================================
-- After running the above, restart your dev server:
-- npx next dev
-- =============================================

-- ============================================================
-- QR MENU SAAS — PHASE 1 SCHEMA
-- ============================================================

-- ---------- USERS ----------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','restaurant_admin')),
  restaurant_id INT,  -- NULL for super_admin
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_restaurant ON users(restaurant_id);

-- ---------- RESTAURANTS ----------
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_restaurants_slug ON restaurants(slug);

-- ---------- RESTAURANT SETTINGS (theme + display) ----------
-- Split out so you can extend per-tenant display options freely.
CREATE TABLE restaurant_settings (
  restaurant_id INT PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'modern' CHECK (theme IN ('modern','elegant','classic')),
  primary_color TEXT DEFAULT '#e63946',
  accent_color TEXT DEFAULT '#1d3557',
  bg_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#111111',
  border_radius INT DEFAULT 12,
  font_family TEXT DEFAULT 'Inter',
  button_style TEXT DEFAULT 'rounded' CHECK (button_style IN ('rounded','square','pill')),
  currency TEXT DEFAULT 'PKR',
  currency_symbol TEXT DEFAULT 'Rs',
  show_cover BOOLEAN DEFAULT TRUE,
  show_search BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- CATEGORIES ----------
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id INT REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_rest ON categories(restaurant_id, sort_order);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ---------- MENU ITEMS ----------
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_price NUMERIC(10,2) CHECK (discount_price IS NULL OR discount_price >= 0),
  image_thumb TEXT,
  image_medium TEXT,
  image_large TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  badge TEXT,  -- 'spicy','veg','best_seller','new'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_menu_items_rest_cat ON menu_items(restaurant_id, category_id);
CREATE INDEX idx_menu_items_featured ON menu_items(restaurant_id, is_featured) WHERE is_featured = TRUE;

-- ---------- ITEM OPTIONS (add-ons) ----------
CREATE TABLE item_options (
  id SERIAL PRIMARY KEY,
  menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_multi BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_item_options_item ON item_options(menu_item_id);

CREATE TABLE item_option_values (
  id SERIAL PRIMARY KEY,
  option_id INT NOT NULL REFERENCES item_options(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta NUMERIC(10,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_option_values_option ON item_option_values(option_id);

-- ---------- RESTAURANT TABLES (QR per table) ----------
CREATE TABLE restaurant_tables (
  id SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, table_number)
);
CREATE INDEX idx_tables_restaurant ON restaurant_tables(restaurant_id);

-- ---------- QR CODES ----------
CREATE TABLE qr_codes (
  id SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id INT REFERENCES restaurant_tables(id) ON DELETE CASCADE, -- NULL = general menu QR
  target_url TEXT NOT NULL,
  image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_qr_restaurant ON qr_codes(restaurant_id);

-- ---------- ORDERS ----------
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  restaurant_id INT NOT NULL REFERENCES restaurants(id),
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in','takeaway','delivery')),
  table_number TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','preparing','ready','completed','cancelled')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (restaurant_id, order_number)
);
CREATE INDEX idx_orders_rest_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_phone ON orders(customer_phone);

-- ---------- ORDER ITEMS ----------
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10,2) NOT NULL,
  options_json JSONB  -- snapshot of chosen options
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
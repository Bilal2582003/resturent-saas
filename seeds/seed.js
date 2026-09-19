require('dotenv').config();
const db = require('../src/config/db');
const auth = require('../src/services/auth.service');

async function main() {
  // Clean everything (dev only)
  await db.query('TRUNCATE users, restaurants, restaurant_settings, categories, menu_items, orders, order_items RESTART IDENTITY CASCADE');

  const password_hash = await auth.hashPassword('admin123');

  // Super admin
  await db.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'super_admin')`,
    ['super@qr.com', password_hash]
  );

  // Restaurant
  const { rows: r } = await db.query(
    `INSERT INTO restaurants (name, slug, phone, address) VALUES ($1,$2,$3,$4) RETURNING *`,
    ['BBQ Tonight', 'bbq-tonight', '+92 300 0000000', '123 Main St, Lahore']
  );
  const restaurantId = r[0].id;

  await db.query(
    `INSERT INTO restaurant_settings (restaurant_id, theme, primary_color) VALUES ($1,'modern','#e63946')`,
    [restaurantId]
  );

  // Admin user
  await db.query(
    `INSERT INTO users (email, password_hash, role, restaurant_id) VALUES ($1,$2,'restaurant_admin',$3)`,
    ['admin@bbq.com', password_hash, restaurantId]
  );

  // Categories
  const cats = ['Starters', 'BBQ', 'Karahi', 'Drinks'];
  const catIds = [];
  for (let i = 0; i < cats.length; i++) {
    const { rows } = await db.query(
      `INSERT INTO categories (restaurant_id, name, sort_order) VALUES ($1,$2,$3) RETURNING id`,
      [restaurantId, cats[i], i]
    );
    catIds.push(rows[0].id);
  }

  // Items
  const items = [
    { cat: 0, name: 'Chicken Tikka', price: 450, badge: 'best_seller' },
    { cat: 0, name: 'Seekh Kebab', price: 400 },
    { cat: 1, name: 'Beef Boti', price: 650, badge: 'spicy' },
    { cat: 1, name: 'Malai Boti', price: 700 },
    { cat: 2, name: 'Chicken Karahi (Half)', price: 1200 },
    { cat: 3, name: 'Soft Drink', price: 100 },
  ];
  for (const it of items) {
    await db.query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, price, badge)
       VALUES ($1,$2,$3,$4,$5)`,
      [restaurantId, catIds[it.cat], it.name, it.price, it.badge || null]
    );
  }

  console.log('✅ Seed complete.');
  console.log('   Super admin: super@qr.com / admin123');
  console.log('   Restaurant admin: admin@bbq.com / admin123');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
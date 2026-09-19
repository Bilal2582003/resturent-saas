const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs/promises');
const env = require('../config/env');
const qrRepo = require('../repositories/qr.repo');

async function generateForRestaurant(restaurant, tableNumber) {
  const url = tableNumber
    ? `${env.baseUrl}/r/${restaurant.slug}?table=${encodeURIComponent(tableNumber)}`
    : `${env.baseUrl}/r/${restaurant.slug}`;

  const dir = path.join(env.uploadDir, String(restaurant.id), 'qr');
  await fs.mkdir(dir, { recursive: true });
  const filename = tableNumber ? `table-${tableNumber}.png` : `general.png`;
  const filepath = path.join(dir, filename);

  await QRCode.toFile(filepath, url, {
    width: 800,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const imagePath = `/uploads/${restaurant.id}/qr/${filename}`;

  // Persist record (delete prior for same table first if you want idempotency)
  const record = await qrRepo.upsert(
    restaurant.id,
    null, // we'd look up table_id if tableNumber was given
    url,
    imagePath
  );
  return { url, imagePath, record };
}

module.exports = { generateForRestaurant };
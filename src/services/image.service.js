const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const env = require('../config/env');

const SIZES = {
  thumb: 300,
  medium: 600,
  large: 1000,
};

/**
 * Process an uploaded image file (multer temp path) into 3 WebP variants.
 * Returns { thumb, medium, large } relative paths under /uploads.
 */
async function processMenuImage(fileBuffer, restaurantId, baseName) {
  const dir = path.join(env.uploadDir, String(restaurantId));
  await fs.mkdir(dir, { recursive: true });

  const safeName = `${Date.now()}-${baseName.replace(/[^a-z0-9.-]/gi, '_').slice(0, 40)}`;
  const out = {};

  for (const [key, width] of Object.entries(SIZES)) {
    const filename = `${safeName}-${key}.webp`;
    const filepath = path.join(dir, filename);
    await sharp(fileBuffer)
      .rotate() // honor EXIF
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(filepath);
    out[key] = `/uploads/${restaurantId}/${filename}`;
  }

  return out;
}

/**
 * Process a logo/cover (single variant).
 */
async function processBrandImage(fileBuffer, restaurantId, kind) {
  const dir = path.join(env.uploadDir, String(restaurantId));
  await fs.mkdir(dir, { recursive: true });
  const filename = `${kind}-${Date.now()}.webp`;
  const filepath = path.join(dir, filename);
  await sharp(fileBuffer)
    .rotate()
    .resize({ width: kind === 'logo' ? 400 : 1200, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(filepath);
  return `/uploads/${restaurantId}/${filename}`;
}

module.exports = { processMenuImage, processBrandImage };
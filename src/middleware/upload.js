const multer = require('multer');
const env = require('../config/env');

const ALLOWED_MIME = ['image/jpeg','image/png','image/webp','image/jpg'];

const upload = multer({
  storage: multer.memoryStorage(), // we process with sharp, don't hit disk
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  },
});

module.exports = { upload };
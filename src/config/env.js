require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || 'public/uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB, 10) || 5,
  isProd: process.env.NODE_ENV === 'production',
};
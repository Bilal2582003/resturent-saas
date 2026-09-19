const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepo = require('../repositories/user.repo');

async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}

async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, restaurant_id: user.restaurant_id || null },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

async function login(email, password) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.is_active) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;
  await userRepo.touchLogin(user.id);
  return {
    user: { id: user.id, email: user.email, role: user.role, restaurant_id: user.restaurant_id },
    token: signToken(user),
  };
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, login };
import jwt from 'jsonwebtoken';

export const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const normalizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  const input = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(input)) return '';

  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
};

export const createToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'development-secret',
    { expiresIn: '7d' },
  );

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET || 'development-secret');

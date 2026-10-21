import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { createToken, isValidEmail, normalizeEmail, normalizePhone } from '../utils/auth.js';

export const register = async (req, res) => {
  try {
    const { fullName, email, phone, password, role, businessName, category, location } = req.body;
    const normalizedEmail = email ? normalizeEmail(email) : '';
    const normalizedPhone = phone ? normalizePhone(phone) : '';

    if (typeof fullName !== 'string' || !fullName.trim() || typeof password !== 'string' || !password || !role) {
      return res.status(400).json({ message: 'Full name, password, and role are required.' });
    }

    if (email && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: 'Enter a valid Indian phone number.' });
    }
    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Enter a valid email address or phone number.' });
    }
    if (!['CUSTOMER', 'ENTREPRENEUR'].includes(role)) {
      return res.status(403).json({ message: 'This account role is not available for public registration.' });
    }

    const contactFilters = [
      ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' } }] : []),
      ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
    ];

    const existingUser = await prisma.user.findFirst({
      where: { OR: contactFilters },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail || null,
        phone: normalizedPhone || null,
        password: hashedPassword,
        role,
        ...(role === 'ENTREPRENEUR' && {
          entrepreneurProfile: {
            create: {
              businessName: businessName || `${fullName.trim()}'s Business`,
              category: category || 'General',
              location: location || 'Rural Market',
            },
          },
        }),
      },
      include: { entrepreneurProfile: true },
    });

    const token = createToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        entrepreneurProfile: user.entrepreneurProfile,
      },
    });
  } catch (error) {
    console.error(error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'An account with this email or phone already exists.' });
    }
    return res.status(500).json({ message: 'Unable to register at this time.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (Boolean(email) === Boolean(phone)) {
      return res.status(400).json({ message: 'Choose either email or phone number to log in.' });
    }

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const normalizedEmail = email ? normalizeEmail(email) : '';
    const normalizedPhone = phone ? normalizePhone(phone) : '';
    if (email && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (phone && !normalizedPhone) {
      return res.status(400).json({ message: 'Enter a valid Indian phone number.' });
    }

    const user = await prisma.user.findFirst({
      where: email
        ? { email: { equals: normalizedEmail, mode: 'insensitive' } }
        : { phone: normalizedPhone },
      include: { entrepreneurProfile: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = createToken(user);
    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        entrepreneurProfile: user.entrepreneurProfile,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to log in at the moment.' });
  }
};

export const logout = async (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
};

export const currentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { entrepreneurProfile: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        entrepreneurProfile: user.entrepreneurProfile,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to fetch user profile.' });
  }
};

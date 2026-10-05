import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/connection.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_dev_secret";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password required" });
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      return res.status(409).json({ success: false, error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash
      }
    });

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Invalid email or password" });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('alfred_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie('alfred_token');
  res.json({ success: true });
};

export const me = async (req, res) => {
  try {
    const token = req.cookies?.alfred_token;
    if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) return res.status(401).json({ success: false, error: "Not authenticated" });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.clearCookie('alfred_token');
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const token = req.cookies?.alfred_token;
    if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { name, email } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: "Name cannot be empty" });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, error: "Email cannot be empty" });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check if the current user exists
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check for email collision
    if (currentUser.email !== normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        return res.status(409).json({ success: false, error: "That email is already in use." });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, email: normalizedEmail }
    });

    res.json({ success: true, user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email } });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.clearCookie('alfred_token');
      return res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

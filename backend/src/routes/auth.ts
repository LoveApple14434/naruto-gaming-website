import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../index';
import { generateToken, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// 注册
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new AppError('用户名已存在');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed },
    });

    const token = generateToken({ userId: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        coins: user.coins,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 登录
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new AppError('用户名或密码错误', 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError('用户名或密码错误', 401);
    }

    const token = generateToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        coins: user.coins,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, role: true, coins: true, nickname: true, avatar: true, isNjuStudent: true, createdAt: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// 更新个人信息
const updateProfileSchema = z.object({
  nickname: z.string().max(30).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  isNjuStudent: z.boolean().optional(),
});

router.put('/profile', authenticate, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const data: Record<string, unknown> = {};
    if (req.body.nickname !== undefined) data.nickname = req.body.nickname;
    if (req.body.avatar !== undefined) data.avatar = req.body.avatar;
    if (req.body.isNjuStudent !== undefined) data.isNjuStudent = req.body.isNjuStudent;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, username: true, role: true, coins: true, nickname: true, avatar: true, isNjuStudent: true, createdAt: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;

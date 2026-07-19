import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../index';
import { generateToken, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { sendVerificationCode } from '../services/email';

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
      select: { id: true, username: true, role: true, coins: true, nickname: true, avatar: true, isNjuStudent: true, njuEmailVerified: true, createdAt: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// ─── 南大学生邮箱验证 ───

const sendCodeSchema = z.object({
  emailAccount: z.string().min(1).max(50),
  emailDomain: z.enum(['@smail.nju.edu.cn', '@nju.edu.cn']),
});

// 发送验证码到南大邮箱
router.post('/send-verification-code', authenticate, validate(sendCodeSchema), async (req, res, next) => {
  try {
    const { emailAccount, emailDomain } = req.body;
    const fullEmail = `${emailAccount}${emailDomain}`;

    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 保存验证码及过期时间到数据库（10 分钟有效）
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        njuEmail: fullEmail,
        njuVerificationCode: code,
        njuVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      // 发送邮件
      await sendVerificationCode(fullEmail, code);
    } catch (mailError: any) {
      // 邮件发送失败时仍需清理验证码
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          njuVerificationCode: null,
          njuVerificationCodeExpires: null,
        },
      });
      throw new AppError(`邮件发送失败: ${mailError.message}`);
    }

    res.json({ success: true, message: '验证码已发送到你的南大邮箱' });
  } catch (error) {
    next(error);
  }
});

const verifyCodeSchema = z.object({
  code: z.string().length(6),
});

// 校验验证码
router.post('/verify-email', authenticate, validate(verifyCodeSchema), async (req, res, next) => {
  try {
    const { code } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    if (!user.njuVerificationCode || !user.njuVerificationCodeExpires) {
      throw new AppError('请先发送验证码');
    }

    if (user.njuVerificationCode !== code) {
      throw new AppError('验证码错误');
    }

    if (new Date() > user.njuVerificationCodeExpires) {
      throw new AppError('验证码已过期，请重新发送');
    }

    // 验证通过，更新用户状态
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        isNjuStudent: true,
        njuEmailVerified: true,
        njuVerificationCode: null,
        njuVerificationCodeExpires: null,
      },
    });

    // 返回更新后的用户信息
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, role: true, coins: true, nickname: true, avatar: true, isNjuStudent: true, njuEmailVerified: true, createdAt: true },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// ─── 更新个人信息 ───

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
    if (req.body.isNjuStudent !== undefined) {
      // 如果前端尝试将 isNjuStudent 设为 false，允许取消认证
      // 如果设为 true，则必须已经通过邮箱验证
      if (req.body.isNjuStudent === true) {
        const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!currentUser?.njuEmailVerified) {
          throw new AppError('请先完成南大邮箱验证');
        }
      }
      data.isNjuStudent = req.body.isNjuStudent;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, username: true, role: true, coins: true, nickname: true, avatar: true, isNjuStudent: true, njuEmailVerified: true, createdAt: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;

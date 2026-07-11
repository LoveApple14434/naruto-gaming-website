import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin, requireAdminOrModerator } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 管理员/协助管理员：获取所有用户（不返回密码）
router.get('/', authenticate, requireAdminOrModerator, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        coins: true,
        createdAt: true,
        _count: {
          select: {
            userBets: true,
            redemptions: true,
          },
        },
      },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

const updateCoinsSchema = z.object({
  coins: z.number().int().min(0),
});

// 管理员/协助管理员：修改用户竞猜币
router.put('/:id/coins', authenticate, requireAdminOrModerator, validate(updateCoinsSchema), async (req, res, next) => {
  try {
    const { coins } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { coins },
      select: {
        id: true,
        username: true,
        role: true,
        coins: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

const updateRoleSchema = z.object({
  role: z.enum(['USER', 'MODERATOR']),
});

// 仅管理员：修改用户角色
router.put('/:id/role', authenticate, requireAdmin, validate(updateRoleSchema), async (req, res, next) => {
  try {
    const { role } = req.body;
    // 不能将自己降级
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: '不能修改自己的角色' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
        coins: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;

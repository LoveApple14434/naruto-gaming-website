import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 管理员：获取所有用户（不返回密码）
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
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

// 管理员：修改用户竞猜币
router.put('/:id/coins', authenticate, requireAdmin, validate(updateCoinsSchema), async (req, res, next) => {
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

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 公开：获取所有活跃的贡献者
router.get('/', async (_req, res, next) => {
  try {
    const contributors = await prisma.contributor.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(contributors);
  } catch (error) {
    next(error);
  }
});

// 管理员：获取所有贡献者（含隐藏）
router.get('/all', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const contributors = await prisma.contributor.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(contributors);
  } catch (error) {
    next(error);
  }
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  order: z.number().int().default(0),
  active: z.boolean().optional().default(true),
});

// 创建贡献者（管理员）
router.post('/', authenticate, requireAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const contributor = await prisma.contributor.create({ data: req.body });
    res.status(201).json(contributor);
  } catch (error) {
    next(error);
  }
});

// 更新贡献者（管理员）
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const contributor = await prisma.contributor.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(contributor);
  } catch (error) {
    next(error);
  }
});

// 删除贡献者（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.contributor.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

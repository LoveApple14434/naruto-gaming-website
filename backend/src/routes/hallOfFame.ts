import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 获取名人堂列表（仅返回 active 条目）
router.get('/', async (_req, res, next) => {
  try {
    const entries = await prisma.hallOfFame.findMany({
      where: { active: true },
      include: { player: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

// 管理员获取所有条目（含隐藏）
router.get('/all', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const entries = await prisma.hallOfFame.findMany({
      include: { player: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

const createEntrySchema = z.object({
  playerId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  season: z.string().optional().nullable(),
  order: z.number().int().default(0),
});

// 创建名人堂条目（管理员）
router.post('/', authenticate, requireAdmin, validate(createEntrySchema), async (req, res, next) => {
  try {
    const entry = await prisma.hallOfFame.create({ data: req.body });
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// 更新名人堂条目（管理员）
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const entry = await prisma.hallOfFame.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

// 删除名人堂条目（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.hallOfFame.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

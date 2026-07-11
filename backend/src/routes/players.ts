import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createPlayerSchema = z.object({
  name: z.string().min(1).max(50),
  avatar: z.string().optional().nullable(),
  nickname: z.string().max(50).optional().nullable(),
});

// 获取所有选手
router.get('/', async (_req, res, next) => {
  try {
    const players = await prisma.player.findMany({ orderBy: { name: 'asc' } });
    res.json(players);
  } catch (error) {
    next(error);
  }
});

// 获取单个选手
router.get('/:id', async (req, res, next) => {
  try {
    const player = await prisma.player.findUnique({ where: { id: req.params.id } });
    if (!player) return res.status(404).json({ error: '选手不存在' });
    res.json(player);
  } catch (error) {
    next(error);
  }
});

// 创建选手（管理员）
router.post('/', authenticate, requireAdmin, validate(createPlayerSchema), async (req, res, next) => {
  try {
    const player = await prisma.player.create({ data: req.body });
    res.status(201).json(player);
  } catch (error) {
    next(error);
  }
});

// 更新选手（管理员）
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const player = await prisma.player.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(player);
  } catch (error) {
    next(error);
  }
});

// 删除选手（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.player.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

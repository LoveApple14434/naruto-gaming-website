import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 公开：获取所有已发布的公告
router.get('/', async (_req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

// 管理员：获取所有公告（含未发布）
router.get('/all', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(announcements);
  } catch (error) {
    next(error);
  }
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
});

// 创建公告（管理员）
router.post('/', authenticate, requireAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.create({ data: req.body });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  published: z.boolean().optional(),
});

// 更新公告（管理员）
router.put('/:id', authenticate, requireAdmin, validate(updateSchema), async (req, res, next) => {
  try {
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(announcement);
  } catch (error) {
    next(error);
  }
});

// 删除公告（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

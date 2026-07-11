import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 获取所有上架商品
router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// 管理员获取所有商品（含下架）
router.get('/all', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// 获取单个商品
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
});

// 创建商品（管理员）
router.post('/', authenticate, requireAdmin, validate(createProductSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// 更新商品（管理员）
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// 删除商品（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

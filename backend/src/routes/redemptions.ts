import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// 用户创建兑换请求
const createRedemptionSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
});

router.post('/', authenticate, validate(createRedemptionSchema), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { productId, quantity } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) throw new AppError('商品不存在或已下架');
    if (product.stock < quantity) throw new AppError('库存不足');

    const totalCost = product.price * quantity;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < totalCost) throw new AppError('竞猜币不足');

    // 扣币、减库存、创兑换记录
    const redemption = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: totalCost } },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
      return tx.redemption.create({
        data: { userId, productId, quantity, totalCost },
      });
    });

    res.status(201).json(redemption);
  } catch (error) {
    next(error);
  }
});

// 用户查看自己的兑换记录
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const redemptions = await prisma.redemption.findMany({
      where: { userId: req.user!.userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(redemptions);
  } catch (error) {
    next(error);
  }
});

// 管理员查看所有兑换请求
router.get('/all', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const redemptions = await prisma.redemption.findMany({
      include: { user: { select: { id: true, username: true } }, product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(redemptions);
  } catch (error) {
    next(error);
  }
});

// 管理员审核兑换
router.put('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body; // APPROVED | REJECTED
    const redemption = await prisma.redemption.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(redemption);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── 竞猜 CRUD ───

// 获取某赛程的所有竞猜
router.get('/bracket/:bracketId', async (req, res, next) => {
  try {
    const bets = await prisma.bet.findMany({
      where: { bracketId: req.params.bracketId },
      include: {
        node: {
          include: { player1: true, player2: true },
        },
        _count: { select: { userBets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bets);
  } catch (error) {
    next(error);
  }
});

// 获取单个竞猜详情
router.get('/:id', async (req, res, next) => {
  try {
    const bet = await prisma.bet.findUnique({
      where: { id: req.params.id },
      include: {
        node: { include: { player1: true, player2: true } },
        userBets: { include: { user: { select: { id: true, username: true } } } },
      },
    });
    if (!bet) return res.status(404).json({ error: '竞猜不存在' });
    res.json(bet);
  } catch (error) {
    next(error);
  }
});

// 管理员创建竞猜
const createBetSchema = z.object({
  nodeId: z.string(),
  title: z.string().min(1).max(200),
  oddsPlayer1: z.number().positive().optional().default(1.0),
  oddsPlayer2: z.number().positive().optional().default(1.0),
});

router.post('/bracket/:bracketId', authenticate, requireAdmin, validate(createBetSchema), async (req, res, next) => {
  try {
    const bet = await prisma.bet.create({
      data: {
        bracketId: req.params.bracketId,
        ...req.body,
      },
    });
    res.status(201).json(bet);
  } catch (error) {
    next(error);
  }
});

// 管理员关闭竞猜
router.put('/:id/close', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bet = await prisma.bet.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });
    res.json(bet);
  } catch (error) {
    next(error);
  }
});

// 管理员宣布结果并结算
const settleSchema = z.object({
  result: z.enum(['WINNER_PLAYER_1', 'WINNER_PLAYER_2', 'DRAW']),
});

router.put('/:id/settle', authenticate, requireAdmin, validate(settleSchema), async (req, res, next) => {
  try {
    const { result } = req.body;
    const bet = await prisma.bet.findUnique({
      where: { id: req.params.id },
      include: {
        userBets: { where: { settled: false } },
      },
    });
    if (!bet) throw new AppError('竞猜不存在', 404);
    if (bet.status === 'SETTLED') throw new AppError('竞猜已结算');
    if (bet.status === 'OPEN') throw new AppError('竞猜尚未关闭，请先关闭再结算');

    // 结算每个用户的下注
    for (const userBet of bet.userBets) {
      let payout = 0;
      if (result !== 'DRAW' && userBet.pick === result) {
        // 猜中：根据赔率计算
        const odds = result === 'WINNER_PLAYER_1' ? bet.oddsPlayer1! : bet.oddsPlayer2!;
        payout = Math.floor(userBet.amount * odds);
      }
      // 猜错或平局：不返还（payout=0）

      await prisma.userBet.update({
        where: { id: userBet.id },
        data: { settled: true, payout },
      });

      // 增加用户余额
      if (payout > 0) {
        await prisma.user.update({
          where: { id: userBet.userId },
          data: { coins: { increment: payout } },
        });
      }
    }

    // 更新竞猜状态
    await prisma.bet.update({
      where: { id: req.params.id },
      data: { status: 'SETTLED', result },
    });

    res.json({ success: true, message: '结算完成' });
  } catch (error) {
    next(error);
  }
});

// ─── 用户参与竞猜 ───

const placeBetSchema = z.object({
  pick: z.enum(['WINNER_PLAYER_1', 'WINNER_PLAYER_2']),
  amount: z.number().int().positive(),
});

router.post('/:id/place', authenticate, validate(placeBetSchema), async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { pick, amount } = req.body;

    const bet = await prisma.bet.findUnique({ where: { id: req.params.id } });
    if (!bet) throw new AppError('竞猜不存在', 404);
    if (bet.status !== 'OPEN') throw new AppError('竞猜已关闭或已结算');

    // 检查用户余额
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < amount) throw new AppError('竞猜币不足');

    // 检查是否已投注
    const existing = await prisma.userBet.findUnique({
      where: { userId_betId: { userId, betId: req.params.id } },
    });
    if (existing) throw new AppError('你已参与过本次竞猜');

    // 扣减余额并创建投注
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { coins: { decrement: amount } },
      }),
      prisma.userBet.create({
        data: { userId, betId: req.params.id, pick, amount },
      }),
    ]);

    // 更新总投注量
    if (pick === 'WINNER_PLAYER_1') {
      await prisma.bet.update({
        where: { id: req.params.id },
        data: { totalBetsP1: { increment: amount } },
      });
    } else {
      await prisma.bet.update({
        where: { id: req.params.id },
        data: { totalBetsP2: { increment: amount } },
      });
    }

    res.status(201).json({ success: true, message: '投注成功' });
  } catch (error) {
    next(error);
  }
});

// 获取用户的投注记录
router.get('/user/my', authenticate, async (req, res, next) => {
  try {
    const userBets = await prisma.userBet.findMany({
      where: { userId: req.user!.userId },
      include: {
        bet: {
          include: {
            node: { include: { player1: true, player2: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(userBets);
  } catch (error) {
    next(error);
  }
});

export default router;

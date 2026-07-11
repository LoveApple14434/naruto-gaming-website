import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── 赛程 CRUD ───

// 获取所有赛程列表（支持 ?status=PUBLISHED 过滤）
router.get('/', async (req, res, next) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    const brackets = await prisma.bracket.findMany({
      where,
      include: { _count: { select: { nodes: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(brackets);
  } catch (error) {
    next(error);
  }
});

// 获取单个赛程（含完整结构）
router.get('/:id', async (req, res, next) => {
  try {
    const bracket = await prisma.bracket.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: { include: { player1: true, player2: true, incomingConnections: true, outgoingConnections: true } },
        resultSlots: { include: { assignments: { include: { player: true } }, incomingConnections: true } },
        canvasItems: true,
      },
    });
    if (!bracket) return res.status(404).json({ error: '赛程不存在' });
    res.json(bracket);
  } catch (error) {
    next(error);
  }
});

// 创建赛程（管理员）
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bracket = await prisma.bracket.create({
      data: { title: req.body.title || '新赛程' },
    });
    res.status(201).json(bracket);
  } catch (error) {
    next(error);
  }
});

// 更新赛程基本信息
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bracket = await prisma.bracket.update({
      where: { id: req.params.id },
      data: { title: req.body.title },
    });
    res.json(bracket);
  } catch (error) {
    next(error);
  }
});

// 删除赛程
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.bracket.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── 发布/完成 赛程 ───

router.post('/:id/publish', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bracket = await prisma.bracket.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED' },
    });
    res.json(bracket);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/finish', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const bracket = await prisma.bracket.update({
      where: { id: req.params.id },
      data: { status: 'FINISHED' },
    });
    res.json(bracket);
  } catch (error) {
    next(error);
  }
});

// ─── 节点操作 ───

const createNodeSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string().optional().nullable(),
  player1Id: z.string().optional().nullable(),
  player2Id: z.string().optional().nullable(),
});

router.post('/:id/nodes', authenticate, requireAdmin, validate(createNodeSchema), async (req, res, next) => {
  try {
    const node = await prisma.bracketNode.create({
      data: {
        bracketId: req.params.id,
        ...req.body,
      },
    });
    res.status(201).json(node);
  } catch (error) {
    next(error);
  }
});

router.put('/nodes/:nodeId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { player1Id, player2Id, x, y, label } = req.body;
    const node = await prisma.bracketNode.update({
      where: { id: req.params.nodeId },
      data: { player1Id, player2Id, x, y, label },
    });
    res.json(node);
  } catch (error) {
    next(error);
  }
});

router.delete('/nodes/:nodeId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.bracketNode.delete({ where: { id: req.params.nodeId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── 结果槽操作 ───

const createSlotSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(1).default(1),
  order: z.number().int().default(0),
  x: z.number(),
  y: z.number(),
});

router.post('/:id/result-slots', authenticate, requireAdmin, validate(createSlotSchema), async (req, res, next) => {
  try {
    const slot = await prisma.resultSlot.create({
      data: { bracketId: req.params.id, ...req.body },
    });
    res.status(201).json(slot);
  } catch (error) {
    next(error);
  }
});

router.put('/result-slots/:slotId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const slot = await prisma.resultSlot.update({
      where: { id: req.params.slotId },
      data: req.body,
    });
    res.json(slot);
  } catch (error) {
    next(error);
  }
});

router.delete('/result-slots/:slotId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.resultSlot.delete({ where: { id: req.params.slotId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── 连线操作 ───

const createConnectionSchema = z.object({
  sourceNodeId: z.string().optional().nullable(),
  sourceSlotId: z.string().optional().nullable(),
  targetNodeId: z.string().optional().nullable(),
  targetSlotId: z.string().optional().nullable(),
  outcome: z.enum(['WINNER', 'LOSER']),
});

router.post('/connections', authenticate, requireAdmin, validate(createConnectionSchema), async (req, res, next) => {
  try {
    // 禁止创建重复方向的连线
    if (req.body.sourceNodeId) {
      const existing = await prisma.connection.findFirst({
        where: {
          sourceNodeId: req.body.sourceNodeId,
          outcome: req.body.outcome,
        },
      });
      if (existing) {
        throw new AppError('该方向已有连线，请先删除再重新连接');
      }
    }
    const conn = await prisma.connection.create({ data: req.body });
    res.status(201).json(conn);
  } catch (error) {
    next(error);
  }
});

router.delete('/connections/:connId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.connection.delete({ where: { id: req.params.connId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── 看板框体 ───

const createCanvasItemSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  content: z.string(),
  style: z.any().optional(),
});

router.post('/:id/canvas-items', authenticate, requireAdmin, validate(createCanvasItemSchema), async (req, res, next) => {
  try {
    const item = await prisma.canvasItem.create({
      data: { bracketId: req.params.id, ...req.body },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

router.put('/canvas-items/:itemId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const item = await prisma.canvasItem.update({
      where: { id: req.params.itemId },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete('/canvas-items/:itemId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.canvasItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── 直接分配选手到结果槽 ───

router.post('/:id/result-slots/:slotId/assign', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { playerId } = req.body;
    if (!playerId) throw new AppError('缺少选手 ID');

    const slot = await prisma.resultSlot.findUnique({
      where: { id: req.params.slotId },
      include: { assignments: true },
    });
    if (!slot) throw new AppError('结果槽不存在', 404);
    if (slot.assignments.length >= slot.capacity) throw new AppError('结果槽已满');

    const existing = slot.assignments.find(a => a.playerId === playerId);
    if (existing) throw new AppError('该选手已在结果槽中');

    const assignment = await prisma.slotAssignment.create({
      data: { slotId: req.params.slotId, playerId },
      include: { player: true },
    });

    // 返回完整赛程
    const bracket = await prisma.bracket.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: { include: { player1: true, player2: true, incomingConnections: true, outgoingConnections: true } },
        resultSlots: { include: { assignments: { include: { player: true } }, incomingConnections: true } },
        canvasItems: true,
      },
    });

    res.status(201).json(bracket);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/result-slots/:slotId/assign/:playerId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.slotAssignment.delete({
      where: {
        slotId_playerId: {
          slotId: req.params.slotId,
          playerId: req.params.playerId,
        },
      },
    });

    const bracket = await prisma.bracket.findUnique({
      where: { id: req.params.id },
      include: {
        nodes: { include: { player1: true, player2: true, incomingConnections: true, outgoingConnections: true } },
        resultSlots: { include: { assignments: { include: { player: true } }, incomingConnections: true } },
        canvasItems: true,
      },
    });

    res.json(bracket);
  } catch (error) {
    next(error);
  }
});

export default router;

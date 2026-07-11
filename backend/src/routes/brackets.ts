import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { distributeResults } from '../services/bracketEngine';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ─── 赛程 CRUD ───

// 获取所有赛程列表
router.get('/', async (_req, res, next) => {
  try {
    const brackets = await prisma.bracket.findMany({
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
        resultSlots: { include: { winner: true, loser: true, incomingConnections: true } },
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

// ─── 设定比赛结果（管理员）、自动分发 ───

const setResultSchema = z.object({
  winnerId: z.string(),
  loserId: z.string(),
});

router.put('/nodes/:nodeId/result', authenticate, requireAdmin, validate(setResultSchema), async (req, res, next) => {
  try {
    const { winnerId, loserId } = req.body;

    const node = await prisma.bracketNode.findUnique({
      where: { id: req.params.nodeId },
      include: { outgoingConnections: true },
    });
    if (!node) throw new AppError('比赛节点不存在', 404);

    // 更新本节点结果
    await prisma.bracketNode.update({
      where: { id: req.params.nodeId },
      data: { winnerId, loserId },
    });

    // 自动分发胜者/败者到后续节点或结果槽
    await distributeResults(req.params.nodeId, winnerId, loserId, node.outgoingConnections);

    // 重新获取更新后的赛程完整数据
    const updatedBracket = await prisma.bracket.findUnique({
      where: { id: node.bracketId },
      include: {
        nodes: { include: { player1: true, player2: true, incomingConnections: true, outgoingConnections: true } },
        resultSlots: { include: { winner: true, loser: true, incomingConnections: true } },
        canvasItems: true,
      },
    });

    res.json(updatedBracket);
  } catch (error) {
    next(error);
  }
});

export default router;

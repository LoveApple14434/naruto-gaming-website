import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, requireAdminOrModerator } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// ─── 公开接口 ───

// 获取当前有效的签到活动（含每日奖励配置）
router.get('/active', authenticate, async (_req, res, next) => {
  try {
    const now = new Date();
    const event = await prisma.checkInEvent.findFirst({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// 查询当前用户在某个活动中的签到记录
router.get('/my-records', authenticate, async (req, res, next) => {
  try {
    const records = await prisma.checkInRecord.findMany({
      where: { userId: req.user!.userId },
      include: {
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// 查询当前用户今天在签到活动中的状态
router.get('/today-status', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const event = await prisma.checkInEvent.findFirst({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!event) {
      res.json({ event: null, checkedInToday: false, todayDayNumber: null });
      return;
    }

    // 计算今天是该活动的第几天
    const start = new Date(event.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - start.getTime();
    const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // 检查今天是否在活动范围内
    const end = new Date(event.endDate);
    end.setHours(0, 0, 0, 0);
    if (dayNumber < 1 || today > end) {
      res.json({ event: null, checkedInToday: false, todayDayNumber: null });
      return;
    }

    // 检查用户今天是否已签到
    const existing = await prisma.checkInRecord.findUnique({
      where: {
        userId_eventId_dayNumber: {
          userId: req.user!.userId,
          eventId: event.id,
          dayNumber,
        },
      },
    });

    res.json({
      event,
      checkedInToday: !!existing,
      todayDayNumber: dayNumber,
    });
  } catch (error) {
    next(error);
  }
});

// 用户签到（某一天）
const checkinSchema = z.object({
  eventId: z.string().uuid(),
  dayNumber: z.number().int().min(1),
});

router.post('/checkin', authenticate, validate(checkinSchema), async (req, res, next) => {
  try {
    const { eventId, dayNumber } = req.body;
    const userId = req.user!.userId;

    // 查找活动及当天配置
    const event = await prisma.checkInEvent.findUnique({
      where: { id: eventId },
      include: {
        days: { where: { dayNumber } },
      },
    });

    if (!event || !event.active) {
      return res.status(400).json({ error: '签到活动不存在或已结束' });
    }

    if (event.days.length === 0) {
      return res.status(400).json({ error: '该天没有配置奖励' });
    }

    const dayConfig = event.days[0];
    const now = new Date();
    if (now < event.startDate || now > event.endDate) {
      return res.status(400).json({ error: '签到活动尚未开始或已结束' });
    }

    // 检查是否已签到
    const existing = await prisma.checkInRecord.findUnique({
      where: {
        userId_eventId_dayNumber: {
          userId,
          eventId,
          dayNumber,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: '今天已签到' });
    }

    // 检查 dayNumber 是否正确（客户端传来的 dayNumber 需匹配当前日期）
    const start = new Date(event.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expectedDay = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (dayNumber !== expectedDay) {
      return res.status(400).json({ error: '签到的日期不正确' });
    }

    // 计算实际获得的竞猜币（南大学生 ×1.2）
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    let coinsAwarded = dayConfig.coins;
    if (user.isNjuStudent) {
      coinsAwarded = Math.floor(coinsAwarded * 1.2);
    }

    // 创建签到记录并增加用户竞猜币
    const [record] = await prisma.$transaction([
      prisma.checkInRecord.create({
        data: {
          userId,
          eventId,
          dayNumber,
          coinsAwarded,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: coinsAwarded } },
      }),
    ]);

    res.json({ record, coinsAwarded });
  } catch (error) {
    next(error);
  }
});

// ─── 管理员/协助管理员接口 ───

// 获取所有签到活动
router.get('/all', authenticate, requireAdminOrModerator, async (_req, res, next) => {
  try {
    const events = await prisma.checkInEvent.findMany({
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// 获取签到活动的详细统计
router.get('/:id/stats', authenticate, requireAdminOrModerator, async (req, res, next) => {
  try {
    const event = await prisma.checkInEvent.findUnique({
      where: { id: req.params.id },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
        records: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: '签到活动不存在' });
    }

    // 统计每天签到人数
    const dayStats = event.days.map(day => ({
      dayNumber: day.dayNumber,
      coins: day.coins,
      count: event.records.filter(r => r.dayNumber === day.dayNumber).length,
    }));

    res.json({
      ...event,
      dayStats,
      totalParticipants: new Set(event.records.map(r => r.userId)).size,
    });
  } catch (error) {
    next(error);
  }
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  startDate: z.string().refine(s => !isNaN(Date.parse(s)), { message: '无效的日期' }),
  endDate: z.string().refine(s => !isNaN(Date.parse(s)), { message: '无效的日期' }),
  days: z.array(z.object({
    dayNumber: z.number().int().min(1),
    coins: z.number().int().min(0),
  })).min(1),
});

// 创建签到活动
router.post('/', authenticate, requireAdminOrModerator, validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, startDate, endDate, days } = req.body;

    const event = await prisma.checkInEvent.create({
      data: {
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: req.user!.userId,
        days: {
          create: days,
        },
      },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
      },
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startDate: z.string().refine(s => !isNaN(Date.parse(s)), { message: '无效的日期' }).optional(),
  endDate: z.string().refine(s => !isNaN(Date.parse(s)), { message: '无效的日期' }).optional(),
  active: z.boolean().optional(),
  days: z.array(z.object({
    dayNumber: z.number().int().min(1),
    coins: z.number().int().min(0),
  })).optional(),
});

// 更新签到活动
router.put('/:id', authenticate, requireAdminOrModerator, validate(updateEventSchema), async (req, res, next) => {
  try {
    const existing = await prisma.checkInEvent.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: '签到活动不存在' });
    }

    const { days, ...eventData } = req.body;
    const data: Record<string, unknown> = {};

    if (eventData.title !== undefined) data.title = eventData.title;
    if (eventData.startDate !== undefined) data.startDate = new Date(eventData.startDate);
    if (eventData.endDate !== undefined) data.endDate = new Date(eventData.endDate);
    if (eventData.active !== undefined) data.active = eventData.active;

    // 如果包含 days 更新，先删后建
    if (days) {
      await prisma.checkInDay.deleteMany({ where: { eventId: req.params.id } });
    }

    const event = await prisma.checkInEvent.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(days ? {
          days: {
            create: days,
          },
        } : {}),
      },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
      },
    });

    res.json(event);
  } catch (error) {
    next(error);
  }
});

// 删除签到活动
router.delete('/:id', authenticate, requireAdminOrModerator, async (req, res, next) => {
  try {
    await prisma.checkInEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

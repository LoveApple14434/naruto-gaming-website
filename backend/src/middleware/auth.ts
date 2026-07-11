import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET ?? 'default-secret';

export interface AuthPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('未提供认证令牌', 401);
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      throw new AppError('用户不存在', 401);
    }

    req.user = { userId: user.id, role: user.role };
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('认证失败', 401);
  }
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('需要管理员权限', 403);
  }
  next();
}

export function requireAdminOrModerator(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'MODERATOR') {
    throw new AppError('需要管理员或协助管理员权限', 403);
  }
  next();
}

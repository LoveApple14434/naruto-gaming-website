import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import announcementRoutes from './routes/announcements';
import authRoutes from './routes/auth';
import bracketRoutes from './routes/brackets';
import betRoutes from './routes/bets';
import productRoutes from './routes/products';
import hallOfFameRoutes from './routes/hallOfFame';
import playerRoutes from './routes/players';
import redemptionRoutes from './routes/redemptions';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// 静态文件：上传的图片
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Routes
app.use('/api/announcements', announcementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/products', productRoutes);
app.use('/api/hall-of-fame', hallOfFameRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

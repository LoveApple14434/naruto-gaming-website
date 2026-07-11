import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import bracketRoutes from './routes/brackets';
import betRoutes from './routes/bets';
import productRoutes from './routes/products';
import hallOfFameRoutes from './routes/hallOfFame';
import playerRoutes from './routes/players';
import redemptionRoutes from './routes/redemptions';
import { errorHandler } from './middleware/errorHandler';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/products', productRoutes);
app.use('/api/hall-of-fame', hallOfFameRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/redemptions', redemptionRoutes);

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

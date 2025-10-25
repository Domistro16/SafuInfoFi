import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import logger from './utils/logger';

// Routes
import projectRoutes from './routes/projectRoutes';
import userRoutes from './routes/userRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import postRoutes from './routes/postRoutes';
import payoutRoutes from './routes/payoutRoutes';
import healthRoutes from './routes/healthRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate limiting
app.use(rateLimiter);

// Health check (no rate limit)
app.use('/health', healthRoutes);

// API Routes
const apiRouter = express.Router();
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/leaderboards', leaderboardRoutes);
apiRouter.use('/posts', postRoutes);
apiRouter.use('/payouts', payoutRoutes);

app.use(`/api/${API_VERSION}`, apiRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'SafuInfoFi Dashboard API',
    version: API_VERSION,
    status: 'running',
    endpoints: {
      health: '/health',
      projects: `/api/${API_VERSION}/projects`,
      users: `/api/${API_VERSION}/users`,
      leaderboards: `/api/${API_VERSION}/leaderboards`,
      posts: `/api/${API_VERSION}/posts`,
      payouts: `/api/${API_VERSION}/payouts`,
    },
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SafuInfoFi API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Version: ${API_VERSION}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;

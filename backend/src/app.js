import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { openDb, sql } from './db/index.js';
import { lang } from './middleware/lang.js';
import { errorHandler, notFound } from './middleware/error.js';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import bookings from './routes/bookings.js';
import payments from './routes/payments.js';
import cashier from './routes/cashier.js';
import manager from './routes/manager.js';
import admin from './routes/admin.js';
import reports from './routes/reports.js';

export function createApp() {
  if (config.env !== 'test') {
    try { openDb(); } catch (e) { /* DB may be initialized by runner */ }
  }
  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'X-Row-Count'],
  }));
  if (config.env !== 'test') app.use(morgan('tiny'));
  // keep the raw body: Chapa signs the exact bytes it sends
  app.use(express.json({ limit: '200kb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
  app.use(lang);

  // Normalize Vercel serverless request URLs and duplicate slashes
  app.use((req, _res, next) => {
    if (req.url) req.url = req.url.replace(/\/+/g, '/');
    const raw = req.headers['x-matched-path'] || req.headers['x-invoke-path'];
    if (raw && typeof raw === 'string' && (raw.startsWith('/api') || raw.startsWith('/health'))) {
      req.url = raw.replace(/\/+/g, '/');
    } else if (req.url.startsWith('/api/index.js')) {
      req.url = req.url.slice('/api/index.js'.length) || '/';
    } else if (req.url.startsWith('/api/[...all].js')) {
      req.url = req.url.slice('/api/[...all].js'.length) || '/';
    } else if (req.url.startsWith('/src/app.js')) {
      req.url = req.url.slice('/src/app.js'.length) || '/';
    }
    if (req.url) req.url = req.url.replace(/\/+/g, '/');
    next();
  });

  app.get('/', (_req, res) => res.json({ ok: true, name: 'Science Museum API', health: '/api/health', time: new Date().toISOString() }));
  app.get('/api', (_req, res) => res.json({ ok: true, name: 'Science Museum API', health: '/api/health', time: new Date().toISOString() }));
  app.get('/health', (_req, res) => res.json({ ok: true, status: 'healthy', env: config.env }));
  app.get('/api/health', (_req, res) => {
    const out = { ok: true, status: 'healthy', env: config.env };
    try {
      out.database = path.basename(config.dbPath);
      out.users = sql('SELECT COUNT(*) AS n FROM users').get().n;
    } catch (e) {
      out.dbError = e.message;
    }
    res.json(out);
  });
  app.use('/api/auth', auth);
  app.use('/auth', auth);
  app.use('/api', catalog);
  app.use('/', catalog);
  app.use('/api/bookings', bookings);
  app.use('/bookings', bookings);
  app.use('/api/payments', payments);
  app.use('/payments', payments);
  app.use('/api/cashier', cashier);
  app.use('/cashier', cashier);
  app.use('/api/manager', manager);
  app.use('/manager', manager);
  app.use('/api/admin', admin);
  app.use('/admin', admin);
  app.use('/api/reports', reports);
  app.use('/reports', reports);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const app = createApp();
export default app;

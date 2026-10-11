import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { sql } from './db/index.js';
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
  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, exposedHeaders: ['Content-Disposition', 'X-Row-Count'] }));
  if (config.env !== 'test') app.use(morgan('tiny'));
  // keep the raw body: Chapa signs the exact bytes it sends
  app.use(express.json({ limit: '200kb', verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
  app.use(lang);

  app.get('/api/health', (_req, res) => {
    const out = { ok: true };
    if (!config.isProd) {                 // development only: lets you compare the web app's server with the phone's server
      try { out.database = path.basename(config.dbPath); out.users = sql('SELECT COUNT(*) AS n FROM users').get().n; } catch { /* database not open yet */ }
    }
    res.json(out);
  });
  app.use('/api/auth', auth);
  app.use('/api', catalog);
  app.use('/api/bookings', bookings);
  app.use('/api/payments', payments);
  app.use('/api/cashier', cashier);
  app.use('/api/manager', manager);
  app.use('/api/admin', admin);
  app.use('/api/reports', reports);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { logger } from './middlewares/logger';
import authRoutes from './modules/auth/auth.routes';
import otpRoutes from './modules/otp/routes';
import activityRoutes from './modules/activities/routes';
import newsEventRoutes from './modules/newsandevents/routes';
import contactRoutes from './modules/contact/routes';
import visitRoutes from './modules/visits/routes';

dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(logger);

// Uploaded files (stored on local disk by multer) are served from here:
//   /uploads/activities/<file>
//   /uploads/newsandevents/<file>
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/newsandevents', newsEventRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/visits', visitRoutes);

app.get('/', (req, res) => res.json({ ok: true, message: 'API is running' }));

// Turns multer errors (wrong file type, file too large, too many files...)
// into clean JSON 400s instead of a generic 500.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!err) return next();
  const status = err instanceof multer.MulterError ? 400 : err.status || (err.message?.startsWith('Invalid file type') || err.message?.startsWith('Unexpected file field') ? 400 : 500);
  res.status(status).json({ message: err.message || 'Something went wrong' });
});

export default app;

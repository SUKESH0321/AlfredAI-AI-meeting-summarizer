import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import meetingRoutes from './routes/meetingRoutes.js';
import actionItemRoutes from './routes/actionItemRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:5173', credentials: true })); 


app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: "ok"
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/meetings', meetingRoutes);
app.use('/api/action-items', actionItemRoutes);

// Packaged desktop build: serve the built frontend from this same origin so
// cookies and API calls are same-origin (no CORS / SameSite issues).
const staticDir = process.env.STATIC_DIR;
if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

export default app;

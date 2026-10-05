import express from 'express';
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

export default app;

console.log('STARTING UP');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import poolsRouter from './routes/pools';
import applicationsRouter from './routes/applications';
import leaderboardRouter from './routes/leaderboard';

console.log('BEFORE dotenv, process.env.CONTRACT_ID:', JSON.stringify(process.env.CONTRACT_ID));
dotenv.config();
console.log('AFTER dotenv, process.env.CONTRACT_ID:', JSON.stringify(process.env.CONTRACT_ID));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/pools', poolsRouter);
app.use('/applications', applicationsRouter);
app.use('/leaderboard', leaderboardRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`FundFlow API running on http://localhost:${PORT}`);
});

export default app;
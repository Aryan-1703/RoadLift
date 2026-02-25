import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSockets } from './sockets/socketSetup';

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP Server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Setup Real-time Sockets
setupSockets(io);

// Basic Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// In a real app, you would mount your routes here
// app.use('/api/auth', authRoutes);
// app.use('/api/jobs', jobRoutes);
// app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 RoadLift Backend running on port ${PORT}`);
});

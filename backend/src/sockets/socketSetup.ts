import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  companyId?: string;
  driverId?: string;
}

// Extend standard Socket type
type AuthenticatedSocket = any;

export const setupSockets = (io: Server) => {
  // Middleware for Authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as SocketUser;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`Client connected: ${user.id} (${user.role})`);

    // 1. Join Personal Room (for direct notifications)
    socket.join(`${user.role.toLowerCase()}-${user.id}`);

    // 2. Join Company Room if Driver (to listen for new jobs broadcasted to their company)
    if (user.role === 'DRIVER' && user.companyId) {
      socket.join(`company-${user.companyId}-drivers`);
    }

    // 3. Driver Location Update Events
    socket.on('driver-location-update', (data: { jobId: string; lat: number; lng: number; eta: number }) => {
      if (user.role !== 'DRIVER') return;

      // Broadcast to the specific job room (which the customer has joined)
      io.to(`job-${data.jobId}`).emit('provider-location-update', {
        latitude: data.lat,
        longitude: data.lng,
        eta: data.eta
      });
    });

    // 4. Join Job Room (called by both Customer and Driver when a job is accepted)
    socket.on('join-job', (jobId: string) => {
      socket.join(`job-${jobId}`);
      console.log(`User ${user.id} joined job room: job-${jobId}`);
    });

    // 5. Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${user.id}`);
      // If driver disconnects during an active job, we could trigger logic here 
      // to mark them offline or notify the customer.
    });
  });
};

// Utility to emit events from Express controllers
export const getIO = (): Server => {
  if (!(globalThis as any).__io) {
    throw new Error('Socket.io not initialized');
  }
  return (globalThis as any).__io;
};
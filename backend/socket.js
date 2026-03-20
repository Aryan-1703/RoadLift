const { Server } = require('socket.io');

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19000',
  // /^http://192.168.d+.d+(:d+)?$/,
  // /^http://172.d+.d+.d+(:d+)?$/,
  // /^http://10.d+.d+.d+(:d+)?$/,
];

const PROD_ORIGINS = [
  'https://roadlift.app',
  'https://api.roadlift.app',
];

const io = new Server({
  cors: {
    origin: process.env.NODE_ENV === 'production' ? PROD_ORIGINS : DEV_ORIGINS,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true,
  },
});

// Export the single instance
module.exports = io;
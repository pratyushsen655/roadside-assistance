const socketHandler = {
  initSocketServer: (io) => {
    io.on('connection', (socket) => {
      console.log(`[Socket] User connected: ${socket.id}`);

      // Join job room
      socket.on('join:job:room', ({ jobId }) => {
        socket.join(`job:${jobId}`);
        console.log(`[Socket] Socket ${socket.id} joined room job:${jobId}`);
      });

      // Join mechanics room
      socket.on('join:mechanics:room', () => {
        socket.join('mechanics');
        console.log(`[Socket] Socket ${socket.id} joined room: mechanics`);
      });

      // Mechanic broadcasts location
      socket.on('mechanic:location', ({ jobId, lat, lng }) => {
        console.log(`[Socket] Mechanic location for job:${jobId} -> ${lat}, ${lng}`);
        io.to(`job:${jobId}`).emit('mechanic:location:update', { lat, lng });
      });

      // Job status updates
      socket.on('job:status:update', ({ jobId, status }) => {
        console.log(`[Socket] Job status update for job:${jobId} -> ${status}`);
        io.to(`job:${jobId}`).emit('job:status:changed', { status });
      });

      // Notify customer when mechanic accepts
      socket.on('job:accepted', ({ jobId, mechanicId, mechanicName, mechanicPhone }) => {
        console.log(`[Socket] Job accepted for job:${jobId} by ${mechanicName}`);
        io.to(`job:${jobId}`).emit('job:accepted:notify', { mechanicId: mechanicId ?? null, mechanicName, mechanicPhone });
      });

      // Chat message send
      socket.on('chat:send', async ({ jobId, message, senderType, senderId }) => {
        try {
          const Message = require('../models/Message');
          const ServiceRequest = require('../models/ServiceRequest');
          const User = require('../models/User');
          const Mechanic = require('../models/Mechanic');
          const { sendPushNotification } = require('../services/pushNotificationService');

          // Save message to MongoDB
          const msg = await Message.create({ jobId, senderId, senderType, message });
          console.log(`[Socket] Saved message for job:${jobId} from ${senderType}`);

          // Broadcast to job room
          io.to(`job:${jobId}`).emit('chat:message', {
            _id: msg._id,
            message,
            senderType,
            senderId,
            createdAt: msg.createdAt
          });

          // Fetch the job to get recipient tokens
          const job = await ServiceRequest.findById(jobId);
          if (job) {
            if (senderType === 'mechanic') {
              const customerUser = await User.findById(job.customer);
              const token = customerUser?.pushToken || customerUser?.fcmToken;
              if (token) {
                const mechanic = await Mechanic.findById(job.mechanic);
                await sendPushNotification(
                  token,
                  `💬 ${mechanic?.name || 'Mechanic'}`,
                  message,
                  { screen: 'Chat', params: { jobId, receiverName: mechanic?.name || 'Mechanic' } }
                );
              }
            } else if (senderType === 'customer') {
              const mechanic = await Mechanic.findById(job.mechanic);
              const token = mechanic?.pushToken || mechanic?.fcmToken;
              if (token) {
                const customerUser = await User.findById(job.customer);
                await sendPushNotification(
                  token,
                  `💬 ${customerUser?.name || 'Customer'}`,
                  message,
                  { screen: 'Chat', params: { jobId, receiverName: customerUser?.name || 'Customer' } }
                );
              }
            }
          }
        } catch (error) {
          console.error('[Socket Chat Send Error]', error.message);
        }
      });

      // Typing indicators
      socket.on('chat:typing', ({ jobId, senderType }) => {
        socket.to(`job:${jobId}`).emit('chat:typing', { senderType });
      });

      socket.on('chat:stop:typing', ({ jobId }) => {
        socket.to(`job:${jobId}`).emit('chat:stop:typing');
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
      });
    });
  },
};

module.exports = socketHandler;

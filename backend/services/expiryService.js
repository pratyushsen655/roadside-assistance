const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { cleanActiveTimer } = require('./dispatchService');

let expiryInterval = null;

/**
 * Sweep pending/searching requests that have exceeded their 5-minute lifespan.
 * @param {object} io - Socket.io server instance
 */
const sweepExpiredRequests = async (io) => {
  try {
    const now = new Date();
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const expiredRequests = await ServiceRequest.find({
      status: { $in: ['pending', 'searching', 'unfulfilled'] },
      $or: [
        { expiresAt: { $lte: now } },
        { expiresAt: null, createdAt: { $lte: fiveMinsAgo } }
      ]
    });

    if (expiredRequests.length === 0) return;

    console.log(`[Expiry Sweeper] Found ${expiredRequests.length} expired pending/searching service requests.`);

    for (const request of expiredRequests) {
      const reqIdStr = request._id.toString();

      // 1. Mark request status as expired
      request.status = 'expired';
      request.dispatchStatus = 'unfulfilled';
      request.currentCandidateMechanic = null;
      await request.save();

      // 2. Clean up active dispatch timer
      cleanActiveTimer(reqIdStr);

      // 3. Clear customer activeRequestId
      if (request.customer) {
        await User.findByIdAndUpdate(request.customer, { activeRequestId: null }).catch(() => {});
      }

      console.log(`[Expiry Sweeper] Marked request ${reqIdStr} as expired in MongoDB.`);

      // 4. Emit real-time socket events so open mechanic screens clear immediately
      if (io) {
        const payload = { requestId: reqIdStr, status: 'expired' };
        io.to(`job:${reqIdStr}`).emit('request:expired', payload);
        io.to(`job:${reqIdStr}`).emit('incoming_request_timeout', payload);
        io.to(`job:${reqIdStr}`).emit('request_cancelled', payload);

        if (request.customer) {
          io.to(`user:${request.customer.toString()}`).emit('request:expired', payload);
          io.to(`user:${request.customer.toString()}`).emit('request_matching_exhausted', payload);
        }

        io.to('mechanics').emit('request:expired', payload);
        io.to('mechanics').emit('incoming_request_timeout', payload);
        io.to('mechanics').emit('request_cancelled', payload);
      }
    }
  } catch (err) {
    console.error('[Expiry Sweeper Error]', err.message);
  }
};

/**
 * Start the background 20-second expiry sweeper loop.
 * @param {object} io - Socket.io server instance
 */
const initExpirySweeper = (io) => {
  if (expiryInterval) {
    clearInterval(expiryInterval);
  }

  // Immediate sweep on startup
  sweepExpiredRequests(io);

  // Sweep every 20 seconds
  expiryInterval = setInterval(() => {
    sweepExpiredRequests(io);
  }, 20000);

  console.log('[Expiry Sweeper Service] Automated 5-minute request TTL sweeper initialized (polling every 20s).');
};

module.exports = {
  sweepExpiredRequests,
  initExpirySweeper
};

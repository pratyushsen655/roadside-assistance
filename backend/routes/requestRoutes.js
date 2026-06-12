const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ServiceRequest = require('../models/ServiceRequest');
const Mechanic = require('../models/Mechanic');
const User = require('../models/User');

const router = express.Router();

// 1. Create a service request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      serviceType,
      description,
      issueDescription,
      vehicleType,
      location,
      customerLocation,
      customerAddress
    } = req.body;

    const finalIssueDescription = issueDescription || description;
    const finalLocation = customerLocation || location;

    let finalServiceType = serviceType;
    if (finalServiceType === 'tire_repair') {
      finalServiceType = 'flat_tire';
    } else if (finalServiceType === 'battery') {
      finalServiceType = 'battery_jump';
    } else if (finalServiceType === 'lock_out') {
      finalServiceType = 'other';
    }

    let geoJsonLocation = finalLocation;
    if (!geoJsonLocation && req.body.latitude !== undefined && req.body.longitude !== undefined) {
      geoJsonLocation = {
        type: 'Point',
        coordinates: [Number(req.body.longitude), Number(req.body.latitude)]
      };
    }
    if (!geoJsonLocation) {
      geoJsonLocation = {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // standard default coordinates
      };
    }

    const newRequest = await ServiceRequest.create({
      customer: req.user.id,
      serviceType: finalServiceType || 'breakdown',
      issueDescription: finalIssueDescription || 'No description provided',
      vehicleType: vehicleType || 'car',
      customerLocation: geoJsonLocation,
      customerAddress: customerAddress || '',
    });

    // Link customer activeRequestId
    await User.findByIdAndUpdate(req.user.id, { activeRequestId: newRequest._id });

    // Notify all online mechanics of the new request
    try {
      const { sendMulticastNotification } = require('../services/pushNotificationService');
      const onlineMechanics = await Mechanic.find({ isOnline: true });
      const tokens = onlineMechanics.map(m => m.pushToken || m.fcmToken).filter(t => !!t);
      if (tokens.length > 0) {
        await sendMulticastNotification(
          tokens,
          '💰 New Job Request',
          'New job request near you!',
          { jobId: newRequest._id.toString() }
        );
      }
    } catch (pushErr) {
      console.error('[New Request Notification Error]', pushErr.message);
    }

    // Return format compatible with both data.request._id and data._id
    res.status(201).json({
      success: true,
      message: 'Service request created',
      request: newRequest,
      _id: newRequest._id,
      ...newRequest.toObject()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 2. Get request details by ID
router.get('/:id', async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id)
      .populate('customer', 'name phone email')
      .populate('mechanic', 'name phone averageRating');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found',
      });
    }

    res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Helper: Accept Job
const acceptJob = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.mechanic = req.user.id;
    request.status = 'accepted';
    if (!request.pricing || request.pricing.totalAmount === 0) {
      request.pricing = { baseFare: 150, totalAmount: 350 };
    }
    await request.save();

    const mechanic = await Mechanic.findByIdAndUpdate(
      req.user.id,
      { activeRequestId: request._id, status: 'busy' },
      { new: true }
    );

    // Notify customer room via socket
    if (req.io) {
      req.io.to(`job:${request._id}`).emit('job:accepted:notify', {
        jobId: request._id,
        mechanicId: mechanic?._id || req.user.id,
        mechanicName: mechanic?.name || 'Mechanic',
        mechanicPhone: mechanic?.phone || '+919999999999'
      });
      req.io.to(`job:${request._id}`).emit('job:status:changed', { status: 'accepted' });
    }

    res.status(200).json({
      success: true,
      message: 'Request accepted successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Accept request
router.post('/:id/accept', authMiddleware, acceptJob);
router.put('/:id/accept', authMiddleware, acceptJob);

// Helper: Start Job
const startJob = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'work_in_progress';
    await request.save();

    if (req.io) {
      req.io.to(`job:${request._id}`).emit('job:status:changed', { status: 'work_in_progress' });
    }

    res.status(200).json({
      success: true,
      message: 'Request started successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Start request
router.post('/:id/start', authMiddleware, startJob);
router.put('/:id/start', authMiddleware, startJob);

// Helper: Complete Job
const completeJob = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'completed';
    let baseFare = 349;
    const serviceType = request.serviceType;
    if (serviceType === 'flat_tire' || serviceType === 'puncture_repair') {
      baseFare = 299;
    } else if (serviceType === 'battery_jump') {
      baseFare = 399;
    } else if (serviceType === 'fuel_delivery') {
      baseFare = 249;
    } else if (serviceType === 'engine_repair') {
      baseFare = 599;
    }
    const totalAmount = baseFare + 29;
    request.pricing = { baseFare, totalAmount };
    request.amount = totalAmount;
    request.completedAt = new Date();
    request.paymentStatus = 'pending';
    await request.save();

    // Release mechanic
    if (request.mechanic) {
      await Mechanic.findByIdAndUpdate(request.mechanic, { activeRequestId: null, status: 'online' });
    }

    // Release customer
    if (request.customer) {
      await User.findByIdAndUpdate(request.customer, { activeRequestId: null });
    }

    if (req.io) {
      req.io.to(`job:${request._id}`).emit('job:status:changed', { status: 'completed', amount: totalAmount });
      req.io.to(`job:${request._id}`).emit('job:completed', { jobId: request._id, amount: totalAmount });
    }

    res.status(200).json({
      success: true,
      message: 'Request completed successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Complete request
router.post('/:id/complete', authMiddleware, completeJob);
router.put('/:id/complete', authMiddleware, completeJob);

// Helper: Cancel Job
const cancelJob = async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (['completed', 'cancelled'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Request is already completed or cancelled' });
    }

    request.status = 'cancelled';
    request.cancelledBy = req.user?.role || 'user';
    request.cancellationReason = req.body.cancellationReason || 'Cancelled by user request';
    await request.save();

    // Release customer
    if (request.customer) {
      await User.findByIdAndUpdate(request.customer, { activeRequestId: null });
    }

    // Release mechanic
    if (request.mechanic) {
      await Mechanic.findByIdAndUpdate(request.mechanic, {
        activeRequestId: null,
        status: 'online'
      });
    }

    if (req.io) {
      req.io.to(`job:${request._id}`).emit('job:status:changed', { status: 'cancelled' });
    }

    res.status(200).json({
      success: true,
      message: 'Request cancelled successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Cancel request
router.post('/:id/cancel', authMiddleware, cancelJob);
router.put('/:id/cancel', authMiddleware, cancelJob);

// 7. General updates / customer-app update status
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'cancelled') {
      return cancelJob(req, res);
    }

    const updateFields = {};
    const allowedFields = [
      'vehicleType',
      'vehicleModel',
      'serviceType',
      'issueDescription',
      'customerAddress',
      'notes',
      'cost',
      'amount',
      'paymentStatus',
      'paymentMethod'
    ];

    if (req.body.description !== undefined) {
      updateFields.issueDescription = req.body.description;
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const request = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Request updated successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

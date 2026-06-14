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
      vehicleModel,
      vehicleNumber,
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

    const initialPriceVal = Number(req.body.initialPrice) || 350;

    const newRequest = await ServiceRequest.create({
      customer: req.user.id,
      serviceType: finalServiceType || 'breakdown',
      issueDescription: finalIssueDescription || 'No description provided',
      vehicleType: vehicleType || 'car',
      vehicleModel: vehicleModel || '',
      vehicleNumber: vehicleNumber || '',
      customerLocation: geoJsonLocation,
      customerAddress: customerAddress || '',
      initial_price: initialPriceVal,
      current_price: initialPriceVal,
      last_price_update_time: new Date(),
      pricing: { baseFare: initialPriceVal, totalAmount: initialPriceVal },
      amount: initialPriceVal,
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

// 1.5 Get bidding settings (must be registered before /:id)
router.get('/bidding-settings', authMiddleware, async (req, res) => {
  try {
    const Setting = require('../models/Setting');
    let autoPromptDelay = await Setting.findOne({ key: 'autoPromptDelay' });
    if (!autoPromptDelay) autoPromptDelay = { value: 120 };

    let maxPriceIncrease = await Setting.findOne({ key: 'maxPriceIncrease' });
    if (!maxPriceIncrease) maxPriceIncrease = { value: 1000 };

    res.status(200).json({
      success: true,
      settings: {
        autoPromptDelay: Number(autoPromptDelay.value),
        maxPriceIncrease: Number(maxPriceIncrease.value)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      request.amount = 350;
      request.current_price = 350;
    }
    request.accepted_price = request.current_price || request.amount || (request.pricing ? request.pricing.totalAmount : 350);
    request.accepted_mechanic_id = req.user.id;
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

// 6.5 Increase request price (bidding system)

router.put('/:id/increase-price', authMiddleware, async (req, res) => {
  try {
    const { incrementAmount } = req.body;
    if (!incrementAmount || Number(incrementAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid increment amount' });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Pricing is locked because a mechanic has already accepted or the request is no longer pending.' });
    }

    // Load max allowed price increase limit from Settings model
    const Setting = require('../models/Setting');
    const maxLimitSetting = await Setting.findOne({ key: 'maxPriceIncrease' });
    const maxLimit = maxLimitSetting ? Number(maxLimitSetting.value) : 1000; // default to 1000

    const currentTotalIncrease = (request.current_price || request.amount || 0) - (request.initial_price || 0) + Number(incrementAmount);
    if (currentTotalIncrease > maxLimit) {
      return res.status(400).json({ success: false, message: `Price increase limit exceeded. Maximum total increase allowed is ₹${maxLimit}.` });
    }

    const newPrice = (request.current_price || 0) + Number(incrementAmount);

    request.current_price = newPrice;
    request.price_increase_count = (request.price_increase_count || 0) + 1;
    request.last_price_update_time = new Date();
    request.pricing = { baseFare: newPrice, totalAmount: newPrice };
    request.amount = newPrice;

    request.price_history.push({
      price: newPrice,
      increased_by: Number(incrementAmount),
      timestamp: new Date()
    });

    await request.save();

    // Notify all eligible mechanics and the customer in real-time
    if (req.io) {
      // Notify customer room
      req.io.to(`job:${request._id}`).emit('request:price_updated', {
        jobId: request._id,
        current_price: newPrice,
        price_increase_count: request.price_increase_count
      });

      // Broadcast to mechanics room
      req.io.to('mechanics').emit('request:price_updated', {
        jobId: request._id,
        current_price: newPrice
      });

      // Also emit a general event
      req.io.emit('request:price_updated_global', {
        jobId: request._id,
        current_price: newPrice
      });
    }

    res.status(200).json({
      success: true,
      message: 'Price increased successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
      'vehicleNumber',
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
